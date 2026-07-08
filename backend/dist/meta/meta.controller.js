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
exports.MetaController = void 0;
const common_1 = require("@nestjs/common");
const meta_service_1 = require("./meta.service");
const client_1 = require("@prisma/client");
let MetaController = class MetaController {
    metaService;
    constructor(metaService) {
        this.metaService = metaService;
    }
    verifyWebhook(mode, token, challenge, res) {
        if (mode === 'subscribe' && token) {
            return res.status(common_1.HttpStatus.OK).send(challenge);
        }
        return res.sendStatus(common_1.HttpStatus.FORBIDDEN);
    }
    async handleWebhook(body, res) {
        try {
            if (body.object === 'whatsapp_business_account') {
                for (const entry of body.entry || []) {
                    for (const change of entry.changes || []) {
                        if (change.value && change.value.messages) {
                            const contacts = change.value.contacts || [];
                            for (const message of change.value.messages) {
                                if (message.type === 'text') {
                                    const from = message.from;
                                    const text = message.text.body;
                                    const contact = contacts.find((c) => c.wa_id === from);
                                    const displayName = contact?.profile?.name || from;
                                    await this.metaService.processIncomingMessage(from, displayName, text, message, client_1.Channel.WHATSAPP);
                                }
                            }
                        }
                    }
                }
            }
            if (body.object === 'instagram' || body.object === 'page') {
                for (const entry of body.entry || []) {
                    for (const messaging of entry.messaging || []) {
                        if (messaging.message && messaging.message.text) {
                            const from = messaging.sender.id;
                            const text = messaging.message.text;
                            const displayName = `IG User (${from})`;
                            await this.metaService.processIncomingMessage(from, displayName, text, messaging, client_1.Channel.INSTAGRAM);
                        }
                    }
                    for (const change of entry.changes || []) {
                        if (change.field === 'messages' && change.value && change.value.message && change.value.message.text) {
                            const from = change.value.sender.id;
                            const text = change.value.message.text;
                            const displayName = `IG User (${from})`;
                            await this.metaService.processIncomingMessage(from, displayName, text, change.value, client_1.Channel.INSTAGRAM);
                        }
                    }
                }
            }
            res.status(common_1.HttpStatus.OK).send('EVENT_RECEIVED');
        }
        catch (e) {
            console.error('Error handling meta webhook:', e);
            res.sendStatus(common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async simulateWhatsApp(body, res) {
        await this.metaService.processIncomingMessage(body.from, body.name, body.text, body, client_1.Channel.WHATSAPP);
        res.status(common_1.HttpStatus.OK).send({ success: true });
    }
    async simulateInstagram(body, res) {
        await this.metaService.processIncomingMessage(body.from, body.name, body.text, body, client_1.Channel.INSTAGRAM);
        res.status(common_1.HttpStatus.OK).send({ success: true });
    }
};
exports.MetaController = MetaController;
__decorate([
    (0, common_1.Get)('webhook'),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], MetaController.prototype, "verifyWebhook", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MetaController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Post)('simulate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MetaController.prototype, "simulateWhatsApp", null);
__decorate([
    (0, common_1.Post)('simulate-instagram'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MetaController.prototype, "simulateInstagram", null);
exports.MetaController = MetaController = __decorate([
    (0, common_1.Controller)('meta'),
    __metadata("design:paramtypes", [meta_service_1.MetaService])
], MetaController);
//# sourceMappingURL=meta.controller.js.map