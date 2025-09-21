'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/supabaseAuthProvider';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import Link from 'next/link';

interface UserData {
  id: string;
  credits: number;
  skillsLearned: number;
  skillsTaught: number;
  totalSessions: number;
  displayName: string;
  email: string;
}

interface Skill {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  price: number;
  userName: string;
  // Added optional userId to prevent runtime issues when filtering
  userId?: string;
  createdAt: any;
}

interface Session {
  id: string;
  skillTitle: string;
  teacherName: string;
  learnerName: string;
  status: string;
  scheduledFor: any;
  createdAt: any;
}

export default function Dashboard() {
  const { user: authUser, signOut, loading } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [mySkills, setMySkills] = useState<Skill[]>([]);
  const [mySessions, setMySessions] = useState<Session[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (authUser) {
      fetchDashboardData();
    } else {
      // Not signed in
      setLoading(false);
    }
  }, [authUser]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Fetch user data
      const userResponse = await fetch('/api/users');
      if (!userResponse.ok) {
        throw new Error('Failed to load user');
      }
      const userResult = await userResponse.json();
      setUserData(userResult?.user ?? null);

      // Fetch user's skills (both teaching and learning)
      const skillsResponse = await fetch('/api/skills');
      const skillsResult = skillsResponse.ok ? await skillsResponse.json() : { skills: [] };
      const skillsArray: Skill[] = Array.isArray(skillsResult?.skills) ? skillsResult.skills : [];
      const userSkills = skillsArray.filter((skill: Skill) => skill?.userId === authUser?.uid);
      setMySkills(userSkills);

      // Fetch user's sessions
      const sessionsResponse = await fetch('/api/sessions');
      const sessionsResult = sessionsResponse.ok ? await sessionsResponse.json() : { sessions: [] };
      const sessionsArray: Session[] = Array.isArray(sessionsResult?.sessions) ? sessionsResult.sessions : [];
      setMySessions(sessionsArray);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setErrorMsg('Something went wrong while loading your dashboard. Please try again.');
    } finally {
      setDataLoading(false);
    }
  };

  if (!authUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <Icon icon="material-symbols:lock" width={36} className="mx-auto mb-3 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Please sign in</h1>
          <p className="text-gray-600 mb-4">You need to be signed in to view your dashboard.</p>
          <Link href="/" className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm">Go to home</Link>
        </div>
      </div>
    );
  }

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
              <div className="flex items-center gap-2 bg-yellow-100 px-3 py-1 rounded-full">
                <Icon icon="material-symbols:stars" width={16} className="text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">{userData?.credits || 0} Credits</span>
              </div>
              
              <Link 
                href="/skills"
                className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                Browse Skills
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
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error state */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Welcome back, {userData?.displayName || 'User'}! 👋
          </h1>
          <p className="text-gray-600">
            Manage your skills, sessions, and track your learning progress.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Icon icon="material-symbols:stars" width={24} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{userData?.credits || 0}</p>
                <p className="text-sm text-gray-600">Credits</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Icon icon="material-symbols:school" width={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{userData?.skillsLearned || 0}</p>
                <p className="text-sm text-gray-600">Skills Learned</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon icon="carbon:skill-level" width={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{userData?.skillsTaught || 0}</p>
                <p className="text-sm text-gray-600">Skills Taught</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <Icon icon="material-symbols:video-call" width={24} className="text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{userData?.totalSessions || 0}</p>
                <p className="text-sm text-gray-600">Total Sessions</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <Link
            href="/skills/create"
            className="bg-gradient-to-r from-blue-500 to-teal-500 text-white p-6 rounded-xl hover:from-blue-600 hover:to-teal-600 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Icon icon="material-symbols:add" width={24} />
              <div>
                <p className="font-medium">Post a Skill</p>
                <p className="text-sm text-white/80">Teach something new</p>
              </div>
            </div>
          </Link>

          <Link
            href="/skills"
            className="bg-white border-2 border-gray-200 hover:border-blue-300 p-6 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <Icon icon="material-symbols:search" width={24} className="text-gray-600 group-hover:text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Browse Skills</p>
                <p className="text-sm text-gray-600">Find something to learn</p>
              </div>
            </div>
          </Link>

          <Link
            href="/sessions"
            className="bg-white border-2 border-gray-200 hover:border-blue-300 p-6 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <Icon icon="material-symbols:video-call" width={24} className="text-gray-600 group-hover:text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">My Sessions</p>
                <p className="text-sm text-gray-600">Upcoming & past sessions</p>
              </div>
            </div>
          </Link>

          <Link
            href="/certificates"
            className="bg-white border-2 border-gray-200 hover:border-blue-300 p-6 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <Icon icon="material-symbols:verified" width={24} className="text-gray-600 group-hover:text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Certificates</p>
                <p className="text-sm text-gray-600">View achievements</p>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Skills */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">My Skills</h3>
              <Link 
                href="/skills/create"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Add New
              </Link>
            </div>
            
            {mySkills.length > 0 ? (
              <div className="space-y-3">
                {mySkills.slice(0, 3).map((skill) => (
                  <div key={skill.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${
                      skill.type === 'teaching' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{skill.title}</p>
                      <p className="text-sm text-gray-600 capitalize">{skill.type}</p>
                    </div>
                    <span className="text-sm text-gray-500">{skill.price} credits</span>
                  </div>
                ))}
                {mySkills.length > 3 && (
                  <p className="text-sm text-gray-600 text-center">
                    +{mySkills.length - 3} more skills
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Icon icon="carbon:skill-level" width={32} className="mx-auto mb-2 opacity-50" />
                <p className="mb-2">No skills posted yet</p>
                <Link 
                  href="/skills/create"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Post your first skill
                </Link>
              </div>
            )}
          </motion.div>

          {/* Recent Sessions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Sessions</h3>
              <Link 
                href="/sessions"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All
              </Link>
            </div>
            
            {mySessions.length > 0 ? (
              <div className="space-y-3">
                {mySessions.slice(0, 3).map((session) => (
                  <div key={session.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${
                      session.status === 'completed' ? 'bg-green-500' :
                      session.status === 'pending' ? 'bg-yellow-500' :
                      session.status === 'accepted' ? 'bg-blue-500' : 'bg-gray-400'
                    }`}></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{session.skillTitle}</p>
                      <p className="text-sm text-gray-600">
                        {session.teacherName} • {session.status}
                      </p>
                    </div>
                  </div>
                ))}
                {mySessions.length > 3 && (
                  <p className="text-sm text-gray-600 text-center">
                    +{mySessions.length - 3} more sessions
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Icon icon="material-symbols:video-call" width={32} className="mx-auto mb-2 opacity-50" />
                <p className="mb-2">No sessions yet</p>
                <Link 
                  href="/skills"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Browse skills to learn
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}