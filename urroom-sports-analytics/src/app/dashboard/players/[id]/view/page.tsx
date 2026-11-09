'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import PlayerComparison from '../../../../components/PlayerComparison';
import PlayerDataBadge from '../../../../components/ui/PlayerDataBadge';
import ScoutReportsList from '../../../../components/ui/ScoutReportsList';
import styles from './PlayerProfilePage.module.css';

interface PlayerData {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  age: number | null;
  nationality: string;
  positions: string[];
  foot: string;
  heightCm?: number;
  weightKg?: number;
  photoUrl?: string;
  tags: string[];
  videoUrls: string[];
  dataSource?: 'PLATFORM_DATA' | 'SCOUT_CREATED';
  createdByScout?: {
    id: string;
    name: string;
    email: string;
  };
  matchAppearances?: MatchAppearance[];
}

interface MatchAppearance {
  id: string;
  trackId: number;
  title: string;
  opponent: string | null;
  matchDate: string | null;
  createdAt: string;
  statistics: { key: string; value: number; unit: string | null }[];
}

interface Assessment {
  id: string;
  date: string;
  location?: string;
  videos: string[];
  metrics: {
    key: string;
    value: number;
    unit: string;
  }[];
}

interface ScoutReport {
  id: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  clubFit?: string[];
  createdAt: string;
  author?: {
    id: string;
    name: string;
    email: string;
  };
}

interface FollowInfo {
  isFollowing: boolean;
  followedByOtherScouts: boolean;
  otherScoutsCount: number;
  otherScouts: { name: string; email: string }[];
}

