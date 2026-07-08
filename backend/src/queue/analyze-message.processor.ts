import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EventsGateway } from '../events/events.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { z } from 'zod';

@Processor('analyze-message-v2')
export class AnalyzeMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyzeMessageProcessor.name);

  constructor(
    private eventsGateway: EventsGateway,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<{ messageId: string, text: string, conversationId: string }>): Promise<any> {
    const { messageId, text, conversationId } = job.data;
    this.logger.log(`Analyzing message ${messageId} via Gemini...`);

    try {
      // 3. Save    
      let sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL';
      let urgencyScore = 5;
      let classification = 'GENERAL_INQUIRY';
      let suggestedReply = 'Thank you for reaching out! We are looking into this for you.';

      try {
        const result = await generateText({
          model: google('gemini-flash-latest'),
          prompt: `Analyze this customer message: "${text}". 
Respond ONLY with a valid JSON object matching exactly this schema:
{
  "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  "urgencyScore": number (1-10),
  "classification": "ORDER_STATUS_INQUIRY" | "REFUND_REQUEST" | "PRODUCT_QUESTION" | "COMPLAINT" | "GENERAL_INQUIRY" | "OTHER",
  "suggestedReply": "string"
}`
        });

        const parsed = JSON.parse(result.text.replace(/```json/g, '').replace(/```/g, '').trim());
        sentiment = parsed.sentiment || 'NEUTRAL';
        urgencyScore = parsed.urgencyScore || 5;
        classification = parsed.classification || 'GENERAL_INQUIRY';
        suggestedReply = parsed.suggestedReply || 'Thank you for reaching out!';

      } catch (error: any) {
        this.logger.error(`Gemini Error: ${error.message || error}`);
        if (text.includes('#')) {
          classification = 'ORDER_STATUS_INQUIRY';
          suggestedReply = 'Hello! Let me quickly check the shipping status for your order right away.';
        }
      }

      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          sentiment,
          urgencyScore,
          intent: classification,
          suggestedReply,
        }
      });

      // 4. Emit final
      this.eventsGateway.server.emit('message:suggestion-complete', {
        messageId,
        conversationId,
        sentiment: sentiment,
        intent: classification,
        urgencyScore: urgencyScore,
        suggestedReply: suggestedReply,
      });

      this.logger.log(`Finished analyzing message ${messageId}`);
    } catch (error: any) {
      this.logger.error(`Error analyzing message: ${error.message}`);
    }
  }
}
