# Uroom Sports Analytics

Uroom Sports Analytics est une application web SaaS dédiée au scouting et à l’analyse de performance des joueurs de football.

## Fonctionnalités principales
- Gestion des joueurs, clubs, rapports, shortlists, essais
- Recherche avancée multi-critères
- Authentification (email + Google OAuth)
- RBAC (admin, scout, club, joueur)
- Import CSV, upload vidéo, export PDF
- Dashboard sécurisé, pages publiques informatives
- Internationalisation (français/anglais)
- UI professionnelle, responsive, accessible

## Stack technique
- **Next.js** (App Router, TypeScript)
- **Prisma** (ORM) + **PostgreSQL**
- **NextAuth.js** (authentification)
- **Tailwind CSS** (design system)
- **React-i18next** (i18n)
- **pdf-lib**, **formidable**, **csv-parse** (fichiers)

## Structure du projet
```
/prisma         # Schéma, seed, migrations
/src/app        # Pages (public, dashboard, auth), composants UI
/src/pages/api  # Endpoints REST (auth, joueurs, clubs, etc.)
/src/app/components/ui # Boutons, Cards, Table, Header, Footer...
```

## Démarrage local
1. Cloner le repo
2. Installer les dépendances :
	```bash
	npm install
	```
3. Configurer la base de données (PostgreSQL) et `.env`
4. Lancer les migrations et le seed :
	```bash
	npx prisma migrate dev && npx prisma db seed
	```
5. Démarrer le serveur :
	```bash
	npm run dev
	```

## Design system
- Palette :
  - Primaire : #0F172A (bleu nuit)
  - Secondaire : #14B8A6 (turquoise)
  - Fond clair : #F1F5F9
  - Texte : #1E293B
  - Erreur : #DC2626
- Typographie : Inter, titres gras/majuscules, corps régulier
- Composants : Header, Footer, Button, Card, Table, etc.

## Accès
- Pages publiques : accueil, à propos, tarifs, contact, clubs, joueurs, login, inscription, CGU, confidentialité…
- Dashboard protégé : gestion, recherche, reporting, etc.

## Contribution
- PR bienvenues
- Respecter la structure, le design system et l’accessibilité

## Licence
MIT

---

Pour toute question ou demande de démo, contactez l’équipe Uroom Sports Analytics.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
