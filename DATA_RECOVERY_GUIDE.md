# Data Recovery & Migration Guide — Pak Japan Motors, Layyah

This document explains where your data is stored, how to back it up, how to recover it if your PC breaks, and how to move the software to a new computer.

---

## 1. Where Is My Data Stored?

All application data lives inside the Electron **userData** folder. On Windows this is:

```
C:\Users\<YourUsername>\AppData\Roaming\dealership-management-system\
```

> **Tip:** To quickly open this folder, press `Win + R`, type `%appdata%\dealership-management-system` and hit Enter.

### Files inside this folder

| File / Folder             | What it contains                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `dealership.db`           | The main SQLite database — all vehicles, customers, sales, installments, payments, expenses, inspections, audit logs, users, etc. |
| `dealership.db-wal`       | Write-ahead log (part of the database — always copy together with `.db`)                                                          |
| `dealership.db-shm`       | Shared memory file (part of the database — always copy together with `.db`)                                                       |
| `images/`                 | All uploaded photos — vehicle photos, seller photos, CNIC photos, inspection photos                                               |
| `Backups/`                | Automatic and manual database backup files (timestamped `.db` copies)                                                             |
| `backup-settings.json`    | Your backup configuration (Google Drive toggle, auto-upload setting)                                                              |
| `google-drive-token.json` | Google Drive OAuth token (if Google Drive backup is enabled)                                                                      |

### What is NOT in this folder

- The **application itself** (the `.exe` / installed program) is separate from your data.
- Reinstalling or updating the app does **not** delete your data.

---

## 2. How to Back Up Your Data

### Option A: Use the Built-In Backup (Recommended)

The app automatically creates a backup every 24 hours, saved to:

```
C:\Users\<YourUsername>\AppData\Roaming\dealership-management-system\Backups\
```

Each file is named like `database_backup_2026-03-26_143000.db`.

You can also create a **manual backup** at any time from the app's Settings/Backup page.

### Option B: Manual File Copy

1. **Close the application** (important — ensures the database is not being written to)
2. Navigate to `%appdata%\dealership-management-system\`
3. Copy these items to a USB drive, external hard disk, or cloud storage:
   - `dealership.db`
   - `dealership.db-wal` (if it exists)
   - `dealership.db-shm` (if it exists)
   - The entire `images/` folder
   - (Optional) The entire `Backups/` folder

> **IMPORTANT:** Always copy `dealership.db`, `dealership.db-wal`, and `dealership.db-shm` together. The WAL file may contain recent writes that haven't been merged into the main `.db` file yet. Missing the WAL file means you could lose the most recent data.

### Option C: Google Drive Backup

The app supports automatic Google Drive upload:

1. Go to Settings > Backup in the app
2. Enable Google Drive backup and authenticate with your Google account
3. The app will automatically upload your most recent local backup to Google Drive
4. You can also manually upload/download backups from the Google Drive section

This is the **safest option** — your data is stored off-site and survives hard drive failure, theft, or fire.

---

## 3. How to Recover Data (PC Broken / Hard Drive Failed)

### If you have a backup file (.db) on USB / external drive / Google Drive:

1. Install the application on the new PC
2. Run it once and then **close it** (this creates the empty userData folder)
3. Navigate to the new PC's userData folder:
   ```
   C:\Users\<YourUsername>\AppData\Roaming\dealership-management-system\
   ```
4. Replace `dealership.db` with your backup `.db` file (rename your backup to `dealership.db`)
5. Delete `dealership.db-wal` and `dealership.db-shm` if they exist (stale files from the empty database)
6. Copy your `images/` folder into the same directory
7. Start the application — all your data should be there

### If you have a Google Drive backup:

1. Install the application on the new PC
2. Open the app, go to Settings > Backup > Google Drive
3. Authenticate with the same Google account
4. Download the most recent backup
5. Use the app's built-in **Restore** feature to restore from the downloaded file

### If your old hard drive is still accessible (even partially):

1. Connect the old hard drive to the new PC (via USB adapter or as a secondary drive)
2. Navigate to the old drive's user folder:
   ```
   <OldDrive>:\Users\<YourOldUsername>\AppData\Roaming\dealership-management-system\
   ```
3. Copy `dealership.db`, `dealership.db-wal`, `dealership.db-shm`, and the `images/` folder
4. Paste them into the new PC's userData folder (same path but under the new username)

---

## 4. How to Move the Software to a New PC

### Step-by-step migration:

1. **On the old PC:**
   - Close the application
   - Go to `%appdata%\dealership-management-system\`
   - Copy the **entire folder** to a USB drive

2. **On the new PC:**
   - Install the application
   - Run it once, then close it
   - Go to `%appdata%\dealership-management-system\`
   - Delete the contents (the empty database it just created)
   - Paste everything from your USB drive into this folder

3. **Start the app** — everything (vehicles, customers, sales, photos, inspection reports) will be exactly as it was on the old PC.

### What gets transferred:

- All vehicles, customers, sales, installments, payments
- All uploaded images and photos (seller photos, CNIC scans, vehicle photos, inspection photos)
- All inspection reports and damage maps
- All expense records (vehicle and showroom)
- All audit logs (who did what and when)
- All user accounts and passwords
- Backup history and settings

---

## 5. How to Read the Database File Directly

If you need to inspect the data manually (for auditing, reporting, or troubleshooting):

### Using DB Browser for SQLite (Free GUI Tool)

1. Download from: https://sqlitebrowser.org/
2. Open the app, click **Open Database**
3. Navigate to `%appdata%\dealership-management-system\dealership.db`
4. Browse tables, run SQL queries, export data to CSV

### Using SQLite Command Line

```bash
sqlite3 "C:\Users\<YourUsername>\AppData\Roaming\dealership-management-system\dealership.db"
```

Then run queries:

```sql
-- See all vehicles
SELECT * FROM vehicles WHERE is_deleted = 0;

