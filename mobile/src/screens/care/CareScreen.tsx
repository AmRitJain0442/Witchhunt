import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  completeProgramTask,
  connectWearable,
  createReferral,
  createReferralShareLink,
  getDiabetesToday,
  getDueReminders,
  getEmergencyContacts,
  getWearableStatus,
  listReferrals,
  listSosEvents,
  resolveSos,
  sendDueReminders,
  startDiabetesProgram,
  syncGoogleFit,
  triggerSos,
} from '../../api/care';
import {
  DiabetesProgramResponse,
  EmergencyContactsResponse,
  ReferralResponse,
  SOSListResponse,
  WearableStatusResponse,
} from '../../types';
import { API_BASE_URL, COLORS, FONTS, RADIUS, SPACING } from '../../constants';

type LoadState = {
  contacts: EmergencyContactsResponse | null;
  sos: SOSListResponse | null;
  wearable: WearableStatusResponse | null;
  referrals: ReferralResponse[];
  diabetes: DiabetesProgramResponse | null;
  dueReminderCount: number;
};

const emptyState: LoadState = {
  contacts: null,
  sos: null,
  wearable: null,
  referrals: [],
  diabetes: null,
  dueReminderCount: 0,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Metric({ label, value, tone = COLORS.primary }: { label: string; value: string | number; tone?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color: tone }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function fullShareUrl(path: string) {
  if (path.startsWith('http')) return path;
  const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${origin}${path}`;
}

export default function CareScreen() {
  const [data, setData] = useState<LoadState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const activeSos = useMemo(
    () => data.sos?.events.find((event) => event.status === 'active') ?? null,
    [data.sos],
  );

  const load = useCallback(async () => {
    const [contacts, sos, wearable, referrals, diabetes, reminders] = await Promise.allSettled([
      getEmergencyContacts(),
      listSosEvents(),
      getWearableStatus(),
      listReferrals(),
      getDiabetesToday(),
      getDueReminders(),
    ]);

    setData({
      contacts: contacts.status === 'fulfilled' ? contacts.value : null,
      sos: sos.status === 'fulfilled' ? sos.value : null,
      wearable: wearable.status === 'fulfilled' ? wearable.value : null,
      referrals: referrals.status === 'fulfilled' ? referrals.value.referrals : [],
      diabetes: diabetes.status === 'fulfilled' ? diabetes.value : null,
      dueReminderCount: reminders.status === 'fulfilled' ? reminders.value.reminders.length : 0,
    });
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const withBusy = async (key: string, action: () => Promise<void>) => {
    setBusyAction(key);
    try {
      await action();
      await load();
    } catch (err: unknown) {
      Alert.alert('Action failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSos = () => {
    Alert.alert(
      'Send SOS alert?',
      `This will notify ${data.contacts?.total ?? 0} emergency contact(s).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: () => withBusy('sos', async () => {
            await triggerSos('I need help. Please check on me.', 'high');
            Alert.alert('SOS sent', 'Your emergency contacts were notified where configured.');
          }),
        },
      ],
    );
  };

  const handleResolveSos = () => {
    if (!activeSos) return;
    withBusy('resolve-sos', async () => {
      await resolveSos(activeSos.event_id, 'resolved', 'Marked safe from Android app.');
      Alert.alert('All clear', 'The SOS event has been resolved.');
    });
  };

  const handleGoogleFit = () => withBusy('google-fit', async () => {
    const info = await connectWearable('google_fit');
    if (info.auth_url) {
      await Linking.openURL(info.auth_url);
      return;
    }
    Alert.alert('Google Fit', info.instructions);
  });

  const handleGoogleSync = () => withBusy('google-sync', async () => {
    const result = await syncGoogleFit();
    Alert.alert('Sync complete', `${result.records_synced} record(s) synced.`);
  });

  const handleReferral = () => withBusy('referral', async () => {
    const referral = await createReferral({
      reason_for_visit: 'Doctor consultation context report',
      include_sections: [
        'doctor_snapshot',
        'demographics',
        'medical_history',
        'allergies',
        'medicines',
        'past_medicines',
        'prescriptions',
        'vitals',
        'health_scores',
        'lab_reports',
        'recent_checkins',
        'symptom_history',
        'eating_habits',
        'wearables',
      ],
      checkin_days: 90,
      language: 'en',
      notes_for_doctor: 'Generated from Kutumb mobile before a doctor visit.',
    });
    Alert.alert('Doctor report ready', 'A complete doctor context PDF has been generated.', [
      { text: 'Close', style: 'cancel' },
      { text: 'Open PDF', onPress: () => Linking.openURL(referral.pdf_url) },
    ]);
  });

  const handleShareReferral = (referralId: string) => withBusy(`share-${referralId}`, async () => {
    const share = await createReferralShareLink(referralId);
    Alert.alert('Share link created', fullShareUrl(share.shareable_link));
  });

  const handleStartProgram = () => withBusy('program-start', async () => {
    await startDiabetesProgram();
    Alert.alert('Program started', 'Your 12-week diabetes care plan is ready.');
  });

  const handleCompleteTask = (taskId: string) => {
    if (!data.diabetes) return;
    withBusy(`task-${taskId}`, async () => {
      await completeProgramTask(data.diabetes!.program_id, taskId, 'Completed from Android app.');
    });
  };

  const handleSendReminders = () => withBusy('reminders', async () => {
    const result = await sendDueReminders();
    Alert.alert('Reminders checked', `${result.sent_count ?? 0} reminder(s) sent.`);
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}
    >
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>Mobile care hub</Text>
          <Text style={styles.heroTitle}>Carry your family health network with you.</Text>
          <Text style={styles.heroBody}>SOS, medicines, wearables, referrals, and care programs stay connected to the same backend as web.</Text>
        </View>
        <View style={styles.heroStats}>
          <Metric label="Contacts" value={data.contacts?.total ?? 0} tone={COLORS.secondary} />
          <Metric label="Due doses" value={data.dueReminderCount} tone={COLORS.warning} />
        </View>
      </View>

      <Section title="Emergency">
        <View style={[styles.panel, activeSos && styles.dangerPanel]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>{activeSos ? 'SOS is active' : 'SOS ready'}</Text>
              <Text style={styles.panelText}>
                {activeSos
                  ? 'Resolve only after you are safe.'
                  : `${data.contacts?.total ?? 0} emergency contact(s) can be notified.`}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, activeSos ? styles.safeButton : styles.dangerButton]}
              onPress={activeSos ? handleResolveSos : handleSos}
              disabled={busyAction === 'sos' || busyAction === 'resolve-sos'}
            >
              <Text style={styles.primaryButtonText}>{activeSos ? 'All clear' : 'SOS'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Section>

      <Section title="Wearables">
        <View style={styles.grid}>
          {(data.wearable?.platforms ?? []).map((platform) => (
            <View key={platform.platform} style={styles.tile}>
              <Text style={styles.tileTitle}>{platform.platform === 'google_fit' ? 'Google Fit' : 'Apple Health'}</Text>
              <Text style={[styles.statusText, platform.connected ? styles.statusConnected : styles.statusDisconnected]}>
                {platform.connected ? 'Connected' : 'Not connected'}
              </Text>
              <Text style={styles.tileMeta}>
                {platform.last_synced_at ? `Synced ${new Date(platform.last_synced_at).toLocaleDateString()}` : 'No sync yet'}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoogleFit} disabled={busyAction === 'google-fit'}>
            <Text style={styles.secondaryButtonText}>Connect Google Fit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoogleSync} disabled={busyAction === 'google-sync'}>
            <Text style={styles.secondaryButtonText}>Sync today</Text>
          </TouchableOpacity>
        </View>
      </Section>

      <Section title="Doctor context">
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Doctor report</Text>
          <Text style={styles.panelText}>Generate a visit-ready PDF with profile, history, allergies, medicines, reports, daily updates, meals, wearables, and clinical flags.</Text>
          <TouchableOpacity style={styles.primaryButtonWide} onPress={handleReferral} disabled={busyAction === 'referral'}>
            <Text style={styles.primaryButtonText}>Generate report</Text>
          </TouchableOpacity>
        </View>
        {data.referrals.slice(0, 2).map((referral) => (
          <View key={referral.referral_id} style={styles.listRow}>
            <View style={styles.listRowCopy}>
              <Text style={styles.listRowTitle}>Referral PDF</Text>
              <Text style={styles.listRowMeta}>{referral.page_count} page(s) - expires {new Date(referral.expires_at).toLocaleDateString()}</Text>
            </View>
            <TouchableOpacity style={styles.miniButton} onPress={() => Linking.openURL(referral.pdf_url)}>
              <Text style={styles.miniButtonText}>Open</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.miniButtonAlt} onPress={() => handleShareReferral(referral.referral_id)}>
              <Text style={styles.miniButtonAltText}>Share</Text>
            </TouchableOpacity>
          </View>
        ))}
      </Section>

      <Section title="Care program">
        {data.diabetes ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <View style={styles.flex}>
                <Text style={styles.panelTitle}>Diabetes program</Text>
                <Text style={styles.panelText}>Week {data.diabetes.current_week} of {data.diabetes.total_weeks}: {data.diabetes.focus}</Text>
              </View>
              <View style={styles.weekBadge}>
                <Text style={styles.weekBadgeText}>W{data.diabetes.current_week}</Text>
              </View>
            </View>
            {data.diabetes.tasks_today.map((task) => (
              <TouchableOpacity
                key={task.task_id}
                style={[styles.taskRow, task.completed && styles.taskDone]}
                onPress={() => !task.completed && handleCompleteTask(task.task_id)}
                disabled={task.completed || busyAction === `task-${task.task_id}`}
              >
                <View style={[styles.taskCheck, task.completed && styles.taskCheckDone]}>
                  <Text style={styles.taskCheckText}>{task.completed ? 'OK' : ''}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDescription}>{task.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>No active diabetes plan</Text>
            <Text style={styles.panelText}>Start a 12-week care plan with daily tasks for medicine, walking, diet, and vitals.</Text>
            <TouchableOpacity style={styles.primaryButtonWide} onPress={handleStartProgram} disabled={busyAction === 'program-start'}>
              <Text style={styles.primaryButtonText}>Start program</Text>
            </TouchableOpacity>
          </View>
        )}
      </Section>

      <Section title="Medicine reminders">
        <View style={styles.panelHeaderPlain}>
          <Text style={styles.panelText}>{data.dueReminderCount} dose reminder(s) are due or upcoming.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSendReminders} disabled={busyAction === 'reminders'}>
            <Text style={styles.secondaryButtonText}>Send reminders</Text>
          </TouchableOpacity>
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  hero: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  heroCopy: { marginBottom: SPACING.md },
  heroEyebrow: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, textTransform: 'uppercase' },
  heroTitle: { color: COLORS.text.primary, fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.bold, marginTop: 6, lineHeight: 30 },
  heroBody: { color: COLORS.text.secondary, fontSize: FONTS.sizes.sm, marginTop: SPACING.sm, lineHeight: 20 },
  heroStats: { flexDirection: 'row', gap: SPACING.sm },
  metric: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricValue: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.bold },
  metricLabel: { color: COLORS.text.secondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
  section: { marginBottom: SPACING.md },
  sectionTitle: {
    color: COLORS.text.primary,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    marginBottom: SPACING.sm,
  },
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dangerPanel: { borderColor: COLORS.error, backgroundColor: '#FFF5F5' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  panelHeaderPlain: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  panelTitle: { color: COLORS.text.primary, fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold },
  panelText: { color: COLORS.text.secondary, fontSize: FONTS.sizes.sm, lineHeight: 20, marginTop: 4 },
  primaryButton: { borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  primaryButtonWide: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  primaryButtonText: { color: COLORS.text.inverse, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold },
  dangerButton: { backgroundColor: COLORS.error },
  safeButton: { backgroundColor: COLORS.success },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  secondaryButton: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  secondaryButtonText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold },
  grid: { flexDirection: 'row', gap: SPACING.sm },
  tile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 112,
  },
  tileTitle: { color: COLORS.text.primary, fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold },
  statusText: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, marginTop: SPACING.sm },
  statusConnected: { color: COLORS.success },
  statusDisconnected: { color: COLORS.text.secondary },
  tileMeta: { color: COLORS.text.secondary, fontSize: FONTS.sizes.xs, marginTop: SPACING.xs, lineHeight: 16 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  listRowCopy: { flex: 1 },
  listRowTitle: { color: COLORS.text.primary, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold },
  listRowMeta: { color: COLORS.text.secondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
  miniButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  miniButtonText: { color: COLORS.text.inverse, fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold },
  miniButtonAlt: { borderColor: COLORS.primary, borderWidth: 1, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  miniButtonAltText: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold },
  flex: { flex: 1 },
  weekBadge: { backgroundColor: '#E8F5E9', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  weekBadgeText: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold },
  taskRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  taskDone: { opacity: 0.65 },
  taskCheck: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  taskCheckText: { color: COLORS.text.inverse, fontWeight: FONTS.weights.bold },
  taskTitle: { color: COLORS.text.primary, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold },
  taskDescription: { color: COLORS.text.secondary, fontSize: FONTS.sizes.xs, marginTop: 2, lineHeight: 16 },
});
