# Fonctionnalité : Création de profils joueurs par les scouts

## Résumé

Cette fonctionnalité permet aux scouts de créer des profils joueurs directement depuis l'application, même si le joueur n'est pas encore présent dans la base de données de la plateforme. Les joueurs créés par les scouts sont distingués des joueurs avec données complètes.

## Changements effectués

### 1. Base de données (Prisma Schema)

#### Fichiers modifiés :
- `/urroom-api/prisma/schema.prisma`
- `/urroom-sports-analytics/prisma/schema.prisma`

#### Modifications :
- Ajout de l'enum `PlayerDataSource` avec les valeurs :
  - `PLATFORM_DATA` : Joueurs avec données complètes
  - `SCOUT_CREATED` : Joueurs créés par scouts

- Mise à jour du modèle `PlayerProfile` :
  - `birthDate`: DateTime → DateTime? (optionnel)
  - `age`: Int? (nouveau champ pour les joueurs sans date de naissance exacte)
  - `nationality`: String → String? (optionnel)
  - `foot`: String → String? (optionnel)
  - `dataSource`: PlayerDataSource (nouveau, défaut: PLATFORM_DATA)
  - `createdByScoutId`: String? (nouveau, référence au scout créateur)
  - Nouvelle relation `createdByScout`

- Mise à jour du modèle `User` :
  - Nouvelle relation `createdPlayers` pour les joueurs créés par le scout

- Mise à jour du modèle `Report` :
  - `clubFit`: String[] → String[] @default([])

#### Migrations créées :
- `/urroom-api/prisma/migrations/20260310000000_add_scout_created_players/migration.sql`
- `/urroom-sports-analytics/prisma/migrations/20260310000000_add_scout_created_players/migration.sql`

### 2. API Backend (urroom-api)

#### `/urroom-api/src/routes/players.js`

**Nouvelles routes :**

1. **POST /players/scout-create**
   - Création de profil joueur par un scout
   - Champs requis : `firstName`, `lastName`, `age`, `positions`, `scoutId`
   - Validation : seuls les scouts peuvent créer des profils
   - Retourne le joueur créé avec `dataSource: 'SCOUT_CREATED'`

2. **GET /players/search**
   - Recherche de joueurs par nom/prénom
   - Query params : `firstName`, `lastName`
   - Recherche insensible à la casse
   - Inclut les informations du scout créateur et les rapports

**Routes modifiées :**

1. **GET /players/:id**
   - Inclut maintenant `createdByScout` et les rapports dans la réponse

#### `/urroom-api/src/routes/reports.js`

**Routes modifiées :**

1. **GET /reports**
   - Filtrage conditionnel de `clubFit` selon le rôle
   - Si `userRole !== 'CLUB' && userRole !== 'ADMIN'`, le champ `clubFit` est masqué

2. **GET /reports/:id**
   - Même filtrage conditionnel de `clubFit`
   - Inclut les informations du joueur avec `dataSource` et `createdByScout`

**Nouvelle route :**

3. **GET /reports/player/:playerId**
   - Récupère tous les rapports d'un joueur spécifique
   - Filtre `clubFit` selon le rôle de l'utilisateur
   - Tri par date décroissante

### 3. Application Mobile (uroom-mobile)

#### Types TypeScript (`/uroom-mobile/src/types.ts`)

**Ajouts :**
- Type `PlayerDataSource`
- Type `ScoutReport` avec les champs du rapport scout
- Mise à jour du type `Player` avec :
  - `dataSource?: PlayerDataSource`
  - `createdByScout?: { id, name, email }`
  - `hasMetricsData?: boolean`

#### Nouveaux composants

1. **`/uroom-mobile/src/components/CreatePlayerForm.tsx`**
   - Formulaire de création de profil joueur
   - Champs : prénom, nom, âge, poste
   - Validation et gestion d'erreurs
   - Interface scout-friendly

