import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EventsGateway } from '../events/events.gateway';
import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyzeMessageProcessor extends WorkerHost {
    private eventsGateway;
    private prisma;
    private readonly logger;
    constructor(eventsGateway: EventsGateway, prisma: PrismaService);
    process(job: Job<{
        messageId: string;
        text: string;
        conversationId: string;
    }>): Promise<any>;
}
