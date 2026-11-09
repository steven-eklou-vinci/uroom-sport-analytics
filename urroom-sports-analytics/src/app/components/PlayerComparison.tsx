import React from 'react';

interface Comparison {
  id: string;
  matchScore: number;
  similarities: string[];
  differences: string[];
  technicalMatch: number;
  physicalMatch: number;
  styleMatch: number;
  playerAge: number;
  proPlayerAge: number;
  confidence: number;
  proPlayer: {
    name: string;
    currentClub?: string;
    nationality: string;
    positions: string[];
    photoUrl?: string;
    currentLeague: string;
    marketValue?: number;
    playingStyle: string[];
  };
}

interface PlayerComparisonProps {
  comparisons: Comparison[];
  loading?: boolean;
  teamComparisonRows?: TeamComparisonRow[];
  loadingTeamComparison?: boolean;
  teamComparisonError?: string | null;
  yearsAhead?: number;
  currentPlayerName?: string;
}

interface TeamComparisonRow {
  player_id: string;
  ml_score: number;
  verdict: string;
  multiplier: number;
  age: number;
  avg_current: number;
  avg_future: number;
  gain_total: number;
}

export default function PlayerComparison({
  comparisons,
  loading,
  teamComparisonRows = [],
  loadingTeamComparison = false,
  teamComparisonError = null,
  yearsAhead = 4,
  currentPlayerName
}: PlayerComparisonProps) {
  const renderTeamTable = () => (
    <div style={styles.teamTableCard}>
      <div style={styles.teamTableHeader}>
        <h3 style={styles.teamTableTitle}>Projection IA comparative (+{yearsAhead} ans)</h3>
        <span style={styles.teamTableTag}>Nouveau modele</span>
      </div>

      {loadingTeamComparison && (
        <p style={styles.teamTableHint}>Calcul du tableau comparatif en cours...</p>
      )}

      {!loadingTeamComparison && teamComparisonError && (
        <p style={styles.teamTableError}>{teamComparisonError}</p>
      )}

      {!loadingTeamComparison && !teamComparisonError && teamComparisonRows.length > 0 && (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Joueur</th>
                <th style={styles.th}>Statut</th>
                <th style={styles.thRight}>ML (%)</th>
                <th style={styles.thRight}>Mult.</th>
                <th style={styles.thRight}>Age</th>
                <th style={styles.thRight}>Moy. actuelle</th>
                <th style={styles.thRight}>Moy. +{yearsAhead} ans</th>
                <th style={styles.thRight}>Gain total</th>
              </tr>
            </thead>
            <tbody>
              {teamComparisonRows.map((row, idx) => {
                const isMainPlayer = currentPlayerName
                  ? row.player_id.trim().toLowerCase() === currentPlayerName.trim().toLowerCase()
                  : idx === 0;
                const gainColor = row.gain_total >= 0 ? '#10b981' : '#ef4444';
                return (
                  <tr key={`${row.player_id}-${idx}`} style={isMainPlayer ? styles.mainPlayerRow : undefined}>
                    <td style={styles.tdPlayer}>{row.player_id}</td>
                    <td style={styles.td}>{row.verdict}</td>
                    <td style={styles.tdRight}>{row.ml_score.toFixed(1)}</td>
                    <td style={styles.tdRight}>{row.multiplier.toFixed(2)}</td>
                    <td style={styles.tdRight}>{row.age.toFixed(1)}</td>
                    <td style={styles.tdRight}>{row.avg_current.toFixed(0)}</td>
                    <td style={styles.tdRight}>{row.avg_future.toFixed(0)}</td>
                    <td style={{ ...styles.tdRight, color: gainColor, fontWeight: 700 }}>
                      {row.gain_total >= 0 ? '+' : ''}{row.gain_total.toFixed(0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loadingTeamComparison && !teamComparisonError && teamComparisonRows.length === 0 && (
        <p style={styles.teamTableHint}>Le tableau sera disponible des que les donnees IA seront pretes.</p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={styles.container}>
        {renderTeamTable()}
        <div style={styles.header}>
          <h2 style={styles.title}>Profils Similaires (IA)</h2>
          <p style={styles.subtitle}>Analyse prédictive en cours...</p>
        </div>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={{ color: '#64748B', marginTop: '1rem' }}>
            Analyse de milliers de profils professionnels...
          </p>
        </div>
      </div>
    );
  }

  if (!comparisons || comparisons.length === 0) {
    return (
      <div style={styles.container}>
        {renderTeamTable()}
        <div style={styles.header}>
          <h2 style={styles.title}>Profils Similaires (IA)</h2>
          <p style={styles.subtitle}>Génération de comparaisons en cours...</p>
        </div>
        <div style={styles.emptyState}>
          <svg  
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#64748B"
            strokeWidth="1.5"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p style={{ color: '#64748B', marginTop: '1rem' }}>
            L'analyse peut prendre quelques secondes. Rechargez la page si les comparaisons n'apparaissent pas.
          </p>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            L'IA analyse le profil du joueur et le compare à des milliers de joueurs professionnels...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {renderTeamTable()}

      <div style={styles.header}>
        <div>   
          <h2 style={styles.title}>Profils Similaires (IA)</h2>
          <p style={styles.subtitle}>
            Comparaison avec des joueurs professionnels ayant un profil similaire au même âge
          </p>
        </div>
        <div style={styles.aiBadge}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span>Analyse IA</span>
        </div>
      </div>

      <div style={styles.grid}>
        {comparisons.map((comparison, index) => (
          <div
            key={comparison.id}
            style={{
              ...styles.card,
              borderColor: index === 0 ? '#14b8a6' : '#334155'
            }}
          >
            {/* Badge de rang */}
            {index === 0 && (
              <div style={styles.topMatchBadge}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Top Match
              </div>
            )}

            {/* Header avec photo et infos de base */}
            <div style={styles.cardHeader}>
              <div style={styles.playerPhoto}>
                {comparison.proPlayer.photoUrl ? (
                  <img
                    src={comparison.proPlayer.photoUrl}
                    alt={comparison.proPlayer.name}
                    style={styles.photoImg}
                  />
                ) : (
                  <div style={styles.photoPlaceholder}>
                    {comparison.proPlayer.name.charAt(0)}
                  </div>
                )}
              </div>
              <div style={styles.playerInfo}>
                <h3 style={styles.playerName}>{comparison.proPlayer.name}</h3>
                <p style={styles.playerMeta}>
                  {comparison.proPlayer.positions.join(', ')} • {comparison.proPlayer.nationality}
                </p>
                {comparison.proPlayer.currentClub && (
                  <p style={styles.currentClub}>
                    {comparison.proPlayer.currentClub}
                    {comparison.proPlayer.currentLeague && ` (${comparison.proPlayer.currentLeague})`}
                  </p>
                )}
              </div>
              <div style={styles.matchScoreBadge}>
                <div style={styles.matchScoreValue}>{comparison.matchScore}%</div>
                <div style={styles.matchScoreLabel}>Match</div>
              </div>
            </div>

            {/* Valeur marchande si disponible */}
            {comparison.proPlayer.marketValue && (
              <div style={styles.marketValue}>
                Valeur actuelle: {comparison.proPlayer.marketValue}M€
              </div>
            )}

            {/* Barres de stats comparatives */}
            <div style={styles.statsSection}>
              <div style={styles.statBar}>
                <span style={styles.statLabel}>Technique</span>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${comparison.technicalMatch}%`,
                      background: getMatchColor(comparison.technicalMatch)
                    }}
                  />
                </div>
                <span style={styles.statValue}>{comparison.technicalMatch.toFixed(0)}%</span>
              </div>

              <div style={styles.statBar}>
                <span style={styles.statLabel}>Physique</span>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${comparison.physicalMatch}%`,
                      background: getMatchColor(comparison.physicalMatch)
                    }}
                  />
                </div>
                <span style={styles.statValue}>{comparison.physicalMatch.toFixed(0)}%</span>
              </div>

              <div style={styles.statBar}>
                <span style={styles.statLabel}>Style de jeu</span>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${comparison.styleMatch}%`,
                      background: getMatchColor(comparison.styleMatch)
                    }}
                  />
                </div>
                <span style={styles.statValue}>{comparison.styleMatch.toFixed(0)}%</span>
              </div>
            </div>

            {/* Similarités */}
            {comparison.similarities.length > 0 && (
              <div style={styles.section}>
                <h4 style={styles.sectionTitle}>Points communs</h4>
                <div style={styles.tagList}>
                  {comparison.similarities.map((similarity, i) => (
                    <span key={i} style={styles.similarityTag}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {similarity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Style de jeu du pro */}
            {comparison.proPlayer.playingStyle.length > 0 && (
              <div style={styles.section}>
                <h4 style={styles.sectionTitle}>Caractéristiques</h4>
                <div style={styles.tagList}>
                  {comparison.proPlayer.playingStyle.map((style, i) => (
                    <span key={i} style={styles.styleTag}>
                      {style}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Footer avec âge de comparaison et confiance */}
            <div style={styles.cardFooter}>
              <span style={styles.footerText}>
                Comparaison à {comparison.proPlayerAge} ans
              </span>
              <span style={styles.confidenceBadge}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Confiance: {(comparison.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Note explicative */}
      <div style={styles.notice}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p>
          Cette analyse IA compare les performances actuelles du joueur avec celles de professionnels
          au même âge. Les profils affichés représentent les trajectoires de carrière les plus probables
          statistiquement.
          {comparisons.some(c => c.confidence < 0.5) && (
            <span style={{ display: 'block', marginTop: '0.5rem', color: '#f59e0b' }}>
              ⚠️ Certaines comparaisons utilisent des données estimées (manque d'évaluations). 
              Pour une analyse plus précise, ajoutez des évaluations techniques au profil du joueur.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function getMatchColor(score: number): string {
  if (score >= 80) return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  if (score >= 60) return 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)';
  if (score >= 40) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: '#0f172a',
    borderRadius: '16px',
    padding: '2rem',
    marginTop: '2rem'
  },
  teamTableCard: {
    background: '#111c31',
    border: '1px solid #22324e',
    borderRadius: '12px',
    padding: '1rem 1rem 0.75rem',
    marginBottom: '1.25rem'
  },
  teamTableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem'
  },
  teamTableTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#e2e8f0',
    margin: 0
  },
  teamTableTag: {
    fontSize: '0.75rem',
    color: '#0f172a',
    background: '#22d3ee',
    padding: '0.25rem 0.5rem',
    borderRadius: '999px',
    fontWeight: 700
  },
  teamTableHint: {
    margin: '0.2rem 0 0.9rem',
    color: '#94a3b8',
    fontSize: '0.85rem'
  },
  teamTableError: {
    margin: '0.2rem 0 0.9rem',
    color: '#f87171',
    fontSize: '0.85rem'
  },
  tableWrapper: {
    overflowX: 'auto',
    borderTop: '1px solid #273447'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '760px'
  },
  th: {
    textAlign: 'left',
    color: '#94a3b8',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '0.7rem 0.5rem',
    letterSpacing: '0.02em',
    borderBottom: '1px solid #273447'
  },
  thRight: {
    textAlign: 'right',
    color: '#94a3b8',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '0.7rem 0.5rem',
    letterSpacing: '0.02em',
    borderBottom: '1px solid #273447'
  },
  td: {
    color: '#cbd5e1',
    fontSize: '0.85rem',
    padding: '0.7rem 0.5rem',
    borderBottom: '1px solid #1f2d43'
  },
  tdPlayer: {
    color: '#e2e8f0',
    fontWeight: 700,
    fontSize: '0.85rem',
    padding: '0.7rem 0.5rem',
    borderBottom: '1px solid #1f2d43'
  },
  tdRight: {
    color: '#cbd5e1',
    fontSize: '0.85rem',
    padding: '0.7rem 0.5rem',
    borderBottom: '1px solid #1f2d43',
    textAlign: 'right'
  },
  mainPlayerRow: {
    background: 'rgba(20, 184, 166, 0.08)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#f1f5f9',
    margin: 0,
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    margin: 0
  },
  aiBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#ffffff'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  card: {
    background: '#1e293b',
    border: '2px solid',
    borderRadius: '12px',
    padding: '1.5rem',
    position: 'relative',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  topMatchBadge: {
    position: 'absolute',
    top: '-12px',
    right: '1rem',
    background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    color: '#ffffff',
    padding: '0.25rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    boxShadow: '0 4px 12px rgba(20, 184, 166, 0.4)'
  },
  cardHeader: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
    alignItems: 'flex-start'
  },
  playerPhoto: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    border: '2px solid #334155'
  },
  photoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
    color: '#94a3b8',
    fontSize: '1.5rem',
    fontWeight: '700'
  },
  playerInfo: {
    flex: 1,
    minWidth: 0
  },
  playerName: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#f1f5f9',
    margin: 0,
    marginBottom: '0.25rem'
  },
  playerMeta: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    margin: 0,
    marginBottom: '0.25rem'
  },
  currentClub: {
    fontSize: '0.75rem',
    color: '#64748b',
    margin: 0
  },
  matchScoreBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    padding: '0.75rem',
    borderRadius: '8px',
    minWidth: '60px'
  },
  matchScoreValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ffffff'
  },
  matchScoreLabel: {
    fontSize: '0.75rem',
    color: '#ffffff',
    opacity: 0.9
  },
  marketValue: {
    background: '#334155',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    color: '#10b981',
    fontWeight: '600',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  statsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  statBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    minWidth: '80px'
  },
  progressBar: {
    flex: 1,
    height: '8px',
    background: '#334155',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  statValue: {
    fontSize: '0.875rem',
    color: '#f1f5f9',
    fontWeight: '600',
    minWidth: '40px',
    textAlign: 'right'
  },
  section: {
    marginBottom: '1rem'
  },
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#cbd5e1',
    margin: 0,
    marginBottom: '0.5rem'
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  similarityTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.375rem 0.75rem',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '6px',
    fontSize: '0.75rem',
    color: '#10b981'
  },
  styleTag: {
    padding: '0.375rem 0.75rem',
    background: '#334155',
    borderRadius: '6px',
    fontSize: '0.75rem',
    color: '#cbd5e1'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '1rem',
    borderTop: '1px solid #334155',
    marginTop: '1rem'
  },
  footerText: {
    fontSize: '0.75rem',
    color: '#64748b'
  },
  confidenceBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.75rem',
    color: '#14b8a6',
    fontWeight: '600'
  },
  notice: {
    display: 'flex',
    gap: '0.75rem',
    padding: '1rem',
    background: 'rgba(20, 184, 166, 0.1)',
    border: '1px solid rgba(20, 184, 166, 0.2)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#94a3b8',
    lineHeight: '1.5'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    minHeight: '300px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #334155',
    borderTop: '4px solid #14b8a6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    minHeight: '300px'
  }
};
