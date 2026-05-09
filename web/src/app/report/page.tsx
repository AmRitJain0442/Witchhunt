'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Loader2, Share2, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { reportApi } from '@/lib/api';

type DoctorReport = {
  referral_id: string;
  pdf_url: string;
  generated_at: string;
  expires_at: string;
  page_count: number;
  pdf_size_bytes: number;
  shareable_link?: string | null;
};

function fullShareUrl(path: string) {
  if (path.startsWith('http')) return path;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
  return `${apiBase.replace(/\/api\/v1\/?$/, '')}${path}`;
}

export default function DoctorReportPage() {
  const qc = useQueryClient();
  const [reason, setReason] = useState('Upcoming doctor consultation');
  const [doctor, setDoctor] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [clinic, setClinic] = useState('');
  const [notes, setNotes] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-reports'],
    queryFn: reportApi.list,
    retry: false,
  });

  const create = useMutation({
    mutationFn: () => reportApi.createDoctorContext({
      reason_for_visit: reason,
      doctor_name: doctor || undefined,
      doctor_specialty: specialty || undefined,
      clinic_name: clinic || undefined,
      notes_for_doctor: notes || undefined,
      checkin_days: 90,
    }),
    onSuccess: (report: DoctorReport) => {
      qc.invalidateQueries({ queryKey: ['doctor-reports'] });
      window.open(report.pdf_url, '_blank', 'noopener,noreferrer');
    },
  });

  const share = useMutation({
    mutationFn: (id: string) => reportApi.share(id),
    onSuccess: (res: { shareable_link: string }) => {
      setShareUrl(fullShareUrl(res.shareable_link));
      qc.invalidateQueries({ queryKey: ['doctor-reports'] });
    },
  });

  const reports: DoctorReport[] = data?.referrals ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-3">Clinical handoff</div>
          <h1 className="text-3xl font-semibold tracking-tight text-tx-1">Doctor context report</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-tx-2">
            Generate a consultation-ready PDF with profile history, conditions, allergies, current and past medicines,
            prescriptions, reports, vitals, eating habits, daily updates, symptoms, and wearable context.
          </p>
        </div>
        <button
          type="button"
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="focus-ring inline-flex w-fit items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {create.isPending ? <Loader2 size={16} className="animate-spin" /> : <Stethoscope size={16} strokeWidth={1.9} />}
          {create.isPending ? 'Generating' : 'Generate report'}
        </button>
      </header>

      {create.error && (
        <div className="mb-4 rounded-xl border border-red/20 bg-red/[0.08] px-4 py-3 text-sm text-red">
          {create.error instanceof Error ? create.error.message : 'Could not generate report'}
        </div>
      )}

      {shareUrl && (
        <div className="mb-4 rounded-xl border border-green/20 bg-green/[0.08] px-4 py-3 text-sm text-green">
          Share link: <span className="break-all font-medium">{shareUrl}</span>
        </div>
      )}

      <section className="surface-panel mb-8 rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-tx-1">
          <FileText size={17} strokeWidth={1.9} />
          Appointment details
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium text-tx-2">
            Reason for visit
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="focus-ring mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-tx-1 outline-none" />
          </label>
          <label className="text-xs font-medium text-tx-2">
            Doctor name
            <input value={doctor} onChange={(e) => setDoctor(e.target.value)} className="focus-ring mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-tx-1 outline-none" />
          </label>
          <label className="text-xs font-medium text-tx-2">
            Specialty
            <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="focus-ring mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-tx-1 outline-none" />
          </label>
          <label className="text-xs font-medium text-tx-2">
            Clinic / hospital
            <input value={clinic} onChange={(e) => setClinic(e.target.value)} className="focus-ring mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-tx-1 outline-none" />
          </label>
          <label className="md:col-span-2 text-xs font-medium text-tx-2">
            Notes for doctor
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="focus-ring mt-1 min-h-24 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm leading-6 text-tx-1 outline-none" />
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-tx-1">Generated reports</h2>
        {isLoading && <div className="surface-panel rounded-2xl px-5 py-10 text-center text-sm text-tx-3">Loading reports...</div>}
        {!isLoading && reports.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface/70 px-5 py-14 text-center">
            <div className="text-sm font-semibold text-tx-1">No doctor reports yet</div>
            <div className="mt-1 text-sm text-tx-2">Generate one before the next appointment.</div>
          </div>
        )}
        <div className="space-y-3">
          {reports.map((report) => (
            <article key={report.referral_id} className="surface-panel flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-tx-1">Doctor context report</div>
                <div className="mt-1 text-xs text-tx-3">
                  {new Date(report.generated_at).toLocaleString()} - {report.page_count} page(s) - expires {new Date(report.expires_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={report.pdf_url} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-text">
                  <Download size={14} />
                  Open PDF
                </a>
                <button
                  type="button"
                  onClick={() => share.mutate(report.referral_id)}
                  className="focus-ring inline-flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-xs font-semibold text-tx-2"
                >
                  <Share2 size={14} />
                  Share link
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
