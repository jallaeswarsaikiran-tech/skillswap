"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from '@/lib/supabaseAuthProvider';
import { getSupabaseClient } from '@/lib/supabaseClient';

// ========== Animated Counter ==========
const AnimatedCounter = ({ end, duration = 1000 }: { end: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const isFloat = end % 1 !== 0;

  useEffect(() => {
    let startTime: number | undefined;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      let currentValue: number;
      if (isFloat) {
        currentValue = Number((end * percentage).toFixed(1));
      } else {
        currentValue = Math.floor(end * percentage);
      }
      setCount(currentValue);
      if (percentage < 1) requestAnimationFrame(animate);
      else setCount(end);
    };

    const el = document.getElementById(`counter-${end}`);
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        requestAnimationFrame(animate);
        io.unobserve(entry.target);
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [end, duration, isFloat]);

  return (
    <span id={`counter-${end}`} className="text-3xl font-bold text-gray-900">
      {isFloat ? count.toFixed(1) : count.toLocaleString()}
    </span>
  );
};

// ========== Toast ==========
const NotificationToast = ({ message, type, id, removeNotification }: { message: string; type: "success" | "info" | "error"; id: number; removeNotification: (id: number) => void }) => {
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'info' ? 'bg-indigo-500' : 'bg-red-500';
  useEffect(() => {
    const t = setTimeout(() => removeNotification(id), 4000);
    return () => clearTimeout(t);
  }, [id, removeNotification]);
  return (
    <div className={`flex items-center space-x-3 p-4 rounded-lg shadow-xl text-white ${bgColor}`}>
      <span className="w-5 h-5">•</span>
      <p className="font-medium text-sm">{message}</p>
    </div>
  );
};

// ========== Stat Card ==========
const StatCard = ({ title, value, change, color }: { title: string; value: React.ReactNode; change: string; color: 'green' | 'red' }) => (
  <div className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition duration-300">
    <p className="text-sm font-medium text-gray-500">{title}</p>
    <div className="flex items-center justify-between mt-1">
      {value}
      <span className={`inline-flex items-center text-sm font-semibold ${color === 'green' ? 'text-green-500' : 'text-red-500'}`}>{change}</span>
    </div>
  </div>
);

// ========== Skill Card ==========
const SkillCard = ({ title, students, earnings, rating }: { title: string; students: number; earnings: number; rating: number }) => (
  <div className="bg-white p-6 rounded-2xl shadow-lg border-t-4 border-indigo-500 transform hover:scale-[1.02] transition duration-300">
    <h4 className="text-xl font-bold text-gray-900 mb-2">{title}</h4>
    <div className="flex items-center space-x-1 text-sm mb-4">
      <span className="w-4 h-4 text-yellow-500">★</span>
      <span className="font-semibold text-gray-800">{rating.toFixed(1)}</span>
      <span className="text-gray-500">| {students} Students</span>
    </div>
    <div className="space-y-2 text-sm text-gray-600">
      <div className="flex justify-between"><span>Total Earnings:</span><span className="font-bold text-green-600">${earnings.toLocaleString()}</span></div>
      <div className="flex justify-between"><span>Sessions Taught:</span><span className="font-bold text-gray-800">{students * 4}</span></div>
    </div>
  </div>
);

// ========== Main ProfileTab ==========
export default function ProfileTab() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<'Learner' | 'Pending' | 'Teacher' | 'Admin'>('Learner');
  const [teacherLevel, setTeacherLevel] = useState<'None' | 'Bronze' | 'Silver' | 'Gold'>('None');
  const [isVerified, setIsVerified] = useState(false);
  const [currentTab, setCurrentTab] = useState<'Overview' | 'Skills Taught' | 'History' | 'Reviews' | 'Settings'>('Overview');
  const [stats, setStats] = useState({ views: 0, students: 0, rating: 0.0, sessions: 0 });
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: 'success' | 'info' | 'error' }[]>([]);
  const [profileData, setProfileData] = useState({
    name: 'Anya Sharma',
    bio: 'Digital nomad, design thinker, and 7-year veteran in UX/UI education. I turn complex concepts into actionable skills. Let\'s build something beautiful.',
    location: 'Remote (Global)',
    lastUpdate: Date.now(),
    history: [{ type: 'info', message: 'Profile created as Learner.', timestamp: Date.now() - 3600000 } as any],
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [certificateUrl, setCertificateUrl] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);

  const addNotification = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    if (userRole === 'Teacher') {
      setStats({ views: 1540, students: 485, rating: 4.9, sessions: 832 });
      setTeacherLevel('Gold');
      setIsVerified(true);
      addNotification('Welcome back, Gold Level Teacher!', 'success');
    }
  }, [userRole, addNotification]);

  // Load profile from API (Supabase-backed) on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingProfile(true);
        const resp = await fetch('/api/users', { credentials: 'same-origin' });
        if (resp.ok) {
          const data = await resp.json();
          const displayName = data?.user?.display_name || data?.user?.displayName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
          const bioFromDb = data?.user?.bio || profileData.bio;
          const roleFromDb = data?.user?.role as ('Learner'|'Pending'|'Teacher'|'Admin') | undefined;
          const verifiedFromDb = Boolean(data?.user?.is_verified);
          const avatarFromDb = data?.user?.avatar_url || null;
          setProfileData((prev) => ({ ...prev, name: displayName, bio: bioFromDb }));
          if (roleFromDb) setUserRole(roleFromDb);
          setIsVerified(verifiedFromDb);
          setAvatarUrl(avatarFromDb);
        }
      } catch (e) {
        // ignore errors, keep defaults
      } finally {
        setLoadingProfile(false);
      }
    };
    load();
    // also listen for profile:update events to update header in real-time
    const onProfileUpdate = (e: Event) => {
      const ce = e as CustomEvent;
      const display_name = ce?.detail?.user?.display_name;
      if (display_name) setProfileData((p) => ({ ...p, name: display_name }));
    };
    window.addEventListener('profile:update', onProfileUpdate as EventListener);
    return () => window.removeEventListener('profile:update', onProfileUpdate as EventListener);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = () => {
    setEditName(profileData.name);
    setEditBio(profileData.bio);
    setAvatarFile(null);
    setEditOpen(true);
  };

  const handleProfileEdit = async () => {
    try {
      setSavingEdit(true);
      let newAvatarUrl: string | null = avatarUrl;
      // If a new avatar file is selected, upload to Supabase Storage (bucket: avatars)
      if (avatarFile && user) {
        try {
          setAvatarUploading(true);
          const supabase = getSupabaseClient();
          const ext = avatarFile.name.split('.').pop() || 'jpg';
          const path = `${user.id}/${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true, cacheControl: '3600', contentType: avatarFile.type });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
          if (pub?.publicUrl) newAvatarUrl = pub.publicUrl;
        } catch (e) {
          addNotification('Avatar upload failed, saving without new photo.', 'error');
        } finally {
          setAvatarUploading(false);
        }
      }

      const resp = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: editName, bio: editBio, avatarUrl: newAvatarUrl || undefined }),
        credentials: 'same-origin',
      });
      const json = await resp.json().catch(() => ({} as any));
      if (!resp.ok || json?.error) {
        addNotification(json?.error || 'Failed to save profile', 'error');
        throw new Error(json?.error || 'Failed to save');
      }
      const updated = json?.user || {};
      const updatedName = updated.display_name || editName;
      const updatedBio = typeof updated.bio === 'string' ? updated.bio : editBio;
      const updatedAvatar = typeof updated.avatar_url === 'string' ? updated.avatar_url : (newAvatarUrl || avatarUrl);
      setProfileData((prev) => ({
        ...prev,
        name: updatedName,
        bio: updatedBio,
        lastUpdate: Date.now(),
        history: [...prev.history, { type: 'edit', message: 'Profile updated.', timestamp: Date.now() }],
      }));
      if (updatedAvatar) setAvatarUrl(updatedAvatar);
      // notify header to update name in real-time
      try { window.dispatchEvent(new CustomEvent('profile:update', { detail: { user: { display_name: updatedName, avatar_url: updatedAvatar ?? null } } })); } catch {}
      addNotification('Profile saved.', 'success');
      setEditOpen(false);
    } catch (e) {
      // error already surfaced above
    } finally {
      setSavingEdit(false);
    }
  };

  const simulateRoleTransition = () => {
    if (userRole === 'Learner') {
      // open verification modal to submit certificate URL
      setVerifyOpen(true);
      return;
    }
    if (userRole === 'Teacher') addNotification('You are already an approved Teacher!', 'info');
  };

  const submitVerification = async () => {
    try {
      if (!certificateUrl) {
        addNotification('Please provide a certificate URL', 'error');
        return;
      }
      setSubmittingVerification(true);
      // Mark user as pending verification for admin review
      const resp = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_verification: true, certificate_url: certificateUrl }),
      });
      if (!resp.ok) throw new Error('Failed to submit');
      setUserRole('Pending');
      setProfileData((prev) => ({
        ...prev,
        history: [...prev.history, { type: 'info', message: 'Verification requested. Awaiting admin review.', timestamp: Date.now() }],
      }));
      addNotification('Verification submitted. Admin will review your certificate.', 'info');
      setVerifyOpen(false);
      setCertificateUrl('');
    } catch (e) {
      addNotification('Failed to submit verification', 'error');
    } finally {
      setSubmittingVerification(false);
    }
  };

  const ui = useMemo(() => {
    let headerClass = 'bg-gradient-to-r from-blue-500 to-indigo-600';
    let badgeColor = 'bg-blue-500';
    let levelStars = 0;
    if (userRole === 'Teacher') {
      badgeColor = 'bg-green-500';
      if (teacherLevel === 'Gold') { headerClass = 'bg-gradient-to-r from-yellow-500 to-purple-600'; levelStars = 3; }
      else if (teacherLevel === 'Silver') { headerClass = 'bg-gradient-to-r from-gray-400 to-gray-600'; levelStars = 2; }
      else if (teacherLevel === 'Bronze') { headerClass = 'bg-gradient-to-r from-amber-600 to-amber-800'; levelStars = 1; }
    } else if (userRole === 'Pending') {
      badgeColor = 'bg-yellow-500';
    }
    return { headerClass, badgeColor, levelStars };
  }, [userRole, teacherLevel]);

  const primaryActionText = userRole === 'Learner' ? 'Start Verification' : userRole === 'Pending' ? 'Verification Under Review' : 'Teacher Dashboard';

  const renderTabContent = () => {
    switch (currentTab) {
      case 'Overview':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">About {profileData.name}</h3>
                <p className="text-gray-600 leading-relaxed mb-4">{profileData.bio}</p>
                <button onClick={openEdit} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition">
                  Edit Profile →
                </button>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Recent Activity (Live Feed)</h3>
                <ul className="space-y-4">
                  {profileData.history.slice().reverse().slice(0, 5).map((log: any, i: number) => (
                    <li key={i} className="flex items-start text-sm text-gray-700">
                      <span className={`h-2 w-2 rounded-full ${log.type === 'success' ? 'bg-green-500' : log.type === 'edit' ? 'bg-indigo-500' : 'bg-yellow-500'} mt-2`} />
                      <p className="ml-3">
                        {log.message}
                        <span className="text-xs text-gray-500 ml-2">({new Date(log.timestamp).toLocaleTimeString()})</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Stats</h3>
                <dl className="space-y-3 text-gray-600">
                  <div className="flex justify-between items-center"><dt className="font-medium">Last Update:</dt><dd className="text-sm">{new Date(profileData.lastUpdate).toLocaleDateString()}</dd></div>
                  <div className="flex justify-between items-center"><dt className="font-medium">Specialty:</dt><dd className="text-sm">UX/UI, Figma</dd></div>
                  <div className="flex justify-between items-center"><dt className="font-medium">Portfolio:</dt><dd><a href="#" className="text-sm text-indigo-500 hover:underline">View Portfolio</a></dd></div>
                </dl>
              </div>

              {userRole === 'Teacher' && (
                <div className="sticky top-8 bg-indigo-600 p-5 rounded-2xl shadow-2xl space-y-4 text-white">
                  <h3 className="text-xl font-bold">Teacher Dashboard</h3>
                  <p className="text-indigo-200 text-sm">Access your Gold Level features here.</p>
                  <button className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg shadow-sm text-indigo-600 bg-white hover:bg-gray-100 transition">+ Post a New Skill</button>
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-indigo-500">
                    <span>Check Analytics</span>
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">2 New Insights</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'Skills Taught':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <SkillCard title="UI Design (Advanced)" students={210} earnings={5250} rating={5.0} />
            <SkillCard title="UX Research" students={150} earnings={3100} rating={4.8} />
            <SkillCard title="Design Thinking" students={125} earnings={2800} rating={4.9} />
            {userRole === 'Teacher' && (
              <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-dashed border-gray-300 flex items-center justify-center h-40 hover:bg-gray-50 cursor-pointer transition">
                <div className="text-center text-gray-500">
                  <div className="w-8 h-8 mx-auto mb-2">+</div>
                  <p className="font-medium">Add New Skill</p>
                </div>
              </div>
            )}
          </div>
        );
      case 'History':
        return (
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Full Profile History Log</h3>
            <ol className="relative border-l border-gray-200 ml-2">
              {profileData.history.slice().reverse().map((log: any, i: number) => (
                <li key={i} className="mb-8 ml-4">
                  <div className={`absolute w-3 h-3 ${log.type === 'success' ? 'bg-green-500' : log.type === 'edit' ? 'bg-indigo-500' : 'bg-yellow-500'} rounded-full mt-1.5 -left-1.5 border border-white`} />
                  <time className="mb-1 text-xs font-semibold text-gray-500 block">{new Date(log.timestamp).toLocaleString()}</time>
                  <p className="text-sm font-medium text-gray-900">{log.message}</p>
                </li>
              ))}
            </ol>
          </div>
        );
      case 'Reviews':
        return <div className="text-gray-500 p-6 bg-white rounded-2xl shadow-lg">Review cards and filtering would go here. Overall Rating: <strong>4.9</strong> (412 total reviews).</div>;
      case 'Settings':
        return <div className="text-gray-500 p-6 bg-white rounded-2xl shadow-lg">Settings and notification preferences for {profileData.name} would be managed here.</div>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div id="profile-header" className={`relative ${ui.headerClass} rounded-3xl shadow-2xl overflow-hidden pt-24 pb-8 mb-8`}>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center sm:items-end justify-between">
            <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16">
              <div className="relative h-32 w-32 rounded-full ring-4 ring-white shadow-2xl bg-white p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="h-full w-full object-cover rounded-full" src={avatarUrl || 'https://placehold.co/128x128/f0e6ff/4c2f90?text=U'} alt={profileData.name} />
                {isVerified && (
                  <span className="absolute bottom-1 right-1 h-7 w-7 bg-green-500 rounded-full flex items-center justify-center border-4 border-white">
                    ✓
                  </span>
                )}
                <button
                  onClick={openEdit}
                  title="Edit profile"
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 text-xs rounded-full bg-white text-gray-800 shadow hover:bg-gray-100"
                >
                  Edit
                </button>
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-4 text-center sm:text-left text-white">
                <h1 className="text-4xl font-extrabold tracking-tight">{profileData.name}</h1>
                <div id="role-badge" className="mt-1 flex items-center justify-center sm:justify-start space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${ui.badgeColor} text-white shadow-md`}>
                    {userRole === 'Pending' ? 'Pending • Under Review' : userRole}
                  </span>
                </div>
                <p className="mt-2 text-indigo-100 text-sm max-w-xl hidden sm:block">{profileData.bio.substring(0, 100)}...</p>
              </div>
            </div>
            <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button className={`px-5 py-2 font-semibold rounded-full shadow-lg transition w-full sm:w-auto ${userRole === 'Learner' ? 'bg-white text-indigo-600 hover:bg-gray-100' : userRole === 'Pending' ? 'bg-yellow-400 text-yellow-900 cursor-not-allowed opacity-80' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`} onClick={simulateRoleTransition} disabled={userRole === 'Pending'}>
                {primaryActionText}
              </button>
              <button onClick={openEdit} className="px-5 py-2 font-semibold rounded-full shadow-lg transition w-full sm:w-auto bg-white text-gray-800 hover:bg-gray-100">
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-10 mb-8">
          <StatCard title="Profile Views" value={<AnimatedCounter end={stats.views} />} change="+22%" color="green" />
          <StatCard title="Students Enrolled" value={<AnimatedCounter end={stats.students} />} change="+5%" color="green" />
          <StatCard title="Skill Rating" value={<AnimatedCounter end={stats.rating} duration={2000} />} change="-0.1%" color="red" />
          <StatCard title="Completed Sessions" value={<AnimatedCounter end={stats.sessions} />} change="+10%" color="green" />
        </div>

        <div>
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
              {['Overview', 'Skills Taught', 'History', 'Reviews', 'Settings'].map((tab) => (
                <a key={tab} href="#" onClick={(e) => { e.preventDefault(); setCurrentTab(tab as any); }} className={`py-3 px-1 border-b-2 font-medium text-sm transition whitespace-nowrap ${currentTab === tab ? 'text-indigo-600 border-indigo-500' : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'}`}>
                  {tab}
                </a>
              ))}
            </nav>
          </div>
          <div className="min-h-[400px]">{renderTabContent()}</div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
              <button onClick={() => setEditOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarFile ? URL.createObjectURL(avatarFile) : (avatarUrl || 'https://placehold.co/64x64?text=U')} alt="avatar preview" className="h-16 w-16 rounded-full object-cover border" />
                  <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
                </div>
                {avatarUploading && <p className="text-xs text-gray-500 mt-1">Uploading avatar…</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setEditOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleProfileEdit} disabled={savingEdit || avatarUploading} className={`px-5 py-2 rounded-lg text-white ${savingEdit || avatarUploading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{(savingEdit || avatarUploading) ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Verification Modal */}
      {verifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Request Verification</h3>
              <button onClick={() => setVerifyOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">✕</button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Provide a link to your teaching certificate or portfolio for admin review.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certificate URL</label>
                <input type="url" value={certificateUrl} onChange={(e) => setCertificateUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setVerifyOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={submitVerification} disabled={submittingVerification} className={`px-5 py-2 rounded-lg text-white ${submittingVerification ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{submittingVerification ? 'Submitting…' : 'Submit for Review'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div id="toast-container" className="fixed top-5 right-5 z-50 space-y-3">
        {notifications.map((n) => (
          <NotificationToast key={n.id} id={n.id} message={n.message} type={n.type} removeNotification={removeNotification} />
        ))}
      </div>
    </div>
  );
}
