import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, googleLogin } = useAuth();
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

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    const res = await googleLogin(credentialResponse.credential);
    setLoading(false);
    if (res.success) {
      if (res.isNew) {
        navigate('/setup-profile');
      } else {
        navigate('/explore');
      }
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="orb-float absolute top-[-100px] right-[-100px] w-[400px] h-[400px] bg-st-accent rounded-full blur-[120px] opacity-20 pointer-events-none" />
      <div className="orb-float-slow absolute bottom-[-150px] left-[-100px] w-[500px] h-[500px] bg-rose-900 rounded-full blur-[130px] opacity-25 pointer-events-none" />
      <div className="orb-float-mid absolute top-1/3 left-1/2 w-[300px] h-[300px] bg-purple-900/30 rounded-full blur-[100px] opacity-15 pointer-events-none" />

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
          <div className="bg-st-buttonDark p-3 rounded-2xl mb-4 shadow-inner">
             {/* Logo placeholder */}
             <div className="w-8 h-8 rounded bg-white text-st-buttonDark flex items-center justify-center font-bold">S</div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-st-textSecondary text-sm">Join the Skill Trade community</p>
        </div>

        {/* Google Sign-In */}
        <div className="w-full mb-6 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              setError('Google Login Failed');
              toast.error('Google Login Failed');
            }}
            useOneTap
            theme="filled_black"
            shape="pill"
            width="100%"
          />
        </div>

        <div className="my-5 flex items-center">
          <div className="flex-grow border-t border-st-card"></div>
          <span className="px-3 text-st-textSecondary text-xs font-bold uppercase tracking-wider">OR</span>
          <div className="flex-grow border-t border-st-card"></div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

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
                className="w-full text-white rounded-xl px-4 py-3 pl-11 focus:outline-none placeholder-white/30 text-sm transition-all glass-input"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-st-textSecondary text-xs font-medium mb-1.5 ml-1">Password</label>
            <div className="relative">
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full bg-st-cardLight/10 border border-st-card/50 text-white rounded-xl px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-st-buttonFocus placeholder-white/30 text-sm tracking-widest transition-all"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-st-textSecondary text-xs font-medium mb-1.5 ml-1">Confirm Password</label>
            <div className="relative">
              <input 
                type="password" 
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full text-white rounded-xl px-4 py-3 pl-11 focus:outline-none placeholder-white/30 text-sm tracking-widest transition-all glass-input"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full glass-btn text-white font-semibold py-3 rounded-xl mt-2">
            Create Account
          </button>
        </form>

        <p className="text-center text-sm text-st-textSecondary pt-6">
          Already have an account? <Link to="/login" className="text-st-accent hover:text-white font-medium transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
