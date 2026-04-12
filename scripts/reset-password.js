/**
 * Reset superadmin password back to admin123
 * Run with: node scripts/reset-password.js
 */

const path = require("path");
const os = require("os");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

// Same path Electron uses for userData
const userDataPath = path.join(os.homedir(), "AppData", "Roaming", "pak-japan-motors-layyah");
const dbPath = path.join(userDataPath, "dealership.db");

console.log("Looking for database at:", dbPath);

const db = new Database(dbPath);

const user = db.prepare("SELECT id, username, role, is_active FROM users WHERE role = 'super_admin'").get();

if (!user) {
  console.error("No superadmin account found in the database.");
  process.exit(1);
}

console.log("Found superadmin:", user.username, "| active:", user.is_active);

const newHash = bcrypt.hashSync("admin123", 12);
db.prepare("UPDATE users SET password_hash = ?, is_active = 1, updated_at = datetime('now') WHERE id = ?")
  .run(newHash, user.id);

console.log("✓ Password reset to: admin123");
console.log("✓ Account set to active");
console.log("\nYou can now log in with:");
console.log("  Username:", user.username);
console.log("  Password: admin123");

db.close();
