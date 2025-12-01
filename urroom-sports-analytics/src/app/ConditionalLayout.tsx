"use client";
import { usePathname } from 'next/navigation';
import Header from './components/ui/Header';
import Footer from './components/ui/Footer';
import styles from './layout.module.css';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  return (
    <>
      <Header />
      <main className={isDashboard ? '' : styles.main}>{children}</main>
      <Footer />
    </>
  );
}
