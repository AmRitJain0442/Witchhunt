'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { labApi } from '@/lib/api';
import { relativeDate, cn } from '@/lib/utils';

type Report = { id: string; report_date: string; report_type: string; lab_name?: string; status: string; biomarkers: Record<string,number>; created_at: string };

const STATUS: Record<string, { label: string; cls: string }> = {
  completed:   { label: 'Processed',  cls: 'border-green/20 text-green' },
  pending_ocr: { label: 'Queued',     cls: 'border-amber/20 text-amber' },
  processing:  { label: 'Processing', cls: 'border-accent/20 text-accent' },
  failed:      { label: 'Failed',     cls: 'border-red/20 text-red' },
};

export default function LabReportsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err,       setErr]       = useState('');
  const [dragging,  setDragging]  = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['lab-reports'], queryFn: () => labApi.list({ limit: 20 }), retry: false });
  const reports: Report[]   = data?.reports ?? [];

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
    const f = e.target.files?.[0]; if (f) upload(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) upload(f);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-tx-3 mb-1">Diagnostics</div>
          <h1 className="text-3xl font-semibold tracking-tight text-tx-1">Lab Reports</h1>
          <p className="text-[13px] text-tx-2 mt-1.5">AI extracts biomarkers · flags abnormals · tracks trends</p>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-accent-text text-[13px] font-medium px-4 py-2 rounded-lg transition-colors">
          {uploading ? 'Uploading…' : '+ Upload'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleChange} className="hidden" />
      </div>

      {err && <div className="mb-4 rounded-lg border border-red/20 bg-red/5 text-red text-[13px] px-4 py-2.5">{err}</div>}

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'mb-8 border-2 border-dashed rounded-2xl py-12 text-center cursor-pointer transition-all',
          dragging ? 'border-accent bg-accent-muted' : 'border-border hover:border-border-strong hover:bg-bg-subtle',
        )}
      >
        <div className="text-[11px] uppercase tracking-widest text-tx-3 mb-1">
          {uploading ? 'Uploading…' : 'Drop a file or click to browse'}
        </div>
        <div className="text-[12px] text-tx-3">PDF · JPEG · PNG · WebP · max 20 MB</div>
      </div>

      {isLoading && <div className="text-[13px] text-tx-3 py-8 text-center">Loading reports…</div>}

      {!isLoading && !reports.length && (
        <div className="py-16 text-center">
          <div className="text-[13px] font-medium text-tx-2">No reports yet</div>
          <div className="text-[12px] text-tx-3 mt-1">Upload your first lab report above</div>
        </div>
      )}

      <div className="space-y-3">
        {reports.map((r) => {
          const biomarkers = Object.entries(r.biomarkers ?? {});
          const s = STATUS[r.status] ?? STATUS.pending_ocr;
          return (
            <div key={r.id} className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-[14px] font-medium text-tx-1 capitalize">{r.report_type.replace(/_/g,' ')}</div>
                  <div className="text-[12px] text-tx-3 font-mono mt-0.5">
                    {r.lab_name ? `${r.lab_name} · ` : ''}{r.report_date} · {relativeDate(r.created_at)}
                  </div>
                </div>
                <span className={cn('text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full border', s.cls)}>
                  {s.label}
                </span>
              </div>
              {biomarkers.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {biomarkers.slice(0, 12).map(([key, val]) => (
                    <div key={key} className="bg-bg border border-border rounded-lg px-2.5 py-2 text-center">
                      <div className="text-[10px] text-tx-3 truncate">{key}</div>
                      <div className="text-[13px] font-semibold text-tx-1 font-mono mt-0.5">{val}</div>
                    </div>
                  ))}
                  {biomarkers.length > 12 && (
                    <div className="bg-bg border border-border rounded-lg px-2.5 py-2 text-center">
                      <div className="text-[11px] text-tx-3">+{biomarkers.length - 12}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
