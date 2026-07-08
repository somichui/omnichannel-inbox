import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Channel, Direction, Prisma } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    @InjectQueue('analyze-message-v2') private analyzeMessageQueue: Queue,
    @InjectQueue('extract-merge-signals-v2') private extractMergeSignalsQueue: Queue,
  ) {}

  async processIncomingMessage(
    externalId: string, 
    displayName: string, 
    text: string, 
    rawPayload: any, 
    channel: Channel
  ) {
    this.logger.log(`Processing new ${channel} message from ${displayName} (${externalId}): ${text}`);

    let identity = await this.prisma.channelIdentity.findUnique({
      where: {
        channel_externalId: {
          channel,
          externalId,
        }
      },
      include: { person: true }
    });

    if (!identity) {
      const person = await this.prisma.person.create({
        data: {
          name: displayName,
        }
      });
      identity = await this.prisma.channelIdentity.create({
        data: {
          channel,
          externalId,
          displayName,
          personId: person.id,
        },
        include: { person: true }
      });
    }

    let conversation = await this.prisma.conversation.findFirst({
      where: { personId: identity.personId, channel, status: 'OPEN' }
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          personId: identity.personId,
          channel,
        }
      });
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: Direction.INBOUND,
        channel,
        rawPayload: rawPayload ? (rawPayload as Prisma.InputJsonValue) : Prisma.JsonNull,
        text,
      }
    });

    this.eventsGateway.server.emit('message:new', {
      id: message.id,
      conversationId: message.conversationId,
      text: message.text,
      direction: message.direction,
      channel: message.channel,
      person: { name: identity.person.name || displayName }
    });

    await this.analyzeMessageQueue.add('analyze', {
      messageId: message.id,
      text: message.text,
    }, { attempts: 1 });

    await this.extractMergeSignalsQueue.add('extract', {
      messageId: message.id,
      text: message.text,
      personId: identity.personId,
    }, { attempts: 1, delay: 35000 });
  }

  async sendInstagramMessage(recipientId: string, text: string) {
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) {
      this.logger.error('No META_ACCESS_TOKEN configured');
      return false;
    }

    try {
      const url = `https://graph.facebook.com/v19.0/me/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        this.logger.error(`Failed to send Instagram message: ${JSON.stringify(data)}`);
        return false;
      } else {
        this.logger.log(`Successfully sent Instagram message to ${recipientId}`);
        return true;
      }
    } catch (e: any) {
      this.logger.error(`Error sending Instagram message: ${e.message}`);
      return false;
    }
  }
}
