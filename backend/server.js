const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Log errors to a file since terminal output is hard to read
const logFile = path.join(__dirname, 'error.log');
const logError = (msg) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
};
// Load env vars
dotenv.config();

// Connect to database
connectDB();

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For dev mode
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// App route middlewares - attach io to req so controllers can send notifications
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/listings', require('./routes/listingRoutes'));
app.use('/api/requests', require('./routes/sessionRequestRoutes'));
app.use('/api/credits', require('./routes/creditRoutes'));
// --- Media & ICE Server Configuration (Metered.ca) ---
app.get('/api/media/ice-servers', async (req, res) => {
  const METERED_API_KEY = process.env.METERED_API_KEY;

  // Fallback to Google STUN if no API key is provided
  const fallbackIceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ];

  if (!METERED_API_KEY) {
    return res.json(fallbackIceServers);
  }

  try {
    const response = await axios.get(`https://skilltradeproject.metered.live/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`);
    res.json(response.data);
  } catch (error) {
    res.json(fallbackIceServers);
  }
});

app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/fraud', require('./routes/fraudRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

app.get('/', (req, res) => {
  res.send('Skill Trade API is running...');
});

// Socket.io logic
io.on('connection', (socket) => {
  console.log('Connected to socket.io');

  socket.on('setup', (userData) => {
    socket.join(userData._id);
    socket.emit('connected');
  });

  socket.on('join chat', (room) => {
    socket.join(room);
    console.log(`User joined chat room: ${room}`);
  });

  socket.on('new message', async (newMessageReceived) => {
    let session = newMessageReceived.session;
    
    // If session is just an ID, we need to fetch it to know who to notify
    if (typeof session === 'string' || session instanceof String || (session && !session.learner)) {
      const Session = require('./models/Session');
      session = await Session.findById(session);
    }

    if (!session || !session.learner || !session.teacher) return;

    // Emit to both parties rooms so ChatContext/unread counts work even if chat window is closed
    const learnerId = session.learner.toString();
    const teacherId = session.teacher.toString();
    const senderId = newMessageReceived.sender._id || newMessageReceived.sender;

    if (learnerId === senderId.toString()) {
      console.log(`Emitting message to teacher room: ${teacherId}`);
      socket.to(teacherId).emit('message received', newMessageReceived);
    } else {
      console.log(`Emitting message to learner room: ${learnerId}`);
      socket.to(learnerId).emit('message received', newMessageReceived);
    }
    
    // REMOVED redundant broadcast to specific chat room to avoid duplication
    // Personal room broadcast above handles it correctly.
  });

  // WebRTC Video Meeting Signaling
  socket.on('join-meeting', ({ sessionId, userId }) => {
    socket.join(`meeting_${sessionId}`);
    console.log(`User ${userId} (Socket: ${socket.id}) joined meeting ${sessionId}`);
    socket.to(`meeting_${sessionId}`).emit('user-joined-meeting', { userId, socketId: socket.id });
  });

  socket.on('webrtc-offer', ({ offer, sessionId, toSocketId, fromUserId }) => {
    console.log(`Offer from ${fromUserId} to ${toSocketId}`);
    socket.to(toSocketId).emit('webrtc-offer', { offer, fromSocketId: socket.id, fromUserId });
  });

  socket.on('webrtc-answer', ({ answer, toSocketId, fromUserId }) => {
    socket.to(toSocketId).emit('webrtc-answer', { answer, fromSocketId: socket.id, fromUserId });
  });

  socket.on('webrtc-ice-candidate', ({ candidate, toSocketId }) => {
    socket.to(toSocketId).emit('webrtc-ice-candidate', { candidate, fromSocketId: socket.id });
  });

  socket.on('video-toggle', ({ sessionId, isEnabled }) => {
    socket.to(`meeting_${sessionId}`).emit('video-toggle', { isEnabled, socketId: socket.id });
  });

  socket.on('audio-toggle', ({ sessionId, isEnabled }) => {
    socket.to(`meeting_${sessionId}`).emit('audio-toggle', { isEnabled, socketId: socket.id });
  });
  
  socket.on('leave-meeting', ({ sessionId, userId }) => {
    socket.leave(`meeting_${sessionId}`);
    console.log(`User ${userId} left meeting ${sessionId}`);
    socket.to(`meeting_${sessionId}`).emit('user-left-meeting', { userId, socketId: socket.id });
  });

  socket.on('disconnect', () => {
    // console.log('USER DISCONNECTED');
  });
});

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
  logError(`Uncaught Exception: ${err.message}\n${err.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  logError('Server started/restarted');
});
