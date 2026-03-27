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
      // 1. Create Order
      const { data: order } = await api.post('/credits/create-razorpay-order', { amount });

      // 2. Initialize Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SUbD2NsvRlT7j6', // Public Key ID
        amount: order.amount,
        currency: order.currency,
        name: 'Skill Trade',
        description: `Purchase ${amount} Credits`,
        order_id: order.id,
        handler: async function (response) {
          try {
            // 3. Verify Payment
            await api.post('/credits/verify-razorpay-payment', {
              ...response,
              amount
            });
            await fetchData();
            toast.success(`Successfully added ${amount} credits!`);
          } catch (verifyError) {
            toast.error(verifyError.response?.data?.message || 'Payment verification failed');
          }
        },
        prefill: {
          name: 'Skill Trade User',
        },
        theme: {
          color: '#3b82f6' // Skill Trade blue accent
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error(response.error.description || 'Payment Failed');
      });
      rzp.open();
    } catch (error) {
      console.error('Purchase Initiation Error:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to initiate purchase';
      toast.error(msg);
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
          <WalletIcon className="text-st-accent" />
          Cred Wallet
        </h1>
        <p className="text-st-textSecondary">Manage your Skill Trade credits and fuel your learning journey.</p>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden glass-strong rounded-[2.5rem] p-8 md:p-12 shadow-2xl group transition-all duration-500 hover:bg-white/[0.05]">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-st-accent rounded-full blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div>
            <p className="text-st-textSecondary text-sm font-medium mb-1 uppercase tracking-widest">Available Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl sm:text-7xl font-black text-white tracking-tighter tabular-nums text-glow">
                {loading ? '...' : balance}
              </span>
              <span className="text-xl font-bold text-st-accent">CREDITS</span>
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
              className={`relative overflow-hidden glass-card ${option.popular ? 'border-st-accent/50 shadow-[0_0_20px_rgba(var(--st-accent),0.1)]' : ''} rounded-3xl p-6 transition-all duration-300 hover:scale-[1.03] flex flex-col justify-between h-[240px] group`}
            >
              {option.popular && (
                <div className="absolute top-4 right-4 bg-st-accent text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                  Most Popular
                </div>
              )}
              
              <div>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${option.color} flex items-center justify-center shadow-lg mb-4 text-white trasform group-hover:rotate-12 transition-transform`}>
                  <WalletIcon size={24} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{option.amount} Credits</h3>
                <p className="text-st-textSecondary text-sm">Best for {option.amount > 500 ? 'pro learners' : 'getting started'}.</p>
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
        <div className="flex items-center gap-2 text-st-textSecondary mb-6 font-semibold">
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
                    ${tx.type === 'EARN' || tx.type === 'PURCHASE' || tx.type === 'REFUND' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {tx.type === 'EARN' || tx.type === 'PURCHASE' || tx.type === 'REFUND' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{tx.description}</p>
                    <p className="text-xs text-st-textSecondary">
                      {new Date(tx.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <p className={`text-lg font-bold ${tx.type === 'EARN' || tx.type === 'PURCHASE' || tx.type === 'REFUND' ? 'text-emerald-400' : 'text-white/60'}`}>
                  {tx.type === 'EARN' || tx.type === 'PURCHASE' || tx.type === 'REFUND' ? '+' : '-'}{tx.amount}
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
