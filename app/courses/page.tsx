'use client';

import React, { useEffect, useState } from 'react';

interface Course {
  id: string;
  teacher_id: string;
  subject: string;
  title: string;
  description: string | null;
  price_credits: number;
  status: 'draft' | 'published';
  created_at: string;
}

export default function CoursesListPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('status', 'published');
      if (subject) params.set('subject', subject);
      if (search) params.set('search', search);
      const resp = await fetch(`/api/courses?${params.toString()}`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed to fetch courses');
      setCourses(Array.isArray(json.courses) ? json.courses : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Courses</h1>
          <a href="/dashboard" className="px-3 py-2 bg-blue-600 text-white rounded">Dashboard</a>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="px-3 py-2 border rounded">
            <option value="">All Subjects</option>
            <option value="programming">Programming</option>
            <option value="design">Design</option>
            <option value="marketing">Marketing</option>
            <option value="business">Business</option>
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles/descriptions" className="px-3 py-2 border rounded" />
          <div className="flex gap-2">
            <button onClick={() => void load()} className="px-3 py-2 bg-gray-100 rounded">Apply</button>
            <button onClick={() => { setSubject(''); setSearch(''); void load(); }} className="px-3 py-2 bg-white border rounded">Reset</button>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : error ? (
          <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <a key={c.id} href={`/courses/${c.id}`} className="block bg-white rounded-lg p-4 shadow-sm hover:shadow transition">
                <p className="text-xs text-gray-500 capitalize">{c.subject}</p>
                <h3 className="text-lg font-semibold mt-1">{c.title}</h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-3">{c.description || 'No description'}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-gray-700">Price</span>
                  <span className="text-sm font-medium">{c.price_credits} credits</span>
                </div>
              </a>
            ))}
            {courses.length === 0 && (
              <div className="text-gray-600">No courses found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
