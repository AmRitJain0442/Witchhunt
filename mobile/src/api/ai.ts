import client from './client';
import { SessionRequest, SessionResponse } from '../types';
import { auth } from '../lib/firebase';

const sessionId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ONBOARDING_STAGES = ['welcome', 'demographics', 'medical_history', 'medications', 'allergies', 'lifestyle', 'family_goals', 'finalize'];

export const sendMessage = (data: SessionRequest) =>
  client
    .post('/ai/session', {
      session_id: sessionId(),
      user_id_hash: auth.currentUser?.uid ?? 'mobile-user',
      message: data.message,
      conversation_history: data.conversation_history ?? [],
      memory_file: data.memory_file ?? {},
      client_context: {
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        app_version: '1.0.0',
        platform: 'android',
      },
    })
    .then((r) => ({
      reply: r.data.ai_response?.text ?? '',
      patches: r.data.memory_patches?.operations ?? [],
      fired_triggers: r.data.triggered_alerts ?? [],
      conversation_history: data.conversation_history ?? [],
    } as SessionResponse));

export const startOnboarding = (
  stage: string,
  message: string,
  conversationHistory: unknown[] = [],
  partialMemory: Record<string, unknown> = {},
) =>
  client
    .post('/ai/session/onboard', {
      onboard_session_id: sessionId(),
      user_id_hash: auth.currentUser?.uid ?? 'mobile-user',
      stage,
      stage_index: Math.max(0, ONBOARDING_STAGES.indexOf(stage)),
      total_stages: 7,
      message,
      partial_memory: partialMemory,
      conversation_history: conversationHistory,
      client_context: {
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        app_version: '1.0.0',
        platform: 'android',
      },
    })
    .then((r) => ({
      ...r.data,
      reply: r.data.ai_response?.text ?? '',
      patches: r.data.memory_patches?.operations ?? [],
    }));

export const compressMemory = (memoryFile: Record<string, unknown>) =>
  client.post('/ai/memory/compress', { memory_file: memoryFile }).then((r) => r.data);

export const validateMemory = (memoryFile: Record<string, unknown>) =>
  client.post('/ai/memory/validate', memoryFile).then((r) => r.data);
