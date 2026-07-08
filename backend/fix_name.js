const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mergedPerson = await prisma.person.findFirst({
    where: {
      identities: {
        some: { channel: 'TELEGRAM' }
      }
    }
  });

  if (mergedPerson) {
    await prisma.person.update({
      where: { id: mergedPerson.id },
      data: { name: 'Telegram User | John Doe' }
    });
    console.log("Successfully updated the merged person's name!");
  }
}

main().finally(() => prisma.$disconnect());
