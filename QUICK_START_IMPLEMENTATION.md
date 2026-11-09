# 🚀 QUICK START - Implémentation Différenciateurs
**Actions concrètes pour démarrer cette semaine**

---

## 📋 SPRINT 1 : INDEX POTENTIEL IA (Semaine 1-2)

### Étape 1 : Mise à jour Prisma Schema

**Fichier : `/prisma/schema.prisma`**

Ajouter ces modèles :

```prisma
// Ajouter à la fin du fichier schema.prisma

model PotentialIndex {
  id          String        @id @default(uuid())
  playerId    String        @unique
  score       Float         // 0-100 score potentiel
  trajectory  Trajectory    // Évolution tendance
  confidence  Float         @default(0.5) // 0-1 niveau confiance
  factors     Json          // Détails calcul (JSON)
  lastUpdated DateTime      @default(now())
  
  player      PlayerProfile @relation(fields: [playerId], references: [id])
  
  @@index([playerId])
}

enum Trajectory {
  RISING         // Progression rapide
  STABLE_HIGH    // Stable haut niveau
  STABLE_MID     // Stable niveau moyen
  DECLINING      // Régression
  INSUFFICIENT   // Pas assez de données
}

model BioBanding {
  id                String        @id @default(uuid())
  playerId          String        @unique
  chronologicalAge  Float         // Âge civil
  biologicalAge     Float         // Âge biologique estimé
  maturityOffset    Float         // Différence (bio - chrono)
  category          MaturityLevel // Catégorie maturation
  calculatedAt      DateTime      @default(now())
  
  player            PlayerProfile @relation(fields: [playerId], references: [id])
  
  @@index([playerId])
}

enum MaturityLevel {
  EARLY_MATURE   // Précoce
  AVERAGE        // Moyenne
  LATE_MATURE    // Tardif
}

// Ajouter dans PlayerProfile (lignes à ajouter) :
// potentialIndex    PotentialIndex?
// bioBanding        BioBanding?
```

**Commandes à exécuter :**
```bash
# 1. Créer migration
npx prisma migrate dev --name add_potential_index_biobanding

# 2. Générer client Prisma
npx prisma generate

# 3. (Optionnel) Seed données test
npx prisma db seed
```

---

### Étape 2 : API Calcul Index Potentiel

**Fichier : `/src/pages/api/analytics/potential-index.ts`**

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

// Algorithme MVP : score basé sur métriques + progression
async function calculatePotentialScore(playerId: string) {
  // 1. Récupérer assessments récents du joueur
  const assessments = await prisma.assessment.findMany({
    where: { playerId },
    include: { metrics: true },
    orderBy: { date: 'desc' },
    take: 10 // Derniers 10 assessments
  });

  if (assessments.length < 2) {
    return {
      score: 0,
      trajectory: 'INSUFFICIENT',
      confidence: 0,
      factors: { error: 'Pas assez de données (min 2 assessments)' }
    };
  }

  // 2. Calculer moyenne des métriques récentes
  let totalMetrics = 0;
  let metricCount = 0;
  
  assessments.slice(0, 3).forEach(assessment => {
    assessment.metrics.forEach(metric => {
      totalMetrics += metric.value;
      metricCount++;
    });
  });

  const avgRecent = metricCount > 0 ? totalMetrics / metricCount : 0;

  // 3. Calculer progression (comparaison 3 derniers vs 3 précédents)
  let progressionRate = 0;
  if (assessments.length >= 6) {
    const earlier = assessments.slice(3, 6);
    let earlierTotal = 0;
    let earlierCount = 0;
    earlier.forEach(a => {
      a.metrics.forEach(m => {
        earlierTotal += m.value;
        earlierCount++;
      });
    });
    const avgEarlier = earlierCount > 0 ? earlierTotal / earlierCount : 0;
    
    if (avgEarlier > 0) {
      progressionRate = ((avgRecent - avgEarlier) / avgEarlier) * 100;
    }
  }

  // 4. Calculer score potentiel (0-100)
  // Formule MVP : 60% performance actuelle + 40% progression
  const baseScore = Math.min(avgRecent * 10, 60); // Cap à 60
  const progressionBonus = Math.max(Math.min(progressionRate * 2, 40), -20); // Cap ±40/-20
  const potentialScore = Math.max(0, Math.min(100, baseScore + progressionBonus));

  // 5. Déterminer trajectoire
  let trajectory: 'RISING' | 'STABLE_HIGH' | 'STABLE_MID' | 'DECLINING' | 'INSUFFICIENT';
  if (progressionRate > 5) trajectory = 'RISING';
  else if (progressionRate < -5) trajectory = 'DECLINING';
  else if (potentialScore >= 70) trajectory = 'STABLE_HIGH';
  else trajectory = 'STABLE_MID';

  // 6. Confiance basée sur nombre d'assessments
  const confidence = Math.min(assessments.length / 10, 1);

  return {
    score: Math.round(potentialScore * 10) / 10,
    trajectory,
    confidence: Math.round(confidence * 100) / 100,
    factors: {
      avgRecent,
      progressionRate: Math.round(progressionRate * 10) / 10,
      assessmentCount: assessments.length,
      baseScore,
      progressionBonus
    }
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    // Calculer et sauvegarder index pour un joueur
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'playerId required' });
    }

    try {
      const result = await calculatePotentialScore(playerId);

      // Upsert dans PotentialIndex
      const potentialIndex = await prisma.potentialIndex.upsert({
        where: { playerId },
        create: {
          playerId,
          score: result.score,
          trajectory: result.trajectory,
          confidence: result.confidence,
          factors: result.factors
        },
        update: {
          score: result.score,
          trajectory: result.trajectory,
          confidence: result.confidence,
          factors: result.factors,
          lastUpdated: new Date()
        }
      });

      return res.json(potentialIndex);
    } catch (error) {
      console.error('Error calculating potential index:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'GET') {
    // Récupérer index d'un joueur
    const { playerId } = req.query;

    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'playerId required' });
    }

    const potentialIndex = await prisma.potentialIndex.findUnique({
      where: { playerId }
    });

    if (!potentialIndex) {
      return res.status(404).json({ error: 'Potential index not found' });
    }

    return res.json(potentialIndex);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
