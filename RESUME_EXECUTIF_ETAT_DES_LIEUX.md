# 📊 RÉSUMÉ EXÉCUTIF - État des lieux Uroom
**Date:** 27 février 2026

---

## 🎯 STRATÉGIE CIBLE
- **Web App (70%)** = Centre nerveux / Intelligence / G estion (B2B focus)
- **Mobile App (30%)** = Terrain / Capture / Vitesse (friction solving)

---

## ✅ AVANCEMENT ACTUEL : ~35% Web App / 0% Mobile

### ✅ CE QUI FONCTIONNE

**Infrastructure solide :**
- Next.js 15.5.3 + TypeScript + Prisma + PostgreSQL ✅
- Authentification multi-rôles (ADMIN, CLUB, SCOUT, AGENT, PLAYER) ✅
- Pages publiques complètes (Homepage, Pricing, About, How-it-works) ✅

**Dashboards opérationnels :**
- ✅ Club : gestion scouts, rapports, stats
- ✅ Scout : follow joueurs, rapports, shortlists, recherche
- ✅ Joueur : profil, stats, vidéos, classement
- ✅ Admin : gestion utilisateurs

**Fonctionnalités Core basiques :**
- ✅ CRUD joueurs complet (positions multiples, photos, vidéos)
- ✅ Assessments + métriques quantifiées
- ✅ Rapports d'évaluation + export PDF
- ✅ Recherche & filtres joueurs
- ✅ Shortlists scouting
- ✅ Demandes d'essai (trials)
- ✅ Ranking system (Uroom Score & Rank)
- ✅ Upload vidéo (jusqu'à 100MB)
- ✅ RGPD basique (publicOptIn, privacy policy)

---

## 🔴 CE QUI MANQUE (CRITIQUE)

### Sur Web App - Différenciateurs Business Plan

**1. Index Potentiel IA** 🔴 PRIORITÉ #1
- Algorithme de calcul potentiel
- Projections de trajectoire
- Score potentiel sur fiche joueur
- **Impact :** Différenciateur clé vs concurrents

**2. Longitudinal U11-U18 complet** 🔴 PRIORITÉ #2
- Timeline multi-saisons
- Graphes progression temporelle
- Historique événements
- Comparaisons cohortes
- **Impact :** Valeur centrale promesse Uroom

**3. RGPD avancé** 🔴 PRIORITÉ #3
- Gestion consentements mineurs parents
- Logs d'accès complets (audit trails)
- Politique de rétention données
- Exports contrôlés
- **Impact :** Compliance légale obligatoire

**4. Correction RAE / Bio-banding** 🔴
- Calcul âge biologique
- Ajustement métriques maturation
- Groupement bio-banding
- **Impact :** Fairness & scientificité

**5. API / Intégrations clubs pro** 🔴
- REST API documentée
- Webhooks
- Bridge format intégrations  
- **Impact :** Adoption clubs Pro/Élite (Pack C)

**6. Modules Premium B2B**
- Module valorisation (dossiers export pro)
- Analytics avancés (insights IA)
- Dashboard progression équipe
- Comparaisons vs référentiel interne

**7. Écosystème B2C**
- Passeport Performance web parents dédié
- Workshops booking + paiement
- Back-office workshops (certifications, badges)
- Gestion planning workshops

---

### Application Mobile - 0% fait ⚠️

**Actuellement : RIEN sur mobile → Friction terrain massive**

**Ce qui est OBLIGATOIRE sur mobile :**

**1. Saisie terrain** (scouts)
- ❌ Grilles d'observation standardisées
- ❌ Mode Match (notation live)
- ❌ Ajout rapide joueur
- ❌ Mode offline + sync auto
- ⏱️ Objectif : < 3 min/joueur

**2. Capture médias**
- ❌ Upload vidéo rapide natif
- ❌ Photo profil terrain
- ❌ Scan QR workshops
- ❌ Compression auto + upload background

**3. Scouts premium mobile**
- ❌ Recherche rapide (filtres basiques)
- ❌ Alertes push nouveaux profils
- ❌ Détection live simplifiée
- ❌ Accès fiche joueur condensée

**4. Parents/Joueurs mobile**
- ❌ Passeport Performance mobile
- ❌ Notifications (nouveaux rapports, classement)
- ❌ Partage lien profil
- ❌ Consultation badges

---

## ⚠️ PROBLÈMES ACTUELS

**1. Friction scouts terrain**
- Scout doit utiliser laptop sur terrain → impraticable
- Pas de mode offline → bloqué sans réseau
- Upload vidéo web seulement (pas capture native)

**2. Absence différenciateurs clés**
- Pas d'Index Potentiel IA → ressemble aux concurrents
- Pas de longitudinal complet → pas de "mémoire continue"
- RGPD basique → risque compliance mineurs

**3. Segments mal servis**
- Clubs Pro (Pack C) → manque API/intégrations
- Parents → pas de vue dédiée
- Joueurs indépendants → pas de workshops booking

---

## 🚀 ROADMAP RECOMMANDÉE

### Phase 1 : Compléter Web Core (3-4 mois)

**Sprint 1-2 (Mois 1-2) : Différenciateurs**
1. ✅ Index Potentiel IA
   - Modèle `PotentialIndex` Prisma
   - Algorithme calcul (baseline)
   - Affichage fiche joueur
   - API `/api/analytics/potential-index`

2. ✅ Longitudinal U11-U18
   - Timeline multi-saisons
   - Graphes progression (Chart.js/Recharts)
   - Comparaisons cohortes
   - `/dashboard/players/[id]/history`

3. ✅ RGPD avancé
   - Table `Consents` + `AuditLogs`
   - Gestion consentements parents
   - Logs accès automatiques
   - `/dashboard/rgpd/consents`

**Sprint 3-4 (Mois 3-4) : Premium B2B**
1. ✅ Module valorisation
   - Générateur CV digital
   - Export dossiers pro (PDF enrichi)

2. ✅ API REST
   - Documentation OpenAPI
   - Endpoints CRUD joueurs/assessments
   - Webhooks événements

3. ✅ Dashboard progression équipe
   - Vue agrégée club
   - Alertes progression/régression

### Phase 2 : Mobile App (2-3 mois)

**Option recommandée : PWA d'abord** (validation rapide)
- Progressive Web App Next.js
- Service Workers offline
- Manifest installable
- ⏱️ 6-8 semaines développement

**Si traction forte → App Native** (React Native/Flutter)

**Fonctionnalités MVP Mobile :**
1. Grilles observation standardisées
2. Mode Match (notation live offline)
3. Capture vidéo native + upload
4. Offline-first SQLite + sync
5. Scouts : recherche + alertes push
6. Parents : consultation progression

### Phase 3 : Écosystème B2C (Mois 5-6)

1. ✅ Workshops booking
   - Réservation en ligne
   - Paiement Stripe
   - Gestion planning

2. ✅ Back-office workshops
   - Certification tests
   - Délivrance badges
   - Participants management

3. ✅ Passeport Performance parents
   - Vue dédiée web
   - Téléchargement rapports
   - Paramétrage visibilité

---

## 📈 IMPACT BUSINESS

**Avec Différenciateurs Web (Phase 1) :**
- ✅ Positionnement premium vs concurrents
- ✅ Justification pricing Pack B/C (8-20k€/an)
- ✅ Argument commercial "Index Potentiel IA unique"
- ✅ Compliance RGPD mineurs → barrière à l'entrée

**Avec Mobile (Phase 2) :**
- ✅ Démocratisation saisie terrain → adoption scouts
- ✅ Données terrain captées rapidement → base enrichie
- ✅ Effet réseau accéléré (plus de données → plus de valeur)

**Risque si ordre inversé :**
- ❌ Mobile avant Web Core → outil de saisie isolé, pas plateforme intelligence
- ❌ Pas de différenciation → concurrence frontale sur prix

---

## 💡 ACTIONS IMMÉDIATES (Cette semaine)

### 1. Créer Index Potentiel IA (MVP)
```typescript
// /prisma/schema.prisma
model PotentialIndex {
  id          String   @id @default(uuid())
  playerId    String   @unique
  score       Float    // 0-100
  trajectory  String   // "RISING", "STABLE", "DECLINING"
  factors     Json     // Détails calcul
  updatedAt   DateTime @default(now())
  player      PlayerProfile @relation(fields: [playerId], references: [id])
}
```

### 2. Implémenter Timeline longitudinale
- Composant `<PlayerTimeline />` avec graphe progression
- Affichage événements clés (workshops, assessments)
- Intégration dans `/dashboard/players/[id]`

### 3. Renforcer RGPD
- Table `Consents` (playerId, type, parentEmail, consentedAt)
- Middleware logging accès automatique
- Page `/dashboard/rgpd/consents` pour clubs

---

## 🎯 CONCLUSION

**Statut actuel : Fondations solides (35%) mais manque différenciation**

**Priorités absolues (dans l'ordre) :**
1. 🔴 Index Potentiel IA (4 semaines)
2. 🔴 Longitudinal U11-U18 (4 semaines)
3. 🔴 RGPD avancé (3 semaines)
4. 🟡 Mobile PWA terrain (8 semaines)
5. 🟡 Workshops ecosystem (6 semaines)

**Avec ça, vous aurez :**
- Différenciation réelle vs concurrents ✅
- Compliance RGPD mineurs ✅
- Adoption scouts terrain facilitée ✅
- B2C ecosystem opérationnel ✅

**Timeline réaliste : 5-6 mois pour être compétitif marché.**

---

**Prochaine étape recommandée :**
Commencer par l'Index Potentiel IA → différenciateur clé, impact commercial immédiat.
