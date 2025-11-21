
import styles from './ContactPage.module.css';

export default function Contact() {

  return (
    <section className={styles.contactSection}>
      <div className={styles.card}>
        <h1 className={styles.title}>Contact</h1>
        <form className={styles.form} method="POST" action={`${process.env.NEXT_PUBLIC_API_URL}/contact`}>
          <input name="name" placeholder="Nom" className={styles.input} required />
          <input name="email" type="email" placeholder="Email" className={styles.input} required />
          <textarea name="message" placeholder="Votre message" className={styles.textarea} required />
          <button type="submit" className={styles.button}>Envoyer</button>
        </form>
      </div>
    </section>
  );
}
