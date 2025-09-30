'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabaseAuthProvider';
import { motion } from 'framer-motion';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { 
  User as UserIcon, Phone, Mail, Lock, Eye, EyeOff, 
  CheckCircle, XCircle, Loader, ArrowRight, Shield 
} from 'lucide-react';

export default function LoginPage() {
  const { user, loading, signIn, signUp, isAuthenticated } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup' | 'admin' | 'forgot'>('signin');

  // Core fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // UI helpers
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  // Validation states
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [phoneValid, setPhoneValid] = useState<boolean | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<number>(0);
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);
  const [displayNameAvailable, setDisplayNameAvailable] = useState<boolean | null>(null);

  // Show demo hints only in non-production environments
  const showDemo = process.env.NODE_ENV !== 'production';

  // Auto-generate display name from email if empty
  useEffect(() => {
    if (!displayName && email.includes('@')) {
      setDisplayName(email.split('@')[0]);
    }
  }, [email, displayName]);

  // Email validation
  useEffect(() => {
    if (email.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(email);
      setEmailValid(isValid);
    } else setEmailValid(null);
  }, [email]);

  // Phone validation (signup only, optional but validated if present)
  useEffect(() => {
    if (phoneNumber.length === 0) { setPhoneValid(null); return; }
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    setPhoneValid(phoneRegex.test(phoneNumber));
  }, [phoneNumber]);

  // Password strength
  useEffect(() => {
    if (!password) { setPasswordStrength(0); return; }
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 12.5;
    if (/[^A-Za-z0-9]/.test(password)) strength += 12.5;
    setPasswordStrength(Math.min(strength, 100));
  }, [password]);

  // Password match
  useEffect(() => {
    if (!confirm) { setPasswordMatch(null); return; }
    setPasswordMatch(password === confirm);
  }, [password, confirm]);

  // Display name availability (client-only visual)
  useEffect(() => {
    if (displayName.trim().length >= 3) setDisplayNameAvailable(true);
    else if (displayName.trim().length === 0) setDisplayNameAvailable(null);
    else setDisplayNameAvailable(false);
  }, [displayName]);

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (!emailValid) return false;
    if (mode === 'forgot') return emailValid;
    if (mode === 'signup') {
      const phoneOk = phoneValid === null || phoneValid === true; // optional field
      return emailValid && phoneOk && displayNameAvailable === true && passwordStrength >= 50 && passwordMatch === true;
    }
    // signin/admin
    return emailValid && password.length >= 6;
  }, [busy, mode, emailValid, phoneValid, displayNameAvailable, passwordStrength, passwordMatch, password]);

  // If authenticated, determine destination (admin vs user) in real-time
  useEffect(() => {
    const go = async () => {
      try {
        const resp = await fetch('/api/users', { credentials: 'same-origin' });
        if (!resp.ok) {
          // fallback to dashboard if user profile isn't available yet
          router.replace('/dashboard');
          return;
        }
        const data = await resp.json();
        const isAdmin = !!data?.user?.is_admin;
        router.replace(isAdmin ? '/admin' : '/dashboard');
      } catch {
        router.replace('/dashboard');
      }
    };
    if (isAuthenticated) void go();
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signup') {
        // Create auth user
        await signUp(email, password);
        // Update profile metadata and users table with display name
        const supabase = getSupabaseClient();
        try {
          await supabase.auth.updateUser({ data: { display_name: displayName, phone: phoneNumber || undefined } });
        } catch {}
        try {
          await fetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_name: displayName, phone: phoneNumber || undefined }),
            credentials: 'same-origin',
          });
        } catch {}
      } else if (mode === 'forgot') {
        const supabase = getSupabaseClient();
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/reset-password`,
        });
        if (error) throw error;
        setInfo('If an account exists for this email, a password reset link has been sent.');
      } else {
        // signin and admin both use email/password; admin path will redirect after auth
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        <div className="relative z-10">
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">Learn & Teach<br/>Amazing Skills</h1>
            <p className="text-xl text-blue-100">Join thousands of learners and teachers in our growing community</p>
          </div>
          <div className="grid grid-cols-2 gap-6 mb-8">
            {[{value:'50K+',label:'Active Learners'},{value:'800+',label:'Skills Available'},{value:'4.9',label:'Average Rating'},{value:'12K+',label:'Certificates Issued'}].map((s,i)=>(
              <div key={i} className="text-center transform transition-all hover:scale-105" style={{animation:`fadeInUp 0.6s ease-out ${i*0.1}s both`}}>
                <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto mb-3 flex items-center justify-center">
                  <Shield size={24} className="text-white" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-sm text-blue-100">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-white/90 text-sm">Secure by design • Powered by Supabase</div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Tabs */}
          <div className="bg-white rounded-2xl p-2 shadow-sm mb-8 flex">
            <button onClick={() => setMode('signin')} className={`flex-1 py-3 rounded-xl font-medium transition-all ${mode==='signin' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>Login</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-3 rounded-xl font-medium transition-all ${mode==='signup' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>Sign Up</button>
            <button onClick={() => setMode('admin')} className={`flex-1 py-3 rounded-xl font-medium transition-all ${mode==='admin' ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>Admin</button>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8">
            {mode === 'signin' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
                <p className="text-gray-600 mb-6">Sign in to continue your learning journey</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none transition-all ${emailValid===true ? 'border-green-500 focus:ring-2 focus:ring-green-200' : emailValid===false ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`} placeholder="you@example.com" />
                      {emailValid !== null && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">{emailValid ? <CheckCircle size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <button type="button" className="text-sm text-blue-600 hover:text-blue-700" onClick={()=>setMode('forgot')}>Forgot?</button>
                    </div>
                    <div className="relative">
                      <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none" placeholder="••••••••" />
                      <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                    </div>
                  </div>

                  {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

                  <button type="submit" disabled={!canSubmit} className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {busy ? (<><Loader size={20} className="animate-spin" /> Signing In...</>) : (<>Sign In <ArrowRight size={20} /></>)}
                  </button>
                </form>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
                <p className="text-gray-600 mb-6">Join SkillSwap and start learning today</p>

                <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Display Name *</label>
                    <div className="relative">
                      <UserIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} required className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none transition-all ${displayNameAvailable===true ? 'border-green-500 focus:ring-2 focus:ring-green-200' : displayNameAvailable===false ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`} placeholder="johndoe" />
                      {displayNameAvailable !== null && (<div className="absolute right-4 top-1/2 -translate-y-1/2">{displayNameAvailable ? <CheckCircle size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}</div>)}
                    </div>
                    {displayNameAvailable === false && (<p className="text-red-500 text-xs mt-1">Display name too short</p>)}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                    <div className="relative">
                      <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none transition-all ${emailValid===true ? 'border-green-500 focus:ring-2 focus:ring-green-200' : emailValid===false ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`} placeholder="you@example.com" />
                      {emailValid !== null && (<div className="absolute right-4 top-1/2 -translate-y-1/2">{emailValid ? <CheckCircle size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}</div>)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="tel" value={phoneNumber} onChange={(e)=>setPhoneNumber(e.target.value)} className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none transition-all ${phoneValid===true ? 'border-green-500 focus:ring-2 focus:ring-green-200' : phoneValid===false ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`} placeholder="+1 (555) 123-4567" />
                      {phoneValid !== null && (<div className="absolute right-4 top-1/2 -translate-y-1/2">{phoneValid ? <CheckCircle size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}</div>)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <div className="relative">
                      <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e)=>setPassword(e.target.value)} required className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none" placeholder="••••••••" />
                      <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                    </div>
                    {password && (
                      <div className="mt-2">
                        <div className="flex gap-1">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${passwordStrength >= (i + 1) * 25 ? passwordStrength < 50 ? 'bg-red-500' : passwordStrength < 75 ? 'bg-yellow-500' : 'bg-green-500' : 'bg-gray-200'}`}></div>
                          ))}
                        </div>
                        <p className={`text-xs mt-1 ${passwordStrength < 50 ? 'text-red-500' : passwordStrength < 75 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {passwordStrength < 50 ? 'Weak' : passwordStrength < 75 ? 'Good' : 'Strong'} password
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                    <div className="relative">
                      <Shield size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type={showConfirmPassword ? 'text' : 'password'} value={confirm} onChange={(e)=>setConfirm(e.target.value)} required className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none transition-all ${passwordMatch===true ? 'border-green-500 focus:ring-2 focus:ring-green-200' : passwordMatch===false ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`} placeholder="••••••••" />
                      <button type="button" onClick={()=>setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                    </div>
                    {passwordMatch === false && (<p className="text-red-500 text-xs mt-1">Passwords do not match</p>)}
                  </div>

                  {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

                  <button type="submit" disabled={!canSubmit} className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {busy ? (<><Loader size={20} className="animate-spin" /> Creating Account...</>) : (<>Create Account <ArrowRight size={20} /></>)}
                  </button>
                </form>
              </div>
            )}

            {mode === 'admin' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2"><Shield size={22} className="text-rose-600"/> Admin Portal</h2>
                <p className="text-gray-600 mb-4">Secure access. All admin actions are logged.</p>
                <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">Use your admin credentials. Role is verified after sign-in.</div>
                {showDemo && (
                  <div className="mb-4 p-3 rounded-lg bg-orange-50 text-orange-800 text-sm">
                    <div className="font-medium mb-1">Demo credentials (dev only)</div>
                    <div className="space-y-1">
                      <div>Super Admin: <code>admin@skillswap.com</code> / <code>admin123</code></div>
                      <div>Moderator: <code>moderator@skillswap.com</code> / <code>mod123</code></div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={()=>{ setEmail('admin@skillswap.com'); setPassword('admin123'); }} className="px-2.5 py-1.5 bg-gray-900 text-white rounded text-xs">Use Super Admin</button>
                      <button type="button" onClick={()=>{ setEmail('moderator@skillswap.com'); setPassword('mod123'); }} className="px-2.5 py-1.5 bg-gray-700 text-white rounded text-xs">Use Moderator</button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
                    <div className="relative">
                      <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none transition-all ${emailValid===true ? 'border-green-500 focus:ring-2 focus:ring-green-200' : emailValid===false ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'}`} placeholder="admin@skillswap.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none" placeholder="••••••••" />
                      <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">2FA Code (optional)</label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none" placeholder="123456" />
                  </div>
                  {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">{error}</div>}
                  <button type="submit" disabled={!canSubmit} className="w-full py-4 bg-gradient-to-r from-rose-600 to-orange-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {busy ? (<><Loader size={20} className="animate-spin" /> Verifying...</>) : (<>Enter Admin <ArrowRight size={20} /></>)}
                  </button>
                </form>
                <div className="text-xs text-gray-500 mt-4">Not an admin? <button className="underline" onClick={()=>setMode('signin')}>Back to user login</button></div>
              </div>
            )}

            {mode === 'forgot' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password</h2>
                <p className="text-gray-600 mb-6">Enter your account email and we’ll send a reset link</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none transition-all ${emailValid===true ? 'border-green-500 focus:ring-2 focus:ring-green-200' : emailValid===false ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`} placeholder="you@example.com" />
                    </div>
                  </div>
                  {info && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{info}</div>}
                  {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
                  <button type="submit" disabled={!canSubmit} className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50">Send reset link</button>
                  <div className="text-xs text-gray-600 text-center">Remembered it? <button className="underline" onClick={()=>setMode('signin')}>Back to sign in</button></div>
                </form>
              </div>
            )}
          </div>

          <p className="text-center text-gray-600 text-sm mt-6">By continuing, you agree to our <Link href="/terms" className="text-blue-600 hover:text-blue-700">Terms</Link> and <Link href="/privacy" className="text-blue-600 hover:text-blue-700">Privacy Policy</Link></p>
        </div>
      </div>

      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
