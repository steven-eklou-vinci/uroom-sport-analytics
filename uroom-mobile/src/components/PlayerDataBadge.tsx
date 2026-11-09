import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PlayerDataSource } from '../types';

interface PlayerDataBadgeProps {
  dataSource: PlayerDataSource;
  createdByScout?: { name: string };
  compact?: boolean;
}

export const PlayerDataBadge: React.FC<PlayerDataBadgeProps> = ({ 
  dataSource, 
  createdByScout,
  compact = false 
}) => {
  const isPlatformData = dataSource === 'PLATFORM_DATA';

  return (
    <View style={[
      styles.container,
      isPlatformData ? styles.platformData : styles.scoutCreated,
      compact && styles.compact
    ]}>
      <View style={[styles.dot, isPlatformData ? styles.dotGreen : styles.dotOrange]} />
      <Text style={[
        styles.text,
        isPlatformData ? styles.textGreen : styles.textOrange,
        compact && styles.textCompact
      ]}>
        {isPlatformData 
          ? 'Données complètes' 
          : `Profil scout${createdByScout && !compact ? ` - ${createdByScout.name}` : ''}`
        }
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  platformData: {
    backgroundColor: '#E8F5E9',
  },
  scoutCreated: {
    backgroundColor: '#FFF3E0',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotGreen: {
    backgroundColor: '#4CAF50',
  },
  dotOrange: {
    backgroundColor: '#FF9800',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  textCompact: {
    fontSize: 11,
  },
  textGreen: {
    color: '#2E7D32',
  },
  textOrange: {
    color: '#E65100',
  },
});
