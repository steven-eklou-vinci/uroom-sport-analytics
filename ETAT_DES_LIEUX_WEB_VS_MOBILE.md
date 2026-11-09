# État des lieux : Web App vs Mobile App
## Analyse complète du projet Uroom Sports Analytics

**Date:** 27 février 2026  
**Référence:** Analyse ChatGPT sur architecture Web-first vs Mobile-first

---

## 🎯 Principe directeur recommandé

**Stratégie cible :**
- 🖥️ **Web App (70%)** = Centre nerveux / Intelligence / Gestion
- 📱 **Mobile App (30%)** = Terrain / Capture / Vitesse

---

## ✅ CE QUI A ÉTÉ FAIT (Web App actuelle)

### 1. Infrastructure de base ✅
- ✅ Next.js 15.5.3 avec App Router
- ✅ TypeScript
- ✅ Prisma ORM + PostgreSQL
- ✅ NextAuth.js pour authentification
- ✅ Architecture multi-rôles (ADMIN, CLUB, SCOUT, AGENT, PLAYER)

### 2. Pages publiques ✅
- ✅ Homepage avec proposition de valeur
- ✅ About (mission, vision, approche)
- ✅ How it works (workflow en 5 étapes)
- ✅ Pricing (tous les segments : Clubs, Scouts, Agents, Parents, Joueurs)
- ✅ Features
- ✅ Contact
- ✅ Legal (privacy, terms)

### 3. Système d'authentification ✅
**Pages :**
- ✅ `/auth/login` - Connexion multi-rôles
- ✅ `/auth/register` - Inscription avec sélection de rôle

**API :**
- ✅ `/api/auth/[...nextauth]` - NextAuth configuration
- ✅ `/api/auth/login` - Login endpoint
- ✅ `/api/auth/register` - Registration endpoint

### 4. Dashboard par segment ✅

#### A. Dashboard Club (✅ Bien placé sur Web)
**Fonctionnalités implémentées :**
- ✅ Gestion des scouts (création, désactivation)
- ✅ Vue des rapports soumis par scouts
- ✅ Statistiques (nb scouts, rapports, trials)
- ✅ Accès recherche joueurs
- ✅ Gestion demandes d'essai

**Fichiers :**
- `/src/app/dashboard/club/page.tsx`
- `/src/pages/api/scouts/*`

#### B. Dashboard Scout (✅ Bien placé sur Web)
**Fonctionnalités implémentées :**
- ✅ Suivi des joueurs (follow system)
- ✅ Création de rapports d'évaluation
- ✅ Recherche avancée de joueurs
- ✅ Shortlists (création et gestion)
- ✅ Export PDF des rapports

**Fichiers :**
- `/src/app/dashboard/scout/page.tsx`
- `/src/app/dashboard/scout/following/`
- `/src/pages/api/reports/*`
- `/src/pages/api/shortlists/*`

#### C. Dashboard Joueur (✅ Bien placé sur Web)
**Fonctionnalités implémentées :**
- ✅ Profil joueur longitudinal
- ✅ Statistiques personnelles
- ✅ Gestion vidéos (upload)
- ✅ Consultation rapports scouts
- ✅ Classement/Ranking (Uroom Score)
- ✅ Mise à jour profil

**Fichiers :**
- `/src/app/dashboard/player/page.tsx`
- `/src/app/dashboard/player/videos/`
- `/src/pages/api/player/*`

#### D. Dashboard Agent (✅ Basique)
**Fonctionnalités implémentées :**
- ✅ Dashboard de base

**Fichiers :**
- `/src/app/dashboard/agent/page.tsx`

#### E. Dashboard Admin (✅ Bien placé sur Web)
**Fonctionnalités implémentées :**
- ✅ Gestion des utilisateurs
- ✅ Vue d'ensemble système

**Fichiers :**
- `/src/app/dashboard/admin/`
- `/src/pages/api/admin/users.ts`

### 5. Modules Core implémentés ✅

