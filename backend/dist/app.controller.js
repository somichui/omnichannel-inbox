"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma/prisma.service");
const meta_service_1 = require("./meta/meta.service");
const telegram_service_1 = require("./telegram/telegram.service");
let AppController = class AppController {
    prisma;
    metaService;
    telegramService;
    constructor(prisma, metaService, telegramService) {
        this.prisma = prisma;
        this.metaService = metaService;
        this.telegramService = telegramService;
    }
    async getInbox() {
        const messages = await this.prisma.message.findMany({
            orderBy: { createdAt: 'asc' },
            include: {
                conversation: {
                    include: {
                        person: {
                            include: { identities: true }
                        }
                    }
                }
            }
        });
        return messages.map(m => ({
            id: m.id,
            conversationId: m.conversationId,
            text: m.text,
            direction: m.direction,
            channel: m.channel,
            sentiment: m.sentiment,
            intent: m.intent,
            urgencyScore: m.urgencyScore,
            suggestedReply: m.suggestedReply,
            deletedForMe: m.deletedForMe,
            deletedForEveryone: m.deletedForEveryone,
            createdAt: m.createdAt,
            person: m.conversation.person
        }));
    }
    async getPendingSuggestions() {
        const suggestions = await this.prisma.mergeSuggestion.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' }
        });
        if (suggestions.length === 0)
            return {};
        const suggestion = suggestions[0];
        suggestion.personA = await this.prisma.person.findUnique({ where: { id: suggestion.personAId } });
        suggestion.personB = await this.prisma.person.findUnique({ where: { id: suggestion.personBId } });
        return suggestion;
    }
    async mergePerson(targetId, sourceId, suggestionId) {
        return this.prisma.$transaction(async (tx) => {
            const targetPerson = await tx.person.findUnique({ where: { id: targetId } });
            const sourcePerson = await tx.person.findUnique({ where: { id: sourceId } });
            if (targetPerson && sourcePerson && targetPerson.name && sourcePerson.name && targetPerson.name !== sourcePerson.name) {
                await tx.person.update({
                    where: { id: targetId },
                    data: { name: `${targetPerson.name} | ${sourcePerson.name}` }
                });
            }
            await tx.channelIdentity.updateMany({
                where: { personId: sourceId },
                data: { personId: targetId }
            });
            await tx.conversation.updateMany({
                where: { personId: sourceId },
                data: { personId: targetId }
            });
            if (suggestionId) {
                await tx.mergeSuggestion.update({
                    where: { id: suggestionId },
                    data: { status: 'CONFIRMED', resolvedAt: new Date() }
                });
            }
            await tx.person.delete({
                where: { id: sourceId }
            });
            return { success: true };
        });
    }
    async sendMessage(conversationId, text) {
        const conv = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { person: { include: { identities: true } } }
        });
        if (!conv)
            return { success: false, error: 'Conversation not found' };
        if (conv.channel === 'INSTAGRAM') {
            const igIdentity = conv.person.identities.find(id => id.channel === 'INSTAGRAM');
            if (igIdentity) {
                const success = await this.metaService.sendInstagramMessage(igIdentity.externalId, text);
                if (!success) {
                    return { success: false, error: 'Failed to send to Instagram' };
                }
            }
        }
        let rawPayloadToSave = {};
        if (conv.channel === 'TELEGRAM') {
            const tgIdentity = conv.person.identities.find(id => id.channel === 'TELEGRAM');
            if (tgIdentity) {
                const tgMsg = await this.telegramService.sendTelegramMessage(tgIdentity.externalId, text);
                if (!tgMsg) {
                    return { success: false, error: 'Failed to send to Telegram' };
                }
                rawPayloadToSave = tgMsg;
            }
        }
        const message = await this.prisma.message.create({
            data: {
                conversationId,
                direction: 'OUTBOUND',
                channel: conv.channel,
                text,
                rawPayload: rawPayloadToSave
            }
        });
        return message;
    }
    async getCustomers() {
        return this.prisma.person.findMany({
            include: {
                identities: true,
                _count: {
                    select: { conversations: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)('inbox'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getInbox", null);
__decorate([
    (0, common_1.Get)('suggestions/pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getPendingSuggestions", null);
__decorate([
    (0, common_1.Post)('person/:id/merge'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('sourcePersonId')),
    __param(2, (0, common_1.Body)('suggestionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "mergePerson", null);
__decorate([
    (0, common_1.Post)('message/send'),
    __param(0, (0, common_1.Body)('conversationId')),
    __param(1, (0, common_1.Body)('text')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('customers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getCustomers", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        meta_service_1.MetaService,
        telegram_service_1.TelegramService])
], AppController);
//# sourceMappingURL=app.controller.js.map