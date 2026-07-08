import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { Channel, Direction } from '@prisma/client';
import axios from 'axios';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;
  
  private logger: Logger = new Logger('EventsGateway');

  constructor(private prisma: PrismaService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(@MessageBody() data: { conversationId: string, text: string }) {
    this.logger.log(`Received outbound message for conversation: ${data.conversationId}`);
    
    // Save to DB
    const message = await this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        text: data.text,
        direction: Direction.OUTBOUND,
        channel: Channel.TELEGRAM,
        rawPayload: {} as any
      }
    });

    // Fetch conversation with person and identities
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: data.conversationId },
      include: {
        person: {
          include: {
            identities: true
          }
        }
      }
    });

    if (!conversation) return;

    // Send via Telegram API
    const identity = conversation.person.identities.find((id: any) => id.channel === Channel.TELEGRAM);
    if (identity) {
      const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      try {
        await axios.post(url, {
          chat_id: identity.externalId,
          text: data.text,
        });
        this.logger.log(`Successfully sent to Telegram API for chat_id: ${identity.externalId}`);
      } catch(e: any) {
        this.logger.error('Failed to send to Telegram:', e.message);
      }
    }

    // Broadcast back to UI so it instantly updates the chat window
    this.server.emit('message:new', {
      id: message.id,
      conversationId: message.conversationId,
      text: message.text,
      direction: message.direction,
      channel: message.channel,
      person: conversation.person
    });
  }
}
