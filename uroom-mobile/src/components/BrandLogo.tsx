import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';

import { spacing } from '../theme';

type BrandLogoProps = {
  variant?: 'full' | 'mark';
};

const logoFull: ImageSourcePropType = require('../../assets/uroomAnalyticsLogo.png');
const logoMark: ImageSourcePropType = require('../../assets/uroomAnalyticsLogo.png');

export default function BrandLogo({ variant = 'mark' }: BrandLogoProps) {
  const source = variant === 'full' ? logoFull : logoMark;
  const imageStyle = variant === 'full' ? styles.full : styles.mark;

  return (
    <View style={styles.container}>
      <Image source={source} style={imageStyle} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md
  },
  full: {
    width: 340,
    height: 110
  },
  mark: {
    width: 140,
    height: 140
  }
});
