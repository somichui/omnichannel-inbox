import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);
  
  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() payload: any) {
    this.logger.log('Webhook received');
    await this.telegramService.handleIncomingMessage(payload);
    return 'OK';
  }
}
