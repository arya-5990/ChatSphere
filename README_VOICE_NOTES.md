# Voice Notes Feature

## Overview
The ChatSphere app now includes comprehensive voice note functionality that allows users to record, send, and play voice messages in their chats.

## Features

### 1. Voice Recording
- **Microphone Permission**: Automatically requests microphone permission
- **High Quality Recording**: Uses high-quality audio recording settings
- **Real-time Duration**: Shows recording duration in real-time
- **Minimum Duration**: Requires at least 1 second of recording
- **Visual Feedback**: Red recording indicator and duration display

### 2. Voice Note Sending
- **Cloudinary Upload**: Audio files are uploaded to Cloudinary
- **Firebase Storage**: Voice note URLs are stored in Firebase
- **Message Integration**: Voice notes appear as regular messages in chat
- **Read Receipts**: Voice notes support read receipts like text messages

### 3. Voice Note Playback
- **Play/Pause**: Tap to play or pause voice notes
- **Visual Waveform**: Shows audio waveform representation
- **Duration Display**: Shows voice note duration
- **Auto-stop**: Automatically stops when playback finishes
- **Single Playback**: Only one voice note plays at a time

### 4. Chat List Integration
- **Voice Note Indicators**: Shows 🎤 icon for voice notes in chat list
- **Read Status**: Displays read receipts for voice notes
- **Unread Count**: Includes voice notes in unread message count

## Technical Implementation

### Dependencies Added
```json
{
  "expo-av": "~15.0.0"
}
```

### Message Structure
Voice notes are stored in the message structure:
```json
{
  "id": "message_id",
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
- **Audio Upload**: Uses Cloudinary's video upload endpoint for audio files
- **Resource Type**: Audio files are uploaded as 'video' resource type
- **File Format**: Supports M4A audio format
- **URL Storage**: Secure URLs are stored in Firebase

### Firebase Structure
Voice notes are stored in the messages subcollection:
```
/chats/{chatId}/messages/{messageId}
```

## User Interface

### Recording Interface
- **Microphone Button**: Tap to start recording (appears when text input is empty)
- **Recording State**: Shows "Recording..." with duration and red indicator
- **Stop Button**: Red button to stop recording
- **Auto-send**: Automatically sends voice note after stopping

### Voice Note Display
- **Play Button**: ▶️ icon to play voice note
- **Pause Button**: ⏸️ icon when playing
- **Waveform**: Visual representation of audio
- **Duration**: Shows MM:SS format
- **Message Bubble**: Integrated into chat message design

### Chat List Display
- **Voice Note Icon**: 🎤 icon for voice note messages
- **Read Status**: Shows read receipts (✓✓ for read, ✓ for sent)
- **Unread Count**: Includes voice notes in unread message count

## Usage

### Recording a Voice Note
1. Tap the microphone button (🎤) in the chat input
2. Speak your message (minimum 1 second)
3. Tap "Stop" to finish recording
4. Voice note is automatically uploaded and sent

### Playing a Voice Note
1. Tap the play button (▶️) on any voice note
2. Voice note starts playing with visual feedback
3. Tap pause (⏸️) to stop playback
4. Playback automatically stops when finished

### Permissions
- **Microphone Access**: Required for voice recording
- **Storage Access**: Required for temporary audio files
- **Network Access**: Required for uploading to Cloudinary

## Technical Notes

### Audio Quality
- **Format**: M4A (high quality, compressed)
- **Sample Rate**: 44.1kHz
- **Bit Rate**: High quality preset
- **Channels**: Stereo

### Performance
- **File Size**: Optimized for mobile networks
- **Upload Speed**: Depends on network connection
- **Playback**: Streams from Cloudinary CDN
- **Caching**: Automatic caching for better performance

### Error Handling
- **Permission Denied**: Shows alert for microphone permission
- **Recording Failed**: Shows error message and retry option
- **Upload Failed**: Shows error message and retry option
- **Playback Failed**: Shows error message for corrupted files

## Security
- **Secure URLs**: Cloudinary provides secure HTTPS URLs
- **Access Control**: URLs are not publicly accessible without proper authentication
- **File Validation**: Audio files are validated before upload
- **Size Limits**: Reasonable file size limits to prevent abuse

## Future Enhancements
- **Voice Note Transcription**: Convert speech to text
- **Voice Note Reactions**: Add reactions to voice notes
- **Voice Note Forwarding**: Forward voice notes to other chats
- **Voice Note Search**: Search within voice note content
- **Voice Note Editing**: Trim or edit voice notes before sending 