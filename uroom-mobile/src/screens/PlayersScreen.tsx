import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import Screen from '../components/Screen';
import SectionHeader from '../components/SectionHeader';
import PlayerCard from '../components/PlayerCard';
import { apiRequest, getWebBaseUrl } from '../api/client';
import { colors, spacing } from '../theme';
import type { Player } from '../types';

type PlayersStackParamList = {
  PlayersList: undefined;
  PlayerDetails: { playerId: string };
};

type Props = NativeStackScreenProps<PlayersStackParamList, 'PlayersList'>;

type ApiPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  nationality: string;
  positions: string[];
  tags: string[];
  uroomScore?: number | null;
  photoUrl?: string | null;
  user?: {
    managedClub?: {
      name?: string | null;
    } | null;
  } | null;
};

const webBaseUrl = getWebBaseUrl();

const fallbackMetrics = [
  { label: 'Tech', value: '--' },
  { label: 'Phys', value: '--' },
  { label: 'Tac', value: '--' },
  { label: 'Ment', value: '--' }
];

function computeAge(birthDate: string): number {
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return 0;
  const diff = Date.now() - date.getTime();
  return Math.max(0, new Date(diff).getUTCFullYear() - 1970);
}

function normalizePhotoUrl(photoUrl?: string | null): string | undefined {
  if (!photoUrl) return undefined;
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
  if (photoUrl.startsWith('/')) return `${webBaseUrl}${photoUrl}`;
  return photoUrl;
}

function mapApiPlayer(player: ApiPlayer): Player {
  const position = Array.isArray(player.positions) && player.positions.length > 0
    ? player.positions[0]
    : 'N/A';

  return {
    id: player.id,
    name: `${player.firstName} ${player.lastName}`.trim() || 'Unknown',
    position,
    age: computeAge(player.birthDate),
    club: player.user?.managedClub?.name || 'Club non defini',
    nationality: player.nationality,
    photoUrl: normalizePhotoUrl(player.photoUrl),
    uroomScore: Math.round(player.uroomScore ?? 0),
    trend: 'flat',
    metrics: fallbackMetrics,
    tags: Array.isArray(player.tags) ? player.tags : []
  };
}

export default function PlayersScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ApiPlayer[]>('/players');
      setPlayers(data.map(mapApiPlayer));
    } catch (err) {
      console.warn('Failed to load players', err);
      setError('Unable to load players right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlayers();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return players.filter((player) =>
      [player.name, player.position, player.club].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [players, query]);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <SectionHeader
          title="Players"
          subtitle="Quick scouting view with core metrics"
        />
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrapper}>
        <TextInput
          placeholder="Search by name, club, position"
          placeholderTextColor={colors.gray[400]}
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />
      </View>

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={colors.secondary} />
          <Text style={styles.stateText}>Loading players...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadPlayers} activeOpacity={0.85}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PlayerCard
              player={item}
              onPress={() => navigation.navigate('PlayerDetails', { playerId: item.id })}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  addBtn: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignSelf: 'flex-start'
  },
  addBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700'
  },
  searchWrapper: {
    marginBottom: spacing.lg
  },
  search: {
    backgroundColor: colors.dark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    color: colors.light,
    borderWidth: 1,
    borderColor: colors.gray[600]
  },
  list: {
    paddingBottom: spacing.xxl
  },
  stateContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm
  },
  stateText: {
    color: colors.gray[300],
    fontSize: 13
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: 10
  },
  retryText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700'
  }
});
