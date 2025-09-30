'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch(`/api/courses?id=${encodeURIComponent(id)}`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed to fetch');
      setCourse(json.course);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) void load(); }, [id]);

  const enroll = async () => {
    try {
      setEnrolling(true);
      const resp = await fetch('/api/enrollments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId: id }) });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed to enroll');
      alert('Enrolled!');
      router.push('/dashboard');
    } catch (e: any) {
      alert(e?.message || 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-700">{error}</div>;
  if (!course) return <div className="min-h-screen flex items-center justify-center">Not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          <a href="/courses" className="px-3 py-2 bg-gray-100 rounded">Back</a>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <p className="text-sm text-gray-500 capitalize">Subject: {course.subject}</p>
          <p className="text-sm text-gray-500">Teacher: {course.teacher_id}</p>
          <p className="mt-3 text-gray-700 whitespace-pre-wrap">{course.description || 'No description'}</p>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Price</p>
              <p className="text-lg font-semibold">{course.price_credits} credits</p>
            </div>
            <button onClick={enroll} disabled={enrolling || course.status !== 'published'} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{enrolling ? 'Enrolling...' : 'Enroll'}</button>
          </div>
        </div>
        <div className="mt-6 bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Syllabus</h3>
          <p className="text-sm text-gray-600">Modules will appear here after the teacher adds them.</p>
        </div>
      </div>
    </div>
  );
}
