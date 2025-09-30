"use client";

import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

interface VerificationRow {
  id: string;
  user_id: string;
  certificate_file_url: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [subjectById, setSubjectById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'verifications' | 'badges' | 'exams' | 'credits'>('verifications');

  // Badges state
  const [badgeUserId, setBadgeUserId] = useState('');
  const [badgeSubject, setBadgeSubject] = useState('');
  const [badges, setBadges] = useState<Array<{ id: string; user_id: string; subject: string; valid: boolean; issued_at: string }>>([]);
  const [badgesLoading, setBadgesLoading] = useState(false);

  // Exams/skills state
  const [skills, setSkills] = useState<any[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsSearch, setSkillsSearch] = useState('');
  const [skillsUserId, setSkillsUserId] = useState('');

  // Credits state
  const [creditsUserId, setCreditsUserId] = useState('');
  const [creditsAction, setCreditsAction] = useState<'set'|'add'|'subtract'>('add');
  const [creditsAmount, setCreditsAmount] = useState<number>(10);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      // Check admin flag
      const me = await fetch('/api/plan', { credentials: 'same-origin' });
      const meJson = await me.json();
      if (!me.ok || !meJson || meJson.is_admin !== true) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setIsAdmin(true);
      // Load pending verifications
      const resp = await fetch('/api/admin/teacher/verify', { credentials: 'same-origin' });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed to load verifications');
      setVerifications(Array.isArray(json.verifications) ? json.verifications : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const approve = async (id: string) => {
    const subject = (subjectById[id] || '').trim();
    const resp = await fetch('/api/admin/teacher/verify', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id, status: 'approved', subject }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      alert(json?.error || 'Failed to approve');
      return;
    }
    await load();
  };

  const deny = async (id: string) => {
    const resp = await fetch('/api/admin/teacher/verify', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id, status: 'denied' }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      alert(json?.error || 'Failed to deny');
      return;
    }
    await load();
  };

  // ===== Badges Tab Logic =====
  const loadBadges = async () => {
    try {
      setBadgesLoading(true);
      const url = `/api/admin/teacher/badges${badgeUserId ? `?userId=${encodeURIComponent(badgeUserId)}` : ''}`;
      const resp = await fetch(url, { credentials: 'same-origin' });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed to load badges');
      setBadges(Array.isArray(json.badges) ? json.badges : []);
    } catch (e: any) {
      alert(e?.message || 'Failed to load badges');
    } finally {
      setBadgesLoading(false);
    }
  };

