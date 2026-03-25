import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Centered Glass Card - Ultimate Transparency with increased horizontal stretch and padding */}
      <div 
        className="relative z-10 backdrop-blur-[24px] rounded-[3rem] shadow-2xl p-12 md:py-16 md:px-28 max-w-4xl w-full text-center border border-white/10 transition-all duration-500 hover:border-white/20"
        style={{
          background: 'rgba(var(--st-card), var(--glass-card-opacity))',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        }}
      >
        <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4">
          Trade your talents.<br />
          <span className="text-st-accent">Learn something new.</span>
        </h1>
        
        <p className="text-white/60 text-lg font-medium max-w-lg mx-auto mb-10 leading-relaxed">
          The community-driven marketplace for skill exchange. Connect with experts, offer your expertise, and grow together without spending a dime.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link 
            to="/register" 
            className="bg-st-accent hover:brightness-110 text-[#180c10] font-bold py-3.5 px-10 rounded-xl transition-all shadow-lg shadow-black/10 w-full sm:w-auto"
          >
            Get Started Free
          </Link>
          <Link 
            to="/login" 
            className="bg-white/5 hover:bg-white/10 text-white font-medium py-3.5 px-8 rounded-xl transition-all shadow-md w-full sm:w-auto border border-white/10"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Landing;
