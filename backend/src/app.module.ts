import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelegramModule } from './telegram/telegram.module';
import { PrismaModule } from './prisma/prisma.module';
import { EventsModule } from './events/events.module';
import { QueueModule } from './queue/queue.module';
import { BullModule } from '@nestjs/bullmq';
import { MetaModule } from './meta/meta.module';
import { MessageModule } from './message/message.module';
import Redis from 'ioredis';

@Module({
  imports: [
    BullModule.forRoot({
      connection: new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null }) as any
    }),
    PrismaModule, 
    EventsModule, 
    QueueModule, 
    TelegramModule, MetaModule, MessageModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
