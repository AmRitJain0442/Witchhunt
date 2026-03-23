'use client';

import { useState, useRef, useEffect } from 'react';
import { aiApi } from '@/lib/api';
import { cn, severityBg } from '@/lib/utils';

interface Msg  { role: 'user' | 'assistant'; content: string }
interface Trig { trigger_name: string; message: string; severity: string }

const WELCOME: Msg = {
  role: 'assistant',
  content: "Namaste. I'm your Kutumb health companion — I have your full medical profile in memory. Ask me anything about your health, medicines, diet, or symptoms.",
};

const PROMPTS = [
  'Any drug interactions I should know about?',
  'What should I eat to improve my gut score?',
  'How is my health trending this week?',
  'Suggest an exercise plan for me',
  'Is it safe to take paracetamol with my medicines?',
];

export default function AIPage() {
  const [messages, setMessages]  = useState<Msg[]>([WELCOME]);
  const [history,  setHistory]   = useState<Msg[]>([]);
  const [input,    setInput]     = useState('');
  const [loading,  setLoading]   = useState(false);
  const [triggers, setTriggers]  = useState<Trig[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textRef   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Msg       = { role: 'user', content: msg };
    const newHistory         = [...history, userMsg];
    setMessages(p => [...p, userMsg]);
    setHistory(newHistory);
    setLoading(true);
    setTriggers([]);

    try {
      const res = await aiApi.message({ message: msg, conversation_history: newHistory, memory_file: {} });
      const assistantMsg: Msg = { role: 'assistant', content: res.reply };
      setMessages(p => [...p, assistantMsg]);
      setHistory([...newHistory, assistantMsg]);
      if (res.fired_triggers?.length) setTriggers(res.fired_triggers);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-8 h-14 flex items-center border-b border-border bg-surface shrink-0">
        <div>
          <span className="text-[13px] font-medium text-tx-1">Kutumb AI</span>
          <span className="ml-3 text-[11px] text-tx-3">Powered by Claude · Health-aware</span>
        </div>
      </div>

      {/* Triggers */}
      {triggers.length > 0 && (
        <div className="px-6 pt-3 space-y-2 shrink-0">
          {triggers.map((t, i) => (
            <div key={i} className={cn('rounded-lg border px-4 py-2.5 text-[13px]', severityBg(t.severity))}>
              <strong className="font-medium">{t.trigger_name}</strong>
              <span className="mx-1.5 opacity-40">·</span>
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            {m.role === 'assistant' && (
              <div className="w-5 h-5 rounded-full bg-accent-muted text-accent text-[9px] flex items-center justify-center shrink-0 mt-0.5 mr-2.5 font-mono">
                K
              </div>
            )}
            <div className={cn(
              'max-w-[70%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed',
              m.role === 'user'
                ? 'bg-accent text-accent-text rounded-br-sm'
                : 'bg-surface border border-border text-tx-1 rounded-bl-sm',
            )}>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-accent-muted text-accent text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-mono">K</div>
            <div className="bg-surface border border-border rounded-2xl rounded-bl-sm px-4 py-3.5">
              <div className="flex gap-1.5 items-center">
                {[0,100,200].map(d => (
                  <div key={d} className="w-1.5 h-1.5 bg-tx-3 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Suggested prompts */}
        {messages.length === 1 && !loading && (
          <div className="ml-7 space-y-1.5">
            {PROMPTS.map((p, i) => (
              <button key={i} onClick={() => send(p)}
                className="block w-full text-left text-[13px] border border-border bg-surface hover:border-border-strong hover:bg-surface-raised text-tx-2 hover:text-tx-1 rounded-xl px-4 py-2.5 transition-all">
                {p}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border bg-surface shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your health…"
            rows={1}
            className="flex-1 resize-none bg-bg border border-border focus:border-border-strong rounded-xl px-4 py-2.5 text-[14px] text-tx-1 placeholder:text-tx-3 outline-none transition-colors max-h-32"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-30 text-accent-text flex items-center justify-center transition-colors shrink-0 text-[13px]"
          >
            ↑
          </button>
        </div>
        <div className="text-[11px] text-tx-3 mt-1.5 text-center">Enter to send · Shift+Enter for newline</div>
      </div>
    </div>
  );
}