#### A. Gestion des joueurs (Uroom Core partiel) ✅
**API endpoints :**
- ✅ `/api/players` - CRUD joueurs
- ✅ `/api/players/[id]` - Détails joueur
- ✅ `/api/players/import-csv` - Import CSV
- ✅ `/api/players/follow/[playerId]` - Follow system
- ✅ `/api/players/following` - Liste suivis
- ✅ `/api/players/with-follow-status` - Players avec statut follow

**Fonctionnalités :**
- ✅ Fiche joueur (firstName, lastName, birthDate, positions[], nationality, foot, height, weight)
- ✅ Photos profil (upload)
- ✅ Vidéos joueur (stockage URLs multiples)
- ✅ Positions multiples (array)
- ✅ Tags
- ✅ Public opt-in (RGPD basique)
- ✅ Profile views tracking
- ✅ Uroom Score & Uroom Rank

**Base de données (Prisma) :**
```prisma
model PlayerProfile {
  id            String
  firstName     String
  lastName      String
  birthDate     DateTime
  nationality   String
  foot          String
  heightCm      Int?
  weightKg      Int?
  tags          String[]
  publicOptIn   Boolean
  photoUrl      String?
  videoUrls     String[]
  positions     String[]
  uroomScore    Float?
  uroomRank     Int?
  profileViews  Int
  // Relations
  assessments   Assessment[]
  reports       Report[]
  followers     PlayerFollow[]
}
```

#### B. Assessments / Évaluations ✅
**API endpoints :**
- ✅ `/api/assessments` - GET/POST assessments
- ✅ `/api/assessments/[id]` - Détails assessment
- ✅ `/api/assessments/upload-video` - Upload vidéo assessment

**Fonctionnalités :**
- ✅ Création d'évaluation par scout
- ✅ Métriques quantifiées (Metric model)
- ✅ Vidéos liées aux assessments
- ✅ Statut (PLANNED, COMPLETED, CANCELLED)
- ✅ Notes et location

**Base de données :**
```prisma
model Assessment {
  id        String
  playerId  String
  scoutId   String
  date      DateTime
  location  String?
  notes     String?
  status    AssessmentStatus
  videos    String[]
  metrics   Metric[]
  report    Report?
}

model Metric {
  id           String
  assessmentId String
  key          String
  value        Float
  unit         String
}
```

#### C. Rapports d'évaluation ✅
**API endpoints :**
- ✅ `/api/reports` - CRUD rapports
- ✅ `/api/reports/[id]` - Détails rapport
- ✅ `/api/reports/[id]/export-pdf` - Export PDF

**Fonctionnalités :**
- ✅ Création rapport par scout
- ✅ Summary, strengths, weaknesses
- ✅ Club fit suggestions
- ✅ Export PDF
- ✅ Lien avec assessment

**Base de données :**
```prisma
model Report {
  id           String
  playerId     String
  assessmentId String?
  summary      String
  strengths    String[]
  weaknesses   String[]
  clubFit      String[]
  pdfUrl       String?
  authorId     String?
}
```

#### D. Recherche & Filtres ✅
**API endpoints :**
- ✅ `/api/search` - Recherche avancée joueurs

**Fonctionnalités :**
- ✅ Filtres par âge, poste, club, progression
- ✅ Recherche textuelle

**Pages :**
- ✅ `/dashboard/players/search`

#### E. Shortlists (Scouting) ✅
**API endpoints :**
- ✅ `/api/shortlists` - CRUD shortlists
- ✅ `/api/shortlists/[id]` - Gestion shortlist

**Fonctionnalités :**
- ✅ Création de listes par club
- ✅ Ajout/retrait joueurs
- ✅ Partage entre scouts du club

**Base de données :**
```prisma
model Shortlist {
  id        String
  name      String
  clubId    String
  players   ShortlistPlayer[]
}

model ShortlistPlayer {
  shortlistId String
  playerId    String
}
```

#### F. Demandes d'essai (Trials) ✅
**API endpoints :**
- ✅ `/api/trials` - GET/POST trials
- ✅ `/api/trials/[id]` - Gestion statut trial

**Fonctionnalités :**
- ✅ Demande d'essai joueur → club
- ✅ Statut (PENDING, ACCEPTED, REJECTED)
- ✅ Message accompagnement

**Base de données :**
```prisma
model TrialRequest {
  id        String
  clubId    String
  playerId  String
  message   String
  status    TrialStatus
}
```

