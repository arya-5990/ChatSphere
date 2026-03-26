# ChatSphere 💬

A modern, secure real-time chat application built with React Native, Expo, Firebase, and Cloudinary. ChatSphere provides a comprehensive messaging experience with advanced features like read receipts, voice notes, media sharing, and secure authentication.

---

## ✨ Features

### 🔐 Authentication & Security
- Secure user authentication with email/password
- OTP-based email verification
- Password reset flow
- Environment-based configuration for secrets
- Automated security checks to detect exposed keys

### 💬 Messaging
- Real-time 1:1 messaging using Firebase
- Read receipts (sent, delivered, seen)
- Voice notes (record, send, play)
- Media sharing via Cloudinary
- Smart display of last message and unread counts

### 🎨 User Experience
- Light and dark theme with persistent preference
- Modern, mobile-first UI
- Smooth animations and transitions
- Cross‑platform (Android, iOS, Web via Expo)

### 🔧 Technical
- TypeScript throughout the app
- Firebase subcollections for scalable chat history
- Cloudinary for media hosting (images and audio)
- Modular folder structure and reusable services

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Firebase project (Firestore + Auth enabled)
- Cloudinary account

### Installation

1. Clone and enter the project:
   ```bash
   git clone https://github.com/yourusername/ChatSphere.git
   cd ChatSphere
   ```

2. Install dependencies:
   ```bash
   npm install
   cd backend && npm install
   ```

3. Create environment file (do not commit this file):
   ```bash
   # At project root
   cp env.example .env
   ```

4. Fill in `.env` with your real keys (see “Security & Configuration” below).

5. Start the Expo dev server:
   ```bash
   npm start
   ```

6. Run on a target:
   ```bash
   # Android
   npm run android

   # iOS (on macOS)
   npm run ios

   # Web
   npm run web
   ```

---

## 🏗️ Project Structure

```text
ChatSphere/
├── App.tsx                  # App entry with theme provider
├── index.ts                 # Expo entry point
├── src/
│   ├── config/              # Environment/config helpers
│   ├── navigation/          # Navigation stack
│   ├── screens/             # All screens (auth, chats, profile, etc.)
│   ├── services/            # Cloudinary, email, OTP services
│   ├── theme/               # Theme context and colors
│   └── firebase.ts          # Firebase init and user helpers
├── backend/                 # Email server for OTP
├── android/                 # Native Android project (EAS / bare builds)
├── assets/                  # Images, icons, fonts
└── scripts/                 # Utility scripts (e.g. security check)
```

---

## 🔒 Security & Configuration

### Environment Variables
Create a `.env` file at the project root (never commit this file):

```bash
# Firebase
FIREBASE_API_KEY=your_actual_firebase_api_key
FIREBASE_PROJECT_ID=your_actual_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_actual_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_actual_firebase_messaging_sender_id

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_actual_cloudinary_cloud_name
CLOUDINARY_UPLOAD_PRESET=your_actual_cloudinary_upload_preset
CLOUDINARY_API_KEY=your_actual_cloudinary_api_key
CLOUDINARY_API_SECRET=your_actual_cloudinary_api_secret
```

`src/config/env.ts` is structured to read from environment variables. For production builds, configure these via your CI/CD or hosting provider.

### Best Practices
- Never commit API keys or secrets to git
- Use different keys for development and production
- Rotate keys if they have ever been exposed
- Configure Firebase security rules before going live
- Use Cloudinary upload presets with appropriate restrictions

### Security Helper Script

There is a helper script to scan for exposed keys:

```bash
npm run security-check
```

This scans the repository for known key patterns and gives remediation guidance.

---

## 📡 Read Receipts

ChatSphere implements detailed read receipts on top of Firestore.

### Data Model

Chats are stored in a top‑level collection with a messages subcollection:

- `chats/{chatId}`
  - `participants: string[]`
  - `lastMessage: string | null`
  - `lastMessageTime: Timestamp | null`
  - `lastMessageSenderId: string | null`

- `chats/{chatId}/messages/{messageId}`
  - `senderId: string`
  - `text?: string`
  - `voiceNote?: { url: string; duration: number }`
  - `timestamp: Timestamp`
  - `seenBy: { [userId: string]: string } // ISO timestamps`

### Status Semantics

- `✓` – sent to server
- `✓✓` – delivered to recipient’s device
- `✓✓ Seen` – recipient has viewed the message

In the chat list, last messages are formatted intelligently:

- Messages you sent: `sent: [message] ✓` / `sent: [message] ✓✓`
- Multiple unread messages: `X new msgs`
- For voice notes, counts are adapted (e.g. `1 new voice msg`).

### UX Behaviour

- Messages are marked read when:
  - The chat screen is focused/opened
  - Messages become visible in the list
- A temporary “New Messages” divider appears at the first unread message and auto‑hides after a short delay.
- Real‑time listeners (`onSnapshot`) keep both sides in sync.

---

## 🎙 Voice Notes

Voice notes are fully integrated into the messaging experience.

### Recording

- Requests microphone permission when first used
- High‑quality audio recording via `expo-av`
- Live duration display and recording indicator
- Minimum duration of 1 second to avoid accidental taps

### Message Shape

Voice notes are stored as:

```json
{
  "senderId": "user_id",
  "voiceNote": {
    "url": "https://cloudinary.com/audio_url",
    "duration": 30
  },
  "timestamp": "2025-01-29T21:00:00Z",
  "seenBy": {
    "user_id": "2025-01-29T21:05:00Z"
  }
}
```

### Cloudinary Integration

- Audio files are uploaded to Cloudinary using the `video` resource type
- URLs returned by Cloudinary are stored in Firestore
- Playback streams from Cloudinary’s CDN

### UI Behaviour

- Microphone button appears when the text input is empty
- While recording, the UI shows a red indicator and timer
- On stop, the audio is uploaded and sent as a message
- In chat:
  - Tap ▶️ to play, ⏸️ to pause
  - Shows a waveform, duration, and “Playing…” indicator
  - Only one voice note plays at a time

Voice notes fully participate in read receipts and unread counts in the chat list.

---

## 📧 OTP & Email Flow

- OTPs are generated from a predefined, randomized list
- OTP and timestamp are stored in-memory on the client side for verification
- Email sending is handled by the backend Node.js service (`backend/`)
- If the backend is unavailable in development, email sending is simulated in logs

Flows covered:
- Send OTP for email verification
- Verify OTP with expiry (10 minutes)
- Resend OTP (invalidates previous one)

---

## 📱 NPM Scripts

- `npm start` – Start the Expo dev server
- `npm run android` – Run on Android device/emulator
- `npm run ios` – Run on iOS simulator (macOS)
- `npm run web` – Run in a web browser
- `npm run security-check` – Scan the repo for exposed keys

The backend email server can be started with:

```bash
cd backend
npm start
```

---

## 🛠️ Tech Stack

- React Native + Expo
- TypeScript
- Firebase (Auth, Firestore, Storage)
- Cloudinary (images and audio)
- React Navigation
- React Context + hooks for theme and auth‑related state
- Node.js email service for OTP (development/optional)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m "Add amazing feature"`
4. Push to your fork: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📞 Help & Support

- Run `npm run security-check` if you suspect exposed keys
- Check Firebase and Cloudinary dashboards for configuration issues
- Open a GitHub issue with logs and reproduction steps

---

**Built with ❤️ using React Native, Expo, Firebase, and Cloudinary.**
