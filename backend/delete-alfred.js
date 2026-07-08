const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find person with name or identity containing alfredanto05
  const persons = await prisma.person.findMany({
    include: { identities: true }
  });

  let targetPersonId = null;
  for (const person of persons) {
    if (person.name?.toLowerCase().includes('alfredanto05')) {
      targetPersonId = person.id;
      break;
    }
    const hasIdentity = person.identities.some(i => i.displayName?.toLowerCase().includes('alfredanto05'));
    if (hasIdentity) {
      targetPersonId = person.id;
      break;
    }
  }

  if (!targetPersonId) {
    console.log('User alfredanto05 not found!');
    return;
  }

  console.log(`Found alfredanto05 (Person ID: ${targetPersonId})`);

  // Find their conversations
  const conversations = await prisma.conversation.findMany({
    where: { personId: targetPersonId }
  });

  if (conversations.length === 0) {
    console.log('No conversations found for this user.');
    return;
  }

  const conversationIds = conversations.map(c => c.id);

  // Find 2 most recent messages
  const recentMessages = await prisma.message.findMany({
    where: { conversationId: { in: conversationIds } },
    orderBy: { createdAt: 'desc' },
    take: 2
  });

  if (recentMessages.length === 0) {
    console.log('No messages found to delete.');
    return;
  }

  console.log(`Found ${recentMessages.length} recent messages. Deleting them...`);

  // Delete them (user asked to "delete his most 2 recent messages")
  // We can just completely delete them from the database to satisfy the request fully.
  const msgIds = recentMessages.map(m => m.id);
  await prisma.message.deleteMany({
    where: { id: { in: msgIds } }
  });

  console.log(`Successfully deleted messages: ${msgIds.join(', ')}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
