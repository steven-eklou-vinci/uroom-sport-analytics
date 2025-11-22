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

  // Création de 20 joueurs avec noms inventés, âges variés (9-25 ans) et différents postes
  const players = await Promise.all([
    // U10-U12 (9-11 ans) - Jeunes talents
    prisma.playerProfile.create({
      data: {
        firstName: 'Lucas',
        lastName: 'Beaumont',
        birthDate: new Date('2016-03-15'),
        nationality: 'France',
        positions: ['Ailier droit', 'Attaquant'],
        foot: 'Droitier',
        heightCm: 140,
        weightKg: 35,
        tags: ['jeune talent', 'rapide'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Emma',
        lastName: 'Rousseau',
        birthDate: new Date('2015-09-22'),
        nationality: 'France',
        positions: ['Milieu offensif'],
        foot: 'Gaucher',
        heightCm: 145,
        weightKg: 38,
        tags: ['technique', 'vision'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    // U14 (12-13 ans)
    prisma.playerProfile.create({
      data: {
        firstName: 'Noah',
        lastName: 'Moreau',
        birthDate: new Date('2012-05-10'),
        nationality: 'Belgique',
        positions: ['Défenseur central'],
        foot: 'Droitier',
        heightCm: 165,
        weightKg: 52,
        tags: ['solide', 'placement'],
        publicOptIn: false,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Sofia',
        lastName: 'Martinez',
        birthDate: new Date('2013-01-18'),
        nationality: 'Espagne',
        positions: ['Gardien de but'],
        foot: 'Droitier',
        heightCm: 158,
        weightKg: 48,
        tags: ['réflexes', 'jeu au pied'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    // U16 (14-15 ans)
    prisma.playerProfile.create({
      data: {
        firstName: 'Theo',
        lastName: 'Blanchard',
        birthDate: new Date('2010-07-03'),
        nationality: 'France',
        positions: ['Milieu défensif', 'Défenseur central'],
        foot: 'Droitier',
        heightCm: 175,
        weightKg: 65,
        tags: ['récupération', 'physique'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Aisha',
        lastName: 'Koné',
        birthDate: new Date('2011-11-28'),
        nationality: 'Côte d\'Ivoire',
        positions: ['Ailier gauche', 'Attaquant'],
        foot: 'Gaucher',
        heightCm: 168,
        weightKg: 58,
        tags: ['vitesse', 'dribble'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    // U18 (16-17 ans)
    prisma.playerProfile.create({
      data: {
        firstName: 'Marcus',
        lastName: 'Williams',
        birthDate: new Date('2008-04-12'),
        nationality: 'Angleterre',
        positions: ['Latéral droit', 'Milieu droit'],
        foot: 'Droitier',
        heightCm: 178,
        weightKg: 70,
        tags: ['endurance', 'centres'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Léa',
        lastName: 'Fontaine',
        birthDate: new Date('2009-08-30'),
        nationality: 'France',
        positions: ['Milieu central'],
        foot: 'Droitier',
        heightCm: 170,
        weightKg: 62,
        tags: ['passes', 'vision du jeu'],
        publicOptIn: false,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Diego',
        lastName: 'Santos',
        birthDate: new Date('2008-12-05'),
        nationality: 'Brésil',
        positions: ['Attaquant', 'Ailier droit'],
        foot: 'Gaucher',
        heightCm: 176,
        weightKg: 68,
        tags: ['finition', 'technique'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    // U20 (18-19 ans)
    prisma.playerProfile.create({
      data: {
        firstName: 'Ahmed',
        lastName: 'El-Amin',
        birthDate: new Date('2007-02-20'),
        nationality: 'Maroc',
        positions: ['Milieu offensif', 'Ailier'],
        foot: 'Droitier',
        heightCm: 180,
        weightKg: 72,
        tags: ['créativité', 'dribble'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Yuki',
        lastName: 'Tanaka',
        birthDate: new Date('2006-06-14'),
        nationality: 'Japon',
        positions: ['Latéral gauche'],
        foot: 'Gaucher',
        heightCm: 172,
        weightKg: 66,
        tags: ['discipline', 'technique'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    // Seniors (20-25 ans)
    prisma.playerProfile.create({
      data: {
        firstName: 'Anton',
        lastName: 'Volkov',
        birthDate: new Date('2005-03-08'),
        nationality: 'Russie',
        positions: ['Défenseur central'],
        foot: 'Droitier',
        heightCm: 188,
        weightKg: 82,
        tags: ['puissance', 'jeu aérien'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Isabella',
        lastName: 'Romano',
        birthDate: new Date('2004-10-17'),
        nationality: 'Italie',
        positions: ['Milieu central', 'Milieu défensif'],
        foot: 'Droitier',
        heightCm: 168,
        weightKg: 60,
        tags: ['intelligence', 'passes'],
        publicOptIn: false,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Elias',
        lastName: 'Andersen',
        birthDate: new Date('2003-07-25'),
        nationality: 'Norvège',
        positions: ['Attaquant'],
        foot: 'Droitier',
        heightCm: 184,
        weightKg: 78,
        tags: ['physique', 'finition'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Amara',
        lastName: 'Diallo',
        birthDate: new Date('2002-01-11'),
        nationality: 'Sénégal',
        positions: ['Ailier droit', 'Ailier gauche'],
        foot: 'Droitier',
        heightCm: 177,
        weightKg: 71,
        tags: ['vitesse', 'percussion'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Oliver',
        lastName: 'Schmidt',
        birthDate: new Date('2001-09-03'),
        nationality: 'Allemagne',
        positions: ['Milieu droit', 'Ailier droit'],
        foot: 'Gaucher',
        heightCm: 181,
        weightKg: 74,
        tags: ['polyvalent', 'travail défensif'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Mateo',
        lastName: 'Silva',
        birthDate: new Date('2002-05-29'),
        nationality: 'Argentine',
        positions: ['Milieu offensif'],
        foot: 'Gaucher',
        heightCm: 174,
        weightKg: 68,
        tags: ['technique', 'vision'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Kayla',
        lastName: 'Johnson',
        birthDate: new Date('2000-12-22'),
        nationality: 'États-Unis',
        positions: ['Défenseur central', 'Milieu défensif'],
        foot: 'Droitier',
        heightCm: 175,
        weightKg: 68,
        tags: ['leadership', 'placement'],
        publicOptIn: false,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Jin',
        lastName: 'Park',
        birthDate: new Date('2001-04-16'),
        nationality: 'Corée du Sud',
        positions: ['Gardien de but'],
        foot: 'Droitier',
        heightCm: 186,
        weightKg: 80,
        tags: ['réflexes', 'sorties aériennes'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
    prisma.playerProfile.create({
      data: {
        firstName: 'Liam',
        lastName: 'O\'Connor',
        birthDate: new Date('2000-08-07'),
        nationality: 'Irlande',
        positions: ['Attaquant', 'Second attaquant'],
        foot: 'Droitier',
        heightCm: 179,
        weightKg: 73,
        tags: ['mobilité', 'pressing'],
        publicOptIn: true,
        photoUrl: '',
        videoUrls: [],
      },
    }),
  ]);

  // 2 assessments par joueur avec des métriques variées et réalistes
  for (const player of players) {
    // Calcul de l'âge pour adapter les métriques
    const birthYear = player.birthDate.getFullYear();
    const age = 2025 - birthYear;
    
    // Coefficients selon l'âge pour des métriques réalistes
    let baseCoef = 1.0;
    if (age <= 11) baseCoef = 0.4; // Jeunes: 40-70/100
    else if (age <= 13) baseCoef = 0.5; // U14: 50-75/100
    else if (age <= 15) baseCoef = 0.6; // U16: 55-80/100
    else if (age <= 17) baseCoef = 0.7; // U18: 60-85/100
    else if (age <= 19) baseCoef = 0.75; // U20: 65-90/100
    else baseCoef = 0.8; // Seniors: 70-95/100

    for (let i = 0; i < 2; i++) {
      // Ajout d'une légère variation entre les 2 évaluations
      const sessionVariation = (Math.random() - 0.5) * 10;
      
      await prisma.assessment.create({
        data: {
          playerId: player.id,
          scoutId: i === 0 ? scout1.id : scout2.id,
          date: new Date(2025, 8 + i, 15),
          location: i === 0 ? 'Paris Training Center' : 'Uroom Sports Lab',
          notes: `Évaluation ${i + 1} - ${player.firstName} ${player.lastName} (${age} ans)`,
          status: 'DONE',
          videos: [
            `https://example.com/videos/${player.id}_session${i + 1}_sprint.mp4`,
            `https://example.com/videos/${player.id}_session${i + 1}_control.mp4`,
          ],
          metrics: {
            create: [
              { 
                key: 'Vitesse', 
                value: Math.max(30, Math.min(95, 50 + (baseCoef * 30) + (Math.random() * 20) + sessionVariation)),
                unit: '/100' 
              },
              { 
                key: 'Dribble', 
                value: Math.max(30, Math.min(95, 45 + (baseCoef * 35) + (Math.random() * 20) + sessionVariation)),
                unit: '/100' 
              },
              { 
                key: 'Tir', 
                value: Math.max(25, Math.min(95, 40 + (baseCoef * 35) + (Math.random() * 25) + sessionVariation)),
                unit: '/100' 
              },
              { 
                key: 'Passe', 
                value: Math.max(35, Math.min(95, 50 + (baseCoef * 30) + (Math.random() * 20) + sessionVariation)),
                unit: '/100' 
              },
              { 
                key: 'Défense', 
                value: Math.max(30, Math.min(95, 40 + (baseCoef * 35) + (Math.random() * 25) + sessionVariation)),
                unit: '/100' 
              },
              { 
                key: 'Physique', 
                value: Math.max(30, Math.min(95, 45 + (baseCoef * 35) + (Math.random() * 20) + sessionVariation)),
                unit: '/100' 
              },
              { 
                key: 'Contrôle', 
                value: Math.max(35, Math.min(95, 50 + (baseCoef * 30) + (Math.random() * 20) + sessionVariation)),
                unit: '/100' 
              },
              { 
                key: 'Vision', 
                value: Math.max(30, Math.min(95, 45 + (baseCoef * 35) + (Math.random() * 20) + sessionVariation)),
                unit: '/100' 
              },
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
