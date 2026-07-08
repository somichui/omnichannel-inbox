import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { MetaService } from './meta/meta.service';
import { TelegramService } from './telegram/telegram.service';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private prisma: PrismaService,
    private metaService: MetaService,
    private telegramService: TelegramService,
    private appService: AppService
  ) {}

  @Get('inbox')
  async getInbox() {
    const messages = await this.prisma.message.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        conversation: {
          include: {
            person: {
              include: { identities: true }
            }
          }
        }
      }
    });

    return messages.map(m => ({
      id: m.id,
      conversationId: m.conversationId,
      text: m.text,
      direction: m.direction,
      channel: m.channel,
      sentiment: m.sentiment,
      intent: m.intent,
      urgencyScore: m.urgencyScore,
      suggestedReply: m.suggestedReply,
      createdAt: m.createdAt,
      person: m.conversation.person
    }));
  }

  @Get('suggestions/pending')
  async getPendingSuggestions() {
    const suggestions = await this.prisma.mergeSuggestion.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    });
    
    if (suggestions.length === 0) return {};
    
    const suggestion = suggestions[0] as any;
    suggestion.personA = await this.prisma.person.findUnique({ where: { id: suggestion.personAId } });
    suggestion.personB = await this.prisma.person.findUnique({ where: { id: suggestion.personBId } });
    
    return suggestion;
  }

  @Post('person/:id/merge')
  async mergePerson(
    @Param('id') targetId: string, 
    @Body('sourcePersonId') sourceId: string, 
    @Body('suggestionId') suggestionId: string
  ) {
    return this.appService.mergePerson(targetId, sourceId, suggestionId);
  }

  @Post('person/:id/unmerge')
  async unmergePerson(
    @Param('id') originalPersonId: string,
    @Body('identityIds') identityIds: string[]
  ) {
    return this.appService.unmergePerson(originalPersonId, identityIds);
  }

  @Post('message/send')
  async sendMessage(
    @Body('conversationId') conversationId: string,
    @Body('text') text: string
  ) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { person: { include: { identities: true } } }
    });
    
    if (!conv) return { success: false, error: 'Conversation not found' };

    if (conv.channel === 'INSTAGRAM') {
      const igIdentity = conv.person.identities.find(id => id.channel === 'INSTAGRAM');
      if (igIdentity) {
        const success = await this.metaService.sendInstagramMessage(igIdentity.externalId, text);
        if (!success) {
          return { success: false, error: 'Failed to send to Instagram' };
        }
      }
    }

    if (conv.channel === 'TELEGRAM') {
      const tgIdentity = conv.person.identities.find(id => id.channel === 'TELEGRAM');
      if (tgIdentity) {
        const success = await this.telegramService.sendTelegramMessage(tgIdentity.externalId, text);
        if (!success) {
          return { success: false, error: 'Failed to send to Telegram' };
        }
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        channel: conv.channel,
        text,
        rawPayload: {}
      }
    });

    return message;
  }

  @Get('customers')
  async getCustomers() {
    return this.prisma.person.findMany({
      include: {
        identities: true,
        _count: {
          select: { conversations: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
