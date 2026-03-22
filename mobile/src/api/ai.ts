import client from './client';
import { SessionRequest, SessionResponse } from '../types';

export const sendMessage = (data: SessionRequest) =>
  client.post<SessionResponse>('/ai/session/message', data).then((r) => r.data);

export const startOnboarding = (stage: string, message: string, conversationHistory: unknown[] = []) =>
  client
    .post('/ai/session/onboard', {
      stage,
      message,
      conversation_history: conversationHistory,
    })
    .then((r) => r.data);

export const compressMemory = (memoryFile: Record<string, unknown>) =>
  client.post('/ai/memory/compress', { memory_file: memoryFile }).then((r) => r.data);

export const validateMemory = (memoryFile: Record<string, unknown>) =>
  client.post('/ai/memory/validate', { memory_file: memoryFile }).then((r) => r.data);
