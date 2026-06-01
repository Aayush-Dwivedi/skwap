import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, { password });
      setSuccess(true);
      toast.success(data.message || 'Password reset successfully!');
      
      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Token is invalid or has expired.';
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
          <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
          <p className="text-st-textSecondary text-sm text-center">
            {success 
              ? "Your password has been changed" 
              : "Choose a new strong password for your account"}
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
              Your password has been successfully reset! Redirecting to the Login page in a few seconds...
            </div>
            
            <Link
              to="/login"
              className="w-full glass-btn text-white font-semibold py-3.5 rounded-xl block text-center transition-all"
            >
              Sign In Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-st-textSecondary text-xs font-medium mb-1.5 ml-1">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-white rounded-xl px-4 py-3 pl-11 pr-11 focus:outline-none placeholder-white/30 text-sm tracking-widest transition-all glass-input"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  <svg className="w-4 h-4 text-white/50 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-st-textSecondary text-xs font-medium mb-1.5 ml-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-white rounded-xl px-4 py-3 pl-11 pr-11 focus:outline-none placeholder-white/30 text-sm tracking-widest transition-all glass-input"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full glass-btn text-white font-semibold py-3.5 rounded-xl mt-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Resetting password...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
