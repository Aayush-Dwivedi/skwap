import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X, Clock, MessageSquare, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import ListingCard from '../components/ListingCard';

const MyPostings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const { user } = useAuth();

  const handleToggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  useEffect(() => {
    const fetchMyListings = async () => {
      try {
        const { data } = await api.get('/listings/me');
        setListings(data);
      } catch (error) {
        console.error('Error fetching my listings', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyListings();
  }, []);

  return (
    <div>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">My Postings</h1>
          <p className="text-skwap-textSecondary text-sm">
            Manage your teaching and learning requests.
          </p>
        </div>
        <Link 
          to="/create-request"
          className="bg-skwap-buttonFocus hover:bg-white hover:text-skwap-bgPrimary border border-white/10 text-white shadow-lg rounded-xl px-5 py-2.5 flex items-center gap-2 font-medium transition-all"
        >
          <Plus className="w-5 h-5" />
          Create New Listing
        </Link>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="text-white">Loading your postings...</div>
      ) : listings.length === 0 ? (
        <div className="text-skwap-textSecondary text-center py-20 bg-skwap-card/20 rounded-3xl border border-skwap-card/50 border-dashed">
          You haven't posted any skills to teach or learn yet!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {listings.map((listing) => (
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

      {/* Preview Modal for My Postings */}
      {selectedListing && (
        <PreviewModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </div>
  );
};

const PreviewModal = ({ listing, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1E1218] border border-white/10 rounded-3xl p-8 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white">
          <X size={20} />
        </button>
        <h3 className="text-xl font-bold text-white mb-2">Listing Preview</h3>
        <p className="text-skwap-textSecondary text-sm mb-6">This is how others see your skill card.</p>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
            <Zap className="text-amber-400" size={20} />
            <div>
              <p className="text-white font-bold text-sm">{listing.creditsPerHour} credits / hr</p>
              <p className="text-white/40 text-[10px] uppercase">Exchange Rate</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
            <Clock className="text-skwap-accent" size={20} />
            <div>
              <p className="text-white font-bold text-sm">{listing.availability || 'Flexible Schedule'}</p>
              <p className="text-white/40 text-[10px] uppercase">Availability</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex gap-3">
          <Link to={`/edit-listing/${listing._id}`} className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl text-center transition-all">
            Edit Listing
          </Link>
          <button onClick={onClose} className="flex-1 bg-skwap-buttonFocus text-white font-bold py-3 rounded-xl transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyPostings;