#### G. Ranking System ✅
**API endpoints :**
- ✅ `/api/ranking/all` - Classement global
- ✅ `/api/player/ranking` - Ranking joueur

**Fonctionnalités :**
- ✅ Uroom Score calculé
- ✅ Uroom Rank (position)
- ✅ Affichage classement global
- ✅ Filtres par position

#### H. Upload vidéo ✅
**API endpoints :**
- ✅ `/api/player/upload-video` - Upload fichier vidéo
- ✅ `/api/player/videos` - CRUD vidéos joueur

**Fonctionnalités :**
- ✅ Upload fichier vidéo (max 100MB)
- ✅ Progress tracking
- ✅ Stockage dans `/public/uploads/videos/`
- ✅ Liaison vidéos → joueur (array videoUrls)

#### I. Clubs management ✅
**API endpoints :**
- ✅ `/api/clubs` - CRUD clubs
- ✅ `/api/clubs/[id]` - Détails club

**Base de données :**
```prisma
model Club {
  id               String
  name             String
  country          String
  tier             String?
  contactEmail     String
  subscriptionTier String @default("FREE")
  scouts           User[]
  shortlists       Shortlist[]
  trialRequests    TrialRequest[]
}
```

### 6. RGPD basique ✅
**Fonctionnalités :**
- ✅ `publicOptIn` sur PlayerProfile (consentement visibilité)
- ✅ Privacy policy page
- ✅ Terms of service page

---

## ❌ CE QUI MANQUE (selon recommandations ChatGPT)

### 1. Sur Web App (priorité haute) 🔴

#### A. Uroom Core complet
**Manquant :**
- ❌ **Fiche joueur longitudinale complète U11-U18**
  - Historique multi-saisons
  - Évolution temporelle (graphes progression)
  - Comparaisons cohortes
  - Timeline événements
  
- ❌ **Correction RAE / Bio-banding**
  - Calcul âge biologique
  - Ajustement métriques selon maturation
  - Groupement par bio-banding
  
- ❌ **Index Potentiel IA** (différenciateur clé)
  - Score potentiel calculé
  - Projections de trajectoire
  - Segmentation maturation
  
- ❌ **Dashboard progression équipe**
  - Vue agrégée club/académie
  - Comparaison intra-équipe
  - Alertes progression/régression

- ❌ **Gestion rôles & permissions RGPD avancé**
  - Matrice de permissions fines
  - Logs d'accès complets
  - Gestion des consentements mineurs
  - Politique de rétention données
  - Audit trails
  - Exports contrôlés
  
- ❌ **API / Intégrations**
  - API REST documentée
  - Webhooks
  - Intégrations clubs pro (format bridge)

#### B. Modules B2B Premium
**Manquant :**
- ❌ **Module valorisation joueur**
  - Dossiers "prêts à envoyer"
  - CV digital automatique
  - Highlight reels auto-générés
  
- ❌ **Module comparaison avancé**
  - Benchmark vs référentiel interne
  - Comparaison multi-joueurs
  - Heatmaps position
  
- ❌ **Module longitudinal avancé**
  - Trajectoires multi-saisons
  - Cohortes d'analyse
  - Projections statistiques
  
- ❌ **Analytics scouting avancé**
  - Insights patterns
  - Recommandations IA
  - Détection talents cachés

#### C. Back-office écosystème
**Manquant :**
- ❌ **Gestion workshops**
  - Planification workshops
  - Inscription joueurs
  - Gestion participants
  
- ❌ **Certification tests**
  - Validation tests standardisés
  - Délivrance badges
  - Historique certifications
  
- ❌ **Validation profils**
  - Processus de vérification
  - Statut "certifié"
  
- ❌ **Modération contenu**
  - Review vidéos/rapports
  - Signalement abus
  
- ❌ **Super admin Uroom**
  - Vue système complète
  - Monitoring performances
  
- ❌ **Monitoring conformité RGPD**
  - Dashboard conformité
  - Rapports RGPD automatiques
  - Alertes violations

