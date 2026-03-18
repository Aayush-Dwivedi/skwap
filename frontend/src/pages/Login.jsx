import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.success) {
      navigate('/explore');
    } else {
      setError(res.message);
    }
  };

  const handleGoogleClick = () => {
    toast('Google sign-in coming soon! Please use email & password for now.', {
      icon: '📧',
      duration: 3500,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient orbs — localized highlights */}
      <div className="orb-float absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-skwap-accent rounded-full blur-[120px] opacity-20 pointer-events-none" />
      <div className="orb-float-slow absolute bottom-[-150px] right-[-100px] w-[500px] h-[500px] bg-rose-900 rounded-full blur-[130px] opacity-25 pointer-events-none" />
      <div className="orb-float-mid absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-purple-900/30 rounded-full blur-[100px] opacity-15 pointer-events-none" />

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
          <div className="bg-skwap-buttonDark p-3 rounded-2xl mb-4 shadow-inner">
             <div className="w-8 h-8 rounded bg-white text-skwap-buttonDark flex items-center justify-center font-bold text-lg">S</div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-skwap-textSecondary text-sm">Log in to your Skwap account</p>
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleClick}
          className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-white text-sm font-medium py-3 rounded-xl transition-all mb-6"
        >
          {/* Google logo SVG */}
          <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center">
          <div className="flex-grow border-t border-skwap-card"></div>
          <span className="px-3 text-skwap-textSecondary text-xs font-bold uppercase tracking-wider">OR</span>
          <div className="flex-grow border-t border-skwap-card"></div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl mb-5 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-skwap-textSecondary text-xs font-medium mb-1.5 ml-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
              className="w-full text-white text-sm rounded-xl px-4 py-3 pl-11 focus:outline-none placeholder-white/30 text-sm transition-all glass-input"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5 ml-1">
              <label className="block text-skwap-textSecondary text-xs font-medium">Password</label>
              <button type="button" className="text-skwap-accent text-xs font-medium hover:text-white transition-colors">Forgot password?</button>
            </div>
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
                <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full glass-btn text-white font-semibold py-3 rounded-xl mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-skwap-textSecondary pt-6">
          Don't have an account? <Link to="/register" className="text-skwap-accent hover:text-white font-medium transition-colors">Register instead</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
