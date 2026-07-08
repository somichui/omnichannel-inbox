import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
export declare class ExtractMergeSignalsProcessor extends WorkerHost {
    private prisma;
    private eventsGateway;
    private readonly logger;
    constructor(prisma: PrismaService, eventsGateway: EventsGateway);
    process(job: Job<any, any, string>): Promise<any>;
}
