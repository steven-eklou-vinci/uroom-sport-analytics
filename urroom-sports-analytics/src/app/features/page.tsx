import React from 'react';
import styles from './FeaturesPage.module.css';

export default function FeaturesPage() {
  return (
    <section className={styles.featuresSection}>
      <div className={styles.card}>
        <h1 className={styles.title}>Fonctionnalités</h1>
        <ul className={styles.list}>
          <li><b>Analyse vidéo intelligente</b> — Détection automatique des temps forts et statistiques avancées.</li>
          <li><b>Rapports personnalisés</b> — Génération de rapports PDF pour clubs et joueurs.</li>
          <li><b>Recherche avancée</b> — Filtres multi-critères, shortlist, export CSV.</li>
          <li><b>Tableaux de bord</b> — Visualisation des performances et comparaisons.</li>
          <li><b>Gestion collaborative</b> — Partage sécurisé des profils et évaluations.</li>
        </ul>
      </div>
    </section>
  );
}
