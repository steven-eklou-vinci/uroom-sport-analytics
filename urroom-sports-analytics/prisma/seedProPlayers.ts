/**
 * Script de seed pour ajouter des profils de joueurs professionnels
 * Utilisé pour les comparaisons IA
 * 
 * Usage: npx ts-node prisma/seedProPlayers.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const proPlayers = [
  {
    name: "Bernardo Silva",
    currentClub: "Manchester City",
    nationality: "Portugal",
    positions: ["Milieu central", "Milieu offensif", "Ailier droit"],
    birthDate: new Date("1994-08-10"),
    photoUrl: null,
    currentLeague: "Premier League",
    marketValue: 80.0,
    playingStyle: ["Technique", "Vision de jeu", "Passe courte", "Pressing", "Dribble"],
    careerPath: ["Benfica Formation", "Monaco (2014-2017)", "Manchester City (2017-)"],
    historicalStats: {
      "15": { technical: 7.2, physical: 6.0, tactical: 6.5, mental: 6.8 },
      "16": { technical: 7.5, physical: 6.2, tactical: 6.8, mental: 7.0 },
      "17": { technical: 7.8, physical: 6.5, tactical: 7.0, mental: 7.2 },
      "18": { technical: 8.0, physical: 6.8, tactical: 7.3, mental: 7.5 }
    }
  },
  {
    name: "Eduardo Camavinga",
    currentClub: "Real Madrid",
    nationality: "France",
    positions: ["Milieu défensif", "Milieu central"],
    birthDate: new Date("2002-11-10"),
    photoUrl: null,
    currentLeague: "La Liga",
    marketValue: 100.0,
    playingStyle: ["Récupération", "Duel", "Vitesse", "Polyvalence", "Vision"],
    careerPath: ["Rennes Formation", "Rennes (2019-2021)", "Real Madrid (2021-)"],
    historicalStats: {
      "15": { technical: 6.8, physical: 7.5, tactical: 7.0, mental: 7.2 },
      "16": { technical: 7.0, physical: 7.8, tactical: 7.3, mental: 7.5 },
      "17": { technical: 7.3, physical: 8.0, tactical: 7.5, mental: 7.8 },
      "18": { technical: 7.5, physical: 8.2, tactical: 7.8, mental: 8.0 }
    }
  },
  {
    name: "Phil Foden",
    currentClub: "Manchester City",
    nationality: "Angleterre",
    positions: ["Milieu offensif", "Ailier gauche", "Ailier droit"],
    birthDate: new Date("2000-05-28"),
    photoUrl: null,
    currentLeague: "Premier League",
    marketValue: 110.0,
    playingStyle: ["Technique", "Créativité", "Finition", "Conduite de balle", "Passe"],
    careerPath: ["Manchester City Academy", "Manchester City (2017-)"],
    historicalStats: {
      "15": { technical: 7.5, physical: 6.5, tactical: 6.8, mental: 7.0 },
      "16": { technical: 7.8, physical: 6.8, tactical: 7.2, mental: 7.3 },
      "17": { technical: 8.0, physical: 7.0, tactical: 7.5, mental: 7.5 },
      "18": { technical: 8.3, physical: 7.2, tactical: 7.8, mental: 7.8 }
    }
  },
  {
    name: "Warren Zaïre-Emery",
    currentClub: "Paris Saint-Germain",
    nationality: "France",
    positions: ["Milieu central", "Milieu défensif"],
    birthDate: new Date("2006-03-08"),
    photoUrl: null,
    currentLeague: "Ligue 1",
    marketValue: 60.0,
    playingStyle: ["Technique", "Intelligence tactique", "Passe", "Discipline", "Maturité"],
    careerPath: ["PSG Academy", "Paris Saint-Germain (2022-)"],
    historicalStats: {
      "15": { technical: 7.0, physical: 6.5, tactical: 7.2, mental: 7.5 },
      "16": { technical: 7.3, physical: 6.8, tactical: 7.5, mental: 7.8 },
      "17": { technical: 7.5, physical: 7.0, tactical: 7.8, mental: 8.0 }
    }
  },
  {
    name: "Jamal Musiala",
    currentClub: "Bayern Munich",
    nationality: "Allemagne",
    positions: ["Milieu offensif", "Ailier gauche"],
    birthDate: new Date("2003-02-26"),
    photoUrl: null,
    currentLeague: "Bundesliga",
    marketValue: 130.0,
    playingStyle: ["Dribble", "Créativité", "Vision", "Finition", "Agilité"],
    careerPath: ["Chelsea Academy", "Bayern Munich Academy", "Bayern Munich (2020-)"],
    historicalStats: {
      "15": { technical: 7.8, physical: 6.8, tactical: 7.0, mental: 7.2 },
      "16": { technical: 8.0, physical: 7.0, tactical: 7.3, mental: 7.5 },
      "17": { technical: 8.3, physical: 7.2, tactical: 7.5, mental: 7.8 },
      "18": { technical: 8.5, physical: 7.5, tactical: 7.8, mental: 8.0 }
    }
  },
  {
    name: "Gavi (Pablo Paez Gavira)",
    currentClub: "FC Barcelona",
    nationality: "Espagne",
    positions: ["Milieu central", "Milieu offensif"],
    birthDate: new Date("2004-08-05"),
    photoUrl: null,
    currentLeague: "La Liga",
    marketValue: 90.0,
    playingStyle: ["Intensité", "Pressing", "Technique", "Courage", "Passe courte"],
    careerPath: ["Barcelona La Masia", "FC Barcelona (2021-)"],
    historicalStats: {
      "15": { technical: 7.2, physical: 7.0, tactical: 6.8, mental: 7.8 },
      "16": { technical: 7.5, physical: 7.3, tactical: 7.2, mental: 8.0 },
      "17": { technical: 7.8, physical: 7.5, tactical: 7.5, mental: 8.2 }
    }
  },
  {
    name: "Jude Bellingham",
    currentClub: "Real Madrid",
    nationality: "Angleterre",
    positions: ["Milieu central", "Milieu offensif"],
    birthDate: new Date("2003-06-29"),
    photoUrl: null,
    currentLeague: "La Liga",
    marketValue: 180.0,
    playingStyle: ["Polyvalence", "Leadership", "Puissance", "Finition", "Vision"],
    careerPath: ["Birmingham City (2019-2020)", "Borussia Dortmund (2020-2023)", "Real Madrid (2023-)"],
    historicalStats: {
      "15": { technical: 7.0, physical: 7.5, tactical: 7.2, mental: 8.0 },
      "16": { technical: 7.3, physical: 7.8, tactical: 7.5, mental: 8.2 },
      "17": { technical: 7.5, physical: 8.0, tactical: 7.8, mental: 8.5 },
      "18": { technical: 7.8, physical: 8.2, tactical: 8.0, mental: 8.7 }
    }
  },
  {
    name: "Kylian Mbappé",
    currentClub: "Real Madrid",
    nationality: "France",
    positions: ["Attaquant", "Ailier gauche"],
    birthDate: new Date("1998-12-20"),
    photoUrl: null,
    currentLeague: "La Liga",
    marketValue: 180.0,
    playingStyle: ["Vitesse", "Dribble", "Finition", "Appel de balle", "Contre-attaque"],
    careerPath: ["Monaco Formation", "Monaco (2015-2017)", "PSG (2017-2024)", "Real Madrid (2024-)"],
    historicalStats: {
      "15": { technical: 7.5, physical: 8.5, tactical: 7.0, mental: 7.5 },
      "16": { technical: 7.8, physical: 8.8, tactical: 7.3, mental: 7.8 },
      "17": { technical: 8.0, physical: 9.0, tactical: 7.5, mental: 8.0 },
      "18": { technical: 8.3, physical: 9.2, tactical: 7.8, mental: 8.3 }
    }
  },
  {
    name: "Lamine Yamal",
    currentClub: "FC Barcelona",
    nationality: "Espagne",
    positions: ["Ailier droit", "Ailier gauche"],
    birthDate: new Date("2007-07-13"),
    photoUrl: null,
    currentLeague: "La Liga",
    marketValue: 120.0,
    playingStyle: ["Dribble", "Vitesse", "Créativité", "Passe décisive", "Culot"],
    careerPath: ["Barcelona La Masia", "FC Barcelona (2023-)"],
    historicalStats: {
      "15": { technical: 7.8, physical: 6.5, tactical: 6.8, mental: 7.5 },
      "16": { technical: 8.2, physical: 6.8, tactical: 7.2, mental: 7.8 }
    }
  },
  {
    name: "Adrien Rabiot",
    currentClub: "Marseille",
    nationality: "France",
    positions: ["Milieu central", "Milieu défensif"],
    birthDate: new Date("1995-04-03"),
    photoUrl: null,
    currentLeague: "Ligue 1",
    marketValue: 20.0,
    playingStyle: ["Physique", "Duel aérien", "Technique", "Polyvalence", "Passe"],
    careerPath: ["PSG Formation", "PSG (2012-2019)", "Juventus (2019-2024)", "Marseille (2024-)"],
    historicalStats: {
      "15": { technical: 6.8, physical: 7.2, tactical: 6.5, mental: 6.8 },
      "16": { technical: 7.0, physical: 7.5, tactical: 6.8, mental: 7.0 },
      "17": { technical: 7.2, physical: 7.8, tactical: 7.0, mental: 7.2 },
      "18": { technical: 7.5, physical: 8.0, tactical: 7.3, mental: 7.5 }
    }
  },
  {
    name: "Aurélien Tchouaméni",
    currentClub: "Real Madrid",
    nationality: "France",
    positions: ["Milieu défensif", "Milieu central"],
    birthDate: new Date("2000-01-27"),
    photoUrl: null,
    currentLeague: "La Liga",
    marketValue: 100.0,
    playingStyle: ["Récupération", "Puissance", "Passe longue", "Duel", "Intelligence"],
    careerPath: ["Bordeaux Formation", "Monaco (2020-2022)", "Real Madrid (2022-)"],
    historicalStats: {
      "16": { technical: 6.8, physical: 7.8, tactical: 7.0, mental: 7.2 },
      "17": { technical: 7.0, physical: 8.0, tactical: 7.3, mental: 7.5 },
      "18": { technical: 7.3, physical: 8.2, tactical: 7.5, mental: 7.8 },
      "19": { technical: 7.5, physical: 8.5, tactical: 7.8, mental: 8.0 }
    }
  },
  {
    name: "Marcus Rashford",
    currentClub: "Manchester United",
    nationality: "Angleterre",
    positions: ["Ailier gauche", "Attaquant"],
    birthDate: new Date("1997-10-31"),
    photoUrl: null,
    currentLeague: "Premier League",
    marketValue: 60.0,
    playingStyle: ["Vitesse", "Dribble", "Finition", "Contre-attaque", "Frappe de loin"],
    careerPath: ["Manchester United Academy", "Manchester United (2015-)"],
    historicalStats: {
      "16": { technical: 7.0, physical: 7.8, tactical: 6.5, mental: 7.2 },
      "17": { technical: 7.3, physical: 8.0, tactical: 6.8, mental: 7.5 },
      "18": { technical: 7.5, physical: 8.2, tactical: 7.0, mental: 7.8 }
    }
  },
  {
    name: "Leroy Sané",
    currentClub: "Bayern Munich",
    nationality: "Allemagne",
    positions: ["Ailier gauche", "Ailier droit"],
    birthDate: new Date("1996-01-11"),
    photoUrl: null,
    currentLeague: "Bundesliga",
    marketValue: 70.0,
    playingStyle: ["Vitesse", "Dribble", "Centre", "Frappe puissante", "Un contre un"],
    careerPath: ["Schalke 04", "Manchester City (2016-2020)", "Bayern Munich (2020-)"],
    historicalStats: {
      "16": { technical: 7.2, physical: 8.0, tactical: 6.8, mental: 7.0 },
      "17": { technical: 7.5, physical: 8.3, tactical: 7.0, mental: 7.3 },
      "18": { technical: 7.8, physical: 8.5, tactical: 7.3, mental: 7.5 }
    }
  },
  {
    name: "Khvicha Kvaratskhelia",
    currentClub: "Napoli",
    nationality: "Géorgie",
    positions: ["Ailier gauche"],
    birthDate: new Date("2001-02-12"),
    photoUrl: null,
    currentLeague: "Serie A",
    marketValue: 80.0,
    playingStyle: ["Dribble", "Explosivité", "Finition", "Un contre un", "Créativité"],
    careerPath: ["Dinamo Tbilissi", "Rubin Kazan (2019-2022)", "Napoli (2022-)"],
    historicalStats: {
      "16": { technical: 7.0, physical: 7.2, tactical: 6.5, mental: 7.0 },
      "17": { technical: 7.3, physical: 7.5, tactical: 6.8, mental: 7.3 },
      "18": { technical: 7.5, physical: 7.8, tactical: 7.0, mental: 7.5 },
      "19": { technical: 7.8, physical: 8.0, tactical: 7.3, mental: 7.8 }
    }
  }
];

async function main() {
  console.log('Début du seed des joueurs professionnels...');

  for (const playerData of proPlayers) {
    try {
      const player = await prisma.proPlayerProfile.upsert({
        where: { name: playerData.name },
        update: playerData,
        create: playerData
      });
      
      console.log(`✓ ${player.name} ajouté/mis à jour`);
    } catch (error) {
      console.error(`✗ Erreur pour ${playerData.name}:`, error);
    }
  }

  const count = await prisma.proPlayerProfile.count();
  console.log(`\nTotal: ${count} joueurs professionnels en base`);
  console.log('Seed terminé!');
}

main()
  .catch((e) => {
    console.error('Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
