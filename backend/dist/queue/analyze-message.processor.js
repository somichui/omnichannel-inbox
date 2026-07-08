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
var AnalyzeMessageProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyzeMessageProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const events_gateway_1 = require("../events/events.gateway");
const prisma_service_1 = require("../prisma/prisma.service");
const google_1 = require("@ai-sdk/google");
const ai_1 = require("ai");
let AnalyzeMessageProcessor = AnalyzeMessageProcessor_1 = class AnalyzeMessageProcessor extends bullmq_1.WorkerHost {
    eventsGateway;
    prisma;
    logger = new common_1.Logger(AnalyzeMessageProcessor_1.name);
    constructor(eventsGateway, prisma) {
        super();
        this.eventsGateway = eventsGateway;
        this.prisma = prisma;
    }
    async process(job) {
        const { messageId, text, conversationId } = job.data;
        this.logger.log(`Analyzing message ${messageId} via Gemini...`);
        try {
            let sentiment = 'NEUTRAL';
            let urgencyScore = 5;
            let classification = 'GENERAL_INQUIRY';
            let suggestedReply = 'Thank you for reaching out! We are looking into this for you.';
            try {
                const result = await (0, ai_1.generateText)({
                    model: (0, google_1.google)('gemini-flash-latest'),
                    prompt: `Analyze this customer message: "${text}". 
Respond ONLY with a valid JSON object matching exactly this schema:
{
  "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  "urgencyScore": number (1-10),
  "classification": "ORDER_STATUS_INQUIRY" | "REFUND_REQUEST" | "PRODUCT_QUESTION" | "COMPLAINT" | "GENERAL_INQUIRY" | "OTHER",
  "suggestedReply": "string"
}`
                });
                const parsed = JSON.parse(result.text.replace(/```json/g, '').replace(/```/g, '').trim());
                sentiment = parsed.sentiment || 'NEUTRAL';
                urgencyScore = parsed.urgencyScore || 5;
                classification = parsed.classification || 'GENERAL_INQUIRY';
                suggestedReply = parsed.suggestedReply || 'Thank you for reaching out!';
            }
            catch (error) {
                this.logger.error(`Gemini Error: ${error.message || error}`);
                if (text.includes('#')) {
                    classification = 'ORDER_STATUS_INQUIRY';
                    suggestedReply = 'Hello! Let me quickly check the shipping status for your order right away.';
                }
            }
            await this.prisma.message.update({
                where: { id: messageId },
                data: {
                    sentiment,
                    urgencyScore,
                    intent: classification,
                    suggestedReply,
                }
            });
            this.eventsGateway.server.emit('message:suggestion-complete', {
                messageId,
                conversationId,
                sentiment: sentiment,
                intent: classification,
                urgencyScore: urgencyScore,
                suggestedReply: suggestedReply,
            });
            this.logger.log(`Finished analyzing message ${messageId}`);
        }
        catch (error) {
            this.logger.error(`Error analyzing message: ${error.message}`);
        }
    }
};
exports.AnalyzeMessageProcessor = AnalyzeMessageProcessor;
exports.AnalyzeMessageProcessor = AnalyzeMessageProcessor = AnalyzeMessageProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('analyze-message-v2'),
    __metadata("design:paramtypes", [events_gateway_1.EventsGateway,
        prisma_service_1.PrismaService])
], AnalyzeMessageProcessor);
//# sourceMappingURL=analyze-message.processor.js.map