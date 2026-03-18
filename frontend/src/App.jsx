import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import { ChatProvider } from './contexts/ChatContext';
import Layout from './components/Layout';
import FloatingChat from './components/FloatingChat';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import EditProfile from './pages/EditProfile';
import CreateListing from './pages/CreateListing';
import MySessions from './pages/MySessions';
import Chat from './pages/Chat';
import MyPostings from './pages/MyPostings';
import SetupProfile from './pages/SetupProfile';
import Notifications from './pages/Notifications';
import Wallet from './pages/Wallet';
import ContactAdmin from './pages/ContactAdmin';
import { Toaster } from 'react-hot-toast';

// Protected Route Wrapper
const ProtectedRoute = ({ children, requireProfile = true }) => {
  const { user, loading, hasProfile } = useAuth();
  
  if (loading) return null;
  
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If they need a profile but don't have one, force them to setup
  if (requireProfile && !hasProfile) {
    return <Navigate to="/setup-profile" replace />;
  }
  
  return children;
};

// Route that redirects logged-in users away from auth pages
const AuthRoute = ({ children }) => {
  const { user, loading, hasProfile } = useAuth();
  
  if (loading) return null;
  
  if (user && hasProfile) {
    return <Navigate to="/explore" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <ChatProvider>
            <ThemeProvider>
              <Toaster 
                position="bottom-right"
                toastOptions={{
                  className: 'glass-card text-white border-white/10',
                  style: {
                    background: 'rgba(var(--skwap-card), 0.8)',
                    backdropFilter: 'blur(10px)',
                  },
                }}
              />
              <Routes>
                {/* Main Entry Point */}
                <Route path="/" element={
                  <AuthRoute>
                    <Landing />
                  </AuthRoute>
                } />

                {/* Auth Routes */}
                <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
                <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
                <Route path="/setup-profile" element={<ProtectedRoute requireProfile={false}><SetupProfile /></ProtectedRoute>} />
                
                {/* Protected routes wrapped in Layout */}
                <Route element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route path="/explore" element={<Home />} />
                  <Route path="/edit-profile" element={<EditProfile />} />
                  <Route path="/create-request" element={<CreateListing />} />
                  <Route path="/my-postings" element={<MyPostings />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/sessions" element={<MySessions />} />
                  <Route path="/contact-admin" element={<ContactAdmin />} />
                  <Route path="/chat/:id" element={<Navigate to="/explore" replace />} />
                </Route>
                
                {/* Handle old / redirect or root-level dashboard access */}
                <Route path="/home" element={<Navigate to="/explore" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              
              <FloatingChat />
            </ThemeProvider>
          </ChatProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
