'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { Camera, Video, MessageCircle, Star, Award, CreditCard, Book, Users, Settings, Upload, Phone, PhoneOff, Mic, Maximize2, Minimize2 } from 'lucide-react';
import ProfileTab from '@/app/components/ProfileTab';
import DashboardRedesignSection from '@/app/components/DashboardRedesignSection';

// Enhanced Dashboard Component
export default function EnhancedSkillSwapDashboard() {
  const [user, setUser] = useState({
    id: '',
    displayName: 'User',
    email: '',
    credits: 0,
    skillsLearned: 0,
    skillsTaught: 0,
    totalSessions: 0,
    avatar: null as string | null,
    isTeacher: false,
    totalEarnings: 0,
    plan: 'free' as 'free' | 'premium',
    isAdmin: false,
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [newDisplayName, setNewDisplayName] = useState<string>('');
  const [savingDisplay, setSavingDisplay] = useState(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
  const [chatSize, setChatSize] = useState<'sm' | 'lg'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatSize');
      if (saved === 'lg') return 'lg';
    }
    return 'sm';
  });
  const [showProfileUpload, setShowProfileUpload] = useState(false);
  const [showPostSkill, setShowPostSkill] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [skills, setSkills] = useState<Array<any>>([]);
  const [sessions, setSessions] = useState<Array<any>>([]);
  const [badges, setBadges] = useState<Array<{ id: string; subject: string; valid: boolean; issued_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verif, setVerif] = useState<any | null>(null);
  const [verifLoading, setVerifLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load verification when Certificates tab opens
  useEffect(() => {
    const fetchVerification = async () => {
      if (activeTab !== 'certificates') return;
      try {
        setVerifLoading(true);
        const resp = await fetch('/api/teacher/verify');
        const json = resp.ok ? await resp.json() : { verification: null };
        setVerif(json.verification || null);
      } finally {
        setVerifLoading(false);
      }
    };
    void fetchVerification();
  }, [activeTab]);

  // Enforce free plan usage before starting call
  const tryStartCall = async () => {
    try {
      const resp = await fetch('/api/usage');
      const json = await resp.json();
      if (!resp.ok) {
        alert(json?.error || 'Failed to check usage');
        return;
      }
      if (!json.allowed) {
        alert('Daily free plan limit reached. Upgrade to Premium for unlimited sessions.');
        return;
      }
      setShowVideoCall(true);
    } catch (e) {
      setShowVideoCall(true); // fallback: do not block if error
    }
  };

  // Plan upgrade handler
  const upgradePlan = async (plan: 'free' | 'premium') => {
    const resp = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
    if (resp.ok) {
      setUser((prev) => ({ ...prev, plan }));
    } else {
      const j = await resp.json().catch(() => ({}));
      alert(j?.error || 'Failed to update plan');
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      window.location.href = '/signin';
    } catch {
      window.location.href = '/signin';
    }
  };

  // Admin login handler (code-based)
  const [adminCode, setAdminCode] = useState('');
  const submitAdminCode = async () => {
    if (!adminCode.trim()) return;
    const resp = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: adminCode.trim() }) });
    const json = await resp.json();
    if (resp.ok) {
      setUser((prev) => ({ ...prev, isAdmin: true }));
      alert('Admin access granted');
    } else {
      alert(json?.error || 'Invalid admin code');
    }
  };

  const submitTeacherVerification = async (file: File, notes: string) => {
    try {
      setVerifLoading(true);
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/files/upload', { method: 'POST', body: fd });
      const upJson = await up.json();
      if (!up.ok || !upJson?.fileUrl) {
        alert(upJson?.error || 'Upload failed');
        return;
      }
      const resp = await fetch('/api/teacher/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateFileUrl: upJson.fileUrl, notes }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        alert(json?.error || 'Failed to submit verification');
        return;
      }
      setVerif(json.verification || null);
      // reflect teacher flag when approved later; for now pending
    } finally {
      setVerifLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        // Load user
        const uRes = await fetch('/api/users');
        if (!uRes.ok) {
          if (uRes.status === 401) {
            setErrorMsg('Please sign in to view your dashboard.');
            setLoading(false);
            return;
          }
          throw new Error('Failed to load user');
        }
        const uJson = await uRes.json();
        const u = uJson.user || {};
        setUser({
          id: u.id || '',
          displayName: u.display_name || 'User',
          email: u.email || '',
          credits: u.credits ?? 0,
          skillsLearned: u.skills_learned ?? 0,
          skillsTaught: u.skills_taught ?? 0,
          totalSessions: u.total_sessions ?? 0,
          avatar: u.avatar_url || null,
          isTeacher: !!u.is_teacher,
          totalEarnings: Number(u.total_earnings || 0),
          plan: (u.plan_type as 'free' | 'premium') || 'free',
          isAdmin: !!u.is_admin,
        });
        // initialize form fields once user is loaded
        setNewDisplayName((u.display_name || 'User'));

        // Load skills (limit 50)
        const sRes = await fetch('/api/skills');
        const sJson = sRes.ok ? await sRes.json() : { skills: [] };
        const allSkills: any[] = Array.isArray(sJson.skills) ? sJson.skills : [];
        setSkills(allSkills.filter((s) => s.user_id === (u.id || '')));

        // Load sessions if available
        try {
          const sessRes = await fetch('/api/sessions');
          const sessJson = sessRes.ok ? await sessRes.json() : { sessions: [] };
          setSessions(Array.isArray(sessJson.sessions) ? sessJson.sessions : []);
        } catch {
          setSessions([]);
        }

        // Load teacher badges if any
        try {
          const bRes = await fetch('/api/teacher/badges');
          const bJson = bRes.ok ? await bRes.json() : { badges: [] };
          setBadges(Array.isArray(bJson.badges) ? bJson.badges : []);
        } catch {
          setBadges([]);
        }
      } catch (e) {
        setErrorMsg('Could not load dashboard. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Set a default active chat session (first upcoming or any)
  useEffect(() => {
    if (!activeChatSessionId) {
      // try restore from localStorage
      const saved = typeof window !== 'undefined' ? localStorage.getItem('lastChatSessionId') : null;
      if (saved) {
        setActiveChatSessionId(saved);
      } else if (sessions.length > 0) {
        setActiveChatSessionId(sessions[0].id);
      }
    }
  }, [sessions, activeChatSessionId]);

  // Persist active chat session id
  useEffect(() => {
    if (activeChatSessionId && typeof window !== 'undefined') {
      try { localStorage.setItem('lastChatSessionId', activeChatSessionId); } catch {}
    }
  }, [activeChatSessionId]);

  // Focus chat input when panel opens
  useEffect(() => {
    if (showChat && chatInputRef.current) {
      const el = chatInputRef.current;
      el.focus();
      const len = el.value.length;
      try { el.setSelectionRange(len, len); } catch {}
    }
  }, [showChat]);

  // Subscribe to chat messages for active session
  useEffect(() => {
    const supabase = getSupabaseClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchInitial = async () => {
      if (!activeChatSessionId) return;
      const resp = await fetch(`/api/chat?sessionId=${encodeURIComponent(activeChatSessionId)}`);
      const json = resp.ok ? await resp.json() : { messages: [] };
      setMessages(Array.isArray(json.messages) ? json.messages : []);
    };

    const subscribe = () => {
      if (!activeChatSessionId) return;
      channel = supabase
        .channel(`chat:${activeChatSessionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${activeChatSessionId}`,
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as any]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as any;
            setMessages((prev) => prev.filter((m) => m.id !== oldRow.id));
          }
        })
        .subscribe();
    };

    void fetchInitial();
    subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeChatSessionId]);

  // Quick edit display name
  const handleEditDisplayName = async () => {
    const newName = prompt('Enter new display name', user.displayName || '');
    if (!newName || newName.trim() === '') return;
    const resp = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: newName.trim() }),
      credentials: 'same-origin',
    });
    if (resp.ok) {
      setUser((prev) => ({ ...prev, displayName: newName.trim() }));
      try { window.dispatchEvent(new CustomEvent('profile:update', { detail: { user: { display_name: newName.trim() } } })); } catch {}
    }
  };

  // Profile Upload Component
  const ProfileUpload = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Update Profile Picture</h3>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {user.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <Camera size={32} className="text-gray-400" />
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="avatar-upload"
            onChange={async (e) => {
              const file = e.target.files && e.target.files[0];
              if (file) {
                // Upload to our files endpoint if available
                try {
                  const fd = new FormData();
                  fd.append('file', file);
                  const up = await fetch('/api/files/upload', { method: 'POST', body: fd });
                  const upJson = await up.json();
                  if (up.ok && upJson.fileUrl) {
                    const patch = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar_url: upJson.fileUrl }) });
                    if (patch.ok) setUser((prev) => ({ ...prev, avatar: upJson.fileUrl }));
                  }
                } catch {
                  // Fallback to local preview only
                  const reader = new FileReader();
                  reader.onload = (ev: ProgressEvent<FileReader>) => {
                    const result = ev.target?.result as string | null;
                    if (result) setUser((prev) => ({ ...prev, avatar: result }));
                  };
                  reader.readAsDataURL(file);
                }
              }
            }}
          />
          <label htmlFor="avatar-upload" className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
            <Upload size={16} className="inline mr-2" />
            Choose Photo
          </label>
          <div className="flex space-x-2 w-full">
            <button 
              onClick={() => setShowProfileUpload(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Post Skill Modal
  const PostSkillModal = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('programming');
    const [type, setType] = useState<'teaching' | 'learning'>('teaching');
    const [price, setPrice] = useState<number>(0);
    const [difficulty, setDifficulty] = useState('beginner');
    const [durationHours, setDurationHours] = useState<number>(1);
    const [maxStudents, setMaxStudents] = useState<number>(10);
    const [examRequired, setExamRequired] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState(false);
    const allowedSubjects = badges.filter((b) => b.valid).map((b) => b.subject.toLowerCase());

    // Ensure category defaults to a badge if teaching and user has badges
    useEffect(() => {
      if (type === 'teaching' && allowedSubjects.length > 0) {
        if (!allowedSubjects.includes(category.toLowerCase())) {
          // pick first allowed subject as default
          setCategory(allowedSubjects[0]);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type]);

    const submit = async () => {
      try {
        setSubmitting(true);
        if (type === 'teaching') {
          if (user.plan !== 'premium') {
            alert('Premium plan required to post teaching skills.');
            return;
          }
          if (!user.isTeacher) {
            alert('Teacher access required. Submit verification first.');
            return;
          }
          if (!allowedSubjects.includes(category.toLowerCase())) {
            alert('You do not have a valid teacher badge for this subject/category.');
            return;
          }
        }
        const resp = await fetch('/api/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            category,
            type,
            price,
            difficulty_level: difficulty,
            duration_hours: durationHours,
            max_students: maxStudents,
            exam_required: examRequired,
          }),
        });
        const json = await resp.json();
        if (resp.ok) {
          setSkills((prev) => [{ ...json.skill }, ...prev]);
          setShowPostSkill(false);
        } else {
          alert(json?.error || 'Failed to create skill');
        }
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-lg">
          <h3 className="text-lg font-semibold mb-4">Post a Skill</h3>
          <div className="grid gap-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="px-3 py-2 border rounded" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="px-3 py-2 border rounded h-24" />
            <div className="grid grid-cols-2 gap-3">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 border rounded">
                <option value="programming">Programming</option>
                <option value="design">Design</option>
                <option value="marketing">Marketing</option>
                <option value="business">Business</option>
              </select>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="px-3 py-2 border rounded">
                <option value="teaching">Teaching</option>
                <option value="learning">Learning</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} placeholder="Price (credits)" className="px-3 py-2 border rounded" />
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="px-3 py-2 border rounded">
                <option>beginner</option>
                <option>intermediate</option>
                <option>advanced</option>
              </select>
              <input type="number" value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} placeholder="Duration (hrs)" className="px-3 py-2 border rounded" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={maxStudents} onChange={(e) => setMaxStudents(Number(e.target.value))} placeholder="Max students" className="px-3 py-2 border rounded" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={examRequired} onChange={(e) => setExamRequired(e.target.checked)} /> Exam required
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowPostSkill(false)} className="px-4 py-2 rounded border">Cancel</button>
            <button disabled={submitting} onClick={submit} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">{submitting ? 'Posting...' : 'Post Skill'}</button>
          </div>
        </div>
      </div>
    );
  };


  // Video Call Component
  const VideoCallInterface = () => (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-32 h-32 rounded-full bg-gray-700 mx-auto mb-4 flex items-center justify-center">
              <Users size={48} />
            </div>
            <p className="text-lg">Alice Smith</p>
            <p className="text-sm opacity-75">React Development Session</p>
          </div>
        </div>
        
        {/* Self video (small) */}
        <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden">
          <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-sm">
            You
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="p-4 bg-black bg-opacity-75">
        <div className="flex justify-center space-x-4">
          <button className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white hover:bg-gray-500">
            <Mic size={20} />
          </button>
          <button className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white hover:bg-gray-500">
            <Video size={20} />
          </button>
          <button 
            onClick={() => setShowVideoCall(false)}
            className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  // WhatsApp-style Chat Interface
  const ChatInterface = () => (
    <div className={`fixed ${isMobile ? (chatSize === 'lg' ? 'inset-x-0 bottom-0 h-[80vh]' : 'inset-x-0 bottom-0 h-1/2') : (chatSize === 'lg' ? 'bottom-4 right-4 w-[680px] h-[680px]' : 'bottom-4 right-4 w-96 h-[520px]')} bg-white rounded-lg shadow-xl z-40 flex flex-col`}>
      {/* Header */}
      <div className="bg-green-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center">
            <Users size={16} />
          </div>
          <div>
            <p className="font-medium">Chat</p>
            <p className="text-xs opacity-75">Session: {activeChatSessionId ?? 'none'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = chatSize === 'sm' ? 'lg' : 'sm';
              setChatSize(next);
              try { localStorage.setItem('chatSize', next); } catch {}
            }}
            className="px-2 py-1 text-xs rounded bg-white/20 hover:bg-white/30"
            title={chatSize === 'sm' ? 'Expand' : 'Shrink'}
          >
            {chatSize === 'sm' ? 'Expand' : 'Shrink'}
          </button>
          <button 
            onClick={() => setShowChat(false)}
            className="w-8 h-8 rounded-full hover:bg-green-700 flex items-center justify-center"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : ''}`}>
            <div className={`${m.sender_id === user.id ? 'bg-green-500 text-white' : 'bg-white'} rounded-lg p-3 max-w-xs shadow-sm`}>
              <p className="text-sm">{m.message_text || (m.file_url ? 'Sent a file' : '')}</p>
              <p className={`text-xs mt-1 ${m.sender_id === user.id ? 'text-green-100' : 'text-gray-500'}`}>{new Date(m.created_at).toLocaleTimeString()}</p>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-xs text-gray-500">No messages yet.</p>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white rounded-b-lg">
        <div className="flex space-x-2">
          <input
            ref={chatInputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && activeChatSessionId && newMessage.trim() !== '') {
                const resp = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: activeChatSessionId, message_text: newMessage.trim() }) });
                if (resp.ok) setNewMessage('');
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onMouseDown={(e) => e.preventDefault()}
            disabled={!activeChatSessionId || newMessage.trim() === ''}
            onClick={async () => {
              if (!activeChatSessionId || !newMessage.trim()) return;
              const resp = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: activeChatSessionId, message_text: newMessage.trim() }) });
              if (resp.ok) setNewMessage('');
            }}
            className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 disabled:opacity-50"
          >
            <MessageCircle size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  // Incoming Call Notification
  const IncomingCallNotification = () => (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 border-l-4 border-green-500">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <Phone size={20} className="text-green-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium">Incoming Video Call</p>
          <p className="text-sm text-gray-600">Alice Smith - React Session</p>
        </div>
      </div>
      <div className="flex space-x-2 mt-3">
        <button 
          onClick={() => {
            setIncomingCall(null);
            void tryStartCall();
          }}
          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Accept
        </button>
        <button 
          onClick={() => setIncomingCall(null)}
          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Decline
        </button>
      </div>
    </div>
  );

  // Exam Portal Component
  const ExamPortal = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Create Exam</h3>
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Exam Title" 
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Select Skill Category</option>
            <option>React Development</option>
            <option>Python Basics</option>
            <option>UI/UX Design</option>
          </select>
          <div className="space-y-3">
            <h4 className="font-medium">Questions</h4>
            <div className="p-4 border rounded-lg space-y-3">
              <input type="text" placeholder="Question 1" className="w-full px-3 py-2 border rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input type="text" placeholder="Option A" className="px-3 py-2 border rounded" />
                <input type="text" placeholder="Option B" className="px-3 py-2 border rounded" />
                <input type="text" placeholder="Option C" className="px-3 py-2 border rounded" />
                <input type="text" placeholder="Option D" className="px-3 py-2 border rounded" />
              </div>
              <input type="text" placeholder="Correct Answer" className="w-full px-3 py-2 border rounded" />
              <textarea placeholder="Explanation" className="w-full px-3 py-2 border rounded h-20"></textarea>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Add Question
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Certificate Generator
  const CertificateGenerator = () => (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Generate Certificate</h3>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Award size={48} className="mx-auto mb-4 text-yellow-500" />
        <h4 className="text-xl font-semibold mb-2">Certificate of Completion</h4>
        <p className="text-gray-600 mb-4">This certifies that {user.displayName} has successfully completed</p>
        <p className="text-lg font-medium mb-4">React Development Course</p>
        <p className="text-sm text-gray-500 mb-6">Score: 85% | Date: {new Date().toLocaleDateString()}</p>
        <button className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
          Download Certificate
        </button>
      </div>
    </div>
  );

  // Payment & Earnings Component
  const PaymentDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">${user.totalEarnings}</p>
              <p className="text-sm text-gray-600">Total Earnings</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Star size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{user.credits}</p>
              <p className="text-sm text-gray-600">Available Credits</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Withdraw Earnings
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" role="status" aria-live="polite">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
              <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20"></div>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">Preparing your dashboard…</p>
              <p className="text-xs text-gray-500">Fetching profile, sessions, and messages</p>
            </div>
          </div>

          {/* Shimmer placeholders */}
          <div className="mt-6 space-y-3">
            <div className="h-3 w-3/4 rounded bg-gray-200 overflow-hidden">
              <div className="h-full w-1/2 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-gray-300 to-transparent" style={{ backgroundSize: '200% 100%' }} />
            </div>
            <div className="h-3 w-1/2 rounded bg-gray-200 overflow-hidden">
              <div className="h-full w-2/3 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-gray-300 to-transparent" style={{ backgroundSize: '200% 100%' }} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[0,1,2].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-gray-100 overflow-hidden">
                  <div className="h-full w-1/2 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-gray-300 to-transparent" style={{ backgroundSize: '200% 100%' }} />
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-xs text-gray-400">Tip: You can open Messages & Calls once the dashboard loads.</p>
        </div>
        <style jsx global>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-16' : ''}`}>
      {/* Header (hidden; we use GlobalHeader now) */}
      <div className="hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* SkillSwap Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" fill="currentColor"/>
                  <path d="M8 12L9 16L12 15L15 16L16 12L15 8L12 9L9 8L8 12Z" fill="currentColor" opacity="0.7"/>
                </svg>
              </div>
              <span className="text-lg font-semibold text-gray-800">Dashboard</span>
            </div>
            {/* Removed profile avatar and welcome text; manage via Settings */}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPremium(true)}
              className="hidden md:flex items-center space-x-2 bg-yellow-100 px-3 py-1 rounded-full hover:bg-yellow-200"
              title="View Premium options"
            >
              <Star size={16} className="text-yellow-600" />
              <span className="text-sm font-medium">{user.credits} Credits</span>
            </button>
            {user.isAdmin && (
              <a
                href="/admin"
                className="p-2 bg-purple-100 rounded-lg hover:bg-purple-200 text-purple-700"
                title="Admin Panel"
              >
                Admin
              </a>
            )}
            {user.isAdmin && (
              <span className="px-2 py-1 text-xs rounded bg-purple-50 text-purple-700 border border-purple-200">Admin</span>
            )}
            {/* removed top header nav buttons per request */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`max-w-7xl mx-auto px-4 py-6 ${!isMobile ? 'flex space-x-6' : ''}`}>
        {/* Sidebar Navigation */}
        <div className={`${isMobile ? 'hidden' : 'w-64'} space-y-2`}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Users },
            { id: 'exams', label: 'Exam Portal', icon: Book },
            { id: 'certificates', label: 'Certificates', icon: Award },
            { id: 'communication', label: 'Messages & Calls', icon: MessageCircle },
            { id: 'payments', label: 'Payments', icon: CreditCard },
            // External link style item to navigate to Courses page
            { id: 'courses_link', label: 'Courses', icon: Book, href: '/courses' as const },
          ].map((item: any) => (
            item.href ? (
              <a
                key={item.id}
                href={item.href}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors bg-white hover:bg-gray-50 text-gray-700`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </a>
            ) : (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === item.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white hover:bg-gray-50 text-gray-700'
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            )
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Free plan banner retained */}
              {user.plan === 'free' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    You are on the Free plan. You can browse skills and chat with teachers.
                    To post skills and generate certificates, upgrade to Premium.
                  </p>
                  <div className="mt-2">
                    <button onClick={() => upgradePlan('premium')} className="px-3 py-1.5 bg-blue-600 text-white rounded">Upgrade to Premium</button>
                  </div>
                </div>
              )}

              <DashboardRedesignSection
                user={{ totalEarnings: user.totalEarnings, totalSessions: user.totalSessions, credits: user.credits }}
                skills={skills}
                sessions={sessions as any}
                onOpenChat={(sessionId?: string) => {
                  if (sessionId) setActiveChatSessionId(String(sessionId));
                  setShowChat(true);
                }}
                onStartCall={(sessionId?: string) => {
                  if (sessionId) setActiveChatSessionId(String(sessionId));
                  void tryStartCall();
                }}
              />
            </div>
          )}
          {activeTab === 'exams' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Create Exam</h3>
                <p className="text-sm text-gray-600">Exam tools coming soon.</p>
              </div>
            </div>
          )}
          {activeTab === 'communication' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Messages</h3>
                  <button onClick={() => setShowChat(true)} className="px-3 py-2 rounded bg-green-600 text-white text-sm">Open Chat</button>
                </div>
                <p className="text-sm text-gray-600">Chat with your students/teachers. Select a session and start messaging.</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Video Calls</h3>
                  <button onClick={() => { void tryStartCall(); }} className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Start Call</button>
                </div>
                <p className="text-sm text-gray-600">Start a live session subject to your plan limits.</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-3">Recent Sessions</h3>
                <div className="space-y-2">
                  {sessions && sessions.length > 0 ? sessions.slice(0, 6).map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.skillTitle || s.skill_title || s.skill_id}</p>
                        <p className="text-xs text-gray-600 truncate">{s.status}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setActiveChatSessionId(s.id); setShowChat(true); }} className="px-2 py-1 text-xs rounded bg-green-600 text-white">Chat</button>
                        <button onClick={() => { void tryStartCall(); }} className="px-2 py-1 text-xs rounded bg-blue-600 text-white">Call</button>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500">No sessions yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'certificates' && (
            <div className="bg-white rounded-lg p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold">Teacher Verification</h3>
              {user.plan === 'free' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">Certificate generation and teacher tools are Premium features.</p>
                </div>
              )}
              {verifLoading ? (
                <p className="text-sm text-gray-600">Loading...</p>
              ) : verif ? (
                <div className="rounded-lg border p-4 bg-gray-50">
                  <p className="text-sm">Status: <span className="font-medium capitalize">{verif.status}</span></p>
                  {verif.certificate_file_url && (
                    <p className="text-sm truncate">Certificate: <a href={verif.certificate_file_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">View</a></p>
                  )}
                  {verif.notes && <p className="text-sm text-gray-600">Notes: {verif.notes}</p>}
                  {verif.reviewed_at && <p className="text-xs text-gray-500">Reviewed at: {new Date(verif.reviewed_at).toLocaleString()}</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Submit a certificate to request teacher access.</p>
                  <input id="teacher-cert" type="file" accept="image/*,application/pdf" className="block" />
                  <textarea id="teacher-notes" placeholder="Notes (optional)" className="w-full px-3 py-2 border rounded" />
                  <div>
                    <button
                      onClick={() => {
                        const fInput = document.getElementById('teacher-cert') as HTMLInputElement | null;
                        const nInput = document.getElementById('teacher-notes') as HTMLTextAreaElement | null;
                        const file = fInput?.files && fInput.files[0];
                        const notes = nInput?.value || '';
                        if (!file) {
                          alert('Please select a file');
                          return;
                        }
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        submitTeacherVerification(file, notes);
                      }}
                      className="px-4 py-2 rounded bg-blue-600 text-white"
                    >
                      Submit for verification
                    </button>
                  </div>
                </div>
              )}
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">My Certificates</h4>
                <p className="text-sm text-gray-500">Display of learning certificates will go here.</p>
              </div>
            </div>
          )}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Plan</p>
                      <p className="text-xl font-semibold capitalize">{user.plan}</p>
                    </div>
                    {user.plan === 'free' ? (
                      <button onClick={() => upgradePlan('premium')} className="px-3 py-2 bg-blue-600 text-white rounded">Upgrade</button>
                    ) : (
                      <button onClick={() => upgradePlan('free')} className="px-3 py-2 bg-gray-100 rounded">Downgrade</button>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CreditCard size={24} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">${user.totalEarnings}</p>
                      <p className="text-sm text-gray-600">Total Earnings</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Star size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">{user.credits}</p>
                      <p className="text-sm text-gray-600">Available Credits</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Withdraw Earnings
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Profile</h3>
                  <button
                    onClick={() => setShowProfileEditor((v) => !v)}
                    className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
                  >
                    {showProfileEditor ? 'Close' : 'Edit'}
                  </button>
                </div>
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Display name</span>
                    <span className="font-medium">{user.displayName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Email</span>
                    <span className="font-medium">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-medium capitalize">{user.plan}</span>
                  </div>
                </div>
                {/* Inline edit display name */}
                {showProfileEditor && (
                  <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium mb-2">Edit Display Name</h4>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        placeholder="Enter display name"
                        className="flex-1 px-3 py-2 border rounded"
                      />
                      <button
                        disabled={savingDisplay || newDisplayName.trim() === ''}
                        onClick={async () => {
                          const name = newDisplayName.trim();
                          if (name === '') return;
                          try {
                            setSavingDisplay(true);
                            const resp = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_name: name }) });
                            if (resp.ok) {
                              // Update immediately in UI
                              setUser((prev) => ({ ...prev, displayName: name }));
                            }
                          } finally {
                            setSavingDisplay(false);
                          }
                        }}
                        className={`px-4 py-2 rounded text-white ${savingDisplay ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        {savingDisplay ? 'Saving…' : 'Save' }
                      </button>
                    </div>
                  </div>
                )}

                {/* Change password */}
                {showProfileEditor && (
                <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-2">Change Password</h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      className="px-3 py-2 border rounded"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="px-3 py-2 border rounded"
                    />
                  </div>
                  {passwordMsg && <p className="text-xs mt-2 text-gray-600">{passwordMsg}</p>}
                  <div className="mt-2">
                    <button
                      disabled={savingPassword}
                      onClick={async () => {
                        setPasswordMsg(null);
                        if (!newPassword || newPassword.length < 6) {
                          setPasswordMsg('Password should be at least 6 characters.');
                          return;
                        }
                        if (newPassword !== confirmPassword) {
                          setPasswordMsg('Passwords do not match.');
                          return;
                        }
                        try {
                          setSavingPassword(true);
                          const supabase = getSupabaseClient();
                          const { error } = await supabase.auth.updateUser({ password: newPassword });
                          if (error) {
                            setPasswordMsg(error.message || 'Failed to update password.');
                          } else {
                            setPasswordMsg('Password updated successfully.');
                            setNewPassword('');
                            setConfirmPassword('');
                          }
                        } finally {
                          setSavingPassword(false);
                        }
                      }}
                      className={`px-4 py-2 rounded text-white ${savingPassword ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {savingPassword ? 'Updating…' : 'Update Password'}
                    </button>
                  </div>
                </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button onClick={() => upgradePlan(user.plan === 'premium' ? 'free' : 'premium')} className="px-3 py-2 bg-blue-600 text-white rounded">
                    {user.plan === 'premium' ? 'Downgrade to Free' : 'Upgrade to Premium'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Admin Access</h3>
                {user.isAdmin ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs rounded bg-purple-50 text-purple-700 border border-purple-200">Admin</span>
                      <span className="text-sm text-gray-600">You have admin privileges.</span>
                    </div>
                    <a href="/admin" className="px-3 py-2 bg-purple-600 text-white rounded">Open Admin Panel</a>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input value={adminCode} onChange={(e) => setAdminCode(e.target.value)} placeholder="Enter admin access code" className="px-3 py-2 border rounded flex-1" />
                    <button onClick={submitAdminCode} className="px-3 py-2 bg-purple-600 text-white rounded">Grant Access</button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div> {/* end .flex-1 content area */}
      </div> {/* end main content container */}

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
          <div className="flex">
            {[
              { id: 'dashboard', label: 'Home', icon: Users },
              { id: 'exams', label: 'Exams', icon: Book },
              { id: 'certificates', label: 'Certs', icon: Award },
              { id: 'payments', label: 'Money', icon: CreditCard }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 flex flex-col items-center py-3 ${
                  activeTab === item.id ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                <item.icon size={20} />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overlays */}
      {showProfileUpload && <ProfileUpload />}
      {showPostSkill && <PostSkillModal />}
      {showVideoCall && <VideoCallInterface />}
      {showChat && <ChatInterface />}
      {incomingCall && <IncomingCallNotification />}
      {showPremium && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Go Premium</h3>
              <button onClick={() => setShowPremium(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">×</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Unlock posting teaching skills, certificates, priority support, and higher session limits.</p>
            <ul className="text-sm text-gray-700 space-y-1 mb-4 list-disc pl-5">
              <li>Post teaching skills in your badged subjects</li>
              <li>Generate and manage certificates</li>
              <li>Higher daily call limits</li>
              <li>Premium badge on your profile</li>
            </ul>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setShowPremium(false)} className="px-3 py-2 rounded border">Not now</button>
              <button onClick={() => { void upgradePlan('premium'); setShowPremium(false); }} className="px-3 py-2 rounded bg-blue-600 text-white">Upgrade to Premium</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}