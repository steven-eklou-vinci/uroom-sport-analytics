# 🏆 Uroom Sports Analytics

**Plateforme complète d'analyse et de gestion de talents sportifs**

Une solution moderne de bout en bout pour la découverte, l'évaluation et le suivi de jeunes talents sportifs, conçue pour les clubs, scouts, agents et joueurs.

## 📋 Table des matières

- [Aperçu](#aperçu)
- [Fonctionnalités principales](#fonctionnalités-principales)
- [Architecture technique](#architecture-technique)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Structure du projet](#structure-du-projet)
- [API](#api)
- [Contribution](#contribution)

## 🎯 Aperçu

Uroom Sports Analytics est une plateforme SaaS qui révolutionne le processus de recrutement sportif en offrant :

- 🔍 **Recherche avancée** de joueurs avec filtres multicritères
- 📊 **Évaluations détaillées** avec métriques visuelles (graphiques radar)
- 🤖 **Prédictions IA** sur l'évolution des aptitudes des joueurs
- 👥 **Collaboration entre scouts** avec système de badges
- 📝 **Rapports professionnels** exportables en PDF
- 🎯 **Gestion des essais** et shortlists
- 📈 **Tableaux de bord personnalisés** par rôle

## ✨ Fonctionnalités principales

### Pour les Clubs
- Gestion d'équipe de scouts
- Vue d'ensemble des rapports soumis
- Suivi des joueurs identifiés
- Organisation des essais
- Statistiques et analytics

### Pour les Scouts
- Dashboard personnel avec activité récente
- Recherche et suivi de joueurs
- Badges collaboratifs (voir quels collègues suivent un joueur)
- Création de rapports détaillés
- Liste de joueurs suivis

### Pour les Joueurs
- Profil public professionnel
- Visualisation des évaluations (radar charts)
- Prédictions d'évolution sur 5 ans
- Historique des performances
- Gestion des vidéos de jeu

### Pour les Agents
- Portfolio de joueurs
- Suivi des opportunités
- Communication avec les clubs

## 🛠 Architecture technique

### Frontend (`urroom-sports-analytics/`)
- **Framework** : Next.js 15.5.3 (App Router)
- **Authentification** : NextAuth.js avec JWT
- **UI** : React 19, TypeScript, CSS Modules
- **Visualisation** : Recharts pour graphiques radar
- **Base de données** : Prisma ORM + PostgreSQL

### Backend (`urroom-api/`)
- **Runtime** : Node.js + Express.js
- **Base de données** : Prisma ORM + PostgreSQL
- **Authentification** : bcryptjs
- **Import de données** : Support CSV
- **API RESTful** : Endpoints complets pour toutes les entités

### Base de données
- **ORM** : Prisma 6.16.1
- **BDD** : PostgreSQL
- **Modèles** :
  - Users (5 rôles : ADMIN, CLUB, SCOUT, AGENT, PLAYER)
  - Players
  - Assessments (avec métriques : Vitesse, Dribble, Tir, Passe, Défense, Physique, Contrôle, Vision)
  - PlayerFollow (système de suivi scout)
  - Reports
  - Trials
  - Shortlists

## 🚀 Installation

### Prérequis
- Node.js 18+ et npm
- PostgreSQL
- Git

### Étapes

1. **Cloner le repository**
```bash
git clone https://github.com/steven-eklou-vinci/uroom-sport-analytics.git
cd uroom-sport-analytics
```

2. **Installer les dépendances du backend**
```bash
cd urroom-api
npm install
```

3. **Installer les dépendances du frontend**
```bash
cd ../urroom-sports-analytics
npm install
```

4. **Configurer les bases de données** (voir section Configuration)

5. **Lancer les migrations Prisma**
```bash
# Backend
cd urroom-api
npx prisma migrate dev
npx prisma generate

# Frontend
cd ../urroom-sports-analytics
npx prisma generate
```

6. **Seed la base de données** (optionnel - données de test)
```bash
cd urroom-api
npx ts-node prisma/seed.ts
```

## ⚙️ Configuration

### Variables d'environnement

#### Backend (`urroom-api/.env`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/uroom_analytics"
PORT=4000
JWT_SECRET="your-secret-key-here"
```

#### Frontend (`urroom-sports-analytics/.env.local`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/uroom_analytics"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"
API_URL="http://localhost:4000"
```

### Génération des secrets
```bash
# Pour JWT_SECRET et NEXTAUTH_SECRET
openssl rand -base64 32
```

## 📱 Utilisation

### Démarrage en développement

**Terminal 1 - Backend :**
```bash
cd urroom-api
npm run dev
```
Le backend sera accessible sur `http://localhost:4000`

**Terminal 2 - Frontend :**
```bash
cd urroom-sports-analytics
npm run dev
```
Le frontend sera accessible sur `http://localhost:3000`

### Comptes de test (après seed)

**Scout 1 :**
- Email : `scout1@parisfc.com`
- Mot de passe : `scout123`

**Scout 2 :**
- Email : `scout2@parisfc.com`
- Mot de passe : `scout123`

**Club :**
- Email : `club@parisfc.com`
- Mot de passe : `club123`

## 📂 Structure du projet

```
uroom-sport-analytics/
├── urroom-api/                    # Backend Express
│   ├── prisma/
│   │   ├── schema.prisma         # Schéma de la base de données
│   │   ├── seed.ts               # Données de test
│   │   └── migrations/           # Historique des migrations
│   ├── src/
│   │   ├── index.js              # Point d'entrée
│   │   └── routes/               # Routes API
│   └── package.json
│
└── urroom-sports-analytics/       # Frontend Next.js
    ├── prisma/
    │   └── schema.prisma         # Schéma Prisma (même que backend)
    ├── src/
    │   ├── app/                  # App Router Next.js
    │   │   ├── auth/            # Pages d'authentification
    │   │   ├── dashboard/       # Dashboards par rôle
    │   │   │   ├── scout/       # Interface Scout
    │   │   │   ├── club/        # Interface Club
    │   │   │   └── players/     # Gestion des joueurs
    │   │   ├── components/      # Composants réutilisables
    │   │   └── locales/         # Internationalisation (FR/EN)
    │   ├── pages/api/           # API Routes Next.js
    │   ├── lib/                 # Utilitaires
    │   └── middleware/          # Middlewares (auth)
    └── package.json
```

## 🔌 API

### Endpoints principaux

#### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription

#### Players
- `GET /api/players` - Liste des joueurs
- `GET /api/players/:id` - Détails d'un joueur
- `POST /api/players` - Créer un joueur
- `GET /api/players/with-follow-status` - Joueurs avec statut de suivi (scouts)

#### Player Follow (Scouts)
- `POST /api/players/follow/:id` - Suivre un joueur
- `DELETE /api/players/follow/:id` - Ne plus suivre
- `GET /api/players/following` - Liste des joueurs suivis
- `GET /api/players/:id/follow-info` - Info de suivi d'un joueur

#### Reports
- `GET /api/reports` - Liste des rapports
- `POST /api/reports` - Créer un rapport
- `GET /api/reports/:id` - Détails d'un rapport
- `GET /api/reports/:id/export-pdf` - Exporter en PDF

#### Scouts
- `GET /api/scouts` - Liste des scouts (pour clubs)
- `POST /api/scouts/create` - Créer un scout
- `GET /api/scouts/dashboard` - Données du dashboard scout

#### Clubs
- `GET /api/clubs` - Liste des clubs
- `GET /api/clubs/:id` - Détails d'un club

#### Assessments
- `GET /api/assessments` - Liste des évaluations
- `POST /api/assessments` - Créer une évaluation
- `POST /api/assessments/upload-video` - Upload de vidéo

## 🎨 Fonctionnalités avancées

### Système de prédictions IA
- Algorithme de prédiction basé sur l'âge et la progression naturelle
- Projection sur 5 ans (2025-2029)
- 8 métriques analysées : Vitesse, Dribble, Tir, Passe, Défense, Physique, Contrôle, Vision
- Facteurs de croissance personnalisés par métrique

### Badges collaboratifs
- Affichage en temps réel des scouts suivant le même joueur
- Identification par nom et email
- Compteur de collègues intéressés
- Favorise la collaboration intra-club

### Graphiques Radar
- Visualisation des 8 métriques principales
- Comparaison année par année
- Affichage des prédictions futures
- Interface interactive avec Recharts

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est la propriété de Uroom Sports Analytics. Tous droits réservés.

## 👤 Auteur

**Steven Eklou**
- GitHub: [@steven-eklou-vinci](https://github.com/steven-eklou-vinci)

## 🙏 Remerciements

- Next.js pour le framework frontend
- Prisma pour l'ORM
- Recharts pour les visualisations
- La communauté open source

---

**Développé avec ❤️ pour révolutionner le recrutement sportif**
