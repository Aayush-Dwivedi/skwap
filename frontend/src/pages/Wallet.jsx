import React, { useState, useEffect } from 'react';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Plus, History } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Wallet = () => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const { data } = await api.get('/credits/balance');
      setBalance(data.credits);
    } catch (error) {
      toast.error('Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (amount) => {
    setIsPurchasing(true);
    try {
      const { data } = await api.post('/credits/purchase', { amount });
      setBalance(data.credits);
      toast.success(`Successfully added ${amount} credits!`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  const purchaseOptions = [
    { amount: 100, price: '$10', color: 'from-blue-500 to-indigo-600' },
    { amount: 500, price: '$45', color: 'from-purple-500 to-pink-600', popular: true },
    { amount: 1000, price: '$80', color: 'from-amber-400 to-orange-600' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
          <WalletIcon className="text-skwap-accent" />
          Cred Wallet
        </h1>
        <p className="text-skwap-textSecondary">Manage your Skwap credits and fuel your learning journey.</p>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.3)] group transition-all duration-500 hover:bg-white/[0.05]">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-skwap-accent rounded-full blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div>
            <p className="text-skwap-textSecondary text-sm font-medium mb-1 uppercase tracking-widest">Available Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl md:text-7xl font-black text-white tracking-tighter tabular-nums">
                {loading ? '...' : balance}
              </span>
              <span className="text-xl font-bold text-skwap-accent">CREDITS</span>
            </div>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={() => handlePurchase(100)}
              disabled={isPurchasing}
              className="flex-1 md:flex-none bg-skwap-accent hover:bg-skwap-accent/90 text-white font-bold py-4 px-8 rounded-2xl shadow-[0_8px_20px_-4px_rgba(182,109,121,0.5)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Quick Add
            </button>
          </div>
        </div>
      </div>

      {/* Purchase Options */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white px-2">Top Up Your Wallet</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {purchaseOptions.map((option) => (
            <div 
              key={option.amount}
              className={`relative overflow-hidden bg-white/[0.03] backdrop-blur-2xl border ${option.popular ? 'border-skwap-accent/50 shadow-[0_0_20px_rgba(182,109,121,0.1)]' : 'border-white/10'} rounded-3xl p-6 transition-all duration-300 hover:scale-[1.03] hover:bg-white/[0.06] flex flex-col justify-between h-[240px] group`}
            >
              {option.popular && (
                <div className="absolute top-4 right-4 bg-skwap-accent text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                  Most Popular
                </div>
              )}
              
              <div>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${option.color} flex items-center justify-center shadow-lg mb-4 text-white trasform group-hover:rotate-12 transition-transform`}>
                  <WalletIcon size={24} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{option.amount} Credits</h3>
                <p className="text-skwap-textSecondary text-sm">Best for {option.amount > 500 ? 'pro learners' : 'getting started'}.</p>
              </div>

              <button 
                onClick={() => handlePurchase(option.amount)}
                disabled={isPurchasing}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                  ${option.popular 
                    ? 'bg-skwap-accent text-white shadow-lg' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
              >
                Buy for {option.price}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder for History */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8">
        <div className="flex items-center gap-2 text-skwap-textSecondary mb-6 font-semibold">
          <History size={18} />
          <span>Recent Activity</span>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] grayscale opacity-50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                <ArrowDownLeft size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Wallet Top-up</p>
                <p className="text-xs text-skwap-textSecondary">Just now (Sample)</p>
              </div>
            </div>
            <p className="text-lg font-bold text-skwap-accent">+100</p>
          </div>
          
          <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center">
            <History size={48} className="mb-4 stroke-[1px]" />
            <p className="text-sm">Transaction history feature coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
