# Extension Web App : Rapports Scouts sur les Profils Joueurs

## Résumé

Extension de la fonctionnalité de création de profils par scouts à l'application web. Les rapports scouts sont maintenant visibles sur les profils joueurs de la web app, avec distinction visuelle entre joueurs avec données complètes et profils créés par scouts.

## Changements effectués

### 1. Nouvelle Route API

**`/urroom-sports-analytics/src/pages/api/reports/player/[playerId].ts`**

Route pour récupérer les rapports d'un joueur spécifique :
- **GET /api/reports/player/:playerId**
- Query param `userRole` pour filtrer le contenu selon le rôle
- Masquage automatique de `clubFit` pour les non-clubs/admins
- Authentification requise
- Tri par date décroissante

```typescript
// Exemple de requête
GET /api/reports/player/uuid-du-joueur?userRole=SCOUT

// Réponse pour scout (sans clubFit)
[
  {
    "id": "report-uuid",
    "summary": "Résumé du rapport...",
    "strengths": ["Force 1", "Force 2"],
    "weaknesses": ["Faiblesse 1"],
    "createdAt": "2026-03-10T...",
    "author": {
      "id": "scout-uuid",
      "name": "Jean Dupont",
      "email": "jean@example.com"
    }
  }
]
```

### 2. Nouveaux Composants Web

#### a) **PlayerDataBadge**

**Fichiers :**
- `/urroom-sports-analytics/src/app/components/ui/PlayerDataBadge.tsx`
- `/urroom-sports-analytics/src/app/components/ui/PlayerDataBadge.module.css`

