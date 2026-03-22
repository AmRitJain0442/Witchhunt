import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { createCheckin, getTodaysCheckin } from '../../api/health';
import { CheckinCreateRequest } from '../../types';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants';

type SliderProps = {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  emojis?: string[];
};

function EmojiSlider({ label, value, onChange, min = 1, max = 5, emojis }: SliderProps) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <View style={styles.sliderGroup}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <View style={styles.sliderRow}>
        {steps.map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.sliderStep, value === v && styles.sliderStepActive]}
            onPress={() => onChange(v)}
          >
            <Text style={styles.sliderEmoji}>{emojis ? emojis[v - min] : String(v)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const SYMPTOM_OPTIONS = [
  'Headache', 'Fatigue', 'Nausea', 'Back pain', 'Chest pain',
  'Shortness of breath', 'Dizziness', 'Cough', 'Fever', 'Joint pain',
];

export default function CheckinScreen() {
  const [existing, setExisting] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [mood, setMood] = useState<number | undefined>();
  const [energy, setEnergy] = useState<number | undefined>();
  const [pain, setPain] = useState<number | undefined>();
  const [sleep, setSleep] = useState<number | undefined>();
  const [sleepQuality, setSleepQuality] = useState<number | undefined>();
  const [stress, setStress] = useState<number | undefined>();
  const [hydration, setHydration] = useState<number | undefined>();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    getTodaysCheckin()
      .then((data) => {
        if (data) {
          setExisting(true);
          setMood(data.mood);
          setEnergy(data.energy_level);
          setPain(data.pain_level);
          setSleep(data.sleep_hours ? Math.round(data.sleep_hours) : undefined);
          setSleepQuality(data.sleep_quality);
          setStress(data.stress_level);
          setHydration(data.hydration_glasses);
          setSelectedSymptoms(data.symptoms ?? []);
          setNotes(data.notes ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const submit = async () => {
    if (!mood) {
      Alert.alert('Mood required', 'Please rate your mood to submit a check-in.');
      return;
    }
    setSubmitting(true);
    const payload: CheckinCreateRequest = {
      mood,
      energy_level: energy,
      pain_level: pain,
      sleep_hours: sleep,
      sleep_quality: sleepQuality,
      stress_level: stress,
      hydration_glasses: hydration,
      symptoms: selectedSymptoms,
      notes: notes.trim() || undefined,
    };
    try {
      await createCheckin(payload);
      setExisting(true);
      Alert.alert('Saved! 🌿', 'Your health check-in has been recorded.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>
          {existing ? "Today's check-in ✓" : "How are you today?"}
        </Text>
        <Text style={styles.headerSub}>
          {existing ? 'You can update your check-in anytime.' : 'Takes 2 minutes. Log daily for best results.'}
        </Text>
      </View>

      <EmojiSlider
        label="Mood"
        value={mood}
        onChange={setMood}
        emojis={['😢', '😕', '😐', '🙂', '😄']}
      />
      <EmojiSlider
        label="Energy level"
        value={energy}
        onChange={setEnergy}
        emojis={['😴', '🥱', '😐', '⚡', '🚀']}
      />
      <EmojiSlider
        label="Pain level"
        value={pain}
        onChange={setPain}
        emojis={['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣']}
      />
      <EmojiSlider
        label="Stress level"
        value={stress}
        onChange={setStress}
        emojis={['😌', '🙂', '😐', '😟', '😰']}
      />

      {/* Sleep */}
      <View style={styles.sliderGroup}>
        <Text style={styles.sliderLabel}>Sleep hours last night</Text>
        <View style={styles.sliderRow}>
          {[4, 5, 6, 7, 8, 9, 10].map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.sliderStep, sleep === v && styles.sliderStepActive]}
              onPress={() => setSleep(v)}
            >
              <Text style={styles.sliderEmoji}>{v}h</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <EmojiSlider
        label="Sleep quality"
        value={sleepQuality}
        onChange={setSleepQuality}
        emojis={['😵', '😴', '😐', '😴', '💤']}
      />

      {/* Hydration */}
      <View style={styles.sliderGroup}>
        <Text style={styles.sliderLabel}>Water glasses today</Text>
        <View style={styles.sliderRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.sliderStep, hydration === v && styles.sliderStepActive]}
              onPress={() => setHydration(v)}
            >
              <Text style={styles.sliderEmoji}>{v}💧</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Symptoms */}
      <View style={styles.sliderGroup}>
        <Text style={styles.sliderLabel}>Any symptoms? (optional)</Text>
        <View style={styles.chipRow}>
          {SYMPTOM_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, selectedSymptoms.includes(s) && styles.chipActive]}
              onPress={() => toggleSymptom(s)}
            >
              <Text style={[styles.chipText, selectedSymptoms.includes(s) && styles.chipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.sliderGroup}>
        <Text style={styles.sliderLabel}>Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any other observations for today…"
          placeholderTextColor={COLORS.text.disabled}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={submit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color={COLORS.text.inverse} />
        ) : (
          <Text style={styles.submitText}>{existing ? 'Update check-in' : 'Save check-in'}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text.inverse,
  },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: FONTS.sizes.sm, marginTop: 4 },
  sliderGroup: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sliderLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  sliderRow: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  sliderStep: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderStepActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sliderEmoji: { fontSize: 13 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONTS.sizes.sm, color: COLORS.text.secondary },
  chipTextActive: { color: COLORS.text.inverse },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  submitText: {
    color: COLORS.text.inverse,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
});
