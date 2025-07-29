# Security Setup for ChatSphere

## ⚠️ IMPORTANT: API Keys Security

Your API keys are currently exposed in the source code. This is a **CRITICAL SECURITY RISK**. Follow these steps immediately to secure your application.

## 🔐 How to Secure Your API Keys

### 1. Create Environment Files

Create a `.env` file in your project root (this file should NEVER be committed to git):

```bash
# Firebase Configuration
FIREBASE_API_KEY=your_actual_firebase_api_key
FIREBASE_PROJECT_ID=your_actual_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_actual_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_actual_firebase_messaging_sender_id

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_actual_cloudinary_cloud_name
CLOUDINARY_UPLOAD_PRESET=your_actual_cloudinary_upload_preset
CLOUDINARY_API_KEY=your_actual_cloudinary_api_key
CLOUDINARY_API_SECRET=your_actual_cloudinary_api_secret
```

### 2. Update Configuration

Replace the placeholder values in `src/config/env.ts` with your actual API keys:

```typescript
const config: Config = {
  firebase: {
    apiKey: "AIzaSyCrI9OulD9FUQLHcWuyelO2FocquJ1A048",
    projectId: "chatsphere-54fb7",
    storageBucket: "chatsphere-54fb7.firebasestorage.app",
    messagingSenderId: "467105186042",
  },
  cloudinary: {
    cloudName: "dpvab3v9f",
    uploadPreset: "chatsphere_preset",
    apiKey: "915544357637558",
    apiSecret: "eQR7z9rrUXMTa2qjvScLyUdZrp4",
  },
};
```

### 3. Verify .gitignore

Make sure your `.gitignore` file includes:

```
# Environment files
.env
.env.local
.env.production
config.env
```

### 4. For Production Deployment

For production, consider these secure approaches:

#### Option A: Build-time Environment Variables
- Use your deployment platform's environment variable system
- Set environment variables in your CI/CD pipeline
- Use build-time configuration

#### Option B: Remote Configuration
- Use Firebase Remote Config
- Store sensitive data in secure cloud storage
- Fetch configuration at runtime

#### Option C: Secure Storage
- Use React Native's secure storage
- Encrypt sensitive data
- Store keys in device keychain

## 🚨 Immediate Actions Required

1. **STOP** any git commits until you've secured your keys
2. **REGENERATE** your API keys if they've been exposed
3. **UPDATE** your configuration files
4. **TEST** that everything works with the new setup
5. **COMMIT** only after removing all hardcoded keys

## 🔍 How to Check if Keys are Exposed

Search your codebase for any hardcoded API keys:

```bash
# Search for Firebase API key
grep -r "AIzaSy" .

# Search for Cloudinary keys
grep -r "915544357637558" .
grep -r "eQR7z9rrUXMTa2qjvScLyUdZrp4" .
```

## 📝 Best Practices

1. **Never commit API keys to version control**
2. **Use environment variables for all sensitive data**
3. **Rotate keys regularly**
4. **Use different keys for development and production**
5. **Monitor your API usage for suspicious activity**
6. **Set up proper Firebase security rules**
7. **Use Cloudinary's upload presets with restrictions**

## 🛠️ Development Workflow

1. Copy `env.example` to `.env`
2. Fill in your actual API keys in `.env`
3. The app will load configuration from environment variables
4. Keep `.env` out of version control

## 🔒 Additional Security Measures

- Set up Firebase Authentication
- Configure proper Firestore security rules
- Use Cloudinary's upload presets with restrictions
- Implement rate limiting
- Monitor API usage and costs
- Set up alerts for unusual activity

## 📞 Need Help?

If you need assistance with security setup:
1. Check the official documentation for Firebase and Cloudinary
2. Review React Native security best practices
3. Consider using a security audit tool
4. Consult with security experts if needed 