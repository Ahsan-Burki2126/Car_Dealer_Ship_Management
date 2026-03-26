# Google Drive Cloud Backup — Complete Setup Guide

This guide covers everything needed to get Google Drive backups working, from creating the Google Cloud project to the end-user connecting their account.

---

## Part 1: Developer / IT Admin Setup (One-Time)

This part must be done once before any user can connect their Google account. It creates the OAuth credentials that the app uses to talk to Google Drive.

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top-left (next to "Google Cloud")
3. Click **New Project**
4. Enter a name, e.g. `Pak Japan Vehicles Backup`
5. Click **Create**
6. Wait a few seconds, then select the new project from the dropdown

### Step 2: Enable the Google Drive API

1. In the left sidebar, go to **APIs & Services** > **Library**
2. Search for **Google Drive API**
3. Click on it, then click the **Enable** button
4. Wait for it to activate (takes a few seconds)

### Step 3: Configure the OAuth Consent Screen

This is what users see when they sign in with Google.

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace org, then pick Internal)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: `Pak Japan Vehicles Backup`
   - **User support email**: your email address
   - **Developer contact information**: your email address
5. Click **Save and Continue**
6. On the **Scopes** screen, click **Add or Remove Scopes**
7. Search for `drive.file` and check the box for:
   - `https://www.googleapis.com/auth/drive.file` — "See, edit, create, and delete only the specific Google Drive files you use with this app"
8. Click **Update**, then **Save and Continue**
9. On the **Test users** screen:
   - Click **Add Users**
   - Enter the Gmail addresses of anyone who will use the backup feature (including yourself)
   - Click **Add**, then **Save and Continue**
10. Click **Back to Dashboard**

> **Important:** While the app is in "Testing" status, only the test users you added can authenticate. To allow any Google account, you must publish the app (see Step 6 below).

### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. For **Application type**, select **Desktop app**
4. Name it something like `Dealership Desktop Client`
5. Click **Create**
6. A dialog appears with your credentials. Copy both values:
   - **Client ID** — looks like `123456789-abcdef.apps.googleusercontent.com`
   - **Client Secret** — looks like `GOCSPX-abcdefghijk`
7. Click **OK**

> Keep these credentials safe. Anyone with the Client Secret can impersonate your app.

### Step 5: Add Credentials to the App

You have three options. Pick whichever suits your deployment:

#### Option A: Environment Variables (Recommended for Development)

**Windows Command Prompt:**
```cmd
set GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
set GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijk
npm run dev
```

**Windows PowerShell:**
```powershell
$env:GOOGLE_CLIENT_ID = "123456789-abcdef.apps.googleusercontent.com"
$env:GOOGLE_CLIENT_SECRET = "GOCSPX-abcdefghijk"
npm run dev
```

**Linux / macOS:**
```bash
export GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
export GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijk
npm run dev
```

#### Option B: .env File (Recommended for Teams)

Create a `.env` file in the project root:

```env
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijk
```

> **Never commit the `.env` file to Git.** Add it to `.gitignore`.

#### Option C: Hardcode in Source (For Production Builds)

Edit `src/main/services/googleDriveService.ts` lines 20-24:

```typescript
const GOOGLE_CLIENT_ID = "123456789-abcdef.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "GOCSPX-abcdefghijk";
```

> Only do this if you are building a private, internal-only release. Never publish hardcoded secrets to a public repository.

### Step 6: Publish the App (Optional — For Production)

While the app is in "Testing" mode, only the test users you added in Step 3 can authenticate. To remove this restriction:

1. Go to **APIs & Services** > **OAuth consent screen**
2. Click **Publish App**
3. Google may ask you to verify the app (submit a verification form). For internal-use apps with the `drive.file` scope, this is usually straightforward.
4. Once published, any Google account can connect.

> If you keep the app in Testing mode, it works fine — you just need to manually add each user's Gmail to the test users list.

### Step 7: Configure the Redirect URI

The app uses `http://localhost:3000/auth/google/callback` as the OAuth redirect. This is already set in the code and works automatically for desktop apps. **No additional configuration is needed in Google Cloud Console** because desktop apps use the loopback redirect by default.

However, if you ever see a "redirect_uri_mismatch" error:

1. Go to **APIs & Services** > **Credentials**
2. Click on your OAuth client ID
3. Under **Authorized redirect URIs**, click **Add URI**
4. Enter: `http://localhost:3000/auth/google/callback`
5. Click **Save**

---

## Part 2: User Guide (Connecting Google Drive)

This is for the person using the software day-to-day.

### Prerequisites

- The developer/IT admin has completed Part 1 above
- You have a Google account (Gmail)
- Your computer has internet access

