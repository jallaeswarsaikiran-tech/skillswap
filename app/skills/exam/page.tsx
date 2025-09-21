'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';

function ExamContent() {
  const params = useSearchParams();
  const skillId = params.get('skillId') || '';
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const questions = [
    { id: 'q1', q: 'What matters most while teaching?', a: ['Clarity', 'Volume', 'Speed'], correct: 'Clarity' },
    { id: 'q2', q: 'Best way to learn a skill?', a: ['Practice', 'Memorize', 'Ignore'], correct: 'Practice' },
    { id: 'q3', q: 'Good session length for focus?', a: ['45-60 mins', '3 hours', '5 mins'], correct: '45-60 mins' },
  ];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const score = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct ? 1 : 0), 0);
    const passed = score >= 2;
    setSubmitting(true);
    try {
      if (passed && skillId) {
        await fetch('/api/skills/teacher-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skillId, bypassValidation: true }),
        });
        setResult(`Passed (${score}/3). Teacher access granted.`);
      } else {
        setResult(`Not passed (${score}/3). You can retry or upload a certificate.`);
      }
    } catch {
      setResult('Could not update access.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/skills" className="flex items-center gap-2">
            <Icon icon="material-symbols:arrow-back" width={24} className="text-gray-600" />
            <span className="text-gray-700">Back to Skills</span>
          </Link>
          {skillId && <span className="text-sm text-gray-500">Skill ID: {skillId}</span>}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quick Qualification Quiz</h1>
        <p className="text-gray-600 mb-6">Pass to automatically get teacher access for this course.</p>

        <form onSubmit={onSubmit} className="bg-white rounded-xl p-6 border border-gray-100 space-y-6">
          {questions.map((q) => (
            <div key={q.id}>
              <p className="font-medium text-gray-900 mb-2">{q.q}</p>
              <div className="flex flex-wrap gap-3">
                {q.a.map((opt) => (
                  <label key={opt} className={`px-3 py-2 rounded-lg border cursor-pointer ${answers[q.id] === opt ? 'bg-blue-50 border-blue-400' : 'border-gray-300'}`}>
                    <input type="radio" name={q.id} value={opt} className="sr-only" onChange={() => setAnswers((p) => ({ ...p, [q.id]: opt }))} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button type="submit" disabled={submitting} className={`px-5 py-2 rounded-lg text-white ${submitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{submitting ? 'Submitting...' : 'Submit'}</button>
        </form>

        {result && (
          <div className="mt-4 p-4 rounded-lg border bg-white">{result} {result.includes('certificate') && (<Link href="/certificates/upload" className="text-blue-600 underline ml-2">Upload certificate</Link>)}</div>
        )}
      </main>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ExamContent />
    </Suspense>
  );
}
