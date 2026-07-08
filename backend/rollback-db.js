require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function rollback() {
  // Find all identities
  const identities = await prisma.channelIdentity.findMany({
    include: { person: true }
  });

  // Let's find the main ones the user cares about
  // "s z" (Telegram), "John Doe" (WhatsApp?), "InstaShopper" (Instagram)
  // To be safe, let's just find the first person, or let's find the identities that match those names
  const targetIdentities = identities.filter(id => 
    (id.displayName && (id.displayName.includes('s z') || id.displayName.includes('s') || id.displayName.includes('John') || id.displayName.includes('Insta'))) ||
    (id.externalId && (id.externalId.includes('s z') || id.externalId.includes('John') || id.externalId.includes('Insta')))
  );

  if (targetIdentities.length === 0) {
    console.log("Could not find the identities to merge. Merging ALL identities into one just in case there are only 3.");
  }

  const identitiesToMerge = targetIdentities.length > 0 ? targetIdentities : identities;

  if (identitiesToMerge.length === 0) {
    console.log("No identities found in DB.");
    return;
  }

  // Pick the first personId as the target
  const targetPersonId = identitiesToMerge[0].personId;
  const targetPerson = await prisma.person.findUnique({ where: { id: targetPersonId } });

  console.log(`Target Person ID: ${targetPersonId}, Name: ${targetPerson.name}`);

  for (const identity of identitiesToMerge) {
    if (identity.personId !== targetPersonId) {
      console.log(`Moving identity ${identity.channel} (${identity.displayName || identity.externalId}) to target person`);
      
      // Move identity
      await prisma.channelIdentity.update({
        where: { id: identity.id },
        data: { personId: targetPersonId }
      });

      // Move conversations
      await prisma.conversation.updateMany({
        where: { personId: identity.personId, channel: identity.channel },
        data: { personId: targetPersonId }
      });
    }
  }

  // Update target person name
  const allIdentitiesNow = await prisma.channelIdentity.findMany({ where: { personId: targetPersonId } });
  const newName = allIdentitiesNow.map(id => id.displayName || id.externalId).join(' | ');
  
  await prisma.person.update({
    where: { id: targetPersonId },
    data: { name: newName }
  });

  console.log(`Merged! Target person is now named: ${newName}`);

  // Optional: delete orphaned persons
  const allPersons = await prisma.person.findMany({ include: { identities: true } });
  for (const p of allPersons) {
    if (p.identities.length === 0 && p.id !== targetPersonId) {
      console.log(`Moving orphaned conversations for person: ${p.name}`);
      await prisma.conversation.updateMany({
        where: { personId: p.id },
        data: { personId: targetPersonId }
      });
      console.log(`Deleting orphaned person: ${p.name}`);
      await prisma.person.delete({ where: { id: p.id } });
    }
  }

  console.log('Database rollback complete.');
  await prisma.$disconnect();
}

rollback().catch(console.error);
