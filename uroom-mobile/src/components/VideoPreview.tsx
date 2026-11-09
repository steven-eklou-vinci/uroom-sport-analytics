import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme';

type VideoPreviewProps = {
  url: string | null;
  height?: number;
  label?: string;
  onPress?: () => void;
};

const ExpoVideo = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-av').Video as typeof import('expo-av').Video;
  } catch {
    return null;
  }
})();

const VideoThumbnails = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-video-thumbnails') as typeof import('expo-video-thumbnails');
  } catch {
    return null;
  }
})();

export default function VideoPreview({ url, height = 140, label, onPress }: VideoPreviewProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!VideoThumbnails || !url) return;
      try {
        const result = await VideoThumbnails.getThumbnailAsync(url, { time: 1000 });
        if (isMounted) {
          setThumbnail(result.uri);
        }
      } catch {
        if (isMounted) {
          setThumbnail(null);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [url]);

  const content = () => {
    if (!url) {
      return (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No preview</Text>
        </View>
      );
    }

    if (thumbnail) {
      return (
        <Image source={{ uri: thumbnail }} style={[styles.thumbnail, { height }]} resizeMode="cover" />
      );
    }

    if (ExpoVideo) {
      return (
        <ExpoVideo
          source={{ uri: url }}
          style={[styles.video, { height }]}
          resizeMode="cover"
          isMuted
          shouldPlay={false}
        />
      );
    }

    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Preview unavailable</Text>
      </View>
    );
  };

  return (
    <Pressable style={styles.container} onPress={onPress} disabled={!onPress}>
      {content()}
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  thumbnail: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: colors.gray[800]
  },
  video: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: colors.gray[800]
  },
  placeholder: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: colors.gray[800],
    alignItems: 'center',
    justifyContent: 'center',
    height: 140
  },
  placeholderText: {
    color: colors.gray[300],
    fontSize: typography.sizes.sm
  },
  label: {
    marginTop: 6,
    color: colors.gray[400],
    fontSize: typography.sizes.xs
  }
});
