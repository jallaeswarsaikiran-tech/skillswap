'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/supabaseAuthProvider';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface SessionItem {
  id: string;
  skillTitle: string;
  status: string;
  teacherId: string;
  learnerName: string;
}

function UploadContent() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/sessions');
        const json = await res.json();
        const taught = (json.sessions || []).filter((s: SessionItem) => s.teacherId === user?.id && s.status === 'completed');
        setSessions(taught);
        if (taught.length > 0) setSelectedSessionId(taught[0].id);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      window.location.href = '/auth/login';
      return;
    }
    if (!file || !selectedSessionId) return;
    setUploading(true);
    setResult(null);
    try {
      // Upload the certificate file (optional)
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/files/upload', { method: 'POST', body: fd });
      const upJson = await up.json();
      if (!up.ok) throw new Error(upJson?.error || 'Upload failed');

      // Issue certificate to the learner of the selected session (teacher-only)
      const resp = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: selectedSessionId, fileId: upJson.fileId }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed to issue certificate');

      setResult({ success: true, message: 'Certificate issued to the learner successfully.' });
      setFile(null);
    } catch (e) {
      setResult({ success: false, message: (e as Error).message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Icon icon="carbon:skill-level" width={32} className="text-blue-600" />
            <span className="text-xl font-semibold text-gray-900">SkillSwap</span>
          </Link>
          <Link href="/certificates" className="text-gray-700 hover:text-blue-600">Back</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Issue Certificate</h1>
        <p className="text-gray-600 mb-6">Teachers can issue a certificate to the learner for a completed session. No validation required.</p>

        {!user && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
            Please sign in as a teacher to issue certificates.
          </div>
        )}

        {user && (
          <>
            {loading ? (
              <div className="mb-4 text-gray-600">Loading your completed sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
                You have no completed sessions taught. Complete a session to issue a certificate.
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="bg-white rounded-xl p-6 border border-gray-100 space-y-4">
              <label className="block text-sm text-gray-700">Select a completed session you taught</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                disabled={sessions.length === 0}
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.skillTitle} — Learner: {s.learnerName}
                  </option>
                ))}
              </select>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Upload certificate file (PDF or image)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full"
                  disabled={sessions.length === 0}
                />
              </div>

              <button
                type="submit"
                disabled={uploading || !file || !selectedSessionId}
                className={`px-5 py-2 rounded-lg text-white ${uploading || !file || !selectedSessionId ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {uploading ? 'Issuing...' : 'Issue Certificate'}
              </button>
            </form>

            {result && (
              <div className={`mt-4 p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                {result.message}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <UploadContent />
    </Suspense>
  );
}