#### D. Modules Écosystème B2C
**Manquant :**
- ❌ **Passeport Performance Parents**
  - Version web dédiée parents
  - Reporting parents académies
  - Gestion consentements parents
  - Paramétrage visibilité
  - Téléchargement rapports
  
- ❌ **Uroom Workshops (booking)**
  - Réservation en ligne
  - Paiement intégré
  - Gestion planning

### 2. Application Mobile (à créer) 🔴

**Actuellement : RIEN**

#### A. Saisie terrain (OBLIGATOIRE mobile) ❌
**Ce qui doit être créé :**
- ❌ **Grilles d'observation standardisées**
  - Notation technique, tactique, mental, physique
  - Template standardisé Uroom
  - 1 main, < 3 min/joueur
  
- ❌ **Notation match rapide**
  - Liste équipe pré-chargée
  - Tag événements simples
  - Temps de jeu tracking
  
- ❌ **Note détection live**
  - Capture instantanée observation
  - Géolocalisation match
  
- ❌ **Ajout rapide joueur**
  - Form simplifié terrain
  - Photo capture
  - Positions sélection rapide
  
- ❌ **Mode offline**
  - Sauvegarde locale
  - Sync auto quand réseau

#### B. Capture médias ❌
**Ce qui doit être créé :**
- ❌ **Upload vidéo rapide**
  - Capture native
  - Compression auto
  - Upload background
  
- ❌ **Liaison clip joueur**
  - Tag joueur sur vidéo
  - Timestamp événements
  
- ❌ **Photo profil terrain**
  - Capture native
  - Crop & resize auto
  
- ❌ **Scan QR workshop**
  - Check-in workshop
  - Validation participation

#### C. Mode "Match" ❌
**Ce qui doit être créé :**
- ❌ **Liste équipe pré-match**
  - Sélection effectif
  - Composition terrain
  
- ❌ **Notation live match**
  - Chrono intégré
  - Events rapides
  
- ❌ **Sauvegarde offline**
  - SQLite local
  - Sync différée

#### D. Scouts premium mobile ❌
**Ce qui doit être créé :**
- ❌ **Accès rapide fiche joueur**
  - Vue simplifiée profil
  - Infos essentielles only
  
- ❌ **Recherche rapide**
  - Filtres basiques (âge, poste)
  - Géolocalisation proximité
  
- ❌ **Alertes push**
  - Nouveaux profils zone
  - Matchs à venir
  
- ❌ **Détection live simplifiée**
  - Tag rapide talent spot
  - Note instantanée

#### E. Parents/Joueurs mobile ❌
**Ce qui doit être créé :**
- ❌ **Passport Performance mobile**
  - Voir progression
  - Consulter badges
  - Partager lien profil
  - Notifications push
  
- ❌ **Notifications**
  - Nouveau rapport disponible
  - Changement classement
  - Demande d'essai

---

## ⚠️ CE QUI EST MAL PLACÉ (devrait être mobile, pas web uniquement)

### 1. Saisie manuelle de données terrain
**Actuellement :** 
- ✅ Création joueur via web (`/dashboard/players/new`)
- ✅ Création assessment via web
- ✅ Upload vidéo via web seulement

**Problème :**
- 🔴 Un scout sur le terrain doit utiliser un laptop pour noter → friction
- 🔴 Pas de mode offline → bloqué sans réseau
- 🔴 Pas de capture native photo/vidéo

**Solution :**
- ➡️ Créer app mobile avec saisie terrain
- ➡️ Garder web pour consultation/édition détaillée

### 2. Notation match en temps réel
**Actuellement :** 
- ❌ Non implémenté du tout

**Besoin :**
- 🔴 Mode "Match" mobile obligatoire
- 🔴 Notation live impossible sur laptop terrain

---

## 📊 PRIORITÉS & ROADMAP RECOMMANDÉE

### Phase 1 : Compléter Web App (Fondations) - 3-4 mois

#### Priorité 1 : Uroom Core complet (B2B critique)
1. ✅ Fiche joueur longitudinale U11-U18
   - Timeline multi-saisons
   - Graphes progression
   - Historique complet

2. ✅ Index Potentiel IA (différenciateur)
   - Calcul score potentiel
   - Algorithme progression
   - Projections trajectoire

