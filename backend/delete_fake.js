const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.channelIdentity.deleteMany({
    where: { externalId: '1234567', channel: 'TELEGRAM' }
  });
  console.log("Deleted fake Telegram identity!");
}

main().finally(() => prisma.$disconnect());
