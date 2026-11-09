import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import Screen from '../../components/Screen';
import PlayerHeader from '../../components/PlayerHeader';
import usePlayerProfile from '../../hooks/usePlayerProfile';
import { getApiBaseUrl } from '../../api/client';
import { colors, spacing, typography } from '../../theme';

export default function PlayerClipsScreen() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const { profile, addVideoUrl, removeVideoUrl, uploadVideoFile, updatingVideos } = usePlayerProfile();
  const videos = profile?.videoUrls ?? [];

  const handleAddYoutube = async () => {
    if (!youtubeUrl.trim()) return;
    await addVideoUrl(youtubeUrl);
    setYoutubeUrl('');
  };

  const handleOpenVideo = async (url: string) => {
    const targetUrl = normalizeVideoUrl(url);
    if (!targetUrl) {
      Alert.alert('Unable to open', 'This video link is not available yet.');
      return;
    }
    const supported = await Linking.canOpenURL(targetUrl);
    if (supported) {
      await Linking.openURL(targetUrl);
    } else {
      Alert.alert('Unable to open', 'This video link cannot be opened on this device.');
    }
  };

  const handlePickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    await uploadVideoFile({
      uri: asset.uri,
      name: asset.fileName || `video-${Date.now()}.mp4`,
      type: asset.type === 'video' ? 'video/mp4' : 'video/mp4'
    });
  };

  const handleRecordVideo = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    await uploadVideoFile({
      uri: asset.uri,
      name: asset.fileName || `video-${Date.now()}.mp4`,
      type: asset.type === 'video' ? 'video/mp4' : 'video/mp4'
    });
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PlayerHeader title="Clips" subtitle="Upload your highlights" />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your videos</Text>
          <Text style={styles.cardText}>Synced from web and mobile.</Text>
          <View style={styles.videoList}>
            {videos.length > 0 ? (
              videos.map((url, index) => (
                <View key={`${url}-${index}`} style={styles.videoItem}>
                  {isYouTubeUrl(url) ? (
                    <View style={styles.videoPreviewPlaceholder}>
                      <Text style={styles.videoPreviewText}>YouTube</Text>
                    </View>
                  ) : ExpoVideo ? (
                    <ExpoVideo
                      source={{ uri: normalizeVideoUrl(url) ?? '' }}
                      style={styles.videoPreview}
                      resizeMode="cover"
                      isMuted
                      shouldPlay={false}
                    />
                  ) : (
                    <View style={styles.videoPreviewPlaceholder}>
                      <Text style={styles.videoPreviewText}>Preview unavailable</Text>
                    </View>
                  )}
                  <View style={styles.videoRow}>
                    <View style={styles.videoText}>
                      <Text style={styles.videoLabel}>Video {index + 1}</Text>
                      <Text style={styles.videoUrl} numberOfLines={1}>
                        {normalizeVideoUrl(url) ?? url}
                      </Text>
                    </View>
                    <View style={styles.videoActions}>
                      <TouchableOpacity
                        style={styles.videoBtn}
                        activeOpacity={0.85}
                        onPress={() => handleOpenVideo(url)}
                      >
                        <Text style={styles.videoBtnText}>Open</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.videoBtn, styles.videoBtnDanger]}
                        activeOpacity={0.85}
                        onPress={() => removeVideoUrl(url)}
                      >
                        <Text style={styles.videoBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No videos yet.</Text>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload highlights</Text>
          <Text style={styles.cardText}>
            Add clips from your gallery or record a new highlight.
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={handlePickVideo}>
              <Text style={styles.primaryBtnText}>Upload video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.85} onPress={handleRecordVideo}>
              <Text style={styles.ghostBtnText}>Record</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Attach to a match</Text>
          <Text style={styles.cardText}>Match vs Anderlecht U16</Text>
          <View style={styles.tagsRow}>
            {['assist', 'dribble reussi', 'pressing recuperation'].map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.85}>
            <Text style={styles.ghostBtnText}>Attach video</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Highlight reel</Text>
          <Text style={styles.cardText}>
            Create a mini reel and download it when you are done.
          </Text>
          <View style={styles.reelRow}>
            <View style={styles.reelSlot}>
              <Text style={styles.reelSlotText}>+ Add clip</Text>
            </View>
            <View style={styles.reelSlot}>
              <Text style={styles.reelSlotText}>+ Add clip</Text>
            </View>
            <View style={styles.reelSlot}>
              <Text style={styles.reelSlotText}>+ Add clip</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Generate reel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.85}>
            <Text style={styles.ghostBtnText}>Download</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>YouTube upload</Text>
          <Text style={styles.cardText}>Paste a YouTube link to add your highlight.</Text>
          <TextInput
            placeholder="https://youtube.com/watch?v=..."
            placeholderTextColor={colors.gray[400]}
            value={youtubeUrl}
            onChangeText={setYoutubeUrl}
            autoCapitalize="none"
            style={styles.input}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, updatingVideos && styles.primaryBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleAddYoutube}
            disabled={updatingVideos}
          >
            <Text style={styles.primaryBtnText}>
              {updatingVideos ? 'Saving...' : 'Add YouTube video'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const ExpoVideo = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-av').Video as typeof import('expo-av').Video;
  } catch {
    return null;
  }
})();

function isYouTubeUrl(url: string): boolean {
  return /youtu\.be|youtube\.com/i.test(url);
}

function normalizeVideoUrl(url: string): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('file://')) {
    const stripped = url.replace('file://', '');
    if (stripped.startsWith('/uploads/')) {
      return `${getApiBaseUrl()}${stripped}`;
    }
    return null;
  }
  if (url.startsWith('/uploads/')) {
    return `${getApiBaseUrl()}${url}`;
  }
  return url;
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxl
  },
  card: {
    backgroundColor: colors.dark,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[600],
    marginTop: spacing.md,
    gap: spacing.sm
  },
  cardTitle: {
    color: colors.light,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold
  },
  cardText: {
    color: colors.gray[300],
    fontSize: typography.sizes.sm
  },
  videoList: {
    gap: spacing.sm
  },
  videoItem: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[600],
    backgroundColor: colors.gray[700],
    gap: spacing.xs
  },
  videoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  videoText: {
    flex: 1
  },
  videoActions: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  videoBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.gray[600]
  },
  videoBtnDanger: {
    backgroundColor: colors.error
  },
  videoBtnText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold
  },
  videoLabel: {
    color: colors.light,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold
  },
  videoUrl: {
    color: colors.gray[300],
    fontSize: typography.sizes.xs
  },
  emptyText: {
    color: colors.gray[400],
    fontSize: typography.sizes.sm
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  primaryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: 12
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold
  },
  primaryBtnDisabled: {
    opacity: 0.7
  },
  ghostBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[700],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[600],
    alignSelf: 'flex-start'
  },
  ghostBtnText: {
    color: colors.light,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 184, 166, 0.15)'
  },
  tagText: {
    color: colors.secondary,
    fontSize: typography.sizes.xs
  },
  reelRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  reelSlot: {
    flex: 1,
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[600],
    backgroundColor: colors.gray[700],
    alignItems: 'center',
    justifyContent: 'center'
  },
  reelSlotText: {
    color: colors.gray[300],
    fontSize: typography.sizes.xs
  },
  input: {
    backgroundColor: colors.gray[700],
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.light,
    borderWidth: 1,
    borderColor: colors.gray[600]
  }
});