3. ✅ RGPD avancé (compliance obligatoire)
   - Gestion consentements mineurs
   - Logs d'accès
   - Audit trails
   - Politique rétention

4. ✅ Dashboard progression équipe
   - Vue agrégée club
   - Comparaisons cohortes
   - Alertes progression

#### Priorité 2 : Modules Premium B2B
1. ✅ Module valorisation joueur
   - Dossiers export pro
   - CV digital auto

2. ✅ API / Intégrations
   - REST API documentée
   - Bridge pro formats

3. ✅ Analytics avancés
   - Insights patterns
   - Recommandations IA

#### Priorité 3 : Écosystème B2C
1. ✅ Passeport Performance web parents
   - Vue dédiée parents
   - Gestion visibilité
   - Téléchargement rapports

2. ✅ Workshops booking
   - Réservation en ligne
   - Gestion planning
   - Paiement (Stripe)

3. ✅ Back-office workshops
   - Certification tests
   - Badges

### Phase 2 : Mobile App (Terrain) - 2-3 mois

**Option 1 : PWA optimisée** (MVP rapide)
- ✅ Progressive Web App Next.js
- ✅ Service Workers offline
- ✅ Manifest installable
- ✅ Push notifications
- ⏱️ Développement : 6-8 semaines

**Option 2 : App Native** (robustesse max)
- ✅ React Native / Flutter
- ✅ Offline SQLite
- ✅ Capture native photo/vidéo
- ✅ Géolocalisation
- ⏱️ Développement : 10-12 semaines

**Fonctionnalités MVP Mobile :**
1. ✅ Grilles observation standardisées
2. ✅ Mode Match (notation live)
3. ✅ Capture vidéo + upload
4. ✅ Offline-first avec sync
5. ✅ Scouts : recherche + alertes
6. ✅ Parents : consultation progression

### Phase 3 : Intelligence & Écosystème - Continu

1. ✅ Amélioration Index Potentiel IA
2. ✅ Détection live avancée
3. ✅ Analytics prédictifs
4. ✅ Réseau effet (clubs ↔ scouts ↔ joueurs)

---

## 🎯 ALIGNEMENT STRATÉGIQUE

### Selon votre Business Plan :

**Segments prioritaires :**
1. **Semi-pro / National** (Pack B : 8-12k€/an) → 70% investissement
2. **Clubs Pro / Élite** (Pack C : 12-20k€/an) → 20%
3. **Amateur structuré** (Pack A : 3-4k€/an) → 10%

**Différenciateurs clés à implémenter :**
1. 🎯 **Index Potentiel IA** → WEB obligatoire
2. 🎯 **Longitudinal U11-U18** → WEB obligatoire
3. 🎯 **Standardisation terrain** → MOBILE obligatoire
4. 🎯 **RGPD mineurs by-design** → WEB obligatoire
5. 🎯 **Écosystème multi-acteurs** → WEB + MOBILE

**Risques actuels :**
- 🔴 Pas de mobile = friction scouts terrain
- 🔴 Pas d'Index IA = pas de différenciation
- 🔴 RGPD basique = risque compliance
- 🔴 Pas de longitudinal complet = pas de mémoire continue

---

## 💡 RECOMMANDATIONS IMMÉDIATES

### 1. NE PAS développer mobile avant d'avoir complété Web Core
**Raison :**
- Web = cerveau, valeur stratégique
- Mobile sans backend solide = outil isolé sans valeur
- Clients B2B achètent l'intelligence, pas la saisie

### 2. Focus absolu sur différenciateurs
**Dans l'ordre :**
1. Index Potentiel IA (3-4 semaines)
2. Fiche longitudinale U11-U18 (4-5 semaines)
3. RGPD avancé compliance (2-3 semaines)
4. API intégrations clubs (3-4 semaines)

