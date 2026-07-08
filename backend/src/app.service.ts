import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  async mergePerson(targetId: string, sourceId: string, suggestionId?: string) {
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

  async unmergePerson(originalPersonId: string, identityIdsToDetach: string[]) {
    return this.prisma.$transaction(async (tx) => {
      const originalPerson = await tx.person.findUnique({ where: { id: originalPersonId } });
      if (!originalPerson) throw new Error('Person not found');

      // Create a new Person for the detached identities
      const newPerson = await tx.person.create({
        data: {
          name: `Split from ${originalPerson.name || 'Unknown'}`
        }
      });

      // Detach specific identities and move them to new person
      const identities = await tx.channelIdentity.findMany({
        where: { id: { in: identityIdsToDetach } }
      });

      for (const identity of identities) {
        // Move Identity
        await tx.channelIdentity.update({
          where: { id: identity.id },
          data: { personId: newPerson.id }
        });

        // Find Conversations for this identity's channel belonging to the original person
        // and move them to the new person.
        await tx.conversation.updateMany({
          where: {
            personId: originalPersonId,
            channel: identity.channel
          },
          data: {
            personId: newPerson.id
          }
        });
      }

      return { success: true, newPersonId: newPerson.id };
    });
  }
}
