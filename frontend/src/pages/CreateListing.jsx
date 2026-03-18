import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, Info, Tag, Clock, ArrowRight, Briefcase, ExternalLink, GraduationCap } from 'lucide-react';

const CreateListing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'TEACH', // 'TEACH' or 'LEARN'
    skillName: '',
    description: '',
    method: 'BARTER', // 'BARTER', 'CREDITS', or 'BOTH'
    barterSkills: '',
    creditsPerHour: 1,
    availability: '',
    portfolioLink: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { ...formData };
    if (payload.barterSkills) {
      payload.barterSkills = payload.barterSkills.split(',').map(s => s.trim());
    } else {
      payload.barterSkills = [];
    }

    try {
      await api.post('/listings', payload);
      navigate('/');
    } catch (error) {
      console.error(error);
      alert('Failed to create listing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white mb-1">Create a new Listing</h1>
        <p className="text-skwap-textSecondary text-sm">Offer your expertise or request someone else's.</p>
      </div>

      <div className="glass-card rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden h-fit">
        {/* Decorative background glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-skwap-accent/15 rounded-full blur-[100px] pointer-events-none"></div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          
          {/* Type Toggle */}
          <div className="flex gap-3 p-1 glass rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'TEACH' })}
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
                formData.type === 'TEACH' 
                  ? 'glass-btn text-white shadow-md' 
                  : 'text-skwap-textSecondary hover:text-white'
              }`}
            >
              I am Teaching
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'LEARN' })}
              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
                formData.type === 'LEARN' 
                  ? 'glass-btn text-white shadow-md' 
                  : 'text-skwap-textSecondary hover:text-white'
              }`}
            >
              I want to Learn
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            
            {/* Left Column (Main Info) */}
            <div className="lg:col-span-2 space-y-3">
              <div>
                <label className="block text-skwap-textSecondary text-[10px] font-bold mb-1.5 uppercase tracking-wider ml-1">
                  What skill {formData.type === 'TEACH' ? 'are you offering?' : 'do you need?'}
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    name="skillName"
                    value={formData.skillName}
                    onChange={handleChange}
                    required
                    placeholder={formData.type === 'TEACH' ? 'e.g. Advanced React Patterns' : 'e.g. Conversational French'} 
                    className="w-full glass-input rounded-xl px-4 py-3 pl-10 placeholder-white/20 transition-all font-medium text-sm"
                  />
                  <Tag size={15} className="absolute inset-y-0 left-3.5 my-auto text-skwap-accent" />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-skwap-textSecondary text-sm font-bold mb-3">
                  <Briefcase size={18} className="text-skwap-accent" /> Description
                </label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={3}
                  placeholder={`Detail exactly what the session will entail...`} 
                  className="w-full glass-input rounded-xl px-4 py-3 transition-all resize-none text-sm leading-relaxed"
                ></textarea>
              </div>

              {formData.type === 'TEACH' && (
                <div>
                  <label className="flex items-center gap-2 text-skwap-textSecondary text-sm font-bold mb-3">
                    <ExternalLink size={18} className="text-skwap-accent" /> Portfolio / Reference
                  </label>
                  <input 
                    type="url" 
                    name="portfolioLink"
                    value={formData.portfolioLink}
                    onChange={handleChange}
                    placeholder="Link to your Github, Dribbble, or personal site" 
                    className="w-full glass-input rounded-xl px-4 py-3 transition-all text-sm"
                  />
                </div>
              )}
            </div>

            {/* Right Column (Exchange Rules) */}
            <div className="space-y-3">
              <div className="bg-skwap-bgSecondary/50 border border-skwap-card/80 rounded-2xl p-4 shadow-inner">
                <h3 className="text-white font-bold mb-3 border-b border-skwap-card/50 pb-2 text-sm">Exchange Format</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="flex items-center gap-2 text-skwap-textSecondary text-sm font-bold mb-3">
                    <GraduationCap size={18} className="text-skwap-accent" /> Payment Method
                  </label>
                    <select 
                      name="method"
                      value={formData.method}
                      onChange={handleChange}
                      className="w-full glass-input rounded-xl px-3 py-3 text-sm cursor-pointer"
                    >
                      <option value="BARTER" className="bg-skwap-bgSecondary text-white">Barter Skills (No credits)</option>
                      <option value="CREDITS" className="bg-skwap-bgSecondary text-white">Use Credits (1 Cr/hr)</option>
                      <option value="BOTH" className="bg-skwap-bgSecondary text-white">Accept Both (1 Cr/hr or Barter)</option>
                    </select>
                  </div>

                  {(formData.method === 'BARTER' || formData.method === 'BOTH') && (
                    <div>
                      <label className="block text-skwap-textSecondary text-[10px] font-bold mb-1.5 uppercase tracking-widest">
                        Target Skills (Comma separated)
                      </label>
                      <input 
                        type="text" 
                        name="barterSkills"
                        value={formData.barterSkills}
                        onChange={handleChange}
                        required={formData.method === 'BARTER'}
                        placeholder="CSS, Node.js, Cooking..." 
                        className="w-full glass-input rounded-xl px-3 py-3 placeholder-white/20 transition-all text-sm"
                      />
                    </div>
                  )}

                  {(formData.method === 'CREDITS' || formData.method === 'BOTH') && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-skwap-accent uppercase tracking-widest mb-1">Platform Rate</p>
                      <p className="text-white font-bold text-sm">1 credit / hour</p>
                      <p className="text-[9px] text-white/40 mt-1">Standardized rate for all skill exchanges.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-skwap-textSecondary text-sm font-bold mb-3">
                  <Clock size={18} className="text-skwap-accent" /> Availability / Schedule
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    name="availability"
                    value={formData.availability}
                    onChange={handleChange}
                    placeholder="e.g. Weekends only, Evenings GST" 
                    className="w-full glass-input rounded-xl px-4 py-3 pl-10 placeholder-white/20 transition-all text-sm"
                  />
                  <Clock size={14} className="absolute inset-y-0 left-3.5 my-auto text-white/40" />
                </div>
              </div>

            </div>
          </div>

          <div className="pt-4 flex justify-end border-t border-skwap-card border-dashed">
            <button 
              type="submit" 
              disabled={saving} 
              className="px-8 py-3 glass-btn text-white font-bold rounded-xl shadow-xl transition-all disabled:opacity-50 flex items-center gap-2 group text-sm"
            >
              {saving ? 'Publishing...' : 'Publish Listing'}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateListing;
