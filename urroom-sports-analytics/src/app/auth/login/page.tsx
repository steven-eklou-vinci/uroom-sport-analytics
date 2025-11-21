
"use client";
import React, { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      setLoading(false);
      return;
    }
    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });
    setLoading(false);
    if (res?.error) {
      setError('Email ou mot de passe incorrect.');
    } else {
      // Récupérer la session pour obtenir le rôle
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      
      // Redirection selon le rôle
      if (session?.user?.role === 'ADMIN') {
        router.replace('/dashboard/admin');
      } else if (session?.user?.role === 'SCOUT') {
        router.replace('/dashboard/scout');
      } else if (session?.user?.role === 'CLUB') {
        router.replace('/dashboard/club');
      } else if (session?.user?.role === 'AGENT') {
        router.replace('/dashboard/agent');
      } else if (session?.user?.role === 'PLAYER') {
        router.replace('/dashboard/player');
      } else {
        router.replace('/dashboard/overview');
      }
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.card}>
        <h1 className={styles.title}>Connexion</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Email
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
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
          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <div className={styles.registerLink}>
          <span>Pas encore de compte ? </span>
          <Link href="/auth/register">Créer un compte</Link>
        </div>
      </div>
    </div>
  );
}
