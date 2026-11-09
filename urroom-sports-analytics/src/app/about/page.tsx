
import styles from './AboutPage.module.css';

export default function About() {

  return (
    <section className={styles.aboutSection}>
      <div className={styles.card}>
        <h1 className={styles.title}>À propos d'Uroom Sports Analytics</h1>
        
        {/* Vision */}
        <div style={{marginBottom: '4rem'}}>
          <div style={{
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '2px solid #14B8A6',
            display: 'inline-block'
          }}>
            <h2 style={{
              color: '#0F172A',
              fontSize: '1.75rem',
              margin: 0,
              fontWeight: '600'
            }}>
              Notre Vision
            </h2>
          </div>
          <p className={styles.text} style={{fontSize: '1.1rem', lineHeight: '1.8', color: '#475569'}}>
            Devenir le <strong style={{color: '#0F172A'}}>standard européen du suivi structuré des joueurs de U11 à U18</strong>, 
            en organisant la détection des talents dés les premiers niveaux.
          </p>
        </div>

        {/* Mission */}
        <div style={{marginBottom: '4rem'}}>
          <div style={{
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '2px solid #14B8A6',
            display: 'inline-block'
          }}>
            <h2 style={{
              color: '#0F172A',
              fontSize: '1.75rem',
              margin: 0,
              fontWeight: '600'
            }}>
              Notre Mission
            </h2>
          </div>
          <p className={styles.text} style={{lineHeight: '1.8', color: '#475569'}}>
            Transformer des <strong style={{color: '#0F172A'}}>observations terrain fragmentées</strong> en <strong style={{color: '#0F172A'}}>intelligence exploitable</strong>, afin de :
          </p>
          <ul style={{color: '#475569', marginTop: '1.5rem', marginLeft: '1.5rem', lineHeight: '2'}}>
            <li>Réduire l'incertitude dans la détection des talents</li>
            <li>Sécuriser les décisions financières des clubs</li>
            <li>Introduire un standard objectif et conforme RGPD pour les mineurs</li>
          </ul>
        </div>

        {/* Problème fondateur */}
        <div style={{marginBottom: '4rem'}}>
          <div style={{
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '2px solid #14B8A6',
            display: 'inline-block'
          }}>
            <h2 style={{
              color: '#0F172A',
              fontSize: '1.75rem',
              margin: 0,
              fontWeight: '600'
            }}>
              Le Constat Fondateur
            </h2>
          </div>
          <p className={styles.text} style={{lineHeight: '1.8', color: '#475569'}}>
            Le marché ne manque pas de données. Il manque d'un <strong style={{color: '#0F172A'}}>système structurant</strong>.
          </p>
          <p className={styles.text} style={{marginTop: '1rem', lineHeight: '1.8', color: '#475569'}}>
            Les clubs amateurs et semi-professionnels utilisent encore Excel, WhatsApp, notes dispersées et vidéos non indexées. 
            Résultat : <strong style={{color: '#0F172A'}}>aucune mémoire longitudinale</strong>, décisions subjectives, perte de talents et risque financier accru.
          </p>
          <div style={{
            marginTop: '1.5rem',
            padding: '1.25rem 1.5rem',
            background: '#F0FDFA',
            borderLeft: '4px solid #14B8A6',
            borderRadius: '4px'
          }}>
            <p style={{margin: 0, color: '#0F172A', fontWeight: '500', fontSize: '1.05rem'}}>
              Uroom structure cette couche manquante.
            </p>
          </div>
        </div>

        {/* Notre Approche */}
        <div style={{marginBottom: '4rem'}}>
          <div style={{
            marginBottom: '1.5rem',
            paddingBottom: '0.75rem',
            borderBottom: '2px solid #14B8A6',
            display: 'inline-block'
          }}>
            <h2 style={{
              color: '#0F172A',
              fontSize: '1.75rem',
              margin: 0,
              fontWeight: '600'
            }}>
              Notre Approche
            </h2>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.5rem'}}>
            <div style={{
              background: '#ffffff',
              padding: '1.75rem',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{color: '#14B8A6', marginBottom: '0.75rem', fontSize: '1.15rem', fontWeight: '600'}}>
                Longitudinal U11–U18
              </h3>
              <p style={{color: '#64748B', fontSize: '0.95rem', lineHeight: '1.6', margin: 0}}>
                Pas une photo du joueur, une trajectoire complète de sa progression.
              </p>
            </div>
            <div style={{
              background: '#ffffff',
              padding: '1.75rem',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{color: '#14B8A6', marginBottom: '0.75rem', fontSize: '1.15rem', fontWeight: '600'}}>
                Standardisation terrain
              </h3>
              <p style={{color: '#64748B', fontSize: '0.95rem', lineHeight: '1.6', margin: 0}}>
                Rendre comparable ce qui ne l'est pas (clubs, coachs, régions).
              </p>
            </div>
            <div style={{
              background: '#ffffff',
              padding: '1.75rem',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{color: '#14B8A6', marginBottom: '0.75rem', fontSize: '1.15rem', fontWeight: '600'}}>
                Correction des biais
              </h3>
              <p style={{color: '#64748B', fontSize: '0.95rem', lineHeight: '1.6', margin: 0}}>
                RAE (Relative Age Effect) et maturation biologique pour plus de fairness.
              </p>
            </div>
            <div style={{
              background: '#ffffff',
              padding: '1.75rem',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{color: '#14B8A6', marginBottom: '0.75rem', fontSize: '1.15rem', fontWeight: '600'}}>
                RGPD by-design
              </h3>
              <p style={{color: '#64748B', fontSize: '0.95rem', lineHeight: '1.6', margin: 0}}>
                Protection des mineurs, barrière réglementaire et argument de confiance.
              </p>
            </div>
            <div style={{
              background: '#ffffff',
              padding: '1.75rem',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{color: '#14B8A6', marginBottom: '0.75rem', fontSize: '1.15rem', fontWeight: '600'}}>
                Écosystème multi-acteurs
              </h3>
              <p style={{color: '#64748B', fontSize: '0.95rem', lineHeight: '1.6', margin: 0}}>
                Clubs + familles + scouts + agents = effet réseau puissant.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{
          marginTop: '3rem',
          textAlign: 'center',
          padding: '3rem 2rem',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <p style={{
            color: '#0F172A',
            fontSize: '1.35rem',
            marginBottom: '2rem',
            fontWeight: '600'
          }}>
            Prêt à structurer votre détection de talents ?
          </p>
          <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap'}}>
            <a href="/contact" style={{
              background: '#14B8A6',
              color: '#fff',
              padding: '1rem 2.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(20, 184, 166, 0.2)'
            }}>
              Demander une démo
            </a>
            <a href="/auth/register" style={{
              background: 'transparent',
              color: '#14B8A6',
              padding: '1rem 2.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              border: '2px solid #14B8A6',
              transition: 'all 0.2s'
            }}>
              Créer un compte
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
