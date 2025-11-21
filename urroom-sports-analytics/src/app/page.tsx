
"use client";

import { useTranslation } from 'react-i18next';
import styles from './HomePage.module.css';
import Link from 'next/link';

export default function Home() {
  const { t } = useTranslation();
  return (
    <>
      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>{t('hero_title')}</h1>
        <p className={styles.heroSubtitle}>{t('hero_subtitle')}</p>
        <div className={styles.ctaGroup}>
          <a href="/auth/register" className={`${styles.ctaBtn} ${styles.ctaPrimary}`}>{t('cta_try')}</a>
          <a href="#how-it-works" className={`${styles.ctaBtn} ${styles.ctaSecondary}`}>{t('cta_discover')}</a>
        </div>
      </section>

      {/* Section Fonctionnement (exemple) */}
      <section id="how-it-works" className={`${styles.section} ${styles.sectionWhite}`}> 
        <Link href="/how-it-works" style={{textDecoration: 'none'}}>
          <h2 className={styles.sectionTitle} tabIndex={0}>{t('how_it_works_title')}</h2>
        </Link>
        <p className={styles.sectionDesc}>{t('how_it_works_desc')}</p>
        {/* ...ajouter des cards ou étapes ici si besoin... */}
      </section>

      {/* Section alternée gris clair (exemple) */}
      <section className={`${styles.section} ${styles.sectionLight}`}> 
        <Link href="/features" style={{textDecoration: 'none'}}>
          <h2 className={styles.sectionTitle} tabIndex={0}>{t('features_title')}</h2>
        </Link>
        <p className={styles.sectionDesc}>{t('features_desc')}</p>
        {/* ...ajouter des features ou cards ici... */}
      </section>
    </>
  );
}
