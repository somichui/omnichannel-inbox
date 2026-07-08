import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { EventsModule } from '../events/events.module';
import { QueueModule } from '../queue/queue.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    EventsModule,
    QueueModule,
    PrismaModule
  ],
  controllers: [TelegramController],
  providers: [TelegramService],
})
export class TelegramModule {}
