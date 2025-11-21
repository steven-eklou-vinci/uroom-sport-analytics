'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import styles from './CreateReportPage.module.css';

interface PlayerData {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  nationality: string;
  positions: string[];
  foot: string;
  heightCm?: number;
  weightKg?: number;
  photoUrl?: string;
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

function CreateReportContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const playerId = searchParams?.get('playerId');

  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [summary, setSummary] = useState('');
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [clubFit, setClubFit] = useState<string[]>([]);
  const [currentStrength, setCurrentStrength] = useState('');
  const [currentWeakness, setCurrentWeakness] = useState('');
  const [currentClubFit, setCurrentClubFit] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    if (session?.user?.role !== 'SCOUT' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard/overview');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (playerId) {
      fetchPlayerData();
      fetchAssessments();
    } else {
      router.push('/dashboard/players/search');
    }
  }, [playerId, router]);

  const fetchPlayerData = async () => {
    try {
      const res = await fetch(`/api/players/${playerId}`);
      if (res.ok) {
        const data = await res.json();
        setPlayer(data);
      } else {
        alert('Joueur non trouvé');
        router.push('/dashboard/players/search');
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

  const generateRadarData = () => {
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

    return Object.entries(metricsByCategory).map(([category, values]) => ({
      category,
      value: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    }));
  };

  const handleAddTag = (type: 'strength' | 'weakness' | 'clubFit', value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    if (type === 'strength') {
      if (!strengths.includes(trimmedValue)) {
        setStrengths([...strengths, trimmedValue]);
      }
      setCurrentStrength('');
    } else if (type === 'weakness') {
      if (!weaknesses.includes(trimmedValue)) {
        setWeaknesses([...weaknesses, trimmedValue]);
      }
      setCurrentWeakness('');
    } else {
      if (!clubFit.includes(trimmedValue)) {
        setClubFit([...clubFit, trimmedValue]);
      }
      setCurrentClubFit('');
    }
  };

  const handleRemoveTag = (type: 'strength' | 'weakness' | 'clubFit', index: number) => {
    if (type === 'strength') {
      setStrengths(strengths.filter((_, i) => i !== index));
    } else if (type === 'weakness') {
      setWeaknesses(weaknesses.filter((_, i) => i !== index));
    } else {
      setClubFit(clubFit.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!summary.trim()) {
      alert('Veuillez saisir un résumé');
      return;
    }

    if (strengths.length === 0 || weaknesses.length === 0) {
      alert('Veuillez ajouter au moins un point fort et un point faible');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          playerId,
          summary,
          strengths,
          weaknesses,
          clubFit
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert('Rapport créé avec succès !');
        router.push(`/dashboard/reports/${data.id}`);
      } else {
        const error = await res.json();
        alert(error.message || 'Erreur lors de la création du rapport');
      }
    } catch (error) {
      console.error('Erreur submit report:', error);
      alert('Erreur lors de la création du rapport');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  if (!player) {
    return <div className={styles.error}>Joueur non trouvé</div>;
  }

  const radarData = generateRadarData();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Créer un rapport</h1>
        <button className={styles.backBtn} onClick={() => router.back()}>
          ← Retour
        </button>
      </div>

      {/* Section 1: Données Uroom (Lecture seule) */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>📊 Données Uroom</h2>
          <span className={styles.badge}>Lecture seule</span>
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
            <h3>{player.firstName} {player.lastName}</h3>
            <div className={styles.playerMeta}>
              <span>{calculateAge(player.birthDate)} ans</span>
              <span>•</span>
              <span>{player.nationality}</span>
              <span>•</span>
              <span>{player.positions.join(', ')}</span>
            </div>
            <div className={styles.playerDetails}>
              <span>Pied fort: {player.foot}</span>
              {player.heightCm && <span>Taille: {player.heightCm} cm</span>}
              {player.weightKg && <span>Poids: {player.weightKg} kg</span>}
            </div>
          </div>
        </div>

        {/* Metrics Radar Chart */}
        {radarData.length > 0 ? (
          <div className={styles.metricsSection}>
            <h3>Métriques des workshops Uroom</h3>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b' }} />
                <Radar name="Performance" dataKey="value" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
            <p className={styles.metricsNote}>
              * Données issues des évaluations Uroom en conditions standardisées
            </p>
          </div>
        ) : (
          <div className={styles.noData}>
            <p>Aucune donnée Uroom disponible pour ce joueur</p>
          </div>
        )}

        {/* Videos */}
        {assessments.some((a) => a.videos.length > 0) && (
          <div className={styles.videosSection}>
            <h3>Vidéos des workshops</h3>
            <div className={styles.videosGrid}>
              {assessments
                .flatMap((a) => a.videos)
                .slice(0, 4)
                .map((video, index) => (
                  <div key={index} className={styles.videoCard}>
                    <video controls>
                      <source src={video} type="video/mp4" />
                    </video>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Analyse du Scout (Éditable) */}
      <form onSubmit={handleSubmit} className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>✍️ Votre analyse</h2>
          <span className={styles.badgeEditable}>Éditable</span>
        </div>

        {/* Summary */}
        <div className={styles.formGroup}>
          <label htmlFor="summary">Résumé général *</label>
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Décrivez votre impression générale sur ce joueur..."
            rows={6}
            required
          />
        </div>

        {/* Strengths */}
        <div className={styles.formGroup}>
          <label>Points forts *</label>
          <div className={styles.tagInput}>
            <input
              type="text"
              value={currentStrength}
              onChange={(e) => setCurrentStrength(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag('strength', currentStrength);
                }
              }}
              placeholder="Ex: Excellente vision du jeu"
            />
            <button
              type="button"
              onClick={() => handleAddTag('strength', currentStrength)}
              className={styles.addBtn}
            >
              Ajouter
            </button>
          </div>
          <div className={styles.tagsList}>
            {strengths.map((strength, index) => (
              <div key={index} className={`${styles.tag} ${styles.tagStrength}`}>
                {strength}
                <button type="button" onClick={() => handleRemoveTag('strength', index)}>×</button>
              </div>
            ))}
          </div>
        </div>

        {/* Weaknesses */}
        <div className={styles.formGroup}>
          <label>Points faibles *</label>
          <div className={styles.tagInput}>
            <input
              type="text"
              value={currentWeakness}
              onChange={(e) => setCurrentWeakness(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag('weakness', currentWeakness);
                }
              }}
              placeholder="Ex: Manque de constance"
            />
            <button
              type="button"
              onClick={() => handleAddTag('weakness', currentWeakness)}
              className={styles.addBtn}
            >
              Ajouter
            </button>
          </div>
          <div className={styles.tagsList}>
            {weaknesses.map((weakness, index) => (
              <div key={index} className={`${styles.tag} ${styles.tagWeakness}`}>
                {weakness}
                <button type="button" onClick={() => handleRemoveTag('weakness', index)}>×</button>
              </div>
            ))}
          </div>
        </div>

        {/* Club Fit */}
        <div className={styles.formGroup}>
          <label>Compatibilité club (optionnel)</label>
          <div className={styles.tagInput}>
            <input
              type="text"
              value={currentClubFit}
              onChange={(e) => setCurrentClubFit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag('clubFit', currentClubFit);
                }
              }}
              placeholder="Ex: Profil parfait pour notre système 4-3-3"
            />
            <button
              type="button"
              onClick={() => handleAddTag('clubFit', currentClubFit)}
              className={styles.addBtn}
            >
              Ajouter
            </button>
          </div>
          <div className={styles.tagsList}>
            {clubFit.map((fit, index) => (
              <div key={index} className={`${styles.tag} ${styles.tagClubFit}`}>
                {fit}
                <button type="button" onClick={() => handleRemoveTag('clubFit', index)}>×</button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className={styles.formActions}>
          <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>
            Annuler
          </button>
          <button type="submit" disabled={submitting} className={styles.submitBtn}>
            {submitting ? 'Création...' : 'Créer le rapport'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#fff' }}>Chargement...</div>}>
      <CreateReportContent />
    </Suspense>
  );
}
