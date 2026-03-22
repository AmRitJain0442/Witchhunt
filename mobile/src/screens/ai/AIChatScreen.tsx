import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { sendMessage } from '../../api/ai';
import { loadLocalMemory, saveLocalMemory, applyMemoryPatches } from '../../store/AuthContext';
import { ConversationMessage, FiredTrigger } from '../../types';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants';

const WELCOME_MESSAGE: ConversationMessage = {
  role: 'assistant',
  content:
    "Namaste! 🙏 I'm your Kutumb health companion. I have your complete health profile and memory. Ask me anything — medicine interactions, diet advice, symptom questions, or just how you're doing today.",
};

function TriggerAlert({ trigger }: { trigger: FiredTrigger }) {
  const colors = {
    critical: COLORS.error,
    warning: COLORS.warning,
    info: COLORS.primaryLight,
  };
  return (
    <View style={[styles.triggerAlert, { borderColor: colors[trigger.severity] ?? COLORS.border }]}>
      <Text style={styles.triggerTitle}>
        {trigger.severity === 'critical' ? '🚨' : trigger.severity === 'warning' ? '⚠️' : 'ℹ️'}{' '}
        {trigger.trigger_name}
      </Text>
      <Text style={styles.triggerBody}>{trigger.message}</Text>
    </View>
  );
}

export default function AIChatScreen() {
  const [messages, setMessages] = useState<ConversationMessage[]>([WELCOME_MESSAGE]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [firedTriggers, setFiredTriggers] = useState<FiredTrigger[]>([]);
  const [localMemory, setLocalMemory] = useState<Record<string, unknown>>({});
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    loadLocalMemory().then(setLocalMemory);
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: ConversationMessage = { role: 'user', content: text };
    const newHistory = [...conversationHistory, userMsg];
    setMessages((prev) => [...prev, userMsg]);
    setConversationHistory(newHistory);
    setLoading(true);
    setFiredTriggers([]);

    try {
      const res = await sendMessage({
        message: text,
        conversation_history: newHistory,
        memory_file: localMemory,
      });

      const assistantMsg: ConversationMessage = { role: 'assistant', content: res.reply };
      setMessages((prev) => [...prev, assistantMsg]);
      setConversationHistory([...newHistory, assistantMsg]);

      if (res.fired_triggers?.length) {
        setFiredTriggers(res.fired_triggers);
      }

      if (res.patches?.length) {
        const updated = await applyMemoryPatches(localMemory, res.patches);
        setLocalMemory(updated);
        await saveLocalMemory(updated);
      }

      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: unknown) {
      const errMsg: ConversationMessage = {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item, index }: { item: ConversationMessage; index: number }) => (
    <View
      style={[
        styles.bubble,
        item.role === 'user' ? styles.userBubble : styles.aiBubble,
      ]}
    >
      {item.role === 'assistant' && <Text style={styles.aiBubbleLabel}>🌿 Kutumb AI</Text>}
      <Text
        style={[
          styles.bubbleText,
          item.role === 'user' ? styles.userBubbleText : styles.aiBubbleText,
        ]}
      >
        {item.content}
      </Text>
    </View>
  );

  const suggestedPrompts = [
    'Can I take paracetamol with my current medicines?',
    'What should I eat to improve my gut health?',
    'How is my overall health trending?',
    'Any interactions I should know about?',
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {firedTriggers.length > 0 && (
        <View style={styles.triggersContainer}>
          {firedTriggers.map((t, i) => <TriggerAlert key={i} trigger={t} />)}
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          messages.length === 1 ? (
            <View style={styles.suggestedContainer}>
              <Text style={styles.suggestedLabel}>Try asking:</Text>
              {suggestedPrompts.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestedChip}
                  onPress={() => setInput(p)}
                >
                  <Text style={styles.suggestedChipText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
      />

      {loading && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.typingText}>Kutumb AI is thinking…</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask me anything about your health…"
          placeholderTextColor={COLORS.text.disabled}
          multiline
          returnKeyType="send"
          onSubmitEditing={send}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  triggersContainer: { padding: SPACING.sm, gap: SPACING.xs },
  triggerAlert: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  triggerTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  triggerBody: { fontSize: FONTS.sizes.sm, color: COLORS.text.secondary },
  messageList: { padding: SPACING.md, paddingBottom: SPACING.sm },
  bubble: {
    maxWidth: '82%',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginVertical: SPACING.xs,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 2,
  },
  aiBubbleLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
    marginBottom: 4,
  },
  bubbleText: { fontSize: FONTS.sizes.md, lineHeight: 22 },
  userBubbleText: { color: COLORS.text.inverse },
  aiBubbleText: { color: COLORS.text.primary },
  suggestedContainer: { paddingTop: SPACING.md },
  suggestedLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  suggestedChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestedChipText: { color: COLORS.primary, fontSize: FONTS.sizes.sm },
  typingRow: {
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
  sendBtn: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendIcon: { color: COLORS.text.inverse, fontSize: 18 },
});
