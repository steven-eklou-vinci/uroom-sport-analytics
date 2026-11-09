# urroom-api

Backend Express pour Uroom Sports Analytics avec integration du modele IA FastAPI.

## Endpoints IA (proxy Node -> modele Python)

- `GET /ai/health`
- `POST /ai/predict`
- `POST /ai/predict/batch`
- `POST /ai/players/:playerId/predict`

Le endpoint `POST /ai/players/:playerId/predict` construit automatiquement des `snapshots` a partir de `PlayerProfile + Assessment + Metric`, appelle le modele IA puis met a jour:

- `playerProfile.uroomScore`
- `potentialIndex`

## Variables d'environnement

Dans `urroom-api/.env`:

- `DATABASE_URL=...`
- `IA_MODEL_URL=http://localhost:8000`
- `IA_SERVICE_TOKEN=uroom_internal_token_change_me`

Dans `uroom-ia/.env` (ou variables shell):

- `IA_SERVICE_TOKEN=uroom_internal_token_change_me`

## Lancer les services

1. API Node:

```bash
cd urroom-api
npm install
npm run dev
```

2. API modele Python:

```bash
cd uroom-ia
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

## Seed base realiste U11-U18

```bash
cd urroom-api
npm run db:seed
```

Le seed cree:

- Joueurs U11 a U18 (dataset realiste)
- Evaluations + metrics (compatibles avec le modele)
- Comptes de connexion de demo

### Comptes de demo

Mot de passe commun:

- `Uroom2026!`

Comptes:

- `admin@uroom.app` (ADMIN)
- `scout.lina@uroom.app` (SCOUT)
- `club.rcn@uroom.app` (CLUB)
- `yanis.benali@uroom.app` (PLAYER)
- `luca.moreau@uroom.app` (PLAYER)
- `noah.diallo@uroom.app` (PLAYER)
- `sofiane.kadri@uroom.app` (PLAYER)
- `adem.cherif@uroom.app` (PLAYER)
- `milan.rossi@uroom.app` (PLAYER)
- `ilyes.boukari@uroom.app` (PLAYER)
- `ethan.ndiaye@uroom.app` (PLAYER)