  const issueBadge = async () => {
    try {
      if (!badgeUserId || !badgeSubject) { alert('Provide userId and subject'); return; }
      const resp = await fetch('/api/admin/teacher/badges', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ userId: badgeUserId, subject: badgeSubject })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed to issue');
      setBadgeSubject('');
      await loadBadges();
    } catch (e: any) {
      alert(e?.message || 'Failed to issue badge');
    }
  };

  const toggleBadge = async (userId: string, subject: string, current: boolean) => {
    try {
      const resp = await fetch('/api/admin/teacher/badges', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ userId, subject, valid: !current })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed to update badge');
      await loadBadges();
    } catch (e: any) {
      alert(e?.message || 'Failed to update badge');
    }
  };

  // ===== Exams Tab Logic =====
  const loadSkills = async () => {
    try {
      setSkillsLoading(true);
      const params = new URLSearchParams();
      if (skillsUserId) params.set('userId', skillsUserId);
      if (skillsSearch) params.set('search', skillsSearch);
      const resp = await fetch(`/api/admin/skills${params.toString() ? `?${params.toString()}` : ''}`, { credentials: 'same-origin' });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed to load skills');
      setSkills(Array.isArray(json.skills) ? json.skills : []);
    } catch (e: any) {
      alert(e?.message || 'Failed to load skills');
    } finally {
      setSkillsLoading(false);
    }
  };

  const updateSkill = async (skillId: string, payload: Record<string, any>) => {
    const resp = await fetch('/api/admin/skills', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ skillId, ...payload })
    });
    const json = await resp.json();
    if (!resp.ok) { alert(json?.error || 'Failed to update skill'); return; }
    await loadSkills();
  };

  // ===== Credits Tab Logic =====
  const adjustCredits = async () => {
    try {
      if (!creditsUserId || !Number.isFinite(creditsAmount)) { alert('Provide userId and amount'); return; }
      const resp = await fetch('/api/admin/credits', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ userId: creditsUserId, action: creditsAction, amount: Number(creditsAmount) })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed to update credits');
      alert(`Credits updated. New credits: ${json.credits}`);
    } catch (e: any) {
      alert(e?.message || 'Failed to update credits');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading admin...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-6 rounded shadow text-center">
          <p className="text-gray-700">Admin access required.</p>
          <a href="/dashboard" className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded">Go to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <a href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded">Home</a>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['verifications','badges','exams','credits'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1.5 rounded border text-sm ${tab===t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {error && (<div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>)}

        {tab === 'verifications' && (
          <div className="bg-white rounded shadow divide-y">
            <div className="p-4 font-medium">Pending Requests</div>
            {verifications.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">No pending items.</div>
            ) : (
              verifications.map((v) => (
                <div key={v.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm"><span className="font-medium">User:</span> {v.user_id}</p>
                    {v.certificate_file_url && (
                      <p className="text-sm"><a className="text-blue-600 underline" target="_blank" href={v.certificate_file_url} rel="noreferrer">View Certificate</a></p>
                    )}
                    {v.notes && <p className="text-xs text-gray-600">Notes: {v.notes}</p>}
                    <p className="text-xs text-gray-500">Requested: {new Date(v.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={subjectById[v.id] || ''}
                      onChange={(e) => setSubjectById((s) => ({ ...s, [v.id]: e.target.value }))}
                      placeholder="Subject (e.g., Python)"
                      className="px-3 py-2 border rounded text-sm"
                    />
                    <button onClick={() => approve(v.id)} className="px-3 py-2 bg-green-600 text-white text-sm rounded">Approve</button>
                    <button onClick={() => deny(v.id)} className="px-3 py-2 bg-red-600 text-white text-sm rounded">Deny</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'badges' && (
          <div className="bg-white rounded shadow p-4 space-y-4">
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-xs text-gray-600">User ID</label>
                <input value={badgeUserId} onChange={(e)=>setBadgeUserId(e.target.value)} className="px-3 py-2 border rounded text-sm" placeholder="user-id" />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Subject</label>
                <input value={badgeSubject} onChange={(e)=>setBadgeSubject(e.target.value)} className="px-3 py-2 border rounded text-sm" placeholder="e.g., Python" />
              </div>
              <button onClick={issueBadge} className="px-3 py-2 bg-blue-600 text-white text-sm rounded">Issue Badge</button>
              <button onClick={loadBadges} disabled={badgesLoading} className="px-3 py-2 bg-gray-800 text-white text-sm rounded">{badgesLoading ? 'Loading…' : 'Refresh'}</button>
            </div>
            <div className="divide-y">
              {badges.length === 0 ? <div className="text-sm text-gray-600">No badges.</div> : badges.map(b => (
                <div key={b.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{b.subject}</div>
                    <div className="text-gray-500">User: {b.user_id} • Issued: {new Date(b.issued_at).toLocaleDateString()} • {b.valid ? 'Valid' : 'Revoked'}</div>
                  </div>
                  <button onClick={()=>toggleBadge(b.user_id, b.subject, b.valid)} className={`px-3 py-1.5 rounded ${b.valid ? 'bg-red-600' : 'bg-green-600'} text-white`}>{b.valid ? 'Revoke' : 'Restore'}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'exams' && (
          <div className="bg-white rounded shadow p-4 space-y-4">
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-xs text-gray-600">User ID (optional)</label>
                <input value={skillsUserId} onChange={(e)=>setSkillsUserId(e.target.value)} className="px-3 py-2 border rounded text-sm" placeholder="user-id" />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Search</label>
                <input value={skillsSearch} onChange={(e)=>setSkillsSearch(e.target.value)} className="px-3 py-2 border rounded text-sm" placeholder="title/description/category" />
              </div>
              <button onClick={loadSkills} disabled={skillsLoading} className="px-3 py-2 bg-gray-800 text-white text-sm rounded">{skillsLoading ? 'Loading…' : 'Refresh'}</button>
            </div>
            <div className="divide-y">
              {skills.length === 0 ? <div className="text-sm text-gray-600">No skills.</div> : skills.map(s => (
                <div key={s.id} className="py-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{s.title} <span className="text-gray-500">• {s.category} • {s.type}</span></div>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={!!s.exam_required} onChange={(e)=>updateSkill(s.id, { exam_required: e.target.checked })} />
                      <span>Exam required</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input defaultValue={s.exam_link || ''} onBlur={(e)=>{ if (e.target.value !== (s.exam_link||'')) updateSkill(s.id, { exam_link: e.target.value }); }} className="px-3 py-2 border rounded" placeholder="Exam link (optional)" />
                    <div className="flex gap-2">
                      <input type="number" min={0} step={0.5} defaultValue={typeof s.duration_hours === 'number' ? s.duration_hours : 1} onBlur={(e)=>updateSkill(s.id, { duration_hours: Number(e.target.value)||1 })} className="px-3 py-2 border rounded w-32" placeholder="Hours" />
                      <input type="number" min={0} defaultValue={typeof s.price === 'number' ? s.price : 0} onBlur={(e)=>updateSkill(s.id, { price: Number(e.target.value)||0 })} className="px-3 py-2 border rounded w-32" placeholder="Price" />
                      <input type="number" min={1} defaultValue={typeof s.max_students === 'number' ? s.max_students : 10} onBlur={(e)=>updateSkill(s.id, { max_students: Number(e.target.value)||10 })} className="px-3 py-2 border rounded w-36" placeholder="Max students" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'credits' && (
          <div className="bg-white rounded shadow p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-600">User ID</label>
                <input value={creditsUserId} onChange={(e)=>setCreditsUserId(e.target.value)} className="px-3 py-2 border rounded text-sm" placeholder="user-id" />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Action</label>
                <select value={creditsAction} onChange={(e)=>setCreditsAction(e.target.value as any)} className="px-3 py-2 border rounded text-sm w-full">
                  <option value="add">Add</option>
                  <option value="subtract">Subtract</option>
                  <option value="set">Set</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600">Amount</label>
                <input type="number" min={0} value={creditsAmount} onChange={(e)=>setCreditsAmount(Number(e.target.value)||0)} className="px-3 py-2 border rounded text-sm w-full" />
              </div>
              <div>
                <button onClick={adjustCredits} className="px-4 py-2 bg-blue-600 text-white rounded text-sm w-full">Apply</button>
              </div>
            </div>
            <p className="text-xs text-gray-500">Tip: You can also allow users to self-earn credits via sessions; this tool is for admin adjustments and refunds.</p>
          </div>
        )}
      </div>
    </div>
  );
}

