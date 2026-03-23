'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labApi } from '@/lib/api';
import { relativeDate, cn } from '@/lib/utils';

type Report = { id: string; report_date: string; report_type: string; lab_name?: string; status: string; biomarkers: Record<string, number>; created_at: string };

const STATUS_STYLE: Record<string, string> = {
  completed:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending_ocr:  'bg-amber-50 text-amber-600 border-amber-200',
  processing:   'bg-blue-50 text-blue-600 border-blue-200',
  failed:       'bg-red-50 text-red-600 border-red-200',
};
const STATUS_LABEL: Record<string, string> = {
  completed: '✓ Processed', pending_ocr: '⏳ Queued', processing: '🔄 Processing', failed: '✗ Failed',
};

export default function LabReportsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['lab-reports'], queryFn: () => labApi.list({ limit: 20 }), retry: false });
  const reports: Report[] = data?.reports ?? [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr('');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('report_date', new Date().toISOString().split('T')[0]);
    fd.append('report_type', 'blood_test');
    try {
      await labApi.upload(fd);
      qc.invalidateQueries({ queryKey: ['lab-reports'] });
    } catch (err: unknown) {
      setUploadErr(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lab Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">Upload reports — AI extracts biomarkers automatically</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          {uploading ? 'Uploading…' : '+ Upload report'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleUpload} className="hidden" />
      </div>

      {uploadErr && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2 border border-red-100">{uploadErr}</div>
      )}

      {/* Upload drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="mb-6 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
      >
        <div className="text-3xl mb-2">🔬</div>
        <div className="text-sm font-medium text-slate-600">Drop a lab report here, or click to browse</div>
        <div className="text-xs text-slate-400 mt-1">PDF, JPEG, PNG, WebP · Max 20 MB</div>
      </div>

      {isLoading && <div className="text-center py-12 text-slate-400">Loading reports…</div>}

      {!isLoading && !reports.length && (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">📄</div>
          <div className="font-medium text-slate-700">No reports yet</div>
          <div className="text-sm text-slate-400 mt-1">Upload your first lab report to get AI-extracted biomarker data.</div>
        </div>
      )}

      <div className="space-y-3">
        {reports.map((r) => {
          const biomarkerKeys = Object.keys(r.biomarkers ?? {});
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-slate-800 capitalize">{r.report_type.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {r.lab_name ? `${r.lab_name} · ` : ''}{r.report_date} · uploaded {relativeDate(r.created_at)}
                  </div>
                </div>
                <span className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', STATUS_STYLE[r.status] ?? '')}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>

              {biomarkerKeys.length > 0 && (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {biomarkerKeys.slice(0, 8).map((key) => (
                    <div key={key} className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-500 truncate">{key}</div>
                      <div className="font-semibold text-slate-800 text-sm mt-0.5">{r.biomarkers[key]}</div>
                    </div>
                  ))}
                  {biomarkerKeys.length > 8 && (
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-400">+{biomarkerKeys.length - 8} more</div>
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
