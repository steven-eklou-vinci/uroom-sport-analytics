
import { ReactNode } from 'react';
import RequireAuth from './RequireAuth';
import styles from './layout.module.css';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className={styles.dashboardContainer}>
        <main className={styles.mainContent}>{children}</main>
      </div>
    </RequireAuth>
  );
}
