import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { aiRequest } from '../api/client';
import { colors, spacing, typography } from '../theme';

type MessageRole = 'assistant' | 'user';

type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
};

type AgentProfile = {
  key: string;
  subtitle: string;
  welcomeMessage: string;
};

function getAgentProfile(role: string): AgentProfile {
  const normalizedRole = role.toLowerCase();

  if (
    normalizedRole.includes('player') ||
    normalizedRole.includes('athlete') ||
    normalizedRole.includes('footballer') ||
    normalizedRole.includes('joueur')
  ) {
    return {
      key: 'player',
      subtitle: 'Assistant pour joueur actif',
      welcomeMessage:
        "Salut, je suis l'Agent IA Uroom pour joueur. Je peux t'aider sur les fonctionnalites de l'app (profil, clips, progression) et sur les questions foot/sport."
    };
  }

  if (normalizedRole.includes('scout')) {
    return {
      key: 'scout',
      subtitle: 'Assistant scouting actif',
      welcomeMessage:
        "Salut, je suis l'Agent IA Uroom pour scout. Je peux t'aider sur les fonctionnalites de l'app (shortlists, rapports, exports) et sur les questions foot/sport."
    };
  }

  if (normalizedRole.includes('club')) {
    return {
      key: 'club',
      subtitle: 'Assistant club actif',
      welcomeMessage:
        "Salut, je suis l'Agent IA Uroom pour club. Je peux t'aider sur les fonctionnalites de l'app (recrutement, besoins d'effectif, profils cibles) et sur les questions foot/sport."
    };
  }

  if (normalizedRole.includes('agent')) {
    return {
      key: 'agent',
      subtitle: 'Assistant agent actif',
      welcomeMessage:
        "Salut, je suis l'Agent IA Uroom pour agent. Je peux t'aider sur les fonctionnalites de l'app (opportunites, suivi des joueurs) et sur les questions foot/sport."
    };
  }

  if (normalizedRole.includes('admin')) {
    return {
      key: 'admin',
      subtitle: 'Assistant admin actif',
      welcomeMessage:
        "Salut, je suis l'Agent IA Uroom pour admin. Je peux t'aider sur les fonctionnalites de l'app (pilotage, configuration) et sur les questions foot/sport."
    };
  }

  return {
    key: 'default',
    subtitle: 'Assistant Uroom actif',
    welcomeMessage:
      "Salut, je suis l'Agent IA Uroom. Je peux t'aider sur les fonctionnalites Uroom Sports Analytics et sur les questions foot/sport."
  };
};

type ChatApiResponse = {
  answer: string;
  category: 'football' | 'app-help' | 'mixed' | 'general';
  followUpQuestion?: string;
};

type AIAgentWidgetProps = {
  role?: string;
  locale?: string | null;
};

