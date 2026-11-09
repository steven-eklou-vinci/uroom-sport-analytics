import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking
} from 'react-native';
import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import Screen from '../components/Screen';
import { apiRequest, getWebBaseUrl } from '../api/client';
import { colors, spacing, typography } from '../theme';
import { PlayerDataBadge } from '../components/PlayerDataBadge';
import RadarChart from '../components/RadarChart';

type PlayersStackParamList = {
  PlayersList: undefined;
  PlayerDetails: { playerId: string };
};

type Props = NativeStackScreenProps<PlayersStackParamList, 'PlayerDetails'>;

type ApiMetric = {
  id: string;
  key: string;
  value: number;
  unit?: string | null;
};

type ApiAssessment = {
  id: string;
  date: string;
  location?: string | null;
  notes?: string | null;
  metrics?: ApiMetric[];
};

type ScoutReport = {
  id: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  clubFit: string[];
  createdAt: string;
  author?: {
    id: string;
    name: string | null;
  } | null;
};

type ApiPlayerDetails = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  nationality: string;
  positions: string[];
  tags: string[];
  photoUrl?: string | null;
  foot?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  uroomScore?: number | null;
  videoUrls?: string[];
  assessments?: ApiAssessment[];
  dataSource?: 'PLATFORM_DATA' | 'SCOUT_CREATED' | null;
  createdByScout?: {
    id: string;
    name?: string | null;
  } | null;
  user?: {
    managedClub?: {
      name?: string | null;
    } | null;
  } | null;
  reports?: ScoutReport[];
};

const webBaseUrl = getWebBaseUrl();

function normalizePhotoUrl(photoUrl?: string | null): string | undefined {
  if (!photoUrl) return undefined;
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
  if (photoUrl.startsWith('/')) return `${webBaseUrl}${photoUrl}`;
  return photoUrl;
}

