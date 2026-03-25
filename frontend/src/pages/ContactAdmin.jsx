import React, { useState } from 'react';
import { Mail, Send, User, MessageSquare } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ContactAdmin = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    problem: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.problem) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      const { data } = await api.post('/contact', formData);
      toast.success(data.message || 'Message sent successfully!');
      setFormData({ name: '', email: '', problem: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pt-4">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
          <Mail className="text-st-accent" />
          Contact Admin
        </h1>
        <p className="text-st-textSecondary">
          Have feedback, found a bug, or need to report fraud? Let us know below.
        </p>
      </div>

      <div className="glass-strong rounded-[2.5rem] p-8 mt-6 border border-white/5">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/80 ml-1">Your Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full glass bg-white/5 border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-st-accent focus:bg-white/10 transition-all font-medium placeholder:text-white/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/80 ml-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  className="w-full glass bg-white/5 border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-st-accent focus:bg-white/10 transition-all font-medium placeholder:text-white/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/80 ml-1">Message / Problem</label>
              <div className="relative">
                <div className="absolute top-4 left-0 pl-4 flex items-start pointer-events-none text-white/40">
                  <MessageSquare size={18} />
                </div>
                <textarea
                  name="problem"
                  value={formData.problem}
                  onChange={handleChange}
                  placeholder="Describe your feedback or issue..."
                  rows="5"
                  className="w-full glass bg-white/5 border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-st-accent focus:bg-white/10 transition-all font-medium placeholder:text-white/20 resize-none"
                />
              </div>
            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glass-btn text-white font-bold py-4 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? 'Sending...' : (
              <>
                <Send size={20} />
                Send Message
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactAdmin;
