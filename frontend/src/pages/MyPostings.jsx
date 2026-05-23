import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X, Clock, MessageSquare, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import { useChat } from '../contexts/ChatContext';
import toast from 'react-hot-toast';

const MyPostings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const { user } = useAuth();
  const { isOpen } = useChat();

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

  const handleDeleteListing = async (id) => {
    if (window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      try {
        await api.delete(`/listings/${id}`);
        toast.success('Listing deleted successfully');
        setListings(prev => prev.filter(item => item._id !== id));
        setSelectedListing(null);
      } catch (error) {
        console.error('Failed to delete listing', error);
        toast.error(error.response?.data?.message || 'Failed to delete listing');
      }
    }
  };

  return (
    <div>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">My Postings</h1>
          <p className="text-st-textSecondary text-sm">
            Manage your teaching and learning requests.
          </p>
        </div>
        <Link 
          to="/create-request"
          className="glass-btn text-white shadow-lg rounded-xl px-5 py-2.5 flex items-center gap-2 font-medium transition-all"
        >
          <Plus className="w-5 h-5" />
          Create New Listing
        </Link>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="text-white">Loading your postings...</div>
      ) : listings.length === 0 ? (
        <div className="text-st-textSecondary text-center py-20 glass rounded-3xl border-dashed border-white/20">
          You haven't posted any skills to teach or learn yet!
        </div>
      ) : (
        <div className={`grid gap-6 items-start ${
          isOpen 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3' 
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
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
          onDelete={handleDeleteListing}
        />
      )}
    </div>
  );
};

const PreviewModal = ({ listing, onClose, onDelete }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="glass-strong rounded-t-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full relative border border-white/15 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white">
          <X size={20} />
        </button>
        <h3 className="text-xl font-bold text-white mb-2">Listing Preview</h3>
        <p className="text-st-textSecondary text-sm mb-6">This is how others see your skill card.</p>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
            <Zap className="text-amber-400" size={20} />
            <div>
              <p className="text-white font-bold text-sm">1 credit / hr</p>
              <p className="text-white/40 text-[10px] uppercase">Exchange Rate</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
            <Clock className="text-st-accent" size={20} />
            <div>
              <p className="text-white font-bold text-sm">{listing.availability || 'Flexible Schedule'}</p>
              <p className="text-white/40 text-[10px] uppercase">Availability</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex flex-col gap-3">
          <div className="flex gap-3">
            <Link to={`/edit-listing/${listing._id}`} className="flex-1 glass text-white font-bold py-3 rounded-xl text-center hover:bg-white/10 transition-all border border-white/10">
              Edit Listing
            </Link>
            <button onClick={() => onDelete(listing._id)} className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-3 rounded-xl transition-all">
              Delete Listing
            </button>
          </div>
          <button onClick={onClose} className="w-full glass-btn text-white font-bold py-3 rounded-xl transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyPostings;
