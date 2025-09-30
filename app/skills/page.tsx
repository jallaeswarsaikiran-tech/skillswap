'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useAuth } from '@/lib/supabaseAuthProvider';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Grid3X3, List, Filter as LucideFilter, Search as LucideSearch, ArrowUpDown } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const [priceMax, setPriceMax] = useState<number>(200);
  const [myDisplayName, setMyDisplayName] = useState<string>('You');

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
      // Use query params server-side for initial filtering where possible
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedType && selectedType !== 'all') params.set('type', selectedType);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const url = `/api/skills${params.toString() ? `?${params.toString()}` : ''}`;
      const [skillsResp, userResp] = await Promise.all([
        fetch(url, { credentials: 'same-origin' }),
        fetch('/api/users', { credentials: 'same-origin' }),
      ]);
      const skillsJson = await skillsResp.json();
      const userJson = userResp.ok ? await userResp.json() : null;
      const displayName = userJson?.user?.display_name || userJson?.user?.displayName || user?.email?.split('@')[0] || 'You';
      setMyDisplayName(displayName);
      const mapped: Skill[] = (skillsJson.skills || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        category: s.category,
        type: s.type,
        price: s.price,
        duration: typeof s.duration_hours === 'number' ? Math.round(s.duration_hours * 60) : (s.duration ?? 60),
        userId: s.user_id || s.userId,
        userName: displayName,
        userEmail: '',
        status: s.status || '',
        createdAt: s.created_at || s.createdAt,
        examLink: s.exam_link || s.examLink,
        teacherCertificateFileUrl: s.teacher_certificate_file_url || s.teacherCertificateFileUrl,
      }));
      setSkills(mapped);
    } catch (error) {
      console.error('Error fetching skills:', error);
    } finally {
      setLoading(false);
    }
  };

  // Count categories from the current user's skills only
  const getCategoryCount = (cat: string) => {
    const own = user ? skills.filter(s => s.userId === user.id) : [];
    if (cat === 'all') return own.length;
    return own.filter(s => s.category === cat).length;
  };

  const filterSkills = () => {
    let filtered = [...skills];

    // Only show the current user's own skills
    if (user) {
      filtered = filtered.filter(skill => skill.userId === user.id);
    } else {
      // Not signed in: show nothing; prompt to sign in will appear in UI
      filtered = [];
    }

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

    // Filter by price (max)
    filtered = filtered.filter(skill => (typeof skill.price === 'number' ? skill.price : 0) <= priceMax);

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'price-low') return (a.price ?? 0) - (b.price ?? 0);
      if (sortBy === 'price-high') return (b.price ?? 0) - (a.price ?? 0);
      // newest by createdAt descending
      const ad = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
      return bd - ad;
    });

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
    <div className="min-h-screen bg-gray-50">
      {/* Gradient Browse Header */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl"></div>
        <div className="absolute inset-0 bg-black/20 rounded-3xl"></div>
        <div className="relative px-6 sm:px-10 py-10 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">My Skills</h1>
            <p className="opacity-90 mb-6">Manage the skills you posted. Search, filter and edit.</p>
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <LucideSearch size={20} className="text-gray-300" />
              </div>
              <input
                type="text"
                placeholder="Search by title, description, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/90 backdrop-blur rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:bg-white transition-all text-base"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-12">
        {/* Category Bar and Controls */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h3 className="text-lg font-semibold">Browse by Category</h3>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode==='grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}>
                  <Grid3X3 size={16} />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode==='list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}>
                  <List size={16} />
                </button>
              </div>
              <button onClick={() => setShowFilters(v=>!v)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <LucideFilter size={16} />
                Filters
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map(category => (
              <button key={category} onClick={() => setSelectedCategory(category)} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${selectedCategory===category ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                <span className="capitalize">{category === 'all' ? 'All Skills' : category}</span>
                <span className="text-xs opacity-75">({getCategoryCount(category)})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select value={selectedType} onChange={(e)=>setSelectedType(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All</option>
                  <option value="teaching">Teaching</option>
                  <option value="learning">Learning</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Price (credits)</label>
                <input type="range" min={0} max={200} value={priceMax} onChange={(e)=>setPriceMax(parseInt(e.target.value))} className="w-full" />
                <div className="flex justify-between text-xs text-gray-500"><span>0</span><span>{priceMax}</span><span>200+</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select value={sortBy} onChange={(e)=>setSortBy(e.target.value as any)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button onClick={()=>{ setSelectedType('all'); setPriceMax(200); setSortBy('newest'); }} className="text-sm text-blue-600 hover:text-blue-700">Clear All Filters</button>
            </div>
          </div>
        )}

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6 gap-3">
            <div>
              <h2 className="text-xl font-semibold">{searchQuery ? 'Search Results' : 'Your Skills'}</h2>
              <p className="text-gray-600">{user ? <>You have {filteredSkills.length} skill{filteredSkills.length !== 1 ? 's' : ''}</> : 'Sign in to view your skills'}</p>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown size={16} className="text-gray-400" />
              <select value={sortBy} onChange={(e)=>setSortBy(e.target.value as any)} className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
              <Link href="/skills/create" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Post a Skill</Link>
            </div>
          </div>

          {filteredSkills.length > 0 ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {filteredSkills.map((skill, index) => (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.5 }}
                  className={`bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition ${viewMode==='list' ? 'p-4 md:p-5' : 'p-6'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`${skill.type==='teaching' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'} px-3 py-1 rounded-full text-xs font-medium`}>
                      {skill.type === 'teaching' ? 'Teaching' : 'Learning'}
                    </div>
                    <span className="text-sm text-gray-500">{skill.createdAt ? new Date(skill.createdAt as any).toLocaleDateString() : ''}</span>
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 mb-2">{skill.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{skill.description}</p>

                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                    {typeof skill.duration === 'number' && (
                      <div className="flex items-center gap-1">
                        <Icon icon="material-symbols:schedule" width={16} />
                        <span>{skill.duration}min</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Icon icon="material-symbols:category" width={16} />
                      <span className="capitalize">{skill.category}</span>
                    </div>
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

                  <div className={`flex ${viewMode==='list' ? 'flex-col gap-3' : 'items-center justify-between'} pt-4 border-t border-gray-100`}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {skill.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{skill.userName}</span>
                    </div>

                    <Link href={`/skills/create?edit=${encodeURIComponent(skill.id)}`} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-800 hover:bg-black transition-colors">
                      Edit
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Icon icon="material-symbols:search-off" width={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{user ? 'You have not posted any skills yet' : 'Please sign in to view your skills'}</h3>
              <p className="text-gray-600 mb-4">
                {user ? 'Click below to post your first skill.' : 'Go to Login to manage your skills.'}
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