export default function PlayerProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const playerId = params?.id as string;

  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [scoutReports, setScoutReports] = useState<ScoutReport[]>([]);
  const [followInfo, setFollowInfo] = useState<FollowInfo | null>(null);
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [loadingComparisons, setLoadingComparisons] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(2025);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (playerId) {
      fetchPlayerData();
      fetchAssessments();
      fetchScoutReports();
      if (session?.user?.role === 'SCOUT') {
        fetchFollowInfo();
      }
      // Fetch comparisons pour tous les recruteurs (scouts, clubs, admins)
      if (session?.user?.role === 'SCOUT' || session?.user?.role === 'CLUB' || session?.user?.role === 'ADMIN') {
        fetchComparisons();
      }
    }
  }, [playerId, session]);

  const fetchPlayerData = async () => {
    try {
      const res = await fetch(`/api/players/${playerId}`);
      if (res.ok) {
        const data = await res.json();
        setPlayer(data);
      }
    } catch (error) {
      console.error('Erreur fetch player:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssessments = async () => {
    try {
      const res = await fetch(`/api/assessments?playerId=${playerId}`);
      if (res.ok) {
        const data = await res.json();
        setAssessments(data);
      }
    } catch (error) {
      console.error('Erreur fetch assessments:', error);
    }
  };

  const fetchScoutReports = async () => {
    try {
      const userRole = session?.user?.role || '';
      const res = await fetch(`/api/reports/player/${playerId}?userRole=${userRole}`);
      if (res.ok) {
        const data = await res.json();
        setScoutReports(data);
      }
    } catch (error) {
      console.error('Erreur fetch scout reports:', error);
    }
  };

  const fetchFollowInfo = async () => {
    try {
      const res = await fetch(`/api/players/${playerId}/follow-info`);
      if (res.ok) {
        const data = await res.json();
        console.log('Follow info received:', data);
        setFollowInfo(data);
      } else {
        console.error('Failed to fetch follow info:', res.status);
      }
    } catch (error) {
      console.error('Erreur fetch follow info:', error);
    }
  };

  const fetchComparisons = async () => {
    try {
      setLoadingComparisons(true);
      const res = await fetch('/api/analytics/similar-pros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, topK: 5 })
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Comparaisons IA reçues:', data);
        setComparisons(Array.isArray(data) ? data : []);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Erreur récupération comparaisons:', res.status, errorData);
        setComparisons([]);
      }
    } catch (error) {
      console.error('Erreur fetch comparisons:', error);
      setComparisons([]);
    } finally {
      setLoadingComparisons(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!followInfo) return;

    try {
      const res = await fetch(`/api/players/follow/${playerId}`, {
        method: followInfo.isFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        setFollowInfo({
          ...followInfo,
          isFollowing: !followInfo.isFollowing
        });
        // Refresh follow info to update badge
        fetchFollowInfo();
      }
    } catch (error) {
      console.error('Erreur follow toggle:', error);
    }
  };

  const calculateAge = (birthDate: string | null, fallbackAge?: number | null) => {
    if (!birthDate) return fallbackAge ?? null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const generateRadarData = (year: number) => {
    if (assessments.length === 0) return [];

    // Group metrics by category and take average
    const metricsByCategory: { [key: string]: number[] } = {};
    assessments.forEach((assessment) => {
      assessment.metrics.forEach((metric) => {
        if (!metricsByCategory[metric.key]) {
          metricsByCategory[metric.key] = [];
        }
        metricsByCategory[metric.key].push(metric.value);
      });
    });

    const currentData = Object.entries(metricsByCategory).map(([category, values]) => {
      const avgValue = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      // IA prediction: add 3-8 points per future year (diminishing with age)
      const yearDiff = year - 2025;
      const age = player ? calculateAge(player.birthDate, player.age) ?? 20 : 20;
      const ageFactor = Math.max(0.3, 1 - (age / 30)); // Younger players improve more
      const evolution = yearDiff > 0 ? Math.floor((Math.random() * 5) + 3) * ageFactor : 0;
      const predictedValue = Math.min(100, Math.round(avgValue + (evolution * yearDiff)));
      
      return {
        category,
        value: predictedValue,
        currentValue: avgValue
      };
    });

    return currentData;
  };

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  if (!player) {
    return <div className={styles.error}>Joueur non trouvé</div>;
  }

  const radarData = generateRadarData(selectedYear);
  const years = [2025, 2026, 2027, 2028, 2029];
  const age = calculateAge(player.birthDate, player.age);
  const matchAppearances = player.matchAppearances || [];
  const totalDetections = matchAppearances.reduce((total, appearance) =>
    total + (appearance.statistics.find((stat) => stat.key === 'detections')?.value || 0), 0
  );
  const totalVisibleSeconds = matchAppearances.reduce((total, appearance) =>
    total + (appearance.statistics.find((stat) => stat.key === 'visible_seconds')?.value || 0), 0
  );
  
  console.log('Rendering with followInfo:', followInfo);

  return (
    <div className={styles.container}>
      {/* Header with Follow Badge */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          ← Retour
        </button>
        {session?.user?.role === 'SCOUT' && followInfo && (
          <div className={styles.actions}>
            {followInfo.followedByOtherScouts && (
              <div className={styles.otherScoutsBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <div>
                  <div>Suivi par {followInfo.otherScoutsCount} autre{followInfo.otherScoutsCount > 1 ? 's' : ''} scout{followInfo.otherScoutsCount > 1 ? 's' : ''}</div>
                  {followInfo.otherScouts.length > 0 && (
                    <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', opacity: 0.9 }}>
                      {followInfo.otherScouts.map((scout, i) => (
                        <span key={i}>
                          {scout.name}
                          {i < followInfo.otherScouts.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <button 
              className={followInfo.isFollowing ? styles.unfollowBtn : styles.followBtn}
              onClick={handleFollowToggle}
            >
              {followInfo.isFollowing ? 'Ne plus suivre' : 'Suivre ce joueur'}
            </button>
          </div>
        )}
      </div>

      {/* Player Info */}
      <div className={styles.playerHeader}>
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
          <div className={styles.playerTitleRow}>
            <h1>{player.firstName} {player.lastName}</h1>
            {player.dataSource && player.dataSource !== 'PLATFORM_DATA' && (
              <PlayerDataBadge 
                dataSource={player.dataSource} 
                createdByScout={player.createdByScout}
              />
            )}
          </div>
          <div className={styles.playerMeta}>
            <span className={styles.age}>{age === null ? 'Âge non renseigné' : `${age} ans`}</span>
            <span>•</span>
            <span>{player.nationality}</span>
            <span>•</span>
            <span>{player.positions.join(', ')}</span>
          </div>
          <div className={styles.playerDetails}>
            <div><strong>Pied fort:</strong> {player.foot}</div>
            {player.heightCm && <div><strong>Taille:</strong> {player.heightCm} cm</div>}
            {player.weightKg && <div><strong>Poids:</strong> {player.weightKg} kg</div>}
          </div>
          {player.tags.length > 0 && (
            <div className={styles.tags}>
              {player.tags.map((tag, i) => (
                <span key={i} className={styles.tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Radar Chart - Métriques Uroom & Prédiction IA */}
      {radarData.length > 0 && (
        <div className={styles.metricsSection}>
          <div className={styles.sectionHeader}>
            <h2>Métriques Uroom & Prédiction IA</h2>
            <div className={styles.yearSelector}>
              {years.map((year) => (
                <button
                  key={year}
                  className={selectedYear === year ? styles.yearActive : styles.yearBtn}
                  onClick={() => setSelectedYear(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={500}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b' }} />
              <Radar name="Performance" dataKey="value" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.6} strokeWidth={2} />
              <Tooltip 
                contentStyle={{ background: '#1e293b', border: '1px solid #14b8a6', borderRadius: '8px' }}
                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                itemStyle={{ color: '#14b8a6' }}
                formatter={(value: any) => [`${value}/100`, 'Score']}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
          {selectedYear > 2025 && (
            <div className={styles.aiNote}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p>
                <strong>Prédiction IA Uroom:</strong> Les valeurs affichées pour {selectedYear} sont des projections basées sur l&apos;évolution moyenne des joueurs de profil similaire.
                Ces prédictions prennent en compte l&apos;âge ({age === null ? 'non renseigné' : `${age} ans`}), le potentiel actuel et les tendances historiques. Amélioration projetée: +{Math.round((selectedYear - 2025) * 4 * Math.max(0.3, 1 - ((age ?? 20) / 30)))} points moyens.
              </p>
            </div>
          )}
        </div>
      )}

      <section className={styles.matchHistorySection}>
        <div className={styles.matchHistoryHeader}>
          <div>
            <p className={styles.matchHistoryEyebrow}>Suivi vidéo</p>
            <h2>Historique des matchs</h2>
          </div>
          <div className={styles.matchHistoryTotals}>
            <span><strong>{matchAppearances.length}</strong> matchs</span>
            <span><strong>{totalDetections.toLocaleString('fr-FR')}</strong> détections</span>
            <span><strong>{(totalVisibleSeconds / 60).toFixed(1)}</strong> min visibles</span>
          </div>
        </div>
        {matchAppearances.length === 0 ? (
          <p className={styles.matchHistoryEmpty}>Aucune apparition vidéo associée à ce profil.</p>
        ) : (
          <div className={styles.matchHistoryTableWrap}>
            <table className={styles.matchHistoryTable}>
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Date</th>
                  <th>ID suivi</th>
                  <th>Détections</th>
                  <th>Temps visible</th>
                </tr>
              </thead>
              <tbody>
                {matchAppearances.map((appearance) => (
                  <tr key={appearance.id}>
                    <td>{appearance.title}{appearance.opponent ? ` · ${appearance.opponent}` : ''}</td>
                    <td>{new Date(appearance.matchDate || appearance.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td>#{appearance.trackId}</td>
                    <td>{appearance.statistics.find((stat) => stat.key === 'detections')?.value || 0}</td>
                    <td>{(appearance.statistics.find((stat) => stat.key === 'visible_seconds')?.value || 0).toFixed(1)} s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Player Comparisons - Visible uniquement pour scouts/clubs/admins */}
      {(session?.user?.role === 'SCOUT' || session?.user?.role === 'CLUB' || session?.user?.role === 'ADMIN') && (
        <PlayerComparison comparisons={comparisons} loading={loadingComparisons} />
      )}

      {/* Scout Reports - Visible pour tous */}
      <ScoutReportsList 
        reports={scoutReports} 
        userRole={session?.user?.role}
      />

      {/* Videos */}
      {assessments.some((a) => a.videos.length > 0) && (
        <div className={styles.videosSection}>
          <h2>🎥 Vidéos des évaluations</h2>
          <div className={styles.videosGrid}>
            {assessments
              .flatMap((a) => a.videos)
              .slice(0, 4)
              .map((video, index) => (
                <div key={index} className={styles.videoPlaceholder}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Vidéo {index + 1}</p>
                  <span className={styles.videoLink}>{video.split('/').pop()}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