### 3. Stratégie Mobile : PWA d'abord
**Pourquoi :**
- Validation usage terrain sans investissement lourd
- Réutilisation code Next.js
- Déploiement instantané (pas d'app stores)
- Si traction forte → migrate vers native

### 4. Mesure de succès
**KPIs à suivre :**
- % données saisies via mobile vs web
- Temps moyen saisie terrain (objectif < 3 min)
- Taux offline sync success
- Adoption scouts terrain mobile

---

## 📂 FICHIERS À CRÉER / MODIFIER

### Web App (priorité haute)

**Nouveaux fichiers :**
```
/src/app/dashboard/
  /analytics/
    /trajectories/page.tsx        # Trajectoires longitudinales
    /cohorts/page.tsx              # Analyse cohortes
    /potential-index/page.tsx      # Index Potentiel IA
  /rgpd/
    /consents/page.tsx             # Gestion consentements
    /audit-logs/page.tsx           # Logs d'accès
    /retention-policy/page.tsx     # Politique rétention
  /workshops/
    /booking/page.tsx              # Réservation workshops
    /certification/page.tsx        # Certification tests
    /participants/page.tsx         # Gestion participants
  /valorization/
    /dossiers/page.tsx             # Dossiers joueurs export
    /cv-generator/page.tsx         # CV digital auto

/src/pages/api/
  /analytics/
    /trajectories.ts               # Calcul trajectoires
    /potential-index.ts            # Calcul index IA
  /rgpd/
    /consents.ts                   # CRUD consentements
    /audit-logs.ts                 # Logs accès
  /workshops/
    /booking.ts                    # Réservations
    /certifications.ts             # Certifications
  /integrations/
    /api-docs.ts                   # Documentation API
    /webhooks.ts                   # Webhooks
```

**Fichiers à modifier :**
```
/prisma/schema.prisma
  → Ajouter tables : Consents, AuditLogs, Workshops, Certifications, 
                     BioBanding, PotentialIndex, Trajectories

/src/app/dashboard/players/[id]/page.tsx
  → Ajouter vue longitudinale complète
  → Intégrer graphes progression
  → Afficher Index Potentiel

/src/app/dashboard/player/page.tsx
  → Ajouter section "Mon Potentiel"
  → Timeline événements
  → Comparaisons
```

### Mobile App (phase 2)

**Structure PWA :**
```
/src/app/mobile/
  /match/
    /notation/page.tsx             # Mode Match
    /team-selection/page.tsx       # Sélection équipe
  /observation/
    /grids/page.tsx                # Grilles standardisées
  /capture/
    /video/page.tsx                # Capture vidéo native
    /photo/page.tsx                # Photo native
  /offline/
    /sync-manager.ts               # Gestion sync offline
    /local-storage.ts              # SQLite/IndexedDB
```

**Ou structure React Native :**
```
/mobile-app/
  /src/
    /screens/
      /Match/
      /Observation/
      /Capture/
    /components/
    /services/
      /sync-service.ts
      /offline-storage.ts
```

---

## 🔍 CONCLUSION

**État actuel : 35% du Web App cible complété**

**Tâches critiques manquantes :**
- 🔴 Index Potentiel IA (différenciateur #1)
- 🔴 Longitudinal U11-U18 complet (valeur centrale)
- 🔴 RGPD avancé (compliance obligatoire)
- 🔴 Toute l'app mobile (friction terrain actuelle)

**Recommandation stratégique :**
1. **Mois 1-4 :** Compléter Web App Core (Index IA + Longitudinal + RGPD)
2. **Mois 3-4 :** Développer PWA mobile (grilles observation + mode match)
3. **Mois 5-6 :** Modules Premium B2B (valorisation + API)
4. **Mois 6+ :** Écosystème (workshops + parents)

**Risque principal :**
- Si mobile développé avant Web Core complet → outil de saisie, pas plateforme intelligence
- Si Web seulement sans mobile → friction scouts terrain → adoption limitée

**La bonne voie :**
- Web-first pour établir cerveau/intelligence
- Mobile ensuite pour démocratiser capture terrain
- 70/30 investissement Web/Mobile

---

**Prochain sprint recommandé :**
1. Créer modèle `PotentialIndex` dans Prisma
2. Développer algorithme de calcul (baseline simple)
3. Intégrer affichage Index sur fiche joueur
4. Créer timeline longitudinale avec graphes
5. Implémenter RGPD consents basique

**Après ça, vous aurez une vraie différenciation vs concurrents.**
