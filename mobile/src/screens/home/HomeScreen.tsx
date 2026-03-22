import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../../store/AuthContext';
import { getHealthScores, getAdvisories, getTodaySchedule } from '../../api/health';
import { HealthScoreResponse, HealthAdvisoryResponse, TodayScheduleResponse } from '../../types';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants';

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const letter = label[0];
  return (
    <View style={styles.scoreRingContainer}>
      <View style={[styles.scoreRing, { borderColor: color }]}>
        <Text style={[styles.scoreValue, { color }]}>{Math.round(score)}</Text>
        <Text style={[styles.scoreLabel, { color }]}>{letter}</Text>
      </View>
      <Text style={styles.scoreName}>{label}</Text>
    </View>
  );
}

function AdvisoryCard({ title, body, severity }: { title: string; body: string; severity: string }) {
  const bgColors = {
    critical: '#FFF0F0',
    warning: '#FFFBF0',
    info: '#F0F8FF',
  };
  const borderColors = {
    critical: COLORS.error,
    warning: COLORS.warning,
    info: COLORS.primaryLight,
  };
  const icons = { critical: '🚨', warning: '⚠️', info: 'ℹ️' };
  const sev = severity as keyof typeof bgColors;

  return (
    <View style={[styles.advisoryCard, { backgroundColor: bgColors[sev], borderLeftColor: borderColors[sev] }]}>
      <Text style={styles.advisoryTitle}>{icons[sev]} {title}</Text>
      <Text style={styles.advisoryBody}>{body}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { appUser } = useAuth();
  const [scores, setScores] = useState<HealthScoreResponse | null>(null);
  const [advisories, setAdvisories] = useState<HealthAdvisoryResponse | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<TodayScheduleResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, a, t] = await Promise.allSettled([
        getHealthScores(),
        getAdvisories(),
        getTodaySchedule(),
      ]);
      if (s.status === 'fulfilled') setScores(s.value);
      if (a.status === 'fulfilled') setAdvisories(a.value);
      if (t.status === 'fulfilled') setTodaySchedule(t.value);
    } catch {
      // Fail silently — API may not be running in dev
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const pendingDoses = todaySchedule?.schedules.filter(
    (s) => s.status === 'pending' || s.status === 'overdue',
  ).length ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greetingText}>
          {greeting()}, {appUser?.name?.split(' ')[0] ?? 'there'} 🙏
        </Text>
        {pendingDoses > 0 && (
          <View style={styles.pillBadge}>
            <Text style={styles.pillBadgeText}>
              💊 {pendingDoses} dose{pendingDoses > 1 ? 's' : ''} pending
            </Text>
          </View>
        )}
      </View>

      {/* Overall score */}
      {scores && (
        <View style={styles.overallCard}>
          <View style={styles.overallLeft}>
            <Text style={styles.overallLabel}>Overall Health</Text>
            <Text style={styles.overallScore}>{Math.round(scores.overall)}</Text>
            <Text style={styles.overallSub}>out of 100</Text>
          </View>
          <View style={styles.organScores}>
            <ScoreRing score={scores.heart.score} label="Heart" color={COLORS.heartScore} />
            <ScoreRing score={scores.brain.score} label="Brain" color={COLORS.brainScore} />
            <ScoreRing score={scores.gut.score} label="Gut" color={COLORS.gutScore} />
            <ScoreRing score={scores.lungs.score} label="Lungs" color={COLORS.lungsScore} />
          </View>
        </View>
      )}

      {!scores && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No health data yet</Text>
          <Text style={styles.emptyBody}>Do your first check-in to start tracking your health score.</Text>
        </View>
      )}

      {/* Today's medicines */}
      {todaySchedule && todaySchedule.schedules.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's medicines</Text>
          <View style={styles.adherenceBar}>
            <View
              style={[styles.adherenceFill, { width: `${todaySchedule.adherence_pct}%` as any }]}
            />
          </View>
          <Text style={styles.adherenceText}>{Math.round(todaySchedule.adherence_pct)}% adherence today</Text>
          {todaySchedule.schedules.slice(0, 4).map((s, i) => (
            <View key={i} style={[styles.doseRow, s.status === 'overdue' && styles.overdueRow]}>
              <Text style={styles.doseIcon}>
                {s.status === 'taken' ? '✅' : s.status === 'skipped' ? '⏭️' : s.status === 'overdue' ? '🔴' : '⏰'}
              </Text>
              <View style={styles.doseInfo}>
                <Text style={styles.doseName}>{s.medicine_name}</Text>
                <Text style={styles.doseDosage}>{s.dosage} · {s.dose_time}</Text>
              </View>
              <Text style={[styles.doseStatus, s.status === 'overdue' && styles.overdueText]}>
                {s.status}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Advisories */}
      {advisories && advisories.advisories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health advisories</Text>
          {advisories.advisories.map((a, i) => (
            <AdvisoryCard key={i} title={a.title} body={a.body} severity={a.severity} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  greetingSection: { marginBottom: SPACING.md },
  greetingText: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text.primary,
  },
  pillBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  pillBadgeText: { color: COLORS.secondary, fontWeight: FONTS.weights.medium, fontSize: FONTS.sizes.sm },
  overallCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  overallLeft: { flex: 1 },
  overallLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FONTS.sizes.sm },
  overallScore: {
    color: COLORS.text.inverse,
    fontSize: 56,
    fontWeight: FONTS.weights.bold,
    lineHeight: 60,
  },
  overallSub: { color: 'rgba(255,255,255,0.6)', fontSize: FONTS.sizes.sm },
  organScores: { gap: SPACING.xs },
  scoreRingContainer: { alignItems: 'center' },
  scoreRing: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  scoreValue: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  scoreLabel: { fontSize: 9, fontWeight: FONTS.weights.medium },
  scoreName: { color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 2 },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text.primary,
    marginTop: SPACING.sm,
  },
  emptyBody: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  section: { marginBottom: SPACING.md },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  adherenceBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  adherenceFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  adherenceText: { color: COLORS.text.secondary, fontSize: FONTS.sizes.sm, marginBottom: SPACING.sm },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  overdueRow: { borderColor: COLORS.error, backgroundColor: '#FFF5F5' },
  doseIcon: { fontSize: 20 },
  doseInfo: { flex: 1 },
  doseName: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.medium, color: COLORS.text.primary },
  doseDosage: { fontSize: FONTS.sizes.xs, color: COLORS.text.secondary },
  doseStatus: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    textTransform: 'capitalize',
  },
  overdueText: { color: COLORS.error, fontWeight: FONTS.weights.semibold },
  advisoryCard: {
    borderLeftWidth: 4,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  advisoryTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  advisoryBody: { fontSize: FONTS.sizes.sm, color: COLORS.text.secondary, lineHeight: 20 },
});
