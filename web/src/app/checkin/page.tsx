'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const SYMPTOMS = ['Headache', 'Fatigue', 'Nausea', 'Back pain', 'Chest pain', 'Shortness of breath', 'Dizziness', 'Cough', 'Fever', 'Joint pain', 'Bloating', 'Anxiety'];

type RatingProps = { label: string; value: number | undefined; onChange: (v: number) => void; steps: { val: number; emoji: string; label: string }[] };

function RatingRow({ label, value, onChange, steps }: RatingProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4">
      <div className="text-sm font-medium text-slate-700 mb-3">{label}</div>
      <div className="flex gap-2">
        {steps.map((s) => (
          <button
            key={s.val}
            onClick={() => onChange(s.val)}
            title={s.label}
            className={cn(
              'flex-1 flex flex-col items-center py-2 rounded-lg border text-xs transition-all',
              value === s.val
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-slate-200 text-slate-500 hover:border-emerald-300',
            )}
          >
            <span className="text-lg">{s.emoji}</span>
            <span className="mt-0.5 hidden sm:block">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CheckinPage() {
  const qc = useQueryClient();
  const { data: existing } = useQuery({ queryKey: ['checkin-today'], queryFn: checkinApi.today, retry: false });

  const [mood,     setMood]     = useState<number | undefined>();
  const [energy,   setEnergy]   = useState<number | undefined>();
  const [pain,     setPain]     = useState<number | undefined>();
  const [sleep,    setSleep]    = useState<number | undefined>();
  const [stress,   setStress]   = useState<number | undefined>();
  const [hydration,setHydration]= useState<number | undefined>();
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes,    setNotes]    = useState('');
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    if (existing) {
      setMood(existing.mood);
      setEnergy(existing.energy_level);
      setPain(existing.pain_level);
      setSleep(existing.sleep_hours ? Math.round(existing.sleep_hours) : undefined);
      setStress(existing.stress_level);
      setHydration(existing.hydration_glasses);
      setSymptoms(existing.symptoms ?? []);
      setNotes(existing.notes ?? '');
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: (data: unknown) => checkinApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['checkin-today'] }); setSaved(true); setTimeout(() => setSaved(false), 3000); },
  });

  const toggleSymptom = (s: string) =>
    setSymptoms((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ mood, energy_level: energy, pain_level: pain, sleep_hours: sleep, stress_level: stress, hydration_glasses: hydration, symptoms, notes: notes || undefined });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{existing ? "Today's check-in ✓" : 'How are you today?'}</h1>
        <p className="text-slate-500 text-sm mt-0.5">Takes 2 minutes. Track daily for best AI insights.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <RatingRow label="Mood" value={mood} onChange={setMood} steps={[
          { val: 1, emoji: '😢', label: 'Very low' },
          { val: 2, emoji: '😕', label: 'Low' },
          { val: 3, emoji: '😐', label: 'Okay' },
          { val: 4, emoji: '🙂', label: 'Good' },
          { val: 5, emoji: '😄', label: 'Great' },
        ]} />
        <RatingRow label="Energy" value={energy} onChange={setEnergy} steps={[
          { val: 1, emoji: '😴', label: 'Drained' },
          { val: 2, emoji: '🥱', label: 'Tired' },
          { val: 3, emoji: '😐', label: 'Okay' },
          { val: 4, emoji: '⚡', label: 'Good' },
          { val: 5, emoji: '🚀', label: 'Energetic' },
        ]} />
        <RatingRow label="Pain level" value={pain} onChange={setPain} steps={[
          { val: 1, emoji: '😌', label: 'None' },
          { val: 2, emoji: '🙂', label: 'Mild' },
          { val: 3, emoji: '😟', label: 'Moderate' },
          { val: 4, emoji: '😣', label: 'Severe' },
          { val: 5, emoji: '😭', label: 'Extreme' },
        ]} />
        <RatingRow label="Stress" value={stress} onChange={setStress} steps={[
          { val: 1, emoji: '😌', label: 'Calm' },
          { val: 2, emoji: '🙂', label: 'Low' },
          { val: 3, emoji: '😐', label: 'Moderate' },
          { val: 4, emoji: '😟', label: 'High' },
          { val: 5, emoji: '😰', label: 'Very high' },
        ]} />

        {/* Sleep */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="text-sm font-medium text-slate-700 mb-3">Sleep hours last night</div>
          <div className="flex gap-2 flex-wrap">
            {[4, 5, 6, 7, 8, 9, 10].map((h) => (
              <button
                type="button" key={h} onClick={() => setSleep(h)}
                className={cn('w-12 h-10 rounded-lg border text-sm font-medium transition-all',
                  sleep === h ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-200 text-slate-600 hover:border-emerald-300'
                )}
              >{h}h</button>
            ))}
          </div>
        </div>

        {/* Hydration */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="text-sm font-medium text-slate-700 mb-3">Water glasses today</div>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
              <button
                type="button" key={g} onClick={() => setHydration(g)}
                className={cn('w-12 h-10 rounded-lg border text-sm font-medium transition-all',
                  hydration === g ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-200 text-slate-600 hover:border-blue-300'
                )}
              >{g}💧</button>
            ))}
          </div>
        </div>

        {/* Symptoms */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="text-sm font-medium text-slate-700 mb-3">Symptoms (optional)</div>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => (
              <button
                type="button" key={s} onClick={() => toggleSymptom(s)}
                className={cn('px-3 py-1 rounded-full text-xs border font-medium transition-all',
                  symptoms.includes(s) ? 'bg-red-100 border-red-300 text-red-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                )}
              >{s}</button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="text-sm font-medium text-slate-700 mb-2">Notes (optional)</div>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Any other observations for today…"
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-slate-700 placeholder-slate-300"
          />
        </div>

        {mutation.isError && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2 border border-red-100">
            {(mutation.error as Error).message}
          </div>
        )}

        {saved && (
          <div className="bg-emerald-50 text-emerald-700 text-sm rounded-lg px-4 py-2 border border-emerald-100 text-center font-medium">
            ✓ Check-in saved!
          </div>
        )}

        <button
          type="submit" disabled={mutation.isPending || !mood}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {mutation.isPending ? 'Saving…' : existing ? 'Update check-in' : 'Save check-in'}
        </button>
      </form>
    </div>
  );
}
