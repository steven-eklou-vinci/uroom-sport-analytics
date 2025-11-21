
import Header from './components/ui/Header';
import Footer from './components/ui/Footer';
import ClientLayout from './ClientLayout';
import styles from './layout.module.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={styles.body}>
        <ClientLayout>
          <Header />
          <main className={styles.main}>{children}</main>
          <Footer />
        </ClientLayout>
      </body>
    </html>
  );
}