```

---

### Étape 3 : Composant Affichage Index Potentiel

**Fichier : `/src/app/components/PotentialIndexBadge.tsx`**

```typescript
'use client';

interface PotentialIndexBadgeProps {
  score: number;
  trajectory: 'RISING' | 'STABLE_HIGH' | 'STABLE_MID' | 'DECLINING' | 'INSUFFICIENT';
  confidence: number;
  compact?: boolean;
}

export default function PotentialIndexBadge({ 
  score, 
  trajectory, 
  confidence, 
  compact = false 
}: PotentialIndexBadgeProps) {
  
  // Couleur selon score
  const getScoreColor = () => {
    if (score >= 80) return '#10B981'; // Vert
    if (score >= 60) return '#14B8A6'; // Teal
    if (score >= 40) return '#F59E0B'; // Orange
    return '#EF4444'; // Rouge
  };

  // Icône trajectoire
  const getTrajectoryIcon = () => {
    switch (trajectory) {
      case 'RISING': return '📈';
      case 'STABLE_HIGH': return '⭐';
      case 'STABLE_MID': return '➡️';
      case 'DECLINING': return '📉';
      default: return '❓';
    }
  };

  const getTrajectoryLabel = () => {
    switch (trajectory) {
      case 'RISING': return 'En progression';
      case 'STABLE_HIGH': return 'Haut niveau stable';
      case 'STABLE_MID': return 'Stable';
      case 'DECLINING': return 'En baisse';
      default: return 'Données insuffisantes';
    }
  };

  if (compact) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        background: `${getScoreColor()}15`,
        border: `2px solid ${getScoreColor()}`,
        borderRadius: '8px',
        fontSize: '0.9rem',
        fontWeight: '600'
      }}>
        <span style={{ fontSize: '1.2rem' }}>{getTrajectoryIcon()}</span>
        <span style={{ color: getScoreColor() }}>{score}/100</span>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1.5rem',
      background: '#ffffff',
      border: '1px solid #E2E8F0',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <h4 style={{
          margin: 0,
          fontSize: '1.1rem',
          color: '#0F172A',
          fontWeight: '600'
        }}>
          Index Potentiel Uroom
        </h4>
        <div style={{
          padding: '0.5rem 1rem',
          background: `${getScoreColor()}`,
          borderRadius: '8px',
          color: '#ffffff',
          fontWeight: '700',
          fontSize: '1.5rem'
        }}>
          {score}
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem'
      }}>
        <span style={{ fontSize: '1.5rem' }}>{getTrajectoryIcon()}</span>
        <span style={{
          color: '#64748B',
          fontSize: '0.95rem',
          fontWeight: '500'
        }}>
          {getTrajectoryLabel()}
        </span>
      </div>

      <div style={{
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid #E2E8F0'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.85rem',
          color: '#64748B'
        }}>
          <span>Niveau de confiance</span>
          <span style={{ fontWeight: '600', color: '#0F172A' }}>
            {Math.round(confidence * 100)}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '6px',
          background: '#E2E8F0',
          borderRadius: '3px',
          marginTop: '0.5rem',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${confidence * 100}%`,
            height: '100%',
            background: getScoreColor(),
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      <p style={{
        margin: '1rem 0 0',
        fontSize: '0.8rem',
        color: '#94A3B8',
        lineHeight: '1.4'
      }}>
        Basé sur {(trajectory !== 'INSUFFICIENT') ? 'l\'analyse des performances et de la progression' : 'données insuffisantes (min 2 évaluations)'}
      </p>
    </div>
  );
}
```

