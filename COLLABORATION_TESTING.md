# 🧪 Collaborative Editing Testing Guide

## Overview
This guide provides step-by-step instructions for testing the real-time collaborative editing features of CodeMitra.

## 🚀 Prerequisites
- Frontend running on `http://localhost:3000`
- Backend running on `http://localhost:5001`
- Database (PostgreSQL) running
- Redis running for Socket.IO
- At least 2 browser tabs/windows for testing

## 📋 Test Scenarios

### Scenario 1: Basic Real-time Collaboration
**Objective**: Verify that multiple users can edit code simultaneously with real-time synchronization.

**Steps**:
1. **Open Frontend**: Navigate to `http://localhost:3000` in Browser Tab 1
2. **Create Room**: Click "Create Room" and set:
   - Room Name: "Test Collaboration"
   - Language: JavaScript
   - Public: Yes
3. **Copy Room URL**: Copy the room URL from the address bar
4. **Open Second Tab**: Open a new browser tab and paste the room URL
5. **Join Room**: Both tabs should now be in the same room
6. **Start Typing**: In Tab 1, start typing some JavaScript code:
   ```javascript
   function hello() {
       console.log("Hello from Tab 1!");
   }
   ```
7. **Verify Sync**: Check Tab 2 - the code should appear in real-time
8. **Reverse Test**: In Tab 2, add more code:
   ```javascript
   function world() {
       console.log("Hello from Tab 2!");
   }
   ```
9. **Verify Sync**: Check Tab 1 - the new code should appear

**Expected Results**:
- ✅ Code changes sync in real-time between tabs
- ✅ No conflicts or data loss
- ✅ Smooth typing experience

---

### Scenario 2: Cursor Position Sharing
**Objective**: Verify that users can see each other's cursor positions and selections.

