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
var MessageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const telegram_service_1 = require("../telegram/telegram.service");
let MessageService = MessageService_1 = class MessageService {
    prisma;
    telegramService;
    logger = new common_1.Logger(MessageService_1.name);
    constructor(prisma, telegramService) {
        this.prisma = prisma;
        this.telegramService = telegramService;
    }
    async deleteMessage(messageId, type) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
            include: { conversation: { include: { person: { include: { identities: true } } } } }
        });
        if (!message) {
            throw new common_1.NotFoundException('Message not found');
        }
        if (type === 'FOR_EVERYONE' && message.direction === 'INBOUND') {
            throw new common_1.BadRequestException('Cannot delete inbound messages for everyone');
        }
        if (type === 'FOR_ME') {
            await this.prisma.message.update({
                where: { id: messageId },
                data: { deletedForMe: true }
            });
            return { success: true, messageId, deletedForMe: true };
        }
        if (type === 'FOR_EVERYONE') {
            await this.prisma.message.update({
                where: { id: messageId },
                data: { deletedForEveryone: true }
            });
            if (message.channel === 'TELEGRAM') {
                const tgIdentity = message.conversation.person.identities.find(id => id.channel === 'TELEGRAM');
                if (tgIdentity && message.rawPayload && message.rawPayload.message_id) {
                    await this.telegramService.deleteTelegramMessage(tgIdentity.externalId, message.rawPayload.message_id);
                    this.logger.log(`Successfully deleted upstream Telegram message...`);
                }
            }
            return { success: true, messageId, deletedForEveryone: true };
        }
    }
};
exports.MessageService = MessageService;
exports.MessageService = MessageService = MessageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        telegram_service_1.TelegramService])
], MessageService);
//# sourceMappingURL=message.service.js.map