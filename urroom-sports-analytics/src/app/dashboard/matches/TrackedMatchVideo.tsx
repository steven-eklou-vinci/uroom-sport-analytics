'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './MatchesPage.module.css';

interface ConfirmedTrack {
  trackId: number;
  playerName: string;
}

interface FrameDetection {
  trackId: number;
  className: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface FrameResult {
  frame: number;
  detections: number[][];
}

interface TrackFramesResponse {
  frames: FrameResult[];
  tracks: ConfirmedTrack[];
}

interface TrackedMatchVideoProps {
  matchId: string;
  originalVideoUrl: string;
  annotatedVideoUrl: string | null;
  hasAnnotatedVideo: boolean;
  hasTrackFrames: boolean;
  fps: number | null;
  confirmedTracks: ConfirmedTrack[];
}

type VideoMode = 'original' | 'all' | 'confirmed';

const frameWindowSize = 300;

export default function TrackedMatchVideo({
  matchId,
  originalVideoUrl,
  annotatedVideoUrl,
  hasAnnotatedVideo,
  hasTrackFrames,
  fps,
  confirmedTracks,
}: TrackedMatchVideoProps) {
  const [mode, setMode] = useState<VideoMode>('original');
  const [overlayError, setOverlayError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confirmedTracksRef = useRef(confirmedTracks);
  confirmedTracksRef.current = confirmedTracks;
  const confirmedTrackSignature = confirmedTracks.map((track) => `${track.trackId}:${track.playerName}`).join('|');

  useEffect(() => {
    setOverlayError('');
    if (mode !== 'confirmed' || !hasTrackFrames || confirmedTracksRef.current.length === 0 || !fps) return;

    const frameCache = new Map<number, Map<number, FrameDetection[]>>();
    const pendingChunks = new Set<number>();
    const namesByTrackId = new Map(confirmedTracksRef.current.map((track) => [track.trackId, track.playerName]));
    let active = true;
    let animationFrame = 0;
    let lastDrawnFrame = -1;

    const loadFrameWindow = async (windowStart: number) => {
      if (frameCache.has(windowStart) || pendingChunks.has(windowStart)) return;
      pendingChunks.add(windowStart);

      try {
        const query = new URLSearchParams({
          id: matchId,
          startFrame: String(windowStart),
          endFrame: String(windowStart + frameWindowSize - 1),
        });
        const response = await fetch(`/api/matches/tracks?${query}`);
        if (!response.ok) throw new Error('Impossible de charger les positions des joueurs confirmés');
        const result = await response.json() as TrackFramesResponse;
        const detectionsByFrame = new Map<number, FrameDetection[]>();

        for (const frameData of result.frames) {
          detectionsByFrame.set(frameData.frame, frameData.detections.map((detection) => ({
            trackId: detection[0],
            className: String(detection[1]),
            left: detection[2],
            top: detection[3],
            right: detection[4],
            bottom: detection[5],
          })));
        }
        frameCache.set(windowStart, detectionsByFrame);
      } catch (error) {
        if (active) setOverlayError(error instanceof Error ? error.message : 'Erreur de chargement des marqueurs');
      } finally {
        pendingChunks.delete(windowStart);
      }
    };

    const drawFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!active || !video || !canvas) return;

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const currentFrame = Math.floor(video.currentTime * fps);
        if (currentFrame !== lastDrawnFrame) {
          lastDrawnFrame = currentFrame;
          const windowStart = Math.floor(currentFrame / frameWindowSize) * frameWindowSize;
          const windowFrames = frameCache.get(windowStart);
          const context = canvas.getContext('2d');
          context?.clearRect(0, 0, canvas.width, canvas.height);

          if (windowFrames && context) {
            for (const detection of windowFrames.get(currentFrame) || []) {
              const { trackId, left, top, right, bottom } = detection;
              const label = `#${trackId} · ${namesByTrackId.get(trackId) || 'Joueur'}`;
              const labelTop = Math.max(0, top - 28);
              context.strokeStyle = '#c4ee61';
              context.lineWidth = Math.max(2, canvas.width / 960);
              context.strokeRect(left, top, right - left, bottom - top);
              context.font = `bold ${Math.max(14, canvas.width / 75)}px system-ui, sans-serif`;
              const labelWidth = context.measureText(label).width + 12;
              context.fillStyle = 'rgba(20, 32, 29, 0.9)';
              context.fillRect(left, labelTop, labelWidth, top - labelTop || 26);
              context.fillStyle = '#c4ee61';
              context.fillText(label, left + 6, labelTop + Math.max(18, canvas.width / 90));
            }
          } else {
            void loadFrameWindow(windowStart);
          }
        }
      }

      animationFrame = window.requestAnimationFrame(drawFrame);
    };

    animationFrame = window.requestAnimationFrame(drawFrame);
    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrame);
      frameCache.clear();
    };
  }, [confirmedTrackSignature, fps, hasTrackFrames, matchId, mode]);

  const videoSource = mode === 'all' && annotatedVideoUrl ? annotatedVideoUrl : originalVideoUrl;

  return (
    <div className={styles.videoColumn}>
      <div className={styles.videoMode} role="group" aria-label="Affichage vidéo">
        <button
          type="button"
          className={mode === 'original' ? styles.videoModeActive : styles.videoModeButton}
          aria-pressed={mode === 'original'}
          onClick={() => setMode('original')}
        >
          Originale
        </button>
        {hasAnnotatedVideo && annotatedVideoUrl && (
          <button
            type="button"
            className={mode === 'all' ? styles.videoModeActive : styles.videoModeButton}
            aria-pressed={mode === 'all'}
            onClick={() => setMode('all')}
          >
            Tous les IDs
          </button>
        )}
        {hasTrackFrames && confirmedTracks.length > 0 && (
          <button
            type="button"
            className={mode === 'confirmed' ? styles.videoModeActive : styles.videoModeButton}
            aria-pressed={mode === 'confirmed'}
            onClick={() => setMode('confirmed')}
          >
            Joueurs confirmés
          </button>
        )}
      </div>
      <div className={styles.videoStage}>
        <video
          key={`${matchId}-${mode}`}
          ref={videoRef}
          className={styles.videoPlayer}
          controls
          preload="metadata"
          src={videoSource}
        />
        {mode === 'confirmed' && <canvas ref={canvasRef} className={styles.videoCanvas} aria-hidden="true" />}
      </div>
      {mode === 'confirmed' && !hasTrackFrames && (
        <p className={styles.trackHint}>Relancez l’analyse pour obtenir les positions image par image nécessaires aux marqueurs confirmés.</p>
      )}
      {overlayError && <p className={styles.matchError}>{overlayError}</p>}
    </div>
  );
}