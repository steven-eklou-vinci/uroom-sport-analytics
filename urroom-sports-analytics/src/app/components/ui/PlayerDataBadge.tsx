import React from 'react';
import styles from './PlayerDataBadge.module.css';

interface PlayerDataBadgeProps {
  dataSource: 'PLATFORM_DATA' | 'SCOUT_CREATED';
  createdByScout?: { name: string; email: string };
  compact?: boolean;
}

export default function PlayerDataBadge({ 
  dataSource, 
  createdByScout,
  compact = false 
}: PlayerDataBadgeProps) {
  const isPlatformData = dataSource === 'PLATFORM_DATA';

  return (
    <div className={`${styles.badge} ${isPlatformData ? styles.platformData : styles.scoutCreated} ${compact ? styles.compact : ''}`}>
      <span className={`${styles.dot} ${isPlatformData ? styles.dotGreen : styles.dotOrange}`}></span>
      <span className={styles.text}>
        {isPlatformData 
          ? 'Données complètes' 
          : `Profil scout${createdByScout && !compact ? ` - ${createdByScout.name}` : ''}`
        }
      </span>
    </div>
  );
}
