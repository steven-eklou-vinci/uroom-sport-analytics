"use client";
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './ProfilePage.module.css';

interface ProfileData {
  name: string;
  email: string;
  role: string;
  locale: string;
  clubName?: string;
  subscriptionTier?: string;
  createdAt?: string;
  reportsCount?: number;
  playersCount?: number;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    locale: 'fr',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    if (session?.user) {
      const profileData: ProfileData = {
        name: session.user.name || '',
        email: session.user.email || '',
        role: session.user.role || '',
        locale: 'fr',
        createdAt: new Date().toISOString()
      };
      setProfile(profileData);
      setFormData({
        name: profileData.name,
        locale: profileData.locale,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [session, status, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          locale: formData.locale,
          ...(formData.newPassword && {
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword
          })
        })
      });

      if (res.ok) {
        alert('Profil mis à jour avec succès');
        setIsEditing(false);
        setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        // Reload session
        window.location.reload();
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      'ADMIN': 'Administrateur',
      'CLUB': 'Club',
      'SCOUT': 'Recruteur',
      'AGENT': 'Agent',
      'PLAYER': 'Joueur'
    };
    return roleLabels[role] || role;
  };

  const getRoleDescription = (role: string) => {
    const descriptions: Record<string, string> = {
      'ADMIN': 'Accès complet à la plateforme avec tous les droits d\'administration',
      'CLUB': 'Gestion des scouts, consultation des rapports et organisation des essais',
      'SCOUT': 'Création de rapports d\'évaluation et suivi des joueurs',
      'AGENT': 'Représentation et promotion des joueurs auprès des clubs',
      'PLAYER': 'Profil personnel et visibilité auprès des recruteurs'
    };
    return descriptions[role] || '';
  };

  if (status === 'loading' || !profile) {
    return <div className={styles.loading}>Chargement du profil...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header avec avatar */}
      <div className={styles.header}>
        <div className={styles.avatarSection}>
          <div className={styles.avatar}>
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <button className={styles.changeAvatarBtn} title="Changer l'avatar">
            📷
          </button>
        </div>
        <div className={styles.headerInfo}>
          <h1 className={styles.userName}>{profile.name}</h1>
          <div className={styles.userRole}>{getRoleLabel(profile.role)}</div>
          <div className={styles.userEmail}>{profile.email}</div>
        </div>
      </div>

      {/* Informations de rôle */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          🎯 Votre rôle
        </h2>
        <p style={{ color: '#94A3B8', marginBottom: '1.5rem' }}>
          {getRoleDescription(profile.role)}
        </p>
        
        {profile.role === 'CLUB' && (
          <div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Abonnement</span>
              <span className={styles.badge}>Premium</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Scouts actifs</span>
              <span className={styles.statValue}>{profile.reportsCount || 0}</span>
            </div>
          </div>
        )}

        {profile.role === 'SCOUT' && profile.clubName && (
          <div className={styles.stat}>
            <span className={styles.statLabel}>Rattaché au club</span>
            <span className={styles.statValue}>{profile.clubName}</span>
          </div>
        )}
      </div>

      {/* Formulaire d'édition */}
      <form onSubmit={handleSave}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            👤 Informations personnelles
          </h2>
          
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Nom complet</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Langue</label>
              <select
                value={formData.locale}
                onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                disabled={!isEditing}
                className={styles.select}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Rôle</label>
              <input
                type="text"
                value={getRoleLabel(profile.role)}
                disabled
                className={styles.input}
              />
            </div>
          </div>
        </div>

        {/* Changement de mot de passe */}
        {isEditing && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              🔒 Changer le mot de passe
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Laissez vide si vous ne souhaitez pas changer votre mot de passe
            </p>

            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Mot de passe actuel</label>
                <input
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  className={styles.input}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Nouveau mot de passe</label>
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className={styles.input}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={styles.input}
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: profile.name,
                    locale: profile.locale,
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
                className={styles.cancelButton}
              >
                Annuler
              </button>
              <button type="submit" className={styles.saveButton}>
                💾 Enregistrer les modifications
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className={styles.saveButton}
            >
              ✏️ Modifier le profil
            </button>
          )}
        </div>
      </form>

      {/* Zone dangereuse */}
      <div className={styles.section}>
        <div className={styles.dangerZone}>
          <div className={styles.dangerTitle}>⚠️ Zone dangereuse</div>
          <p className={styles.dangerText}>
            La suppression de votre compte est irréversible. Toutes vos données seront perdues.
          </p>
          <button
            className={styles.deleteButton}
            onClick={() => {
              if (confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
                alert('Fonctionnalité de suppression à implémenter');
              }
            }}
          >
            Supprimer mon compte
          </button>
        </div>
      </div>
    </div>
  );
}
