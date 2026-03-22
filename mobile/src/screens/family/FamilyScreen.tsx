import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { listFamilyMembers, inviteFamilyMember } from '../../api/family';
import { FamilyMember } from '../../types';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants';

const RELATION_EMOJIS: Record<string, string> = {
  father: '👨',
  mother: '👩',
  son: '👦',
  daughter: '👧',
  husband: '👨',
  wife: '👩',
  brother: '👦',
  sister: '👧',
  grandfather: '👴',
  grandmother: '👵',
  default: '👤',
};

function MemberCard({ item, onInvite }: { item: FamilyMember; onInvite: (id: string) => void }) {
  const emoji = RELATION_EMOJIS[item.relation?.toLowerCase()] ?? RELATION_EMOJIS.default;
  const permissionLabels = {
    view: 'Can view',
    manage: 'Can manage',
    emergency_only: 'Emergency only',
  };

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarEmoji}>{emoji}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberRelation}>{item.relation}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, item.is_linked ? styles.linkedBadge : styles.unlinkedBadge]}>
            <Text style={[styles.badgeText, item.is_linked ? styles.linkedBadgeText : styles.unlinkedBadgeText]}>
              {item.is_linked ? '✓ Linked' : 'Not linked'}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{permissionLabels[item.permission]}</Text>
          </View>
        </View>
      </View>
      {!item.is_linked && (
        <TouchableOpacity style={styles.inviteBtn} onPress={() => onInvite(item.id)}>
          <Text style={styles.inviteBtnText}>Invite</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function FamilyScreen() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listFamilyMembers();
      setMembers(data.members);
    } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleInvite = async (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member?.phone) {
      Alert.alert('No phone number', 'Add a phone number to this family member before inviting.');
      return;
    }
    try {
      await inviteFamilyMember(memberId);
      Alert.alert('Invite sent! 📱', `Invitation sent to ${member.name}`);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not send invite.');
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
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          👨‍👩‍👧 {members.length} family member{members.length !== 1 ? 's' : ''} ·{' '}
          {members.filter((m) => m.is_linked).length} linked
        </Text>
      </View>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MemberCard item={item} onInvite={handleInvite} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👨‍👩‍👧</Text>
            <Text style={styles.emptyTitle}>No family members yet</Text>
            <Text style={styles.emptyBody}>
              Add family members to monitor their health and share updates.{'\n'}
              Use the AI chat to add members: "Add my father Suresh, age 65"
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoBar: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoText: { fontSize: FONTS.sizes.sm, color: COLORS.text.secondary },
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
    gap: SPACING.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarEmoji: { fontSize: 24 },
  cardContent: { flex: 1 },
  memberName: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text.primary,
  },
  memberRelation: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  badgeRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.xs },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkedBadge: { backgroundColor: '#E8F5E9', borderColor: COLORS.success },
  unlinkedBadge: { backgroundColor: COLORS.background },
  badgeText: { fontSize: FONTS.sizes.xs, color: COLORS.text.secondary },
  linkedBadgeText: { color: COLORS.success },
  unlinkedBadgeText: { color: COLORS.text.secondary },
  inviteBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  inviteBtnText: {
    color: COLORS.text.inverse,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
  },
  emptyState: { alignItems: 'center', paddingTop: SPACING.xxl, paddingHorizontal: SPACING.xl },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
  },
  emptyBody: {
    color: COLORS.text.secondary,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xs,
    textAlign: 'center',
    lineHeight: 20,
  },
});
