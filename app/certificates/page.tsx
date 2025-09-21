'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from 'cosmic-authentication';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';

interface Certificate {
  id: string;
  userId: string;
  userName: string;
  skillTitle: string;
  teacherId: string;
  teacherName: string;
  sessionId: string;
  grade: string;
  completionNotes: string;
  certificateNumber: string;
  issuedAt: any;
  verificationId: string;
}

function CertificatesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCertificates();
    }
  }, [user]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/certificates');
      const result = await response.json();
      setCertificates(result.certificates || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCertificate = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setShowModal(true);
  };

  const downloadCertificate = (certificate: Certificate) => {
    // In a real implementation, this would generate a PDF or image
    const certificateText = `
SKILLSWAP CERTIFICATE OF COMPLETION

This certifies that
${certificate.userName}

has successfully completed the skill:
${certificate.skillTitle}

Taught by: ${certificate.teacherName}
Date: ${format(new Date(certificate.issuedAt.seconds * 1000), 'MMMM dd, yyyy')}
Grade: ${certificate.grade}
Certificate Number: ${certificate.certificateNumber}

Verification ID: ${certificate.verificationId}
    `;

    const blob = new Blob([certificateText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SkillSwap-Certificate-${certificate.certificateNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading certificates...</p>
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
                href="/sessions"
                className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                Sessions
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Certificates</h1>
              <p className="text-gray-600">
                Your achievements and completed learning milestones.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon icon="material-symbols:verified" width={24} className="text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{certificates.length}</p>
            <p className="text-sm text-gray-600">Total Certificates</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon icon="material-symbols:trending-up" width={24} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {new Set(certificates.map(c => c.teacherId)).size}
            </p>
            <p className="text-sm text-gray-600">Teachers Learned From</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon icon="material-symbols:category" width={24} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {new Set(certificates.map(c => c.skillTitle.split(' ')[0])).size}
            </p>
            <p className="text-sm text-gray-600">Skill Categories</p>
          </div>
        </motion.div>

        {/* Certificates Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {certificates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((certificate, index) => (
                <motion.div
                  key={certificate.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.5 }}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openCertificate(certificate)}
                >
                  {/* Certificate Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                      <Icon icon="material-symbols:verified" width={24} className="text-white" />
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      certificate.grade === 'Pass' || certificate.grade === 'Excellent' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {certificate.grade}
                    </div>
                  </div>

                  {/* Certificate Content */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {certificate.skillTitle}
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Icon icon="material-symbols:person" width={16} />
                      <span>Taught by {certificate.teacherName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Icon icon="material-symbols:calendar-today" width={16} />
                      <span>{format(new Date(certificate.issuedAt.seconds * 1000), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>

                  {certificate.completionNotes && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-gray-700 italic line-clamp-2">
                        "{certificate.completionNotes}"
                      </p>
                    </div>
                  )}

                  {/* Certificate Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500 font-mono">
                      #{certificate.certificateNumber}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadCertificate(certificate);
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Download Certificate"
                      >
                        <Icon icon="material-symbols:download" width={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Icon icon="material-symbols:verified-outline" width={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No certificates yet</h3>
              <p className="text-gray-600 mb-4">
                Complete your first learning session to earn a certificate!
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
                  href="/sessions"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Icon icon="material-symbols:video-call" width={20} />
                  View Sessions
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Certificate Modal */}
      {showModal && selectedCertificate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Certificate Design */}
            <div className="border-4 border-yellow-400 rounded-xl p-8 text-center bg-gradient-to-br from-yellow-50 to-white">
              <div className="mb-6">
                <Icon icon="carbon:skill-level" width={48} className="mx-auto text-blue-600 mb-2" />
                <h2 className="text-2xl font-bold text-gray-900">SkillSwap</h2>
                <p className="text-sm text-gray-600">Certificate of Completion</p>
              </div>

              <div className="mb-6">
                <p className="text-lg text-gray-700 mb-2">This certifies that</p>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">{selectedCertificate.userName}</h3>
                <p className="text-lg text-gray-700 mb-2">has successfully completed the skill:</p>
                <h4 className="text-2xl font-semibold text-blue-600 mb-6">{selectedCertificate.skillTitle}</h4>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
                <div>
                  <p className="text-gray-600">Taught by:</p>
                  <p className="font-semibold text-gray-900">{selectedCertificate.teacherName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Date Completed:</p>
                  <p className="font-semibold text-gray-900">
                    {format(new Date(selectedCertificate.issuedAt.seconds * 1000), 'MMMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Grade:</p>
                  <p className="font-semibold text-gray-900">{selectedCertificate.grade}</p>
                </div>
                <div>
                  <p className="text-gray-600">Certificate No:</p>
                  <p className="font-semibold text-gray-900 font-mono">{selectedCertificate.certificateNumber}</p>
                </div>
              </div>

              {selectedCertificate.completionNotes && (
                <div className="bg-white/50 rounded-lg p-4 mb-6">
                  <p className="text-gray-600 text-sm mb-1">Teacher's Notes:</p>
                  <p className="text-gray-800 italic">"{selectedCertificate.completionNotes}"</p>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500">
                  Verification ID: {selectedCertificate.verificationId}
                </p>
                <p className="text-xs text-gray-500">
                  Verify at: skillswap.com/verify/{selectedCertificate.verificationId}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => downloadCertificate(selectedCertificate)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Icon icon="material-symbols:download" width={20} />
                Download
              </button>
              
              <button
                onClick={() => setShowModal(false)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Icon icon="material-symbols:close" width={20} />
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function Certificates() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CertificatesContent />
    </Suspense>
  );
}