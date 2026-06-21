import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { StatusBanner } from '../../src/components/ui/StatusBanner';
import { ChatError, chatService } from '../../src/features/chat/chatService';
import { useAuth } from '../../src/features/auth/useAuth';
import { colors, fontSize, fontWeight, radius, spacing } from '../../src/theme/tokens';
import type { Message } from '../../src/types/chat';

export default function CaseScreen() {
  const { id: reportId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [joiningCase, setJoiningCase] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const listRef = useRef<FlatList<Message>>(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await chatService.getCaseMessages(reportId);
      setMessages(data);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [reportId]);

  useEffect(() => {
    chatService.isMember(reportId).then((member) => {
      setIsMember(member);
      if (member) {
        void loadMessages();
      } else {
        setLoadState('ready');
      }
    }).catch(() => setLoadState('ready'));
  }, [reportId, loadMessages]);

  useEffect(() => {
    if (!isMember) return;
    return chatService.subscribeToCaseMessages(reportId, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
  }, [reportId, isMember]);

  const handleJoin = async () => {
    setJoiningCase(true);
    try {
      await chatService.joinCase(reportId);
      setIsMember(true);
      await loadMessages();
    } catch {
      // ignore — user sees join button again
    } finally {
      setJoiningCase(false);
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    setSendError(null);
    const text = draft.trim();
    setDraft('');
    try {
      const msg = await chatService.sendCaseMessage(reportId, text);
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setSendError(err instanceof ChatError ? err.message : 'No se pudo enviar');
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <StatusBanner tone="info" message="Inicia sesión para unirte al caso y chatear." />
        </View>
      </SafeAreaView>
    );
  }

  if (!isMember) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.joinContainer}>
          <Text style={styles.joinTitle}>Únete al caso</Text>
          <Text style={styles.joinSubtitle}>
            Para ver los mensajes y colaborar en el rescate, únete al caso.
          </Text>
          <Pressable
            style={[styles.joinButton, joiningCase && styles.joinButtonDisabled]}
            onPress={handleJoin}
            disabled={joiningCase}
          >
            {joiningCase ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.joinButtonText}>Unirme al caso</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={88}
      >
        {loadState === 'error' ? (
          <StatusBanner tone="error" message="No se pudieron cargar los mensajes." />
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={styles.empty}>Sé el primero en escribir en este caso.</Text>
          }
          renderItem={({ item }) => {
            const isOwn = item.senderId === user.id;
            return (
              <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                {!isOwn && (
                  <Text style={styles.senderName}>{item.senderName}</Text>
                )}
                <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
                  {item.body}
                </Text>
                <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
                  {new Date(item.createdAt).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          }}
        />

        <View style={styles.inputRow}>
          {sendError ? (
            <Text style={styles.sendError}>{sendError}</Text>
          ) : null}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              returnKeyType="default"
            />
            <Pressable
              style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!draft.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendButtonText}>Enviar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  joinContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  joinTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  joinSubtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
  joinButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
    minWidth: 180,
    alignItems: 'center',
  },
  joinButtonDisabled: { opacity: 0.6 },
  joinButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  messagesList: {
    padding: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xxl,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  bubbleOwn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  senderName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  bubbleTextOwn: { color: '#fff' },
  bubbleTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    alignSelf: 'flex-end',
  },
  bubbleTimeOwn: { color: 'rgba(255,255,255,0.7)' },
  inputRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  sendError: {
    fontSize: fontSize.xs,
    color: colors.danger,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
