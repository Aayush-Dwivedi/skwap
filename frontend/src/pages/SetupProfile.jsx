import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { User, Image as ImageIcon, Briefcase, GraduationCap, ArrowRight } from 'lucide-react';

const SetupProfile = () => {
  const { user, setHasProfile, setProfile } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    photoUrl: '',
    currentSkills: '',
    skillsToLearn: ''
  });

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('image', file);

    setUploading(true);
    try {
      const { data } = await api.post('/upload', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // Backend returns url like "/uploads/image-123.jpg"
      // We prepend the base API URL if needed, but since we serve statically at /uploads
      // and frontend is on 5173, backend on 5000, we need the full URL
      const fullUrl = `http://localhost:5000${data.url}`;
      setFormData({ ...formData, photoUrl: fullUrl });
      toast.success('Photo uploaded!');
    } catch (err) {
      toast.error('Failed to upload photo');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: updatedProfile } = await api.post('/profile', {
        name: formData.name,
        photoUrl: formData.photoUrl,
        currentSkills: formData.currentSkills.split(',').map(s => s.trim()).filter(s => s),
        skillsToLearn: formData.skillsToLearn.split(',').map(s => s.trim()).filter(s => s),
      });
      toast.success('Profile created successfully! Welcome to Skwap.');
      setProfile(updatedProfile); // Sync to global sidebar instantly
      setHasProfile(true); // Release the guard
      navigate('/explore'); // Explicitly move to dashboard
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to create profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-skwap-bgPrimary bg-gradient-to-br from-skwap-bgPrimary to-skwap-light/20 flex items-center justify-center p-4">
      <div className="bg-skwap-card/30 backdrop-blur-xl border border-skwap-card/50 p-8 rounded-[2rem] shadow-2xl w-full max-w-2xl">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold text-white mb-3">Complete Your Profile</h2>
          <p className="text-skwap-textSecondary text-lg">Just a few more details to get you started in the community.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Basic Info */}
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-white text-sm font-semibold mb-2">
                  <User size={18} className="text-skwap-accent" /> Full Name
                </label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Alex Johnson" 
                  className="w-full bg-skwap-cardLight/10 border border-skwap-card/50 text-white rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/20 transition-all"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-white text-sm font-semibold mb-3">
                  <ImageIcon size={18} className="text-skwap-accent" /> Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-skwap-cardLight/10 border border-skwap-card/50 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {formData.photoUrl ? (
                      <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-white/20">
                         <User size={32} />
                      </div>
                    )}
                  </div>
                  <label className="flex-grow cursor-pointer box-border">
                    <div className="w-full bg-skwap-cardLight/10 hover:bg-skwap-cardLight/20 border border-skwap-card/50 border-dashed text-white rounded-2xl px-5 py-4 text-center transition-all">
                      <span className="text-xs font-medium text-skwap-textSecondary block mb-1">
                        {uploading ? 'Uploading...' : 'Click to upload photo'}
                      </span>
                      <span className="text-[10px] text-white/30">JPG or PNG, max 5MB</span>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-white text-sm font-semibold mb-2">
                  <Briefcase size={18} className="text-skwap-accent" /> Skills You Can Teach
                </label>
                <textarea 
                  name="currentSkills"
                  value={formData.currentSkills}
                  onChange={handleChange}
                  required
                  rows={2}
                  placeholder="React, Design, Piano (comma separated)" 
                  className="w-full bg-skwap-cardLight/10 border border-skwap-card/50 text-white rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/20 transition-all resize-none"
                ></textarea>
              </div>
              <div>
                <label className="flex items-center gap-2 text-white text-sm font-semibold mb-2">
                  <GraduationCap size={18} className="text-skwap-accent" /> Skills You Want to Learn
                </label>
                <textarea 
                  name="skillsToLearn"
                  value={formData.skillsToLearn}
                  onChange={handleChange}
                  required
                  rows={2}
                  placeholder="Python, Cooking, Karate (comma separated)" 
                  className="w-full bg-skwap-cardLight/10 border border-skwap-card/50 text-white rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/20 transition-all resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-skwap-accent hover:bg-skwap-accent/80 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-skwap-accent/20 flex items-center justify-center gap-2 text-lg disabled:opacity-50"
            >
              {submitting ? 'Setting up...' : (
                <>
                  Ready to Go <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetupProfile;
