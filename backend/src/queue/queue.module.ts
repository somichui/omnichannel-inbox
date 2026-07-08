import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AnalyzeMessageProcessor } from './analyze-message.processor';
import { ExtractMergeSignalsProcessor } from './extract-merge-signals.processor';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'analyze-message-v2',
    }),
    BullModule.registerQueue({
      name: 'extract-merge-signals-v2',
    }),
    EventsModule
  ],
  providers: [AnalyzeMessageProcessor, ExtractMergeSignalsProcessor],
  exports: [BullModule]
})
export class QueueModule {}
