"use client";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/auth/login');
      return;
    }
    // RBAC : Redirection selon le rôle et la route
    const path = window.location.pathname;
    const role = session.user.role;
    
    // Admin uniquement
    if (path.startsWith('/dashboard/admin') && role !== 'ADMIN') {
      router.replace('/dashboard/overview');
      return;
    }
    // Clubs uniquement
    if (path.startsWith('/dashboard/clubs') && role !== 'ADMIN' && role !== 'SCOUT') {
      router.replace('/dashboard/overview');
      return;
    }
    // Facturation : admin et club
    if (path.startsWith('/dashboard/billing') && role !== 'ADMIN' && role !== 'CLUB') {
      router.replace('/dashboard/overview');
      return;
    }
    // Joueurs : admin, scout, club
    if (path.startsWith('/dashboard/players') && role === 'PLAYER') {
      router.replace('/dashboard/player');
      return;
    }
    // Évaluations, rapports, shortlists, trials : selon le rôle
    if ((path.startsWith('/dashboard/assessments') || path.startsWith('/dashboard/shortlists')) && role === 'PLAYER') {
      router.replace('/dashboard/player');
      return;
    }
    
    // Les joueurs ont accès à /dashboard/player, /dashboard/profile, /dashboard/reports, /dashboard/trials
    if (path.startsWith('/dashboard') && role === 'PLAYER') {
      const allowedPaths = ['/dashboard/player', '/dashboard/profile', '/dashboard/reports', '/dashboard/trials', '/dashboard/overview'];
      const isAllowed = allowedPaths.some(allowed => path.startsWith(allowed));
      if (!isAllowed) {
        router.replace('/dashboard/player');
        return;
      }
    }
  }, [session, status, router]);

  if (status === 'loading' || !session) {
    return <div className="text-center py-12">Chargement…</div>;
  }
  return <>{children}</>;
}
