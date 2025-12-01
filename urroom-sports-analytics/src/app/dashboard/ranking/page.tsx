"use client";
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './RankingPage.module.css';

interface RankedPlayer {
  id: string;
  rank: number;
  firstName: string;
  lastName: string;
  nationality: string;
  positions: string[];
  uroomScore: number;
  age: number;
  photoUrl?: string | null;
}

export default function RankingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [players, setPlayers] = useState<RankedPlayer[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<RankedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [session, status, router]);

  useEffect(() => {
    fetchRankings();
  }, []);

  useEffect(() => {
    filterPlayers();
  }, [searchTerm, positionFilter, players]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ranking/all');
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players);
        setFilteredPlayers(data.players);
        setCurrentUserRank(data.currentUserRank);
      }
    } catch (error) {
      console.error('Erreur fetch rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPlayers = () => {
    let filtered = [...players];

    if (searchTerm) {
      filtered = filtered.filter(player => 
        `${player.firstName} ${player.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.nationality.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (positionFilter) {
      filtered = filtered.filter(player => 
        player.positions.some(pos => pos.includes(positionFilter))
      );
    }

    setFilteredPlayers(filtered);
  };

  const getPositionsList = () => {
    const positions = new Set<string>();
    players.forEach(player => {
      player.positions.forEach(pos => positions.add(pos));
    });
    return Array.from(positions).sort();
  };

  const getRankClass = (rank: number) => {
    if (rank === 1) return styles.rank1;
    if (rank === 2) return styles.rank2;
    if (rank === 3) return styles.rank3;
    if (rank <= 10) return styles.rankTop10;
    return '';
  };

  if (loading) return <div className={styles.loading}>Chargement du classement...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Classement Uroom Sports</h1>
          <p className={styles.subtitle}>
            {players.length} joueurs classés selon leurs performances techniques
          </p>
        </div>
        {currentUserRank && (
          <div className={styles.userRankCard}>
            <div className={styles.userRankLabel}>Votre classement</div>
            <div className={styles.userRankValue}>{currentUserRank}{currentUserRank === 1 ? 'er' : 'ème'}</div>
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Rechercher un joueur ou pays..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">Toutes les positions</option>
          {getPositionsList().map(position => (
            <option key={position} value={position}>{position}</option>
          ))}
        </select>

        {(searchTerm || positionFilter) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setPositionFilter('');
            }}
            className={styles.clearButton}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Résultats */}
      <div className={styles.resultsInfo}>
        {filteredPlayers.length !== players.length && (
          <span>{filteredPlayers.length} résultat{filteredPlayers.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Tableau */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.rankColumn}>Rang</th>
              <th>Joueur</th>
              <th>Âge</th>
              <th>Nationalité</th>
              <th>Position(s)</th>
              <th className={styles.scoreColumn}>Score</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => (
              <tr 
                key={player.id} 
                className={`${styles.tableRow} ${getRankClass(player.rank)} ${
                  currentUserRank === player.rank ? styles.currentUser : ''
                }`}
                onClick={() => router.push(`/dashboard/ranking/${player.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <td className={styles.rankCell}>
                  <div className={styles.rankBadge}>
                    {player.rank === 1 && <span className={styles.medal}>🥇</span>}
                    {player.rank === 2 && <span className={styles.medal}>🥈</span>}
                    {player.rank === 3 && <span className={styles.medal}>🥉</span>}
                    <span className={styles.rankNumber}>{player.rank}</span>
                  </div>
                </td>
                <td className={styles.nameCell}>
                  <div className={styles.playerInfo}>
                    <div className={styles.playerPhotoSmall}>
                      <img 
                        src={player.photoUrl || '/cercle-bleu-utilisateur-blanc.png'} 
                        alt={`${player.firstName} ${player.lastName}`}
                        className={styles.photoImageSmall}
                      />
                    </div>
                    <div className={styles.playerName}>
                      {player.firstName} {player.lastName}
                    </div>
                  </div>
                </td>
                <td>{player.age} ans</td>
                <td>{player.nationality}</td>
                <td>
                  <div className={styles.positions}>
                    {player.positions.slice(0, 2).map((pos, idx) => (
                      <span key={idx} className={styles.positionTag}>{pos}</span>
                    ))}
                    {player.positions.length > 2 && (
                      <span className={styles.positionMore}>+{player.positions.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className={styles.scoreCell}>
                  <div className={styles.scoreValue}>{player.uroomScore.toFixed(1)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPlayers.length === 0 && (
          <div className={styles.emptyState}>
            <h3>Aucun joueur trouvé</h3>
            <p>Essayez de modifier vos filtres de recherche</p>
          </div>
        )}
      </div>
    </div>
  );
}