---

### Étape 4 : Intégration dans fiche joueur

**Fichier : `/src/app/dashboard/players/[id]/page.tsx`**

Ajouter après les infos de base du joueur :

```typescript
// Imports
import PotentialIndexBadge from '@/app/components/PotentialIndexBadge';
import { useEffect, useState } from 'react';

// Dans le composant
const [potentialIndex, setPotentialIndex] = useState(null);
const [loadingIndex, setLoadingIndex] = useState(false);

// Fonction pour récupérer/calculer l'index
const fetchPotentialIndex = async () => {
  setLoadingIndex(true);
  try {
    // Essayer de récupérer index existant
    const res = await fetch(`/api/analytics/potential-index?playerId=${playerId}`);
    
    if (res.ok) {
      const data = await res.json();
      setPotentialIndex(data);
    } else {
      // Si pas trouvé, calculer
      const calcRes = await fetch('/api/analytics/potential-index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      });
      
      if (calcRes.ok) {
        const data = await calcRes.json();
        setPotentialIndex(data);
      }
    }
  } catch (error) {
    console.error('Error fetching potential index:', error);
  } finally {
    setLoadingIndex(false);
  }
};

// useEffect au chargement
useEffect(() => {
  if (playerId) {
    fetchPotentialIndex();
  }
}, [playerId]);

// Dans le JSX, ajouter section
{potentialIndex && (
  <div style={{ marginTop: '2rem' }}>
    <PotentialIndexBadge
      score={potentialIndex.score}
      trajectory={potentialIndex.trajectory}
      confidence={potentialIndex.confidence}
    />
  </div>
)}

{loadingIndex && (
  <div style={{ textAlign: 'center', padding: '2rem' }}>
    Calcul de l'index potentiel...
  </div>
)}
```

---

## 📋 SPRINT 2 : TIMELINE LONGITUDINALE (Semaine 3-4)

### Étape 1 : Composant Timeline

**Fichier : `/src/app/components/PlayerTimeline.tsx`**

