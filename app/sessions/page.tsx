'use client';

import { useState, useEffect } from 'react';
import { useAuth } from 'cosmic-authentication';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { format } from 'date-fns';

interface Session {
  id: string;
  skillId: string;
  skillTitle: string;
  teacherId: string;
  learnerId: string;
  teacherName: string;
  learnerName: string;
  learnerMessage: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  scheduledFor: any;
  price: number;
  duration: number;
  participants: string[];
  createdAt: any;
  acceptedAt?: any;
  completedAt?: any;
  lastMessage?: string;
  lastMessageAt?: any;
  // optional recordings array from server
  recordings?: { fileId: string; fileUrl: string; fileName?: string; recordedBy?: string; recordedAt?: any }[];
}

export default function Sessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'active' | 'completed'>('all');

  // Schedule modal state
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleSession, setScheduleSession] = useState<Session | null>(null);
  const [scheduleWhen, setScheduleWhen] = useState('');
  const [scheduleDuration, setScheduleDuration] = useState<number>(60);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sessions');
      const result = await response.json();
      setSessions(result.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionAction = async (sessionId: string, action: string, completionData?: any) => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          action,
          completionData
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchSessions(); // Refresh the sessions
      } else {
        console.error(result.error || 'Failed to update session');
      }
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };

  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingSession, setRatingSession] = useState<Session | null>(null);
  const [stars, setStars] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  const [savingRating, setSavingRating] = useState(false);

  const openRating = (s: Session) => {
    setRatingSession(s);
    setStars(5);
    setReviewText('');
    setRatingOpen(true);
  };

  const submitRating = async () => {
    if (!ratingSession) return;
    try {
      setSavingRating(true);
      const resp = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: ratingSession.id, skillId: ratingSession.skillId, rating: stars, review: reviewText }),
      });
      const json = await resp.json();
      if (resp.ok && json.success) {
        setRatingOpen(false);
        setRatingSession(null);
        fetchSessions();
      } else {
        console.error(json?.error || 'Could not submit rating');
      }
    } catch {
      console.error('Could not submit rating');
    } finally {
      setSavingRating(false);
    }
  };

  const openSchedule = (s: Session) => {
    setScheduleSession(s);
    const dt = s.scheduledFor ? new Date(s.scheduledFor) : null;
    // format for datetime-local: yyyy-MM-ddTHH:mm
    const toLocal = (d: Date) => {
      const pad = (n: number) => `${n}`.padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setScheduleWhen(dt ? toLocal(dt) : '');
    setScheduleDuration(s.duration || 60);
    setScheduleOpen(true);
  };

  const saveSchedule = async () => {
    if (!scheduleSession) return;
    try {
      setSavingSchedule(true);
      const resp = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: scheduleSession.id,
          action: 'schedule',
          scheduledFor: scheduleWhen || null,
          duration: scheduleDuration || scheduleSession.duration || 60,
        }),
      });
      const json = await resp.json();
      if (resp.ok && json.success) {
        setScheduleOpen(false);
        setScheduleSession(null);
        fetchSessions();
      } else {
        console.error(json?.error || 'Could not schedule');
      }
    } catch {
      console.error('Could not schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  const filteredSessions = sessions.filter(session => {
    switch (selectedTab) {
      case 'pending':
        return session.status === 'pending';
      case 'active':
        return session.status === 'accepted';
      case 'completed':
        return session.status === 'completed';
      default:
        return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const startVideoCall = (sessionId: string, participantName: string) => {
    const meetingUrl = `/call?sessionId=${sessionId}`;
    window.open(meetingUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sessions...</p>
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
              <Link 
                href="/dashboard"
                className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                href="/skills"
                className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                Browse Skills
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">My Sessions</h1>
          <p className="text-gray-600">
            Manage your learning sessions, video calls, and track your progress.
          </p>
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
              { key: 'all', label: 'All Sessions', count: sessions.length },
              { key: 'pending', label: 'Pending', count: sessions.filter(s => s.status === 'pending').length },
              { key: 'active', label: 'Active', count: sessions.filter(s => s.status === 'accepted').length },
              { key: 'completed', label: 'Completed', count: sessions.filter(s => s.status === 'completed').length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key as any)}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  selectedTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </motion.div>

        {/* Sessions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {filteredSessions.length > 0 ? (
            <div className="space-y-4">
              {filteredSessions.map((session, index) => {
                const isTeacher = session.teacherId === user?.uid;
                const partnerName = isTeacher ? session.learnerName : session.teacherName;
                
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.5 }}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{session.skillTitle}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Icon icon={isTeacher ? "material-symbols:school" : "material-symbols:lightbulb"} width={16} />
                            <span>{isTeacher ? 'Teaching' : 'Learning'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Icon icon="material-symbols:person" width={16} />
                            <span>{partnerName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Icon icon="material-symbols:schedule" width={16} />
                            <span>{session.duration} min</span>
                          </div>
                          {session.scheduledFor && (
                            <div className="flex items-center gap-1">
                              <Icon icon="material-symbols:calendar-today" width={16} />
                              <span>Scheduled: {format(new Date(session.scheduledFor), 'PPpp')}</span>
                            </div>
                          )}
                        </div>

                        {session.learnerMessage && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-sm text-gray-700 italic">"{session.learnerMessage}"</p>
                          </div>
                        )}

                        {Array.isArray(session.recordings) && session.recordings.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-gray-900 mb-2">Recorded Sessions</p>
                            <div className="flex flex-wrap gap-2">
                              {session.recordings.map((r, idx) => (
                                <a key={idx} className="text-sm text-blue-600 underline" href={r.fileUrl} target="_blank" rel="noreferrer">
                                  {r.fileName || `Recording ${idx + 1}`}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
                      {/* Video Call Button */}
                      {session.status === 'accepted' && (
                        <button
                          onClick={() => startVideoCall(session.id, partnerName)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Icon icon="mdi:video" width={16} />
                          Start Video Call
                        </button>
                      )}

                      {/* Chat Button */}
                      {(session.status === 'accepted' || session.status === 'completed') && (
                        <Link
                          href={`/chat?sessionId=${session.id}`}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Icon icon="material-symbols:chat" width={16} />
                          Chat
                        </Link>
                      )}

                      {/* Teacher Actions */}
                      {isTeacher && session.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleSessionAction(session.id, 'accept')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Icon icon="material-symbols:check" width={16} />
                            Accept
                          </button>
                          <button
                            onClick={() => handleSessionAction(session.id, 'decline')}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <Icon icon="material-symbols:close" width={16} />
                            Decline
                          </button>
                        </>
                      )}

                      {/* Complete Session */}
                      {isTeacher && session.status === 'accepted' && (
                        <button
                          onClick={() => {
                            const completionNotes = prompt('Add completion notes (optional):') || '';
                            const certificateEligible = confirm('Is the student eligible for a certificate?');
                            handleSessionAction(session.id, 'complete', {
                              completionNotes,
                              certificateEligible,
                              grade: certificateEligible ? 'Pass' : 'Incomplete'
                            });
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                          <Icon icon="material-symbols:check-circle" width={16} />
                          Mark Complete
                        </button>
                      )}

                      {/* Schedule/Reschedule Button */}
                      {(session.status === 'accepted' || session.status === 'pending') && (
                        <button
                          onClick={() => openSchedule(session)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <Icon icon="material-symbols:calendar-month" width={16} />
                          {session.scheduledFor ? 'Reschedule' : 'Schedule'}
                        </button>
                      )}

                      {/* View Certificate */}
                      {session.status === 'completed' && !isTeacher && (
                        <>
                          <Link
                            href={`/certificates?sessionId=${session.id}`}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                          >
                            <Icon icon="material-symbols:verified" width={16} />
                            View Certificate
                          </Link>
                          <button
                            onClick={() => openRating(session)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Icon icon="material-symbols:star" width={16} />
                            Rate Class
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Icon icon="material-symbols:video-call-off" width={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedTab === 'all' ? 'No sessions yet' : `No ${selectedTab} sessions`}
              </h3>
              <p className="text-gray-600 mb-4">
                {selectedTab === 'all' 
                  ? "Start by browsing skills or posting your own!" 
                  : `You don't have any ${selectedTab} sessions at the moment.`
                }
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link
                  href="/skills"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Icon icon="material-symbols:search" width={20} />
                  Browse Skills
                </Link>
                <Link
                  href="/skills/create"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Icon icon="material-symbols:add" width={20} />
                  Post a Skill
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Schedule Modal */}
      {scheduleOpen && scheduleSession && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">{scheduleSession.scheduledFor ? 'Reschedule Session' : 'Schedule Session'}</h3>
              <button onClick={() => setScheduleOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <Icon icon="material-symbols:close" width={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date & time</label>
                <input
                  type="datetime-local"
                  value={scheduleWhen}
                  onChange={(e) => setScheduleWhen(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                <input
                  type="number"
                  min={15}
                  max={240}
                  step={5}
                  value={scheduleDuration}
                  onChange={(e) => setScheduleDuration(parseInt(e.target.value) || 60)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setScheduleOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={saveSchedule}
                  disabled={savingSchedule}
                  className={`px-5 py-2 rounded-lg text-white ${savingSchedule ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {savingSchedule ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingOpen && ratingSession && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">Rate Class</h3>
              <button onClick={() => setRatingOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <Icon icon="material-symbols:close" width={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setStars(n)}
                    className={`p-2 rounded ${n <= stars ? 'text-yellow-500' : 'text-gray-300'}`}
                    aria-label={`${n} star${n>1?'s':''}`}
                  >
                    <Icon icon="material-symbols:star" width={24} />
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review (optional)</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                  placeholder="Share feedback for the teacher..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setRatingOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                <button
                  onClick={submitRating}
                  disabled={savingRating}
                  className={`px-5 py-2 rounded-lg text-white ${savingRating ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {savingRating ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}