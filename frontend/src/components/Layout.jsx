import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

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
  const trackRef = useRef(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartScroll = useRef(0);

  const update = useCallback(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const ratio = clientHeight / scrollHeight;
    setVisible(scrollHeight > clientHeight);
    setThumbHeight(Math.max(ratio * 100, 8));
    setThumbTop(scrollHeight > clientHeight ? (scrollTop / (scrollHeight - clientHeight)) * (100 - Math.max(ratio * 100, 8)) : 0);
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
      className="w-[10px] flex-shrink-0 my-4 rounded-full bg-white/[0.04] border border-white/10 relative cursor-pointer select-none"
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
        className="absolute left-[1px] right-[1px] rounded-full bg-gradient-to-b from-skwap-accent/60 to-skwap-accent/30 hover:from-skwap-accent/80 hover:to-skwap-accent/50 transition-colors cursor-grab active:cursor-grabbing"
        style={{ top: `${thumbTop}%`, height: `${thumbHeight}%` }}
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

  useEffect(() => {
    if (!user) return;

    const socket = io('http://localhost:5000');
    socket.emit('setup', user);

    socket.on('notification', (data) => {
      toast(
        (t) => (
          <div className="flex flex-col gap-2 cursor-pointer" onClick={() => {
            toast.dismiss(t.id);
            navigate('/sessions');
          }}>
            <span className="font-bold text-skwap-accent text-sm">Update Received! ✨</span>
            <span className="text-sm font-medium">{data.message || 'Your session request was accepted!'}</span>
            <span className="text-[10px] text-skwap-textSecondary mt-1 uppercase tracking-wider">Click to view sessions</span>
          </div>
        ),
        { duration: 6000 }
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [user, navigate]);

  return (
    <div className="flex h-screen overflow-hidden bg-skwap-bgPrimary bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#4D3B43] via-[#35252A] to-[#1A1215] text-skwap-textPrimary font-sans relative">
      {/* Decorative Background Orbs */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-skwap-accent rounded-full blur-[150px] opacity-20 pointer-events-none mix-blend-screen"></div>
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-rose-900 rounded-full blur-[150px] opacity-30 pointer-events-none mix-blend-screen"></div>

      {/* Sidebar receives collapsed state and toggle handler */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(prev => !prev)} />

      {/* Main content area */}
      <main className="flex-1 relative z-10 flex pt-6 pb-6 pr-6 gap-2">
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
            background: 'linear-gradient(160deg, rgba(34, 20, 26, 0.93) 0%, rgba(24, 14, 18, 0.96) 100%)',
            backdropFilter: 'blur(16px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.25)',
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
