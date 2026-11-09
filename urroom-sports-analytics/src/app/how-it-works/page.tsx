import styles from './HowItWorksPage.module.css';

export default function HowItWorks() {
  return (
    <section className={styles.howItWorksSection}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '4rem 2rem'
      }}>
        <h1 className={styles.title} style={{
          textAlign: 'center',
          marginBottom: '3rem',
          fontSize: '3rem'
        }}>
          Comment ça fonctionne
        </h1>
        
        <p style={{
          textAlign: 'center',
          fontSize: '1.15rem',
          color: '#64748B',
          lineHeight: '1.8',
          marginBottom: '4rem',
          maxWidth: '800px',
          margin: '0 auto 4rem'
        }}>
          Découvrez comment Uroom transforme la détection de talents en un processus structuré, 
          objectif et conforme RGPD.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}>
          {/* Étape 1 */}
          <div style={{
            background: '#ffffff',
            padding: '2.5rem',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            gap: '2rem',
            alignItems: 'flex-start'
          }}>
            <div style={{
              minWidth: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#fff',
              flexShrink: 0
            }}>
              1
            </div>
            <div>
              <h3 style={{
                color: '#0F172A',
                fontSize: '1.5rem',
                marginBottom: '0.75rem',
                fontWeight: '600'
              }}>
                Tests standardisés sur le terrain
              </h3>
              <p style={{
                color: '#64748B',
                fontSize: '1.05rem',
                lineHeight: '1.7',
                margin: 0
              }}>
                Protocoles validés couvrant les dimensions physiques, techniques et cognitives. 
                Ces tests garantissent une évaluation cohérente et comparable entre tous les joueurs.
              </p>
            </div>
          </div>

          {/* Étape 2 */}
          <div style={{
            background: '#ffffff',
            padding: '2.5rem',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            gap: '2rem',
            alignItems: 'flex-start'
          }}>
            <div style={{
              minWidth: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#fff',
              flexShrink: 0
            }}>
              2
            </div>
            <div>
              <h3 style={{
                color: '#0F172A',
                fontSize: '1.5rem',
                marginBottom: '0.75rem',
                fontWeight: '600'
              }}>
                Capture vidéo des exercices et matchs
              </h3>
              <p style={{
                color: '#64748B',
                fontSize: '1.05rem',
                lineHeight: '1.7',
                margin: 0
              }}>
                Enregistrement vidéo organisé et indexé pour construire une mémoire visuelle 
                complète de la progression du joueur au fil du temps.
              </p>
            </div>
          </div>

          {/* Étape 3 */}
          <div style={{
            background: '#ffffff',
            padding: '2.5rem',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            gap: '2rem',
            alignItems: 'flex-start'
          }}>
            <div style={{
              minWidth: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#fff',
              flexShrink: 0
            }}>
              3
            </div>
            <div>
              <h3 style={{
                color: '#0F172A',
                fontSize: '1.5rem',
                marginBottom: '0.75rem',
                fontWeight: '600'
              }}>
                Analyse automatique et saisie des métriques
              </h3>
              <p style={{
                color: '#64748B',
                fontSize: '1.05rem',
                lineHeight: '1.7',
                margin: 0
              }}>
                L'algorithme IA traite les données en corrigeant les biais biologiques (RAE, maturation) 
                pour identifier le véritable potentiel de chaque joueur U11-U18.
              </p>
            </div>
          </div>

          {/* Étape 4 */}
          <div style={{
            background: '#ffffff',
            padding: '2.5rem',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            gap: '2rem',
            alignItems: 'flex-start'
          }}>
            <div style={{
              minWidth: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#fff',
              flexShrink: 0
            }}>
              4
            </div>
            <div>
              <h3 style={{
                color: '#0F172A',
                fontSize: '1.5rem',
                marginBottom: '0.75rem',
                fontWeight: '600'
              }}>
                Génération de rapports visuels et partageables
              </h3>
              <p style={{
                color: '#64748B',
                fontSize: '1.05rem',
                lineHeight: '1.7',
                margin: 0
              }}>
                Rapports détaillés et graphiques permettant aux clubs, scouts et familles 
                de prendre des décisions éclairées basées sur des données objectives.
              </p>
            </div>
          </div>

          {/* Étape 5 */}
          <div style={{
            background: '#ffffff',
            padding: '2.5rem',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            gap: '2rem',
            alignItems: 'flex-start'
          }}>
            <div style={{
              minWidth: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#fff',
              flexShrink: 0
            }}>
              5
            </div>
            <div>
              <h3 style={{
                color: '#0F172A',
                fontSize: '1.5rem',
                marginBottom: '0.75rem',
                fontWeight: '600'
              }}>
                Écosystème de recrutement intégré
              </h3>
              <p style={{
                color: '#64748B',
                fontSize: '1.05rem',
                lineHeight: '1.7',
                margin: 0
              }}>
                Recherche avancée, création de shortlists, demandes d'essai et suivi des contacts 
                entre clubs, scouts, agents et joueurs au sein de la plateforme.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{
          marginTop: '4rem',
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
            Prêt à découvrir la plateforme ?
          </p>
          <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap'}}>
            <a href="/auth/register" style={{
              background: '#14B8A6',
              color: '#fff',
              padding: '1rem 2.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(20, 184, 166, 0.2)'
            }}>
              Créer un compte
            </a>
            <a href="/contact" style={{
              background: 'transparent',
              color: '#14B8A6',
              padding: '1rem 2.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              border: '2px solid #14B8A6',
              transition: 'all 0.2s'
            }}>
              Demander une démo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
