"use client";
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard/overview');
    }
  }, [session, status, router]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Erreur fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem', color: '#fff', textAlign: 'center' }}>Chargement...</div>;
  }

  return (
    <section style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>
          Administration
        </h1>
        <Link href="/dashboard/overview" style={{ textDecoration: 'none' }}>
          <button
            style={{
              background: '#14B8A6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(20,184,166,0.3)'
            }}
          >
            ← Retour
          </button>
        </Link>
      </div>

      <div style={{ background: '#1E293B', padding: '2rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid rgba(20, 184, 166, 0.1)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#14B8A6' }}>
          👥 Gestion des utilisateurs
        </h2>
        <p style={{ color: '#94A3B8', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Visualisez et gérez les comptes, rôles et accès à la plateforme.
        </p>
        
        {users.length === 0 ? (
          <p style={{ color: '#94A3B8', textAlign: 'center', padding: '2rem' }}>
            Aucun utilisateur trouvé.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.875rem', color: '#fff', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(20, 184, 166, 0.3)', background: 'rgba(20, 184, 166, 0.05)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#14B8A6', fontWeight: 600 }}>Nom</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#14B8A6', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#14B8A6', fontWeight: 600 }}>Rôle</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#14B8A6', fontWeight: 600 }}>Inscription</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#14B8A6', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid rgba(20, 184, 166, 0.1)' }}>
                    <td style={{ padding: '1rem' }}>{user.name}</td>
                    <td style={{ padding: '1rem', color: '#94A3B8' }}>{user.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        background: 'rgba(20, 184, 166, 0.1)',
                        color: '#14B8A6',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: '1px solid rgba(20, 184, 166, 0.3)'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#94A3B8' }}>
                      {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          style={{
                            background: '#14B8A6',
                            color: '#fff',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          onClick={() => alert('Fonctionnalité à implémenter')}
                        >
                          Modifier
                        </button>
                        <button
                          style={{
                            background: 'transparent',
                            color: '#EF4444',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            if (confirm(`Supprimer ${user.name} ?`)) {
                              alert('Fonctionnalité à implémenter');
                            }
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div style={{ background: '#1E293B', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(20, 184, 166, 0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#14B8A6' }}>
            🔐 Gestion des accès
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.875rem' }}>
            Attribuez ou révoquez des droits d'accès selon les besoins métier.
          </p>
        </div>

        <div style={{ background: '#1E293B', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(20, 184, 166, 0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#14B8A6' }}>
            📊 Statistiques
          </h2>
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Total utilisateurs</span>
              <span style={{ color: '#14B8A6', fontWeight: 600 }}>{users.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Clubs</span>
              <span style={{ color: '#14B8A6', fontWeight: 600 }}>{users.filter(u => u.role === 'CLUB').length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Scouts</span>
              <span style={{ color: '#14B8A6', fontWeight: 600 }}>{users.filter(u => u.role === 'SCOUT').length}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
