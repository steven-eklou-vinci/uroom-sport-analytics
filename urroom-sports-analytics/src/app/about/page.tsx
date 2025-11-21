
import styles from './AboutPage.module.css';

export default function About() {

  return (
    <section className={styles.aboutSection}>
      <div className={styles.card}>
        <h1 className={styles.title}>À propos</h1>
        <p className={styles.text}>Uroom Sports Analytics a pour mission de moderniser le scouting et l’analyse de performance dans le football, en rendant la donnée accessible à tous les clubs et joueurs.</p>
        <p className={styles.text}>Notre équipe réunit des experts du sport, de la data et du développement logiciel, passionnés par l’innovation et la transparence.</p>
      </div>
    </section>
  );
}
