'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authService } from '@/services/auth.service';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <Building2 size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Reset password</h1>
          <p className="text-sm text-slate-500 text-center">
            Enter your email and we'll send a reset link
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-3">
            <p className="text-emerald-800 font-medium">Check your inbox</p>
            <p className="text-sm text-emerald-700">
              If <strong>{email}</strong> has an account, a reset link has been sent.
              In development, the link is logged to the backend console.
            </p>
            <Link href="/login" className="text-sm text-indigo-600 hover:underline flex items-center justify-center gap-1">
              <ArrowLeft size={14} /> Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@company.cm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              Send reset link
            </Button>
            <Link href="/login" className="flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700">
              <ArrowLeft size={14} /> Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
