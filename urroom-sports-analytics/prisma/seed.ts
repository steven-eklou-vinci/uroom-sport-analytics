import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Création de l'utilisateur joueur Liam O'Connor
  const liamUser = await prisma.user.upsert({
    where: { email: 'liam.oconnor@player.com' },
    update: {},
    create: {
      email: 'liam.oconnor@player.com',
      passwordHash: await bcrypt.hash('player123', 10),
      role: 'PLAYER',
      name: 'Liam O\'Connor',
      locale: 'fr',
    },
  });

  console.log('✅ Seed completed!');
  console.log('\n📧 Utilisateur créé:');
  console.log('Player: liam.oconnor@player.com / player123 (Liam O\'Connor)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
