import { PrismaService } from './prisma/prisma.service';
import { MetaService } from './meta/meta.service';
import { TelegramService } from './telegram/telegram.service';
export declare class AppController {
    private prisma;
    private metaService;
    private telegramService;
    constructor(prisma: PrismaService, metaService: MetaService, telegramService: TelegramService);
    getInbox(): Promise<{
        id: string;
        conversationId: string;
        text: string;
        direction: import("@prisma/client").$Enums.Direction;
        channel: import("@prisma/client").$Enums.Channel;
        sentiment: string | null;
        intent: string | null;
        urgencyScore: number | null;
        suggestedReply: string | null;
        deletedForMe: boolean;
        deletedForEveryone: boolean;
        createdAt: Date;
        person: {
            identities: {
                id: string;
                channel: import("@prisma/client").$Enums.Channel;
                createdAt: Date;
                personId: string;
                externalId: string;
                displayName: string | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            name: string | null;
            email: string | null;
            phone: string | null;
            attributes: import("@prisma/client/runtime/client").JsonValue | null;
            notes: string | null;
        };
    }[]>;
    getPendingSuggestions(): Promise<any>;
    mergePerson(targetId: string, sourceId: string, suggestionId: string): Promise<{
        success: boolean;
    }>;
    sendMessage(conversationId: string, text: string): Promise<{
        id: string;
        direction: import("@prisma/client").$Enums.Direction;
        channel: import("@prisma/client").$Enums.Channel;
        rawPayload: import("@prisma/client/runtime/client").JsonValue;
        text: string;
        sentiment: string | null;
        intent: string | null;
        urgencyScore: number | null;
        suggestedReply: string | null;
        deletedForMe: boolean;
        deletedForEveryone: boolean;
        createdAt: Date;
        conversationId: string;
    } | {
        success: boolean;
        error: string;
    }>;
    getCustomers(): Promise<({
        identities: {
            id: string;
            channel: import("@prisma/client").$Enums.Channel;
            createdAt: Date;
            personId: string;
            externalId: string;
            displayName: string | null;
        }[];
        _count: {
            conversations: number;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string | null;
        email: string | null;
        phone: string | null;
        attributes: import("@prisma/client/runtime/client").JsonValue | null;
        notes: string | null;
    })[]>;
}