-- See all sales with customer names
SELECT s.*, c.name as customer_name
FROM sales s JOIN customers c ON s.customer_id = c.id
WHERE s.is_deleted = 0;

-- See audit trail
SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50;

-- Export to CSV (in sqlite3 CLI)
.mode csv
.output vehicles_export.csv
SELECT * FROM vehicles WHERE is_deleted = 0;
.output stdout
```

### Using VS Code

Install the **"SQLite Viewer"** extension, then open the `.db` file directly in VS Code.

---

## 6. Database Tables Reference

| Table               | What it stores                                                                   |
| ------------------- | -------------------------------------------------------------------------------- |
| `users`             | Admin and super-admin accounts (passwords are bcrypt-hashed)                     |
| `vehicles`          | All vehicle records — details, seller info, inspection data, purchase info       |
| `purchases`         | Purchase transaction records linking vehicles to sellers                         |
| `vehicle_expenses`  | Expenses per vehicle (repairs, fuel, travel, etc.)                               |
| `vehicle_documents` | Paths to uploaded vehicle document photos                                        |
| `customers`         | Buyer/seller profiles — name, CNIC, phone, photos, witness info                  |
| `sales`             | Sale transactions — vehicle, customer, price, payment type, installment schedule |
| `installments`      | Individual installment records with due dates and payment status                 |
| `payments`          | Payment records against sales/installments                                       |
| `bank_accounts`     | Bank accounts and wallets (HBL, Meezan, JazzCash, etc.)                          |
| `inspections`       | Vehicle inspection reports                                                       |
| `inspection_items`  | Individual inspection checklist items                                            |
| `damage_map`        | Body panel damage records per inspection                                         |
| `inspection_photos` | Photos taken during inspections                                                  |
| `showroom_expenses` | General showroom operating expenses                                              |
| `audit_logs`        | **Immutable** log of every action (cannot be edited or deleted)                  |
| `backup_records`    | History of all backups created                                                   |
| `sync_log`          | Sync tracking for future cloud sync features                                     |

---

## 7. Security Features Protecting Your Data

| Feature                     | How it works                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Superadmin password**     | Required before editing or deleting any vehicle, sale, or customer                                                  |
| **Bcrypt password hashing** | User passwords are hashed with bcrypt (12 rounds) — not stored in plain text                                        |
| **Immutable audit logs**    | Database triggers block any UPDATE or DELETE on the audit_logs table                                                |
| **Soft deletes**            | Deleting a vehicle/customer/sale only sets `is_deleted = 1` — data is never actually removed                        |
| **WAL journal mode**        | Crash-safe writes — if the app crashes mid-write, the database remains consistent                                   |
| **Context isolation**       | The renderer process cannot access Node.js or the filesystem directly — all access goes through a secure IPC bridge |
| **Foreign key enforcement** | Database integrity constraints prevent orphaned records                                                             |

---

## 8. Emergency Checklist

**If your PC won't turn on:**

1. Remove the hard drive and connect it to another PC via USB adapter
2. Navigate to `Users\<YourName>\AppData\Roaming\dealership-management-system\`
3. Copy `dealership.db` + `images/` folder
4. Follow the recovery steps in Section 3

**If you forgot the superadmin password:**

1. Open `dealership.db` in DB Browser for SQLite
2. Go to the `users` table
3. Find the super_admin row
4. Update `password_hash` with a new bcrypt hash (you can generate one at https://bcrypt-generator.com/ with 12 rounds)
5. Save and close, then log in with the new password

**If the app shows "database is locked":**

1. Close all instances of the application
2. Delete `dealership.db-wal` and `dealership.db-shm` (the main `.db` has the data)
3. Restart the app

**If data seems missing after a restore:**

1. Check if the records have `is_deleted = 1` — they might be soft-deleted
2. Run: `UPDATE vehicles SET is_deleted = 0;` (or for the specific table) in DB Browser to un-delete

---

## 9. Recommended Backup Schedule

| Backup Type          | Frequency           | Where                             |
| -------------------- | ------------------- | --------------------------------- |
| Automatic (built-in) | Every 24 hours      | Local `Backups/` folder           |
| Manual USB copy      | Weekly              | USB drive stored separately       |
| Google Drive         | Daily (auto-upload) | Cloud — survives hardware failure |
| Full folder copy     | Monthly             | External hard drive               |

> **Golden rule:** Always maintain at least one backup that is NOT on the same physical device as your PC. A local-only backup does not protect against hard drive failure, theft, or fire.
