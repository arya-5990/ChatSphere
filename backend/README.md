# ChatSphere Email Server

This is the backend email server for ChatSphere's OTP functionality. It handles sending verification codes via email using Gmail SMTP.

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Start the Server
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## 📧 Email Configuration

The server is configured to use:
- **Email**: `aryasha4906c@gmail.com`
- **App Password**: `zlfn ncoh zjjj pkxt`

## 🔗 API Endpoints

### Health Check
```
GET http://localhost:3001/api/health
```

### Send OTP Email
```
POST http://localhost:3001/api/send-otp
Content-Type: application/json

{
  "to": "user@example.com",
  "otp": "123456"
}
```

## 📱 Mobile App Integration

The React Native app will automatically connect to this server at `http://localhost:3001/api`. If the server is not available, the app will fall back to simulation mode for testing.

## 🔧 Environment Variables

You can customize the server by setting these environment variables:

```bash
PORT=3001  # Server port (default: 3001)
```

## 🛠️ Troubleshooting

### Common Issues

1. **Port already in use**: Change the PORT environment variable
2. **Gmail authentication failed**: Check if the app password is correct
3. **CORS errors**: The server includes CORS middleware for cross-origin requests

### Testing the Server

You can test the email functionality using curl:

```bash
curl -X POST http://localhost:3001/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "otp": "123456"}'
```

## 📋 Requirements

- Node.js 14+
- npm or yarn
- Gmail account with App Password enabled

## 🔒 Security Notes

- The app password is hardcoded for development
- In production, use environment variables for sensitive data
- Consider rate limiting for the email endpoint
- Implement proper authentication for the API 