**Fonctionnalités :**
- Badge visuel pour distinguer les types de joueurs
- Mode compact ou étendu
- Couleurs :
  - 🟢 Vert (#E8F5E9) : Données complètes (PLATFORM_DATA)
  - 🟠 Orange (#FFF3E0) : Profil scout (SCOUT_CREATED)

**Props :**
```typescript
interface PlayerDataBadgeProps {
  dataSource: 'PLATFORM_DATA' | 'SCOUT_CREATED';
  createdByScout?: { name: string; email: string };
  compact?: boolean;
}
```

**Utilisation :**
```tsx
<PlayerDataBadge 
  dataSource="SCOUT_CREATED" 
  createdByScout={{ name: "Jean Dupont", email: "jean@..." }}
/>
```

#### b) **ScoutReportsList**

**Fichiers :**
- `/urroom-sports-analytics/src/app/components/ui/ScoutReportsList.tsx`
- `/urroom-sports-analytics/src/app/components/ui/ScoutReportsList.module.css`

**Fonctionnalités :**
- Affichage de tous les rapports d'un joueur
- Cards élégantes avec sections organisées
- Affichage conditionnel de `clubFit` selon le rôle
- Notice informative pour les non-clubs
- État vide géré

**Props :**
```typescript
interface ScoutReportsListProps {
  reports: ScoutReport[];
  userRole?: string;
}
```

**Sections affichées :**
1. **Résumé** : Paragraphe de synthèse
2. **Forces** : Liste à puces avec icône ✓
3. **Faiblesses** : Liste à puces avec icône •
4. **Adéquation club** : Liste avec icône → (clubs/admins uniquement) + badge "Clubs uniquement"
5. **Notice** : Message pour les non-clubs (💡)

### 3. Page Profil Joueur Modifiée

**`/urroom-sports-analytics/src/app/dashboard/players/[id]/view/page.tsx`**

#### Interfaces mises à jour :

```typescript
interface PlayerData {
  // ... champs existants
  dataSource?: 'PLATFORM_DATA' | 'SCOUT_CREATED';
  createdByScout?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ScoutReport {
  id: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  clubFit?: string[];
  createdAt: string;
  author?: {
    id: string;
    name: string;
    email: string;
  };
}
```

#### Nouveaux états :

```typescript
const [scoutReports, setScoutReports] = useState<ScoutReport[]>([]);
```

#### Nouvelle fonction :

```typescript
const fetchScoutReports = async () => {
  const userRole = session?.user?.role || '';
  const res = await fetch(`/api/reports/player/${playerId}?userRole=${userRole}`);
  if (res.ok) {
    const data = await res.json();
    setScoutReports(data);
  }
};
```

#### Modifications du JSX :

1. **En-tête du profil** : Ajout du badge PlayerDataBadge
```tsx
<div className={styles.playerTitleRow}>
  <h1>{player.firstName} {player.lastName}</h1>
  {player.dataSource && player.dataSource !== 'PLATFORM_DATA' && (
    <PlayerDataBadge 
      dataSource={player.dataSource} 
      createdByScout={player.createdByScout}
    />
  )}
</div>
```

2. **Section rapports** : Après les comparaisons de joueurs
```tsx
<ScoutReportsList 
  reports={scoutReports} 
  userRole={session?.user?.role}
/>
```

### 4. Styles CSS Ajoutés

**`PlayerProfilePage.module.css`**

```css
.playerTitleRow {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
```

## Workflow Utilisateur Web

### Pour un scout :
1. Accède au profil d'un joueur
2. Voit le badge "Profil scout" si créé par un scout
3. Voit tous les rapports scouts (sans clubFit)
4. Peut créer un nouveau rapport

### Pour un club :
1. Accède au profil d'un joueur
2. Voit le badge de distinction
3. Voit tous les rapports scouts **avec** la section clubFit
4. Badge "Clubs uniquement" sur la section clubFit

### Pour un admin :
- Accès complet à tous les profils et rapports
- Voit tous les champs y compris clubFit
- Peut gérer et mettre à jour les profils

### Pour les autres utilisateurs :
- Voient les profils avec badges
- Voient les rapports sans clubFit
- Notice explicative affichée

## Cohérence Mobile ↔ Web

Les composants web ont été conçus pour être cohérents avec l'application mobile :

| Fonctionnalité | Mobile | Web | ✓ |
|----------------|--------|-----|---|
| Badge distinction | ✓ | ✓ | ✓ |
| Couleurs badges | Vert/Orange | Vert/Orange | ✓ |
| Rapports scouts | ✓ | ✓ | ✓ |
| Filtrage clubFit | ✓ | ✓ | ✓ |
| Sections rapport | Summary, Strengths, Weaknesses, ClubFit | Idem | ✓ |

## Architecture de la Donnée

```
PlayerProfile
├── dataSource: PLATFORM_DATA | SCOUT_CREATED
├── createdByScout?: User
└── reports: Report[]
    ├── summary: string
    ├── strengths: string[]
    ├── weaknesses: string[]
    ├── clubFit: string[] (conditionnel)
    └── author: User
```

## Tests Recommandés

1. **Test d'affichage du badge** :
   - Créer un joueur via scout
   - Vérifier l'apparition du badge orange
   - Vérifier que les joueurs avec données ont le badge vert

2. **Test de filtrage clubFit** :
   - Se connecter en tant que scout → clubFit masqué
   - Se connecter en tant que club → clubFit visible
   - Vérifier la notice informative

3. **Test de chargement des rapports** :
   - Profil avec 0 rapport → message vide
   - Profil avec plusieurs rapports → affichage correct
   - Tri par date décroissante

4. **Test responsive** :
   - Tester sur différentes tailles d'écran
   - Vérifier le wrap du playerTitleRow
   - Vérifier les cards de rapports

## Prochaines Étapes

1. ✅ Appliquer les migrations sur les bases de données
2. ✅ Synchroniser mobile et web app
3. ⚠️ Tester l'intégration complète
4. ⚠️ Ajouter des tests unitaires pour les nouveaux composants
5. ⚠️ Créer une interface admin pour gérer les profils scouts
6. ⚠️ Ajouter des analytics : profils créés par scouts vs plateforme

## Résumé des Fichiers Créés/Modifiés

### Créés :
- `/urroom-sports-analytics/src/app/components/ui/PlayerDataBadge.tsx`
- `/urroom-sports-analytics/src/app/components/ui/PlayerDataBadge.module.css`
- `/urroom-sports-analytics/src/app/components/ui/ScoutReportsList.tsx`
- `/urroom-sports-analytics/src/app/components/ui/ScoutReportsList.module.css`
- `/urroom-sports-analytics/src/pages/api/reports/player/[playerId].ts`

### Modifiés :
- `/urroom-sports-analytics/src/app/dashboard/players/[id]/view/page.tsx`
- `/urroom-sports-analytics/src/app/dashboard/players/[id]/view/PlayerProfilePage.module.css`
