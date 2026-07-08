const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.person.findMany({
    where: {
      attributes: {
        path: ['orderNumbers'],
        array_contains: "48592"
      }
    }
  });
  console.log('Matches:', matches.length);
}

main().finally(() => prisma.$disconnect());
