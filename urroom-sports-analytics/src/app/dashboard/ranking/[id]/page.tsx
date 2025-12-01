"use client";
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './PlayerDetailPage.module.css';

interface PlayerDetail {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  birthDate: string;
  age: number;
  nationality: string;
  positions: string[];
  foot: string;
  heightCm: number;
  weightKg: number;
  uroomScore: number;
  uroomRank: number;
  videoUrls: string[];
  metrics: {
    [key: string]: number;
  };
}

export default function PlayerDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const playerId = params?.id as string;
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (playerId) {
      fetchPlayerDetail();
    }
  }, [playerId]);

  const fetchPlayerDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/player/${playerId}`);
      if (res.ok) {
        const data = await res.json();
        setPlayer(data);
      } else {
        console.error('Erreur lors de la récupération du joueur');
      }
    } catch (error) {
      console.error('Erreur fetch player detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderRadarChart = () => {
    if (!player || Object.keys(player.metrics).length === 0) {
      return (
        <div className={styles.noMetrics}>
          <p>Aucune métrique disponible pour ce joueur</p>
        </div>
      );
    }

    const metrics = Object.entries(player.metrics);
    const size = 500;
    const center = size / 2;
    const radius = size / 2 - 90;
    const angleStep = (2 * Math.PI) / metrics.length;

    // Calculate points for the polygon
    const points = metrics.map(([_, value], index) => {
      const angle = index * angleStep - Math.PI / 2;
      const distance = (value / 100) * radius;
      const x = center + distance * Math.cos(angle);
      const y = center + distance * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className={styles.radarContainer}>
        <svg width={size} height={size} className={styles.radarSvg}>
          {/* Background circles */}
          {[20, 40, 60, 80, 100].map((percent) => (
            <circle
              key={percent}
              cx={center}
              cy={center}
              r={(percent / 100) * radius}
              fill="none"
              stroke="rgba(20, 184, 166, 0.1)"
              strokeWidth="1"
            />
          ))}

          {/* Axes */}
          {metrics.map(([_, __], index) => {
            const angle = index * angleStep - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            return (
              <line
                key={index}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="rgba(20, 184, 166, 0.2)"
                strokeWidth="1"
              />
            );
          })}

          {/* Data polygon */}
          <polygon
            points={points}
            fill="rgba(20, 184, 166, 0.3)"
            stroke="#14B8A6"
            strokeWidth="2"
          />

          {/* Labels */}
          {metrics.map(([key, value], index) => {
            const angle = index * angleStep - Math.PI / 2;
            const labelDistance = radius + 60;
            const x = center + labelDistance * Math.cos(angle);
            const y = center + labelDistance * Math.sin(angle);
            
            // Ajuster l'ancrage horizontal selon la position
            let anchor = "middle";
            const cosAngle = Math.cos(angle);
            if (cosAngle > 0.15) {
              anchor = "start";
            } else if (cosAngle < -0.15) {
              anchor = "end";
            }
            
            // Ajuster l'ancrage vertical
            const sinAngle = Math.sin(angle);
            let baseline = "middle";
            if (sinAngle < -0.6) {
              baseline = "auto"; // En haut
            } else if (sinAngle > 0.6) {
              baseline = "hanging"; // En bas
            }
            
            return (
              <g key={key}>
                <text
                  x={x}
                  y={y}
                  textAnchor={anchor}
                  className={styles.radarLabel}
                  dominantBaseline={baseline}
                >
                  {key}
                </text>
                <text
                  x={x}
                  y={y + 15}
                  textAnchor={anchor}
                  className={styles.radarValue}
                  dominantBaseline={baseline}
                >
                  {value.toFixed(1)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  if (!player) {
    return (
      <div className={styles.error}>
        <h2>Joueur non trouvé</h2>
        <Link href="/dashboard/ranking">
          <button className={styles.backButton}>Retour au classement</button>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.backLink}>
        <Link href="/dashboard/ranking">← Retour au classement</Link>
      </div>

      <div className={styles.header}>
        <div className={styles.playerPhotoLarge}>
          <img
            src={player.photoUrl || '/cercle-bleu-utilisateur-blanc.png'}
            alt={`${player.firstName} ${player.lastName}`}
            className={styles.photoImageLarge}
          />
        </div>
        <div className={styles.playerInfo}>
          <h1 className={styles.playerName}>
            {player.firstName} {player.lastName}
          </h1>
          <div className={styles.rankBadge}>
            <span className={styles.rankLabel}>Classement:</span>
            <span className={styles.rankValue}>
              {player.uroomRank}{player.uroomRank === 1 ? 'er' : 'ème'}
            </span>
            <span className={styles.scoreBadge}>Score: {player.uroomScore.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Informations générales */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Informations</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Âge</span>
              <span className={styles.infoValue}>{player.age} ans</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Nationalité</span>
              <span className={styles.infoValue}>{player.nationality}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Position(s)</span>
              <span className={styles.infoValue}>{player.positions.join(', ')}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Pied</span>
              <span className={styles.infoValue}>{player.foot}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Taille</span>
              <span className={styles.infoValue}>{player.heightCm} cm</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Poids</span>
              <span className={styles.infoValue}>{player.weightKg} kg</span>
            </div>
          </div>
        </div>

        {/* Graphique radar des métriques */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Métriques de Performance</h2>
          {renderRadarChart()}
        </div>

        {/* Section vidéos */}
        {player.videoUrls && player.videoUrls.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Vidéos</h2>
            <div className={styles.videosGrid}>
              {player.videoUrls.map((url, index) => {
                // Extraire l'ID de la vidéo YouTube si c'est un lien YouTube
                const getYouTubeId = (url: string) => {
                  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                  const match = url.match(regExp);
                  return (match && match[2].length === 11) ? match[2] : null;
                };

                const youtubeId = getYouTubeId(url);

                return (
                  <div key={index} className={styles.videoItem}>
                    {youtubeId ? (
                      <iframe
                        className={styles.videoIframe}
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        title={`Vidéo ${index + 1}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        className={styles.videoPlayer}
                        controls
                        src={url}
                      >
                        Votre navigateur ne supporte pas la balise vidéo.
                      </video>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
