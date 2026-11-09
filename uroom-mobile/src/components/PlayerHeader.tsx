import { Image, StyleSheet, View } from 'react-native';

import SectionHeader from './SectionHeader';
import { spacing } from '../theme';

type PlayerHeaderProps = {
  title: string;
  subtitle?: string;
  iconSize?: number;
};

const logo = require('../../assets/icon_uroomAnalytics.png');

export default function PlayerHeader({ title, subtitle, iconSize = 72 }: PlayerHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <SectionHeader title={title} subtitle={subtitle} />
      </View>
      <Image source={logo} style={[styles.logo, { width: iconSize, height: iconSize }]} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  text: {
    flex: 1
  },
  logo: {
    width: 72,
    height: 72
  }
});
