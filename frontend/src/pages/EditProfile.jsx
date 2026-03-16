import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { User, Image as ImageIcon, Briefcase, GraduationCap, Github, Linkedin, ExternalLink, Twitter, LogOut } from 'lucide-react';

const EditProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    photoUrl: '',
    currentSkills: '',
    skillsToLearn: '',
    github: '',
    linkedin: '',
    twitter: '',
    portfolio: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const { profile, setProfile, setUser } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/profile/me');
        setFormData(prev => ({
          ...prev,
          name: data.name || '',
          photoUrl: data.photoUrl || '',
          currentSkills: data.currentSkills?.join(', ') || '',
          skillsToLearn: data.skillsToLearn?.join(', ') || '',
          github: data.socialLinks?.github || '',
          linkedin: data.socialLinks?.linkedin || '',
          twitter: data.socialLinks?.twitter || '',
          portfolio: data.socialLinks?.portfolio || '',
          email: user?.email || '',
        }));
      } catch (error) {
        console.log('No profile found, starting fresh');
        setFormData(prev => ({ ...prev, email: user?.email || '' }));
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchProfile();
    }
  }, [user]);

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
      const fullUrl = `http://localhost:5000${data.url}`;
      setFormData({ ...formData, photoUrl: fullUrl });
    } catch (err) {
      console.error(err);
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      // 1. Update Profile Details
      const { data: updatedProfile } = await api.post('/profile', {
        name: formData.name,
        photoUrl: formData.photoUrl,
        currentSkills: formData.currentSkills.split(',').map(s => s.trim()).filter(s => s),
        skillsToLearn: formData.skillsToLearn.split(',').map(s => s.trim()).filter(s => s),
        socialLinks: {
          github: formData.github,
          linkedin: formData.linkedin,
          twitter: formData.twitter,
          portfolio: formData.portfolio,
        }
      });

      // Update global profile state instantly
      setProfile(updatedProfile);

      // 2. Update Account Details (Password) if provided
      if (formData.password) {
        const { data: updatedUser } = await api.put('/auth/profile', {
          password: formData.password
        });
        localStorage.setItem('userInfo', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }

      toast.success('Settings updated successfully!');
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Your Profile</h1>
        <p className="text-skwap-textSecondary">Complete your profile to start bartering skills with the community.</p>
      </div>

      <div className="bg-skwap-card/30 border border-skwap-card rounded-3xl p-8 backdrop-blur-sm shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-skwap-buttonFocus/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 border-b border-skwap-card pb-2">
              <User size={18} className="text-skwap-accent" /> Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-skwap-textSecondary text-xs font-medium mb-1.5 ml-1">Full Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Alex Johnson" 
                  className="w-full bg-skwap-cardLight/5 border border-skwap-card/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/20 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-skwap-textSecondary text-xs font-medium mb-1.5 ml-1">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-skwap-cardLight/5 border border-skwap-card/50 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {formData.photoUrl ? (
                      <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={20} className="text-white/20" />
                    )}
                  </div>
                  <label className="flex-grow cursor-pointer">
                    <div className="w-full bg-skwap-cardLight/5 hover:bg-skwap-card/10 border border-skwap-card/50 border-dashed text-white rounded-xl px-4 py-2.5 text-center transition-all">
                      <span className="text-[11px] font-medium text-skwap-textSecondary">
                        {uploading ? 'Uploading...' : 'Click to change photo'}
                      </span>
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
          </div>

          {/* Skills */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 border-b border-skwap-card pb-2">
              <Briefcase size={18} className="text-skwap-accent" /> Skill Exchange
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-skwap-textSecondary text-xs font-medium mb-1.5 ml-1">
                  Skills You Can Teach <span className="text-white/30">(comma-separated)</span>
                </label>
                <textarea 
                  name="currentSkills"
                  value={formData.currentSkills}
                  onChange={handleChange}
                  rows={3}
                  placeholder="React, Graphql, UI Design" 
                  className="w-full bg-skwap-cardLight/5 border border-skwap-card/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/20 transition-all resize-none text-sm leading-relaxed"
                ></textarea>
              </div>
              <div>
                <label className="block text-skwap-textSecondary text-xs font-medium mb-1.5 ml-1">
                  Skills You Want to Learn <span className="text-white/30">(comma-separated)</span>
                </label>
                <textarea 
                  name="skillsToLearn"
                  value={formData.skillsToLearn}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Machine Learning, French, Guitar" 
                  className="w-full bg-skwap-cardLight/5 border border-skwap-card/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/20 transition-all resize-none text-sm leading-relaxed"
                ></textarea>
              </div>
            </div>
          </div>
          {/* Social Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 border-b border-skwap-card pb-2">
              <ExternalLink size={18} className="text-skwap-accent" /> Connect Online
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <input 
                  type="url" name="github" value={formData.github} onChange={handleChange}
                  placeholder="GitHub URL" 
                  className="w-full bg-skwap-cardLight/5 border border-skwap-card/50 text-white rounded-xl px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/20 transition-all text-sm"
                />
                <Github size={16} className="absolute inset-y-0 left-4 my-auto text-white/40" />
              </div>
              <div className="relative">
                <input 
                  type="url" name="linkedin" value={formData.linkedin} onChange={handleChange}
                  placeholder="LinkedIn URL" 
                  className="w-full bg-skwap-cardLight/5 border border-skwap-card/50 text-white rounded-xl px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/20 transition-all text-sm"
                />
                <Linkedin size={16} className="absolute inset-y-0 left-4 my-auto text-white/40" />
              </div>
              <div className="relative">
                <input 
                  type="url" name="twitter" value={formData.twitter} onChange={handleChange}
                  placeholder="Twitter / X URL" 
                  className="w-full bg-skwap-cardLight/5 border border-skwap-card/50 text-white rounded-xl px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/20 transition-all text-sm"
                />
                <Twitter size={16} className="absolute inset-y-0 left-4 my-auto text-white/40" />
              </div>
              <div className="relative">
                <input 
                  type="url" name="portfolio" value={formData.portfolio} onChange={handleChange}
                  placeholder="Personal Portfolio URL" 
                  className="w-full bg-skwap-cardLight/5 border border-skwap-card/50 text-white rounded-xl px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/20 transition-all text-sm"
                />
                <ExternalLink size={16} className="absolute inset-y-0 left-4 my-auto text-white/40" />
              </div>
            </div>
          </div>

          {/* Account Security */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 border-b border-skwap-card pb-2">
              <LogOut size={18} className="rotate-180 text-skwap-accent" /> Account Security
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-skwap-textSecondary text-xs font-medium mb-1.5 ml-1 flex items-center gap-1.5">
                  Email Address <span className="text-[10px] text-white/20 italic">(Read-only)</span>
                </label>
                <input 
                  type="email" 
                  value={formData.email}
                  readOnly
                  className="w-full bg-white/5 border border-white/10 text-white/50 rounded-xl px-4 py-3 text-sm cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-1 border-l border-skwap-card pl-0 md:pl-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-skwap-textSecondary text-xs font-medium mb-1.5 ml-1">New Password</label>
                    <input 
                      type="password" 
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Leave blank to keep current" 
                      className="w-full bg-skwap-cardLight/5 border border-skwap-card/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/20 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-skwap-textSecondary text-xs font-medium mb-1.5 ml-1">Confirm New Password</label>
                    <input 
                      type="password" 
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm new password" 
                      className="w-full bg-skwap-cardLight/5 border border-skwap-card/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-skwap-buttonFocus placeholder-white/20 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-skwap-card mt-8">
            <button type="button" onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-xl text-sm font-medium text-skwap-textSecondary hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-8 py-2.5 bg-skwap-card hover:bg-skwap-buttonFocus text-white text-sm font-medium rounded-xl shadow-lg border border-skwap-card transition-all disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditProfile;
