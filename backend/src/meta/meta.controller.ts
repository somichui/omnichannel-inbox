import { Controller, Get, Post, Req, Res, Body, Query, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MetaService } from './meta.service';
import { Channel } from '@prisma/client';

@Controller('meta')
export class MetaController {
  constructor(private metaService: MetaService) {}

  @Get('webhook')
  verifyWebhook(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string, @Res() res: Response) {
    if (mode === 'subscribe' && token) {
      return res.status(HttpStatus.OK).send(challenge);
    }
    return res.sendStatus(HttpStatus.FORBIDDEN);
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any, @Res() res: Response) {
    try {
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            if (change.value && change.value.messages) {
              const contacts = change.value.contacts || [];
              for (const message of change.value.messages) {
                if (message.type === 'text') {
                  const from = message.from;
                  const text = message.text.body;
                  const contact = contacts.find((c: any) => c.wa_id === from);
                  const displayName = contact?.profile?.name || from;

                  await this.metaService.processIncomingMessage(from, displayName, text, message, Channel.WHATSAPP);
                }
              }
            }
          }
        }
      }
      
      if (body.object === 'instagram' || body.object === 'page') {
        for (const entry of body.entry || []) {
          // Standard Messenger/Instagram format
          for (const messaging of entry.messaging || []) {
            if (messaging.message && messaging.message.text) {
              const from = messaging.sender.id;
              const text = messaging.message.text;
              const displayName = `IG User (${from})`;
              await this.metaService.processIncomingMessage(from, displayName, text, messaging, Channel.INSTAGRAM);
            }
          }
          // New Instagram Graph API format (changes array)
          for (const change of entry.changes || []) {
            if (change.field === 'messages' && change.value && change.value.message && change.value.message.text) {
              const from = change.value.sender.id;
              const text = change.value.message.text;
              const displayName = `IG User (${from})`;
              await this.metaService.processIncomingMessage(from, displayName, text, change.value, Channel.INSTAGRAM);
            }
          }
        }
      }

      res.status(HttpStatus.OK).send('EVENT_RECEIVED');
    } catch (e) {
      console.error('Error handling meta webhook:', e);
      res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('simulate')
  async simulateWhatsApp(@Body() body: { from: string, name: string, text: string }, @Res() res: Response) {
    await this.metaService.processIncomingMessage(body.from, body.name, body.text, body, Channel.WHATSAPP);
    res.status(HttpStatus.OK).send({ success: true });
  }

  @Post('simulate-instagram')
  async simulateInstagram(@Body() body: { from: string, name: string, text: string }, @Res() res: Response) {
    await this.metaService.processIncomingMessage(body.from, body.name, body.text, body, Channel.INSTAGRAM);
    res.status(HttpStatus.OK).send({ success: true });
  }
}
