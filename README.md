# Skill Trade - Trade Your Talents

Skill Trade (also known as Skwap) is a peer-to-peer skill-sharing platform designed for individuals to exchange knowledge, skills, and talents. The platform supports direct bartering (such as teaching React in exchange for cooking lessons) as well as a virtual credit system that allows flexible trade scheduling. Built to be interactive and immersive, it integrates live video meetings, chat, secure payment gateways, and customizable profile themes.

---

## Core Features

* **Direct Bartering & Credits System**: Users can choose to exchange their skills directly or buy and use virtual credits.
* **Real-Time Chat & Collaboration**: Persistent instant messaging built on Socket.io simplifies session coordination.
* **Live WebRTC Video Sessions**: Active sessions support live peer-to-peer video calls with audio/video controls directly in the browser, using STUN/TURN servers.
* **Custom User Profiles & Themes**: Customizable headers, backgrounds, and themes let users create their own personalized workspace.
* **Wallet Integration**: Integrated Razorpay gateway allows users to buy additional credits securely.
* **Safety & Support**: Built-in fraud reporting and support channels ensure a safe environment for all community members.

---

## Project Directory Layout

The codebase is split into two primary folders:

```text
backend/   - Node.js API, WebRTC signaling, Socket.io server, database schemas
frontend/  - React application with Vite and Tailwind CSS
```

---

## Technical Stack

### Frontend
- **Framework**: React.js (built with Vite)
- **Styling**: TailwindCSS with HSL-based themes
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Socket Client**: Socket.io Client
- **Signaling**: WebRTC API with fallback STUN/TURN credentials

### Backend
- **Framework**: Node.js & Express
- **Database**: MongoDB (via Mongoose ODM)
- **Real-Time Communication**: Socket.io (instant chat, unread counts, and WebRTC signaling)
- **Media Uploads**: Multer and Cloudinary
- **Payments Gateway**: Razorpay Node.js SDK
- **Security**: JWT, Bcrypt.js, and Google Auth Library
- **Notifications & Mailers**: Nodemailer (OTP codes and transaction logs) and Resend API

---

## Setup and Local Development

To set up and run this project on your machine, you will need Node.js and MongoDB installed locally or access to a MongoDB Atlas cluster.

### 1. Setting up the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install the backend dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend root directory and populate it with the following configuration keys:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=your_mongodb_connection_uri
   JWT_SECRET=your_jwt_secret_key
   
   # SMTP Email Settings
   EMAIL_USER=your_smtp_email
   EMAIL_PASS=your_smtp_app_password
   ADMIN_EMAIL=your_support_email
   
   # Cloudinary Media Configuration
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   
   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # Razorpay Configuration
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   
   # TURN Server Configuration (Optional - Falls back to Google STUN)
   METERED_API_KEY=your_metered_ca_api_key
   
   # Resend Mail Key (Optional)
   RESEND_API_KEY=your_resend_api_key
   ```

4. **Optional Seeding**:
   To populate your local database with default test users, listings, and starting credits, run the seeding script:
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

### 2. Setting up the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install the frontend dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the frontend root directory and configure the variables:
   ```env
   # API Route base
   VITE_API_BASE_URL=http://localhost:5000/api
   
   # Razorpay Public Key ID
   VITE_RAZORPAY_KEY_ID=your_razorpay_public_key_id
   
   # Socket Gateway URL
   VITE_SOCKET_URL=http://localhost:5000
   ```

4. **Start the frontend app**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to the local URL (usually `http://localhost:5173`).

---

## API Route Overview

All API endpoints are prefixed with `/api`.

| Route | Purpose | Major Endpoints |
| :--- | :--- | :--- |
| **`/auth`** | Authenticates accounts, handles password reset flows, and Google Sign-in. | `POST /register`, `POST /login`, `POST /google`, `POST /forgot-password`, `POST /reset-password` |
| **`/profile`** | Fetches user details, user preferences, and custom layouts or themes. | `GET /`, `PUT /update`, `PUT /theme` |
| **`/listings`** | Manages barter listings. Includes filtering by skill names or tags. | `GET /`, `POST /create`, `PUT /:id`, `DELETE /:id` |
| **`/requests`** | Manages session proposal requests between Learners & Teachers. | `GET /`, `POST /create`, `PUT /:id/accept`, `PUT /:id/reject` |
| **`/sessions`** | Tracks completed, active, and scheduled skill-sharing sessions. | `GET /`, `PUT /:id/complete`, `POST /:id/log` |
| **`/credits`** | Manages wallet transaction logs, order initialization, and payments. | `GET /wallet`, `POST /order`, `POST /verify` |
| **`/messages`** | Retrieves and stores messaging logs inside active session channels. | `GET /:sessionId`, `POST /` |
| **`/notifications`** | Fetches system notifications, warnings, and updates. | `GET /`, `PUT /:id/read`, `PUT /read-all` |
| **`/fraud`** | Allows users to report scams, spam, or abusive behavior. | `POST /report` |
| **`/reviews`** | Lets learners rate and review teachers after completing a session. | `POST /` |
| **`/upload`** | Handles profile picture and asset uploads. | `POST /` |
| **`/contact`** | Lets users send contact forms directly to administrators. | `POST /` |

---

## Real-Time Services (Socket.io & WebRTC)

The application relies on Socket.io for real-time interactivity:

1. **User Setup**: Maps active client sockets to their respective authenticated database user ID.
2. **Instant Chat**: Broadcasts and propagates messages instantly to active session members' private rooms.
3. **WebRTC Signaling**: Coordinates video calls under room name `meeting_<sessionId>` by routing:
   - `join-meeting` and `leave-meeting`
   - `webrtc-offer`, `webrtc-answer`, and `webrtc-ice-candidate`
   - Real-time `video-toggle` and `audio-toggle` events.
