import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    const res = await register(email, password);
    if (res.success) {
      navigate('/setup-profile'); // Redirect to dedicated profile setup after successful registration
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-skwap-bgPrimary bg-gradient-to-br from-skwap-bgPrimary to-skwap-light/20 flex items-center justify-center p-4">
      <div className="bg-skwap-card/30 backdrop-blur-xl border border-skwap-card/50 p-8 rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-skwap-buttonDark p-3 rounded-2xl mb-4 shadow-inner">
             {/* Logo placeholder */}
             <div className="w-8 h-8 rounded bg-white text-skwap-buttonDark flex items-center justify-center font-bold">S</div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-skwap-textSecondary text-sm">Join the Skwap community</p>
        </div>

        {/* Google Sign-In */}
        <button
          onClick={() => toast('Google sign-in coming soon! Please use email & password for now.', { icon: '📧' })}
          className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-white text-sm font-medium py-3 rounded-xl transition-all mb-6"
        >
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
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl mb-6 text-sm">
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
                className="w-full bg-skwap-cardLight/10 border border-skwap-card/50 text-white rounded-xl px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/30 text-sm transition-all"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-skwap-textSecondary text-xs font-medium mb-1.5 ml-1">Password</label>
            <div className="relative">
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full bg-skwap-cardLight/10 border border-skwap-card/50 text-white rounded-xl px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/30 text-sm tracking-widest transition-all"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-skwap-textSecondary text-xs font-medium mb-1.5 ml-1">Confirm Password</label>
            <div className="relative">
              <input 
                type="password" 
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full bg-skwap-cardLight/10 border border-skwap-card/50 text-white rounded-xl px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/30 text-sm tracking-widest transition-all"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-skwap-card hover:bg-skwap-buttonFocus border border-skwap-card text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-black/10 mt-2">
            Create Account
          </button>
        </form>

        <p className="text-center text-sm text-skwap-textSecondary pt-6">
          Already have an account? <Link to="/login" className="text-skwap-accent hover:text-white font-medium transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
