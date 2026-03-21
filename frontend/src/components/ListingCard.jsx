import React from 'react';
import { Clock, Zap, ChevronRight, User, BookOpen, GraduationCap, Calendar, Github, Linkedin, Twitter, ExternalLink, Star } from 'lucide-react';

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
        background: `linear-gradient(135deg, rgba(var(--skwap-card), var(--glass-card-opacity)) 0%, rgba(var(--skwap-bg-primary), var(--glass-card-opacity)) 100%)`,
        backdropFilter: 'blur(var(--glass-blur)) saturate(1.5)',
        WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(1.5)',
        border: isExpanded ? '1px solid rgba(var(--skwap-text-primary), 0.18)' : '1px solid rgba(var(--skwap-text-primary), 0.10)',
        boxShadow: isExpanded
          ? '0 24px 50px rgba(0,0,0,0.30), 0 0 30px rgba(var(--skwap-accent), 0.15), inset 0 1.5px 0 rgba(var(--skwap-text-primary), 0.15)'
          : '0 6px 20px rgba(0,0,0,0.20), inset 0 1px 0 rgba(var(--skwap-text-primary), 0.09)',
      }}
      onClick={handleToggle}
    >
      {/* Background Glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-skwap-accent/10 rounded-full blur-3xl transition-opacity duration-500 ${isExpanded ? 'opacity-100' : 'opacity-40'}`}></div>

      <div className="p-5 relative z-10 flex flex-col h-full w-full">
        
        {/* Header: Avatar, Name & Rating */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 shadow-sm">
              <img 
                src={listing.uploader?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.uploader?.name}`} 
                alt={listing.uploader?.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.uploader?.name}`; }}
              />
            </div>
            {isOwn && (
              <span className="absolute -bottom-2 right-1 transform translate-x-1/4 bg-skwap-textSecondary text-[#1a1a1a] text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase shadow-md border border-white/20">
                YOU
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
             <h3 className="text-[15px] font-bold text-white leading-tight truncate">
               {listing.uploader?.name || 'User'}
             </h3>
             <div className="flex items-center gap-1.5 mt-0.5">
               <Star size={11} className="fill-amber-400 text-amber-400" />
               <span className="text-[12px] font-semibold text-skwap-textSecondary">
                 {listing.uploader?.rating > 0 ? listing.uploader.rating : 'New'}
               </span>
               {listing.uploader?.numReviews > 0 && (
                 <span className="text-[11px] text-white/50 font-medium tracking-tight">
                   ({listing.uploader.numReviews} reviews)
                 </span>
               )}
             </div>
          </div>
        </div>

        {/* Type & Title */}
        <div className="mb-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-skwap-textSecondary mb-1.5">
            {listing.type === 'TEACH' ? 'TEACHING' : 'LEARNING'}
          </h4>
          <h2 className="text-xl font-bold text-skwap-textSecondary leading-snug transition-colors">
            {listing.skillName}
          </h2>
        </div>

        {/* Looking For Block */}
        <div className="bg-skwap-textSecondary/10 rounded-xl p-4 mb-5 border border-skwap-textSecondary/20">
          <h4 className="text-[9px] font-black uppercase tracking-wider text-skwap-textSecondary mb-2">
            LOOKING FOR
          </h4>
          <p className="text-[13px] text-white/90 font-medium leading-relaxed">
            {(listing.barterSkills?.length > 0 ? listing.barterSkills : listing.uploader?.skillsToLearn || ['Flexible']).join(' or ')}
          </p>
        </div>

        {/* --- EXPANDED FEATURES (Preserved) --- */}
        <div className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[800px] opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
          {/* Description */}
          <div className="mb-4 px-1">
            <h4 className="text-[9px] font-black uppercase tracking-wider text-white/50 mb-1.5">Description</h4>
            <p className="text-[12.5px] text-white/80 leading-relaxed whitespace-pre-wrap">
              {listing.description}
            </p>
          </div>

          {/* Details Grid (Schedule & Exchange) */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-white/5 border border-white/5 px-3 py-2.5 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1 text-skwap-textSecondary">
                <Calendar size={12} strokeWidth={2.5} />
                <span className="text-[9px] font-black uppercase tracking-wider">Schedule</span>
              </div>
              <p className="text-white/80 text-[11px] font-semibold line-clamp-1">
                {listing.availability || 'Flexible'}
              </p>
            </div>
            <div className="bg-white/5 border border-white/5 px-3 py-2.5 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1 text-skwap-textSecondary">
                <Zap size={12} strokeWidth={2.5} />
                <span className="text-[9px] font-black uppercase tracking-wider">Exchange</span>
              </div>
              <p className="text-white/80 text-[11px] font-semibold line-clamp-1">
                {listing.method === 'BARTER' ? 'Barter Swap' : 'Credits Negotiable'}
              </p>
            </div>
          </div>

          {/* Additional Skills Tags */}
          <div className="mb-4">
            <div className="flex items-center gap-1 mb-2 text-white/50">
              <BookOpen size={10} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Also Teaches</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(listing.uploader?.currentSkills?.length > 0 ? listing.uploader.currentSkills : [listing.skillName]).map((s, idx) => (
                <span key={idx} className="bg-white/5 border border-white/10 text-white/70 text-[10px] font-medium px-2 py-1 rounded-md lowercase">
                  #{s}
                </span>
              ))}
            </div>
          </div>

          {/* Social Links */}
          {listing.uploader?.showSocialLinks && listing.uploader?.socialLinks && (
            <div className="pt-3 flex items-center gap-3 border-t border-white/5">
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/40 mr-1">Socials</div>
              <div className="flex items-center gap-3">
                {listing.uploader.socialLinks.github && (
                  <a href={listing.uploader.socialLinks.github} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-white/40 hover:text-skwap-textSecondary transition-colors no-expand">
                    <Github size={15} />
                  </a>
                )}
                {listing.uploader.socialLinks.linkedin && (
                  <a href={listing.uploader.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-white/40 hover:text-skwap-textSecondary transition-colors no-expand">
                    <Linkedin size={15} />
                  </a>
                )}
                {listing.uploader.socialLinks.twitter && (
                  <a href={listing.uploader.socialLinks.twitter} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-white/40 hover:text-skwap-textSecondary transition-colors no-expand">
                    <Twitter size={15} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions - Always Visible */}
        <div className="mt-auto pt-2">
          {/* Links Row */}
          <div className="flex items-center justify-end mb-5 min-h-[40px]">
            {(listing.portfolioLink || listing.uploader?.socialLinks?.portfolio) ? (
              <a 
                href={listing.portfolioLink || listing.uploader?.socialLinks?.portfolio} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => { e.stopPropagation(); }} 
                className="text-[13.5px] font-bold text-skwap-textSecondary hover:text-skwap-textSecondary/80 no-expand px-1"
              >
                View Portfolio
              </a>
            ) : (
              <span className="text-[12px] font-medium text-white/40 italic px-1">
                No portfolio available
              </span>
            )}
          </div>

          {/* Action Button */}
          {!isOwn ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onBook(listing); }}
              className="no-expand w-full bg-skwap-textSecondary hover:bg-skwap-textSecondary/90 text-[#1a1a1a] font-black py-4 rounded-xl transition-all text-[15px] tracking-wide shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Request Swap
            </button>
          ) : (
            <div className="w-full bg-white/5 border border-white/10 text-white/40 text-center font-semibold py-4 rounded-xl text-[15px] tracking-wide">
              Your Listing
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ListingCard;
