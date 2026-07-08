import { Module } from '@nestjs/common';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    QueueModule,
  ],
  controllers: [MetaController],
  providers: [MetaService],
  exports: [MetaService]
})
export class MetaModule {}
