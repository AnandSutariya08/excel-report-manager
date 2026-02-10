# Firebase Storage CORS Configuration Guide

## 🚨 Current Issue

You're seeing CORS errors when trying to read master files from Firebase Storage. Even though we're using `getDownloadURL()`, the browser still blocks the request if CORS isn't configured.

## ✅ Solution: Configure CORS in Firebase Storage

### Option 1: Using Google Cloud SDK (Recommended)

#### Step 1: Install Google Cloud SDK

**Windows:**
1. Download from: https://cloud.google.com/sdk/docs/install
2. Run the installer
3. Follow the installation wizard

**macOS:**
```bash
brew install google-cloud-sdk
```

**Linux:**
```bash
# Follow instructions at: https://cloud.google.com/sdk/docs/install
```

#### Step 2: Authenticate

```bash
gcloud auth login
gcloud config set project hotel-7ac9f
```

#### Step 3: Run the Configuration Script

**Windows (PowerShell):**
```powershell
.\configure-cors.ps1
```

**macOS/Linux:**
```bash
chmod +x configure-cors.sh
./configure-cors.sh
```

**Or manually:**
```bash
gsutil cors set configure-cors.json gs://hotel-7ac9f.appspot.com
```

#### Step 4: Verify Configuration

```bash
gsutil cors get gs://hotel-7ac9f.appspot.com
```

You should see the CORS configuration with your localhost origins.

---

### Option 2: Using Firebase Console (Alternative - Limited)

Unfortunately, Firebase Console doesn't provide a direct way to configure CORS. You need to use `gsutil` (Option 1).

---

### Option 3: Manual Configuration

If you prefer to configure manually:

1. **Create `cors.json`** (already created in project root)

2. **Apply it:**
```bash
gsutil cors set configure-cors.json gs://hotel-7ac9f.appspot.com
```

3. **Verify:**
```bash
gsutil cors get gs://hotel-7ac9f.appspot.com
```

---

## 🔍 What the CORS Configuration Does

The `configure-cors.json` file allows:
- **Origins:** `http://localhost:8080`, `http://localhost:5173`, etc.
- **Methods:** GET, POST, PUT, DELETE, HEAD, OPTIONS
- **Headers:** Content-Type, Authorization, and Firebase-specific headers
- **Max Age:** 3600 seconds (1 hour)

This allows your browser to fetch files from Firebase Storage without CORS errors.

---

## ✅ After Configuration

1. **Refresh your browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear browser cache** if needed
3. **Check console** - CORS errors should be gone
4. **Verify data loads** - Master file should load successfully

---

## 🐛 Troubleshooting

### "gsutil: command not found"
- Install Google Cloud SDK (see Step 1 above)
- Make sure it's in your PATH

### "Permission denied"
- Run `gcloud auth login` to authenticate
- Make sure you have Storage Admin permissions

### "Bucket not found"
- Verify project ID: `hotel-7ac9f`
- Check bucket name: `hotel-7ac9f.appspot.com`
- Verify in Firebase Console → Storage

### Still seeing CORS errors after configuration
1. **Wait a few minutes** - CORS changes can take time to propagate
2. **Clear browser cache** - Old cached requests might cause issues
3. **Hard refresh** - Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
4. **Check configuration** - Run `gsutil cors get gs://hotel-7ac9f.appspot.com` to verify

---

## 📝 Quick Reference

```bash
# Set CORS
gsutil cors set configure-cors.json gs://hotel-7ac9f.appspot.com

# Get CORS (verify)
gsutil cors get gs://hotel-7ac9f.appspot.com

# Remove CORS (if needed)
gsutil cors set [] gs://hotel-7ac9f.appspot.com
```

---

## 🎯 Expected Result

After configuration, you should see:
- ✅ No CORS errors in console
- ✅ Master file loads successfully
- ✅ Orders appear in the dashboard
- ✅ Console shows: "Successfully loaded X rows from master.xlsx"

