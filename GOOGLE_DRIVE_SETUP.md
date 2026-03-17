# Google Drive Cloud Backup - Setup Guide

## 🎯 For Non-Technical Users (Easy Setup)

1. **Click "Enable Cloud Backup"** in the Backup & Recovery page
2. **Follow the setup wizard** - it will guide you through:
   - Click "Get Started"
   - A browser window opens
   - Sign in with your Google account
   - Grant permission to backup
   - Click "Done" - that's it!

✅ **Your cloud backups are now active!** Daily backups will sync automatically to your Google Drive account.

---

## 👨‍💻 For Technical Users / System Administrators

### Option 1: Using Public OAuth (Recommended for Businesses)

1. Get OAuth credentials from your IT department or create your own:
   - Go to https://console.cloud.google.com/
   - Create a new project
   - Navigate to "APIs & Services" → "Credentials"
   - Create "OAuth 2.0 Client ID" (Desktop application)
   - Copy the Client ID and Client Secret

2. Set environment variables before starting the app:

   **Windows (Command Prompt):**

   ```cmd
   set GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   set GOOGLE_CLIENT_SECRET=your_client_secret
   npm run dev
   ```

   **Windows (PowerShell):**

   ```powershell
   $env:GOOGLE_CLIENT_ID = "your_client_id.apps.googleusercontent.com"
   $env:GOOGLE_CLIENT_SECRET = "your_client_secret"
   npm run dev
   ```

   **Linux/Mac:**

   ```bash
   export GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   export GOOGLE_CLIENT_SECRET=your_client_secret
   npm run dev
   ```

3. Or create a `.env` file in project root:
   ```
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

### Setup OAuth 2.0 Credentials (Step-by-step)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project", enter name, click "Create"
3. Go to "APIs & Services" → "Library"
4. Search "Google Drive API" → Click → Click "Enable"
5. Go to "APIs & Services" → "Credentials"
6. Click "Create Credentials" → "OAuth 2.0 Client ID"
7. Select "Desktop application"
8. Click "Create"
9. Copy the Client ID and Client Secret
10. Click "Done"

---

## 🔐 Security

### What's Protected:

- ✅ Tokens stored locally in encrypted config file
- ✅ OAuth 2.0 authentication (never shares passwords)
- ✅ Role-based access (Admin/Super Admin only)
- ✅ HTTPS encryption with Google
- ✅ Backups in your own Google account
- ✅ All operations logged in Audit Logs

### Data Privacy:

- Your backups are stored in **your own** Google Drive account
- The app only has permission to manage backup files
- No one else can access your backups
- You can disconnect anytime

---

## ✅ Verification

After setup, you should see:

- ✅ Green status: "Cloud Backup Active"
- ✅ A folder named "DealershipBackups" in your Google Drive
- ✅ Backups appear daily in the "Cloud Backups" section

---

## ❌ Troubleshooting

| Problem                           | Solution                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| **"Browser window won't open"**   | Check if popups are blocked. Allow popups for this app.                              |
| **"Authentication failed"**       | Make sure you're logged into your Google account in your browser.                    |
| **"Connect button does nothing"** | Check your internet connection. Restart the app.                                     |
| **"No backups in Google Drive"**  | Wait for the first daily backup (24 hours). Or manually create one from Backup page. |
| **"Can't find my files"**         | Search your Google Drive for folder named "DealershipBackups"                        |

---

## 📞 Need Help?

- Check Application Logs: Settings → Audit Logs → search for backup operations
- Verify internet connection
- Try disconnecting and reconnecting the Google account
- Check that you have storage space in Google Drive
