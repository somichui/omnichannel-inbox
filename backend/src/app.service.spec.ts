import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppService', () => {
  let service: AppService;
  let prisma: PrismaService;

  beforeEach(async () => {
    // Mock the Prisma client and its transaction method
    const mockPrisma = {
      $transaction: jest.fn(async (callback) => {
        return callback(mockPrisma);
      }),
      person: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      channelIdentity: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      conversation: {
        updateMany: jest.fn(),
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('unmergePerson', () => {
    it('should split identities into a new person and update conversations', async () => {
      const originalPersonId = 'p1';
      const identityIdsToDetach = ['id1', 'id2'];
      const newPersonId = 'new_p_123';

      (prisma.person.findUnique as jest.Mock).mockResolvedValue({
        id: originalPersonId,
        name: 'Original Person',
      });

      (prisma.person.create as jest.Mock).mockResolvedValue({
        id: newPersonId,
        name: 'Split from Original Person',
      });

      (prisma.channelIdentity.findMany as jest.Mock).mockResolvedValue([
        { id: 'id1', channel: 'TELEGRAM' },
        { id: 'id2', channel: 'INSTAGRAM' },
      ]);

      const result = await service.unmergePerson(originalPersonId, identityIdsToDetach);

      expect(result).toEqual({ success: true, newPersonId });
      expect(prisma.person.create).toHaveBeenCalledWith({
        data: { name: 'Split from Original Person' },
      });

      // Verify identities are moved
      expect(prisma.channelIdentity.update).toHaveBeenCalledWith({
        where: { id: 'id1' },
        data: { personId: newPersonId },
      });
      expect(prisma.channelIdentity.update).toHaveBeenCalledWith({
        where: { id: 'id2' },
        data: { personId: newPersonId },
      });

      // Verify conversations are moved
      expect(prisma.conversation.updateMany).toHaveBeenCalledWith({
        where: { personId: originalPersonId, channel: 'TELEGRAM' },
        data: { personId: newPersonId },
      });
      expect(prisma.conversation.updateMany).toHaveBeenCalledWith({
        where: { personId: originalPersonId, channel: 'INSTAGRAM' },
        data: { personId: newPersonId },
      });
    });
  });
});
