"use client";
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './PlayerDashboard.module.css';

interface PlayerStats {
  uroomRank: number | null;
  uroomScore: number;
  totalPlayers: number;
  profileViews: number;
  reportsReceived: number;
  trialRequests: number;
  followersCount: number;
  playerName?: string;
  photoUrl?: string;
}

interface Report {
  id: string;
  authorName: string;
  summary: string;
  createdAt: string;
}

export default function PlayerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<PlayerStats>({
    uroomRank: null,
    uroomScore: 0,
    totalPlayers: 0,
    profileViews: 0,
    reportsReceived: 0,
    trialRequests: 0,
    followersCount: 0
  });
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    if (session?.user?.role !== 'PLAYER' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard/overview');
    }
  }, [session, status, router]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch player stats
      const statsRes = await fetch('/api/player/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        console.log('📊 Stats reçues:', statsData);
        setStats(statsData);
      } else {
        console.error('❌ Erreur stats:', await statsRes.text());
      }

      // Fetch recent reports
      const reportsRes = await fetch('/api/player/reports');
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setRecentReports(reportsData.slice(0, 3));
      }
    } catch (error) {
      console.error('Erreur fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankDisplay = () => {
    if (!stats.uroomRank || stats.uroomRank === 0) return '-';
    const suffix = stats.uroomRank === 1 ? 'er' : 'ème';
    return `${stats.uroomRank}${suffix}`;
  };

  const getPercentile = () => {
    if (!stats.uroomRank || !stats.totalPlayers) return 0;
    return Math.round((1 - stats.uroomRank / stats.totalPlayers) * 100);
  };

  if (loading) return <div className={styles.loading}>Chargement...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.playerPhoto}>
            <img 
              src={stats.photoUrl || '/cercle-bleu-utilisateur-blanc.png'} 
              alt="Photo du joueur"
              className={styles.photoImage}
            />
          </div>
          <div>
            <h1 className={styles.title}>Mon Dashboard</h1>
            {stats.playerName && (
              <p className={styles.playerNameText}>{stats.playerName}</p>
            )}
          </div>
        </div>
        <Link href="/dashboard/ranking" style={{ textDecoration: 'none' }}>
          <div className={styles.rankBadge}>
            <span className={styles.rankLabel}>Classement Uroom:</span>
            <span className={styles.rankValue}>{getRankDisplay()}</span>
          </div>
        </Link>
      </div>

      {/* KPIs */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Classement Uroom</div>
            <div className={styles.statValue}>{getRankDisplay()}</div>
            <div className={styles.statSubtext}>
              {stats.uroomRank ? `Top ${getPercentile()}%` : 'Complétez votre profil'}
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Vues de profil</div>
            <div className={styles.statValue}>{stats.profileViews}</div>
            <div className={styles.statSubtext}>Scouts & clubs</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Rapports reçus</div>
            <div className={styles.statValue}>{stats.reportsReceived}</div>
            <div className={styles.statSubtext}>Évaluations scouts</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>Demandes d'essai</div>
            <div className={styles.statValue}>{stats.trialRequests}</div>
            <div className={styles.statSubtext}>De clubs intéressés</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <Link href="/dashboard/ranking" className={styles.actionButton}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Voir le classement</span>
        </Link>
        <Link href="/dashboard/player/videos" className={styles.actionButton}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M10 9L15 12L10 15V9Z" fill="currentColor"/>
          </svg>
          <span>Mes vidéos</span>
        </Link>
        <Link href="/dashboard/profile" className={styles.actionButton}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
            <path d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Modifier mon profil</span>
        </Link>
      </div>

      {/* Score Progress */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Mon Score Uroom</h2>
        <div className={styles.scoreContainer}>
          <div className={styles.scoreCircle}>
            <svg viewBox="0 0 200 200" className={styles.scoreSvg}>
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="rgba(20, 184, 166, 0.2)"
                strokeWidth="12"
              />
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#14B8A6"
                strokeWidth="12"
                strokeDasharray={`${stats.uroomScore * 5.65} 565`}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div className={styles.scoreText}>
              <div className={styles.scoreNumber}>{Math.round(stats.uroomScore)}</div>
              <div className={styles.scoreLabel}>/ 100</div>
            </div>
          </div>
          <div className={styles.scoreInfo}>
            <h3 className={styles.scoreTitle}>Votre Score de Performance</h3>
            <p className={styles.scoreDescription}>
              Votre score Uroom est la moyenne de toutes vos évaluations techniques réalisées par les scouts professionnels.
            </p>
            <ul className={styles.scoreTips}>
              <li>✓ Participez à des évaluations avec des scouts</li>
              <li>✓ Améliorez vos performances techniques</li>
              <li>✓ Travaillez régulièrement vos points faibles</li>
              <li>✓ Montrez votre progression constante</li>
            </ul>
            <Link href="/dashboard/profile">
              <button className={styles.improveButton}>Voir mon profil</button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Mes derniers rapports</h2>
          {recentReports.length > 0 && (
            <Link href="/dashboard/reports" className={styles.viewAllButton}>
              Voir tous mes rapports →
            </Link>
          )}
        </div>

        {recentReports.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>Aucun rapport pour le moment</h3>
            <p className={styles.emptyText}>
              Les scouts pourront créer des rapports après vous avoir évalué en match ou à l'entraînement.
            </p>
          </div>
        ) : (
          <div className={styles.reportsGrid}>
            {recentReports.map((report) => (
              <div key={report.id} className={styles.reportCard}>
                <div className={styles.reportHeader}>
                  <div>
                    <div className={styles.reportAuthor}>Par {report.authorName}</div>
                    <div className={styles.reportDate}>
                      {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <Link href={`/dashboard/reports/${report.id}`}>
                    <button className={styles.viewReportButton}>Voir →</button>
                  </Link>
                </div>
                <p className={styles.reportSummary}>
                  {report.summary.substring(0, 150)}...
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions rapides */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Actions rapides</h2>
        <div className={styles.actionsGrid}>
          <Link href="/dashboard/profile">
            <button className={styles.actionButton}>
              <span>Modifier mon profil</span>
            </button>
          </Link>
          <Link href="/dashboard/trials">
            <button className={styles.actionButton}>
              <span>Mes demandes d'essai</span>
            </button>
          </Link>
          <Link href="/dashboard/reports">
            <button className={styles.actionButton}>
              <span>Tous mes rapports</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
