import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

type VideoPlayerModalProps = {
  visible: boolean;
  url: string | null;
  onClose: () => void;
};

const ExpoVideo = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-av').Video as typeof import('expo-av').Video;
  } catch {
    return null;
  }
})();

export default function VideoPlayerModal({ visible, url, onClose }: VideoPlayerModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Video preview</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.body}>
            {url && ExpoVideo ? (
              <ExpoVideo
                source={{ uri: url }}
                style={styles.video}
                resizeMode="contain"
                useNativeControls
                shouldPlay
              />
            ) : (
              <Text style={styles.fallback}>Preview unavailable</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 26, 0.85)',
    justifyContent: 'center',
    padding: spacing.lg
  },
  card: {
    backgroundColor: colors.dark,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray[600],
    overflow: 'hidden'
  },
  header: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    color: colors.light,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.bold
  },
  closeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.gray[700]
  },
  closeText: {
    color: colors.light,
    fontSize: typography.sizes.sm
  },
  body: {
    padding: spacing.md
  },
  video: {
    width: '100%',
    height: 320
  },
  fallback: {
    color: colors.gray[300],
    fontSize: typography.sizes.sm,
    textAlign: 'center'
  }
});
