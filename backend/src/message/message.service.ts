import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
// import { MetaService } from '../meta/meta.service'; // We will not do Meta for now as their delete API is complex, we just mark it deleted in DB

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService
  ) {}

  async deleteMessage(messageId: string, type: 'FOR_ME' | 'FOR_EVERYONE') {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: { include: { person: { include: { identities: true } } } } }
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (type === 'FOR_EVERYONE' && message.direction === 'INBOUND') {
      throw new BadRequestException('Cannot delete inbound messages for everyone');
    }

    // 1. Update Database
    if (type === 'FOR_ME') {
      await this.prisma.message.update({
        where: { id: messageId },
        data: { deletedForMe: true }
      });
      return { success: true, messageId, deletedForMe: true };
    } 
    
    if (type === 'FOR_EVERYONE') {
      await this.prisma.message.update({
        where: { id: messageId },
        data: { deletedForEveryone: true }
      });

      // 2. Attempt Upstream Deletion
      if (message.channel === 'TELEGRAM') {
        const tgIdentity = message.conversation.person.identities.find(id => id.channel === 'TELEGRAM');
        if (tgIdentity && message.rawPayload && (message.rawPayload as any).message_id) {
            await this.telegramService.deleteTelegramMessage(tgIdentity.externalId, (message.rawPayload as any).message_id);
            this.logger.log(`Successfully deleted upstream Telegram message...`);
        }
      }

      return { success: true, messageId, deletedForEveryone: true };
    }
  }
}
