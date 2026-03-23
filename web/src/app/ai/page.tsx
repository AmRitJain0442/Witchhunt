'use client';

import { useState, useRef, useEffect } from 'react';
import { aiApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Msg { role: 'user' | 'assistant'; content: string }

interface FiredTrigger { trigger_name: string; message: string; severity: string }

const WELCOME: Msg = {
  role: 'assistant',
  content: "Namaste! 🙏 I'm your Kutumb health companion. I have your complete health profile in memory. Ask me anything — medicine interactions, diet advice, symptom analysis, or just how you're doing health-wise.",
};

const SUGGESTED = [
  'Can I take paracetamol with my current medicines?',
  'What should I eat to improve my gut health?',
  'How is my overall health trending this week?',
  'Any food I should avoid with my medications?',
  'Suggest an exercise plan for me',
];

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'border-red-300 bg-red-50 text-red-700',
  warning:  'border-amber-300 bg-amber-50 text-amber-700',
  info:     'border-blue-200 bg-blue-50 text-blue-700',
};

export default function AIPage() {
  const [messages,    setMessages]    = useState<Msg[]>([WELCOME]);
  const [history,     setHistory]     = useState<Msg[]>([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [triggers,    setTriggers]    = useState<FiredTrigger[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
      const res = await aiApi.message({
        message: msg,
        conversation_history: newHistory,
        memory_file: {},
      });
      const assistantMsg: Msg = { role: 'assistant', content: res.reply };
      setMessages((p) => [...p, assistantMsg]);
      setHistory([...newHistory, assistantMsg]);
      if (res.fired_triggers?.length) setTriggers(res.fired_triggers);
    } catch (err: unknown) {
      setMessages((p) => [...p, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-white shrink-0">
        <h1 className="text-lg font-bold text-slate-900">🤖 Kutumb AI</h1>
        <p className="text-xs text-slate-400 mt-0.5">Powered by Claude · Remembers your health profile</p>
      </div>

      {/* Trigger banners */}
      {triggers.length > 0 && (
        <div className="px-4 py-2 space-y-2 shrink-0">
          {triggers.map((t, i) => (
            <div key={i} className={cn('rounded-xl border px-4 py-2 text-sm', SEVERITY_STYLE[t.severity] ?? SEVERITY_STYLE.info)}>
              <strong>{t.trigger_name}:</strong> {t.message}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              m.role === 'user'
                ? 'bg-emerald-600 text-white rounded-br-sm'
                : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm shadow-sm',
            )}>
              {m.role === 'assistant' && (
                <div className="text-xs text-emerald-600 font-semibold mb-1">🌿 Kutumb AI</div>
              )}
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="text-xs text-emerald-600 font-semibold mb-1">🌿 Kutumb AI</div>
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map((d) => (
                  <div key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Suggested prompts (only at start) */}
        {messages.length === 1 && !loading && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-slate-400 text-center">Try asking:</p>
            {SUGGESTED.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="w-full text-left text-sm bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-100 bg-white shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask anything about your health…"
            rows={1}
            className="flex-1 resize-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder-slate-300 max-h-28"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
          >
            <span className="text-base">➤</span>
          </button>
        </div>
        <p className="text-xs text-slate-300 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
