"use client";
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AgentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({ myPlayers: 0, opportunities: 0, messages: 0 });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    if (session?.user?.role !== 'AGENT' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard/overview');
    }
  }, [session, status, router]);

  useEffect(() => {
    // TODO: Fetch stats from API
    setStats({ myPlayers: 6, opportunities: 8, messages: 14 });
  }, []);

  if (status === 'loading') return <div>Chargement...</div>;

  return (
    <section style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', color: '#fff' }}>
        Tableau de bord Agent
      </h1>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ background: '#1E293B', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.875rem', color: '#94A3B8', marginBottom: '0.5rem' }}>Mes joueurs</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#14B8A6' }}>{stats.myPlayers}</div>
        </div>
        <div style={{ background: '#1E293B', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.875rem', color: '#94A3B8', marginBottom: '0.5rem' }}>Opportunités</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#14B8A6' }}>{stats.opportunities}</div>
        </div>
        <div style={{ background: '#1E293B', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.875rem', color: '#94A3B8', marginBottom: '0.5rem' }}>Messages non lus</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#14B8A6' }}>{stats.messages}</div>
        </div>
      </div>

      {/* Actions rapides */}
      <div style={{ background: '#1E293B', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#fff' }}>Actions rapides</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard/players" style={{ textDecoration: 'none' }}>
            <button style={{
              background: '#14B8A6',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(20,184,166,0.3)'
            }}>
              👥 Gérer mes joueurs
            </button>
          </Link>
          <button style={{
            background: '#0F766E',
            color: '#fff',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(15,118,110,0.3)'
          }}>
            🏟️ Voir les opportunités clubs
          </button>
          <button style={{
            background: '#334155',
            color: '#fff',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(51,65,85,0.3)'
          }}>
            📧 Messagerie
          </button>
        </div>
      </div>

      {/* Opportunités récentes */}
      <div style={{ background: '#1E293B', padding: '2rem', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#fff' }}>Opportunités récentes</h2>
        <div style={{ color: '#94A3B8' }}>
          <p>Clubs intéressés par vos joueurs et nouvelles opportunités de transfert apparaîtront ici.</p>
        </div>
      </div>
    </section>
  );
}
