import auth from '@react-native-firebase/auth';
import client from './client';
import { SessionRequest, SessionResponse } from '../types';

const sessionId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const sendMessage = (data: SessionRequest) =>
  client
    .post('/ai/session', {
      session_id: sessionId(),
      user_id_hash: auth().currentUser?.uid ?? 'mobile-user',
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
      user_id_hash: auth().currentUser?.uid ?? 'mobile-user',
      stage,
      stage_index: 0,
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
    .then((r) => r.data);

export const compressMemory = (memoryFile: Record<string, unknown>) =>
  client.post('/ai/memory/compress', { memory_file: memoryFile }).then((r) => r.data);

export const validateMemory = (memoryFile: Record<string, unknown>) =>
  client.post('/ai/memory/validate', memoryFile).then((r) => r.data);
