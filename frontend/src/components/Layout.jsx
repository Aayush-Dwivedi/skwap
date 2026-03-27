import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import FloatingChat from './FloatingChat';
import { useAuth } from '../contexts/AuthContext';
import { Home, Wallet as WalletIcon, Calendar, User, MessageSquare } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useChat } from '../contexts/ChatContext';

/* ── Page Transition Wrapper ── */
const AnimatedPage = ({ children, locationKey }) => (
  <div
    key={locationKey}
    className="h-full"
    style={{
      animation: 'pageIn 0.28s cubic-bezier(0.4,0,0.2,1) both',
    }}
  >
    <style>{`
      @keyframes pageIn {
        from { opacity: 0; transform: translateY(10px) scale(0.99); }
        to   { opacity: 1; transform: translateY(0)  scale(1); }
      }
    `}</style>
    {children}
  </div>
);

/* ── Custom Scrollbar Track ── */
const ScrollTrack = ({ targetId }) => {
  const [thumbHeight, setThumbHeight] = useState(30);
  const [thumbTop, setThumbTop] = useState(0);
  const [visible, setVisible] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartScroll = useRef(0);
  const trackRef = useRef(null);

  const update = useCallback(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const ratio = clientHeight / scrollHeight;
    setVisible(scrollHeight > clientHeight);
    setThumbHeight(Math.max(ratio * 100, 8));
    setThumbTop(scrollHeight > clientHeight ? (scrollTop / (scrollHeight - clientHeight)) * (100 - Math.max(ratio * 100, 8)) : 0);
    
    // Handle scroll visibility
    setIsScrolling(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => setIsScrolling(false), 1500);
  }, [targetId]);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.addEventListener('scroll', update);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, [targetId, update]);

  const onMouseDown = (e) => {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    const el = document.getElementById(targetId);
    dragStartScroll.current = el?.scrollTop || 0;
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      const el = document.getElementById(targetId);
      const track = trackRef.current;
      if (!el || !track) return;
      const dy = e.clientY - dragStartY.current;
      const trackH = track.clientHeight;
      const scrollRange = el.scrollHeight - el.clientHeight;
      el.scrollTop = dragStartScroll.current + (dy / trackH) * scrollRange;
    };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [targetId]);

  if (!visible) return null;

  return (
    <div
      ref={trackRef}
      className={`w-[10px] flex-shrink-0 my-4 rounded-full bg-white/[0.04] border border-white/10 relative cursor-pointer select-none transition-opacity duration-500
        ${(isScrolling || isDragging.current) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
      `}
      onClick={(e) => {
        const el = document.getElementById(targetId);
        const track = trackRef.current;
        if (!el || !track) return;
        const rect = track.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const ratio = clickY / track.clientHeight;
        el.scrollTop = ratio * (el.scrollHeight - el.clientHeight);
      }}
    >
      <div
        className="absolute left-[1px] right-[1px] rounded-full transition-colors cursor-grab active:cursor-grabbing border border-white/5"
        style={{ 
          top: `${thumbTop}%`, 
          height: `${thumbHeight}%`,
          background: `linear-gradient(to bottom, rgba(var(--st-accent, 164, 127, 139), 0.8), rgba(var(--st-accent, 164, 127, 139), 0.4))`
        }}
        onMouseDown={onMouseDown}
      />
    </div>
  );
};

const Layout = () => {
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden text-st-textPrimary font-sans relative p-4 sm:p-6 gap-0 md:gap-6">
      {/* Decorative Background Orbs — acting as localized highlights on the wallpaper */}
      <div className="orb-float fixed top-0 left-0 w-[500px] h-[500px] bg-st-accent rounded-full blur-[150px] opacity-15 pointer-events-none mix-blend-screen transition-all duration-1000" />
      <div className="orb-float-slow fixed bottom-0 right-0 w-[600px] h-[600px] bg-rose-900 rounded-full blur-[150px] opacity-20 pointer-events-none mix-blend-screen transition-all duration-1000" />
      <div className="orb-float-mid fixed top-1/2 left-1/3 w-[350px] h-[350px] bg-purple-900/40 rounded-full blur-[130px] opacity-15 pointer-events-none mix-blend-screen transition-all duration-1000" />

      {/* Sidebar as a regular flex sibling on desktop */}
      <div className="hidden md:block h-full flex-shrink-0">
        <Sidebar 
          collapsed={collapsed} 
          onToggle={() => setCollapsed(prev => !prev)} 
        />
      </div>

      {/* Main content area */}
      <main className="flex-1 min-w-0 relative z-10 flex flex-col md:flex-row pb-20 md:pb-0 group scale-100">
        {/* Wrapper for Glass Box and Chat */}
        <div className="flex-1 flex min-w-0 relative">
          {/* Floating glass box — fills remaining height, only its contents scroll */}
          <div
            id="main-scroll-box"
            className="
              flex-1 min-h-0
              rounded-[1.5rem] sm:rounded-[2rem]
              overflow-y-auto
              p-5 sm:p-8
              isolate
              relative
            "
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              background: `linear-gradient(160deg, rgba(var(--st-bg-secondary), var(--glass-card-opacity)) 0%, rgba(var(--st-bg-primary), var(--glass-card-opacity)) 100%)`,
              backdropFilter: 'blur(var(--glass-blur)) saturate(1.6)',
              WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(1.6)',
              border: '1px solid rgba(var(--st-text-primary), 0.08)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25), inset 0 1.5px 0 rgba(var(--st-text-primary), 0.08)',
            }}
          >
            <style>{`#main-scroll-box::-webkit-scrollbar { display: none; }`}</style>
            <AnimatedPage locationKey={location.key}>
              <Outlet />
            </AnimatedPage>
          </div>

          {/* Dedicated Scrollbar Area - anchored to the main box */}
          <div className="absolute top-0 bottom-0 right-[-14px] w-3 flex justify-center pointer-events-none z-[100]">
            <ScrollTrack targetId="main-scroll-box" />
          </div>
        </div>

        {/* Spilled Chat Panel - Only takes space when open */}
        <FloatingChat />
      </main>

      {/* 📱 Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none">
        <div className="max-w-md mx-auto glass-strong rounded-3xl border border-white/10 shadow-2xl pointer-events-auto flex items-center justify-around p-2">
          <MobileNavItem to="/explore" icon={Home} label="Home" />
          <MobileNavItem to="/wallet" icon={WalletIcon} label="Wallet" />
          <MobileNavItem to="/sessions" icon={Calendar} label="Sessions" />
          <MobileChatToggle />
          <MobileNavItem to="/edit-profile" icon={User} label="Profile" />
        </div>
      </div>
    </div>
  );
};

/* ── Mobile Nav Helper Components ── */
const MobileNavItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `
      flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-2xl transition-all
      ${isActive ? 'text-st-accent bg-white/5 shadow-inner' : 'text-white/40 hover:text-white/60'}
    `}
  >
    <Icon size={20} />
    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </NavLink>
);

const MobileChatToggle = () => {
  const { toggleChat, unreadCounts } = useChat();
  const totalChatUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <button
      onClick={toggleChat}
      className="flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-2xl text-white/40 relative"
    >
      <div className="relative">
        <MessageSquare size={20} />
        {totalChatUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-st-accent rounded-full border border-st-bgPrimary" />
        )}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest">Chat</span>
    </button>
  );
};

export default Layout;
