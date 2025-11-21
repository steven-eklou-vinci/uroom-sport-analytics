import styles from './HowItWorksPage.module.css';

export default function HowItWorks() {
  return (
    <section className={styles.howItWorksSection}>
      <h1 className={styles.title}>Comment ça fonctionne</h1>
      <ol className={styles.list}>
        <li>Tests standardisés sur le terrain (physique, technique, cognitif)</li>
        <li>Capture vidéo des exercices et matchs</li>
        <li>Analyse automatique et saisie des métriques</li>
        <li>Génération de rapports visuels et partageables</li>
        <li>Recherche avancée, shortlists, demandes d’essai pour les clubs</li>
      </ol>
    </section>
  );
}
