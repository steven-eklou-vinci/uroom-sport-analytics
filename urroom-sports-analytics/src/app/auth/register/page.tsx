
"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { firebaseAuth } from '../../../lib/firebase/client';
import styles from './RegisterPage.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    if (!name || !email || !password) {
      setError('Veuillez remplir tous les champs.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      const idToken = await userCredential.user.getIdToken();

      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, name, role: 'PLAYER', locale: 'fr' }),
      });

      if (!registerRes.ok) {
        throw new Error('Registration failed');
      }

      const signInRes = await signIn('credentials', {
        redirect: false,
        idToken,
      });

      if (signInRes?.error) {
        throw new Error('Session creation failed');
      }

      setLoading(false);
      router.replace('/dashboard/player');
    } catch {
      setLoading(false);
      setError('Impossible de créer le compte. Vérifiez les informations et réessayez.');
    }
  };

  return (
    <div className={styles.registerContainer}>
      <div className={styles.card}>
        <h1 className={styles.title}>Créer un compte</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Nom
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className={styles.label}>
            Email
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </label>
          <label className={styles.label}>
            Mot de passe
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>
          <label className={styles.label}>
            Confirmer le mot de passe
            <input
              type="password"
              className={styles.input}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          </label>
          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Création...' : 'Créer le compte'}
          </button>
        </form>
        <div className={styles.loginLink}>
          <span>Déjà un compte ? </span>
          <Link href="/auth/login">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
