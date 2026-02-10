# Fix CORS Error for Firebase Storage

## 🚨 Problem
You're getting CORS errors when trying to read master files from Firebase Storage, even though we're using Firebase SDK's `getBytes()` method.

## ✅ Solution: Configure CORS on Firebase Storage Bucket

Even with Firebase SDK methods, the Storage bucket needs CORS configuration to allow browser requests.

### Quick Fix (Windows PowerShell):

1. **Install Google Cloud SDK** (if not installed):
   - Download from: https://cloud.google.com/sdk/docs/install
   - Run the installer

2. **Authenticate**:
   ```powershell
   gcloud auth login
   gcloud config set project demoproject-c9fbc
   ```

3. **Run the CORS configuration script**:
   ```powershell
   .\configure-cors.ps1
   ```

   **OR manually:**
   ```powershell
   gsutil cors set configure-cors.json gs://demoproject-c9fbc.firebasestorage.app
   ```

4. **Verify it worked**:
   ```powershell
   gsutil cors get gs://demoproject-c9fbc.firebasestorage.app
   ```

5. **Refresh your browser** (hard refresh: Ctrl+Shift+R)

### Quick Fix (macOS/Linux):

1. **Install Google Cloud SDK**:
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticate**:
   ```bash
   gcloud auth login
   gcloud config set project demoproject-c9fbc
   ```

3. **Run the CORS configuration script**:
   ```bash
   chmod +x configure-cors.sh
   ./configure-cors.sh
   ```

   **OR manually:**
   ```bash
   gsutil cors set configure-cors.json gs://demoproject-c9fbc.firebasestorage.app
   ```

4. **Verify it worked**:
   ```bash
   gsutil cors get gs://demoproject-c9fbc.firebasestorage.app
   ```

5. **Refresh your browser** (hard refresh: Cmd+Shift+R)

---

## 📋 What This Does

The CORS configuration allows your browser (running on localhost) to:
- ✅ Read files from Firebase Storage
- ✅ Upload files to Firebase Storage
- ✅ Use Firebase SDK methods without CORS errors

---

## 🔍 Verify It's Working

After configuration:
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console - CORS errors should be gone
4. Try uploading a file - it should work
5. Check Orders page - master files should load

---

## ⚠️ Troubleshooting

### "gsutil: command not found"
- Install Google Cloud SDK
- Make sure it's in your PATH
- Restart terminal/PowerShell

### "Permission denied"
- Run `gcloud auth login`
- Make sure you have Storage Admin permissions in Firebase

### "Bucket not found"
- Verify project ID: `demoproject-c9fbc`
- Check bucket name: `demoproject-c9fbc.firebasestorage.app`
- Verify in Firebase Console → Storage

### Still seeing CORS errors
1. Wait 2-3 minutes (CORS changes can take time to propagate)
2. Clear browser cache completely
3. Hard refresh browser
4. Check CORS config: `gsutil cors get gs://demoproject-c9fbc.firebasestorage.app`

---

## 🎯 Expected Result

After configuration:
- ✅ No CORS errors in console
- ✅ Master files load successfully
- ✅ Orders appear in dashboard
- ✅ File uploads work correctly

