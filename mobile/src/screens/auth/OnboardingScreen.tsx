import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { startOnboarding } from '../../api/ai';
import { saveLocalMemory, applyMemoryPatches } from '../../store/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants';

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

const INITIAL_STAGE = 'welcome';

export default function OnboardingScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Namaste! 🙏 I'm Kutumb AI, your personal health companion. I'd like to learn about you so I can give you the best health guidance. Let's start — what's your name?",
    },
  ]);
  const [input, setInput] = useState('');
  const [stage, setStage] = useState(INITIAL_STAGE);
  const [loading, setLoading] = useState(false);
  const [localMemory, setLocalMemory] = useState<Record<string, unknown>>({});
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const listRef = useRef<FlatList>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newHistory = [...conversationHistory, userMsg];
    setMessages((prev) => [...prev, userMsg]);
    setConversationHistory(newHistory);
    setLoading(true);

    try {
      const res = await startOnboarding(stage, text, newHistory);
      const assistantMsg: ChatMessage = { role: 'assistant', content: res.reply };
      setMessages((prev) => [...prev, assistantMsg]);
      setConversationHistory([...newHistory, assistantMsg]);

      // Apply patches to local memory
      if (res.patches?.length) {
        const updated = await applyMemoryPatches(localMemory, res.patches);
        setLocalMemory(updated);
        await saveLocalMemory(updated);
      }

      // Advance stage
      if (res.next_stage && res.next_stage !== stage) {
        setStage(res.next_stage);
      }

      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Sorry, I couldn't connect. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View
      style={[
        styles.bubble,
        item.role === 'user' ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <Text
        style={[
          styles.bubbleText,
          item.role === 'user' ? styles.userBubbleText : styles.assistantBubbleText,
        ]}
      >
        {item.content}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌿 Health Setup</Text>
        <Text style={styles.headerSubtitle}>Tell Kutumb AI about yourself</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {loading && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.typingText}>Kutumb AI is thinking…</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type your answer…"
          placeholderTextColor={COLORS.text.disabled}
          multiline
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={send} disabled={loading || !input.trim()}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    paddingTop: SPACING.xl + SPACING.lg,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text.inverse,
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONTS.sizes.sm,
    marginTop: 4,
  },
  messageList: { padding: SPACING.md, paddingBottom: SPACING.lg },
  bubble: {
    maxWidth: '80%',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginVertical: SPACING.xs,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: RADIUS.sm,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleText: { fontSize: FONTS.sizes.md, lineHeight: 22 },
  userBubbleText: { color: COLORS.text.inverse },
  assistantBubbleText: { color: COLORS.text.primary },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  typingText: { color: COLORS.text.secondary, fontSize: FONTS.sizes.sm },
  inputRow: {
    flexDirection: 'row',
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: { color: COLORS.text.inverse, fontSize: 18 },
});
