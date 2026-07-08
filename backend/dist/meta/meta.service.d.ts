import { PrismaService } from '../prisma/prisma.service';
import { Channel } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
import { Queue } from 'bullmq';
export declare class MetaService {
    private prisma;
    private eventsGateway;
    private analyzeMessageQueue;
    private extractMergeSignalsQueue;
    private readonly logger;
    constructor(prisma: PrismaService, eventsGateway: EventsGateway, analyzeMessageQueue: Queue, extractMergeSignalsQueue: Queue);
    processIncomingMessage(externalId: string, displayName: string, text: string, rawPayload: any, channel: Channel): Promise<void>;
    sendInstagramMessage(recipientId: string, text: string): Promise<boolean>;
}