```typescript
'use client';
import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TimelineEvent {
  date: string;
  type: 'ASSESSMENT' | 'WORKSHOP' | 'TRIAL' | 'REPORT';
  label: string;
  score?: number;
}

interface PlayerTimelineProps {
  playerId: string;
}

export default function PlayerTimeline({ playerId }: PlayerTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [playerId]);

  const fetchTimeline = async () => {
    try {
      // Récupérer assessments
      const assessRes = await fetch(`/api/assessments?playerId=${playerId}`);
      const assessments = await assessRes.json();

      // Récupérer reports
      const reportsRes = await fetch(`/api/player/reports`);
      const reports = await reportsRes.json();

      // Construire timeline
      const timelineEvents: TimelineEvent[] = [
        ...assessments.map((a: any) => ({
          date: a.date,
          type: 'ASSESSMENT',
          label: `Évaluation - ${a.location || 'Terrain'}`,
          score: a.metrics.reduce((sum: number, m: any) => sum + m.value, 0) / a.metrics.length
        })),
        ...reports.map((r: any) => ({
          date: r.createdAt,
          type: 'REPORT',
          label: `Rapport par ${r.scoutName || 'Scout'}`
        }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setEvents(timelineEvents);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Chargement de l'historique...</div>;

  // Préparer données graphique
  const chartData = {
    labels: events.filter(e => e.score).map(e => 
      new Date(e.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
    ),
    datasets: [
      {
        label: 'Score moyen',
        data: events.filter(e => e.score).map(e => e.score),
        borderColor: '#14B8A6',
        backgroundColor: 'rgba(20, 184, 166, 0.1)',
        tension: 0.4
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Évolution des performances'
      }
    }
  };

  return (
    <div style={{
      padding: '1.5rem',
      background: '#ffffff',
      border: '1px solid #E2E8F0',
      borderRadius: '12px',
boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginTop: '2rem'
    }}>
      <h3 style={{
        margin: '0 0 1.5rem',
        fontSize: '1.25rem',
        color: '#0F172A',
        fontWeight: '600'
      }}>
        Historique longitudinal
      </h3>

      {/* Graphique progression */}
      {events.filter(e => e.score).length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <Line data={chartData} options={options} />
        </div>
      )}

      {/* Timeline événements */}
      <div style={{ position: 'relative', paddingLeft: '2rem' }}>
        <div style={{
          position: 'absolute',
          left: '1rem',
          top: 0,
          bottom: 0,
          width: '2px',
          background: '#E2E8F0'
        }} />

        {events.map((event, idx) => (
          <div key={idx} style={{
            position: 'relative',
            marginBottom: '1.5rem',
            paddingLeft: '1rem'
          }}>
            <div style={{
              position: 'absolute',
              left: '-0.5rem',
              top: '0.25rem',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: event.type === 'ASSESSMENT' ? '#14B8A6' : '#64748B',
              border: '2px solid #ffffff'
            }} />

            <div style={{
              fontSize: '0.85rem',
              color: '#94A3B8',
              marginBottom: '0.25rem'
            }}>
              {new Date(event.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </div>

            <div style={{
              fontSize: '0.95rem',
              color: '#0F172A',
              fontWeight: '500'
            }}>
              {event.label}
              {event.score && (
                <span style={{
                  marginLeft: '0.5rem',
                  color: '#14B8A6',
                  fontWeight: '600'
                }}>
                  Score: {event.score.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <p style={{ textAlign: 'center', color: '#94A3B8', padding: '2rem' }}>
          Aucun historique disponible pour le moment
        </p>
      )}
    </div>
  );
}
```

**Installation dépendance :**
```bash
npm install react-chartjs-2 chart.js
```

---

## 📋 SPRINT 3 : RGPD CONSENTEMENTS (Semaine 5-6)

### Étape 1 : Modèle Prisma

**Ajouter dans `/prisma/schema.prisma` :**

```prisma
model Consent {
  id              String        @id @default(uuid())
  playerId        String
  consentType     ConsentType
  granted         Boolean       @default(false)
  parentEmail     String?       // Email parent si mineur
  parentName      String?       // Nom parent
  grantedAt       DateTime?
  revokedAt       DateTime?
  expiresAt       DateTime?     // Date expiration consentement
  ipAddress       String?       // IP de la requête
  userAgent       String?       // Browser info
  
  player          PlayerProfile @relation(fields: [playerId], references: [id])
  
  @@index([playerId, consentType])
}

enum ConsentType {
  DATA_COLLECTION      // Collecte données
  PUBLIC_PROFILE       // Profil public
  VIDEO_PUBLICATION    // Publication vidéos
  THIRD_PARTY_SHARING  // Partage scouts/clubs
  MARKETING            // Communications marketing
}

model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  action      String   // "VIEW_PLAYER", "EXPORT_DATA", etc.
  resourceId  String?  // ID joueur/rapport consulté
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())
  
  user        User     @relation(fields: [userId], references: [id])
  
  @@index([userId, timestamp])
  @@index([resourceId])
}

// Ajouter dans PlayerProfile :
// consents    Consent[]

// Ajouter dans User :
// auditLogs   AuditLog[]
```

**Migration :**
```bash
npx prisma migrate dev --name add_rgpd_consent_audit
npx prisma generate
```

---

### Étape 2 : API Consentements

