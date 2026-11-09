
import styles from './PricingPage.module.css';

export default function Pricing() {

  return (
    <section className={styles.pricingSection}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '4rem 2rem'
      }}>
        <h1 className={styles.title} style={{
          textAlign: 'center',
          marginBottom: '1.5rem',
          fontSize: '3rem'
        }}>
          Tarifs
        </h1>
        
        <p style={{
          textAlign: 'center',
          fontSize: '1.15rem',
          color: '#64748B',
          lineHeight: '1.8',
          marginBottom: '4rem',
          maxWidth: '700px',
          margin: '0 auto 4rem'
        }}>
          Des solutions adaptées à chaque acteur du football. Choisissez la formule qui correspond à vos besoins.
        </p>

        {/* Clubs & Académies */}
        <div style={{marginBottom: '4rem'}}>
          <h2 style={{
            color: '#0F172A',
            fontSize: '2rem',
            marginBottom: '2rem',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Clubs & Académies
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem'
          }}>
            {/* Pack A - Amateur structuré */}
            <div style={{
              background: '#ffffff',
              padding: '2.5rem',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}>
              <div style={{
                color: '#14B8A6',
                fontSize: '1.15rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Pack A
              </div>
              <h3 style={{
                color: '#0F172A',
                fontSize: '1.75rem',
                marginBottom: '0.5rem',
                fontWeight: '700'
              }}>
                Amateur structuré
              </h3>
              <div style={{
                color: '#64748B',
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '1rem'
              }}>
                3 000 – 4 000 €/an
              </div>
              <p style={{
                color: '#64748B',
                fontSize: '0.95rem',
                marginBottom: '1.5rem',
                lineHeight: '1.6'
              }}>
                Clubs R1/R2/N1 régionale, clubs formateurs sans analyste
              </p>
              <ul style={{
                color: '#475569',
                fontSize: '0.95rem',
                lineHeight: '2',
                listStyle: 'none',
                padding: 0,
                margin: '1.5rem 0'
              }}>
                <li style={{marginBottom: '0.5rem'}}>✓ Uroom Core complet</li>
                <li style={{marginBottom: '0.5rem'}}>✓ Modèles de rapports formation</li>
                <li style={{marginBottom: '0.5rem'}}>✓ Tableaux de bord progression</li>
                <li style={{marginBottom: '0.5rem'}}>✓ Kit RGPD simplifié</li>
                <li style={{marginBottom: '0.5rem'}}>✓ Import vidéo (option)</li>
              </ul>
              <div style={{
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #E2E8F0'
              }}>
                <a href="/contact" style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#14B8A6',
                  color: '#fff',
                  padding: '1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}>
                  Demander un devis
                </a>
              </div>
            </div>

            {/* Pack B - Semi-pro / National */}
            <div style={{
              background: '#ffffff',
              padding: '2.5rem',
              borderRadius: '16px',
              border: '2px solid #14B8A6',
              boxShadow: '0 4px 12px rgba(20, 184, 166, 0.15)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#14B8A6',
                color: '#fff',
                padding: '0.35rem 1rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                Populaire
              </div>
              <div style={{
                color: '#14B8A6',
                fontSize: '1.15rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Pack B
              </div>
              <h3 style={{
                color: '#0F172A',
                fontSize: '1.75rem',
                marginBottom: '0.5rem',
                fontWeight: '700'
              }}>
                Semi-pro / National
              </h3>
              <div style={{
                color: '#64748B',
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '1rem'
              }}>
                8 000 – 12 000 €/an
              </div>
              <p style={{
                color: '#64748B',
                fontSize: '0.95rem',
                marginBottom: '1.5rem',
                lineHeight: '1.6'
              }}>
                Clubs avec enjeu recrutement/valorisation
              </p>
              <ul style={{
                color: '#475569',
                fontSize: '0.95rem',
                lineHeight: '2',
                listStyle: 'none',
                padding: 0,
                margin: '1.5rem 0'
              }}>
                <li style={{marginBottom: '0.5rem'}}>✓ Tout Pack A</li>
                <li style={{marginBottom: '0.5rem'}}>✓ Module valorisation joueurs</li>
                <li style={{marginBottom: '0.5rem'}}>✓ Comparaisons vs référentiel</li>
                <li style={{marginBottom: '0.5rem'}}>✓ Workflows de scouting</li>
                <li style={{marginBottom: '0.5rem'}}>✓ RGPD avancé</li>
              </ul>
              <div style={{
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #E2E8F0'
              }}>
                <a href="/contact" style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#14B8A6',
                  color: '#fff',
                  padding: '1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}>
                  Demander un devis
                </a>
              </div>
            </div>

            {/* Pack C - Pro / Élite */}
            <div style={{
              background: '#ffffff',
              padding: '2.5rem',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}>
              <div style={{
                color: '#14B8A6',
                fontSize: '1.15rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Pack C
              </div>
              <h3 style={{
                color: '#0F172A',
                fontSize: '1.75rem',
                marginBottom: '0.5rem',
                fontWeight: '700'
              }}>
                Pro / Élite
              </h3>
              <div style={{
                color: '#64748B',
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '1rem'
              }}>
                12 000 – 20 000 €/an
              </div>
              <p style={{
                color: '#64748B',
                fontSize: '0.95rem',
                marginBottom: '1.5rem',
                lineHeight: '1.6'
              }}>
                Clubs pros avec intégration & données certifiées
              </p>
              <ul style={{
                color: '#475569',
                fontSize: '0.95rem',
                lineHeight: '2',
                listStyle: 'none',
                padding: 0,
                margin: '1.5rem 0'
              }}>
                <li style={{marginBottom: '0.5rem'}}>✓ Tout Pack B</li>
                <li style={{marginBottom: '0.5rem'}}>✓ Module API / intégration</li>
                <li style={{marginBottom: '0.5rem'}}>✓ Longitudinal avancé</li>
                <li style={{marginBottom: '0.5rem'}}>✓ Conformité renforcée</li>
                <li style={{marginBottom: '0.5rem'}}>✓ Accès réseau talents Uroom</li>
              </ul>
              <div style={{
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #E2E8F0'
              }}>
                <a href="/contact" style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#14B8A6',
                  color: '#fff',
                  padding: '1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}>
                  Demander un devis
                </a>
              </div>
            </div>

            {/* Pack D - Académies privées */}
            <div style={{
              background: '#ffffff',
              padding: '2.5rem',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}>
              <div style={{
                color: '#14B8A6',
                fontSize: '1.15rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Pack D
              </div>
              <h3 style={{
                color: '#0F172A',
                fontSize: '1.75rem',
                marginBottom: '0.5rem',
                fontWeight: '700'
              }}>
                Académies privées
              </h3>
              <div style={{
                color: '#64748B',
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '1rem'
              }}>
                6 500 – 10 000 €/an
              </div>
              <p style={{
                color: '#64748B',
                fontSize: '0.95rem',
                marginBottom: '1.5rem',
                lineHeight: '1.6'
              }}>
                Preuve de valeur et différenciation pour les parents
              </p>
              <ul style={{
                color: '#475569',
                fontSize: '0.95rem',
                lineHeight: '2',
                listStyle: 'none',
                padding: 0,
                margin: '1.5rem 0'
              }}>
                <li style={{marginBottom: '0.5rem'}}>✓ Uroom Core</li>
                <li style={{marginBottom: '0.5rem'}}>✓ Reporting parents</li>
                <li style={{marginBottom: '0.5rem'}}>✓ Passeport performance inclus</li>
                <li style={{marginBottom: '0.5rem'}}>✓ Certification de tests</li>
                <li style={{marginBottom: '0.5rem'}}>✓ Showcase public contrôlé</li>
              </ul>
              <div style={{
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #E2E8F0'
              }}>
                <a href="/contact" style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#14B8A6',
                  color: '#fff',
                  padding: '1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}>
                  Demander un devis
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Scouts & Agents */}
        <div style={{marginBottom: '4rem'}}>
          <h2 style={{
            color: '#0F172A',
            fontSize: '2rem',
            marginBottom: '2rem',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Scouts & Agents
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '2rem',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            {/* Uroom Scouts */}
            <div style={{
              background: '#ffffff',
              padding: '2.5rem',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{
                color: '#0F172A',
                fontSize: '1.75rem',
                marginBottom: '1rem',
                fontWeight: '700'
              }}>
                Uroom Scouts
              </h3>
              <p style={{
                color: '#64748B',
                fontSize: '0.95rem',
                marginBottom: '1.5rem',
                lineHeight: '1.6'
              }}>
                Accès terrain et détection live de talents
              </p>
              
              <div style={{marginBottom: '1.5rem'}}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{color: '#0F172A', fontWeight: '600'}}>Standard</span>
                  <span style={{color: '#14B8A6', fontSize: '1.3rem', fontWeight: '700'}}>29 €/mois</span>
                </div>
                <ul style={{
                  color: '#475569',
                  fontSize: '0.9rem',
                  lineHeight: '1.8',
                  listStyle: 'none',
                  padding: 0,
                  margin: 0
                }}>
                  <li style={{marginBottom: '0.3rem'}}>✓ Base talents + filtres</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Comparaisons</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Rapports</li>
                </ul>
              </div>

              <div style={{
                padding: '1rem',
                background: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{color: '#0F172A', fontWeight: '600'}}>Premium</span>
                  <span style={{color: '#14B8A6', fontSize: '1.3rem', fontWeight: '700'}}>59 €/mois</span>
                </div>
                <ul style={{
                  color: '#475569',
                  fontSize: '0.9rem',
                  lineHeight: '1.8',
                  listStyle: 'none',
                  padding: 0,
                  margin: 0
                }}>
                  <li style={{marginBottom: '0.3rem'}}>✓ Tout Standard</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Détection en live</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Alertes & priorisation</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Projections avancées</li>
                </ul>
              </div>

              <div style={{
                marginTop: '1.5rem'
              }}>
                <a href="/contact" style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#14B8A6',
                  color: '#fff',
                  padding: '1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}>
                  S'abonner
                </a>
              </div>
            </div>

            {/* Uroom Agents */}
            <div style={{
              background: '#ffffff',
              padding: '2.5rem',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{
                color: '#0F172A',
                fontSize: '1.75rem',
                marginBottom: '1rem',
                fontWeight: '700'
              }}>
                Uroom Agents
              </h3>
              <p style={{
                color: '#64748B',
                fontSize: '0.95rem',
                marginBottom: '1.5rem',
                lineHeight: '1.6'
              }}>
                Accès à la base de talents certifiés
              </p>
              
              <div style={{marginBottom: '1.5rem'}}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{color: '#0F172A', fontWeight: '600'}}>Standard</span>
                  <span style={{color: '#14B8A6', fontSize: '1.3rem', fontWeight: '700'}}>49 €/mois</span>
                </div>
                <ul style={{
                  color: '#475569',
                  fontSize: '0.9rem',
                  lineHeight: '1.8',
                  listStyle: 'none',
                  padding: 0,
                  margin: 0
                }}>
                  <li style={{marginBottom: '0.3rem'}}>✓ Filtres avancés</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Création de shortlists</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Export dossiers joueurs</li>
                </ul>
              </div>

              <div style={{
                padding: '1rem',
                background: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{color: '#0F172A', fontWeight: '600'}}>Premium</span>
                  <span style={{color: '#14B8A6', fontSize: '1.3rem', fontWeight: '700'}}>79 €/mois</span>
                </div>
                <ul style={{
                  color: '#475569',
                  fontSize: '0.9rem',
                  lineHeight: '1.8',
                  listStyle: 'none',
                  padding: 0,
                  margin: 0
                }}>
                  <li style={{marginBottom: '0.3rem'}}>✓ Tout Standard</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Accès données certifiées</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Historiques workshops</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Insights avancés</li>
                </ul>
              </div>

              <div style={{
                marginTop: '1.5rem'
              }}>
                <a href="/contact" style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#14B8A6',
                  color: '#fff',
                  padding: '1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}>
                  S'abonner
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Joueurs */}
        <div style={{marginBottom: '4rem'}}>
          <h2 style={{
            color: '#0F172A',
            fontSize: '2rem',
            marginBottom: '2rem',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Joueurs
          </h2>
          <div style={{
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            {/* Uroom Workshops */}
            <div style={{
              background: '#ffffff',
              padding: '2.5rem',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{
                color: '#0F172A',
                fontSize: '1.75rem',
                marginBottom: '1rem',
                fontWeight: '700'
              }}>
                Uroom Workshops
              </h3>
              <p style={{
                color: '#64748B',
                fontSize: '0.95rem',
                marginBottom: '1.5rem',
                lineHeight: '1.6'
              }}>
                Tests standardisés certifiés & intégration base de données
              </p>
              
              <div style={{
                marginBottom: '1.5rem',
                paddingBottom: '1.5rem',
                borderBottom: '1px solid #E2E8F0'
              }}>
                <div style={{
                  color: '#0F172A',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  fontSize: '1.05rem'
                }}>
                  Option 1 : Paiement ponctuel
                </div>
                
                <div style={{marginBottom: '1rem'}}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{color: '#0F172A', fontWeight: '600', fontSize: '0.95rem'}}>Standard</span>
                    <span style={{color: '#14B8A6', fontSize: '1.25rem', fontWeight: '700'}}>75 €</span>
                  </div>
                  <ul style={{
                    color: '#475569',
                    fontSize: '0.85rem',
                    lineHeight: '1.6',
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                  }}>
                    <li style={{marginBottom: '0.2rem'}}>✓ Tests standardisés Uroom</li>
                    <li style={{marginBottom: '0.2rem'}}>✓ Intégration base de données</li>
                    <li style={{marginBottom: '0.2rem'}}>✓ Rapport individuel PDF</li>
                    <li style={{marginBottom: '0.2rem'}}>✓ Badge "Talent Certifié"</li>
                  </ul>
                </div>

                <div style={{
                  padding: '0.75rem',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{color: '#0F172A', fontWeight: '600', fontSize: '0.95rem'}}>Premium</span>
                    <span style={{color: '#14B8A6', fontSize: '1.25rem', fontWeight: '700'}}>120 €</span>
                  </div>
                  <ul style={{
                    color: '#475569',
                    fontSize: '0.85rem',
                    lineHeight: '1.6',
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                  }}>
                    <li style={{marginBottom: '0.2rem'}}>✓ Tout Standard</li>
                    <li style={{marginBottom: '0.2rem'}}>✓ Vidéo montée automatiquement</li>
                    <li style={{marginBottom: '0.2rem'}}>✓ Comparaison nationale</li>
                    <li style={{marginBottom: '0.2rem'}}>✓ Mise en avant auprès scouts</li>
                  </ul>
                </div>
              </div>

              <div style={{marginBottom: '1.5rem'}}>
                <div style={{
                  color: '#0F172A',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  fontSize: '1.05rem'
                }}>
                  Option 2 : Abonnement annuel
                </div>
                
                <div style={{marginBottom: '1rem'}}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{color: '#0F172A', fontWeight: '600', fontSize: '0.95rem'}}>Standard</span>
                    <span style={{color: '#14B8A6', fontSize: '1.25rem', fontWeight: '700'}}>3 €/mois</span>
                  </div>
                  <div style={{color: '#64748B', fontSize: '0.8rem', marginBottom: '0.3rem'}}>
                    36 €/an
                  </div>
                </div>

                <div style={{
                  padding: '0.75rem',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{color: '#0F172A', fontWeight: '600', fontSize: '0.95rem'}}>Premium</span>
                    <span style={{color: '#14B8A6', fontSize: '1.25rem', fontWeight: '700'}}>6,50 €/mois</span>
                  </div>
                  <div style={{color: '#64748B', fontSize: '0.8rem'}}>
                    79 €/an
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '1.5rem'
              }}>
                <a href="/contact" style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#14B8A6',
                  color: '#fff',
                  padding: '1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}>
                  Réserver un workshop
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Parents */}
        <div style={{marginBottom: '4rem'}}>
          <h2 style={{
            color: '#0F172A',
            fontSize: '2rem',
            marginBottom: '2rem',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Parents
          </h2>
          <div style={{
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            {/* Passeport Performance */}
            <div style={{
              background: '#ffffff',
              padding: '2.5rem',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{
                color: '#0F172A',
                fontSize: '1.75rem',
                marginBottom: '1rem',
                fontWeight: '700'
              }}>
                Passeport Performance
              </h3>
              <p style={{
                color: '#64748B',
                fontSize: '0.95rem',
                marginBottom: '1.5rem',
                lineHeight: '1.6'
              }}>
                Le profil longitudinal de votre enfant U11-U18
              </p>
              
              <div style={{marginBottom: '1.5rem'}}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{color: '#0F172A', fontWeight: '600'}}>Basique</span>
                  <span style={{color: '#14B8A6', fontSize: '1.3rem', fontWeight: '700'}}>Gratuit</span>
                </div>
                <ul style={{
                  color: '#475569',
                  fontSize: '0.9rem',
                  lineHeight: '1.8',
                  listStyle: 'none',
                  padding: 0,
                  margin: 0
                }}>
                  <li style={{marginBottom: '0.3rem'}}>✓ Profil public joueur</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Historique progression</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Métriques de base</li>
                </ul>
              </div>

              <div style={{
                padding: '1rem',
                background: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{color: '#0F172A', fontWeight: '600'}}>Premium</span>
                  <span style={{color: '#14B8A6', fontSize: '1.3rem', fontWeight: '700'}}>2,99 €/mois</span>
                </div>
                <ul style={{
                  color: '#475569',
                  fontSize: '0.9rem',
                  lineHeight: '1.8',
                  listStyle: 'none',
                  padding: 0,
                  margin: 0
                }}>
                  <li style={{marginBottom: '0.3rem'}}>✓ Tout Basique</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Export PDF pro</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Vidéothèque personnelle</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Comparaisons avancées</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ Mise en avant (clubs)</li>
                  <li style={{marginBottom: '0.3rem'}}>✓ RGPD conforme</li>
                </ul>
              </div>

              <div style={{
                marginTop: '1.5rem'
              }}>
                <a href="/auth/register" style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#14B8A6',
                  color: '#fff',
                  padding: '1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}>
                  Créer mon profil
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ / Info */}
        <div style={{
          marginTop: '4rem',
          padding: '2.5rem',
          background: '#F8FAFC',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          textAlign: 'center'
        }}>
          <h3 style={{
            color: '#0F172A',
            fontSize: '1.5rem',
            marginBottom: '1rem',
            fontWeight: '600'
          }}>
            Des questions sur nos tarifs ?
          </h3>
          <p style={{
            color: '#64748B',
            fontSize: '1.05rem',
            lineHeight: '1.7',
            marginBottom: '1.5rem',
            maxWidth: '600px',
            margin: '0 auto 1.5rem'
          }}>
            Notre équipe est disponible pour vous conseiller et vous proposer une solution adaptée à vos besoins spécifiques.
          </p>
          <a href="/contact" style={{
            display: 'inline-block',
            background: '#14B8A6',
            color: '#fff',
            padding: '1rem 2.5rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(20, 184, 166, 0.2)'
          }}>
            Contactez-nous
          </a>
        </div>
      </div>
    </section>
  );
}
