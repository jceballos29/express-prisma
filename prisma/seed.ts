import bcrypt from 'bcrypt';

import { config, prisma } from '../src/config';
import { logger } from '../src/shared/utils';

async function main() {
  const password = await bcrypt.hash(config.admin.password, 10);
  const user = await prisma.user.upsert({
    where: {
      email: config.admin.email,
    },
    create: {
      email: 'jacu29@gmail.com',
      name: 'Juan Ceballos',
      role: 'Admin',
      password,
    },
    update: {
      password,
    },
  });
  logger.info({ user: { name: user.name, email: user.email } }, 'Created or updated admin user');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
