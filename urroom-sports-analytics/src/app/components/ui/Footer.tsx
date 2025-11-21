import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.copyright}>© {new Date().getFullYear()} Uroom Sports Analytics</div>
        <div className={styles.links}>
          <Link href="/legal/privacy" className={styles.link}>Confidentialité</Link>
          <Link href="/legal/terms" className={styles.link}>Mentions légales</Link>
        </div>
      </div>
    </footer>
  );
}
