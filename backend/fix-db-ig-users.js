require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fixIgUsers() {
  const people = await prisma.person.findMany({ include: { identities: true } });
  
  // Find the new persons we created for the IG users
  const p1 = people.find(p => p.identities.some(id => id.externalId === '12334'));
  const p2 = people.find(p => p.identities.some(id => id.externalId === '7685672208170275'));
  
  const orphanedConvPerson = people.find(p => p.id === 'cmrbtcy2y00042dage2swgfqd'); // Person with the 3 conversations

  if (!p1 || !p2) { console.log('Could not find the new IG persons'); return; }

  // 3. Move conversations from orphaned person
  if (orphanedConvPerson) {
    const convs = await prisma.conversation.findMany({ where: { personId: orphanedConvPerson.id }, include: { messages: true } });
    for (const conv of convs) {
      if (conv.messages.length > 0) {
        const payload = conv.messages[0].rawPayload;
        let senderId = null;
        if (payload && payload.sender && payload.sender.id) senderId = payload.sender.id;
        else if (payload && payload.entry && payload.entry[0] && payload.entry[0].messaging && payload.entry[0].messaging[0].sender.id) senderId = payload.entry[0].messaging[0].sender.id;
        
        console.log(`Conv ${conv.id} senderId: ${senderId}`);
        
        if (senderId === '12334' && p1) {
           await prisma.conversation.update({ where: { id: conv.id }, data: { personId: p1.id } });
           console.log(`Moved to p1`);
        } else if (p2) {
           await prisma.conversation.update({ where: { id: conv.id }, data: { personId: p2.id } });
           console.log(`Moved to p2`);
        }
      } else if (p2) {
        await prisma.conversation.update({ where: { id: conv.id }, data: { personId: p2.id } });
        console.log(`Moved to p2`);
      }
    }
  }

  // 4. Delete the empty "Split from..." persons
  const allPersons = await prisma.person.findMany({ include: { identities: true } });
  for (const p of allPersons) {
    if (p.identities.length === 0 && p.name && p.name.includes('Split from')) {
      const convs = await prisma.conversation.count({ where: { personId: p.id } });
      if (convs === 0) {
        console.log(`Deleting empty orphaned person: ${p.id}`);
        await prisma.person.delete({ where: { id: p.id } });
      } else {
        console.log(`Cannot delete ${p.id} because it still has ${convs} conversations!`);
      }
    }
  }

  await prisma.$disconnect();
}
fixIgUsers().catch(console.error);
