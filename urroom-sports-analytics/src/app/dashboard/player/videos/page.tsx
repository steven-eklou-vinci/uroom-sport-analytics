"use client";
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './VideosPage.module.css';

interface VideoItem {
  url: string;
  id: string;
}

export default function VideosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchVideos();
    }
  }, [status, router]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/player/videos');
      if (res.ok) {
        const data = await res.json();
        console.log('📹 Vidéos récupérées:', data);
        const videosWithIds = data.videos.map((url: string, index: number) => ({
          url,
          id: `video-${index}-${Date.now()}`
        }));
        console.log('📹 Vidéos avec IDs:', videosWithIds);
        setVideos(videosWithIds);
      } else {
        console.error('❌ Erreur récupération vidéos:', await res.text());
      }
    } catch (error) {
      console.error('Erreur fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideo = async () => {
    if (!newVideoUrl.trim()) return;

    try {
      setSaving(true);
      const updatedVideos = [...videos.map(v => v.url), newVideoUrl];
      
      const res = await fetch('/api/player/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrls: updatedVideos })
      });

      if (res.ok) {
        await fetchVideos();
        setNewVideoUrl('');
        setShowAddForm(false);
      } else {
        alert('Erreur lors de l\'ajout de la vidéo');
      }
    } catch (error) {
      console.error('Erreur add video:', error);
      alert('Erreur lors de l\'ajout de la vidéo');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('video/')) {
      alert('Veuillez sélectionner un fichier vidéo valide');
      return;
    }

    // Vérifier la taille
    if (file.size > MAX_FILE_SIZE) {
      alert(`La vidéo est trop volumineuse. Taille maximum: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('video', file);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('✅ Upload réussi:', response);
            
            // Ajouter l'URL de la vidéo uploadée
            const updatedVideos = [...videos.map(v => v.url), response.url];
            console.log('📝 Mise à jour avec:', updatedVideos);
            
            const res = await fetch('/api/player/videos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoUrls: updatedVideos })
            });

            if (res.ok) {
              console.log('💾 Vidéos enregistrées, rechargement...');
              await fetchVideos();
              setShowAddForm(false);
              alert('Vidéo ajoutée avec succès !');
            } else {
              const errorData = await res.text();
              console.error('❌ Erreur enregistrement:', errorData);
              alert('Erreur lors de l\'enregistrement de la vidéo');
            }
          } catch (parseError) {
            console.error('❌ Erreur parsing response:', parseError);
            alert('Erreur lors du traitement de la réponse');
          }
        } else {
          console.error('❌ Erreur HTTP:', xhr.status, xhr.responseText);
          alert(`Erreur lors de l'upload de la vidéo (${xhr.status})`);
        }
        setIsUploading(false);
        setUploadProgress(0);
        // Réinitialiser l'input file
        event.target.value = '';
      });

      xhr.addEventListener('error', () => {
        console.error('Erreur réseau');
        alert('Erreur réseau lors de l\'upload de la vidéo');
        setIsUploading(false);
        setUploadProgress(0);
        event.target.value = '';
      });

      xhr.addEventListener('abort', () => {
        console.log('Upload annulé');
        setIsUploading(false);
        setUploadProgress(0);
        event.target.value = '';
      });

      xhr.open('POST', '/api/player/upload-video');
      xhr.send(formData);

    } catch (error) {
      console.error('Erreur upload video:', error);
      alert('Erreur lors de l\'upload');
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleDeleteVideo = async (videoToDelete: VideoItem) => {
    if (!confirm('Voulez-vous vraiment supprimer cette vidéo ?')) return;

    try {
      setSaving(true);
      const updatedVideos = videos.filter(v => v.id !== videoToDelete.id).map(v => v.url);
      
      const res = await fetch('/api/player/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrls: updatedVideos })
      });

      if (res.ok) {
        await fetchVideos();
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur delete video:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setSaving(false);
    }
  };

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  console.log('🎯 Rendu - Nombre de vidéos:', videos.length, 'Vidéos:', videos);

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mes Vidéos Highlights</h1>
          <p className={styles.subtitle}>
            Ajoutez vos meilleures vidéos pour impressionner les recruteurs
          </p>
        </div>
        {!showAddForm && (
          <button
            className={styles.addVideoButton}
            onClick={() => setShowAddForm(true)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Ajouter une vidéo
          </button>
        )}
      </div>

      {showAddForm && (
        <div className={styles.addSection}>
          <div className={styles.addOptions}>
            <div className={styles.optionBlock}>
              <h3 className={styles.optionTitle}>Ajouter une URL</h3>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="URL de la vidéo (YouTube ou lien direct)"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddVideo()}
                  autoFocus
                  disabled={isUploading}
                />
                <button
                  className={styles.addButton}
                  onClick={handleAddVideo}
                  disabled={!newVideoUrl.trim() || saving || isUploading}
                >
                  {saving ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </div>

            <div className={styles.divider}>OU</div>

            <div className={styles.optionBlock}>
              <h3 className={styles.optionTitle}>Upload une vidéo</h3>
              <div className={styles.uploadArea}>
                <input
                  type="file"
                  id="videoUpload"
                  className={styles.fileInput}
                  accept="video/*"
                  onChange={handleFileUpload}
                  disabled={isUploading || saving}
                />
                <label htmlFor="videoUpload" className={styles.uploadLabel}>
                  {isUploading ? (
                    <div className={styles.uploadProgress}>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill} 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <span>{uploadProgress}%</span>
                    </div>
                  ) : (
                    <>
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <path d="M24 32V16M24 16L18 22M24 16L30 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 34C8 36.2091 9.79086 38 12 38H36C38.2091 38 40 36.2091 40 34" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      <span className={styles.uploadText}>
                        Cliquer ou glisser une vidéo ici
                      </span>
                      <span className={styles.uploadHint}>
                        Max 100 MB • MP4, MOV, AVI, WEBM
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              className={styles.cancelButton}
              onClick={() => {
                setShowAddForm(false);
                setNewVideoUrl('');
              }}
              disabled={saving || isUploading}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {loading && <div className={styles.loading}>Chargement...</div>}

      {!loading && videos.length === 0 ? (
        <div className={styles.emptyState}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className={styles.emptyIcon}>
            <rect x="8" y="16" width="48" height="32" rx="4" stroke="currentColor" strokeWidth="3"/>
            <path d="M26 24L38 32L26 40V24Z" fill="currentColor"/>
          </svg>
          <h3>Aucune vidéo pour le moment</h3>
          <p>Ajoutez votre première vidéo highlight ci-dessus</p>
        </div>
      ) : !loading && (
        <div className={styles.videosGrid}>
          {videos.map((video) => {
            const youtubeId = getYouTubeId(video.url);
            console.log('🎬 Affichage vidéo:', video.url, 'YouTube ID:', youtubeId);
            return (
              <div key={video.id} className={styles.videoCard}>
                <div className={styles.videoPreview}>
                  {youtubeId ? (
                    <iframe
                      className={styles.videoIframe}
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      title="Video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      className={styles.videoPlayer}
                      controls
                      src={video.url}
                    >
                      Votre navigateur ne supporte pas la balise vidéo.
                    </video>
                  )}
                </div>
                <div className={styles.videoActions}>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkButton}
                  >
                    Ouvrir
                  </a>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteVideo(video)}
                    disabled={saving}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
