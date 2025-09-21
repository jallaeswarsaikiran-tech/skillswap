import Link from 'next/link';
import { Icon } from '@iconify/react';

export default function AuthCodeError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <Icon icon="material-symbols:error" width={48} className="mx-auto mb-4 text-red-500" />
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Authentication Error</h1>
        <p className="text-gray-600 mb-6">
          There was an error signing you in. Please try again.
        </p>
        <Link 
          href="/" 
          className="inline-block px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
