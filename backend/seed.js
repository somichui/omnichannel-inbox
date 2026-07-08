const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const telegramPerson = await prisma.person.findFirst({
    where: {
      channelIdentities: {
        some: { channel: 'TELEGRAM' }
      }
    }
  });

  if (telegramPerson) {
    const existingAttributes = telegramPerson.attributes || {};
    await prisma.person.update({
      where: { id: telegramPerson.id },
      data: {
        attributes: {
          ...existingAttributes,
          orderNumbers: ['48592']
        }
      }
    });
    console.log("Successfully seeded order #48592 to the Telegram user!");
  } else {
    console.log("No Telegram user found!");
  }
}

main().finally(() => prisma.$disconnect());
