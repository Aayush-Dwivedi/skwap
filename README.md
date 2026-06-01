# Skill Trade — Trade Your Talents 🤝💡

Skill Trade (also known as **Skwap**) is a premium peer-to-peer skill-bartering platform where individuals trade their skills, talents, and knowledge. Users can either barter skills directly (e.g., learn React in exchange for cooking lessons) or use a virtual credit system backed by safe and secure payment flows. 

The application is fully interactive and incorporates advanced real-time communication features, including instant messaging and custom built-in peer-to-peer WebRTC video rooms.

---

## 🚀 Key Features

* **Dual Barter Mechanisms**: Trade skills directly via a traditional barter model, or utilize a virtual credits wallet system.
* **Real-time Messaging & Chat**: Persistent instant chat for setting up sessions, trading suggestions, and direct communication (Socket.io).
* **WebRTC Live Video Meetings**: Built-in, high-performance peer-to-peer video rooms with audio/video controls directly in the browser (no external software required).
* **Wallet & Cred Top-ups**: Easily purchase credits through credit wallet orders processed via **Razorpay**.
* **Personalized Dashboard & Theme Customization**: Custom profile styling, profile headers, and user-configurable wallpaper styles.
* **Secure Auth Gateway**: Robust email-password auth, Google OAuth 2.0 integration, and automated verification codes.
* **Admin Support & Moderation**: Direct ticketing system to contact admins and report suspicious or fraudulent activity.

---

## 📂 Project Structure

The project is divided into two primary subdirectories:

```text
├── backend/            # Express REST API, Socket.io, WebRTC signaling & MongoDB models
└── frontend/           # Single-Page React Web App built on Vite & TailwindCSS
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js with Vite
- **Styling**: TailwindCSS & Custom HSL-based Hues
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Socket Client**: Socket.io Client
- **Signaling & Media**: WebRTC API with STUN/TURN fallback credentials

### Backend
- **Framework**: Node.js & Express
- **Database**: MongoDB (via Mongoose ODM)
- **Real-Time Communication**: Socket.io (instant chat, real-time unread counts, and WebRTC signaling)
- **Media Uploads**: Multer & Cloudinary
- **Payments Gateway**: Razorpay Node.js SDK
- **Security & OAuth**: JWT, Bcrypt.js, and Google Auth Library
- **Notifications & Mailers**: Nodemailer (OTP codes & transactions) & Resend API

---

## ⚙️ Local Setup & Configuration

### Prerequisites
- **Node.js** (v16+ recommended)
- **MongoDB** (Local instance or MongoDB Atlas Connection URI)
- Credentials for **Cloudinary**, **Razorpay**, and optionally **Metered.ca** (for live TURN servers)

---

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install all node dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `backend/` root directory and populate the required keys:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=your_mongodb_connection_uri
   JWT_SECRET=your_jwt_secret_key
   
   # Nodemailer SMTP Configuration
   EMAIL_USER=your_smtp_email
   EMAIL_PASS=your_smtp_app_password
   ADMIN_EMAIL=your_support_email
   
   # Cloudinary Keys
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   
   # Google OAuth Credentials
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # Razorpay Keys
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   
   # TURN Server Configuration (Optional - Falls back to Google STUN)
   METERED_API_KEY=your_metered_ca_api_key
   
   # Resend Mail Key (Optional)
   RESEND_API_KEY=your_resend_api_key
   ```

4. **(Optional) Seed the database with demo users**:
   Run the seeding script to populate default data (demo listings, users, and credits):
   ```bash
   node seed.js
   ```

5. **Start the server**:
   - For development (with hot-reloading):
     ```bash
     npm run dev
     ```
   - For production:
     ```bash
     npm start
     ```

---

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install the frontend dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `frontend/` root directory and configure the environment variables:
   ```env
   # API Route base
   VITE_API_BASE_URL=http://localhost:5000/api
   
   # Razorpay Public Key ID
   VITE_RAZORPAY_KEY_ID=your_razorpay_public_key_id
   
   # Socket Gateway URL (usually same as backend server origin)
   VITE_SOCKET_URL=http://localhost:5000
   ```

4. **Start the frontend application locally**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to the local URL (usually `http://localhost:5173`).

---

## 📡 API Endpoints Reference

All API endpoints are prefixed with `/api`.

| Route Segment | Description | Major Endpoints |
| :--- | :--- | :--- |
| **`/auth`** | Authenticates accounts, triggers password reset flows, and Google Sign-in. | `POST /register`, `POST /login`, `POST /google`, `POST /forgot-password`, `POST /reset-password` |
| **`/profile`** | Fetches user details, user preferences, and customizable layouts/themes. | `GET /`, `PUT /update`, `PUT /theme` |
| **`/listings`** | Manages barter listings and requests. Search listings by skill or tags. | `GET /`, `POST /create`, `PUT /:id`, `DELETE /:id` |
| **`/requests`** | Manages session proposal requests between Learners & Teachers. | `GET /`, `POST /create`, `PUT /:id/accept`, `PUT /:id/reject` |
| **`/sessions`** | Tracks completed, active, and scheduled skill-sharing sessions. | `GET /`, `PUT /:id/complete`, `POST /:id/log` |
| **`/credits`** | Manages wallet transaction logs, buy order initialization, and payments. | `GET /wallet`, `POST /order`, `POST /verify` |
| **`/messages`** | Retrieves and stores messaging logs inside active session channels. | `GET /:sessionId`, `POST /` |
| **`/notifications`** | Fetches system notifications, warning alerts, and updates. | `GET /`, `PUT /:id/read`, `PUT /read-all` |
| **`/fraud`** | System for users to report scams, spam, and bad actors. | `POST /report` |
| **`/reviews`** | Lets learners rate and review teachers after completing a session. | `POST /` |
| **`/upload`** | Asset endpoint to handle file uploads to Cloudinary. | `POST /` |
| **`/contact`** | Lets users send contact forms directly to administrators. | `POST /` |

---

## 💬 Real-Time Events (Socket.io & WebRTC)

Skill Trade utilizes a persistent Socket.io server to bridge interactive client-side activities:

1. **User Setup**: Handshake event (`setup`) to map active client sockets to their respective authenticated DB user ID.
2. **Instant Chat**: Listens for the `new message` event to instantly propagate messages to active session members' private rooms.
3. **WebRTC Signaling**: Coordinates video rooms under room name `meeting_<sessionId>` by routing:
   - `join-meeting` / `leave-meeting`
   - `webrtc-offer` / `webrtc-answer` / `webrtc-ice-candidate`
   - Real-time `video-toggle` and `audio-toggle` events.