**Steps**:
1. **Position Cursors**: In Tab 1, click somewhere in the middle of the code
2. **Verify Display**: In Tab 2, you should see:
   - A colored cursor line (Tab 1's color)
   - User name label above the cursor
3. **Move Cursor**: In Tab 1, move the cursor to different positions
4. **Verify Movement**: Tab 2 should see the cursor moving in real-time
5. **Text Selection**: In Tab 1, select some text (drag to highlight)
6. **Verify Selection**: Tab 2 should see the selection highlight

**Expected Results**:
- ✅ Cursor positions are visible in real-time
- ✅ User names are displayed with cursors
- ✅ Text selections are highlighted
- ✅ Smooth cursor movement

---

### Scenario 3: Language Switching
**Objective**: Verify that language changes sync across all users.

**Steps**:
1. **Change Language**: In Tab 1, change the language from JavaScript to Python
2. **Verify Sync**: Tab 2 should automatically switch to Python
3. **Check Boilerplate**: Both tabs should show Python boilerplate code
4. **Reverse Test**: In Tab 2, change to Java
5. **Verify Sync**: Tab 1 should switch to Java

**Expected Results**:
- ✅ Language changes sync immediately
- ✅ Boilerplate code loads correctly
- ✅ Syntax highlighting updates
- ✅ No conflicts between users

---

### Scenario 4: File Sharing in Chat
**Objective**: Verify that users can share files through the chat interface.

**Steps**:
1. **Open Chat**: In Tab 1, ensure the chat panel is visible
2. **Attach File**: Click the paperclip icon and select a small text file
3. **Upload File**: Click "Upload" and wait for completion
4. **Verify Display**: Both tabs should see the file message
5. **Download File**: In Tab 2, click on the file message to download
6. **Test Different Types**: Try uploading:
   - Text files (.txt, .js, .py)
   - Images (.png, .jpg)
   - Small documents

**Expected Results**:
- ✅ File uploads complete successfully
- ✅ File messages appear in both tabs
- ✅ Downloads work correctly
- ✅ File size limits are enforced

---

### Scenario 5: Emoji Support
**Objective**: Verify that emoji picker works and emojis display correctly.

**Steps**:
1. **Open Emoji Picker**: In Tab 1, click the smile icon in chat
2. **Select Emoji**: Choose an emoji from the picker
3. **Send Message**: Type some text with the emoji and send
4. **Verify Display**: Both tabs should see the emoji correctly
5. **Test Multiple**: Send messages with multiple emojis
6. **Test Categories**: Try different emoji categories

**Expected Results**:
- ✅ Emoji picker opens correctly
- ✅ Emojis are inserted into messages
- ✅ Emojis display correctly in both tabs
- ✅ No encoding issues

---

### Scenario 6: Conflict Resolution
**Objective**: Verify that the Operational Transformation system handles conflicts correctly.

**Steps**:
1. **Simultaneous Edits**: In both tabs, quickly type at the same time
2. **Same Position**: Try typing at the exact same position simultaneously
3. **Different Positions**: Type at different positions simultaneously
4. **Large Changes**: Make large deletions/insertions simultaneously
5. **Verify Consistency**: Check that both tabs end up with the same code

**Expected Results**:
- ✅ No data loss during conflicts
- ✅ Both users see consistent final state
- ✅ Smooth conflict resolution
- ✅ No infinite loops or crashes

---

### Scenario 7: Performance Under Load
**Objective**: Verify that the system performs well with multiple users and large code.

**Steps**:
1. **Large Code**: Paste a large code file (1000+ lines) in Tab 1
2. **Multiple Edits**: Make rapid edits in both tabs
3. **Monitor Performance**: Watch for lag or delays
4. **Memory Usage**: Check browser memory usage
5. **Network Activity**: Monitor network requests

**Expected Results**:
- ✅ No significant lag during editing
- ✅ Memory usage remains reasonable
- ✅ Network requests are optimized
- ✅ Smooth scrolling and editing

---

### Scenario 8: Network Disconnection
**Objective**: Verify graceful handling of network issues.

**Steps**:
1. **Disconnect Network**: Temporarily disconnect internet
2. **Continue Editing**: Keep typing in both tabs
3. **Reconnect Network**: Restore internet connection
4. **Verify Sync**: Check that changes sync after reconnection
5. **Check Status**: Verify connection status indicators

**Expected Results**:
- ✅ Graceful handling of disconnection
- ✅ Changes are queued during offline
- ✅ Automatic sync after reconnection
- ✅ Clear status indicators

---

## 🔍 Testing Checklist

### Core Functionality
- [ ] Real-time code synchronization
- [ ] Cursor position sharing
- [ ] Language switching
- [ ] File sharing
- [ ] Emoji support
- [ ] Conflict resolution

### Performance
- [ ] Response time < 100ms for local changes
- [ ] Response time < 500ms for remote changes
- [ ] Memory usage < 100MB per tab
- [ ] Smooth scrolling and editing
- [ ] No lag during rapid typing

### Edge Cases
- [ ] Large files (1000+ lines)
- [ ] Special characters and Unicode
- [ ] Very long lines
- [ ] Mixed language content
- [ ] Network interruptions

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## 🐛 Common Issues & Solutions

### Issue: Code not syncing
**Solution**: Check browser console for errors, verify Socket.IO connection

### Issue: Cursors not visible
**Solution**: Ensure both users are in the same room, check z-index conflicts

### Issue: File upload fails
**Solution**: Check file size limits, verify file type support

### Issue: Performance lag
**Solution**: Check network latency, monitor memory usage

## 📊 Success Criteria

- ✅ **Real-time Sync**: Changes appear within 500ms
- ✅ **No Data Loss**: All edits are preserved
- ✅ **Smooth UX**: No lag or freezing during editing
- ✅ **Multi-user**: 2+ users can edit simultaneously
- ✅ **File Sharing**: Files upload/download correctly
- ✅ **Emoji Support**: Emojis display and transmit correctly

## 🚀 Next Steps After Testing

1. **Performance Optimization**: If lag is detected
2. **Error Handling**: Improve error messages and recovery
3. **Mobile Testing**: Test on mobile devices
4. **Load Testing**: Test with 5+ simultaneous users
5. **Security Testing**: Verify file upload security

---

**Happy Testing! 🎉**

If you encounter any issues, check the browser console and backend logs for detailed error information.
