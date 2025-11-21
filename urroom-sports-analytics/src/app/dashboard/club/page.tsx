"use client";
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './ClubDashboard.module.css';

interface Scout {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  reportsCount: number;
}

interface Report {
  id: string;
  playerName: string;
  scoutName: string;
  summary: string;
  createdAt: string;
}

export default function ClubDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({ scouts: 0, reports: 0, trials: 0 });
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [showAddScout, setShowAddScout] = useState(false);
  const [newScout, setNewScout] = useState({ name: '', email: '', password: '' });

  const handleDisableScout = async (scoutId: string) => {
    if (!confirm('Voulez-vous vraiment désactiver ce scout ?')) return;
    
    try {
      const res = await fetch('/api/scouts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoutId })
      });

      if (res.ok) {
        alert('Scout désactivé avec succès');
        fetchDashboardData();
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      console.error('Erreur désactivation scout:', error);
      alert('Erreur lors de la désactivation');
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    if (session?.user?.role !== 'CLUB' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard/overview');
    }
  }, [session, status, router]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch scouts
      const scoutsRes = await fetch('/api/scouts');
      if (scoutsRes.ok) {
        const scoutsData = await scoutsRes.json();
        setScouts(scoutsData);
        setStats(prev => ({ ...prev, scouts: scoutsData.length }));
      }

      // Fetch recent reports
      const reportsRes = await fetch('/api/reports');
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        
        // Format reports and take only the most recent one
        const formattedReports = reportsData.slice(0, 1).map((report: any) => ({
          id: report.id,
          playerName: `${report.player.firstName} ${report.player.lastName}`,
          scoutName: report.author.name,
          summary: report.summary,
          createdAt: report.createdAt
        }));
        
        setRecentReports(formattedReports);
        setStats(prev => ({ ...prev, reports: reportsData.length }));
      }
    } catch (error) {
      console.error('Erreur fetch:', error);
    }
  };

  const handleAddScout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/scouts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScout)
      });

      if (res.ok) {
        alert('Scout créé avec succès ! Les identifiants ont été envoyés.');
        setShowAddScout(false);
        setNewScout({ name: '', email: '', password: '' });
        fetchDashboardData();
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      console.error('Erreur création scout:', error);
      alert('Erreur lors de la création du scout');
    }
  };

  if (status === 'loading') return <div className={styles.loading}>Chargement...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Tableau de bord Club</h1>
        <div className={styles.subscription}>
          <span className={styles.subscriptionLabel}>Abonnement:</span> Premium
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Scouts actifs</div>
          <div className={styles.statValue}>{stats.scouts}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Rapports reçus</div>
          <div className={styles.statValue}>{stats.reports}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Demandes d'essai</div>
          <div className={styles.statValue}>{stats.trials}</div>
        </div>
      </div>

      {/* Gestion des scouts */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Mes scouts</h2>
          <button onClick={() => setShowAddScout(!showAddScout)} className={styles.addButton}>
            + Ajouter un scout
          </button>
        </div>

        {showAddScout && (
          <form onSubmit={handleAddScout} className={styles.form}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff', marginBottom: '1rem' }}>Nouveau scout</h3>
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Nom complet</label>
                <input
                  type="text"
                  required
                  value={newScout.name}
                  onChange={(e) => setNewScout({ ...newScout, name: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  required
                  value={newScout.email}
                  onChange={(e) => setNewScout({ ...newScout, email: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Mot de passe initial</label>
                <input
                  type="password"
                  required
                  value={newScout.password}
                  onChange={(e) => setNewScout({ ...newScout, password: e.target.value })}
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.formActions}>
              <button type="button" onClick={() => setShowAddScout(false)} className={styles.cancelButton}>
                Annuler
              </button>
              <button type="submit" className={styles.submitButton}>
                Créer le compte
              </button>
            </div>
          </form>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead className={styles.tableHeader}>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rapports</th>
                <th>Membre depuis</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scouts.map((scout) => (
                <tr key={scout.id} className={styles.tableRow}>
                  <td>{scout.name}</td>
                  <td>{scout.email}</td>
                  <td><span style={{ color: '#14B8A6', fontWeight: 600 }}>{scout.reportsCount}</span></td>
                  <td>{new Date(scout.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <button onClick={() => handleDisableScout(scout.id)} className={styles.disableButton}>
                      Désactiver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rapports récents des scouts */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Rapports de mes scouts</h2>
          <Link href="/dashboard/reports" className={styles.viewAllButton}>
            Voir tous les rapports →
          </Link>
        </div>

        {recentReports.length === 0 ? (
          <div className={styles.emptyState}>
            Aucun rapport pour le moment. Vos scouts pourront créer des rapports une fois leurs comptes activés.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {recentReports.map((report) => (
              <div
                key={report.id}
                style={{
                  background: '#0F172A',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(20, 184, 166, 0.2)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.25rem' }}>
                      {report.playerName}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: '#94A3B8' }}>
                      Par <strong style={{ color: '#14B8A6' }}>{report.scoutName}</strong> • {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <Link href={`/dashboard/reports/${report.id}`} style={{ textDecoration: 'none' }}>
                    <button style={{
                      background: '#14B8A6',
                      color: '#fff',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}>
                      Voir →
                    </button>
                  </Link>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#94A3B8' }}>
                  {report.summary.substring(0, 150)}...
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions rapides */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Actions rapides</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          <Link href="/dashboard/players/search" style={{ textDecoration: 'none' }}>
            <button className={styles.addButton}>
              🔍 Rechercher des joueurs
            </button>
          </Link>
          <Link href="/dashboard/trials" style={{ textDecoration: 'none' }}>
            <button className={styles.addButton}>
              🎯 Gérer les essais
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

