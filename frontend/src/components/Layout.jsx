import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';

/* ── Page Transition Wrapper ── */
const AnimatedPage = ({ children, locationKey }) => (
  <div
    key={locationKey}
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
          background: `linear-gradient(to bottom, rgba(var(--skwap-accent, 164, 127, 139), 0.8), rgba(var(--skwap-accent, 164, 127, 139), 0.4))`
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
    <div className="flex h-screen overflow-hidden text-skwap-textPrimary font-sans relative">
      {/* Decorative Background Orbs — acting as localized highlights on the wallpaper */}
      <div className="orb-float fixed top-0 left-0 w-[500px] h-[500px] bg-skwap-accent rounded-full blur-[150px] opacity-15 pointer-events-none mix-blend-screen" />
      <div className="orb-float-slow fixed bottom-0 right-0 w-[600px] h-[600px] bg-rose-900 rounded-full blur-[150px] opacity-20 pointer-events-none mix-blend-screen" />
      <div className="orb-float-mid fixed top-1/2 left-1/3 w-[350px] h-[350px] bg-purple-900/40 rounded-full blur-[130px] opacity-15 pointer-events-none mix-blend-screen" />

      {/* Sidebar receives collapsed state and toggle handler */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(prev => !prev)} />

      {/* Main content area */}
      <main className="flex-1 relative z-10 flex pt-6 pb-6 pr-6 gap-2 group">
        {/* Spacer that matches sidebar width — animating width on an empty div avoids layout reflow */}
        <div
          style={{
            width: collapsed ? '98px' : '288px',
            flexShrink: 0,
            transition: 'width 420ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        {/* Floating glass box — fills remaining height, only its contents scroll */}
        <div
          id="main-scroll-box"
          className="
            flex-1 min-h-0
            rounded-[2.5rem]
            overflow-y-auto
            p-6 md:p-8
            isolate
            relative
          "
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            background: `linear-gradient(160deg, rgba(var(--skwap-bg-secondary), var(--glass-card-opacity)) 0%, rgba(var(--skwap-bg-primary), var(--glass-card-opacity)) 100%)`,
            backdropFilter: 'blur(var(--glass-blur)) saturate(1.6)',
            WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(1.6)',
            border: '1px solid rgba(var(--skwap-text-primary), 0.08)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.25), inset 0 1.5px 0 rgba(var(--skwap-text-primary), 0.08)',
          }}
        >
          <style>{`#main-scroll-box::-webkit-scrollbar { display: none; }`}</style>
          <AnimatedPage locationKey={location.key}>
            <Outlet />
          </AnimatedPage>
        </div>

        {/* Right-side custom scrollbar track */}
        <ScrollTrack targetId="main-scroll-box" />
      </main>
    </div>
  );
};

export default Layout;
