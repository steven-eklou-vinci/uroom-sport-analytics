
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDashboardLink = () => {
    if (!session?.user?.role) return '/dashboard/overview';
    
    const roleMap: Record<string, string> = {
      'ADMIN': '/dashboard/admin',
      'CLUB': '/dashboard/club',
      'SCOUT': '/dashboard/scout',
      'AGENT': '/dashboard/agent',
      'PLAYER': '/dashboard/overview'
    };
    
    return roleMap[session.user.role] || '/dashboard/overview';
  };

  const getRoleLabel = () => {
    const roleLabels: Record<string, string> = {
      'ADMIN': 'Administrateur',
      'CLUB': 'Club',
      'SCOUT': 'Recruteur',
      'AGENT': 'Agent',
      'PLAYER': 'Joueur'
    };
    
    return session?.user?.role ? roleLabels[session.user.role] : 'Utilisateur';
  };

  const getRoleMenuItems = () => {
    const role = session?.user?.role;
    
    // Menu items communs à tous
    const commonItems = [
      {
        label: 'Tableau de bord',
        href: getDashboardLink(),
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        )
      }
    ];

    // Menu items spécifiques par rôle
    const roleSpecificItems: Record<string, Array<{label: string, href: string, icon: React.ReactNode}>> = {
      'ADMIN': [
        {
          label: 'Gestion utilisateurs',
          href: '/dashboard/admin',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M11 7C12.1046 7 13 6.10457 13 5C13 3.89543 12.1046 3 11 3C9.89543 3 9 3.89543 9 5C9 6.10457 9.89543 7 11 7Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 7C6.10457 7 7 6.10457 7 5C7 3.89543 6.10457 3 5 3C3.89543 3 3 3.89543 3 5C3 6.10457 3.89543 7 5 7Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 13C9 11.3431 10.3431 10 12 10C13.6569 10 15 11.3431 15 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M1 13C1 11.3431 2.34315 10 4 10C5.65685 10 7 11.3431 7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )
        },
        {
          label: 'Tous les joueurs',
          href: '/dashboard/players',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2 14C2 11.2386 4.68629 9 8 9C11.3137 9 14 11.2386 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )
        },
        {
          label: 'Tous les clubs',
          href: '/dashboard/clubs',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L2 5L8 8L14 5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 11L8 14L14 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 8L8 11L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        },
        {
          label: 'Rapports',
          href: '/dashboard/reports',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2H12C12.5523 2 13 2.44772 13 3V13C13 13.5523 12.5523 14 12 14H4C3.44772 14 3 13.5523 3 13V3C3 2.44772 3.44772 2 4 2Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M6 6H10M6 9H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )
        },
        {
          label: 'Évaluations',
          href: '/dashboard/assessments',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8L6 11L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        },
        {
          label: 'Demandes d\'essai',
          href: '/dashboard/trials',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V8L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          )
        },
        {
          label: 'Facturation',
          href: '/dashboard/billing',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2 6H14" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 9H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )
        }
      ],
      'CLUB': [
        {
          label: 'Mes scouts',
          href: '/dashboard/club',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2 14C2 11.2386 4.68629 9 8 9C11.3137 9 14 11.2386 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )
        },
        {
          label: 'Rechercher joueurs',
          href: '/dashboard/players/search',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )
        },
        {
          label: 'Rapports reçus',
          href: '/dashboard/reports',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2H12C12.5523 2 13 2.44772 13 3V13C13 13.5523 12.5523 14 12 14H4C3.44772 14 3 13.5523 3 13V3C3 2.44772 3.44772 2 4 2Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M6 6H10M6 9H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )
        },
        {
          label: 'Shortlists',
          href: '/dashboard/shortlists',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8L6 11L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          )
        },
        {
          label: 'Demandes d\'essai',
          href: '/dashboard/trials',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V8L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          )
        },
        {
          label: 'Facturation',
          href: '/dashboard/billing',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2 6H14" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 9H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )
        }
      ],
      'SCOUT': [
        {
          label: 'Mes rapports',
          href: '/dashboard/reports',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2H12C12.5523 2 13 2.44772 13 3V13C13 13.5523 12.5523 14 12 14H4C3.44772 14 3 13.5523 3 13V3C3 2.44772 3.44772 2 4 2Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M6 6H10M6 9H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )
        },
        {
          label: 'Créer un rapport',
          href: '/dashboard/reports/new',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )
        },
        {
          label: 'Rechercher joueurs',
          href: '/dashboard/players/search',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )
        },
        {
          label: 'Mes évaluations',
          href: '/dashboard/assessments',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8L6 11L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        }
      ],
      'AGENT': [
        {
          label: 'Mes joueurs',
          href: '/dashboard/players',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2 14C2 11.2386 4.68629 9 8 9C11.3137 9 14 11.2386 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )
        },
        {
          label: 'Rechercher clubs',
          href: '/dashboard/clubs',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L2 5L8 8L14 5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        },
        {
          label: 'Demandes d\'essai',
          href: '/dashboard/trials',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V8L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          )
        }
      ],
      'PLAYER': [
        {
          label: 'Mon profil joueur',
          href: '/dashboard/players',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2 14C2 11.2386 4.68629 9 8 9C11.3137 9 14 11.2386 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )
        },
        {
          label: 'Mes vidéos',
          href: '/dashboard/player/videos',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 6L10 8L7 10V6Z" fill="currentColor"/>
            </svg>
          )
        },
        {
          label: 'Mes évaluations',
          href: '/dashboard/assessments',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8L6 11L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        },
        {
          label: 'Opportunités',
          href: '/dashboard/trials',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V8L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          )
        }
      ]
    };

    return [...commonItems, ...(role ? roleSpecificItems[role] || [] : [])];
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
    setDropdownOpen(false);
  };

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        <img 
          src="/icon_uroomAnalytics.png" 
          alt="Uroom Sports Analytics" 
          className={styles.logoImage}
        />
        <span>Uroom Sports Analytics</span>
      </Link>
      <nav className={styles.nav}>
        <Link href="/about" className={styles.navLink}>À propos</Link>
        <Link href="/how-it-works" className={styles.navLink}>Fonctionnement</Link>
        <Link href="/pricing" className={styles.navLink}>Tarifs</Link>
        <Link href="/contact" className={styles.navLink}>Contact</Link>
        
        {status === 'loading' ? (
          <div className={styles.loginBtn}>...</div>
        ) : session ? (
          <div className={styles.userMenu} ref={dropdownRef}>
            <button 
              className={styles.userButton}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className={styles.avatar}>
                {session.user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className={styles.userName}>{session.user.name}</span>
              <svg 
                className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ''}`}
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="none"
              >
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            
            {dropdownOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownName}>{session.user.name}</div>
                  <div className={styles.dropdownRole}>{getRoleLabel()}</div>
                </div>
                <div className={styles.dropdownDivider} />
                
                {/* Menu items dynamiques selon le rôle */}
                {getRoleMenuItems().map((item, index) => (
                  <Link 
                    key={index}
                    href={item.href} 
                    className={styles.dropdownItem}
                    onClick={() => setDropdownOpen(false)}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
                
                <div className={styles.dropdownDivider} />
                <Link 
                  href="/dashboard/profile" 
                  className={styles.dropdownItem}
                  onClick={() => setDropdownOpen(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M2 14C2 11.2386 4.68629 9 8 9C11.3137 9 14 11.2386 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Mon profil
                </Link>
                <div className={styles.dropdownDivider} />
                <button 
                  className={styles.dropdownItem}
                  onClick={handleLogout}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6M11 11L14 8M14 8L11 5M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/auth/login" className={styles.loginBtn}>Connexion</Link>
        )}
      </nav>
    </header>
  );
}
