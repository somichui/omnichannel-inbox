const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.message.findMany({
    include: {
      conversation: {
        include: { person: true }
      }
    }
  });
  console.log('Total messages:', messages.length);
  messages.forEach(m => {
    console.log(`Msg ID: ${m.id} | Person ID: ${m.conversation.person.id} | Name: ${m.conversation.person.name} | Text: ${m.text}`);
  });
}

main().finally(() => prisma.$disconnect());
