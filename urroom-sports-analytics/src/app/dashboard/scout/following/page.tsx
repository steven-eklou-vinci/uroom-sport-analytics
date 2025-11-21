'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './FollowingPage.module.css';

interface FollowedPlayer {
  id: string;
  playerId: string;
  notes: string | null;
  createdAt: string;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    positions: string[];
    nationality: string;
    photoUrl?: string;
    birthDate: string;
    foot: string;
  };
  followedByOtherScouts: boolean;
  otherScoutsCount: number;
}

export default function FollowingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [followedPlayers, setFollowedPlayers] = useState<FollowedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchFollowedPlayers();
    }
  }, [session]);

  const fetchFollowedPlayers = async () => {
    try {
      const response = await fetch('/api/players/following');
      if (response.ok) {
        const data = await response.json();
        setFollowedPlayers(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des joueurs suivis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (followId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir ne plus suivre ce joueur ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/players/follow/${followId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setFollowedPlayers(followedPlayers.filter((f) => f.id !== followId));
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleCreateReport = (playerId: string) => {
    router.push(`/dashboard/reports/new?playerId=${playerId}`);
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const filteredPlayers = followedPlayers.filter((follow) => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${follow.player.firstName} ${follow.player.lastName}`.toLowerCase();
    return fullName.includes(searchLower) || 
           follow.player.positions.some((p) => p.toLowerCase().includes(searchLower)) ||
           follow.player.nationality.toLowerCase().includes(searchLower);
  });

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Joueurs suivis</h1>
          <p className={styles.subtitle}>{followedPlayers.length} joueur{followedPlayers.length > 1 ? 's' : ''} suivi{followedPlayers.length > 1 ? 's' : ''}</p>
        </div>
        <button className={styles.backBtn} onClick={() => router.push('/dashboard/scout')}>
          ← Retour au dashboard
        </button>
      </div>

      {followedPlayers.length > 0 && (
        <div className={styles.searchBar}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom, position, nationalité..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {filteredPlayers.length === 0 ? (
        <div className={styles.emptyState}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h3>Aucun joueur suivi</h3>
          <p>Commencez à suivre des joueurs pour les retrouver ici</p>
          <button className={styles.searchPlayersBtn} onClick={() => router.push('/dashboard/players/search')}>
            Rechercher des joueurs
          </button>
        </div>
      ) : (
        <div className={styles.playersGrid}>
          {filteredPlayers.map((follow) => (
            <div key={follow.id} className={styles.playerCard}>
              {follow.followedByOtherScouts && (
                <div className={styles.badge}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Suivi par {follow.otherScoutsCount} autre{follow.otherScoutsCount > 1 ? 's' : ''} scout{follow.otherScoutsCount > 1 ? 's' : ''}
                </div>
              )}

              <Link href={`/dashboard/players/${follow.playerId}/view`} className={styles.playerLink}>
                <div className={styles.playerHeader}>
                  <div className={styles.playerPhoto}>
                    {follow.player.photoUrl ? (
                      <img src={follow.player.photoUrl} alt={`${follow.player.firstName} ${follow.player.lastName}`} />
                    ) : (
                      <div className={styles.photoPlaceholder}>
                        {follow.player.firstName[0]}{follow.player.lastName[0]}
                      </div>
                    )}
                  </div>
                  <div className={styles.playerInfo}>
                    <h3>{follow.player.firstName} {follow.player.lastName}</h3>
                    <div className={styles.playerMeta}>
                      <span className={styles.age}>{calculateAge(follow.player.birthDate)} ans</span>
                      <span className={styles.separator}>•</span>
                      <span className={styles.nationality}>{follow.player.nationality}</span>
                    </div>
                  </div>
                </div>
              </Link>

              <div className={styles.playerDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Position{follow.player.positions.length > 1 ? 's' : ''}</span>
                  <span className={styles.value}>{follow.player.positions.join(', ')}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Pied fort</span>
                  <span className={styles.value}>{follow.player.foot}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Suivi depuis</span>
                  <span className={styles.value}>
                    {new Date(follow.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {follow.notes && (
                <div className={styles.notes}>
                  <p className={styles.notesLabel}>Notes :</p>
                  <p className={styles.notesContent}>{follow.notes}</p>
                </div>
              )}

              <div className={styles.actions}>
                <button
                  className={styles.createReportBtn}
                  onClick={() => handleCreateReport(follow.player.id)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Créer un rapport
                </button>
                <button
                  className={styles.unfollowBtn}
                  onClick={() => handleUnfollow(follow.id)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Ne plus suivre
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
