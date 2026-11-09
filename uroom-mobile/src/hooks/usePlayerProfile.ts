import { useCallback, useEffect, useState } from 'react';

import { apiRequest, apiUpload } from '../api/client';
import { useAuth } from '../auth/AuthContext';

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
  status?: string | null;
  metrics?: ApiMetric[];
};

type ApiPlayerProfile = {
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
  publicOptIn?: boolean | null;
  uroomScore?: number | null;
  videoUrls?: string[];
  userId?: string | null;
  assessments?: ApiAssessment[];
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  } | null;
};

type UsePlayerProfileResult = {
  profile: ApiPlayerProfile | null;
  loading: boolean;
  error: string | null;
  updatingVisibility: boolean;
  updatingVideos: boolean;
  refresh: () => Promise<void>;
  setVisibility: (next: boolean) => Promise<void>;
  addVideoUrl: (url: string) => Promise<void>;
  removeVideoUrl: (url: string) => Promise<void>;
  uploadVideoFile: (file: { uri: string; name: string; type: string }) => Promise<void>;
};

export default function usePlayerProfile(): UsePlayerProfileResult {
  const { session } = useAuth();
  const [profile, setProfile] = useState<ApiPlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [updatingVideos, setUpdatingVideos] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const players = await apiRequest<ApiPlayerProfile[]>('/players');
      const match = players.find((player) => {
        if (session?.user?.id && player.userId === session.user.id) {
          return true;
        }
        if (session?.user?.email && player.user?.email === session.user.email) {
          return true;
        }
        return false;
      });
      if (!match) {
        setProfile(null);
        setError('No player profile linked to this account.');
        return;
      }
      setProfile(match);
    } catch (err) {
      console.warn('Failed to load player profile', err);
      setError('Unable to load player profile right now.');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email, session?.user?.id]);

  const setVisibility = useCallback(async (next: boolean) => {
    if (!profile) return;
    setUpdatingVisibility(true);
    try {
      await apiRequest(`/players/${profile.id}`, {
        method: 'PUT',
        body: JSON.stringify({ publicOptIn: next })
      });
      setProfile((prev) => (prev ? { ...prev, publicOptIn: next } : prev));
    } catch (err) {
      console.warn('Failed to update visibility', err);
      setError('Unable to update visibility right now.');
    } finally {
      setUpdatingVisibility(false);
    }
  }, [profile]);

  const addVideoUrl = useCallback(async (url: string) => {
    if (!profile) return;
    const trimmed = url.trim();
    if (!trimmed) return;
    const existing = profile.videoUrls ?? [];
    if (existing.includes(trimmed)) return;
    const nextVideoUrls = [...existing, trimmed];
    setUpdatingVideos(true);
    try {
      await apiRequest(`/players/${profile.id}`, {
        method: 'PUT',
        body: JSON.stringify({ videoUrls: nextVideoUrls })
      });
      setProfile((prev) => (prev ? { ...prev, videoUrls: nextVideoUrls } : prev));
    } catch (err) {
      console.warn('Failed to update videos', err);
      setError('Unable to update videos right now.');
    } finally {
      setUpdatingVideos(false);
    }
  }, [profile]);

  const removeVideoUrl = useCallback(async (url: string) => {
    if (!profile) return;
    const existing = profile.videoUrls ?? [];
    const nextVideoUrls = existing.filter((item) => item !== url);
    if (nextVideoUrls.length === existing.length) return;
    setUpdatingVideos(true);
    try {
      await apiRequest(`/players/${profile.id}`, {
        method: 'PUT',
        body: JSON.stringify({ videoUrls: nextVideoUrls })
      });
      setProfile((prev) => (prev ? { ...prev, videoUrls: nextVideoUrls } : prev));
    } catch (err) {
      console.warn('Failed to remove video', err);
      setError('Unable to update videos right now.');
    } finally {
      setUpdatingVideos(false);
    }
  }, [profile]);

  const uploadVideoFile = useCallback(async (file: { uri: string; name: string; type: string }) => {
    if (!profile) return;
    setUpdatingVideos(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type
      } as unknown as Blob);

      const result = await apiUpload<{ url: string }>('/uploads/videos', formData);
      await addVideoUrl(result.url);
    } catch (err) {
      console.warn('Failed to upload video', err);
      setError('Unable to upload video right now.');
    } finally {
      setUpdatingVideos(false);
    }
  }, [addVideoUrl, profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    profile,
    loading,
    error,
    updatingVisibility,
    updatingVideos,
    refresh,
    setVisibility,
    addVideoUrl,
    removeVideoUrl,
    uploadVideoFile
  };
}
