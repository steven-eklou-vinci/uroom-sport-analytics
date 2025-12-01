'use client';
import Header from './components/ui/Header';
import Footer from './components/ui/Footer';
import ClientLayout from './ClientLayout';
import styles from './layout.module.css';
import ConditionalLayout from './ConditionalLayout';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');
  
  return (
    <html lang="fr">
      <body className={`${styles.body} ${isDashboard ? styles.bodyDashboard : styles.bodyPublic}`}>
        <ClientLayout>
          <ConditionalLayout>{children}</ConditionalLayout>
        </ClientLayout>
      </body>
    </html>
  );
}