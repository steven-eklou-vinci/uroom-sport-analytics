import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { aiRequest, apiRequest, getWebBaseUrl } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { CreatePlayerForm } from '../components/CreatePlayerForm';
import PlayerCard from '../components/PlayerCard';
import Screen from '../components/Screen';
import SectionHeader from '../components/SectionHeader';
import { colors, spacing, typography } from '../theme';
import type { Player } from '../types';

const NOTES_STORAGE_KEY = 'uroom.scout.noteRecords.v1';
const LIVE_SESSIONS_STORAGE_KEY = 'uroom.scout.liveSessions.v1';

type FlowStep =
  | 'grid'
  | 'menu'
  | 'create'
  | 'list'
  | 'editor'
  | 'liveMenu'
  | 'liveCreate'
  | 'liveList'
  | 'liveReport'
  | 'live';

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

type ScoutTextNote = {
  id: string;
  content: string;
  createdAt: string;
};

type ScoutVoiceNote = {
  id: string;
  uri: string;
  durationMs?: number;
  createdAt: string;
};

type ScoutNoteRecord = {
  id: string;
  scoutId?: string;
  player: Player;
  createdAt: string;
  updatedAt: string;
  lastReportAt?: string;
  textNotes: ScoutTextNote[];
  voiceNotes: ScoutVoiceNote[];
};

type LivePresetTool = {
  id: string;
  label: string;
  kind: 'count' | 'ratio';
  successLabel?: string;
  failedLabel?: string;
};

type LiveCounterBase = {
  id: string;
  label: string;
  source: 'preset' | 'custom';
};

type LiveCountCounter = LiveCounterBase & {
  kind: 'count';
  value: number;
};

type LiveRatioCounter = LiveCounterBase & {
  kind: 'ratio';
  successValue: number;
  failedValue: number;
  successLabel: string;
  failedLabel: string;
};

type LiveCounter = LiveCountCounter | LiveRatioCounter;

type LiveEvent = {
  id: string;
  toolId: string;
  label: string;
  delta: number;
  valueAfter: number;
  elapsedSeconds: number;
};

type LiveTextNote = {
  id: string;
  content: string;
  createdAt: string;
  elapsedSeconds: number;
};

type LiveSession = {
  id: string;
  scoutId?: string;
  createdAt: string;
  updatedAt: string;
  player?: Player;
  playerName?: string;
  playerId?: string;
  elapsedSeconds: number;
  counters: LiveCounter[];
  events: LiveEvent[];
  notes: LiveTextNote[];
};

type LiveReportDraftResponse = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  clubFit: string[];
};

type FeedbackDialogTone = 'success' | 'error';

type AudioRecordingLike = {
  prepareToRecordAsync: (options: unknown) => Promise<void>;
  startAsync: () => Promise<void>;
  stopAndUnloadAsync: () => Promise<void>;
  getStatusAsync: () => Promise<{ durationMillis?: number | null }>;
  getURI: () => string | null;
};

type ExpoAudioLike = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  setAudioModeAsync: (mode: { allowsRecordingIOS: boolean; playsInSilentModeIOS: boolean }) => Promise<void>;
  Recording: new () => AudioRecordingLike;
  RecordingOptionsPresets: {
    HIGH_QUALITY: unknown;
  };
};

const fallbackMetrics = [
  { label: 'Tech', value: '--' },
  { label: 'Phys', value: '--' },
  { label: 'Tac', value: '--' },
  { label: 'Ment', value: '--' }
];

const livePresetTools: LivePresetTool[] = [
  {
    id: 'pass_ratio',
    label: 'Ratio pass',
    kind: 'ratio',
    successLabel: 'Passes reussies',
    failedLabel: 'Passes ratees'
  },
  {
    id: 'dribble_ratio',
    label: 'Ratio dribble',
    kind: 'ratio',
    successLabel: 'Dribbles reussis',
    failedLabel: 'Dribbles rates'
  },
  {
    id: 'duel_ratio',
    label: 'Ratio duel',
    kind: 'ratio',
    successLabel: 'Duels gagnes',
    failedLabel: 'Duels perdus'
  },
  {
    id: 'shot_ratio',
    label: 'Ratio tir',
    kind: 'ratio',
    successLabel: 'Tirs cadres',
    failedLabel: 'Tirs non cadres'
  },
  { id: 'key_pass', label: 'Passes cle', kind: 'count' },
  { id: 'interception', label: 'Interceptions', kind: 'count' },
  { id: 'recoveries', label: 'Recuperations', kind: 'count' },
  { id: 'ball_loss', label: 'Pertes de balle', kind: 'count' }
];

const webBaseUrl = getWebBaseUrl();

function getExpoAudioModule(): ExpoAudioLike | null {
  try {
    const expoAv = require('expo-av') as
      | { Audio?: ExpoAudioLike; default?: { Audio?: ExpoAudioLike } }
      | undefined;

    if (expoAv?.Audio) {
      return expoAv.Audio;
    }

    if (expoAv?.default?.Audio) {
      return expoAv.default.Audio;
    }

    // Fallback for runtimes where expo-av root export shape is inconsistent.
    const audioModule = require('expo-av/build/Audio.js') as ExpoAudioLike | undefined;
    if (audioModule?.requestPermissionsAsync && audioModule?.Recording) {
      return audioModule;
    }

    return null;
  } catch (error) {
    console.warn('expo-av native module is not available in this runtime.', error);
    return null;
  }
}

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

function normalizeSearchToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function mapApiPlayer(player: ApiPlayer): Player {
  const position = Array.isArray(player.positions) && player.positions.length > 0 ? player.positions[0] : 'N/A';

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

function buildFallbackPlayer(name: string, idHint?: string): Player {
  return {
    id: idHint || `legacy-${Date.now()}`,
    name,
    position: 'N/A',
    age: 0,
    club: 'Club non defini',
    nationality: 'N/A',
    uroomScore: 0,
    trend: 'flat',
    metrics: fallbackMetrics,
    tags: []
  };
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatDuration(durationMs?: number): string {
  if (!durationMs || durationMs <= 0) return '0:00';
  const seconds = Math.floor(durationMs / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = `${seconds % 60}`.padStart(2, '0');
  return `${mins}:${secs}`;
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = `${seconds % 60}`.padStart(2, '0');
  return `${mins}:${secs}`;
}

function summarizeLiveCounterForReport(counter: LiveCounter): string {
  if (counter.kind === 'count') {
    return `${counter.label}: ${counter.value}`;
  }

  const total = counter.successValue + counter.failedValue;
  const ratio = total > 0 ? `${Math.round((counter.successValue / total) * 100)}%` : '--';
  return `${counter.label}: ${counter.successValue}/${total} (${ratio})`;
}

function parseMultiline(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function CaptureScreen() {
  const { session } = useAuth();

  const [step, setStep] = useState<FlowStep>('grid');
  const [returnStep, setReturnStep] = useState<'create' | 'list'>('list');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [searchingPlayer, setSearchingPlayer] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundPlayer, setFoundPlayer] = useState<Player | null>(null);
  const [showCreatePlayerModal, setShowCreatePlayerModal] = useState(false);
  const [createPlayerContext, setCreatePlayerContext] = useState<'normal' | 'live'>('normal');

  const [records, setRecords] = useState<ScoutNoteRecord[]>([]);
  const [recordsLoaded, setRecordsLoaded] = useState(false);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);

  const [noteDraft, setNoteDraft] = useState('');
  const [editingTextNoteId, setEditingTextNoteId] = useState<string | null>(null);
  const [recording, setRecording] = useState<AudioRecordingLike | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [creatingReport, setCreatingReport] = useState(false);

  const [liveRunning, setLiveRunning] = useState(false);
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);
  const [liveCounters, setLiveCounters] = useState<LiveCounter[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [liveNotes, setLiveNotes] = useState<LiveTextNote[]>([]);
  const [liveNoteDraft, setLiveNoteDraft] = useState('');
  const [liveCustomToolLabel, setLiveCustomToolLabel] = useState('');
  const [savingLiveSession, setSavingLiveSession] = useState(false);
  const [liveSearchFirstName, setLiveSearchFirstName] = useState('');
  const [liveSearchLastName, setLiveSearchLastName] = useState('');
  const [liveSearchingPlayer, setLiveSearchingPlayer] = useState(false);
  const [liveSearchError, setLiveSearchError] = useState<string | null>(null);
  const [liveFoundPlayer, setLiveFoundPlayer] = useState<Player | null>(null);
  const [liveSessionPlayer, setLiveSessionPlayer] = useState<Player | null>(null);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [liveSessionsLoaded, setLiveSessionsLoaded] = useState(false);
  const [activeLiveSessionId, setActiveLiveSessionId] = useState<string | null>(null);
  const [liveReturnStep, setLiveReturnStep] = useState<'liveCreate' | 'liveList'>('liveCreate');
  const [editingExistingLive, setEditingExistingLive] = useState(false);
  const [liveReportPlayer, setLiveReportPlayer] = useState<Player | null>(null);
  const [liveReportPlayerId, setLiveReportPlayerId] = useState<string | null>(null);
  const [liveReportSummaryDraft, setLiveReportSummaryDraft] = useState('');
  const [liveReportStrengthsDraft, setLiveReportStrengthsDraft] = useState('');
  const [liveReportWeaknessesDraft, setLiveReportWeaknessesDraft] = useState('');
  const [liveReportClubFitDraft, setLiveReportClubFitDraft] = useState('');
  const [creatingLiveReport, setCreatingLiveReport] = useState(false);
  const [generatingLiveReportDraft, setGeneratingLiveReportDraft] = useState(false);
  const [liveReportDraftProgress, setLiveReportDraftProgress] = useState(0);
  const [feedbackDialogVisible, setFeedbackDialogVisible] = useState(false);
  const [feedbackDialogTitle, setFeedbackDialogTitle] = useState('');
  const [feedbackDialogMessage, setFeedbackDialogMessage] = useState('');
  const [feedbackDialogTone, setFeedbackDialogTone] = useState<FeedbackDialogTone>('success');

  const scoutId = session?.user?.id;

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
        if (!raw) {
          setRecords([]);
          return;
        }
        const parsed = JSON.parse(raw) as ScoutNoteRecord[];
        setRecords(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.warn('Failed to load scout notes.', error);
        setRecords([]);
      } finally {
        setRecordsLoaded(true);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    const loadLiveSessions = async () => {
      try {
        const raw = await AsyncStorage.getItem(LIVE_SESSIONS_STORAGE_KEY);
        if (!raw) {
          setLiveSessions([]);
          return;
        }

        const parsed = JSON.parse(raw) as LiveSession[];
        setLiveSessions(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.warn('Failed to load live sessions.', error);
        setLiveSessions([]);
      } finally {
        setLiveSessionsLoaded(true);
      }
    };

    void loadLiveSessions();
  }, []);

  useEffect(() => {
    return () => {
      if (!recording) return;
      void recording.stopAndUnloadAsync().catch(() => undefined);
    };
  }, [recording]);

  useEffect(() => {
    if (step !== 'live' || !liveRunning || editingExistingLive) return;

    const interval = setInterval(() => {
      setLiveElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [editingExistingLive, liveRunning, step]);

  useEffect(() => {
    if (!generatingLiveReportDraft) {
      setLiveReportDraftProgress(0);
      return;
    }

    setLiveReportDraftProgress(8);

    const interval = setInterval(() => {
      setLiveReportDraftProgress((prev) => {
        if (prev >= 92) return prev;

        if (prev < 40) return Math.min(92, prev + 7);
        if (prev < 70) return Math.min(92, prev + 4);
        return Math.min(92, prev + 2);
      });
    }, 240);

    return () => clearInterval(interval);
  }, [generatingLiveReportDraft]);

  const scoutRecords = useMemo(() => {
    if (!scoutId) return records;
    return records.filter((record) => !record.scoutId || record.scoutId === scoutId);
  }, [records, scoutId]);

  const activeRecord = useMemo(() => {
    if (!activeRecordId) return null;
    return scoutRecords.find((record) => record.id === activeRecordId) ?? null;
  }, [activeRecordId, scoutRecords]);

  const availableLiveTools = useMemo(() => {
    const selectedIds = new Set(liveCounters.map((tool) => tool.id));
    return livePresetTools.filter((tool) => !selectedIds.has(tool.id));
  }, [liveCounters]);

  const scopedLiveSessions = useMemo(() => {
    if (!scoutId) return liveSessions;
    return liveSessions.filter((session) => !session.scoutId || session.scoutId === scoutId);
  }, [liveSessions, scoutId]);

  const reportContextLiveSessions = useMemo(() => {
    if (!liveReportPlayerId) return [];
    return scopedLiveSessions.filter(
      (session) => (session.playerId || session.player?.id || null) === liveReportPlayerId
    );
  }, [liveReportPlayerId, scopedLiveSessions]);

  const reportContextRecords = useMemo(() => {
    if (!liveReportPlayerId) return [];
    return scoutRecords.filter((record) => record.player.id === liveReportPlayerId);
  }, [liveReportPlayerId, scoutRecords]);

  const reportTotalObservationSeconds = useMemo(() => {
    return reportContextLiveSessions.reduce((total, session) => {
      return total + Math.max(0, session.elapsedSeconds || 0);
    }, 0);
  }, [reportContextLiveSessions]);

  const persistRecords = async (next: ScoutNoteRecord[]) => {
    setRecords(next);
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(next));
  };

  const persistLiveSessions = async (next: LiveSession[]) => {
    setLiveSessions(next);
    await AsyncStorage.setItem(LIVE_SESSIONS_STORAGE_KEY, JSON.stringify(next));
  };

  const updateRecord = async (nextRecord: ScoutNoteRecord) => {
    const next = records.map((record) => (record.id === nextRecord.id ? nextRecord : record));
    await persistRecords(next);
  };

  const openMenu = () => {
    setLiveRunning(false);
    setStep('menu');
    setSearchError(null);
  };

  const openLiveObservation = () => {
    setLiveRunning(false);
    setEditingExistingLive(false);
    setLiveSearchError(null);
    setLiveFoundPlayer(null);
    setLiveSessionPlayer(null);
    setLiveNoteDraft('');
    setLiveNotes([]);
    setActiveLiveSessionId(null);
    setStep('liveMenu');
  };

  const openLiveCreateFlow = () => {
    setEditingExistingLive(false);
    setLiveSearchFirstName('');
    setLiveSearchLastName('');
    setLiveSearchError(null);
    setLiveFoundPlayer(null);
    setLiveSessionPlayer(null);
    setLiveNoteDraft('');
    setLiveNotes([]);
    setActiveLiveSessionId(null);
    setStep('liveCreate');
  };

  const openLiveSessionsList = () => {
    setStep('liveList');
  };

  const handleBack = () => {
    if (step === 'grid') return;
    if (step === 'live') {
      setLiveRunning(false);
      setStep(liveReturnStep);
      return;
    }
    if (step === 'liveMenu') {
      setStep('grid');
      return;
    }
    if (step === 'liveReport') {
      setStep('liveList');
      return;
    }
    if (step === 'liveCreate' || step === 'liveList') {
      setStep('liveMenu');
      return;
    }
    if (step === 'menu') {
      setStep('grid');
      return;
    }
    if (step === 'editor') {
      setEditingTextNoteId(null);
      setNoteDraft('');
      setStep(returnStep);
      return;
    }
    setStep('menu');
  };

  const searchLivePlayer = async () => {
    const normalizedFirst = normalizeSearchToken(liveSearchFirstName);
    const normalizedLast = normalizeSearchToken(liveSearchLastName);

    if (!normalizedFirst || !normalizedLast) {
      setLiveSearchError('Entre le prenom et le nom du joueur.');
      return;
    }

    setLiveSearchingPlayer(true);
    setLiveSearchError(null);

    try {
      const players = await apiRequest<ApiPlayer[]>('/players');

      const match = players.find((player) => {
        const pFirst = normalizeSearchToken(player.firstName);
        const pLast = normalizeSearchToken(player.lastName);
        const full = `${pFirst}${pLast}`;
        const input = `${normalizedFirst}${normalizedLast}`;
        const inputSwap = `${normalizedLast}${normalizedFirst}`;

        return (
          (pFirst === normalizedFirst && pLast === normalizedLast) ||
          (pFirst === normalizedLast && pLast === normalizedFirst) ||
          full.includes(input) ||
          full.includes(inputSwap)
        );
      });

      if (!match) {
        setLiveFoundPlayer(null);
        setLiveSearchError('Aucun joueur trouve dans la base.');
        return;
      }

      setLiveFoundPlayer(mapApiPlayer(match));
      setLiveSearchError(null);
    } catch (error) {
      console.warn('Live player search failed.', error);
      setLiveFoundPlayer(null);
      setLiveSearchError('La recherche a echoue. Verifie la connexion API puis reessaie.');
    } finally {
      setLiveSearchingPlayer(false);
    }
  };

  const startLiveDetectionForPlayer = () => {
    if (!liveFoundPlayer) return;

    setEditingExistingLive(false);
    setActiveLiveSessionId(`live-${Date.now()}`);
    setLiveSessionPlayer(liveFoundPlayer);
    setLiveElapsedSeconds(0);
    setLiveCounters([]);
    setLiveEvents([]);
    setLiveNotes([]);
    setLiveNoteDraft('');
    setLiveCustomToolLabel('');
    setLiveRunning(false);
    setLiveReturnStep('liveCreate');
    setStep('live');
  };

  const openLiveSession = (session: LiveSession) => {
    const recoveredPlayer =
      session.player ??
      (session.playerName ? buildFallbackPlayer(session.playerName, session.playerId || session.id) : null);

    setActiveLiveSessionId(session.id);
    setEditingExistingLive(true);
    setLiveSessionPlayer(recoveredPlayer);
    setLiveElapsedSeconds(session.elapsedSeconds || 0);
    setLiveCounters(session.counters || []);
    setLiveEvents(session.events || []);
    setLiveNotes(session.notes || []);
    setLiveNoteDraft('');
    setLiveCustomToolLabel('');
    setLiveRunning(false);
    setLiveReturnStep('liveList');
    setStep('live');
  };

  const deleteLiveSession = async (sessionId: string) => {
    const next = liveSessions.filter((session) => session.id !== sessionId);
    await persistLiveSessions(next);
  };

  const confirmDeleteLiveSession = (sessionId: string) => {
    Alert.alert('Supprimer le live detection', 'Tu veux vraiment supprimer cette session ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void deleteLiveSession(sessionId) }
    ]);
  };

  const openLiveReport = (session: LiveSession) => {
    const resolvedPlayer =
      session.player ??
      (session.playerName ? buildFallbackPlayer(session.playerName, session.playerId || session.id) : null);
    const resolvedPlayerId = session.playerId || session.player?.id || null;

    if (!resolvedPlayer || !resolvedPlayerId) {
      Alert.alert('Joueur manquant', 'Ce live detection ne contient pas de joueur exploitable pour creer un rapport.');
      return;
    }

    setLiveReportPlayer(resolvedPlayer);
    setLiveReportPlayerId(resolvedPlayerId);
    setLiveReportSummaryDraft('');
    setLiveReportStrengthsDraft('');
    setLiveReportWeaknessesDraft('');
    setLiveReportClubFitDraft('');
    setStep('liveReport');
  };

  const submitLiveReport = async () => {
    if (!liveReportPlayer || !liveReportPlayerId) {
      Alert.alert('Joueur manquant', 'Impossible de creer le rapport sans joueur valide.');
      return;
    }

    const summary = liveReportSummaryDraft.trim();
    if (!summary) {
      Alert.alert('Resume requis', 'Ajoute un resume avant denvoyer le rapport.');
      return;
    }

    const strengths = parseMultiline(liveReportStrengthsDraft);
    const weaknesses = parseMultiline(liveReportWeaknessesDraft);
    const clubFit = parseMultiline(liveReportClubFitDraft);

    setCreatingLiveReport(true);

    try {
      await apiRequest('/reports', {
        method: 'POST',
        body: JSON.stringify({
          playerId: liveReportPlayerId,
          authorId: scoutId,
          summary,
          strengths: strengths.length > 0 ? strengths : ['A completer'],
          weaknesses,
          clubFit
        })
      });

      const now = new Date().toISOString();
      const nextRecords = records.map((record) =>
        record.player.id === liveReportPlayerId
          ? {
              ...record,
              lastReportAt: now,
              updatedAt: now
            }
          : record
      );
      await persistRecords(nextRecords);

      Alert.alert('Rapport envoye', 'Le rapport global a bien ete cree.');
      setStep('liveList');
    } catch (error) {
      console.warn('Failed to create live report.', error);
      Alert.alert('Erreur', 'Impossible denvoyer le rapport pour le moment.');
    } finally {
      setCreatingLiveReport(false);
    }
  };

  const openFeedbackDialog = (title: string, message: string, tone: FeedbackDialogTone = 'success') => {
    setFeedbackDialogTitle(title);
    setFeedbackDialogMessage(message);
    setFeedbackDialogTone(tone);
    setFeedbackDialogVisible(true);
  };

  const closeFeedbackDialog = () => {
    setFeedbackDialogVisible(false);
  };

  const generateLiveReportDraftWithAI = async () => {
    if (!liveReportPlayer || !liveReportPlayerId) {
      Alert.alert('Joueur manquant', 'Impossible de generer un brouillon sans joueur valide.');
      return;
    }

    setGeneratingLiveReportDraft(true);

    try {
      const payload = {
        role: session?.user?.role,
        locale: session?.user?.locale,
        player: {
          id: liveReportPlayerId,
          name: liveReportPlayer.name,
          position: liveReportPlayer.position,
          nationality: liveReportPlayer.nationality,
          club: liveReportPlayer.club,
          uroomScore: liveReportPlayer.uroomScore
        },
        observation: {
          liveSessionsCount: reportContextLiveSessions.length,
          totalObservationSeconds: reportTotalObservationSeconds
        },
        liveDetections: reportContextLiveSessions.slice(0, 12).map((entry) => ({
          date: entry.updatedAt || entry.createdAt,
          elapsedSeconds: entry.elapsedSeconds || 0,
          counters: (entry.counters || []).map(summarizeLiveCounterForReport),
          notes: (entry.notes || []).slice(0, 8).map((note) => note.content)
        })),
        scoutNotes: reportContextRecords.slice(0, 12).map((record) => ({
          updatedAt: record.updatedAt,
          textNotes: record.textNotes.slice(0, 8).map((note) => note.content),
          voiceNotesCount: record.voiceNotes.length
        }))
      };

      const response = await aiRequest<LiveReportDraftResponse>('/assistant/report-draft', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setLiveReportSummaryDraft(response.summary ?? '');
      setLiveReportStrengthsDraft((response.strengths || []).join('\n'));
      setLiveReportWeaknessesDraft((response.weaknesses || []).join('\n'));
      setLiveReportClubFitDraft((response.clubFit || []).join('\n'));

      setLiveReportDraftProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 180));

      openFeedbackDialog('Brouillon IA genere', 'Le rapport structure a ete rempli. Tu peux le corriger avant envoi.', 'success');
    } catch (error) {
      console.warn('Failed to generate report draft with IA.', error);
      openFeedbackDialog('Erreur IA', 'Impossible de generer le brouillon pour le moment.', 'error');
    } finally {
      setGeneratingLiveReportDraft(false);
    }
  };

  const addLiveTool = (tool: LivePresetTool) => {
    const nextTool: LiveCounter =
      tool.kind === 'ratio'
        ? {
            id: tool.id,
            label: tool.label,
            kind: 'ratio',
            successValue: 0,
            failedValue: 0,
            successLabel: tool.successLabel ?? 'Reussies',
            failedLabel: tool.failedLabel ?? 'Ratees',
            source: 'preset'
          }
        : {
            id: tool.id,
            label: tool.label,
            kind: 'count',
            value: 0,
            source: 'preset'
          };

    setLiveCounters((prev) => [...prev, nextTool]);
  };

  const addCustomLiveTool = () => {
    const label = liveCustomToolLabel.trim();
    if (!label) return;

    const nextTool: LiveCounter = {
      id: `custom-${Date.now()}`,
      label,
      kind: 'count',
      value: 0,
      source: 'custom'
    };

    setLiveCounters((prev) => [...prev, nextTool]);
    setLiveCustomToolLabel('');
  };

  const removeLiveTool = (toolId: string) => {
    setLiveCounters((prev) => prev.filter((tool) => tool.id !== toolId));
    setLiveEvents((prev) => prev.filter((event) => event.toolId !== toolId));
  };

  const updateLiveCounter = (toolId: string, delta: number) => {
    setLiveCounters((prev) => {
      const target = prev.find((tool) => tool.id === toolId);
      if (!target || target.kind !== 'count') return prev;

      const nextValue = Math.max(0, target.value + delta);
      if (nextValue === target.value) return prev;

      const next = prev.map((tool) =>
        tool.id === toolId ? { ...tool, value: nextValue } : tool
      );

      const nextEvent: LiveEvent = {
        id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        toolId,
        label: target.label,
        delta,
        valueAfter: nextValue,
        elapsedSeconds: liveElapsedSeconds
      };

      setLiveEvents((events) => [nextEvent, ...events].slice(0, 40));

      return next;
    });
  };

  const updateRatioCounter = (toolId: string, mode: 'success' | 'failed', delta: number) => {
    setLiveCounters((prev) => {
      const target = prev.find((tool) => tool.id === toolId);
      if (!target || target.kind !== 'ratio') return prev;

      const currentValue = mode === 'success' ? target.successValue : target.failedValue;
      const nextValue = Math.max(0, currentValue + delta);
      if (nextValue === currentValue) return prev;

      const next = prev.map((tool) => {
        if (tool.id !== toolId || tool.kind !== 'ratio') return tool;

        return mode === 'success'
          ? { ...tool, successValue: nextValue }
          : { ...tool, failedValue: nextValue };
      });

      const nextEvent: LiveEvent = {
        id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        toolId,
        label: `${target.label} - ${mode === 'success' ? target.successLabel : target.failedLabel}`,
        delta,
        valueAfter: nextValue,
        elapsedSeconds: liveElapsedSeconds
      };

      setLiveEvents((events) => [nextEvent, ...events].slice(0, 40));

      return next;
    });
  };

  const resetLiveObservation = () => {
    setLiveRunning(false);
    if (!editingExistingLive) {
      setLiveElapsedSeconds(0);
    }
    setLiveCounters([]);
    setLiveEvents([]);
    setLiveNotes([]);
    setLiveNoteDraft('');
    setLiveCustomToolLabel('');
  };

  const addLiveNote = () => {
    const content = liveNoteDraft.trim();
    if (!content) return;

    const nextNote: LiveTextNote = {
      id: `live-note-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      elapsedSeconds: liveElapsedSeconds
    };

    setLiveNotes((prev) => [nextNote, ...prev]);
    setLiveNoteDraft('');
  };

  const deleteLiveNote = (noteId: string) => {
    setLiveNotes((prev) => prev.filter((note) => note.id !== noteId));
  };

  const saveLiveSession = async () => {
    const sessionId = activeLiveSessionId ?? `live-${Date.now()}`;
    const existing = liveSessions.find((session) => session.id === sessionId);
    const resolvedPlayer = liveSessionPlayer ?? existing?.player ?? null;

    if (liveCounters.length === 0 && liveNotes.length === 0) {
      Alert.alert('Aucune donnee', 'Ajoute au moins une statistique ou une note live avant de sauvegarder la session.');
      return;
    }

    if (!resolvedPlayer && !existing) {
      Alert.alert('Joueur requis', 'Selectionne un joueur avant de sauvegarder cette session live.');
      return;
    }

    const now = new Date().toISOString();

    const sessionSnapshot: LiveSession = {
      id: sessionId,
      scoutId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      player: resolvedPlayer ?? existing?.player,
      playerId: resolvedPlayer?.id ?? existing?.playerId,
      playerName: resolvedPlayer?.name ?? existing?.playerName,
      elapsedSeconds: existing ? existing.elapsedSeconds : liveElapsedSeconds,
      counters: liveCounters,
      events: liveEvents,
      notes: liveNotes
    };

    setSavingLiveSession(true);

    try {
      const next = [sessionSnapshot, ...liveSessions.filter((session) => session.id !== sessionId)].slice(0, 20);

      await persistLiveSessions(next);
      setActiveLiveSessionId(sessionId);
      Alert.alert('Session sauvegardee', existing ? 'La session live a ete mise a jour.' : 'La session live a ete enregistree localement.');
    } catch (error) {
      console.warn('Failed to save live session.', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la session live.');
    } finally {
      setSavingLiveSession(false);
    }
  };

  const handleSearchPlayer = async () => {
    const normalizedFirst = normalizeSearchToken(firstName);
    const normalizedLast = normalizeSearchToken(lastName);

    if (!normalizedFirst || !normalizedLast) {
      setSearchError('Entre le prenom et le nom du joueur.');
      return;
    }

    setSearchingPlayer(true);
    setSearchError(null);

    try {
      const players = await apiRequest<ApiPlayer[]>('/players');

      const match = players.find((player) => {
        const pFirst = normalizeSearchToken(player.firstName);
        const pLast = normalizeSearchToken(player.lastName);
        const full = `${pFirst}${pLast}`;
        const input = `${normalizedFirst}${normalizedLast}`;
        const inputSwap = `${normalizedLast}${normalizedFirst}`;

        return (
          (pFirst === normalizedFirst && pLast === normalizedLast) ||
          (pFirst === normalizedLast && pLast === normalizedFirst) ||
          full.includes(input) ||
          full.includes(inputSwap)
        );
      });

      if (!match) {
        setFoundPlayer(null);
        setSearchError('Aucun joueur trouve dans la base.');
        return;
      }

      setFoundPlayer(mapApiPlayer(match));
      setSearchError(null);
    } catch (error) {
      console.warn('Player search failed in scout flow.', error);
      const details = error instanceof Error ? error.message : '';
      if (details.includes('401')) {
        setSearchError('Session expiree. Reconnecte-toi puis reessaie.');
      } else {
        setSearchError('La recherche a echoue. Verifie la connexion API puis reessaie.');
      }
    } finally {
      setSearchingPlayer(false);
    }
  };

  const createNoteForPlayer = async () => {
    if (!foundPlayer) return;

    const now = new Date().toISOString();
    const newRecord: ScoutNoteRecord = {
      id: `note-${Date.now()}`,
      scoutId,
      player: foundPlayer,
      createdAt: now,
      updatedAt: now,
      textNotes: [],
      voiceNotes: []
    };

    const next = [newRecord, ...records];
    await persistRecords(next);

    setActiveRecordId(newRecord.id);
    setNoteDraft('');
    setEditingTextNoteId(null);
    setReturnStep('create');
    setStep('editor');
  };

  const saveTextNote = async () => {
    if (!activeRecord) return;

    const content = noteDraft.trim();
    if (!content) return;

    const isEditing = Boolean(editingTextNoteId);

    const nextTextNotes = isEditing
      ? activeRecord.textNotes.map((note) =>
          note.id === editingTextNoteId ? { ...note, content } : note
        )
      : [
          {
            id: `text-${Date.now()}`,
            content,
            createdAt: new Date().toISOString()
          },
          ...activeRecord.textNotes
        ];

    const nextRecord: ScoutNoteRecord = {
      ...activeRecord,
      textNotes: nextTextNotes,
      updatedAt: new Date().toISOString()
    };

    await updateRecord(nextRecord);
    setEditingTextNoteId(null);
    setNoteDraft('');
  };

  const startEditingTextNote = (note: ScoutTextNote) => {
    setEditingTextNoteId(note.id);
    setNoteDraft(note.content);
  };

  const cancelEditingTextNote = () => {
    setEditingTextNoteId(null);
    setNoteDraft('');
  };

  const deleteTextNote = async (noteId: string) => {
    if (!activeRecord) return;

    const nextRecord: ScoutNoteRecord = {
      ...activeRecord,
      textNotes: activeRecord.textNotes.filter((note) => note.id !== noteId),
      updatedAt: new Date().toISOString()
    };

    await updateRecord(nextRecord);

    if (editingTextNoteId === noteId) {
      setEditingTextNoteId(null);
      setNoteDraft('');
    }
  };

  const confirmDeleteTextNote = (noteId: string) => {
    Alert.alert('Supprimer la note', 'Tu veux vraiment supprimer cette note texte ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void deleteTextNote(noteId) }
    ]);
  };

  const deleteVoiceNote = async (voiceNoteId: string) => {
    if (!activeRecord) return;

    const nextRecord: ScoutNoteRecord = {
      ...activeRecord,
      voiceNotes: activeRecord.voiceNotes.filter((voice) => voice.id !== voiceNoteId),
      updatedAt: new Date().toISOString()
    };

    await updateRecord(nextRecord);
  };

  const confirmDeleteVoiceNote = (voiceNoteId: string) => {
    Alert.alert('Supprimer la note vocale', 'Tu veux vraiment supprimer cette note vocale ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void deleteVoiceNote(voiceNoteId) }
    ]);
  };

  const deleteRecord = async (recordId: string) => {
    const next = records.filter((record) => record.id !== recordId);
    await persistRecords(next);

    if (activeRecordId === recordId) {
      setActiveRecordId(null);
      setEditingTextNoteId(null);
      setNoteDraft('');
      setStep('list');
    }
  };

  const confirmDeleteRecord = (recordId: string) => {
    Alert.alert('Supprimer la fiche', 'Cette action supprime toutes les notes de ce joueur. Continuer ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void deleteRecord(recordId) }
    ]);
  };

  const startVoiceRecording = async () => {
    if (!activeRecord) {
      Alert.alert('Selection requise', 'Cree ou ouvre une note avant lenregistrement vocal.');
      return;
    }

    const audio = getExpoAudioModule();
    if (!audio) {
      Alert.alert(
        'Audio indisponible',
        'Le module audio natif nest pas charge. Lance npx expo run:ios ou npx expo run:android puis redemarre le client.'
      );
      return;
    }

    try {
      const permission = await audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission micro', 'Active le micro pour enregistrer une note vocale.');
        return;
      }

      await audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });

      const nextRecording = new audio.Recording();
      await nextRecording.prepareToRecordAsync(audio.RecordingOptionsPresets.HIGH_QUALITY);
      await nextRecording.startAsync();

      setRecording(nextRecording);
      setIsRecording(true);
    } catch (error) {
      console.warn('Failed to start voice recording.', error);
      Alert.alert('Erreur', 'Impossible de demarrer lenregistrement vocal.');
    }
  };

  const stopVoiceRecording = async () => {
    if (!recording || !activeRecord) return;

    try {
      const current = recording;
      await current.stopAndUnloadAsync();
      const status = await current.getStatusAsync();
      const uri = current.getURI();

      if (!uri) {
        throw new Error('Recording uri is missing');
      }

      const nextVoiceNote: ScoutVoiceNote = {
        id: `voice-${Date.now()}`,
        uri,
        durationMs: status.durationMillis ?? undefined,
        createdAt: new Date().toISOString()
      };

      const nextRecord: ScoutNoteRecord = {
        ...activeRecord,
        voiceNotes: [nextVoiceNote, ...activeRecord.voiceNotes],
        updatedAt: new Date().toISOString()
      };

      await updateRecord(nextRecord);
    } catch (error) {
      console.warn('Failed to stop voice recording.', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder cette note vocale.');
    } finally {
      setRecording(null);
      setIsRecording(false);
    }
  };

  const createReport = async () => {
    if (!activeRecord) return;

    setCreatingReport(true);

    try {
      const summary =
        activeRecord.textNotes[0]?.content || `Rapport scout mobile pour ${activeRecord.player.name}`;
      const strengths = activeRecord.textNotes.slice(0, 3).map((note) => note.content.slice(0, 140));
      const weaknesses = activeRecord.textNotes.slice(3, 6).map((note) => note.content.slice(0, 140));
      const clubFit = [
        `Poste: ${activeRecord.player.position}`,
        `Nationalite: ${activeRecord.player.nationality}`,
        `Score potentiel: ${activeRecord.player.uroomScore}`
      ];

      await apiRequest('/reports', {
        method: 'POST',
        body: JSON.stringify({
          playerId: activeRecord.player.id,
          authorId: scoutId,
          summary,
          strengths: strengths.length > 0 ? strengths : ['A completer'],
          weaknesses,
          clubFit
        })
      });

      const nextRecord: ScoutNoteRecord = {
        ...activeRecord,
        lastReportAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await updateRecord(nextRecord);
      Alert.alert('Rapport cree', 'Le rapport a bien ete cree.');
    } catch (error) {
      console.warn('Failed to create scout report.', error);
      Alert.alert('Erreur', 'Impossible de creer le rapport pour le moment.');
    } finally {
      setCreatingReport(false);
    }
  };

  const openExistingRecord = (recordId: string) => {
    setActiveRecordId(recordId);
    setNoteDraft('');
    setEditingTextNoteId(null);
    setReturnStep('list');
    setStep('editor');
  };

  const renderBackHeader = (title: string, subtitle: string) => {
    return (
      <View style={styles.backHeader}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.85}>
          <Feather name="chevron-left" size={18} color={colors.light} />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.flowTitle}>{title}</Text>
        <Text style={styles.flowSubtitle}>{subtitle}</Text>
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {step === 'grid' ? (
          <>
            <SectionHeader title="Outils Scout" subtitle="Capture et analyse les performances en temps réel" />
            <Image 
              source={require('../../assets/icon_uroomAnalytics.png')} 
              style={styles.uroomLogo}
              resizeMode="contain"
            />

            <View style={styles.toolsContainer}>
              {/* Détection Live */}
              <TouchableOpacity 
                style={[styles.toolCard, styles.liveToolCard]} 
                activeOpacity={0.8} 
                onPress={openLiveObservation}
              >
                <View style={styles.toolIconContainer}>
                  <Feather name="activity" size={32} color="#2DD4BF" />
                </View>
                <View style={styles.toolContent}>
                  <View style={styles.toolHeader}>
                    <Text style={styles.toolBadge}>LIVE</Text>
                    <Text style={styles.toolTitle}>Détection Live</Text>
                  </View>
                  <Text style={styles.toolDescription}>
                    Capturez les statistiques et performances en temps réel pendant le match
                  </Text>
                  <View style={styles.toolFeatures}>
                    <View style={styles.featureItem}>
                      <Feather name="clock" size={14} color="#2DD4BF" />
                      <Text style={styles.featureText}>Chronomètre</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Feather name="bar-chart-2" size={14} color="#2DD4BF" />
                      <Text style={styles.featureText}>Compteurs</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Feather name="edit-3" size={14} color="#2DD4BF" />
                      <Text style={styles.featureText}>Notes instantanées</Text>
                    </View>
                  </View>
                </View>
                <Feather name="chevron-right" size={24} color={colors.gray[400]} style={styles.toolArrow} />
              </TouchableOpacity>

              {/* Notes & Rapport */}
              <TouchableOpacity 
                style={[styles.toolCard, styles.scoutToolCard]} 
                activeOpacity={0.8} 
                onPress={openMenu}
              >
                <View style={styles.toolIconContainer}>
                  <Feather name="file-text" size={32} color="#38BDF8" />
                </View>
                <View style={styles.toolContent}>
                  <View style={styles.toolHeader}>
                    <Text style={[styles.toolBadge, styles.scoutBadge]}>SCOUT</Text>
                    <Text style={styles.toolTitle}>Notes & Rapport</Text>
                  </View>
                  <Text style={styles.toolDescription}>
                    Créez des fiches d'observation détaillées avec notes texte, vocales et rapport IA
                  </Text>
                  <View style={styles.toolFeatures}>
                    <View style={styles.featureItem}>
                      <Feather name="type" size={14} color="#38BDF8" />
                      <Text style={styles.featureText}>Notes texte</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Feather name="mic" size={14} color="#38BDF8" />
                      <Text style={styles.featureText}>Notes vocales</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Feather name="zap" size={14} color="#38BDF8" />
                      <Text style={styles.featureText}>Rapport IA</Text>
                    </View>
                  </View>
                </View>
                <Feather name="chevron-right" size={24} color={colors.gray[400]} style={styles.toolArrow} />
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {step === 'live' ? (
          <View style={styles.panel}>
            {renderBackHeader('Live Detection', 'Ajoute des outils statistiques et capte la performance en direct.')}

            {liveSessionPlayer ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Joueur suivi</Text>
                <PlayerCard player={liveSessionPlayer} />
              </View>
            ) : null}

            <View style={styles.liveTimerCard}>
              <Text style={styles.liveTimerLabel}>Temps live</Text>
              <Text style={styles.liveTimerValue}>{formatElapsed(liveElapsedSeconds)}</Text>

              {editingExistingLive ? <Text style={styles.liveLockedHint}>Temps verrouille pour une session existante.</Text> : null}

              <View style={styles.liveTimerActions}>
                {!editingExistingLive ? (
                  <TouchableOpacity
                    style={[styles.liveControlBtn, liveRunning ? styles.livePauseBtn : styles.livePlayBtn]}
                    onPress={() => setLiveRunning((prev) => !prev)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.liveControlBtnText}>{liveRunning ? 'Pause' : liveElapsedSeconds > 0 ? 'Reprendre' : 'Demarrer'}</Text>
                  </TouchableOpacity>
                ) : null}
                {!editingExistingLive ? (
                  <TouchableOpacity style={styles.liveResetBtn} onPress={resetLiveObservation} activeOpacity={0.85}>
                    <Text style={styles.liveResetBtnText}>Reset</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.liveSaveBtn, editingExistingLive ? styles.liveSaveBtnFull : null]}
                  onPress={saveLiveSession}
                  disabled={savingLiveSession}
                  activeOpacity={0.85}
                >
                  {savingLiveSession ? <ActivityIndicator color={colors.white} /> : <Text style={styles.liveSaveBtnText}>Sauvegarder</Text>}
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Ajouter un outil statistique</Text>
            <View style={styles.toolChipsWrap}>
              {availableLiveTools.map((tool) => (
                <TouchableOpacity
                  key={tool.id}
                  style={styles.toolChip}
                  onPress={() => addLiveTool(tool)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.toolChipText}>{tool.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.customToolRow}>
              <TextInput
                value={liveCustomToolLabel}
                onChangeText={setLiveCustomToolLabel}
                placeholder="Ex: Centres reussis"
                placeholderTextColor={colors.gray[400]}
                style={styles.input}
              />
              <TouchableOpacity style={styles.customToolAddBtn} onPress={addCustomLiveTool} activeOpacity={0.85}>
                <Text style={styles.customToolAddText}>Ajouter</Text>
              </TouchableOpacity>
            </View>

            {liveCounters.length === 0 ? (
              <Text style={styles.emptyText}>Ajoute un outil pour commencer le comptage live.</Text>
            ) : (
              <View style={styles.liveCountersList}>
                {liveCounters.map((tool) => (
                  <View key={tool.id} style={styles.liveCounterCard}>
                    <View style={styles.liveCounterHeader}>
                      <Text style={styles.liveCounterTitle}>{tool.label}</Text>
                      <TouchableOpacity onPress={() => removeLiveTool(tool.id)} activeOpacity={0.85}>
                        <Feather name="x" size={16} color={colors.gray[300]} />
                      </TouchableOpacity>
                    </View>

                    {tool.kind === 'ratio' ? (
                      <>
                        <View style={styles.passRatioRow}>
                          <Text style={styles.passRatioLabel}>{tool.successLabel}</Text>
                          <View style={styles.passRatioControls}>
                            <TouchableOpacity
                              style={styles.liveCounterAdjustBtn}
                              onPress={() => updateRatioCounter(tool.id, 'success', -1)}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.liveCounterAdjustText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.passRatioValue}>{tool.successValue}</Text>
                            <TouchableOpacity
                              style={styles.liveCounterAdjustBtn}
                              onPress={() => updateRatioCounter(tool.id, 'success', 1)}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.liveCounterAdjustText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.passRatioRow}>
                          <Text style={styles.passRatioLabel}>{tool.failedLabel}</Text>
                          <View style={styles.passRatioControls}>
                            <TouchableOpacity
                              style={styles.liveCounterAdjustBtn}
                              onPress={() => updateRatioCounter(tool.id, 'failed', -1)}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.liveCounterAdjustText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.passRatioValue}>{tool.failedValue}</Text>
                            <TouchableOpacity
                              style={styles.liveCounterAdjustBtn}
                              onPress={() => updateRatioCounter(tool.id, 'failed', 1)}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.liveCounterAdjustText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.passRatioInsightRow}>
                          <Text style={styles.passRatioInsightText}>
                            {tool.label}: {tool.successValue + tool.failedValue > 0
                              ? `${Math.round((tool.successValue / (tool.successValue + tool.failedValue)) * 100)}%`
                              : '--'}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.liveCounterActions}>
                        <TouchableOpacity style={styles.liveCounterAdjustBtn} onPress={() => updateLiveCounter(tool.id, -1)} activeOpacity={0.85}>
                          <Text style={styles.liveCounterAdjustText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.liveCounterValue}>{tool.value}</Text>
                        <TouchableOpacity style={styles.liveCounterAdjustBtn} onPress={() => updateLiveCounter(tool.id, 1)} activeOpacity={0.85}>
                          <Text style={styles.liveCounterAdjustText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>Notes live</Text>
            <TextInput
              value={liveNoteDraft}
              onChangeText={setLiveNoteDraft}
              placeholder="Ecris une observation pendant le live..."
              placeholderTextColor={colors.gray[400]}
              multiline
              style={styles.noteInput}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={addLiveNote} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Ajouter la note live</Text>
            </TouchableOpacity>

            {liveNotes.length === 0 ? (
              <Text style={styles.emptyText}>Aucune note live pour le moment.</Text>
            ) : (
              <View style={styles.notesList}>
                {liveNotes.map((note) => (
                  <View key={note.id} style={styles.noteItem}>
                    <Text style={styles.noteDate}>
                      {formatElapsed(note.elapsedSeconds)} | {formatDate(note.createdAt)}
                    </Text>
                    <Text style={styles.noteContent}>{note.content}</Text>
                    <TouchableOpacity
                      style={styles.deleteNoteBtn}
                      onPress={() => deleteLiveNote(note.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.deleteNoteBtnText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {step === 'menu' ? (
          <View style={styles.panel}>
            {renderBackHeader('Notes scout', 'Choisis entre une nouvelle note ou la liste existante.')}

            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('create')} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Creer une nouvelle note</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('list')} activeOpacity={0.85}>
              <Text style={styles.secondaryBtnText}>Acceder aux notes existantes</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 'liveMenu' ? (
          <View style={styles.panel}>
            {renderBackHeader('Live detection', 'Choisis une nouvelle detection ou une session existante.')}

            <TouchableOpacity style={styles.primaryBtn} onPress={openLiveCreateFlow} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Demarrer une nouvelle detection</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={openLiveSessionsList} activeOpacity={0.85}>
              <Text style={styles.secondaryBtnText}>Voir les detections existantes</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 'liveCreate' ? (
          <View style={styles.panel}>
            {renderBackHeader('Nouvelle detection live', 'Identifie le joueur avant de lancer le suivi.')}

            <View style={styles.inputRow}>
              <TextInput
                value={liveSearchFirstName}
                onChangeText={setLiveSearchFirstName}
                placeholder="Prenom"
                placeholderTextColor={colors.gray[400]}
                style={styles.input}
              />
              <TextInput
                value={liveSearchLastName}
                onChangeText={setLiveSearchLastName}
                placeholder="Nom"
                placeholderTextColor={colors.gray[400]}
                style={styles.input}
              />
            </View>

            <TouchableOpacity style={styles.searchBtn} onPress={searchLivePlayer} activeOpacity={0.85}>
              {liveSearchingPlayer ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.searchBtnText}>Rechercher ce joueur</Text>
              )}
            </TouchableOpacity>

            {liveSearchError ? <Text style={styles.errorText}>{liveSearchError}</Text> : null}

            {liveSearchError && liveSearchError.includes('Aucun joueur trouve') && session?.user?.role === 'SCOUT' ? (
              <TouchableOpacity 
                style={styles.createPlayerBtn} 
                onPress={() => {
                  setCreatePlayerContext('live');
                  setShowCreatePlayerModal(true);
                }} 
                activeOpacity={0.85}
              >
                <Text style={styles.createPlayerBtnText}>Créer le profil de ce joueur</Text>
              </TouchableOpacity>
            ) : null}

            {liveFoundPlayer ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Profil trouve</Text>
                <PlayerCard player={liveFoundPlayer} />
                <TouchableOpacity style={styles.primaryBtn} onPress={startLiveDetectionForPlayer} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>Demarrer live detection pour {liveFoundPlayer.name}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        {step === 'liveList' ? (
          <View style={styles.panel}>
            {renderBackHeader('Detections live', 'Rouvre une session pour continuer ou corriger les statistiques.')}

            {!liveSessionsLoaded ? <ActivityIndicator color={colors.secondary} /> : null}

            {liveSessionsLoaded && scopedLiveSessions.length === 0 ? (
              <Text style={styles.emptyText}>Aucune session live enregistree.</Text>
            ) : null}

            {scopedLiveSessions.map((session) => (
              <View key={session.id} style={styles.noteRecordCard}>
                <Text style={styles.noteRecordTitle}>{session.playerName || session.player?.name || 'Joueur non renseigne'}</Text>
                <Text style={styles.noteRecordMeta}>Duree: {formatElapsed(session.elapsedSeconds || 0)}</Text>
                <Text style={styles.noteRecordMeta}>Outils: {session.counters?.length || 0}</Text>
                <Text style={styles.noteRecordMeta}>Notes: {session.notes?.length || 0}</Text>
                <Text style={styles.noteRecordMeta}>Mise a jour: {formatDate(session.updatedAt || session.createdAt)}</Text>

                <View style={styles.noteRecordActions}>
                  <TouchableOpacity
                    style={styles.noteRecordOpenBtn}
                    onPress={() => openLiveSession(session)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.noteRecordOpenText}>Ouvrir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.noteRecordReportBtn}
                    onPress={() => openLiveReport(session)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.noteRecordReportText}>Creer rapport</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.noteRecordDeleteBtn}
                    onPress={() => confirmDeleteLiveSession(session.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.noteRecordDeleteText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {step === 'liveReport' && liveReportPlayer ? (
          <View style={styles.panel}>
            {renderBackHeader('Rapport global', 'Utilise tes lives et notes du joueur pour rediger un rapport complet.')}

            <Text style={styles.sectionLabel}>Joueur</Text>
            <PlayerCard player={liveReportPlayer} />

            <Text style={styles.sectionLabel}>Contexte live detection ({reportContextLiveSessions.length})</Text>
            <Text style={styles.observationSummaryText}>
              Temps total observe: {Math.floor(reportTotalObservationSeconds / 60)} min ({formatElapsed(reportTotalObservationSeconds)})
            </Text>
            {reportContextLiveSessions.length === 0 ? (
              <Text style={styles.emptyText}>Aucune session live disponible pour ce joueur.</Text>
            ) : (
              <View style={styles.notesList}>
                {reportContextLiveSessions.map((session) => (
                  <View key={session.id} style={styles.noteItem}>
                    <Text style={styles.noteDate}>Live du {formatDate(session.updatedAt || session.createdAt)}</Text>
                    <Text style={styles.noteContent}>
                      Duree {formatElapsed(session.elapsedSeconds || 0)} | Outils {session.counters?.length || 0} | Notes {session.notes?.length || 0}
                    </Text>
                    {session.notes?.slice(0, 3).map((note) => (
                      <Text key={note.id} style={styles.reportContextLine}>
                        [{formatElapsed(note.elapsedSeconds)}] {note.content.slice(0, 160)}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>Notes liees ({reportContextRecords.length})</Text>
            {reportContextRecords.length === 0 ? (
              <Text style={styles.emptyText}>Aucune fiche scout texte/vocale pour ce joueur.</Text>
            ) : (
              <View style={styles.notesList}>
                {reportContextRecords.map((record) => (
                  <View key={record.id} style={styles.noteItem}>
                    <Text style={styles.noteDate}>Fiche mise a jour: {formatDate(record.updatedAt)}</Text>
                    <Text style={styles.noteContent}>
                      {record.textNotes.length} note(s) texte | {record.voiceNotes.length} note(s) vocale(s)
                    </Text>
                    {record.textNotes.slice(0, 3).map((note) => (
                      <Text key={note.id} style={styles.reportContextLine}>- {note.content.slice(0, 160)}</Text>
                    ))}
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.aiDraftBtn, generatingLiveReportDraft ? styles.aiDraftBtnLoading : null]}
              onPress={generateLiveReportDraftWithAI}
              activeOpacity={0.85}
              disabled={generatingLiveReportDraft}
            >
              {generatingLiveReportDraft ? (
                <View style={styles.aiDraftProgressWrap}>
                  <Text style={styles.aiDraftBtnText}>Generation IA... {liveReportDraftProgress}%</Text>
                  <View style={styles.aiDraftProgressTrack}>
                    <View style={[styles.aiDraftProgressFill, { width: `${liveReportDraftProgress}%` }]} />
                  </View>
                </View>
              ) : (
                <Text style={styles.aiDraftBtnText}>Generer avec Uroom Scout IA</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>Resume</Text>
            <TextInput
              value={liveReportSummaryDraft}
              onChangeText={setLiveReportSummaryDraft}
              placeholder="Resume global du joueur..."
              placeholderTextColor={colors.gray[400]}
              multiline
              style={styles.noteInput}
            />

            <Text style={styles.sectionLabel}>Forces (1 ligne = 1 point)</Text>
            <TextInput
              value={liveReportStrengthsDraft}
              onChangeText={setLiveReportStrengthsDraft}
              placeholder="Ex: Bonne lecture du jeu"
              placeholderTextColor={colors.gray[400]}
              multiline
              style={styles.noteInput}
            />

            <Text style={styles.sectionLabel}>Faiblesses (1 ligne = 1 point)</Text>
            <TextInput
              value={liveReportWeaknessesDraft}
              onChangeText={setLiveReportWeaknessesDraft}
              placeholder="Ex: Perd des duels aeriens"
              placeholderTextColor={colors.gray[400]}
              multiline
              style={styles.noteInput}
            />

            <Text style={styles.sectionLabel}>Fit club (1 ligne = 1 point)</Text>
            <TextInput
              value={liveReportClubFitDraft}
              onChangeText={setLiveReportClubFitDraft}
              placeholder="Ex: Profil adapte a un pressing haut"
              placeholderTextColor={colors.gray[400]}
              multiline
              style={styles.noteInput}
            />

            <TouchableOpacity style={styles.reportBtn} onPress={submitLiveReport} activeOpacity={0.85}>
              {creatingLiveReport ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.reportBtnText}>Envoyer le rapport au staff</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 'create' ? (
          <View style={styles.panel}>
            {renderBackHeader('Nouvelle note', 'Entre prenom et nom du joueur pour le retrouver.')}

            <View style={styles.inputRow}>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Prenom"
                placeholderTextColor={colors.gray[400]}
                style={styles.input}
              />
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Nom"
                placeholderTextColor={colors.gray[400]}
                style={styles.input}
              />
            </View>

            <TouchableOpacity style={styles.searchBtn} onPress={handleSearchPlayer} activeOpacity={0.85}>
              {searchingPlayer ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.searchBtnText}>Rechercher ce joueur</Text>
              )}
            </TouchableOpacity>

            {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}

            {searchError && searchError.includes('Aucun joueur trouve') && session?.user?.role === 'SCOUT' ? (
              <TouchableOpacity 
                style={styles.createPlayerBtn} 
                onPress={() => {
                  setCreatePlayerContext('normal');
                  setShowCreatePlayerModal(true);
                }} 
                activeOpacity={0.85}
              >
                <Text style={styles.createPlayerBtnText}>Créer le profil de ce joueur</Text>
              </TouchableOpacity>
            ) : null}

            {foundPlayer ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Profil trouve</Text>
                <PlayerCard player={foundPlayer} />
                <TouchableOpacity style={styles.primaryBtn} onPress={createNoteForPlayer} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>Creer une note sur ce joueur</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        {step === 'list' ? (
          <View style={styles.panel}>
            {renderBackHeader('Notes existantes', 'Retrouve toutes les notes liees a tes joueurs.')}

            {!recordsLoaded ? <ActivityIndicator color={colors.secondary} /> : null}

            {recordsLoaded && scoutRecords.length === 0 ? (
              <Text style={styles.emptyText}>Aucune note pour le moment.</Text>
            ) : null}

            {scoutRecords.map((record) => (
              <View key={record.id} style={styles.noteRecordCard}>
                <Text style={styles.noteRecordTitle}>{record.player.name}</Text>
                <Text style={styles.noteRecordMeta}>
                  {record.player.position} | {record.textNotes.length} note(s) texte | {record.voiceNotes.length} note(s) vocale(s)
                </Text>
                <Text style={styles.noteRecordMeta}>Mise a jour: {formatDate(record.updatedAt)}</Text>
                {record.lastReportAt ? (
                  <Text style={styles.noteRecordMeta}>Dernier rapport: {formatDate(record.lastReportAt)}</Text>
                ) : null}

                <View style={styles.noteRecordActions}>
                  <TouchableOpacity
                    style={styles.noteRecordOpenBtn}
                    onPress={() => openExistingRecord(record.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.noteRecordOpenText}>Ouvrir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.noteRecordDeleteBtn}
                    onPress={() => confirmDeleteRecord(record.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.noteRecordDeleteText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {step === 'editor' && activeRecord ? (
          <View style={styles.panel}>
            {renderBackHeader('Edition note joueur', 'Ajoute des notes texte, vocales et cree un rapport.')}

            <Text style={styles.sectionLabel}>Joueur</Text>
            <PlayerCard player={activeRecord.player} />

            <Text style={styles.sectionLabel}>{editingTextNoteId ? 'Modifier la note texte' : 'Nouvelle note texte'}</Text>
            <TextInput
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="Ecris ton observation..."
              placeholderTextColor={colors.gray[400]}
              multiline
              style={styles.noteInput}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={saveTextNote} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>{editingTextNoteId ? 'Mettre a jour la note' : 'Sauvegarder la note'}</Text>
            </TouchableOpacity>
            {editingTextNoteId ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={cancelEditingTextNote} activeOpacity={0.85}>
                <Text style={styles.secondaryBtnText}>Annuler la modification</Text>
              </TouchableOpacity>
            ) : null}

            {activeRecord.textNotes.length > 0 ? (
              <View style={styles.notesList}>
                {activeRecord.textNotes.map((note) => (
                  <View key={note.id} style={styles.noteItem}>
                    <Text style={styles.noteDate}>{formatDate(note.createdAt)}</Text>
                    <Text style={styles.noteContent}>{note.content}</Text>
                    <TouchableOpacity
                      style={styles.editNoteBtn}
                      onPress={() => startEditingTextNote(note)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.editNoteBtnText}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteNoteBtn}
                      onPress={() => confirmDeleteTextNote(note.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.deleteNoteBtnText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>Aucune note texte enregistree.</Text>
            )}

            <Text style={styles.sectionLabel}>Note vocale</Text>
            <TouchableOpacity
              style={[styles.voiceBtn, isRecording ? styles.voiceBtnActive : null]}
              onPress={isRecording ? stopVoiceRecording : startVoiceRecording}
              activeOpacity={0.85}
            >
              <Text style={styles.voiceBtnText}>{isRecording ? 'Stop et sauvegarder' : 'Enregistrer une note vocale'}</Text>
            </TouchableOpacity>

            {activeRecord.voiceNotes.length > 0 ? (
              <View style={styles.notesList}>
                {activeRecord.voiceNotes.map((voice) => (
                  <View key={voice.id} style={styles.noteItem}>
                    <Text style={styles.noteDate}>{formatDate(voice.createdAt)}</Text>
                    <Text style={styles.noteContent}>Audio sauvegarde ({formatDuration(voice.durationMs)})</Text>
                    <TouchableOpacity
                      style={styles.deleteNoteBtn}
                      onPress={() => confirmDeleteVoiceNote(voice.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.deleteNoteBtnText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>Aucune note vocale enregistree.</Text>
            )}

            <TouchableOpacity style={styles.reportBtn} onPress={createReport} activeOpacity={0.85}>
              {creatingReport ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.reportBtnText}>Creer un rapport</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.notice}>
          <View style={styles.noticeIcon}>
            <Feather name="wifi-off" size={20} color={colors.secondary} />
          </View>
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Mode Hors Ligne</Text>
            <Text style={styles.noticeText}>
              Toutes vos données sont sauvegardées localement. Travaillez partout, synchronisez plus tard.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={feedbackDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={closeFeedbackDialog}
      >
        <View style={styles.feedbackDialogOverlay}>
          <View
            style={[
              styles.feedbackDialogCard,
              feedbackDialogTone === 'success' ? styles.feedbackDialogSuccessCard : styles.feedbackDialogErrorCard
            ]}
          >
            <Text style={styles.feedbackDialogTitle}>{feedbackDialogTitle}</Text>
            <Text style={styles.feedbackDialogMessage}>{feedbackDialogMessage}</Text>
            <TouchableOpacity
              style={[
                styles.feedbackDialogBtn,
                feedbackDialogTone === 'success' ? styles.feedbackDialogSuccessBtn : styles.feedbackDialogErrorBtn
              ]}
              onPress={closeFeedbackDialog}
              activeOpacity={0.85}
            >
              <Text style={styles.feedbackDialogBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCreatePlayerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.createPlayerModalContainer}>
          <CreatePlayerForm
            onPlayerCreated={(newPlayer: Player) => {
              if (createPlayerContext === 'live') {
                setLiveFoundPlayer(newPlayer);
                setLiveSearchError(null);
              } else {
                setFoundPlayer(newPlayer);
                setSearchError(null);
              }
              setShowCreatePlayerModal(false);
            }}
            onCancel={() => setShowCreatePlayerModal(false)}
          />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxl
  },
  uroomLogo: {
    width: 56,
    height: 56,
    position: 'absolute',
    top: 0,
    right: 0
  },
  toolsContainer: {
    gap: spacing.lg,
    marginTop: spacing.md
  },
  toolCard: {
    backgroundColor: colors.dark,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.gray[600],
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 140,
    position: 'relative'
  },
  liveToolCard: {
    borderColor: '#2DD4BF',
    backgroundColor: '#0A1F26'
  },
  scoutToolCard: {
    borderColor: '#38BDF8',
    backgroundColor: '#0F1E2E'
  },
  toolIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  toolContent: {
    flex: 1,
    paddingRight: spacing.md
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm
  },
  toolBadge: {
    backgroundColor: '#2DD4BF',
    color: '#0A1F26',
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden'
  },
  scoutBadge: {
    backgroundColor: '#38BDF8',
    color: '#0F1E2E'
  },
  toolTitle: {
    color: colors.light,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold
  },
  toolDescription: {
    color: colors.gray[300],
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginBottom: spacing.sm
  },
  toolFeatures: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap'
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  featureText: {
    color: colors.gray[400],
    fontSize: 11,
    fontFamily: typography.fontFamily.medium
  },
  toolArrow: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md
  },
  panel: {
    marginTop: spacing.md,
    backgroundColor: colors.dark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray[600],
    padding: spacing.lg,
    gap: spacing.sm
  },
  backHeader: {
    marginBottom: spacing.sm
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs
  },
  backText: {
    color: colors.light,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold
  },
  flowTitle: {
    color: colors.light,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold,
    marginTop: spacing.xs
  },
  flowSubtitle: {
    color: colors.gray[300],
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs
  },
  primaryBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2DD4BF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm
  },
  primaryBtnText: {
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.sm
  },
  secondaryBtn: {
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm
  },
  secondaryBtnText: {
    color: colors.light,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.sm
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  input: {
    flex: 1,
    backgroundColor: colors.primary,
    borderColor: colors.gray[600],
    borderWidth: 1,
    borderRadius: 12,
    color: colors.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  searchBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm
  },
  searchBtnText: {
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.sm
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.xs,
    fontSize: typography.sizes.sm
  },
  createPlayerBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.md
  },
  createPlayerBtnText: {
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.sm
  },
  sectionBlock: {
    marginTop: spacing.md
  },
  liveTimerCard: {
    marginTop: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F365F',
    backgroundColor: '#101A2D',
    padding: spacing.md
  },
  liveTimerLabel: {
    color: colors.gray[300],
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold
  },
  liveTimerValue: {
    color: colors.light,
    fontSize: 34,
    fontFamily: typography.fontFamily.bold,
    marginTop: spacing.xs
  },
  liveTimerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  liveLockedHint: {
    color: colors.gray[300],
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs
  },
  liveControlBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm
  },
  livePlayBtn: {
    backgroundColor: colors.secondary
  },
  livePauseBtn: {
    backgroundColor: '#1D4ED8'
  },
  liveControlBtnText: {
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.xs
  },
  liveResetBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray[500],
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md
  },
  liveResetBtnText: {
    color: colors.gray[100],
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.xs
  },
  liveSaveBtn: {
    borderRadius: 10,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md
  },
  liveSaveBtnFull: {
    flex: 1
  },
  liveSaveBtnText: {
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.xs
  },
  toolChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  toolChip: {
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.45)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  toolChipText: {
    color: colors.light,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold
  },
  customToolRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  customToolAddBtn: {
    borderRadius: 10,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md
  },
  customToolAddText: {
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.xs
  },
  liveCountersList: {
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  liveCounterCard: {
    backgroundColor: '#101A2D',
    borderColor: '#1F365F',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md
  },
  liveCounterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  liveCounterTitle: {
    color: colors.light,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.sm,
    flexShrink: 1,
    paddingRight: spacing.sm
  },
  liveCounterActions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  liveCounterAdjustBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: colors.gray[500],
    alignItems: 'center',
    justifyContent: 'center'
  },
  liveCounterAdjustText: {
    color: colors.light,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold
  },
  liveCounterValue: {
    color: colors.secondary,
    fontSize: 30,
    fontFamily: typography.fontFamily.bold
  },
  passRatioRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  passRatioLabel: {
    color: colors.light,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    flexShrink: 1
  },
  passRatioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  passRatioValue: {
    color: colors.secondary,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.bold,
    minWidth: 28,
    textAlign: 'center'
  },
  passRatioInsightRow: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#1F365F',
    paddingTop: spacing.sm
  },
  passRatioInsightText: {
    color: colors.gray[100],
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold
  },
  sectionLabel: {
    color: colors.secondary,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
    marginTop: spacing.sm
  },
  noteRecordCard: {
    marginTop: spacing.sm,
    backgroundColor: '#101A2D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F365F',
    padding: spacing.md
  },
  noteRecordTitle: {
    color: colors.light,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.md
  },
  noteRecordMeta: {
    color: colors.gray[300],
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs
  },
  noteRecordActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  noteRecordOpenBtn: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.45)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs
  },
  noteRecordOpenText: {
    color: colors.light,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold
  },
  noteRecordReportBtn: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(29, 78, 216, 0.18)',
    borderColor: 'rgba(96, 165, 250, 0.55)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs
  },
  noteRecordReportText: {
    color: '#DBEAFE',
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold
  },
  noteRecordDeleteBtn: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(220, 38, 38, 0.18)',
    borderColor: 'rgba(220, 38, 38, 0.5)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs
  },
  noteRecordDeleteText: {
    color: '#FECACA',
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold
  },
  noteInput: {
    minHeight: 110,
    textAlignVertical: 'top',
    backgroundColor: colors.primary,
    borderColor: colors.gray[600],
    borderWidth: 1,
    borderRadius: 12,
    color: colors.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  notesList: {
    marginTop: spacing.sm,
    gap: spacing.sm
  },
  noteItem: {
    backgroundColor: '#101A2D',
    borderColor: '#1F365F',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm
  },
  noteDate: {
    color: colors.gray[400],
    fontSize: typography.sizes.xs,
    marginBottom: spacing.xs
  },
  noteContent: {
    color: colors.light,
    fontSize: typography.sizes.sm
  },
  reportContextLine: {
    marginTop: spacing.xs,
    color: colors.gray[200],
    fontSize: typography.sizes.xs
  },
  aiDraftBtn: {
    marginTop: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E40AF',
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md
  },
  aiDraftBtnLoading: {
    paddingVertical: spacing.sm
  },
  aiDraftProgressWrap: {
    width: '100%',
    paddingHorizontal: spacing.md,
    gap: spacing.xs
  },
  aiDraftBtnText: {
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.sm
  },
  aiDraftProgressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(191, 219, 254, 0.35)',
    overflow: 'hidden'
  },
  aiDraftProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#67E8F9'
  },
  observationSummaryText: {
    color: colors.gray[200],
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs
  },
  editNoteBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.45)',
    backgroundColor: 'rgba(20, 184, 166, 0.12)'
  },
  editNoteBtnText: {
    color: colors.light,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.xs
  },
  deleteNoteBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.5)',
    backgroundColor: 'rgba(220, 38, 38, 0.18)'
  },
  deleteNoteBtnText: {
    color: '#FECACA',
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.xs
  },
  voiceBtn: {
    marginTop: spacing.sm,
    backgroundColor: '#0F4A75',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm
  },
  voiceBtnActive: {
    backgroundColor: '#DC2626'
  },
  voiceBtnText: {
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.sm
  },
  reportBtn: {
    marginTop: spacing.md,
    backgroundColor: '#14B8A6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md
  },
  reportBtnText: {
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.sm
  },
  emptyText: {
    color: colors.gray[300],
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm
  },
  notice: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  noticeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  noticeContent: {
    flex: 1
  },
  noticeTitle: {
    color: colors.secondary,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing.xs
  },
  noticeText: {
    color: colors.gray[300],
    fontSize: typography.sizes.sm,
    lineHeight: 20
  },
  feedbackDialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg
  },
  feedbackDialogCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg,
    backgroundColor: '#0F172A'
  },
  feedbackDialogSuccessCard: {
    borderColor: 'rgba(45, 212, 191, 0.55)'
  },
  feedbackDialogErrorCard: {
    borderColor: 'rgba(248, 113, 113, 0.55)'
  },
  feedbackDialogTitle: {
    color: colors.light,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold
  },
  feedbackDialogMessage: {
    marginTop: spacing.sm,
    color: colors.gray[200],
    fontSize: typography.sizes.sm
  },
  feedbackDialogBtn: {
    marginTop: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm
  },
  feedbackDialogSuccessBtn: {
    backgroundColor: '#0F766E'
  },
  feedbackDialogErrorBtn: {
    backgroundColor: '#B91C1C'
  },
  feedbackDialogBtnText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold
  },
  createPlayerModalContainer: {
    flex: 1,
    backgroundColor: '#fff'
  }
});
