import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { MetaService } from './meta/meta.service';
import { TelegramService } from './telegram/telegram.service';

@Controller()
export class AppController {
  constructor(
    private prisma: PrismaService,
    private metaService: MetaService,
    private telegramService: TelegramService
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
      deletedForMe: m.deletedForMe,
      deletedForEveryone: m.deletedForEveryone,
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
    return this.prisma.$transaction(async (tx) => {
      const targetPerson = await tx.person.findUnique({ where: { id: targetId } });
      const sourcePerson = await tx.person.findUnique({ where: { id: sourceId } });

      if (targetPerson && sourcePerson && targetPerson.name && sourcePerson.name && targetPerson.name !== sourcePerson.name) {
         await tx.person.update({
           where: { id: targetId },
           data: { name: `${targetPerson.name} | ${sourcePerson.name}` }
         });
      }

      await tx.channelIdentity.updateMany({
        where: { personId: sourceId },
        data: { personId: targetId }
      });

      await tx.conversation.updateMany({
        where: { personId: sourceId },
        data: { personId: targetId }
      });

      if (suggestionId) {
        await tx.mergeSuggestion.update({
          where: { id: suggestionId },
          data: { status: 'CONFIRMED', resolvedAt: new Date() }
        });
      }

      await tx.person.delete({
        where: { id: sourceId }
      });

      return { success: true };
    });
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

    let rawPayloadToSave: any = {};

    if (conv.channel === 'TELEGRAM') {
      const tgIdentity = conv.person.identities.find(id => id.channel === 'TELEGRAM');
      if (tgIdentity) {
        const tgMsg = await this.telegramService.sendTelegramMessage(tgIdentity.externalId, text);
        if (!tgMsg) {
          return { success: false, error: 'Failed to send to Telegram' };
        }
        rawPayloadToSave = tgMsg;
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        channel: conv.channel,
        text,
        rawPayload: rawPayloadToSave
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