2. **`/uroom-mobile/src/components/PlayerDataBadge.tsx`**
   - Badge visuel pour distinguer les types de joueurs
   - Affichage compact ou étendu
   - Couleurs distinctives :
     - Vert : Données complètes (PLATFORM_DATA)
     - Orange : Profil scout (SCOUT_CREATED)

3. **`/uroom-mobile/src/components/ScoutReportsList.tsx`**
   - Liste des rapports scouts pour un joueur
   - Affichage conditionnel de `clubFit` (clubs et admins uniquement)
   - Design organisé par sections : résumé, forces, faiblesses, fit club

4. **`/uroom-mobile/src/screens/SearchOrCreatePlayerScreen.tsx`**
   - Écran de recherche de joueurs
   - Bouton "Créer le profil" si aucun résultat (pour les scouts)
   - Modal avec formulaire de création
   - Affichage des résultats avec badges de distinction

#### Composant modifié

**`/uroom-mobile/src/components/PlayerCard.tsx`**
- Affichage du badge `PlayerDataBadge` pour les profils créés par scouts
- Message informatif pour les joueurs sans métriques
- Gestion conditionnelle de l'affichage des métriques

## Workflow utilisateur

### Pour un scout :

1. **Rechercher un joueur**
   - Utiliser l'écran de recherche
   - Entrer le nom/prénom du joueur

2. **Si le joueur n'existe pas :**
   - Cliquer sur "Créer le profil"
   - Remplir le formulaire (nom, prénom, âge, poste)
   - Valider

3. **Profil créé :**
   - Le joueur apparaît avec un badge "Profil scout"
   - Indication "Métriques non disponibles"
   - Les scouts peuvent quand même créer des rapports

### Pour un admin :

- Accès complet à tous les profils
- Peut mettre à jour les informations des joueurs créés par scouts
- Peut ajouter les données/métriques manquantes

### Pour les clubs :

- Voient tous les joueurs (avec et sans données)
- Distinction visuelle claire via les badges
- Accès au champ `clubFit` dans les rapports

### Pour les autres utilisateurs :

- Voient tous les profils avec distinction visuelle
- Pas d'accès au champ `clubFit` dans les rapports

## Exemple d'utilisation de l'API

### Créer un joueur (scout)

```bash
POST /players/scout-create
Content-Type: application/json

{
  "firstName": "Jean",
  "lastName": "Dupont",
  "age": 18,
  "positions": ["Milieu central"],
  "scoutId": "uuid-du-scout"
}
```

### Rechercher un joueur

```bash
GET /players/search?firstName=Jean&lastName=Dupont
```

### Récupérer les rapports d'un joueur (non-club)

```bash
GET /reports/player/uuid-du-joueur?userRole=SCOUT
```

→ Le champ `clubFit` sera exclu de la réponse

### Récupérer les rapports d'un joueur (club)

```bash
GET /reports/player/uuid-du-joueur?userRole=CLUB
```

→ Le champ `clubFit` sera inclus dans la réponse

## Notes importantes

1. **Validation des données** : Les joueurs créés par scouts ont des données minimales. Les admins doivent compléter les profils.

2. **Distinction visuelle** : Les badges permettent de comprendre immédiatement si un joueur a des données de performance ou non.

3. **Rapports scouts** : Tous les joueurs (PLATFORM_DATA et SCOUT_CREATED) peuvent avoir des rapports scouts. Le champ `clubFit` est réservé aux clubs et admins.

4. **Synchronisation** : Les deux bases de données (urroom-api et urroom-sports-analytics) ont été synchronisées pour maintenir la cohérence.

## Prochaines étapes suggérées

1. Appliquer les migrations sur les bases de données de production
2. Tester le workflow complet de création de joueur
3. Former les scouts à l'utilisation de cette fonctionnalité
4. Créer une interface admin pour gérer/compléter les profils créés par scouts
5. Ajouter des analytics sur les profils : combien créés par scouts vs plateforme
