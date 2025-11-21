
import styles from './PricingPage.module.css';

export default function Pricing() {

  return (
    <section className={styles.pricingSection}>
      <div className={styles.card}>
        <h1 className={styles.title}>Tarifs</h1>
        <ul className={styles.list}>
          <li><b>Free</b> — Accès limité, profil public, consultation de base</li>
          <li><b>Pro Club</b> — Recherche avancée, shortlists, export, support</li>
          <li><b>Pro Academy</b> — Outils d’évaluation, rapports illimités, analytics</li>
        </ul>
        <p className={styles.info}>Contactez-nous pour un devis personnalisé ou une démo.</p>
        <div className={styles.buttonWrap}>
          <a href="/contact" className={styles.button}>Demander un devis</a>
        </div>
      </div>
    </section>
  );
}
