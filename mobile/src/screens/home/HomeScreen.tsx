import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { getHealthScores, getAdvisories, getTodaySchedule } from '../../api/health';
import { HealthScoreResponse, HealthAdvisoryResponse, TodayScheduleResponse } from '../../types';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants';
import type { TabParamList } from '../../navigation/AppNavigator';

type QuickAction = {
  label: string;
  body: string;
  target: keyof TabParamList;
  tone: string;
};

function scoreStatus(score?: number) {
  if (score === undefined) return { label: 'Start tracking', color: COLORS.text.secondary };
  if (score >= 80) return { label: 'Stable', color: COLORS.success };
  if (score >= 60) return { label: 'Watch', color: COLORS.warning };
  return { label: 'Needs attention', color: COLORS.error };
}

function formatDate(value?: string) {
  if (!value) return 'Not computed yet';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently updated';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function StatTile({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statMarker, { backgroundColor: tone }]} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function OrganBar({ label, score, color }: { label: string; score: number; color: string }) {
  const width = `${Math.max(4, Math.min(100, Math.round(score)))}%`;
  return (
    <View style={styles.organRow}>
      <View style={styles.organHeader}>
        <Text style={styles.organName}>{label}</Text>
        <Text style={styles.organScore}>{Math.round(score)}</Text>
      </View>
      <View style={styles.organTrack}>
        <View style={[styles.organFill, { width: width as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function AdvisoryCard({ title, body, severity }: { title: string; body: string; severity: string }) {
  const tone = severity === 'urgent' || severity === 'critical'
    ? COLORS.error
    : severity === 'warning'
      ? COLORS.warning
      : COLORS.primary;

  return (
    <View style={styles.advisoryCard}>
      <View style={[styles.advisoryRail, { backgroundColor: tone }]} />
      <View style={styles.advisoryContent}>
        <Text style={styles.advisoryTitle}>{title}</Text>
        <Text style={styles.advisoryBody}>{body}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<TabParamList>>();
  const { appUser } = useAuth();
  const [scores, setScores] = useState<HealthScoreResponse | null>(null);
  const [advisories, setAdvisories] = useState<HealthAdvisoryResponse | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<TodayScheduleResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [scoreResult, advisoryResult, scheduleResult] = await Promise.allSettled([
      getHealthScores(),
      getAdvisories(),
      getTodaySchedule(),
    ]);
    if (scoreResult.status === 'fulfilled') setScores(scoreResult.value);
    if (advisoryResult.status === 'fulfilled') setAdvisories(advisoryResult.value);
    if (scheduleResult.status === 'fulfilled') setTodaySchedule(scheduleResult.value);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = appUser?.name?.split(' ')[0] || 'there';
  const pendingDoses = todaySchedule?.schedules.filter((s) => s.status === 'pending' || s.status === 'overdue').length ?? 0;
  const completedDoses = todaySchedule?.schedules.filter((s) => s.status === 'taken').length ?? 0;
  const activeAdvisories = advisories?.advisories.length ?? 0;
  const overallScore = scores ? Math.round(scores.overall) : undefined;
  const status = scoreStatus(overallScore);

  const dailyFocus = useMemo(() => {
    if (pendingDoses > 0) return { title: 'Medicine follow-up', body: 'Review pending doses before the next scheduled time.' };
    if (!scores) return { title: 'First check-in', body: 'Complete a check-in so Kutumb can build your health baseline.' };
    if (activeAdvisories > 0) return { title: 'Review advisories', body: 'Check the latest health advisories and mark what you have handled.' };
    return { title: 'Keep the streak', body: 'Log sleep, stress, hydration, and symptoms to keep your dashboard accurate.' };
  }, [activeAdvisories, pendingDoses, scores]);

  const quickActions: QuickAction[] = [
    { label: 'Check in', body: 'Mood, symptoms, sleep, water, pain.', target: 'Checkin', tone: COLORS.primary },
    { label: 'Medicines', body: 'Dose schedule and prescriptions.', target: 'Medicines', tone: COLORS.secondary },
    { label: 'Ask AI', body: 'Health questions and care planning.', target: 'AIChat', tone: COLORS.brainScore },
    { label: 'Care hub', body: 'SOS, reports, programs, wearables.', target: 'Care', tone: COLORS.heartScore },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Kutumb health dashboard</Text>
          <Text style={styles.greeting}>{greeting}, {firstName}</Text>
        </View>
        <View style={[styles.statusPill, { borderColor: status.color }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.heroPanel}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Overall health</Text>
            <Text style={styles.heroScore}>{overallScore ?? '--'}</Text>
            <Text style={styles.heroSub}>{scores ? `Updated ${formatDate(scores.computed_at)}` : 'Waiting for your first check-in'}</Text>
          </View>
          <View style={styles.heroSummary}>
            <Text style={styles.heroSummaryTitle}>{dailyFocus.title}</Text>
            <Text style={styles.heroSummaryBody}>{dailyFocus.body}</Text>
          </View>
        </View>
        <View style={styles.scoreTrack}>
          <View style={[styles.scoreFill, { width: `${overallScore ?? 12}%` as any }]} />
        </View>
      </View>

      <View style={styles.statGrid}>
        <StatTile label="Pending doses" value={pendingDoses} tone={pendingDoses > 0 ? COLORS.warning : COLORS.success} />
        <StatTile label="Taken today" value={completedDoses} tone={COLORS.primary} />
        <StatTile label="Advisories" value={activeAdvisories} tone={activeAdvisories > 0 ? COLORS.secondary : COLORS.success} />
        <StatTile label="Family" value={appUser?.family_count ?? 0} tone={COLORS.brainScore} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Care command center</Text>
      </View>
      <View style={styles.quickGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.quickAction}
            onPress={() => navigation.navigate(action.target)}
          >
            <View style={[styles.quickDot, { backgroundColor: action.tone }]} />
            <Text style={styles.quickTitle}>{action.label}</Text>
            <Text style={styles.quickBody}>{action.body}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.panel}>
        <View style={styles.sectionHeaderCompact}>
          <Text style={styles.sectionTitle}>Organ health</Text>
          <Text style={styles.sectionMeta}>0-100</Text>
        </View>
        {scores ? (
          <>
            <OrganBar label="Heart" score={scores.heart.score} color={COLORS.heartScore} />
            <OrganBar label="Brain" score={scores.brain.score} color={COLORS.brainScore} />
            <OrganBar label="Gut" score={scores.gut.score} color={COLORS.gutScore} />
            <OrganBar label="Lungs" score={scores.lungs.score} color={COLORS.lungsScore} />
          </>
        ) : (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>No score yet</Text>
            <Text style={styles.emptyBody}>Daily check-ins, medicines, vitals, and reports will populate these organ scores.</Text>
          </View>
        )}
      </View>

      <View style={styles.panel}>
        <View style={styles.sectionHeaderCompact}>
          <Text style={styles.sectionTitle}>Today's care plan</Text>
          <Text style={styles.sectionMeta}>{todaySchedule ? `${Math.round(todaySchedule.adherence_pct)}% done` : 'Setup'}</Text>
        </View>
        {todaySchedule && todaySchedule.schedules.length > 0 ? (
          <>
            <View style={styles.adherenceBar}>
              <View style={[styles.adherenceFill, { width: `${todaySchedule.adherence_pct}%` as any }]} />
            </View>
            {todaySchedule.schedules.slice(0, 5).map((dose, index) => (
              <View key={`${dose.medicine_id}-${dose.dose_time}-${index}`} style={styles.timelineRow}>
                <View style={[styles.timelineDot, dose.status === 'overdue' && styles.timelineDotAlert]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{dose.medicine_name}</Text>
                  <Text style={styles.timelineBody}>{dose.dosage} at {dose.dose_time}</Text>
                </View>
                <Text style={[styles.timelineStatus, dose.status === 'overdue' && styles.timelineStatusAlert]}>{dose.status}</Text>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>No medicine schedule yet</Text>
            <Text style={styles.emptyBody}>Add medicines or upload a prescription to turn this into a daily timeline.</Text>
          </View>
        )}
      </View>

      <View style={styles.panel}>
        <View style={styles.sectionHeaderCompact}>
          <Text style={styles.sectionTitle}>Health advisories</Text>
          <Text style={styles.sectionMeta}>{activeAdvisories}</Text>
        </View>
        {advisories && advisories.advisories.length > 0 ? (
          advisories.advisories.slice(0, 3).map((advisory, index) => (
            <AdvisoryCard key={`${advisory.title}-${index}`} title={advisory.title} body={advisory.body} severity={advisory.severity} />
          ))
        ) : (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>No advisories</Text>
            <Text style={styles.emptyBody}>Kutumb will surface trends, medicine warnings, and follow-ups here.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    textTransform: 'uppercase',
  },
  greeting: {
    color: COLORS.text.primary,
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    marginTop: SPACING.xs,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  statusText: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold },
  heroPanel: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  heroTop: { flexDirection: 'row', gap: SPACING.md },
  heroLabel: { color: 'rgba(255,255,255,0.72)', fontSize: FONTS.sizes.sm },
  heroScore: {
    color: COLORS.text.inverse,
    fontSize: 58,
    fontWeight: FONTS.weights.bold,
    lineHeight: 64,
  },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: FONTS.sizes.xs },
  heroSummary: {
    flex: 1,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  heroSummaryTitle: {
    color: COLORS.text.inverse,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  heroSummaryBody: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: FONTS.sizes.xs,
    lineHeight: 17,
    marginTop: SPACING.xs,
  },
  scoreTrack: {
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginTop: SPACING.lg,
  },
  scoreFill: { height: '100%', backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statTile: {
    width: '48%',
    minHeight: 92,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  statMarker: { width: 20, height: 4, borderRadius: RADIUS.full, marginBottom: SPACING.sm },
  statValue: { color: COLORS.text.primary, fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.bold },
  statLabel: { color: COLORS.text.secondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
  sectionHeader: { marginBottom: SPACING.sm },
  sectionHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text.primary,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
  },
  sectionMeta: { color: COLORS.text.secondary, fontSize: FONTS.sizes.sm },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  quickAction: {
    width: '48%',
    minHeight: 120,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickDot: { width: 10, height: 10, borderRadius: RADIUS.full, marginBottom: SPACING.sm },
  quickTitle: { color: COLORS.text.primary, fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold },
  quickBody: { color: COLORS.text.secondary, fontSize: FONTS.sizes.xs, lineHeight: 17, marginTop: SPACING.xs },
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  organRow: { marginBottom: SPACING.md },
  organHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  organName: { color: COLORS.text.primary, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.medium },
  organScore: { color: COLORS.text.secondary, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold },
  organTrack: { height: 8, backgroundColor: COLORS.divider, borderRadius: RADIUS.full, overflow: 'hidden' },
  organFill: { height: '100%', borderRadius: RADIUS.full },
  emptyBlock: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md },
  emptyTitle: { color: COLORS.text.primary, fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold },
  emptyBody: { color: COLORS.text.secondary, fontSize: FONTS.sizes.sm, lineHeight: 20, marginTop: SPACING.xs },
  adherenceBar: {
    height: 7,
    backgroundColor: COLORS.divider,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  adherenceFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.full },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  timelineDot: { width: 9, height: 9, borderRadius: RADIUS.full, backgroundColor: COLORS.primary },
  timelineDotAlert: { backgroundColor: COLORS.error },
  timelineContent: { flex: 1 },
  timelineTitle: { color: COLORS.text.primary, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold },
  timelineBody: { color: COLORS.text.secondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
  timelineStatus: { color: COLORS.text.secondary, fontSize: FONTS.sizes.xs, textTransform: 'capitalize' },
  timelineStatusAlert: { color: COLORS.error, fontWeight: FONTS.weights.semibold },
  advisoryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  advisoryRail: { width: 4 },
  advisoryContent: { flex: 1, padding: SPACING.md },
  advisoryTitle: { color: COLORS.text.primary, fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold },
  advisoryBody: { color: COLORS.text.secondary, fontSize: FONTS.sizes.sm, lineHeight: 20, marginTop: SPACING.xs },
});
