import React from 'react';
import { Clock, Zap, ChevronRight, User, BookOpen, GraduationCap, Calendar } from 'lucide-react';

const ListingCard = ({ listing, currentUserId, onBook, isExpanded = false, onToggle = () => {} }) => {
  const isOwn = listing.user?._id === currentUserId || listing.user === currentUserId;

  const handleToggle = (e) => {
    if (e.target.closest('.no-expand')) return;
    onToggle(listing._id);
  };

  return (
    <div 
      className={`group relative rounded-[2rem] border transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden cursor-pointer
        ${isExpanded ? 'shadow-2xl scale-[1.01]' : 'hover:shadow-xl hover:-translate-y-0.5'}
      `}
      style={{
        background: isExpanded
          ? 'linear-gradient(135deg, rgba(80,55,65,0.75) 0%, rgba(55,35,45,0.85) 100%)'
          : 'linear-gradient(135deg, rgba(60,38,48,0.70) 0%, rgba(42,26,33,0.80) 100%)',
        border: isExpanded ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.09)',
        boxShadow: isExpanded
          ? '0 20px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.2)'
          : '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)',
      }}
      onClick={handleToggle}
    >
      {/* Background Glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-skwap-accent/10 rounded-full blur-3xl transition-opacity duration-500 ${isExpanded ? 'opacity-100' : 'opacity-40'}`}></div>

      <div className="p-4 relative z-10">
        
        {/* Top Header: Uploader Info & Badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10 bg-white/5 flex-shrink-0">
              <img 
                src={listing.uploader?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.uploader?.name}`} 
                alt={listing.uploader?.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.uploader?.name}`; }}
              />
            </div>
            <div>
              <p className="text-white font-bold text-xs tracking-tight">{listing.uploader?.name || 'User'}</p>
              <p className="text-white/40 text-[9px] font-medium uppercase tracking-wider">Skwap Member</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-white/8 backdrop-blur-md text-white/70 border border-white/10 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
              {listing.method}
            </span>
            {isOwn && (
              <span className="bg-skwap-accent/20 text-skwap-accent border border-skwap-accent/30 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                Yours
              </span>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="mb-3">
          <h3 className="text-white font-black text-base tracking-tight mb-1 group-hover:text-skwap-accent transition-colors leading-tight">
            {listing.skillName}
          </h3>
          <p className={`text-white/50 text-[11px] leading-relaxed transition-all duration-500 ${isExpanded ? 'line-clamp-none' : 'line-clamp-1'}`}>
            {listing.description}
          </p>
        </div>

        {/* Details Grid (Schedule & Skills) */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-white/[0.06] border border-white/10 px-2.5 py-2 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1 text-skwap-accent">
              <Calendar size={10} strokeWidth={2.5} />
              <span className="text-[8px] font-black uppercase tracking-wider">Schedule</span>
            </div>
            <p className="text-white/70 text-[10px] font-medium line-clamp-1">
              {listing.availability || 'Flexible'}
            </p>
          </div>
          <div className="bg-white/[0.06] border border-white/10 px-2.5 py-2 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1 text-skwap-accent">
              <Zap size={10} strokeWidth={2.5} />
              <span className="text-[8px] font-black uppercase tracking-wider">Exchange</span>
            </div>
            <p className="text-white/70 text-[10px] font-bold">
              {listing.creditsPerHour > 0 ? `${listing.creditsPerHour} cr/hr` : 'Barter Only'}
            </p>
          </div>
        </div>

        {/* Skills Section (Unified Design) */}
        <div className={`mt-2 space-y-2 transition-all duration-500 overflow-hidden ${isExpanded ? 'opacity-100 max-h-96' : 'opacity-100 max-h-10'}`}>
          <div>
            <div className="flex items-center gap-1 mb-1 text-white/30">
              <BookOpen size={9} />
              <span className="text-[8px] font-bold uppercase tracking-widest">Can Teach</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {(listing.uploader?.currentSkills?.length > 0 ? listing.uploader.currentSkills : [listing.skillName]).slice(0, isExpanded ? 10 : 3).map((s, idx) => (
                <span key={idx} className="bg-white/10 border border-white/15 text-white/75 text-[8px] font-medium px-1.5 py-0.5 rounded-md whitespace-nowrap lowercase">
                  #{s}
                </span>
              ))}
              {!isExpanded && listing.uploader?.currentSkills?.length > 3 && (
                <span className="text-white/20 text-[8px] font-bold ml-0.5">+{listing.uploader.currentSkills.length - 3}</span>
              )}
            </div>
          </div>

          <div className={isExpanded ? 'block' : 'hidden'}>
            <div className="flex items-center gap-1 mb-1 text-white/30">
              <GraduationCap size={9} />
              <span className="text-[8px] font-bold uppercase tracking-widest">Wants to Learn</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {(listing.barterSkills?.length > 0 ? listing.barterSkills : listing.uploader?.skillsToLearn || []).map((s, idx) => (
                <span key={idx} className="bg-skwap-accent/15 border border-skwap-accent/30 text-skwap-accent text-[8px] font-medium px-1.5 py-0.5 rounded-md whitespace-nowrap lowercase">
                  #{s}
                </span>
              ))}
              {(listing.barterSkills?.length === 0 && (!listing.uploader?.skillsToLearn || listing.uploader.skillsToLearn.length === 0)) && (
                <span className="text-white/20 text-[8px] italic">Flexible</span>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Profile Detail */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-bold text-xs">Uploader Details</h4>
              <div className="flex items-center gap-1 text-amber-400">
                <Zap size={10} fill="currentColor" />
                <span className="text-xs font-black">{listing.uploader?.rating || 'New'}</span>
              </div>
            </div>
            
            {/* Action Section */}
            {!isOwn && (
              <button 
                onClick={(e) => { e.stopPropagation(); onBook(listing); }}
                className="no-expand w-full bg-skwap-buttonFocus hover:brightness-110 active:scale-95 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-skwap-accent/20 transition-all text-sm"
              >
                <span>Book a Session</span>
                <ChevronRight size={14} />
              </button>
            )}
            {isOwn && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-white/40 text-xs font-medium italic">This is your listing</p>
              </div>
            )}
          </div>
        )}

        {/* View Details Indicator (when collapsed) */}
        {!isExpanded && (
          <div className="mt-2 flex items-center justify-center">
            <div className="w-6 h-0.5 rounded-full bg-white/5 group-hover:bg-skwap-accent/40 transition-colors"></div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ListingCard;
