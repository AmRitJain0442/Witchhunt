import client from './client';
import { FamilyMember } from '../types';

const permissionToBackend = (permission?: string) => {
  if (permission === 'manage') return ['full_access'];
  if (permission === 'emergency_only') return ['receive_sos'];
  return ['view_checkins', 'view_medicines', 'view_health_scores', 'view_lab_reports'];
};

function normalizeMember(raw: Record<string, unknown>): FamilyMember {
  const permissions = Array.isArray(raw.permissions) ? raw.permissions as string[] : [];
  const permission = permissions.includes('full_access')
    ? 'manage'
    : permissions.length === 1 && permissions[0] === 'receive_sos'
      ? 'emergency_only'
      : 'view';
  return {
    ...raw,
    id: raw.member_id,
    name: raw.display_name,
    relation: raw.relationship,
    phone: raw.phone_number,
    permission,
    is_linked: Boolean(raw.is_registered),
    linked_uid: raw.target_uid,
  } as FamilyMember;
}

export const listFamilyMembers = () =>
  client.get<{ members: Record<string, unknown>[]; total: number }>('/family/').then((r) => ({
    ...r.data,
    members: r.data.members.map(normalizeMember),
  }));

export const addFamilyMember = (data: Partial<FamilyMember>) =>
  client.post<Record<string, unknown>>('/family/', {
    display_name: data.name,
    relationship: data.relation,
    phone_number: data.phone ?? '',
    permissions: permissionToBackend(data.permission),
  }).then((r) => normalizeMember(r.data));

export const updateFamilyMember = (memberId: string, data: Partial<FamilyMember>) =>
  client.patch<Record<string, unknown>>(`/family/${memberId}`, {
    display_name: data.name,
    relationship: data.relation,
    permissions: data.permission ? permissionToBackend(data.permission) : undefined,
  }).then((r) => normalizeMember(r.data));

export const deleteFamilyMember = (memberId: string) =>
  client.delete(`/family/${memberId}`).then((r) => r.data);

export const inviteFamilyMember = (_memberId: string) =>
  Promise.resolve({ message: 'Invite already created when the member was added.' });
