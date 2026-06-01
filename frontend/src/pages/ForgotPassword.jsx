import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSuccess(true);
      toast.success(data.message || 'Reset link sent successfully!');
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to send reset link. Please try again.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="orb-float absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-st-accent rounded-full blur-[120px] opacity-20 pointer-events-none" />
      <div className="orb-float-slow absolute bottom-[-150px] right-[-100px] w-[500px] h-[500px] bg-rose-900 rounded-full blur-[130px] opacity-25 pointer-events-none" />

      <div
        className="relative w-full max-w-md p-8 rounded-3xl shadow-2xl"
        style={{
          background: 'linear-gradient(160deg, rgba(55,32,44,0.80) 0%, rgba(24,12,18,0.92) 100%)',
          backdropFilter: 'blur(40px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
          border: '1px solid rgba(255,255,255,0.13)',
          boxShadow: '0 30px 70px rgba(0,0,0,0.60), inset 0 1.5px 0 rgba(255,255,255,0.13), inset 0 -1px 0 rgba(0,0,0,0.25)',
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-st-buttonDark p-1.5 rounded-2xl mb-4 shadow-inner">
             <img src="/logo.png" alt="Skill Trade Logo" className="w-12 h-12 object-cover rounded-xl" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Forgot Password</h2>
          <p className="text-st-textSecondary text-sm text-center">
            {success 
              ? "Check your inbox for password reset instructions" 
              : "Enter your email to receive a password reset link"}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl mb-5 text-sm">
            {error}
          </div>
        )}

        {success ? (
          <div className="space-y-6 text-center">
            <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl text-sm leading-relaxed">
              We have sent a secure password reset link to <strong className="text-white">{email}</strong>. The link will be active for 30 minutes.
            </div>
            
            <p className="text-xs text-st-textSecondary italic leading-relaxed">
              💡 <strong>Tip:</strong> If you don't see the email in your inbox within a few minutes, please check your <strong>Spam</strong> or <strong>Junk</strong> folder.
            </p>
            
            <Link
              to="/login"
              className="w-full glass-btn text-white font-semibold py-3.5 rounded-xl block text-center transition-all animate-pulse"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-st-textSecondary text-xs font-medium mb-1.5 ml-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full text-white text-sm rounded-xl px-4 py-3 pl-11 focus:outline-none placeholder-white/30 transition-all glass-input"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full glass-btn text-white font-semibold py-3.5 rounded-xl mt-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>
            
            <p className="text-center text-sm text-st-textSecondary pt-4">
              Remember your password? <Link to="/login" className="text-st-accent hover:text-white font-medium transition-colors">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
