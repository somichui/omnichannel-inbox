import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { Queue } from 'bullmq';
export declare class TelegramService {
    private prisma;
    private eventsGateway;
    private analyzeMessageQueue;
    private extractMergeSignalsQueue;
    private readonly logger;
    private bot;
    constructor(prisma: PrismaService, eventsGateway: EventsGateway, analyzeMessageQueue: Queue, extractMergeSignalsQueue: Queue);
    handleIncomingMessage(payload: any): Promise<void>;
    sendTelegramMessage(externalId: string, text: string): Promise<any>;
    deleteTelegramMessage(chatId: string | number, messageId: number): Promise<boolean>;
}