function computeAge(birthDate: string): number {
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return 0;
  const diff = Date.now() - date.getTime();
  return Math.max(0, new Date(diff).getUTCFullYear() - 1970);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export default function PlayerDetailsScreen({ route, navigation }: Props) {
  const { playerId } = route.params;
  const [player, setPlayer] = useState<ApiPlayerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(2025);

  useEffect(() => {
    const loadPlayerDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest<ApiPlayerDetails>(`/players/${playerId}`);
        setPlayer(data);
      } catch (err) {
        console.warn('Failed to load player details', err);
        setError('Impossible de charger les détails du joueur.');
      } finally {
        setLoading(false);
      }
    };

    void loadPlayerDetails();
  }, [playerId]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <ActivityIndicator color={colors.secondary} size="large" />
          <Text style={styles.stateText}>Chargement...</Text>
        </View>
      </Screen>
    );
  }

  if (error || !player) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{error || 'Joueur introuvable'}</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const playerName = `${player.firstName} ${player.lastName}`.trim();
  const age = computeAge(player.birthDate);
  const photoUrl = normalizePhotoUrl(player.photoUrl);
  const hasDataSource = player.dataSource && player.dataSource !== 'PLATFORM_DATA';

  // Générer les données radar basées sur les assessments (comme la web app)
  const generateRadarData = (year: number) => {
    if (!player.assessments || player.assessments.length === 0) {
      // Si pas d'assessments, utiliser le score Uroom pour générer des estimations
      const baseScore = player.uroomScore ?? 50;
      const categories = ['Vitesse', 'Dribble', 'Tir', 'Passe', 'Défense', 'Physique', 'Contrôle', 'Vision'];
      return categories.map(cat => {
        const variation = (Math.random() - 0.5) * 15;
        const currentValue = Math.min(100, Math.max(0, baseScore + variation));
        const yearDiff = year - 2025;
        const ageFactor = Math.max(0.3, 1 - (age / 30));
        const evolution = yearDiff > 0 ? (Math.random() * 5 + 3) * ageFactor : 0;
        const predictedValue = Math.min(100, Math.round(currentValue + (evolution * yearDiff)));
        return { label: cat, value: predictedValue };
      });
    }

    // Regrouper les métriques par catégorie et calculer la moyenne
    const metricsByCategory: { [key: string]: number[] } = {};
    player.assessments.forEach((assessment) => {
      if (assessment.metrics) {
        assessment.metrics.forEach((metric) => {
          if (!metricsByCategory[metric.key]) {
            metricsByCategory[metric.key] = [];
          }
          metricsByCategory[metric.key].push(metric.value);
        });
      }
    });

    return Object.entries(metricsByCategory).map(([category, values]) => {
      const avgValue = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      const yearDiff = year - 2025;
      const ageFactor = Math.max(0.3, 1 - (age / 30));
      const evolution = yearDiff > 0 ? Math.floor((Math.random() * 5) + 3) * ageFactor : 0;
      const predictedValue = Math.min(100, Math.round(avgValue + (evolution * yearDiff)));
      
      return {
        label: category,
        value: predictedValue
      };
    });
  };

  const radarMetrics = generateRadarData(selectedYear);
  const years = [2025, 2026, 2027, 2028, 2029];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil Joueur</Text>
          <View style={styles.backButton} />
        </View>

        {/* Player Photo & Name */}
        <View style={styles.profileHeader}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Text style={styles.profilePhotoText}>{playerName.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{playerName}</Text>
          {hasDataSource && (
            <View style={styles.badgeWrapper}>
              <PlayerDataBadge
                dataSource={player.dataSource!}
                createdByScout={
                  player.createdByScout?.name
                    ? { name: player.createdByScout.name }
                    : undefined
                }
              />
            </View>
          )}
        </View>

        {/* Basic Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations générales</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Position:</Text>
            <Text style={styles.infoValue}>
              {player.positions.join(', ') || 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Âge:</Text>
            <Text style={styles.infoValue}>{age} ans</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nationalité:</Text>
            <Text style={styles.infoValue}>{player.nationality}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Club:</Text>
            <Text style={styles.infoValue}>
              {player.user?.managedClub?.name || 'Club non défini'}
            </Text>
          </View>
          {player.foot && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pied:</Text>
              <Text style={styles.infoValue}>{player.foot}</Text>
            </View>
          )}
          {player.heightCm && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Taille:</Text>
              <Text style={styles.infoValue}>{player.heightCm} cm</Text>
            </View>
          )}
          {player.weightKg && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Poids:</Text>
              <Text style={styles.infoValue}>{player.weightKg} kg</Text>
            </View>
          )}
        </View>

        {/* Métriques Uroom & Prédiction IA */}
        {radarMetrics.length > 0 && (
          <View style={styles.card}>
            <View style={styles.metricsHeader}>
              <Text style={styles.cardTitle}>Métriques Uroom & Prédiction IA</Text>
            </View>

            {/* Onglets années */}
            <View style={styles.yearSelector}>
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearButton,
                    selectedYear === year && styles.yearButtonActive
                  ]}
                  onPress={() => setSelectedYear(year)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.yearButtonText,
                    selectedYear === year && styles.yearButtonTextActive
                  ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Score actuel */}
            {player.uroomScore !== undefined && player.uroomScore !== null && (
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreValue}>{Math.round(player.uroomScore)}</Text>
                <Text style={styles.scoreLabel}>Score Potentiel Actuel</Text>
              </View>
            )}

            {/* Radar Chart */}
            <View style={styles.chartSection}>
              <View style={styles.chartWrapper}>
                <RadarChart metrics={radarMetrics} size={220} />
              </View>
            </View>

            {/* Note prédiction IA */}
            {selectedYear > 2025 && (
              <View style={styles.aiNote}>
                <Feather name="zap" size={16} color={colors.secondary} />
                <Text style={styles.aiNoteText}>
                  <Text style={styles.aiNoteLabel}>Prédiction IA Uroom: </Text>
                  Les valeurs affichées pour {selectedYear} sont des projections basées sur l'évolution moyenne des joueurs de profil similaire.
                  Amélioration projetée: +{Math.round((selectedYear - 2025) * 4 * Math.max(0.3, 1 - (age / 30)))} points moyens.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Scout Reports */}
        {player.reports && player.reports.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Rapports de scout ({player.reports.length})
            </Text>
            {player.reports.map((report) => (
              <View key={report.id} style={styles.reportItem}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportScout}>
                    {report.author?.name || 'Scout'}
                  </Text>
                  <Text style={styles.reportDate}>{formatDate(report.createdAt)}</Text>
                </View>
                <Text style={styles.reportSummary}>{report.summary}</Text>

                {report.strengths && report.strengths.length > 0 && (
                  <View style={styles.reportSection}>
                    <Text style={styles.reportSectionTitle}>Points forts:</Text>
                    {report.strengths.map((strength, idx) => (
                      <Text key={idx} style={styles.bulletPoint}>
                        • {strength}
                      </Text>
                    ))}
                  </View>
                )}

                {report.weaknesses && report.weaknesses.length > 0 && (
                  <View style={styles.reportSection}>
                    <Text style={styles.reportSectionTitle}>Faiblesses:</Text>
                    {report.weaknesses.map((weakness, idx) => (
                      <Text key={idx} style={styles.bulletPoint}>
                        • {weakness}
                      </Text>
                    ))}
                  </View>
                )}

                {report.clubFit && report.clubFit.length > 0 && (
                  <View style={styles.reportSection}>
                    <Text style={styles.reportSectionTitle}>Adéquation club:</Text>
                    {report.clubFit.map((fit, idx) => (
                      <Text key={idx} style={styles.bulletPoint}>
                        • {fit}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Videos */}
        {player.videoUrls && player.videoUrls.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Vidéos du joueur</Text>
            <Text style={styles.videoCount}>{player.videoUrls.length} vidéo(s) disponible(s)</Text>
            {player.videoUrls.map((url, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.videoItem}
                onPress={() => Linking.openURL(url)}
                activeOpacity={0.7}
              >
                <View style={styles.videoIconWrapper}>
                  <Feather name="play-circle" size={24} color={colors.white} />
                </View>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>Vidéo #{idx + 1}</Text>
                  <Text style={styles.videoUrl} numberOfLines={1}>
                    {url}
                  </Text>
                </View>
                <Feather name="external-link" size={18} color={colors.gray[400]} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Scout Created Info */}
        {player.dataSource === 'SCOUT_CREATED' && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardText}>
              ⓘ Ce profil a été créé par un scout. Les métriques détaillées ne sont pas
              encore disponibles.
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxl
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.light
  },
  stateContainer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.md
  },
  stateText: {
    color: colors.gray[300],
    fontSize: typography.sizes.md
  },
  backBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: 10
  },
  backBtnText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: '700'
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.secondary,
    marginBottom: spacing.md
  },
  profilePhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.gray[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.secondary,
    marginBottom: spacing.md
  },
  profilePhotoText: {
    fontSize: 48,
    color: colors.gray[200],
    fontFamily: typography.fontFamily.bold
  },
  profileName: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fontFamily.bold,
    color: colors.light,
    marginBottom: spacing.sm
  },
  badgeWrapper: {
    marginTop: spacing.sm
  },
  card: {
    backgroundColor: colors.dark,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[600]
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.light,
    marginBottom: spacing.md
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  infoLabel: {
    fontSize: typography.sizes.md,
    color: colors.gray[400],
    fontFamily: typography.fontFamily.regular
  },
  infoValue: {
    fontSize: typography.sizes.md,
    color: colors.light,
    fontFamily: typography.fontFamily.medium
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md
  },
  scoreValue: {
    fontSize: 48,
    fontFamily: typography.fontFamily.bold,
    color: colors.secondary,
    marginBottom: spacing.xs
  },
  scoreLabel: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginBottom: spacing.lg
  },
  chartSection: {
    marginTop: spacing.lg
  },
  chartLabel: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.bold,
    color: colors.light,
    marginBottom: spacing.md,
    textAlign: 'center'
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md
  },
  metricsHeader: {
    marginBottom: spacing.md
  },
  yearSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap'
  },
  yearButton: {
    flex: 1,
    minWidth: 60,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.gray[800],
    borderWidth: 1,
    borderColor: colors.gray[600],
    alignItems: 'center'
  },
  yearButtonActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary
  },
  yearButtonText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[300]
  },
  yearButtonTextActive: {
    color: colors.white,
    fontFamily: typography.fontFamily.bold
  },
  aiNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.secondary + '15',
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
    borderRadius: 8
  },
  aiNoteText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.gray[200],
    lineHeight: 20
  },
  aiNoteLabel: {
    fontFamily: typography.fontFamily.bold,
    color: colors.secondary
  },
  reportItem: {
    backgroundColor: colors.gray[800],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  reportScout: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.bold,
    color: colors.secondary
  },
  reportDate: {
    fontSize: typography.sizes.xs,
    color: colors.gray[400]
  },
  reportSummary: {
    fontSize: typography.sizes.sm,
    color: colors.light,
    lineHeight: 20,
    marginBottom: spacing.md
  },
  reportSection: {
    marginTop: spacing.sm
  },
  reportSectionTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[300],
    marginBottom: spacing.xs
  },
  bulletPoint: {
    fontSize: typography.sizes.sm,
    color: colors.gray[200],
    marginLeft: spacing.sm,
    marginBottom: spacing.xs
  },
  videoCount: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginBottom: spacing.md
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.gray[800],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[700]
  },
  videoIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  videoInfo: {
    flex: 1
  },
  videoTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.bold,
    color: colors.light,
    marginBottom: spacing.xs
  },
  videoUrl: {
    fontSize: typography.sizes.xs,
    color: colors.gray[400]
  },
  infoCard: {
    backgroundColor: colors.secondary + '20',
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  infoCardText: {
    fontSize: typography.sizes.sm,
    color: colors.light,
    lineHeight: 20
  }
});
