import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getTodaySchedule, listMedicines, logDose } from '../../api/health';
import { Medicine, DoseSchedule, TodayScheduleResponse } from '../../types';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants';

type TabType = 'today' | 'all';

function DoseCard({ item, onLog }: { item: DoseSchedule; onLog: (id: string, time: string) => void }) {
  const statusColors = {
    taken: COLORS.success,
    skipped: COLORS.text.disabled,
    overdue: COLORS.error,
    pending: COLORS.warning,
  };
  const color = statusColors[item.status];

  return (
    <View style={[styles.card, item.status === 'overdue' && styles.overdueCard]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <View style={styles.cardContent}>
        <Text style={styles.medicineName}>{item.medicine_name}</Text>
        <Text style={styles.medicineDetail}>{item.dosage} · {item.dose_time}</Text>
      </View>
      {(item.status === 'pending' || item.status === 'overdue') && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => onLog(item.medicine_id, item.dose_time)}
          >
            <Text style={styles.actionBtnText}>Taken</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.text.disabled }]}
            onPress={() => Alert.alert('Skipped', `${item.medicine_name} marked as skipped.`)}
          >
            <Text style={styles.actionBtnText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function MedicineCard({ item }: { item: Medicine }) {
  return (
    <View style={[styles.card, item.refill_alert && styles.refillAlert]}>
      <View style={styles.medicineIcon}>
        <Text style={{ fontSize: 24 }}>{item.is_emergency ? '🚑' : '💊'}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.medicineName}>{item.name}</Text>
        <Text style={styles.medicineDetail}>{item.dosage} · {item.frequency}</Text>
        {item.refill_alert && (
          <Text style={styles.refillText}>⚠️ Refill soon ({item.days_supply_remaining} days left)</Text>
        )}
        {item.current_stock !== undefined && (
          <Text style={styles.stockText}>Stock: {item.current_stock} units</Text>
        )}
      </View>
    </View>
  );
}

export default function MedicinesScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [todayData, setTodayData] = useState<TodayScheduleResponse | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [t, m] = await Promise.allSettled([getTodaySchedule(), listMedicines()]);
      if (t.status === 'fulfilled') setTodayData(t.value);
      if (m.status === 'fulfilled') setMedicines(m.value.medicines);
    } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleLogDose = async (medicineId: string, scheduledTime: string) => {
    try {
      await logDose(medicineId, 'taken', scheduledTime);
      await load();
      Alert.alert('✅ Dose logged!', 'Keep it up!');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not log dose.');
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
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['today', 'all'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'today' ? "Today's schedule" : 'All medicines'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'today' ? (
        <>
          {todayData && (
            <View style={styles.adherenceBar}>
              <Text style={styles.adherenceText}>
                {Math.round(todayData.adherence_pct)}% adherence today
              </Text>
              <View style={styles.adherenceTrack}>
                <View style={[styles.adherenceFill, { width: `${todayData.adherence_pct}%` as any }]} />
              </View>
            </View>
          )}
          <FlatList
            data={todayData?.schedules ?? []}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => <DoseCard item={item} onLog={handleLogDose} />}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyTitle}>No medicines today</Text>
                <Text style={styles.emptyBody}>You're all caught up!</Text>
              </View>
            }
          />
        </>
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MedicineCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💊</Text>
              <Text style={styles.emptyTitle}>No medicines yet</Text>
              <Text style={styles.emptyBody}>Add your medicines via the AI chat or prescription upload.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: FONTS.sizes.sm, color: COLORS.text.secondary },
  tabTextActive: { color: COLORS.primary, fontWeight: FONTS.weights.semibold },
  adherenceBar: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  adherenceText: { fontSize: FONTS.sizes.sm, color: COLORS.text.secondary, marginBottom: SPACING.xs },
  adherenceTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  adherenceFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  list: { padding: SPACING.md, paddingBottom: SPACING.xl },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  overdueCard: { borderColor: COLORS.error, backgroundColor: '#FFF5F5' },
  refillAlert: { borderColor: COLORS.warning, backgroundColor: '#FFFBF0' },
  statusDot: { width: 12, height: 12, borderRadius: RADIUS.full },
  medicineIcon: { width: 40, alignItems: 'center' },
  cardContent: { flex: 1 },
  medicineName: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text.primary,
  },
  medicineDetail: { fontSize: FONTS.sizes.xs, color: COLORS.text.secondary, marginTop: 2 },
  refillText: { fontSize: FONTS.sizes.xs, color: COLORS.warning, marginTop: 4 },
  stockText: { fontSize: FONTS.sizes.xs, color: COLORS.text.secondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: SPACING.xs },
  actionBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  actionBtnText: { color: COLORS.text.inverse, fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.medium },
  emptyState: { alignItems: 'center', paddingTop: SPACING.xxl },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
  },
  emptyBody: { color: COLORS.text.secondary, fontSize: FONTS.sizes.sm, marginTop: SPACING.xs, textAlign: 'center' },
});
