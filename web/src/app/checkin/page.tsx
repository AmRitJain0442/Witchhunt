'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const SYMPTOMS = ['Headache', 'Fatigue', 'Nausea', 'Back pain', 'Chest pain', 'Shortness of breath', 'Dizziness', 'Cough', 'Fever', 'Joint pain', 'Bloating', 'Anxiety'];

type Step = { val: number; label: string };
function Scale({ label, sub, value, onChange, steps }: { label: string; sub?: string; value: number | undefined; onChange: (v: number) => void; steps: Step[] }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-[13px] font-medium text-tx-1">{label}</div>
        {sub && <div className="text-[11px] text-tx-3">{sub}</div>}
        {value !== undefined && (
          <div className="text-[12px] font-mono text-accent">{steps.find(s => s.val === value)?.label}</div>
        )}
      </div>
      <div className="flex gap-1.5">
        {steps.map((s) => (
          <button
            key={s.val} type="button" onClick={() => onChange(s.val)} title={s.label}
            className={cn(
              'flex-1 h-8 rounded-md text-[11px] font-mono transition-all border',
              value === s.val
                ? 'bg-accent text-accent-text border-accent'
                : 'border-border text-tx-3 hover:border-border-strong hover:text-tx-2',
            )}
          >{s.val}</button>
        ))}
      </div>
    </div>
  );
}

export default function CheckinPage() {
  const qc = useQueryClient();
  const { data: existing } = useQuery({ queryKey: ['checkin-today'], queryFn: checkinApi.today, retry: false });

  const [mood,      setMood]      = useState<number | undefined>();
  const [energy,    setEnergy]    = useState<number | undefined>();
  const [pain,      setPain]      = useState<number | undefined>();
  const [stress,    setStress]    = useState<number | undefined>();
  const [sleep,     setSleep]     = useState<number | undefined>();
  const [hydration, setHydration] = useState<number | undefined>();
  const [symptoms,  setSymptoms]  = useState<string[]>([]);
  const [notes,     setNotes]     = useState('');
  const [saved,     setSaved]     = useState(false);

  useEffect(() => {
    if (!existing) return;
    setMood(existing.mood);
    setEnergy(existing.energy_level);
    setPain(existing.pain_level);
    setStress(existing.stress_level);
    setSleep(existing.sleep_hours ? Math.round(existing.sleep_hours) : undefined);
    setHydration(existing.hydration_glasses);
    setSymptoms(existing.symptoms ?? []);
    setNotes(existing.notes ?? '');
  }, [existing]);

  const mutation = useMutation({
    mutationFn: checkinApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['checkin-today'] }); setSaved(true); setTimeout(() => setSaved(false), 3000); },
  });

  const toggleSymptom = (s: string) =>
    setSymptoms((p) => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ mood, energy_level: energy, pain_level: pain, stress_level: stress, sleep_hours: sleep, hydration_glasses: hydration, symptoms, notes: notes || undefined });
  };

  const moodSteps  = [1,2,3,4,5].map(v => ({ val: v, label: ['Very low','Low','Okay','Good','Great'][v-1] }));
  const basicSteps = [1,2,3,4,5].map(v => ({ val: v, label: String(v) }));
  const sleepSteps = [4,5,6,7,8,9,10].map(v => ({ val: v, label: `${v}h` }));
  const hydSteps   = [1,2,3,4,5,6,7,8].map(v => ({ val: v, label: String(v) }));

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-widest text-tx-3 mb-1">Daily</div>
        <h1 className="text-3xl font-semibold tracking-tight text-tx-1">
          {existing ? 'Update check-in' : 'How are you today?'}
        </h1>
        <p className="text-[13px] text-tx-2 mt-1.5">
          2 minutes · Daily tracking powers your AI health insights
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <Scale label="Mood" value={mood} onChange={setMood} steps={moodSteps} />
        <Scale label="Energy" value={energy} onChange={setEnergy} steps={basicSteps} sub="1 = drained · 5 = energetic" />
        <Scale label="Pain" value={pain} onChange={setPain} steps={basicSteps} sub="1 = none · 5 = extreme" />
        <Scale label="Stress" value={stress} onChange={setStress} steps={basicSteps} sub="1 = calm · 5 = very high" />

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-[13px] font-medium text-tx-1 mb-4">Sleep <span className="text-tx-3 font-normal text-[11px]">last night</span></div>
          <div className="flex gap-1.5 flex-wrap">
            {sleepSteps.map(s => (
              <button key={s.val} type="button" onClick={() => setSleep(s.val)}
                className={cn('px-3 h-8 rounded-md text-[12px] font-mono border transition-all',
                  sleep === s.val ? 'bg-accent text-accent-text border-accent' : 'border-border text-tx-3 hover:border-border-strong hover:text-tx-2'
                )}>{s.label}</button>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-[13px] font-medium text-tx-1 mb-4">Hydration <span className="text-tx-3 font-normal text-[11px]">glasses of water</span></div>
          <div className="flex gap-1.5 flex-wrap">
            {hydSteps.map(s => (
              <button key={s.val} type="button" onClick={() => setHydration(s.val)}
                className={cn('w-9 h-8 rounded-md text-[12px] font-mono border transition-all',
                  hydration === s.val ? 'bg-accent text-accent-text border-accent' : 'border-border text-tx-3 hover:border-border-strong hover:text-tx-2'
                )}>{s.label}</button>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-[13px] font-medium text-tx-1 mb-4">Symptoms <span className="text-tx-3 font-normal text-[11px]">optional</span></div>
          <div className="flex flex-wrap gap-1.5">
            {SYMPTOMS.map(s => (
              <button key={s} type="button" onClick={() => toggleSymptom(s)}
                className={cn('px-3 py-1 rounded-full border text-[12px] transition-all',
                  symptoms.includes(s) ? 'bg-red/10 border-red/20 text-red' : 'border-border text-tx-3 hover:border-border-strong hover:text-tx-2'
                )}>{s}</button>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-[13px] font-medium text-tx-1 mb-3">Notes <span className="text-tx-3 font-normal text-[11px]">optional</span></div>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Anything else to note today…" rows={3}
            className="w-full bg-transparent text-[13px] text-tx-1 placeholder:text-tx-3 resize-none outline-none leading-relaxed"
          />
        </div>

        {mutation.isError && (
          <div className="rounded-lg border border-red/20 bg-red/5 text-red text-[13px] px-4 py-2.5">
            {(mutation.error as Error).message}
          </div>
        )}

        {saved && (
          <div className="rounded-lg border border-green/20 bg-green/5 text-green text-[13px] px-4 py-2.5 text-center">
            Check-in saved
          </div>
        )}

        <button type="submit" disabled={mutation.isPending || !mood}
          className="w-full bg-accent hover:bg-accent-hover disabled:opacity-40 text-accent-text font-medium py-3 rounded-xl text-[14px] transition-colors"
        >
          {mutation.isPending ? '…' : existing ? 'Update' : 'Save check-in'}
        </button>
      </form>
    </div>
  );
}
