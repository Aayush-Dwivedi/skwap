import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, Calendar, Wallet, Plus, LogOut, Code2, LayoutGrid, Mail, MessageSquare, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';
import { useChat } from '../contexts/ChatContext';
import api from '../services/api';

const ICON_CELL = 36; // px

const NAV_ITEMS = [
  { to: '/explore',        icon: LayoutGrid, label: 'Explore',        exact: true  },
  { to: '/my-postings',   icon: Code2,      label: 'My Postings',                 },
  { to: '/sessions',      icon: Calendar,   label: 'My Sessions',                 },
  { to: '/notifications', icon: Bell,       label: 'Notifications', isNotif: true  },
  { to: '/wallet',        icon: Wallet,    label: 'Cred Wallet',                  },
  { to: '/create-request',icon: Plus,      label: 'Create Request',               },
];

const Sidebar = ({ collapsed, onToggle }) => {
  const { user, profile, logout } = useAuth();
  const { background } = useTheme();
  const { socket } = useSocket();
  const { toggleChat, unreadCounts } = useChat();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const totalChatUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const NAV_ITEMS = [
    { to: '/explore',        icon: LayoutGrid, label: 'Explore',        exact: true  },
    { to: '/my-postings',   icon: Code2,      label: 'My Postings'                 },
    { to: '/sessions',      icon: Calendar,   label: 'My Sessions'                 },
    { to: '/notifications', icon: Bell,       label: 'Notifications', isNotif: true  },
    { to: '/wallet',        icon: Wallet,    label: 'Cred Wallet'                  },
    { to: '/create-request',icon: Plus,      label: 'Create Request'               },
    { 
      onClick: toggleChat, 
      icon: MessageSquare, 
      label: 'Chats', 
      isChat: true 
    },
  ];

  const BOTTOM_ITEMS = [
    { to: '/contact-admin', icon: Mail, label: 'Contact Admin' },
    { 
      onClick: () => { 
        if (window.confirm('Are you sure you want to logout?')) {
          logout(); 
          navigate('/landing'); 
        }
      }, 
      icon: LogOut, 
      label: 'Logout' 
    },
  ];

  // Fallback avatar/name
  const displayName = profile?.name || user?.email?.split('@')[0] || 'User';
  const displayPhoto = profile?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`;

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const { data } = await api.get('/notifications');
        const unread = data.filter(n => !n.read).length;
        setUnreadCount(unread);
      } catch {
        setUnreadCount(0);
      }
    };
    fetchUnread();
    
    // Polling as fallback (optional, could be removed but keeping for stability)
    const interval = setInterval(fetchUnread, 30_000); 

    // SOCKET REAL-TIME UPDATE
    if (socket) {
      socket.on('notification received', (newNotif) => {
        setUnreadCount(prev => prev + 1);
      });
    }

    return () => {
      clearInterval(interval);
      if (socket) socket.off('notification received');
    };
  }, [user, socket]);

  return (
    <div
      className="
        fixed top-6 left-6 bottom-6 z-50
        hidden md:flex flex-col
        transition-all duration-[420ms] ease-out
      "
      style={{
        width: collapsed ? 72 : 240,
        background: `linear-gradient(170deg, rgba(var(--st-sidebar), var(--glass-sidebar-opacity)) 0%, rgba(var(--st-bg-secondary), var(--glass-strong-opacity)) 100%)`,
        backdropFilter: 'blur(var(--glass-blur)) saturate(1.7)',
        WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(1.7)',
        border: '1px solid rgba(var(--st-text-primary), 0.12)',
        boxShadow: '0 10px 50px rgba(0,0,0,0.35), inset 0 1.5px 0 rgba(var(--st-text-primary), 0.10)',
        borderRadius: '2rem',
      }}
    >
      {/* ── Collapse Toggle Arrow (Moved outside overflow-hidden logic) ── */}
      <button
        onClick={onToggle}
        className={`
          absolute -right-3 top-10
          w-7 h-7 rounded-full
          bg-st-buttonFocus border border-white/20
          flex items-center justify-center
          text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)]
          hover:scale-110 active:scale-95
          transition-all duration-300 z-[100]
          ${collapsed ? 'translate-x-0' : ''}
        `}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="flex flex-col h-full py-5 rounded-[2rem] overflow-hidden">

        {/* ── Logo / Toggle ── */}
        <button
          onClick={onToggle}
          className={`flex items-center h-11 mb-4 mx-2 px-1 rounded-xl hover:bg-white/10 transition-colors duration-200 ${collapsed ? 'justify-center' : ''}`}
        >
          <span style={{ width: ICON_CELL, minWidth: ICON_CELL }} className="flex items-center justify-center">
            <span className="w-8 h-8 rounded-lg bg-st-buttonFocus flex items-center justify-center shadow-md">
              <Code2 size={15} className="text-white" />
            </span>
          </span>
          <span
            className="text-white font-bold text-[17px] tracking-tight whitespace-nowrap overflow-hidden transition-all duration-500"
            style={{ maxWidth: collapsed ? 0 : 180, opacity: collapsed ? 0 : 1 }}
          >
            Skill Trade
          </span>
        </button>

        {/* ── User Card (Clickable to Edit Profile) ── */}
        <NavLink 
          to="/edit-profile"
          className={({ isActive }) => 
            `flex items-center h-12 mb-4 mx-2 px-1 rounded-xl border transition-all duration-300 overflow-hidden
            ${collapsed ? 'justify-center' : ''}
            ${isActive 
              ? 'bg-white/10 border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.1)]' 
              : 'bg-white/[0.06] border-white/8 hover:bg-white/10 hover:border-white/15'
            }`
          }
        >
          <span style={{ width: ICON_CELL, minWidth: ICON_CELL }} className="flex items-center justify-center">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20 bg-white/5">
              <img
                src={displayPhoto}
                alt="avatar"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`; }}
              />
            </div>
          </span>
          <div
            className="overflow-hidden whitespace-nowrap transition-all duration-500"
            style={{ maxWidth: collapsed ? 0 : 180, opacity: collapsed ? 0 : 1 }}
          >
            <p className="text-[12px] text-white font-semibold leading-tight">{displayName}</p>
            <p className="text-[10px] text-st-accent font-bold">View Settings</p>
          </div>
        </NavLink>

        {/* ── Nav Items ── */}
        <nav className="flex flex-col gap-0.5 flex-1 px-2">
          {NAV_ITEMS.map((item) => {
            const { to, icon: Icon, label, exact, isNotif, isChat, onClick } = item;
            
            const content = (isActive) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-st-accent rounded-full" />
                )}
                {/* Icon cell */}
                <span
                  style={{ width: ICON_CELL, minWidth: ICON_CELL }}
                  className={`flex items-center justify-center flex-shrink-0 relative ${isActive ? 'text-st-accent' : ''}`}
                >
                  <Icon size={17} />
                  {/* Notification dot — visible even when collapsed */}
                  {((isNotif && unreadCount > 0) || (isChat && totalChatUnread > 0)) && collapsed && (
                    <span className="absolute top-0 right-0.5 w-2 h-2 bg-st-accent rounded-full" />
                  )}
                </span>
                {/* Label */}
                <span
                  className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-500"
                  style={{ maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1 }}
                >
                  {label}
                </span>
                {/* Badge — only when expanded and has unread */}
                {isNotif && unreadCount > 0 && !collapsed && (
                  <span className="ml-auto mr-3 bg-rose-500 text-white text-[10px] font-bold w-[20px] h-[20px] flex items-center justify-center rounded-full shadow-[0_0_12px_rgba(244,63,94,0.4)] leading-none animate-in zoom-in duration-300">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {isChat && totalChatUnread > 0 && !collapsed && (
                  <span className="ml-auto mr-3 bg-st-accent text-st-bgSecondary text-[10px] font-bold w-[20px] h-[20px] flex items-center justify-center rounded-full shadow-[0_0_12px_rgba(var(--st-accent),0.4)] leading-none animate-in zoom-in duration-300">
                    {totalChatUnread > 99 ? '99+' : totalChatUnread}
                  </span>
                )}
              </>
            );

            const activeStyles = {
              background: 'linear-gradient(135deg, rgba(var(--st-accent), 0.20) 0%, rgba(var(--st-button-focus), 0.15) 100%)',
              boxShadow: '0 2px 12px rgba(var(--st-accent), 0.15), inset 0 1px 0 rgba(var(--st-text-primary), 0.08)',
              border: '1px solid rgba(var(--st-accent), 0.20)',
            };

            if (to) {
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    `relative flex items-center h-11 rounded-xl overflow-hidden transition-all duration-200
                     ${collapsed ? 'justify-center' : ''}
                     ${isActive ? 'text-white' : 'text-st-textSecondary hover:text-white'}`
                  }
                  style={({ isActive }) => isActive ? activeStyles : {}}
                >
                  {({ isActive }) => content(isActive)}
                </NavLink>
              );
            }

            return (
              <button
                key={label}
                onClick={onClick}
                title={collapsed ? label : undefined}
                className={`relative flex items-center h-11 rounded-xl overflow-hidden transition-all duration-200 text-st-textSecondary hover:text-white hover:bg-white/10 ${collapsed ? 'justify-center' : ''}`}
              >
                {content(false)}
              </button>
            );
          })}
        </nav>


        {/* ── Bottom Actions ── */}
        <div className="mt-auto flex flex-col gap-1 px-2 pt-2 border-t border-white/8">
          {BOTTOM_ITEMS.map((item) => {
            const { to, icon: Icon, label, onClick, isAnimToggle } = item;
            const commonProps = {
              key: label,
              title: collapsed ? label : undefined,
              className: `flex items-center h-11 w-full rounded-xl transition-colors duration-200 ${collapsed ? 'justify-center' : ''} text-st-textSecondary hover:text-white hover:bg-white/10`,
            };

            const innerContent = (
              <>
                <span style={{ width: ICON_CELL, minWidth: ICON_CELL }} className="flex items-center justify-center flex-shrink-0">
                  <Icon size={17} />
                </span>
                <span
                  className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-500"
                  style={{ maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1 }}
                >
                  {label}
                </span>
              </>
            );

            if (to) {
              return (
                <NavLink 
                  key={to}
                  to={to} 
                  {...commonProps} 
                  className={({ isActive }) => `${commonProps.className} ${isActive ? 'bg-white/10 text-white' : ''}`}
                >
                  {innerContent}
                </NavLink>
              );
            }

            return (
              <button key={label} onClick={onClick} {...commonProps}>
                {innerContent}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default Sidebar;
