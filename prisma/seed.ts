import {prisma} from '../src/config/database';
import bcrypt from 'bcrypt';

async function main() {
  const password = await bcrypt.hash('password123', 10);
  await prisma.user.createMany({
    data: [
      { email: 'alice@example.com', name: 'Alice', password },
      { email: 'bob@example.com', name: 'Bob', password },
    ],
    skipDuplicates: true
  });
  console.log('Seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
