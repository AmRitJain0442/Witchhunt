import client from './client';
import { FamilyMember } from '../types';

export const listFamilyMembers = () =>
  client.get<{ members: FamilyMember[] }>('/family/members').then((r) => r.data);

export const addFamilyMember = (data: Partial<FamilyMember>) =>
  client.post<FamilyMember>('/family/members', data).then((r) => r.data);

export const updateFamilyMember = (memberId: string, data: Partial<FamilyMember>) =>
  client.patch<FamilyMember>(`/family/members/${memberId}`, data).then((r) => r.data);

export const deleteFamilyMember = (memberId: string) =>
  client.delete(`/family/members/${memberId}`).then((r) => r.data);

export const inviteFamilyMember = (memberId: string) =>
  client.post(`/family/members/${memberId}/invite`).then((r) => r.data);
