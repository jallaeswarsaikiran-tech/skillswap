'use client';

import { useState } from 'react';
import { useAuth } from 'cosmic-authentication';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const categories = [
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

export default function CreateSkill() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    type: 'teaching',
    duration: 60,
    price: 0,
    liveLink: '',
    notes: '',
    demoLink: '',
    // FIRST_EDIT_START: new optional exam link
    examLink: ''
    // FIRST_EDIT_END
  });
  // FIRST_EDIT_START: track optional teacher certificate file
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  // FIRST_EDIT_END

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // FIRST_EDIT_START: if teaching and certificate selected, upload first
      let teacherCertificateFileId: string | undefined;
      let teacherCertificateFileUrl: string | undefined;
      if (formData.type === 'teaching' && certificateFile) {
        const fd = new FormData();
        fd.append('file', certificateFile);
        const up = await fetch('/api/files/upload', { method: 'POST', body: fd });
        const upJson = await up.json();
        if (!up.ok) throw new Error(upJson?.error || 'Upload failed');
        teacherCertificateFileId = upJson.fileId as string | undefined;
        teacherCertificateFileUrl = upJson.fileUrl as string | undefined;
      }
      // FIRST_EDIT_END

      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          // FIRST_EDIT_START: include uploaded certificate refs if any
          teacherCertificateFileId,
          teacherCertificateFileUrl,
          // FIRST_EDIT_END
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push('/dashboard');
      } else {
        // Replace alert with inline fallback
        console.error(result.error || 'Failed to create skill');
      }
    } catch (error) {
      console.error('Error creating skill:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' || name === 'price' ? parseInt(value) || 0 : value
    }));
  };

  const isLearning = formData.type === 'learning';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50" suppressHydrationWarning>
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
      <main className="max-w-3xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Post a New Skill</h1>
            <p className="text-gray-600">
              {isLearning ? 'Tell us what you want to learn.' : 'Share your expertise and help others learn.'}
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
              {/* Skill Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What do you want to do?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.type === 'teaching' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="type"
                      value="teaching"
                      checked={formData.type === 'teaching'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3">
                      <Icon icon="material-symbols:school" width={24} className="text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">Teach a Skill</p>
                        <p className="text-sm text-gray-600">Share your expertise</p>
                      </div>
                    </div>
                  </label>

                  <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.type === 'learning' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="type"
                      value="learning"
                      checked={formData.type === 'learning'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3">
                      <Icon icon="material-symbols:lightbulb" width={24} className="text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">Learn a Skill</p>
                        <p className="text-sm text-gray-600">Request to learn something new</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  autoComplete="off"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={
                    formData.type === 'teaching' 
                      ? 'e.g., Learn React.js fundamentals' 
                      : 'e.g., Want to learn guitar basics'
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder={
                    formData.type === 'teaching'
                      ? "Describe what you'll teach, your experience, and what students will learn..."
                      : "Describe what you want to learn, your current level, and your goals..."
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration (only for teaching; learners define later in scheduling) */}
                {!isLearning && (
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                      Session Duration (minutes) *
                    </label>
                    <input
                      id="duration"
                      name="duration"
                      type="number"
                      min={15}
                      max={240}
                      step={5}
                      required
                      autoComplete="off"
                      value={formData.duration}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter any duration (15-240 minutes).</p>
                  </div>
                )}
              </div>

              {/* Price (credits) - hidden for learning; default 0 */}
              {!isLearning && (
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    Credits (optional)
                  </label>
                  <div className="relative">
                    <input
                      id="price"
                      name="price"
                      type="number"
                      min="0"
                      max="10"
                      autoComplete="off"
                      value={formData.price}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Icon icon="material-symbols:stars" width={20} className="text-yellow-500" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Chatting and accepting requests are free.</p>
                </div>
              )}

              {/* Optional teacher-only fields */}
              {!isLearning && (
                <>
                  <div>
                    <label htmlFor="liveLink" className="block text-sm font-medium text-gray-700 mb-2">
                      Live Class Link (optional)
                    </label>
                    <input
                      id="liveLink"
                      name="liveLink"
                      type="url"
                      placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                      value={formData.liveLink}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                      Notes / Syllabus (optional)
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={4}
                      placeholder="Outline topics, prerequisites, or resources..."
                      value={formData.notes}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="demoLink" className="block text-sm font-medium text-gray-700 mb-2">
                      Demo Class Link (optional)
                    </label>
                    <input
                      id="demoLink"
                      name="demoLink"
                      type="url"
                      placeholder="https://youtu.be/..."
                      value={formData.demoLink}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* FIRST_EDIT_START: Exam link & Teacher certificate upload */}
                  <div>
                    <label htmlFor="examLink" className="block text-sm font-medium text-gray-700 mb-2">
                      Exam Link (optional)
                    </label>
                    <input
                      id="examLink"
                      name="examLink"
                      type="url"
                      placeholder="https://exam-platform.com/your-exam"
                      value={formData.examLink}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Learners will see a button to attempt this exam.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Qualification Certificate (optional)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Shown to learners as proof of qualification.</p>
                  </div>
                  {/* FIRST_EDIT_END */}
                </>
              )}

              {/* Submit Button */}
              <div className="flex items-center gap-4 pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                    loading
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : formData.type === 'teaching'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-b-transparent"></div>
                  ) : (
                    <>
                      <Icon 
                        icon={formData.type === 'teaching' ? "material-symbols:school" : "material-symbols:lightbulb"} 
                        width={20} 
                      />
                      {formData.type === 'teaching' ? 'Post Teaching Skill' : 'Post Learning Request'}
                    </>
                  )}
                </button>
                
                <Link
                  href="/dashboard"
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6"
          >
            <div className="flex items-start gap-3">
              <Icon icon="material-symbols:tips-and-updates" width={24} className="text-blue-600 mt-1" />
              <div>
                <h3 className="font-medium text-blue-900 mb-2">Tips for Success</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Be specific about what you'll teach or want to learn</li>
                  <li>• Include your experience level or prerequisites</li>
                  <li>• Suggest preferred times in your request; you can adjust later on the calendar</li>
                  <li>• Respond promptly to session requests</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}