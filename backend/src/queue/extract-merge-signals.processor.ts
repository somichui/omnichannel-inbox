import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

@Processor('extract-merge-signals-v2')
export class ExtractMergeSignalsProcessor extends WorkerHost {
  private readonly logger = new Logger(ExtractMergeSignalsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { messageId, text, personId } = job.data;
    this.logger.log(`Extracting merge signals from message ${messageId} via Claude...`);

    let extracted: { email: string | null, phone: string | null, orderNumber: string | null } = { email: null, phone: null, orderNumber: null };

    try {
      const result = await generateText({
        model: google('gemini-flash-latest'),
        prompt: `Extract any email, phone number, or order number from this message. Message: "${text}"
Respond ONLY with a valid JSON object matching exactly this schema:
{
  "email": string | null,
  "phone": string | null,
  "orderNumber": string | null
}`
      });
      extracted = JSON.parse(result.text.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (error: any) {
      this.logger.error(`Gemini Error: ${error.message || error}`);
      const orderMatch = text.match(/#(\d+)/);
      if (orderMatch) {
        extracted.orderNumber = orderMatch[1];
      }
    }

    this.logger.log(`Extracted signals: ${JSON.stringify(extracted)}`);
    
    const signals = extracted;
      
    if (signals.email || signals.phone || signals.orderNumber) {
      const person = await this.prisma.person.findUnique({ where: { id: personId } });
      if (person) {
        const existingAttributes = (person.attributes as any) || {};
        const orderNumbers = new Set(existingAttributes.orderNumbers || []);
        if (signals.orderNumber) orderNumbers.add(signals.orderNumber);

        await this.prisma.person.update({
          where: { id: personId },
          data: {
            email: signals.email || person.email,
            phone: signals.phone || person.phone,
            attributes: {
              ...existingAttributes,
              orderNumbers: Array.from(orderNumbers)
            }
          }
        });

          const OR_CONDITIONS = [];
          if (signals.email) OR_CONDITIONS.push({ email: signals.email });
          if (signals.phone) OR_CONDITIONS.push({ phone: signals.phone });
          if (signals.orderNumber) {
             OR_CONDITIONS.push({
               attributes: {
                 path: ['orderNumbers'],
                 array_contains: signals.orderNumber
               }
             });
          }

          if (OR_CONDITIONS.length > 0) {
            const matches = await this.prisma.person.findMany({
              where: {
                OR: OR_CONDITIONS as any[],
                id: { not: personId } 
              }
            });

            for (const match of matches) {
              const existingSuggestion = await this.prisma.mergeSuggestion.findFirst({
                where: {
                  OR: [
                    { personAId: personId, personBId: match.id },
                    { personAId: match.id, personBId: personId }
                  ],
                  status: 'PENDING'
                }
              });

              if (!existingSuggestion) {
                const suggestion = await this.prisma.mergeSuggestion.create({
                  data: {
                    personAId: match.id,
                    personBId: personId,
                    reason: `Shared contact details detected via AI text extraction`,
                    confidence: 0.5,
                  }
                });

                this.eventsGateway.server.emit('merge:suggestion', {
                  id: suggestion.id,
                  personAId: match.id,
                  personBId: personId,
                  reason: suggestion.reason,
                  confidence: suggestion.confidence,
                  personA: match,
                  personB: person
                });
              }
            }
          }
        }
      }
  }
}
