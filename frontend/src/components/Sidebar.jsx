import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, Calendar, Wallet, Plus, LogOut, Code2, LayoutGrid } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ICON_CELL = 36; // px — fixed width for every icon column

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
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

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
        // silently fail — don't break UI if notifications endpoint errors
        setUnreadCount(0);
      }
    };
    fetchUnread();
    // Refresh every 15 seconds quietly for a more live feel
    const interval = setInterval(fetchUnread, 15_000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div
      style={{ width: collapsed ? 72 : 240, willChange: 'width', transform: 'translateZ(0)' }}
      className="
        fixed top-6 left-6 bottom-6 z-50
        hidden md:flex flex-col
        bg-white/[0.05] backdrop-blur-2xl
        border border-white/10 rounded-[2rem]
        shadow-[0_8px_40px_rgba(0,0,0,0.4)]
        overflow-hidden
        transition-[width] duration-[420ms] ease-out
      "
    >
      <div className="flex flex-col h-full py-5">

        {/* ── Logo / Toggle ── */}
        <button
          onClick={onToggle}
          className={`flex items-center h-11 mb-4 mx-2 px-1 rounded-xl hover:bg-white/10 transition-colors duration-200 ${collapsed ? 'justify-center' : ''}`}
        >
          <span style={{ width: ICON_CELL, minWidth: ICON_CELL }} className="flex items-center justify-center">
            <span className="w-8 h-8 rounded-lg bg-skwap-buttonFocus flex items-center justify-center shadow-md">
              <Code2 size={15} className="text-white" />
            </span>
          </span>
          <span
            className="text-white font-bold text-[17px] tracking-tight whitespace-nowrap overflow-hidden transition-all duration-500"
            style={{ maxWidth: collapsed ? 0 : 180, opacity: collapsed ? 0 : 1 }}
          >
            Skwap
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
            <p className="text-[10px] text-skwap-textSecondary">View Settings</p>
          </div>
        </NavLink>

        {/* ── Nav Items ── */}
        <nav className="flex flex-col gap-0.5 flex-1 px-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label, exact, isNotif }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `relative flex items-center h-11 rounded-xl overflow-hidden transition-colors duration-200
                 ${collapsed ? 'justify-center' : ''}
                 ${isActive
                   ? 'bg-white/12 text-white'
                   : 'text-skwap-textSecondary hover:bg-white/8 hover:text-white'
                 }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-skwap-accent rounded-full" />
                  )}
                  {/* Icon cell */}
                  <span
                    style={{ width: ICON_CELL, minWidth: ICON_CELL }}
                    className="flex items-center justify-center flex-shrink-0 relative"
                  >
                    <Icon size={17} />
                    {/* Notification dot — visible even when collapsed */}
                    {isNotif && unreadCount > 0 && collapsed && (
                      <span className="absolute top-0 right-0.5 w-2 h-2 bg-skwap-accent rounded-full" />
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
                    <span className="ml-auto mr-3 bg-skwap-accent/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Logout ── */}
        <div className="px-2 pt-2 border-t border-white/8 mt-1">
          <button
            onClick={() => { logout(); navigate('/landing'); }}
            title={collapsed ? 'Logout' : undefined}
            className={`flex items-center h-11 w-full rounded-xl text-skwap-textSecondary hover:text-white hover:bg-white/10 transition-colors duration-200 ${collapsed ? 'justify-center' : ''}`}
          >
            <span style={{ width: ICON_CELL, minWidth: ICON_CELL }} className="flex items-center justify-center flex-shrink-0">
              <LogOut size={17} />
            </span>
            <span
              className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-500"
              style={{ maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1 }}
            >
              Logout
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default Sidebar;
