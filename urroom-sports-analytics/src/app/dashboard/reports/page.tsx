"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './ReportsPage.module.css';

interface Report {
  id: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  clubFit: string[];
  createdAt: string;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
    positions: string[];
    nationality: string;
  };
  author?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    if (search) {
      const filtered = reports.filter(r =>
        `${r.player.firstName} ${r.player.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        r.summary.toLowerCase().includes(search.toLowerCase()) ||
        r.author?.name.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredReports(filtered);
    } else {
      setFilteredReports(reports);
    }
  }, [search, reports]);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        setFilteredReports(data);
      }
    } catch (error) {
      console.error('Erreur fetch rapports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) return <div className={styles.loading}>Chargement...</div>;

  const totalReports = reports.length;
  const thisMonth = reports.filter(r => {
    const date = new Date(r.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Rapports</h1>
        <Link href="/dashboard/club" className={styles.backButton}>
          ← Retour
        </Link>
      </div>

      {/* Statistiques */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <svg className={styles.statIcon} width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className={styles.statLabel}>Total rapports</div>
          <div className={styles.statValue}>{totalReports}</div>
        </div>
        <div className={styles.statCard}>
          <svg className={styles.statIcon} width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className={styles.statLabel}>Ce mois-ci</div>
          <div className={styles.statValue}>{thisMonth}</div>
        </div>
      </div>

      {/* Filtres */}
      <div className={styles.filters}>
        <div className={styles.filtersHeader}>
          <h2 className={styles.filtersTitle}>Rechercher</h2>
        </div>
        <input
          type="text"
          placeholder="Rechercher par joueur, scout ou contenu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Liste des rapports */}
      <div className={styles.reportsGrid}>
        {filteredReports.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📋</div>
            <p className={styles.emptyText}>
              {search ? 'Aucun rapport ne correspond à votre recherche.' : 'Aucun rapport disponible.'}
            </p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className={styles.reportCard}>
              <div className={styles.reportHeader}>
                <img
                  src={report.player.photoUrl || '/cercle-bleu-utilisateur-blanc.png'}
                  alt={`${report.player.firstName} ${report.player.lastName}`}
                  className={styles.playerPhoto}
                />
                <div className={styles.reportInfo}>
                  <h3 className={styles.playerName}>
                    {report.player.firstName} {report.player.lastName}
                  </h3>
                  <div className={styles.reportMeta}>
                    <div className={styles.metaItem}>
                      <svg className={styles.metaIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="8" cy="8" r="2" fill="currentColor"/>
                      </svg>
                      {report.player.positions.join(', ')}
                    </div>
                    <div className={styles.metaItem}>
                      <svg className={styles.metaIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 2V14M3 2L12 5L3 8V2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {report.player.nationality}
                    </div>
                    <div className={styles.metaItem}>
                      <svg className={styles.metaIcon} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 2v6l4 2" />
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      </svg>
                      {formatDate(report.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.reportContent}>
                <div className={styles.summaryLabel}>Résumé</div>
                <p className={styles.summary}>{report.summary}</p>

                <div className={styles.tags}>
                  {report.strengths.length > 0 && (
                    <div className={styles.tagSection}>
                      <span className={styles.tagLabel}>✓ Forces</span>
                      <div className={styles.tagList}>
                        {report.strengths.map((strength, idx) => (
                          <span key={idx} className={`${styles.tag} ${styles.strengthTag}`}>
                            {strength}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.weaknesses.length > 0 && (
                    <div className={styles.tagSection}>
                      <span className={styles.tagLabel}>⚠ Faiblesses</span>
                      <div className={styles.tagList}>
                        {report.weaknesses.map((weakness, idx) => (
                          <span key={idx} className={`${styles.tag} ${styles.weaknessTag}`}>
                            {weakness}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.clubFit.length > 0 && (
                    <div className={styles.tagSection}>
                      <span className={styles.tagLabel}>🎯 Adéquation club</span>
                      <div className={styles.tagList}>
                        {report.clubFit.map((fit, idx) => (
                          <span key={idx} className={`${styles.tag} ${styles.clubFitTag}`}>
                            {fit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.reportFooter}>
                <div className={styles.author}>
                  Rédigé par <span className={styles.authorName}>{report.author?.name || 'Scout'}</span>
                </div>
                <Link href={`/dashboard/reports/${report.id}`}>
                  <button className={styles.viewButton}>Voir détails</button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
