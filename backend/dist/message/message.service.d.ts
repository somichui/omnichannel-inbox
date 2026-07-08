import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
export declare class MessageService {
    private prisma;
    private telegramService;
    private readonly logger;
    constructor(prisma: PrismaService, telegramService: TelegramService);
    deleteMessage(messageId: string, type: 'FOR_ME' | 'FOR_EVERYONE'): Promise<{
        success: boolean;
        messageId: string;
        deletedForMe: boolean;
        deletedForEveryone?: undefined;
    } | {
        success: boolean;
        messageId: string;
        deletedForEveryone: boolean;
        deletedForMe?: undefined;
    } | undefined>;
}
