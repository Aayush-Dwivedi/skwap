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
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max size is 10MB.');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('image', file);

    setUploading(true);
    try {
      const { data } = await api.post('/upload', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // Backend now returns full Cloudinary URL or absolute path
      const apiBase = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') : 'http://localhost:5000';
      const fullUrl = data.url.startsWith('http') ? data.url : `${apiBase}${data.url}`;
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
      toast.success('Profile created successfully! Welcome to Skill Trade.');
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
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="glass-strong p-10 rounded-[3rem] shadow-2xl w-full max-w-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-st-accent/10 rounded-full blur-[100px] -mr-16 -mt-16 pointer-events-none"></div>
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold text-st-textPrimary mb-3">Complete Your Profile</h2>
          <p className="text-st-textSecondary text-lg">Just a few more details to get you started in the community.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Basic Info */}
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-st-textSecondary text-sm font-bold mb-3">
                  <User size={18} className="text-st-accent" /> Full Name
                </label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Alex Johnson" 
                  className="w-full glass-input rounded-2xl px-5 py-4 placeholder-white/20 transition-all font-medium"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-st-textSecondary text-sm font-bold mb-3">
                  <ImageIcon size={18} className="text-st-accent" /> Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl glass border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-inner">
                    {formData.photoUrl ? (
                      <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-white/20">
                         <User size={32} />
                      </div>
                    )}
                  </div>
                  <label className="flex-grow cursor-pointer box-border">
                    <div className="w-full glass hover:bg-white/10 border border-white/20 border-dashed text-white rounded-2xl px-5 py-4 text-center transition-all">
                      <span className="text-xs font-bold text-st-accent block mb-1">
                        {uploading ? 'Uploading...' : 'Click to upload photo'}
                      </span>
                      <span className="text-[10px] text-st-textSecondary font-bold">JPG or PNG, max 5MB</span>
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
                <label className="flex items-center gap-2 text-st-textSecondary text-sm font-bold mb-3">
                  <Briefcase size={18} className="text-st-accent" /> Skills You Can Teach
                </label>
                <textarea 
                  name="currentSkills"
                  value={formData.currentSkills}
                  onChange={handleChange}
                  required
                  rows={2}
                  placeholder="React, Design, Piano (comma separated)" 
                  className="w-full glass-input rounded-2xl px-5 py-4 placeholder-white/20 transition-all resize-none font-medium h-24"
                ></textarea>
              </div>
              <div>
                <label className="flex items-center gap-2 text-st-textSecondary text-sm font-bold mb-3">
                  <GraduationCap size={18} className="text-st-accent" /> Skills You Want to Learn
                </label>
                <textarea 
                  name="skillsToLearn"
                  value={formData.skillsToLearn}
                  onChange={handleChange}
                  required
                  rows={2}
                  placeholder="Python, Cooking, Karate (comma separated)" 
                  className="w-full glass-input rounded-2xl px-5 py-4 placeholder-white/20 transition-all resize-none font-medium h-24"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={submitting}
              className="w-full glass-btn text-white font-black py-5 rounded-2xl transition-all shadow-2xl flex items-center justify-center gap-3 text-xl disabled:opacity-50 uppercase tracking-widest"
            >
              {submitting ? 'Setting up...' : (
                <>
                  Ready to Go <ArrowRight size={24} />
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
