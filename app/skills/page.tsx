'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from 'cosmic-authentication';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Skill {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  price: number;
  duration: number;
  userId: string;
  userName: string;
  userEmail: string;
  status: string;
  createdAt: any;
  // FIRST_EDIT_START: optional fields
  examLink?: string;
  teacherCertificateFileUrl?: string;
  // FIRST_EDIT_END
}

const categories = [
  'all',
  'programming',
  'design',
  'marketing',
  'business',
  'language',
  'music',
  'fitness',
  'cooking',
  'crafts',
  'other'
];

function SkillsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMatches, setShowMatches] = useState(false);

  // Request modal state
  const [requestSkill, setRequestSkill] = useState<Skill | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestWhen, setRequestWhen] = useState(''); // datetime-local string
  const [requestDuration, setRequestDuration] = useState<number>(60);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSkills();
  }, []);

  useEffect(() => {
    filterSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills, selectedCategory, selectedType, searchQuery, showMatches, user]);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/skills');
      const result = await response.json();
      setSkills(result.skills || []);
    } catch (error) {
      console.error('Error fetching skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSkills = () => {
    let filtered = [...skills];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(skill => skill.category === selectedCategory);
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(skill => skill.type === selectedType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(skill => 
        skill.title.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.userName.toLowerCase().includes(query)
      );
    }

    // Hide user's own skills in browse mode
    if (user) {
      filtered = filtered.filter(skill => skill.userId !== user.uid);

      if (showMatches) {
        // Simple matching: if user has posted learning requests, show teaching skills in same categories; and vice versa
        const mySkills = skills.filter(s => s.userId === user.uid);
        const myLearningCats = new Set(mySkills.filter(s => s.type === 'learning').map(s => s.category));
        const myTeachingCats = new Set(mySkills.filter(s => s.type === 'teaching').map(s => s.category));

        filtered = filtered.filter(s => {
          if (s.type === 'teaching' && myLearningCats.size > 0) {
            return myLearningCats.has(s.category);
          }
          if (s.type === 'learning' && myTeachingCats.size > 0) {
            return myTeachingCats.has(s.category);
          }
          return true;
        });
      }
    }

    setFilteredSkills(filtered);
  };

  const openRequestModal = (skill: Skill) => {
    setRequestSkill(skill);
    setRequestMessage('');
    setRequestWhen('');
    setRequestDuration(skill.duration || 60);
  };

  const submitRequest = async () => {
    if (!user || !requestSkill) return;
    try {
      setSubmitting(true);
      const payload = {
        skillId: requestSkill.id,
        teacherId: requestSkill.userId,
        learnerMessage: requestMessage,
        scheduledFor: requestWhen || null,
        duration: requestDuration || requestSkill.duration || 60,
      };
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setRequestSkill(null);
      } else {
        console.error(result?.error || 'Failed to send request');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading skills...</p>
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
                href="/skills/create"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Post Skill
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Browse Skills</h1>
          <p className="text-gray-600">
            Discover amazing skills you can learn from talented people in our community.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8"
        >
          <div className="space-y-4">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Skills
              </label>
              <div className="relative">
                <Icon 
                  icon="material-symbols:search" 
                  width={20} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                />
                <input
                  id="search"
                  type="text"
                  placeholder="Search by title, description, or teacher name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  id="type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="teaching">Teaching</option>
                  <option value="learning">Learning Requests</option>
                </select>
              </div>

              {/* Match Toggle */}
              {user && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Matches</label>
                  <button
                    onClick={() => setShowMatches((v) => !v)}
                    className={`w-full px-4 py-3 rounded-lg border transition ${showMatches ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    {showMatches ? 'Showing Matches for You' : 'Show Matches for Me'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              {filteredSkills.length} skill{filteredSkills.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {filteredSkills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSkills.map((skill, index) => (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.5 }}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`${
                      skill.type === 'teaching' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    } px-3 py-1 rounded-full text-xs font-medium`}>
                      {skill.type === 'teaching' ? '👨\u200d🏫 Teaching' : '🙋\u200d♀️ Learning Request'}
                    </div>
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 mb-2">{skill.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{skill.description}</p>

                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Icon icon="material-symbols:schedule" width={16} />
                      <span>{skill.duration}min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon icon="material-symbols:category" width={16} />
                      <span className="capitalize">{skill.category}</span>
                    </div>
                    {/* FIRST_EDIT_START: certificate badge */}
                    {skill.teacherCertificateFileUrl ? (
                      <div className="flex items-center gap-1 text-green-700">
                        <Icon icon="material-symbols:verified" width={16} />
                        <a href={skill.teacherCertificateFileUrl} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                          Certificate
                        </a>
                      </div>
                    ) : null}
                    {/* FIRST_EDIT_END */}
                  </div>

                  {/* FIRST_EDIT_START: exam link button */}
                  {skill.examLink ? (
                    <div className="mb-3">
                      <a
                        href={skill.examLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500 text-white hover:bg-amber-600 text-xs"
                      >
                        <Icon icon="mdi:clipboard-text" width={16} />
                        Attempt Exam
                      </a>
                    </div>
                  ) : null}
                  {/* FIRST_EDIT_END */}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {skill.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{skill.userName}</span>
                    </div>

                    <button
                      onClick={() => openRequestModal(skill)}
                      className={`${
                        skill.type === 'teaching'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-green-600 hover:bg-green-700'
                      } px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors`}
                    >
                      {skill.type === 'teaching' ? 'Get Skill' : 'Offer to Teach'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Icon icon="material-symbols:search-off" width={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No skills found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your filters or search terms.
              </p>
              <Link
                href="/skills/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Icon icon="material-symbols:add" width={20} />
                Post a Skill
              </Link>
            </div>
          )}
        </motion.div>
      </main>

      {/* Request Modal */}
      {requestSkill && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">{requestSkill.type === 'teaching' ? 'Request Session' : 'Offer to Teach'}</h3>
              <button onClick={() => setRequestSkill(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <Icon icon="material-symbols:close" width={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
                <input
                  type="text"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder={`Say hello to ${requestSkill.userName}...`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred date & time</label>
                  <input
                    type="datetime-local"
                    value={requestWhen}
                    onChange={(e) => setRequestWhen(e.target.value)}
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
                    value={requestDuration}
                    onChange={(e) => setRequestDuration(parseInt(e.target.value) || 60)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setRequestSkill(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={submitRequest}
                  disabled={submitting}
                  className={`px-5 py-2 rounded-lg text-white ${submitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {submitting ? 'Sending...' : 'Send Request (Free)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Skills() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SkillsContent />
    </Suspense>
  );
}