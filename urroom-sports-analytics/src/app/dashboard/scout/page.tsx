"use client";
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './ScoutDashboard.module.css';

interface DashboardStats {
  reportsCreated: number;
  playersFollowed: number;
  recentActivity: {
    id: string;
    type: 'report' | 'follow';
    playerName: string;
    createdAt: string;
  }[];
  followedPlayers: {
    id: string;
    firstName: string;
    lastName: string;
    positions: string[];
    nationality: string;
    photoUrl?: string;
  }[];
}

export default function ScoutDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    if (session?.user?.role !== 'SCOUT' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard/overview');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/scouts/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = (playerId: string) => {
    router.push(`/dashboard/reports/new?playerId=${playerId}`);
  };

  const handleViewFollowing = () => {
    router.push('/dashboard/scout/following');
  };

  const handleSearchPlayers = () => {
    router.push('/dashboard/players/search');
  };

  if (loading) return <div className={styles.loading}>Chargement...</div>;
  if (!stats) return <div className={styles.error}>Erreur lors du chargement des données</div>;

  if (loading) return <div className={styles.loading}>Chargement...</div>;
  if (!stats) return <div className={styles.error}>Erreur lors du chargement des données</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Tableau de bord Scout</h1>
        <p className={styles.welcome}>Bienvenue, {session?.user?.name}</p>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <h3>{stats.reportsCreated}</h3>
            <p>Rapports créés</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <h3>{stats.playersFollowed}</h3>
            <p>Joueurs suivis</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <h2>Actions rapides</h2>
        <div className={styles.actionsGrid}>
          <button className={styles.actionBtn} onClick={handleSearchPlayers}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Rechercher des joueurs
          </button>
          <button className={styles.actionBtn} onClick={handleViewFollowing}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Mes joueurs suivis
          </button>
        </div>
      </div>

      {/* Followed Players */}
      {stats.followedPlayers.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Joueurs suivis récemment</h2>
            <button className={styles.viewAllBtn} onClick={handleViewFollowing}>
              Voir tout
            </button>
          </div>
          <div className={styles.playersGrid}>
            {stats.followedPlayers.slice(0, 4).map((player) => (
              <div key={player.id} className={styles.playerCard}>
                <Link href={`/dashboard/players/${player.id}/view`} className={styles.playerCardLink}>
                  <div className={styles.playerPhoto}>
                    {player.photoUrl ? (
                      <img src={player.photoUrl} alt={`${player.firstName} ${player.lastName}`} />
                    ) : (
                      <div className={styles.photoPlaceholder}>
                        {player.firstName[0]}{player.lastName[0]}
                      </div>
                    )}
                  </div>
                  <div className={styles.playerInfo}>
                    <h3>{player.firstName} {player.lastName}</h3>
                    <p className={styles.playerMeta}>
                      <span className={styles.positions}>
                        {player.positions.join(', ')}
                      </span>
                      <span className={styles.nationality}>
                        {player.nationality}
                      </span>
                    </p>
                  </div>
                </Link>
                <button
                  className={styles.createReportBtn}
                  onClick={() => handleCreateReport(player.id)}
                >
                  Créer un rapport
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {stats.recentActivity.length > 0 && (
        <div className={styles.section}>
          <h2>Activité récente</h2>
          <div className={styles.activityList}>
            {stats.recentActivity.map((activity) => (
              <div key={activity.id} className={styles.activityItem}>
                <div className={styles.activityIcon}>
                  {activity.type === 'report' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  )}
                </div>
                <div className={styles.activityContent}>
                  <p>
                    {activity.type === 'report' ? (
                      <>Rapport créé pour <strong>{activity.playerName}</strong></>
                    ) : (
                      <>Joueur suivi : <strong>{activity.playerName}</strong></>
                    )}
                  </p>
                  <span className={styles.activityDate}>
                    {new Date(activity.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