export default function AIAgentWidget({ role = '', locale }: AIAgentWidgetProps) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [question, setQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [typingDots, setTypingDots] = useState('...');
  const agentProfile = useMemo(() => getAgentProfile(role), [role]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: `welcome-${agentProfile.key}`,
      role: 'assistant',
      content: agentProfile.welcomeMessage
    }
  ]);
  const scrollRef = useRef<ScrollView | null>(null);

  const bottomOffset = useMemo(() => Math.max(insets.bottom + 84, 92), [insets.bottom]);

  useEffect(() => {
    setMessages([
      {
        id: `welcome-${agentProfile.key}`,
        role: 'assistant',
        content: agentProfile.welcomeMessage
      }
    ]);
    setQuestion('');
  }, [agentProfile.key, agentProfile.welcomeMessage]);

  useEffect(() => {
    if (!isSending) {
      setTypingDots('...');
      return;
    }

    const frames = ['.', '..', '...'];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % frames.length;
      setTypingDots(frames[index]);
    }, 300);

    return () => clearInterval(interval);
  }, [isSending]);

  useEffect(() => {
    if (!visible) return;

    const timeout = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timeout);
  }, [isSending, messages, visible]);

  const handleSend = async () => {
    const trimmed = question.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');

    setIsSending(true);

    try {
      const response = await aiRequest<ChatApiResponse>('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          question: trimmed,
          role,
          locale,
          appContext: 'mobile-ai-widget'
        })
      });

      const answerText = response.followUpQuestion
        ? `${response.answer}\n\n${response.followUpQuestion}`
        : response.answer;

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: answerText
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.warn('AI assistant request failed', error);
      const fallbackText = locale?.toLowerCase().startsWith('en')
        ? 'I cannot answer right now. Please retry in a few seconds.'
        : 'Je ne peux pas repondre pour le moment. Reessaie dans quelques secondes.';

      const assistantMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: fallbackText
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Uroom AI agent"
        onPress={() => setVisible(true)}
        style={[styles.floatingButton, { bottom: bottomOffset }]}
      >
        <View style={styles.buttonIconShell}>
          <Feather color={colors.light} name="message-circle" size={24} />
        </View>
        <View style={styles.onlineDot} />
      </Pressable>

      <Modal animationType="slide" transparent visible={visible} onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIcon}>
                    <Feather color={colors.light} name="message-square" size={16} />
                  </View>
                  <View>
                    <Text style={styles.title}>Uroom Agent IA</Text>
                    <Text style={styles.subtitle}>{agentProfile.subtitle}</Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close chat"
                  onPress={() => setVisible(false)}
                  style={styles.closeButton}
                >
                  <Feather color={colors.light} name="x" size={18} />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.messagesContent}
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((message) => {
                  const isAssistant = message.role === 'assistant';
                  return (
                    <View
                      key={message.id}
                      style={[styles.messageBubble, isAssistant ? styles.assistantBubble : styles.userBubble]}
                    >
                      <Text style={styles.messageText}>{message.content}</Text>
                    </View>
                  );
                })}

                {isSending ? (
                  <View style={[styles.messageBubble, styles.assistantBubble, styles.typingBubble]}>
                    <Text style={styles.messageText}>{typingDots}</Text>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.inputRow}>
                <TextInput
                  onChangeText={setQuestion}
                  onSubmitEditing={handleSend}
                  editable={!isSending}
                  placeholder="Pose ta question..."
                  placeholderTextColor={colors.gray[300]}
                  returnKeyType="send"
                  style={styles.input}
                  value={question}
                />
                <Pressable disabled={isSending} onPress={handleSend} style={styles.sendButton}>
                  <Feather color={colors.primary} name="send" size={16} />
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    alignItems: 'center',
    backgroundColor: colors.dark,
    borderColor: '#2DD4BF',
    borderRadius: 32,
    borderWidth: 2,
    elevation: 8,
    height: 64,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: 64,
    zIndex: 30
  },
  buttonIconShell: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  onlineDot: {
    backgroundColor: '#4ADE80',
    borderColor: colors.dark,
    borderRadius: 6,
    borderWidth: 2,
    bottom: 6,
    height: 12,
    position: 'absolute',
    right: 6,
    width: 12
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.65)'
  },
  sheet: {
    backgroundColor: '#0B1224',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '78%',
    minHeight: '52%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: '#0F4A75',
    borderRadius: 10,
    height: 30,
    justifyContent: 'center',
    width: 30
  },
  title: {
    color: colors.light,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.sizes.md
  },
  subtitle: {
    color: colors.secondary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.sizes.xs
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.gray[600],
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28
  },
  messagesContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  },
  messageBubble: {
    borderRadius: 16,
    maxWidth: '90%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gray[600],
    borderColor: '#1E3A5F',
    borderWidth: 1
  },
  typingBubble: {
    minWidth: 52
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.secondary
  },
  messageText: {
    color: colors.light,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.sizes.sm,
    lineHeight: 20
  },
  inputRow: {
    alignItems: 'center',
    backgroundColor: '#111C34',
    borderColor: '#1F365F',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm
  },
  input: {
    color: colors.light,
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.sizes.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36
  }
});
