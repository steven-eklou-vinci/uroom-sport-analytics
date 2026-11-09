'use client';

import React from 'react';
import styles from './ScoutReportsList.module.css';

interface ScoutReport {
  id: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  clubFit?: string[];
  createdAt: string;
  author?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ScoutReportsListProps {
  reports: ScoutReport[];
  userRole?: string;
}

export default function ScoutReportsList({ reports, userRole }: ScoutReportsListProps) {
  const showClubFit = userRole === 'CLUB' || userRole === 'ADMIN';

  if (!reports || reports.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <svg 
            width="48" 
            height="48" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5"
          >
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className={styles.emptyTitle}>Aucun rapport scout disponible</p>
        <p className={styles.emptyDescription}>
          Les rapports d'évaluation des scouts apparaîtront ici une fois créés.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.sectionTitle}>
        Rapports scouts ({reports.length})
      </h2>

      <div className={styles.reportsList}>
        {reports.map((report) => (
          <div key={report.id} className={styles.reportCard}>
            <div className={styles.reportHeader}>
              <span className={styles.reportDate}>
                {new Date(report.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              {report.author && (
                <span className={styles.reportAuthor}>
                  Par {report.author.name}
                </span>
              )}
            </div>

            <div className={styles.reportSection}>
              <h3 className={styles.reportSectionTitle}>Résumé</h3>
              <p className={styles.reportText}>{report.summary}</p>
            </div>

            <div className={styles.reportSection}>
              <h3 className={styles.reportSectionTitle}>Forces</h3>
              <ul className={styles.bulletList}>
                {report.strengths.map((strength, index) => (
                  <li key={index} className={styles.bulletItem}>
                    <span className={styles.bulletIcon}>✓</span>
                    <span className={styles.bulletText}>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.reportSection}>
              <h3 className={styles.reportSectionTitle}>Faiblesses</h3>
              <ul className={styles.bulletList}>
                {report.weaknesses.map((weakness, index) => (
                  <li key={index} className={styles.bulletItem}>
                    <span className={styles.bulletIcon}>•</span>
                    <span className={styles.bulletText}>{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>

            {showClubFit && report.clubFit && report.clubFit.length > 0 && (
              <div className={styles.reportSection}>
                <div className={styles.clubFitHeader}>
                  <h3 className={styles.reportSectionTitle}>Adéquation club</h3>
                  <span className={styles.clubFitBadge}>Clubs uniquement</span>
                </div>
                <ul className={styles.bulletList}>
                  {report.clubFit.map((fit, index) => (
                    <li key={index} className={styles.bulletItem}>
                      <span className={styles.bulletIcon}>→</span>
                      <span className={styles.bulletText}>{fit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
