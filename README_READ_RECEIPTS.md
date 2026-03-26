# Read Receipts Feature

## Overview
The ChatSphere app now includes comprehensive read receipts functionality that shows when messages have been sent, delivered, and read by recipients.

## New Firebase Structure

### Chat Collection: `/chats/{chatId}`
```json
{
  "createdAt": "2025-01-29T21:00:00Z",
  "lastMessage": "Hi there!",
  "lastMessageTime": "2025-01-29T21:05:00Z",
  "lastMessageSenderId": "1",
  "participants": ["1", "2"]
}
```

### Messages Subcollection: `/chats/{chatId}/messages/{messageId}`
```json
{
  "senderId": "1",
  "text": "Hi",
  "timestamp": "2025-01-29T21:00:00Z",
  "seenBy": {
    "2": "2025-01-29T21:05:00Z"
  }
}
```

## Features

### 1. Message Status Indicators
- **Sent** (✓): Message has been sent to the server
- **Delivered** (✓✓): Message has been delivered to the recipient's device
- **Seen** (✓✓ + "Seen" text): Message has been read by the recipient

### 2. Chat List Message Display
The chat list now shows messages with intelligent formatting:

- **Messages sent by you**: `sent: [message] ✓` or `sent: [message] ✓✓`
- **Single received message**: Shows the actual message text
- **Multiple unread messages**: Shows count like `4 new msgs`

### 3. Automatic Read Marking
- Messages are automatically marked as read when:
  - The user opens the chat screen
  - The user scrolls through messages
  - Messages become visible in the chat view
  - The user scrolls to the bottom of the chat

### 4. Auto-Scroll and Unread Message Divider
- **Auto-scroll to newest message**: After sending a message, the chat automatically scrolls to the bottom
- **Scroll to unread messages**: When opening a chat, it automatically scrolls to the first unread message
- **Unread message divider**: Shows a temporary "New Messages" divider at the first unread message
- **Divider auto-hide**: The divider disappears after 2 seconds once messages are marked as read

### 5. Real-time Updates
- Read receipts update in real-time using Firebase's `onSnapshot`
- Both sender and recipient see status changes immediately

## Implementation Details

### ChatScreen.tsx
- Updated `Message` interface to include `seenBy` field
- Added `markMessagesAsRead()` function
- Enhanced message rendering with status indicators
- Added automatic read marking on screen focus and scroll
- Uses new Firebase structure with messages subcollection
- **Auto-scroll functionality**: Scrolls to newest message after sending
- **Unread message detection**: Finds and scrolls to first unread message
- **Temporary divider**: Shows "New Messages" divider that auto-hides

### ChatsScreen.tsx
- Updated chat list to show intelligent message formatting
- Added unread message counting from subcollection
- Enhanced `ChatItem` interface to support read status
- Uses new Firebase structure with participants field

### Firebase Integration
- Messages are stored in subcollections for better scalability
- Real-time listeners update read status across devices
- `lastMessageSenderId` field tracks who sent the last message
- Efficient queries using Firestore's subcollection structure

## Migration
A migration script (`migrate_to_new_structure.js`) is provided to convert existing data from the old structure to the new structure.

## Usage
1. Send a message - it will show "sent: [message] ✓" in chat list
2. When recipient opens the chat, message shows "Delivered" in chat screen
3. When recipient views the message, it shows "Seen" in chat screen
4. For multiple unread messages, chat list shows "X new msgs"
5. Both users see the status updates in real-time

## Technical Notes
- Read receipts are stored as ISO timestamp strings
- Only messages from other users are marked as read by current user
- The system handles edge cases like deleted users gracefully
- Performance optimized with efficient Firebase subcollection queries
- New structure supports better scalability for large chat histories 