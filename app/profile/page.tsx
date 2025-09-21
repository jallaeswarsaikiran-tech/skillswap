'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/supabaseAuthProvider';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import Link from 'next/link';

interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  credits: number;
  skillsLearned: number;
  skillsTaught: number;
  totalSessions: number;
  certificates: string[];
  createdAt: any;
  photoURL?: string;
}

interface Skill {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  price: number;
  createdAt: any;
  // FIRST_EDIT_START: add optional fields for editing
  examLink?: string;
  teacherCertificateFileUrl?: string;
  // FIRST_EDIT_END
}

interface Certificate {
  id: string;
  skillTitle: string;
  teacherName: string;
  grade: string;
  issuedAt: any;
  certificateNumber: string;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mySkills, setMySkills] = useState<Skill[]>([]);
  const [myCertificates, setMyCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'certificates'>('overview');
  // FIRST_EDIT_START: avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);
  // FIRST_EDIT_END
  // FIRST_EDIT_START: edit skill modal state
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editExamLink, setEditExamLink] = useState<string>('');
  const [editCertFile, setEditCertFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  // FIRST_EDIT_END

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Fetch user profile
      const userResponse = await fetch('/api/users');
      const userResult = await userResponse.json();
      setProfile(userResult.user);

      // Fetch user's skills
      const skillsResponse = await fetch('/api/skills');
      const skillsResult = await skillsResponse.json();
      const userSkills = skillsResult.skills.filter((skill: Skill) => 
        skill.userId === user?.uid
      );
      setMySkills(userSkills);

      // Fetch user's certificates
      const certificatesResponse = await fetch('/api/certificates');
      const certificatesResult = await certificatesResponse.json();
      setMyCertificates(certificatesResult.certificates || []);

    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  // FIRST_EDIT_START: handle avatar upload
  const onChangeAvatar = async (file: File | null) => {
    if (!file) return;
    try {
      setAvatarUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/files/upload', { method: 'POST', body: fd });
      const upJson = await up.json();
      if (!up.ok) throw new Error(upJson?.error || 'Upload failed');
      const photoURL = upJson.fileUrl as string;
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoURL }),
      });
      // refresh
      await fetchProfileData();
    } catch (e) {
      // ignore
    } finally {
      setAvatarUploading(false);
    }
  };
  // FIRST_EDIT_END

  // FIRST_EDIT_START: handle edit skill save
  const saveSkillEdits = async () => {
    if (!editingSkill) return;
    try {
      setSavingEdit(true);
      let teacherCertificateFileId: string | undefined;
      let teacherCertificateFileUrl: string | undefined;
      if (editCertFile) {
        const fd = new FormData();
        fd.append('file', editCertFile);
        const up = await fetch('/api/files/upload', { method: 'POST', body: fd });
        const upJson = await up.json();
        if (!up.ok) throw new Error(upJson?.error || 'Upload failed');
        teacherCertificateFileId = upJson.fileId as string | undefined;
        teacherCertificateFileUrl = upJson.fileUrl as string | undefined;
      }

      await fetch('/api/skills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId: editingSkill.id,
          examLink: editExamLink,
          teacherCertificateFileId,
          teacherCertificateFileUrl,
        }),
      });

      setEditingSkill(null);
      setEditExamLink('');
      setEditCertFile(null);
      await fetchProfileData();
    } catch (e) {
      // ignore
    } finally {
      setSavingEdit(false);
    }
  };
  // FIRST_EDIT_END

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const memberSince = profile?.createdAt 
    ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      })
    : 'Recently';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Icon icon="carbon:skill-level" width={32} className="text-blue-600" />
              <span className="text-xl font-semibold text-gray-900">SkillSwap</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                Dashboard
              </Link>
              
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Icon icon="material-symbols:logout" width={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 mb-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              {profile?.photoURL ? (
                <img src={profile.photoURL as string} alt="Profile photo" className="w-24 h-24 rounded-full object-cover border border-gray-200" />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <label className="absolute -bottom-2 -right-2 bg-white border border-gray-200 rounded-full p-2 shadow cursor-pointer">
                <input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => onChangeAvatar(e.target.files?.[0] || null)} />
                <Icon icon="mdi:camera" width={16} className="text-gray-700" />
              </label>
              {avatarUploading && <div className="text-xs text-gray-500 mt-1">Uploading...</div>}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {profile?.displayName || 'User'}
              </h1>
              <p className="text-gray-600 mb-4">{profile?.email}</p>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Icon icon="material-symbols:calendar-today" width={16} />
                  <span>Member since {memberSince}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Icon icon="material-symbols:stars" width={16} />
                  <span>{profile?.credits || 0} Credits</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-900">{profile?.skillsLearned || 0}</p>
                <p className="text-xs text-gray-600">Skills Learned</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-900">{profile?.skillsTaught || 0}</p>
                <p className="text-xs text-gray-600">Skills Taught</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-900">{myCertificates.length}</p>
                <p className="text-xs text-gray-600">Certificates</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-white rounded-xl p-2 shadow-sm border border-gray-100 mb-8"
        >
          <div className="flex space-x-1">
            {[
              { key: 'overview', label: 'Overview', icon: 'material-symbols:dashboard' },
              { key: 'skills', label: 'My Skills', icon: 'carbon:skill-level' },
              { key: 'certificates', label: 'Certificates', icon: 'material-symbols:verified' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon icon={tab.icon} width={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Learning Progress */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Progress</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Skills Completed</span>
                    <span className="font-semibold text-gray-900">{profile?.skillsLearned || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Certificates Earned</span>
                    <span className="font-semibold text-gray-900">{myCertificates.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Sessions</span>
                    <span className="font-semibold text-gray-900">{profile?.totalSessions || 0}</span>
                  </div>
                </div>
              </div>

              {/* Teaching Impact */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Teaching Impact</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Skills Shared</span>
                    <span className="font-semibold text-gray-900">{mySkills.filter(s => s.type === 'teaching').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Students Taught</span>
                    <span className="font-semibold text-gray-900">{profile?.skillsTaught || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Credits Earned</span>
                    <span className="font-semibold text-gray-900">{profile?.skillsTaught || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">My Posted Skills</h3>
                <Link
                  href="/skills/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Icon icon="material-symbols:add" width={16} />
                  Post New Skill
                </Link>
              </div>

              {mySkills.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mySkills.map((skill) => (
                    <div key={skill.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                      <div className={`${
                        skill.type === 'teaching' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      } inline-block px-3 py-1 rounded-full text-xs font-medium mb-3`}>
                        {skill.type === 'teaching' ? 'Teaching' : 'Learning Request'}
                      </div>
                      
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{skill.title}</h4>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-3">{skill.description}</p>

                      {/* FIRST_EDIT_START: show current exam/certificate info */}
                      <div className="text-xs text-gray-600 space-y-1 mb-4">
                        {skill.examLink ? (
                          <div className="flex items-center gap-1"><Icon icon="mdi:clipboard-text" width={14} /><span className="truncate">Exam: {skill.examLink}</span></div>
                        ) : (
                          <div className="text-gray-400">No exam link</div>
                        )}
                        {skill.teacherCertificateFileUrl ? (
                          <div className="flex items-center gap-1"><Icon icon="material-symbols:verified" width={14} /><a href={skill.teacherCertificateFileUrl} target="_blank" rel="noopener noreferrer" className="underline">View certificate</a></div>
                        ) : (
                          <div className="text-gray-400">No certificate uploaded</div>
                        )}
                      </div>
                      {/* FIRST_EDIT_END */}

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className="capitalize">{skill.category}</span>
                        <span>{skill.price} credits</span>
                      </div>
                      
                      {/* FIRST_EDIT_START: edit button */}
                      <div className="mt-4 flex justify-end">
                        <button
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                          onClick={() => { setEditingSkill(skill); setEditExamLink(skill.examLink || ''); setEditCertFile(null); }}
                        >
                          <Icon icon="mdi:pencil" width={16} />
                          Edit
                        </button>
                      </div>
                      {/* FIRST_EDIT_END */}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                  <Icon icon="carbon:skill-level" width={48} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No skills posted yet</h3>
                  <p className="text-gray-600 mb-4">Share your expertise or request to learn something new!</p>
                  <Link
                    href="/skills/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Icon icon="material-symbols:add" width={20} />
                    Post Your First Skill
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'certificates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">My Certificates</h3>
                <Link
                  href="/certificates"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All Details
                </Link>
              </div>

              {myCertificates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myCertificates.map((certificate) => (
                    <div key={certificate.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-4">
                        <Icon icon="material-symbols:verified" width={24} className="text-white" />
                      </div>
                      
                      <h4 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {certificate.skillTitle}
                      </h4>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Icon icon="material-symbols:person" width={16} />
                          <span>{certificate.teacherName}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Icon icon="material-symbols:grade" width={16} />
                          <span>{certificate.grade}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Icon icon="material-symbols:numbers" width={16} />
                          <span className="font-mono">{certificate.certificateNumber}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                  <Icon icon="material-symbols:verified-outline" width={48} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No certificates earned yet</h3>
                  <p className="text-gray-600 mb-4">Complete learning sessions to earn your first certificate!</p>
                  <Link
                    href="/skills"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Icon icon="material-symbols:search" width={20} />
                    Browse Skills to Learn
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* FIRST_EDIT_START: Edit Skill Modal */}
          {editingSkill && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Edit Skill</h3>
                  <button onClick={() => setEditingSkill(null)} className="p-2 rounded-lg hover:bg-gray-100">
                    <Icon icon="material-symbols:close" width={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Exam Link</label>
                    <input
                      type="url"
                      value={editExamLink}
                      onChange={(e) => setEditExamLink(e.target.value)}
                      placeholder="https://exam-platform.com/your-exam"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload/Replace Certificate</label>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setEditCertFile(e.target.files?.[0] || null)} />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to keep current certificate.</p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button onClick={() => setEditingSkill(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button
                      onClick={saveSkillEdits}
                      disabled={savingEdit}
                      className={`px-5 py-2 rounded-lg text-white ${savingEdit ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {savingEdit ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* FIRST_EDIT_END */}
        </motion.div>
      </main>
    </div>
  );
}