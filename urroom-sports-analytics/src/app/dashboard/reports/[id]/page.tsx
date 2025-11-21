"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import styles from './ReportDetail.module.css';

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
    birthDate: string;
    heightCm?: number;
    weightKg?: number;
    foot: string;
  };
  author?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(2025);

  useEffect(() => {
    if (params?.id) {
      fetchReport(params.id as string);
    }
  }, [params?.id]);

  const fetchReport = async (id: string) => {
    try {
      const res = await fetch(`/api/reports/${id}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        router.push('/dashboard/reports');
      }
    } catch (error) {
      console.error('Erreur fetch rapport:', error);
    } finally {
      setLoading(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Générer des métriques aléatoires pour la démo
  const generateMetrics = (year: number) => {
    const baseMetrics = [
      { metric: 'Vitesse', value: Math.floor(Math.random() * 30) + 60 },
      { metric: 'Dribble', value: Math.floor(Math.random() * 30) + 60 },
      { metric: 'Tir', value: Math.floor(Math.random() * 30) + 55 },
      { metric: 'Passe', value: Math.floor(Math.random() * 30) + 65 },
      { metric: 'Défense', value: Math.floor(Math.random() * 30) + 50 },
      { metric: 'Physique', value: Math.floor(Math.random() * 30) + 60 },
    ];

    // Si année future, augmenter légèrement les valeurs (simulation IA)
    const yearDiff = year - 2025;
    if (yearDiff > 0) {
      return baseMetrics.map(m => ({
        ...m,
        value: Math.min(100, m.value + yearDiff * (Math.floor(Math.random() * 5) + 3))
      }));
    }

    return baseMetrics;
  };

  if (loading) return <div className={styles.loading}>Chargement...</div>;
  if (!report) return <div className={styles.loading}>Rapport introuvable</div>;

  const currentMetrics = generateMetrics(selectedYear);
  const years = [2025, 2026, 2027, 2028, 2029];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/dashboard/reports" className={styles.backButton}>
          ← Retour aux rapports
        </Link>
      </div>

      {/* En-tête joueur */}
      <div className={styles.playerHeader}>
        <img
          src={report.player.photoUrl || '/cercle-bleu-utilisateur-blanc.png'}
          alt={`${report.player.firstName} ${report.player.lastName}`}
          className={styles.playerPhoto}
        />
        <div className={styles.playerInfo}>
          <h1 className={styles.playerName}>
            {report.player.firstName} {report.player.lastName}
          </h1>
          <div className={styles.playerMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Position</span>
              <span className={styles.metaValue}>{report.player.positions.join(', ')}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Âge</span>
              <span className={styles.metaValue}>{calculateAge(report.player.birthDate)} ans</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Nationalité</span>
              <span className={styles.metaValue}>{report.player.nationality}</span>
            </div>
            {report.player.heightCm && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Taille</span>
                <span className={styles.metaValue}>{report.player.heightCm} cm</span>
              </div>
            )}
            {report.player.weightKg && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Poids</span>
                <span className={styles.metaValue}>{report.player.weightKg} kg</span>
              </div>
            )}
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Pied</span>
              <span className={styles.metaValue}>{report.player.foot}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className={styles.content}>
        {/* Résumé */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <svg className={styles.cardIcon} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Résumé du rapport
          </h2>
          <p className={styles.summary}>{report.summary}</p>
        </div>

        {/* Tags */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <svg className={styles.cardIcon} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Analyse
          </h2>

          {report.strengths.length > 0 && (
            <div className={styles.tagSection}>
              <div className={styles.tagSectionTitle}>
                ✓ Points forts
              </div>
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
              <div className={styles.tagSectionTitle}>
                ⚠ Points à améliorer
              </div>
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
              <div className={styles.tagSectionTitle}>
                🎯 Adéquation club
              </div>
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

      {/* Métriques avec radar chart */}
      <div className={styles.metricsCard}>
        <h2 className={styles.cardTitle}>
          <svg className={styles.cardIcon} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Analyse des performances
        </h2>

        <div className={styles.aiNote}>
          <p className={styles.aiNoteText}>
            <strong>Uroom IA :</strong> Sélectionnez une année pour visualiser le potentiel futur du joueur. 
            Ces données sont actuellement simulées pour la démonstration. La fonctionnalité d'IA prédictive sera intégrée prochainement 
            avec vos données réelles de collecte Uroom.
          </p>
        </div>

        <div className={styles.yearSelector}>
          <span className={styles.yearLabel}>Année de projection :</span>
          <div className={styles.yearButtons}>
            {years.map(year => (
              <button
                key={year}
                className={`${styles.yearButton} ${selectedYear === year ? styles.active : ''}`}
                onClick={() => setSelectedYear(year)}
              >
                {year}
                {year > 2025 && ' (Prédiction)'}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.radarContainer}>
          <ResponsiveContainer width="100%" height={500}>
            <RadarChart data={currentMetrics}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis 
                dataKey="metric" 
                tick={{ fill: '#94a3b8', fontSize: 14, fontWeight: 600 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #14b8a6',
                  borderRadius: '8px',
                  padding: '10px'
                }}
                labelStyle={{ color: '#fff', fontWeight: 600 }}
                itemStyle={{ color: '#14b8a6' }}
                formatter={(value: any) => [`${value}%`, 'Performance']}
              />
              <Radar
                name={`Performance ${selectedYear}`}
                dataKey="value"
                stroke="#14b8a6"
                fill="#14b8a6"
                fillOpacity={0.6}
              />
              <Legend 
                wrapperStyle={{ 
                  paddingTop: '20px',
                  fontSize: '14px',
                  fontWeight: 600
                }}
                iconType="circle"
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div>
          <div className={styles.author}>
            Rapport rédigé par <span className={styles.authorName}>{report.author?.name || 'Scout'}</span>
          </div>
          <div className={styles.author}>{report.author?.email}</div>
        </div>
        <div className={styles.reportDate}>
          {formatDate(report.createdAt)}
        </div>
      </div>
    </div>
  );
}
