'use client';

import { BatteryMedium, Droplets, Loader2, Moon, Smile, Thermometer, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkinApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const SYMPTOMS = ['Headache', 'Fatigue', 'Nausea', 'Back pain', 'Chest pain', 'Shortness of breath', 'Dizziness', 'Cough', 'Fever', 'Joint pain', 'Bloating', 'Anxiety'];

type Step = { val: number; label: string };
type ScaleProps = {
  label: string;
  sub?: string;
  value: number | undefined;
  onChange: (v: number) => void;
  steps: Step[];
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

function Scale({ label, sub, value, onChange, steps, icon: Icon }: ScaleProps) {
  return (
    <div className="surface-panel rounded-2xl p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-muted text-accent">
            <Icon size={20} strokeWidth={1.8} />
          </div>
          <div>
            <div className="text-sm font-semibold text-tx-1">{label}</div>
            {sub && <div className="mt-0.5 text-xs text-tx-3">{sub}</div>}
          </div>
        </div>
        {value !== undefined && (
          <div className="rounded-full bg-bg-subtle px-2.5 py-1 font-[var(--font-mono)] text-xs text-accent">
            {steps.find((s) => s.val === value)?.label}
          </div>
        )}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {steps.map((s) => (
          <button
            key={s.val}
            type="button"
            onClick={() => onChange(s.val)}
            title={s.label}
            aria-pressed={value === s.val}
            className={cn(
              'focus-ring h-10 rounded-xl border font-[var(--font-mono)] text-xs font-semibold transition-all',
              value === s.val
                ? 'border-accent bg-accent text-accent-text'
                : 'border-border bg-bg text-tx-3 hover:border-border-strong hover:text-tx-1',
            )}
          >
            {s.val}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CheckinPage() {
  const qc = useQueryClient();
  const { data: existing } = useQuery({ queryKey: ['checkin-today'], queryFn: checkinApi.today, retry: false });

  const [mood, setMood] = useState<number | undefined>();
  const [energy, setEnergy] = useState<number | undefined>();
  const [pain, setPain] = useState<number | undefined>();
  const [stress, setStress] = useState<number | undefined>();
  const [sleep, setSleep] = useState<number | undefined>();
  const [hydration, setHydration] = useState<number | undefined>();
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!existing) return;
    queueMicrotask(() => {
      setMood(existing.mood);
      setEnergy(existing.energy_level);
      setPain(existing.pain_level);
      setStress(existing.stress_level);
      setSleep(existing.sleep_hours ? Math.round(existing.sleep_hours) : undefined);
      setHydration(existing.hydration_glasses);
      setSymptoms(existing.symptoms ?? []);
      setNotes(existing.notes ?? '');
    });
  }, [existing]);

  const mutation = useMutation({
    mutationFn: checkinApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkin-today'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const toggleSymptom = (s: string) => setSymptoms((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ mood, energy_level: energy, pain_level: pain, stress_level: stress, sleep_hours: sleep, hydration_glasses: hydration, symptoms, notes: notes || undefined });
  };

  const moodSteps = [1, 2, 3, 4, 5].map((v) => ({ val: v, label: ['Very low', 'Low', 'Okay', 'Good', 'Great'][v - 1] }));
  const basicSteps = [1, 2, 3, 4, 5].map((v) => ({ val: v, label: String(v) }));
  const sleepSteps = [4, 5, 6, 7, 8, 9, 10].map((v) => ({ val: v, label: `${v}h` }));
  const hydSteps = [1, 2, 3, 4, 5, 6, 7, 8].map((v) => ({ val: v, label: String(v) }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-8">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-3">Daily check-in</div>
        <h1 className="text-3xl font-semibold tracking-tight text-tx-1">
          {existing ? 'Update today&apos;s check-in' : 'How are you today?'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-tx-2">
          Two minutes of structured context powers your scores, advisories, and AI health memory.
        </p>
      </header>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-3">
          <Scale label="Mood" value={mood} onChange={setMood} steps={moodSteps} icon={Smile} />
          <Scale label="Energy" value={energy} onChange={setEnergy} steps={basicSteps} sub="1 drained, 5 energetic" icon={BatteryMedium} />
          <Scale label="Pain" value={pain} onChange={setPain} steps={basicSteps} sub="1 none, 5 extreme" icon={Thermometer} />
          <Scale label="Stress" value={stress} onChange={setStress} steps={basicSteps} sub="1 calm, 5 very high" icon={Zap} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="surface-panel rounded-2xl p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-muted text-blue">
                  <Moon size={20} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-tx-1">Sleep</div>
                  <div className="text-xs text-tx-3">last night</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sleepSteps.map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setSleep(s.val)}
                    className={cn(
                      'focus-ring h-9 rounded-xl border px-3 font-[var(--font-mono)] text-xs font-semibold transition-all',
                      sleep === s.val ? 'border-accent bg-accent text-accent-text' : 'border-border bg-bg text-tx-3 hover:border-border-strong hover:text-tx-1',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="surface-panel rounded-2xl p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-muted text-blue">
                  <Droplets size={20} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-tx-1">Hydration</div>
                  <div className="text-xs text-tx-3">glasses of water</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hydSteps.map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setHydration(s.val)}
                    className={cn(
                      'focus-ring h-9 w-10 rounded-xl border font-[var(--font-mono)] text-xs font-semibold transition-all',
                      hydration === s.val ? 'border-accent bg-accent text-accent-text' : 'border-border bg-bg text-tx-3 hover:border-border-strong hover:text-tx-1',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="surface-panel rounded-2xl p-5">
            <div className="mb-4 text-sm font-semibold text-tx-1">
              Symptoms <span className="font-normal text-tx-3">optional</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOMS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSymptom(s)}
                  className={cn(
                    'focus-ring rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                    symptoms.includes(s) ? 'border-red/20 bg-red/[0.08] text-red' : 'border-border bg-bg text-tx-3 hover:border-border-strong hover:text-tx-1',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <label className="surface-panel block rounded-2xl p-5">
            <span className="mb-3 block text-sm font-semibold text-tx-1">
              Notes <span className="font-normal text-tx-3">optional</span>
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else to note today..."
              rows={4}
              className="focus-ring min-h-28 w-full resize-none rounded-xl border border-border bg-bg px-3.5 py-3 text-sm leading-6 text-tx-1 outline-none placeholder:text-tx-3"
            />
          </label>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="surface-panel rounded-2xl p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-3">Today&apos;s signal</div>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ['Mood', mood ? moodSteps.find((s) => s.val === mood)?.label : 'Required'],
                ['Energy', energy ?? '-'],
                ['Pain', pain ?? '-'],
                ['Stress', stress ?? '-'],
                ['Sleep', sleep ? `${sleep}h` : '-'],
                ['Water', hydration ? `${hydration} glasses` : '-'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="text-tx-3">{label}</span>
                  <span className="font-medium text-tx-1">{value}</span>
                </div>
              ))}
            </div>
            {mutation.isError && (
              <div className="mt-4 rounded-xl border border-red/20 bg-red/[0.08] px-3.5 py-3 text-sm text-red">
                {(mutation.error as Error).message}
              </div>
            )}
            {saved && (
              <div className="mt-4 rounded-xl border border-green/20 bg-green/[0.1] px-3.5 py-3 text-center text-sm text-green">
                Check-in saved
              </div>
            )}
            <button
              type="submit"
              disabled={mutation.isPending || !mood}
              className="focus-ring mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-45"
            >
              {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
              {mutation.isPending ? 'Saving' : existing ? 'Update check-in' : 'Save check-in'}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
