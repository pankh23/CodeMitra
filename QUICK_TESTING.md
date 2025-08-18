# 🚀 Quick Testing Guide for CodeMitra

## 🎯 Quick Start (5 minutes)

Want to test the collaborative editing system quickly? Follow these steps:

### 1. Start Services
```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend  
cd frontend
npm run dev
```

### 2. Open Two Browser Tabs
- **Tab 1**: `http://localhost:3000`
- **Tab 2**: `http://localhost:3000`

### 3. Create/Join Room
- **Tab 1**: Click "Create Room" → Name: "Test" → Language: JavaScript → Create
- **Tab 2**: Copy the room URL from Tab 1 and paste it

### 4. Test Real-time Collaboration
- **Tab 1**: Type some code:
  ```javascript
  function hello() {
      console.log("Hello from Tab 1!");
  }
  ```
- **Tab 2**: Watch the code appear in real-time!

### 5. Test Cursor Sharing
- **Tab 1**: Click somewhere in the code
- **Tab 2**: You should see a colored cursor with the user's name

### 6. Test Language Switching
- **Tab 1**: Change language to Python
- **Tab 2**: Should automatically switch to Python with new boilerplate

---

## 🧪 Automated Testing

### Run All Tests
```bash
./run-all-tests.sh
```

### Run Individual Test Suites
```bash
# Test collaboration features
./test-collaboration.sh

# Test performance
./test-performance.sh

# Test all languages
./test-languages.sh

# Test CORS
./test-cors.sh
```

---

## 🔍 Manual Testing Scenarios

### Basic Collaboration Test
1. **Setup**: 2 browser tabs, same room
2. **Action**: Type code in Tab 1
3. **Expected**: Code appears in Tab 2 within 500ms
4. **Success**: ✅ Real-time sync working

### Cursor Sharing Test
1. **Setup**: 2 browser tabs, same room
2. **Action**: Move cursor in Tab 1
3. **Expected**: Cursor visible in Tab 2 with user name
4. **Success**: ✅ Cursor sharing working

### File Sharing Test
1. **Setup**: 2 browser tabs, same room
2. **Action**: Upload file in Tab 1 chat
3. **Expected**: File message appears in both tabs
4. **Success**: ✅ File sharing working

### Language Switch Test
1. **Setup**: 2 browser tabs, same room
2. **Action**: Change language in Tab 1
3. **Expected**: Both tabs switch to new language
4. **Success**: ✅ Language sync working

---

## 🐛 Common Issues & Quick Fixes

### Issue: Code not syncing
**Quick Fix**: Check browser console for errors
**Solution**: Verify Socket.IO connection, restart services

### Issue: Cursors not visible
**Quick Fix**: Check if both users are in same room
**Solution**: Verify room ID matches, check z-index conflicts

### Issue: File upload fails
**Quick Fix**: Check file size (max 10MB)
**Solution**: Verify file type support, check network

### Issue: Performance lag
**Quick Fix**: Check network latency
**Solution**: Monitor memory usage, optimize code

---

## 📊 Success Criteria

- ✅ **Real-time Sync**: < 500ms response time
- ✅ **Cursor Sharing**: Visible with user names
- ✅ **File Sharing**: Upload/download works
- ✅ **Language Sync**: Automatic switching
- ✅ **No Data Loss**: All edits preserved
- ✅ **Smooth UX**: No lag or freezing

---

## 🚀 Next Steps After Testing

1. **If All Tests Pass**: 🎉 Your system is ready!
2. **If Some Tests Fail**: Review error logs, fix issues
3. **Performance Issues**: Run `./test-performance.sh` for detailed analysis
4. **Language Issues**: Run `./test-languages.sh` for language-specific tests

---

## 💡 Pro Tips

- **Test with 3+ tabs** for multi-user scenarios
- **Use different browsers** for cross-browser testing
- **Test network interruptions** by disconnecting internet
- **Monitor browser console** for real-time error feedback
- **Use large code files** to test performance limits

---

**Happy Testing! 🎉**

Need help? Check the detailed `COLLABORATION_TESTING.md` guide or run the automated test suite.
