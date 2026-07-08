import { Controller, Delete, Param, Body } from '@nestjs/common';
import { MessageService } from './message.service';

@Controller('message')
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Delete(':id')
  async deleteMessage(
    @Param('id') id: string,
    @Body('type') type: 'FOR_ME' | 'FOR_EVERYONE'
  ) {
    return this.messageService.deleteMessage(id, type);
  }
}
