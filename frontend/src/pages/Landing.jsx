import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen bg-skwap-bgPrimary bg-gradient-to-br from-white to-skwap-cardLight/50 flex flex-col items-center justify-center p-4">
      {/* The UI reference image shows a light card for the landing page */}
      <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-2xl p-12 md:p-16 max-w-2xl w-full text-center border border-white/40">
        <h1 className="text-5xl md:text-6xl font-extrabold text-[#4A3B40] tracking-tight leading-tight mb-4">
          Trade your talents.<br />
          <span className="text-[#A47F8B]">Learn something new.</span>
        </h1>
        
        <p className="text-[#6D565D] text-lg font-medium max-w-lg mx-auto mb-10 leading-relaxed">
          The community-driven marketplace for skill exchange. Connect with experts, offer your expertise, and grow together without spending a dime.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link 
            to="/register" 
            className="bg-[#58474D] hover:bg-[#4A3B40] text-white font-medium py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-black/10 w-full sm:w-auto"
          >
            Get Started Free
          </Link>
          <Link 
            to="/login" 
            className="bg-white hover:bg-gray-50 text-[#58474D] font-medium py-3.5 px-8 rounded-xl transition-all shadow-md w-full sm:w-auto border border-gray-100"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Landing;
