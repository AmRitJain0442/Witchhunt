'use client';

import { AlertTriangle, Bot, Loader2, SendHorizontal, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { aiApi } from '@/lib/api';
import { applyMemoryPatches, loadLocalMemory, saveLocalMemory } from '@/lib/local-memory';
import { cn, severityBg } from '@/lib/utils';

interface Msg { role: 'user' | 'assistant'; content: string }
interface Trig { trigger_name: string; message: string; severity: string }

const WELCOME: Msg = {
  role: 'assistant',
  content: "Namaste. I'm your Kutumb health companion. I can reason across medicines, check-ins, reports, family context, and your local health memory.",
};

const PROMPTS = [
  'Any drug interactions I should know about?',
  'What should I eat to improve my gut score?',
  'How is my health trending this week?',
  'Suggest an exercise plan for me',
  'Is it safe to take paracetamol with my medicines?',
];

export default function AIPage() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [triggers, setTriggers] = useState<Trig[]>([]);
  const [memory, setMemory] = useState<Record<string, unknown>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMemory(loadLocalMemory());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Msg = { role: 'user', content: msg };
    const newHistory = [...history, userMsg];
    setMessages((p) => [...p, userMsg]);
    setHistory(newHistory);
    setLoading(true);
    setTriggers([]);

    try {
      const res = await aiApi.message({ message: msg, conversation_history: newHistory, memory_file: memory });
      const assistantMsg: Msg = { role: 'assistant', content: res.reply };
      setMessages((p) => [...p, assistantMsg]);
      setHistory([...newHistory, assistantMsg]);
      if (res.fired_triggers?.length) setTriggers(res.fired_triggers);
      if (res.patches?.length) {
        const nextMemory = applyMemoryPatches(memory, res.patches);
        setMemory(nextMemory);
        saveLocalMemory(nextMemory);
      }
    } catch {
      setMessages((p) => [...p, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-[calc(100svh-3.5rem)] flex-col md:h-screen">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-muted text-accent">
            <Bot size={21} strokeWidth={1.8} />
          </div>
          <div>
            <div className="text-sm font-semibold text-tx-1">Kutumb AI</div>
            <div className="text-xs text-tx-3">Health-aware chat with local memory context</div>
          </div>
        </div>
      </header>

      {triggers.length > 0 && (
        <div className="shrink-0 space-y-2 border-b border-border bg-bg px-4 py-3 sm:px-6 lg:px-8">
          {triggers.map((t, i) => (
            <div key={i} className={cn('rounded-xl border px-4 py-3 text-sm', severityBg(t.severity))}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={17} strokeWidth={1.9} className="mt-0.5 shrink-0" />
                <div>
                  <strong className="font-semibold">{t.trigger_name}</strong>
                  <span className="mx-1.5 opacity-50">:</span>
                  {t.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'assistant' && (
                <div className="mr-2.5 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-accent-muted text-accent">
                  <Bot size={17} strokeWidth={1.8} />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[72%]',
                  m.role === 'user'
                    ? 'rounded-br-md bg-accent text-accent-text'
                    : 'rounded-bl-md border border-border bg-surface text-tx-1',
                )}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start gap-2.5">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-accent-muted text-accent">
                <Bot size={17} strokeWidth={1.8} />
              </div>
              <div className="rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-3.5">
                <div className="flex items-center gap-2 text-sm text-tx-3">
                  <Loader2 size={15} className="animate-spin" />
                  Thinking
                </div>
              </div>
            </div>
          )}

          {messages.length === 1 && !loading && (
            <div className="ml-0 grid gap-2 sm:ml-10">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="focus-ring surface-panel card-lift flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-tx-2 hover:text-tx-1"
                >
                  <Sparkles size={16} strokeWidth={1.8} className="shrink-0 text-accent" />
                  {p}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-surface px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex gap-3">
            <textarea
              ref={textRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about symptoms, medicines, diet, or trends..."
              rows={1}
              className="focus-ring max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-tx-1 outline-none placeholder:text-tx-3"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-35"
              aria-label="Send message"
            >
              <SendHorizontal size={18} strokeWidth={1.9} />
            </button>
          </div>
          <div className="mt-2 text-center text-[11px] text-tx-3">Enter sends. Shift Enter adds a new line.</div>
        </div>
      </div>
    </div>
  );
}
