# ChatSphere

ChatSphere is a real-time chat application built with React Native, Expo, Firebase, and Cloudinary. It supports one‑to‑one messaging, read receipts, voice notes, media sharing, and email‑based authentication, with a simple light/dark theme and a focus on practical security.

---

## Features

### Authentication and security
- Email and password sign‑up / sign‑in
- OTP‑based email verification
- Password reset flow
- Environment‑based configuration for secrets
- Scripted checks for accidentally exposed keys

### Messaging
- Real‑time 1:1 messaging backed by Firebase
- Read receipts (sent, delivered, seen)
- Voice notes (record, upload, play back)
- Image and audio uploads via Cloudinary
- Chat list with last message and unread counts

### User experience
- Light and dark theme with stored preference
- Mobile‑first UI using React Native and Expo
- Works on Android, iOS, and web (via Expo)

### Technical
- TypeScript across the app
- Firestore subcollections for scalable chat history
- Cloudinary for media hosting
- Modular folder structure with reusable services

---

## Getting started

### Prerequisites
- Node.js (v16 or newer)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- A Firebase project (Firestore and Auth enabled)
- A Cloudinary account

### Installation

1. Clone the repository and enter the directory:
  ```bash
  git clone https://github.com/yourusername/ChatSphere.git
  cd ChatSphere
  ```

2. Install dependencies for the app and backend:
  ```bash
  npm install
  cd backend && npm install
  ```

3. Create an environment file (do not commit this file):
  ```bash
  # At the project root
  cp env.example .env
  ```

4. Fill in `.env` with your real keys (see "Configuration and security" below).

5. Start the Expo development server from the project root:
  ```bash
  npm start
  ```

6. Run the app on a target device or platform:
  ```bash
  # Android
  npm run android

  # iOS (on macOS)
  npm run ios

  # Web
  npm run web
  ```

To start the optional email backend:

```bash
cd backend
npm start
```

---

## Project structure

```text
ChatSphere/
├── App.tsx                  # App entry with theme provider
├── index.ts                 # Expo entry point
├── src/
│   ├── config/              # Environment/config helpers
│   ├── navigation/          # Navigation stack
│   ├── screens/             # Screens (auth, chats, profile, etc.)
│   ├── services/            # Cloudinary, email, OTP services
│   ├── theme/               # Theme context and colors
│   └── firebase.ts          # Firebase init and user helpers
├── backend/                 # Email server for OTP
├── android/                 # Native Android project (EAS / bare builds)
├── assets/                  # Images, icons, fonts
└── scripts/                 # Utility scripts (for example, security check)
```

---

## Configuration and security

### Environment variables

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

The file `src/config/env.ts` reads from these variables. For production builds, configure the same values through your CI/CD or hosting provider.

Recommended practices:
- Do not commit API keys or secrets to git
- Use different keys for development and production
- Rotate keys if they are ever exposed
- Configure Firebase security rules before going live
- Use Cloudinary upload presets with appropriate restrictions

To run the security helper script that scans for exposed keys:

```bash
npm run security-check
```

---

## Messaging and read receipts

Messages are stored in Firestore using a chat document with a messages subcollection.

Example structure:

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

Status semantics:
- Sent: message has reached the server
- Delivered: recipient's device has received the message
- Seen: recipient has opened the chat and the message is visible

The chat list uses this information to show last message status and unread counts (including for voice notes).

---

## Voice notes

Voice notes behave like regular messages but carry an audio payload.

- Microphone permission is requested on first use
- Recording uses `expo-av`
- A minimum duration helps avoid accidental taps
- Uploaded audio files are stored in Cloudinary using the `video` resource type
- Firestore keeps the Cloudinary URL and duration

In the UI, a microphone button appears when the text input is empty. While recording, the user sees an indicator and timer; once recording stops, the audio is uploaded and sent as a message. Only one voice note plays at a time in a conversation.

---

## OTP and email flow

- OTPs are generated from a predefined randomized list
- OTP and timestamp are kept on the client for verification
- Email delivery is handled by the Node.js backend in `backend/`
- In development, if the backend is not running, email sending can be simulated in logs

Covered flows:
- Send OTP for email verification
- Verify OTP with an expiry window (for example, ten minutes)
- Resend OTP (invalidates the previous code)

---

## Scripts

From the project root:

- `npm start` – start the Expo development server
- `npm run android` – run on an Android device or emulator
- `npm run ios` – run on an iOS simulator (macOS)
- `npm run web` – run in a web browser
- `npm run security-check` – scan the repository for exposed keys

The backend email server is started with:

```bash
cd backend
npm start
```

---

## Tech stack

- React Native and Expo
- TypeScript
- Firebase (Authentication, Firestore, Storage)
- Cloudinary (images and audio)
- React Navigation
- React Context and hooks for theme and auth‑related state
- Node.js email service for OTP handling

---

## Contributing

If you want to experiment or contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make and commit your changes: `git commit -m "Describe your change"`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a pull request

---

## Support

- Run `npm run security-check` if you suspect exposed keys
- Check your Firebase and Cloudinary dashboards for configuration issues
- If something looks like a bug in this repository, open an issue with logs and clear reproduction steps

