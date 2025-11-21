"use client";
import styles from './DashboardSidebar.module.css';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardSidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.role) {
      setRole(session.user.role);
    }
  }, [session]);

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  if (status === 'loading' || !role) {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.loading}>Chargement...</div>
      </aside>
    );
  }

  // Navigation ADMIN
  if (role === 'ADMIN') {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <div className={styles.logo}>⚙️ ADMIN</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{session?.user?.name}</span>
            <span className={styles.userRole}>Administrateur</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link href="/dashboard/admin" className={`${styles.navLink} ${isActive('/dashboard/admin') ? styles.active : ''}`}>
            <span className={styles.icon}>📊</span>
            <span>Administration</span>
          </Link>
          <Link href="/dashboard/players/search" className={`${styles.navLink} ${isActive('/dashboard/players/search') ? styles.active : ''}`}>
            <span className={styles.icon}>🔍</span>
            <span>Rechercher joueurs</span>
          </Link>
          <Link href="/dashboard/players" className={`${styles.navLink} ${isActive('/dashboard/players') ? styles.active : ''}`}>
            <span className={styles.icon}>👤</span>
            <span>Tous les joueurs</span>
          </Link>
          <Link href="/dashboard/clubs" className={`${styles.navLink} ${isActive('/dashboard/clubs') ? styles.active : ''}`}>
            <span className={styles.icon}>🏟️</span>
            <span>Clubs</span>
          </Link>
          <Link href="/dashboard/reports" className={`${styles.navLink} ${isActive('/dashboard/reports') ? styles.active : ''}`}>
            <span className={styles.icon}>📝</span>
            <span>Rapports</span>
          </Link>
          <Link href="/dashboard/trials" className={`${styles.navLink} ${isActive('/dashboard/trials') ? styles.active : ''}`}>
            <span className={styles.icon}>🎯</span>
            <span>Essais</span>
          </Link>
        </nav>

        <button onClick={() => signOut({ callbackUrl: '/' })} className={styles.logoutBtn}>
          <span className={styles.icon}>🚪</span>
          <span>Déconnexion</span>
        </button>
      </aside>
    );
  }

  // Navigation SCOUT
  if (role === 'SCOUT') {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <div className={styles.logo}>🔍 SCOUT</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{session?.user?.name}</span>
            <span className={styles.userRole}>Scout</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link href="/dashboard/scout" className={`${styles.navLink} ${isActive('/dashboard/scout') ? styles.active : ''}`}>
            <span className={styles.icon}>📊</span>
            <span>Tableau de bord</span>
          </Link>
          <Link href="/dashboard/players/new" className={`${styles.navLink} ${isActive('/dashboard/players/new') ? styles.active : ''}`}>
            <span className={styles.icon}>➕</span>
            <span>Ajouter un joueur</span>
          </Link>
          <Link href="/dashboard/players/search" className={`${styles.navLink} ${isActive('/dashboard/players/search') ? styles.active : ''}`}>
            <span className={styles.icon}>🔍</span>
            <span>Rechercher joueurs</span>
          </Link>
          <Link href="/dashboard/players" className={`${styles.navLink} ${isActive('/dashboard/players') ? styles.active : ''}`}>
            <span className={styles.icon}>👤</span>
            <span>Mes joueurs</span>
          </Link>
          <Link href="/dashboard/reports" className={`${styles.navLink} ${isActive('/dashboard/reports') ? styles.active : ''}`}>
            <span className={styles.icon}>📝</span>
            <span>Mes rapports</span>
          </Link>
        </nav>

        <button onClick={() => signOut({ callbackUrl: '/' })} className={styles.logoutBtn}>
          <span className={styles.icon}>🚪</span>
          <span>Déconnexion</span>
        </button>
      </aside>
    );
  }

  // Navigation CLUB
  if (role === 'CLUB') {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <div className={styles.logo}>🏟️ CLUB</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{session?.user?.name}</span>
            <span className={styles.userRole}>Head Coach</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link href="/dashboard/club" className={`${styles.navLink} ${isActive('/dashboard/club') ? styles.active : ''}`}>
            <span className={styles.icon}>📊</span>
            <span>Tableau de bord</span>
          </Link>
          <Link href="/dashboard/players/search" className={`${styles.navLink} ${isActive('/dashboard/players/search') ? styles.active : ''}`}>
            <span className={styles.icon}>🔍</span>
            <span>Recherche joueurs</span>
          </Link>
          <Link href="/dashboard/recommendations" className={`${styles.navLink} ${isActive('/dashboard/recommendations') ? styles.active : ''}`}>
            <span className={styles.icon}>💎</span>
            <span>Recommandations</span>
          </Link>
          <Link href="/dashboard/trials" className={`${styles.navLink} ${isActive('/dashboard/trials') ? styles.active : ''}`}>
            <span className={styles.icon}>🎯</span>
            <span>Demandes d'essai</span>
          </Link>
        </nav>

        <button onClick={() => signOut({ callbackUrl: '/' })} className={styles.logoutBtn}>
          <span className={styles.icon}>🚪</span>
          <span>Déconnexion</span>
        </button>
      </aside>
    );
  }

  // Navigation AGENT
  if (role === 'AGENT') {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <div className={styles.logo}>💼 AGENT</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{session?.user?.name}</span>
            <span className={styles.userRole}>Agent</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link href="/dashboard/agent" className={`${styles.navLink} ${isActive('/dashboard/agent') ? styles.active : ''}`}>
            <span className={styles.icon}>📊</span>
            <span>Tableau de bord</span>
          </Link>
          <Link href="/dashboard/players/search" className={`${styles.navLink} ${isActive('/dashboard/players/search') ? styles.active : ''}`}>
            <span className={styles.icon}>🔍</span>
            <span>Recherche joueurs</span>
          </Link>
          <Link href="/dashboard/players" className={`${styles.navLink} ${isActive('/dashboard/players') ? styles.active : ''}`}>
            <span className={styles.icon}>👥</span>
            <span>Mes joueurs</span>
          </Link>
          <Link href="/dashboard/opportunities" className={`${styles.navLink} ${isActive('/dashboard/opportunities') ? styles.active : ''}`}>
            <span className={styles.icon}>🏟️</span>
            <span>Opportunités</span>
          </Link>
        </nav>

        <button onClick={() => signOut({ callbackUrl: '/' })} className={styles.logoutBtn}>
          <span className={styles.icon}>🚪</span>
          <span>Déconnexion</span>
        </button>
      </aside>
    );
  }

  // Navigation par défaut
  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>UROOM</div>
      </div>
      <nav className={styles.nav}>
        <Link href="/dashboard/overview" className={`${styles.navLink} ${isActive('/dashboard/overview') ? styles.active : ''}`}>
          <span className={styles.icon}>📊</span>
          <span>Vue d'ensemble</span>
        </Link>
      </nav>
      <button onClick={() => signOut({ callbackUrl: '/' })} className={styles.logoutBtn}>
        <span className={styles.icon}>🚪</span>
        <span>Déconnexion</span>
      </button>
    </aside>
  );
}