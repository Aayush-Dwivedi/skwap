import React, { useState, useEffect } from 'react';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Plus, History } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Wallet = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [{ data: balanceData }, { data: historyData }] = await Promise.all([
        api.get('/credits/balance'),
        api.get('/credits/history')
      ]);
      setBalance(balanceData.credits);
      setTransactions(historyData);
    } catch (error) {
      toast.error('Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (amount) => {
    setIsPurchasing(true);
    try {
      await api.post('/credits/purchase', { amount });
      await fetchData();
      toast.success(`Successfully added ${amount} credits!`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  const purchaseOptions = [
    { amount: 80, price: '₹100', color: 'from-blue-500 to-indigo-600' },
    { amount: 400, price: '₹500', color: 'from-purple-500 to-pink-600', popular: true },
    { amount: 800, price: '₹1000', color: 'from-amber-400 to-orange-600' },
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
      <div className="relative overflow-hidden glass-strong rounded-[2.5rem] p-8 md:p-12 shadow-2xl group transition-all duration-500 hover:bg-white/[0.05]">
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
              onClick={() => handlePurchase(80)}
              disabled={isPurchasing}
              className="flex-1 md:flex-none glass-btn text-white font-bold py-4 px-8 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Quick Add (₹100)
            </button>
          </div>
        </div>
      </div>

      {/* Purchase Options */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white px-2">Top Up Your Wallet (₹100 = 80 Credits)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {purchaseOptions.map((option) => (
            <div 
              key={option.amount}
              className={`relative overflow-hidden glass-card ${option.popular ? 'border-skwap-accent/50 shadow-[0_0_20px_rgba(var(--skwap-accent),0.1)]' : ''} rounded-3xl p-6 transition-all duration-300 hover:scale-[1.03] flex flex-col justify-between h-[240px] group`}
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
                    ? 'glass-btn text-white shadow-lg' 
                    : 'glass text-white hover:bg-white/10'
                  }`}
              >
                Buy for {option.price}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8">
        <div className="flex items-center gap-2 text-skwap-textSecondary mb-6 font-semibold">
          <History size={18} />
          <span>Recent Activity</span>
        </div>
        
        <div className="space-y-4">
          {loading ? (
            <p className="text-white/20 text-center py-10 italic">Loading activity...</p>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center">
              <History size={48} className="mb-4 stroke-[1px]" />
              <p className="text-sm">No recent transactions yet.</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx._id} className="flex items-center justify-between p-4 rounded-2xl glass border-white/5 hover:bg-white/[0.05] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full glass flex items-center justify-center 
                    ${tx.type === 'EARN' || tx.type === 'PURCHASE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {tx.type === 'EARN' || tx.type === 'PURCHASE' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{tx.description}</p>
                    <p className="text-xs text-skwap-textSecondary">
                      {new Date(tx.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <p className={`text-lg font-bold ${tx.type === 'EARN' || tx.type === 'PURCHASE' ? 'text-emerald-400' : 'text-white/60'}`}>
                  {tx.type === 'EARN' || tx.type === 'PURCHASE' ? '+' : '-'}{tx.amount}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
