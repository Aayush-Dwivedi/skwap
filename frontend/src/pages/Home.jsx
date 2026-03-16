import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { X, Clock, MessageSquare, Zap, ChevronDown, BookOpen } from 'lucide-react';
import ListingCard from '../components/ListingCard';

const Home = () => {
  const [tab, setTab] = useState('LEARNING');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const { user } = useAuth();

  const handleToggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const targetType = tab === 'LEARNING' ? 'TEACH' : 'LEARN';
        const { data } = await api.get(`/listings?type=${targetType}`);
        setListings(data);
      } catch (error) {
        console.error('Error fetching listings', error);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [tab]);

  const filteredListings = listings.filter(
    listing =>
      listing.skillName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header Tabs & Search */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
        <div className="bg-skwap-card/40 p-1 rounded-full inline-flex flex-shrink-0 border border-skwap-card self-start xl:self-auto shadow-sm">
          <button
            onClick={() => setTab('LEARNING')}
            className={`text-sm font-medium px-8 py-2.5 rounded-full transition-all duration-300 ${tab === 'LEARNING' ? 'bg-skwap-buttonFocus text-white shadow-md' : 'text-skwap-textSecondary hover:text-white hover:bg-skwap-card/50'}`}
          >
            I want to Learn
          </button>
          <button
            onClick={() => setTab('TEACHING')}
            className={`text-sm font-medium px-8 py-2.5 rounded-full transition-all duration-300 ${tab === 'TEACHING' ? 'bg-skwap-buttonFocus text-white shadow-md' : 'text-skwap-textSecondary hover:text-white hover:bg-skwap-card/50'}`}
          >
            I want to Teach
          </button>
        </div>

        <div className="flex items-center w-full xl:w-auto">
          <div className="relative flex-grow xl:flex-none">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8B9BF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${tab === 'LEARNING' ? 'skills to learn' : 'people to teach'}...`}
              className="bg-white/5 border border-white/15 text-white text-sm rounded-full pl-11 pr-5 py-3 w-full xl:w-96 focus:outline-none focus:ring-2 focus:ring-skwap-accent focus:border-skwap-accent placeholder-skwap-textSecondary transition-all"
            />
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
          {tab === 'LEARNING' ? 'Discover Skills to Swap' : 'Share Your Expertise'}
        </h1>
        <p className="text-skwap-textSecondary text-sm">
          {tab === 'LEARNING' ? 'Click any card to book a session instantly.' : 'Help others grow and earn credits or new skills in return.'}
        </p>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-3xl h-80 bg-skwap-card/30 border border-skwap-card/20 animate-pulse" />
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="text-skwap-textSecondary text-center py-20 bg-skwap-card/20 rounded-3xl border border-skwap-card/50 border-dashed">
          No listings found in this category. Be the first to add one!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {filteredListings.map((listing) => (
            <ListingCard
              key={listing._id}
              listing={listing}
              currentUserId={user?._id}
              onBook={setSelectedListing}
              isExpanded={expandedId === listing._id}
              onToggle={handleToggleExpand}
            />
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedListing && (
        <BookingModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </div>
  );
};


/* ─────────────────────────── BOOKING MODAL ─────────────────────────── */
const BookingModal = ({ listing, onClose }) => {
  const { profile } = useAuth();
  const [duration, setDuration] = useState(1);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const matchedSkill = profile?.currentSkills?.find(skill => 
    listing.barterSkills && listing.barterSkills.some(bs => bs.toLowerCase() === skill.toLowerCase())
  );

  const totalCredits = listing.creditsPerHour * duration;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      console.log('Sending session request to /requests:', { listingId: listing._id, durationHours: duration });
      await api.post('/requests', {
        listingId: listing._id,
        durationHours: duration,
        message,
      });
      toast.success(`Session request sent to ${listing.uploader?.name || 'User'}! 🎉`);
      onClose();
    } catch (err) {
      console.error('Session request failed:', err.response?.data || err);
      toast.error(err.response?.data?.message || 'Failed to send request. Check your profile and credits.');
    } finally {
      setSubmitting(false);
    }
  };

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-[#1E1218] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-[slideUp_0.25s_ease]">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-white/8">
          <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 transition-colors">
            <X size={16} className="text-white/70" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/10 flex-shrink-0">
              <img
                src={listing.uploader?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.uploader?.name || 'User'}`}
                alt={listing.uploader?.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.uploader?.name || 'User'}`; }}
              />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">{listing.skillName}</h3>
              <p className="text-skwap-textSecondary text-sm">with {listing.uploader?.name || 'User'}</p>
            </div>
          </div>

          {/* Listing meta pills */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <span className="text-[11px] font-semibold px-2.5 py-1 bg-white/8 border border-white/10 rounded-full text-white/70 uppercase tracking-wider">{listing.method}</span>
            {listing.creditsPerHour > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-amber-500/15 border border-amber-500/25 rounded-full text-amber-300 flex items-center gap-1">
                <Zap size={10} /> {listing.creditsPerHour} credits / hr
              </span>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Booking Type Summary */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/40 text-xs uppercase font-bold tracking-widest">Type</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${
                (listing.method === 'BARTER' || (listing.method === 'BOTH' && matchedSkill)) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {(listing.method === 'BARTER' || (listing.method === 'BOTH' && matchedSkill)) ? 'Barter Swap' : 'Credit Booking'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-xs uppercase font-bold tracking-widest">Cost</span>
              <div className="flex items-center gap-1.5">
                {(listing.method === 'BARTER' || (listing.method === 'BOTH' && matchedSkill)) ? (
                  <>
                    <BookOpen size={12} className="text-emerald-400" />
                    <span className="text-white text-sm font-bold">Offer #{matchedSkill || 'Matching Skill'}</span>
                  </>
                ) : (
                  <>
                    <Zap size={12} className="text-amber-400" />
                    <span className="text-white text-sm font-bold">{listing.creditsPerHour * duration} credits</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-skwap-textSecondary text-xs font-semibold uppercase tracking-wider">
              <Clock size={12} /> Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setDuration(h)}
                  className={`py-2 rounded-xl text-sm font-semibold border transition-all ${
                    duration === h
                      ? 'bg-skwap-buttonFocus border-skwap-buttonFocus text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-skwap-textSecondary hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="flex items-center gap-1.5 text-skwap-textSecondary text-xs font-semibold mb-3 uppercase tracking-wider">
              <MessageSquare size={12} /> Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder={`Tell ${listing.uploader?.name || 'User'} what you'd like to learn...`}
              className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/25 resize-none transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-medium text-skwap-textSecondary hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-skwap-buttonFocus hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {submitting ? 'Sending...' : 'Request Session'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Home;
