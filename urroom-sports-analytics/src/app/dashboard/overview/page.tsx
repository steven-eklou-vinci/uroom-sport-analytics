"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function DashboardOverview() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/login');
      return;
    }

    // Rediriger vers le bon dashboard selon le rôle
    const roleMap: Record<string, string> = {
      'ADMIN': '/dashboard/admin',
      'CLUB': '/dashboard/club',
      'SCOUT': '/dashboard/scout',
      'AGENT': '/dashboard/agent',
      'PLAYER': '/dashboard/players'
    };

    const redirectPath = session.user?.role ? roleMap[session.user.role] : '/dashboard/club';
    router.push(redirectPath);
  }, [session, status, router]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '50vh',
      color: '#94A3B8',
      fontSize: '1.125rem'
    }}>
      Redirection vers votre tableau de bord...
    </div>
  );
}
