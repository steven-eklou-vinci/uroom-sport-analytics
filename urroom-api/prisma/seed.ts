import { PrismaClient, Role, AssessmentStatus, TrialStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Création des utilisateurs
  const admin = await prisma.user.create({
    data: {
      email: 'admin@urroom.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
      name: 'Admin Principal',
      locale: 'fr',
    },
  });

  // Création du club AVANT les scouts pour pouvoir les lier
  const mainClub = await prisma.club.create({
    data: {
      name: 'Paris FC',
      country: 'France',
      tier: 'Ligue 2',
      contactEmail: 'contact@parisfc.com',
      notes: 'Club partenaire principal',
      subscriptionTier: 'PREMIUM',
    },
  });

  // Création d'un user CLUB pour se connecter en tant que club
  const clubUser = await prisma.user.create({
    data: {
      email: 'club@parisfc.com',
      passwordHash: await bcrypt.hash('club123', 10),
      role: 'CLUB',
      name: 'Paris FC Admin',
      locale: 'fr',
      clubId: mainClub.id,
    },
  });

  // Scouts liés au club Paris FC
  const scout1 = await prisma.user.create({
    data: {
      email: 'scout1@parisfc.com',
      passwordHash: await bcrypt.hash('scout123', 10),
      role: 'SCOUT',
      name: 'Jean Dupont',
      locale: 'fr',
      clubId: mainClub.id, // Lié au club Paris FC
    },
  });

  const scout2 = await prisma.user.create({
    data: {
      email: 'scout2@parisfc.com',
      passwordHash: await bcrypt.hash('scout123', 10),
      role: 'SCOUT',
      name: 'Marie Martin',
      locale: 'fr',
      clubId: mainClub.id, // Lié au club Paris FC
    },
  });

  // Autre club pour tester
  const club2 = await prisma.club.create({
    data: {
      name: 'Lyon Academy',
      country: 'France',
      tier: 'Academy',
      contactEmail: 'academy@lyon.com',
      notes: 'Section jeunes',
      subscriptionTier: 'FREE',
    },
  });

  // Création de 8 joueurs
  const players = await Promise.all([
    prisma.playerProfile.create({
      data: {
        firstName: 'Kylian',
        lastName: 'Mbappé',
        birthDate: new Date('1998-12-20'),
        nationality: 'France',
        positions: ['Attaquant', 'Ailier gauche'],
        foot: 'Droitier',
        heightCm: 178,
        weightKg: 73,
        tags: ['rapide', 'buteur'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Eduardo',
        lastName: 'Camavinga',
        birthDate: new Date('2002-11-10'),
        nationality: 'France',
        positions: ['Milieu défensif', 'Milieu central'],
        foot: 'Gaucher',
        heightCm: 182,
        weightKg: 68,
        tags: ['polyvalent', 'vision du jeu'],
        publicOptIn: false,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Marcus',
        lastName: 'Rashford',
        birthDate: new Date('1997-10-31'),
        nationality: 'Angleterre',
        positions: ['Ailier gauche', 'Attaquant'],
        foot: 'Droitier',
        heightCm: 180,
        weightKg: 70,
        tags: ['rapide', 'dribbleur'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Jude',
        lastName: 'Bellingham',
        birthDate: new Date('2003-06-29'),
        nationality: 'Angleterre',
        positions: ['Milieu offensif', 'Milieu central'],
        foot: 'Droitier',
        heightCm: 186,
        weightKg: 75,
        tags: ['physique', 'technique'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Gavi',
        lastName: 'Páez',
        birthDate: new Date('2004-08-05'),
        nationality: 'Espagne',
        positions: ['Milieu central', 'Milieu offensif'],
        foot: 'Droitier',
        heightCm: 173,
        weightKg: 68,
        tags: ['technique', 'pressing'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Pedri',
        lastName: 'González',
        birthDate: new Date('2002-11-25'),
        nationality: 'Espagne',
        positions: ['Milieu central'],
        foot: 'Droitier',
        heightCm: 174,
        weightKg: 60,
        tags: ['vision', 'passes'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Alphonso',
        lastName: 'Davies',
        birthDate: new Date('2000-11-02'),
        nationality: 'Canada',
        positions: ['Latéral gauche', 'Ailier gauche'],
        foot: 'Gaucher',
        heightCm: 183,
        weightKg: 72,
        tags: ['vitesse', 'endurance'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Jamal',
        lastName: 'Musiala',
        birthDate: new Date('2003-02-26'),
        nationality: 'Allemagne',
        positions: ['Milieu offensif', 'Ailier'],
        foot: 'Droitier',
        heightCm: 180,
        weightKg: 70,
        tags: ['dribble', 'créativité'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
  ]);

  // 2 assessments par joueur avec des métriques variées
  for (const player of players) {
    for (let i = 0; i < 2; i++) {
      await prisma.assessment.create({
        data: {
          playerId: player.id,
          scoutId: scout1.id,
          date: new Date(2025, 8 + i, 15),
          location: i === 0 ? 'Paris Training Center' : 'Uroom Sports Lab',
          notes: `Évaluation ${i + 1} - Workshop Uroom`,
          status: 'DONE',
          videos: [
            `https://example.com/videos/${player.id}_session${i + 1}_sprint.mp4`,
            `https://example.com/videos/${player.id}_session${i + 1}_control.mp4`,
          ],
          metrics: {
            create: [
              { key: 'Vitesse', value: 70 + Math.random() * 25, unit: '/100' },
              { key: 'Dribble', value: 65 + Math.random() * 30, unit: '/100' },
              { key: 'Tir', value: 60 + Math.random() * 35, unit: '/100' },
              { key: 'Passe', value: 70 + Math.random() * 25, unit: '/100' },
              { key: 'Défense', value: 55 + Math.random() * 35, unit: '/100' },
              { key: 'Physique', value: 65 + Math.random() * 30, unit: '/100' },
              { key: 'Contrôle', value: 70 + Math.random() * 25, unit: '/100' },
              { key: 'Vision', value: 65 + Math.random() * 30, unit: '/100' },
            ],
          },
        },
      });
    }
  }

  // Exemple de rapport
  await prisma.report.create({
    data: {
      playerId: players[0].id,
      summary: 'Joueur très rapide, bonne finition.',
      strengths: ['Vitesse', 'Finition'],
      weaknesses: ['Jeu de tête'],
      clubFit: ['Paris FC'],
      pdfUrl: null,
      authorId: scout1.id,
    },
  });

  // Shortlist club
  await prisma.shortlist.create({
    data: {
      name: 'Cibles 2025',
      clubId: mainClub.id,
      players: {
        create: [
          { playerId: players[0].id },
          { playerId: players[1].id },
        ],
      },
    },
  });

  // TrialRequest exemple
  await prisma.trialRequest.create({
    data: {
      clubId: mainClub.id,
      playerId: players[0].id,
      message: 'Nous souhaitons inviter ce joueur à un essai.',
      status: 'PENDING',
    },
  });

  console.log('✅ Seed completed!');
  console.log('\n📧 Comptes créés:');
  console.log('Admin: admin@urroom.com / admin123');
  console.log('Club: club@parisfc.com / club123');
  console.log('Scout 1: scout1@parisfc.com / scout123 (Jean Dupont)');
  console.log('Scout 2: scout2@parisfc.com / scout123 (Marie Martin)');
  console.log(`\n🏢 Club créé: ${mainClub.name} (${mainClub.id})`);
  console.log(`👥 ${players.length} joueurs créés`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