**Fichier : `/src/pages/api/rgpd/consents.ts`**

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Récupérer consentements d'un joueur
    const { playerId } = req.query;

    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'playerId required' });
    }

    const consents = await prisma.consent.findMany({
      where: { playerId },
      orderBy: { grantedAt: 'desc' }
    });

    return res.json(consents);
  }

  if (req.method === 'POST') {
    // Créer/mettre à jour consentement
    const { playerId, consentType, granted, parentEmail, parentName } = req.body;

    if (!playerId || !consentType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Vérifier si joueur est mineur
    const player = await prisma.playerProfile.findUnique({
      where: { id: playerId }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const age = (Date.now() - new Date(player.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
    const isMinor = age < 18;

    if (isMinor && granted && !parentEmail) {
      return res.status(400).json({ 
        error: 'Parent email required for minors' 
      });
    }

    // Upsert consentement
    const consent = await prisma.consent.upsert({
      where: {
        playerId_consentType: {
          playerId,
          consentType
        }
      },
      create: {
        playerId,
        consentType,
        granted,
        parentEmail,
        parentName,
        grantedAt: granted ? new Date() : null,
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      },
      update: {
        granted,
        parentEmail,
        parentName,
        grantedAt: granted ? new Date() : null,
        revokedAt: granted ? null : new Date(),
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    });

    return res.json(consent);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
```

---

### Étape 3 : Middleware Audit Logging

**Fichier : `/src/middleware/auditLogger.ts`**

```typescript
import { prisma } from '../lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../pages/api/auth/[...nextauth]';

export async function logAudit(
  req: NextApiRequest,
  res: NextApiResponse,
  action: string,
  resourceId?: string
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) return;

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action,
        resourceId,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Ne pas bloquer la requête si audit fail
  }
}

// Exemple d'utilisation dans une API route
// import { logAudit } from '../../../middleware/auditLogger';
// await logAudit(req, res, 'VIEW_PLAYER', playerId);
```

---

## 🧪 TESTS & VALIDATION

### Test Index Potentiel

```bash
# 1. Créer joueur test (via dashboard)
# 2. Créer plusieurs assessments avec métriques
# 3. Appeler API calcul :

curl -X POST http://localhost:3000/api/analytics/potential-index \
  -H "Content-Type: application/json" \
  -d '{"playerId": "REMPLACER_PAR_ID_JOUEUR"}'

# 4. Vérifier résultat
# 5. Rafraîchir page joueur pour voir badge
```

### Test Timeline

```bash
# 1. S'assurer qu'un joueur a plusieurs assessments
# 2. Accéder à /dashboard/players/[id]
# 3. Vérifier affichage graphique de progression
# 4. Vérifier liste chronologique événements
```

### Test Consentements

```bash
# 1. Créer joueur mineur (< 18 ans)
# 2. Tenter d'activer consentement sans email parent → doit échouer
# 3. Ajouter email parent → doit réussir
# 4. Vérifier création dans AuditLog
```

---

## 📚 RESSOURCES

**Documentation Chart.js :**
- https://www.chartjs.org/docs/latest/

**RGPD Mineurs France :**
- Consentement parental obligatoire < 15 ans
- https://www.cnil.fr/fr/rgpd-et-mineurs

**Algorithmes IA potentiel (références) :**
- Z-scores standardization
- Moving averages
- Regression linéaire progression

---

## ✅ CHECKLIST AVANT PRODUCTION

Sprint 1 (Index Potentiel) :
- [ ] Migration Prisma appliquée
- [ ] API `/api/analytics/potential-index` testée
- [ ] Composant PotentialIndexBadge créé
- [ ] Intégré sur fiche joueur
- [ ] Testé avec joueur ayant 5+ assessments

Sprint 2 (Timeline) :
- [ ] Chart.js installé
- [ ] Composant PlayerTimeline créé
- [ ] Graphique progression affiché
- [ ] Timeline événements (assessments + reports)
- [ ] Testé avec joueur multi-saisons

Sprint 3 (RGPD) :
- [ ] Modèles Consent + AuditLog créés
- [ ] API consents fonctionnelle
- [ ] Validation mineur avec email parent
- [ ] Middleware audit logger implémenté
- [ ] Logs automatiques sur vues joueurs

---

**Note :** Ce guide fournit du code prêt à l'emploi. Adaptez les styles et la logique selon vos besoins spécifiques. Priorité = faire fonctionner l'Index Potentiel d'abord (différenciateur commercial #1).
