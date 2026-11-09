
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
          <a href="#solution" className={`${styles.ctaBtn} ${styles.ctaSecondary}`}>{t('cta_discover')}</a>
        </div>
      </section>

      {/* Problème Section */}
      <section className={`${styles.section} ${styles.sectionLight}`}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          textAlign: 'center',
          padding: '3rem 2rem'
        }}>
          {/* Slogan principal avec design élégant */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '4rem 3rem',
            marginBottom: '3rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              fontWeight: '700',
              lineHeight: '1.35',
              marginBottom: '2rem',
              color: '#1E293B',
              letterSpacing: '-0.01em',
              textAlign: 'center'
            }}>
              {t('problem_title')}
            </h2>
            
            {/* Barre décorative */}
            <div style={{
              width: '60px',
              height: '3px',
              background: '#14B8A6',
              margin: '0 auto 2rem',
              borderRadius: '2px'
            }}></div>

            <p style={{
              fontSize: 'clamp(1.05rem, 2vw, 1.2rem)',
              lineHeight: '1.75',
              color: '#64748B',
              maxWidth: '750px',
              margin: '0 auto',
              fontWeight: '400',
              textAlign: 'center'
            }}>
              {t('problem_desc')}
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem',
          marginTop: '4rem',
          maxWidth: '1200px',
          margin: '4rem auto 0'
        }}>
          {/* Card 1 */}
          <div style={{
            background: '#ffffff',
            padding: '2.5rem 2rem',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #E2E8F0',
            transition: 'all 0.3s ease',
            cursor: 'default',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '180px',
              height: '180px',
              margin: '0 auto 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src="/data-fragmentation-removebg-preview.png" 
                alt="Données fragmentées" 
                style={{width: '100%', height: '100%', objectFit: 'contain'}}
              />
            </div>
            <h3 style={{
              color: '#0F172A',
              fontSize: '1.35rem',
              fontWeight: '700',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              {t('problem_1_title')}
            </h3>
            <p style={{
              color: '#64748B',
              fontSize: '1rem',
              lineHeight: '1.7',
              textAlign: 'center'
            }}>
              {t('problem_1_desc')}
            </p>
            {/* Badge décoratif */}
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#14B8A6'
            }}></div>
          </div>

          {/* Card 2 */}
          <div style={{
            background: '#ffffff',
            padding: '2.5rem 2rem',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #E2E8F0',
            transition: 'all 0.3s ease',
            cursor: 'default',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '180px',
              height: '180px',
              margin: '0 auto 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src="/rae-removebg-preview.png" 
                alt="Biais systématiques" 
                style={{width: '100%', height: '100%', objectFit: 'contain'}}
              />
            </div>
            <h3 style={{
              color: '#0F172A',
              fontSize: '1.35rem',
              fontWeight: '700',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              {t('problem_2_title')}
            </h3>
            <p style={{
              color: '#64748B',
              fontSize: '1rem',
              lineHeight: '1.7',
              textAlign: 'center'
            }}>
              {t('problem_2_desc')}
            </p>
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#14B8A6'
            }}></div>
          </div>

          {/* Card 3 */}
          <div style={{
            background: '#ffffff',
            padding: '2.5rem 2rem',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #E2E8F0',
            transition: 'all 0.3s ease',
            cursor: 'default',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1.5rem',
              background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Placeholder pour votre image */}
              <div style={{width: '50px', height: '50px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px'}}></div>
            </div>
            <h3 style={{
              color: '#0F172A',
              fontSize: '1.35rem',
              fontWeight: '700',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              {t('problem_3_title')}
            </h3>
            <p style={{
              color: '#64748B',
              fontSize: '1rem',
              lineHeight: '1.7',
              textAlign: 'center'
            }}>
              {t('problem_3_desc')}
            </p>
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#14B8A6'
            }}></div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solution" className={`${styles.section} ${styles.sectionWhite}`}>
        <div style={{maxWidth: '900px', margin: '0 auto', textAlign: 'center'}}>
          <h2 className={styles.sectionTitle} style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            lineHeight: '1.2',
            marginBottom: '1.5rem'
          }}>
            {t('solution_title')}
          </h2>
          <p className={styles.sectionDesc} style={{
            fontSize: '1.15rem',
            lineHeight: '1.8',
            color: '#94A3B8',
            maxWidth: '700px',
            margin: '0 auto'
          }}>
            {t('solution_desc')}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '2.5rem',
          marginTop: '4rem',
          maxWidth: '1200px',
          margin: '4rem auto 0'
        }}>
          {/* Card 1 - Index IA */}
          <div style={{
            background: '#1E293B',
            padding: '2.5rem 2rem',
            borderRadius: '16px',
            border: '1px solid rgba(20, 184, 166, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.2s ease',
          }}>
            <div style={{
              width: '100%',
              maxWidth: '250px',
              height: '250px',
              margin: '0 auto 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src="/Index-ia.png" 
                alt="Index de Potentiel IA" 
                style={{
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain'
                }}
              />
            </div>

            <h3 style={{
              color: '#14B8A6',
              fontSize: '1.4rem',
              marginBottom: '1rem',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              {t('solution_1_title')}
            </h3>
            <p style={{
              color: '#94A3B8',
              lineHeight: '1.65',
              fontSize: '1rem',
              textAlign: 'center'
            }}>
              {t('solution_1_desc')}
            </p>
          </div>

          {/* Card 2 - Mémoire Longitudinale */}
          <div style={{
            background: '#1E293B',
            padding: '2.5rem 2rem',
            borderRadius: '16px',
            border: '1px solid rgba(20, 184, 166, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.2s ease',
          }}>
            <div style={{
              width: '100%',
              maxWidth: '250px',
              height: '250px',
              margin: '0 auto 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src="/longi.png" 
                alt="Mémoire Longitudinale" 
                style={{
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain'
                }}
              />
            </div>

            <h3 style={{
              color: '#14B8A6',
              fontSize: '1.4rem',
              marginBottom: '1rem',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              {t('solution_2_title')}
            </h3>
            <p style={{
              color: '#94A3B8',
              lineHeight: '1.65',
              fontSize: '1rem',
              textAlign: 'center'
            }}>
              {t('solution_2_desc')}
            </p>
          </div>

          {/* Card 3 - RGPD */}
          <div style={{
            background: '#1E293B',
            padding: '2.5rem 2rem',
            borderRadius: '16px',
            border: '1px solid rgba(20, 184, 166, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.2s ease',
          }}>
            <div style={{
              width: '100%',
              maxWidth: '250px',
              height: '250px',
              margin: '0 auto 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src="/rgpd.png" 
                alt="RGPD" 
                style={{
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain'
                }}
              />
            </div>

            <h3 style={{
              color: '#14B8A6',
              fontSize: '1.4rem',
              marginBottom: '1rem',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              {t('solution_3_title')}
            </h3>
            <p style={{
              color: '#94A3B8',
              lineHeight: '1.65',
              fontSize: '1rem',
              textAlign: 'center'
            }}>
              {t('solution_3_desc')}
            </p>
          </div>
        </div>
      </section>

      {/* Segments Section */}
      <section className={`${styles.section} ${styles.sectionLight}`}>
        <div style={{maxWidth: '900px', margin: '0 auto', textAlign: 'center'}}>
          <h2 className={styles.sectionTitle} style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            lineHeight: '1.2',
            marginBottom: '1.5rem',
            color: '#0F172A'
          }}>
            {t('segments_title')}
          </h2>
          <p className={styles.sectionDesc} style={{
            fontSize: '1.15rem',
            lineHeight: '1.8',
            color: '#475569',
            maxWidth: '700px',
            margin: '0 auto'
          }}>
            {t('segments_desc')}
          </p>
        </div>

        <div style={{
          marginTop: '4rem',
          maxWidth: '1200px',
          margin: '4rem auto 0',
          padding: '0 2rem'
        }}>
          {/* Image de l'écosystème */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '2rem'
          }}>
            <img 
              src="/ecosys.png" 
              alt="Écosystème Uroom" 
              style={{
                width: '100%',
                maxWidth: '1100px',
                height: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* Descriptions alignées sous les acteurs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '1rem',
            maxWidth: '1100px',
            margin: '0 auto',
            textAlign: 'center'
          }}>
            {/* Club & Academies */}
            <div style={{padding: '0.5rem'}}>
              <p style={{
                color: '#64748B',
                fontSize: '0.95rem',
                fontWeight: '500',
                margin: 0
              }}>
                Amateur à Élite
              </p>
            </div>

            {/* Scouts */}
            <div style={{padding: '0.5rem'}}>
              <p style={{
                color: '#64748B',
                fontSize: '0.95rem',
                fontWeight: '500',
                margin: 0
              }}>
                Détection & Suivi
              </p>
            </div>

            {/* Agents */}
            <div style={{padding: '0.5rem'}}>
              <p style={{
                color: '#64748B',
                fontSize: '0.95rem',
                fontWeight: '500',
                margin: 0
              }}>
                Représentation
              </p>
            </div>

            {/* Joueurs */}
            <div style={{padding: '0.5rem'}}>
              <p style={{
                color: '#64748B',
                fontSize: '0.95rem',
                fontWeight: '500',
                margin: 0
              }}>
                Développement U11-U18
              </p>
            </div>

            {/* Parents */}
            <div style={{padding: '0.5rem'}}>
              <p style={{
                color: '#64748B',
                fontSize: '0.95rem',
                fontWeight: '500',
                margin: 0
              }}>
                Passeport Performance
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={`${styles.section} ${styles.sectionWhite}`}>
        <Link href="/features" style={{textDecoration: 'none'}}>
          <h2 className={styles.sectionTitle} tabIndex={0}>{t('features_title')}</h2>
        </Link>
        <p className={styles.sectionDesc}>{t('features_desc')}</p>
      </section>

      {/* CTA Final */}
      <section className={`${styles.section} ${styles.sectionLight}`} style={{textAlign: 'center'}}>
        <h2 className={styles.sectionTitle}>{t('cta_final_title')}</h2>
        <p className={styles.sectionDesc}>{t('cta_final_desc')}</p>
        <div style={{marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap'}}>
          <a href="/auth/register" className={`${styles.ctaBtn} ${styles.ctaPrimary}`} style={{fontSize: '1.1rem', padding: '1rem 2.5rem'}}>Commencer maintenant</a>
          <a href="/contact" className={`${styles.ctaBtn} ${styles.ctaSecondary}`} style={{fontSize: '1.1rem', padding: '1rem 2.5rem'}}>Demander une démo</a>
        </div>
      </section>
    </>
  );
}
