'use client';

import { FileText, Loader2, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { labApi } from '@/lib/api';
import { cn, relativeDate } from '@/lib/utils';

type Report = { id: string; report_date: string; report_type: string; lab_name?: string; status: string; biomarkers: Record<string, number>; created_at: string };

const STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Processed', cls: 'border-green/20 bg-green/[0.1] text-green' },
  pending_ocr: { label: 'Queued', cls: 'border-amber/20 bg-amber/[0.08] text-amber' },
  processing: { label: 'Processing', cls: 'border-accent/20 bg-accent-muted text-accent' },
  failed: { label: 'Failed', cls: 'border-red/20 bg-red/[0.08] text-red' },
};

export default function LabReportsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [dragging, setDragging] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['lab-reports'], queryFn: () => labApi.list({ limit: 20 }), retry: false });
  const reports: Report[] = data?.reports ?? [];

  const upload = async (file: File) => {
    setErr('');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('report_date', new Date().toISOString().split('T')[0]);
    fd.append('report_type', 'blood_test');
    try {
      await labApi.upload(fd);
      qc.invalidateQueries({ queryKey: ['lab-reports'] });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) upload(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) upload(f);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-3">Diagnostics</div>
          <h1 className="text-3xl font-semibold tracking-tight text-tx-1">Lab reports</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-tx-2">
            Upload reports for OCR, biomarker extraction, abnormal flags, and trend tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="focus-ring inline-flex w-fit items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} strokeWidth={1.9} />}
          {uploading ? 'Uploading' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleChange} className="hidden" />
      </header>

      {err && <div className="mb-4 rounded-xl border border-red/20 bg-red/[0.08] px-4 py-3 text-sm text-red">{err}</div>}

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'mb-8 rounded-[1.5rem] border-2 border-dashed px-5 py-12 text-center transition-all',
          dragging ? 'border-accent bg-accent-muted' : 'border-border bg-surface/72 hover:border-border-strong hover:bg-surface',
          uploading ? 'cursor-wait opacity-70' : 'cursor-pointer',
        )}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-muted text-accent">
          {uploading ? <Loader2 size={23} className="animate-spin" /> : <UploadCloud size={23} strokeWidth={1.8} />}
        </div>
        <div className="text-sm font-semibold text-tx-1">{uploading ? 'Uploading report' : 'Drop a file or click to browse'}</div>
        <div className="mt-1 text-sm text-tx-3">PDF, JPEG, PNG, WebP. Max 20 MB.</div>
      </div>

      {isLoading && <div className="surface-panel rounded-2xl px-5 py-12 text-center text-sm text-tx-3">Loading reports...</div>}

      {!isLoading && !reports.length && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/70 px-5 py-16 text-center">
          <div className="text-sm font-semibold text-tx-1">No reports yet</div>
          <div className="mt-1 text-sm text-tx-2">Upload your first lab report above.</div>
        </div>
      )}

      <div className="space-y-3">
        {reports.map((r) => {
          const biomarkers = Object.entries(r.biomarkers ?? {});
          const status = STATUS[r.status] ?? STATUS.pending_ocr;
          return (
            <article key={r.id} className="surface-panel card-lift rounded-2xl p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-muted text-blue">
                    <FileText size={21} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold capitalize text-tx-1">{r.report_type.replace(/_/g, ' ')}</h2>
                    <div className="mt-1 text-xs text-tx-3">
                      {r.lab_name ? `${r.lab_name}, ` : ''}{r.report_date}, {relativeDate(r.created_at)}
                    </div>
                  </div>
                </div>
                <span className={cn('w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', status.cls)}>
                  {status.label}
                </span>
              </div>
              {biomarkers.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {biomarkers.slice(0, 12).map(([key, val]) => (
                    <div key={key} className="rounded-xl border border-border bg-bg px-2.5 py-2 text-center">
                      <div className="truncate text-[10px] text-tx-3">{key}</div>
                      <div className="mt-0.5 font-[var(--font-mono)] text-sm font-semibold text-tx-1">{val}</div>
                    </div>
                  ))}
                  {biomarkers.length > 12 && (
                    <div className="rounded-xl border border-border bg-bg px-2.5 py-2 text-center">
                      <div className="text-sm font-semibold text-tx-3">+{biomarkers.length - 12}</div>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
