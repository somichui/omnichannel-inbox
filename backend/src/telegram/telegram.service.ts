import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { Channel, Direction } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private bot: any;

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    @InjectQueue('analyze-message-v2') private analyzeMessageQueue: Queue,
    @InjectQueue('extract-merge-signals-v2') private extractMergeSignalsQueue: Queue,
  ) {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });
  }

  async handleIncomingMessage(payload: any) {
    // 1. Normalize Payload
    const message = payload.message;
    if (!message || !message.text) return;

    const externalId = message.from.id.toString();
    const displayName = message.from.username || message.from.first_name || 'Unknown User';
    const text = message.text;

    this.logger.log(`Processing new message from ${displayName} (${externalId}): ${text}`);

    // 2. Lookup or Create Person and ChannelIdentity
    const identity = await this.prisma.channelIdentity.upsert({
      where: {
        channel_externalId: {
          channel: Channel.TELEGRAM,
          externalId: externalId
        }
      },
      update: { displayName },
      create: {
        channel: Channel.TELEGRAM,
        externalId: externalId,
        displayName,
        person: {
          create: {
            name: displayName
          }
        }
      },
      include: { person: true }
    });

    // 3. Lookup or Create Conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: { personId: identity.personId, channel: Channel.TELEGRAM, status: 'OPEN' }
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          personId: identity.personId,
          channel: Channel.TELEGRAM,
        }
      });
    }

    // 4. Save Message
    const savedMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: Direction.INBOUND,
        channel: Channel.TELEGRAM,
        rawPayload: payload as any,
        text: text
      }
    });

    // 5. Emit to frontend
    this.eventsGateway.server.emit('message:new', {
      ...savedMessage,
      person: identity.person
    });
    
    // 6. Queue for LLM analysis
    await this.analyzeMessageQueue.add('analyze', {
      messageId: savedMessage.id,
      text: savedMessage.text,
      conversationId: savedMessage.conversationId
    }, { attempts: 1 });

    await this.extractMergeSignalsQueue.add('extract', {
      messageId: savedMessage.id,
      text: savedMessage.text,
      personId: identity.personId,
    }, { attempts: 1, delay: 35000 });

    this.logger.log('Message saved, emitted, and queued for AI analysis');
  }

  async sendTelegramMessage(externalId: string, text: string): Promise<boolean> {
    try {
      await this.bot.sendMessage(externalId, text);
      return true;
    } catch (e) {
      this.logger.error(`Failed to send Telegram message: ${e}`);
      return false;
    }
  }
}