### Step 1: Open Backup Settings

1. Open the application
2. Go to **Backup & Recovery** from the sidebar
3. Look for the **Google Drive** section

### Step 2: Connect Your Google Account

1. Click the **Connect Google Drive** (or **Enable Cloud Backup**) button
2. Your default web browser will open automatically
3. Google's sign-in page appears — sign in with your Google account
4. You'll see a permission request: "Pak Japan Vehicles Backup wants to access your Google Drive"
5. Click **Allow** (or **Continue**)
6. You'll see a green "Connected!" confirmation page in your browser
7. You can close the browser tab — go back to the app

> **If you see "This app isn't verified":** This is normal for apps in Testing mode. Click **Advanced** > **Go to Pak Japan Vehicles Backup (unsafe)**. This is safe — it's your own app.

### Step 3: Verify It Worked

Back in the application:

- The Google Drive status should show as **Connected** (green)
- A folder called **DealershipBackups** is automatically created in your Google Drive
- You can verify by opening [Google Drive](https://drive.google.com/) and looking for the folder

### Step 4: How Backups Work

| Feature | How it works |
|---|---|
| **Automatic upload** | The most recent local backup is uploaded to Google Drive automatically every 24 hours |
| **Manual upload** | Click the upload button on the Backup page to upload immediately |
| **Download** | Download any Google Drive backup back to your computer from the Backup page |
| **Delete** | Remove old backups from Google Drive (requires superadmin password) |
| **Disconnect** | Click "Disconnect" to unlink your Google account. Local backups are not affected. |

### Step 5: Restoring from Google Drive (New PC / Data Recovery)

If you're setting up on a new computer or recovering data:

1. Install the application on the new PC
2. Open the app and go to **Backup & Recovery**
3. Connect Google Drive (follow Steps 1-2 above with the same Google account)
4. Your previous backups will appear in the **Cloud Backups** list
5. Click **Download** on the most recent backup
6. Click **Restore** on the downloaded backup
7. The app will restart with all your data restored

---

## Part 3: How It Works Technically

### OAuth Flow

```
User clicks "Connect"
       |
App starts local HTTP server on port 3000
       |
Browser opens Google consent screen
       |
User signs in and grants permission
       |
Google redirects to localhost:3000/auth/google/callback?code=XXX
       |
App exchanges the code for access + refresh tokens
       |
Tokens saved to: %appdata%/dealership-management-system/google-drive-config.json
       |
Local server shuts down
```

### What Gets Stored Where

| Item | Location |
|---|---|
| OAuth tokens | `%appdata%/dealership-management-system/google-drive-config.json` |
| Backup settings | `%appdata%/dealership-management-system/backup-settings.json` |
| Backup files in Google Drive | `My Drive / DealershipBackups / database_backup_YYYY-MM-DD_HHMMSS.db` |

### API Scope

The app requests only `drive.file` — the most restrictive Drive scope. It can **only** access files it created itself. It cannot read, modify, or delete any other files in the user's Google Drive.

### Token Refresh

The OAuth2 client automatically refreshes the access token using the stored refresh token. No user interaction is needed after the initial connection.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| **"Google Drive credentials are not configured"** | The developer hasn't set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. See Part 1, Step 5. |
| **"Port 3000 is in use"** | Another app is using port 3000. Close it (e.g. another dev server) and try again. |
| **"This app isn't verified"** | Normal for Testing mode. Click Advanced > Go to app. Or publish the app (Part 1, Step 6). |
| **"redirect_uri_mismatch"** | Add `http://localhost:3000/auth/google/callback` to your OAuth client's redirect URIs (Part 1, Step 7). |
| **"Authentication timed out"** | The sign-in wasn't completed within 5 minutes. Try again. |
| **Browser doesn't open** | Check if a default browser is set. Try manually opening the URL from the app logs. |
| **"Not authenticated with Google Drive"** | Token expired or was deleted. Click Disconnect, then Connect again. |
| **Backups not uploading automatically** | Ensure "Auto Upload to Google Drive" is enabled in Backup settings. Check internet connection. |
| **Can't find DealershipBackups folder** | Open Google Drive, search for "DealershipBackups". It's created automatically on first upload. |
| **"Access denied" after changing Google password** | Google revokes tokens on password change. Disconnect and reconnect. |

---

## Security Notes

- **OAuth 2.0** is used — the app never sees or stores your Google password
- **Tokens are stored locally** in `google-drive-config.json` — not sent to any third party
- **`drive.file` scope** means the app can only touch files it created — it cannot access your other Google Drive files
- **All backup operations are logged** in the app's immutable audit logs
- **Disconnecting** deletes the local token file immediately
- **HTTPS** is used for all communication with Google's servers
