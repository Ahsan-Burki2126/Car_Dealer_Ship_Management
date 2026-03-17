# Image Loading Troubleshooting Guide

## Issue: Broken Image Icons (local-image:// Protocol)

### Quick Diagnosis Checklist

```
□ 1. Is the image file physically saved?
     Path: %LOCALAPPDATA%\Dealership App\images\{category}\{uuid}.{ext}

□ 2. Is the database storing the correct path?
     Check: Run SQL query on dealership.db
     SELECT photo_path FROM inspections WHERE id = '...';

□ 3. Is the URL being generated correctly?
     Check: Browser DevTools Console
     const url = toFileUrl(filePath);
     console.log(url);

□ 4. Is the protocol handler receiving the request?
     Check: Main process logs for local-image:// requests

□ 5. Does the file path decode correctly?
     Check: decodeURIComponent(encodedPath)
```

---

## Step-by-Step Debugging

### Step 1: Verify Image Storage

#### Check File System

```powershell
# PowerShell command to see saved images
$imagePath = "$env:LOCALAPPDATA\Dealership App\images"
if (Test-Path $imagePath) {
    Get-ChildItem -Recurse $imagePath | Select-Object FullName, Length
} else {
    Write-Warning "Images directory not found at $imagePath"
}
```

#### Expected Output

```
📁 Dealership App
  └── images
      ├── inspections
      │   ├── abc-123-uuid.jpg
      │   └── xyz-789-uuid.png
      ├── vehicles
      │   └── def-456-uuid.jpg
      └── customers
          └── ghi-012-uuid.jpg
```

### Step 2: Check Database Records

#### SQLite Query

```sql
-- Check if photo paths are stored
SELECT id, vehicle_id, photo_path FROM inspections LIMIT 5;

-- Check inspection with photos
SELECT id, photo_path FROM damage_records WHERE photo_path IS NOT NULL LIMIT 5;

-- Check vehicle photos
SELECT id, vehicle_id, photo_path FROM vehicles WHERE photo_path IS NOT NULL LIMIT 5;
```

#### Expected Result

```
id              | photo_path
------------------------------------------------
insp-001        | C:\Users\...\AppData\Local\Dealership App\images\inspections\abc-123.jpg
```

### Step 3: Test URL Generation

#### Add Console Log to Renderer

```typescript
// In InspectionDetailPage.tsx or VehicleDetailPage.tsx
import { toFileUrl } from "../utils/filePaths";

useEffect(() => {
  if (vehicle?.photo_path) {
    const url = toFileUrl(vehicle.photo_path);
    console.log("Original path:", vehicle.photo_path);
    console.log("Generated URL:", url);
    console.log("Decoded path:", decodeURIComponent(url.split("path=")[1]));
  }
}, [vehicle]);
```

#### Expected Console Output

```
Original path: C:\Users\admin\AppData\Local\Dealership App\images\vehicles\image-001.jpg
Generated URL: local-image://file?path=C%3A%5CUsers%5Cadmin%5CAppData%5CLocal%5CDealer...
Decoded path: C:\Users\admin\AppData\Local\Dealership App\images\vehicles\image-001.jpg
```

### Step 4: Test Protocol Handler

#### Add Logging to main.ts

```typescript
// In registerLocalImageProtocol() function
function registerLocalImageProtocol(): void {
  protocol.handle("local-image", async (request) => {
    console.log("📥 Received image request:", request.url);

    try {
      const reqUrl = new URL(request.url);
      const encodedPath = reqUrl.searchParams.get("path");
      console.log("  Encoded path:", encodedPath);

      if (!encodedPath) {
        console.warn("  ❌ Missing path parameter");
        return new Response("Missing path", { status: 400 });
      }

      const requestedPath = decodeURIComponent(encodedPath);
      console.log("  Decoded path:", requestedPath);

      const resolvedPath = path.resolve(requestedPath);
      console.log("  Resolved path:", resolvedPath);

      const imagesRoot = path.resolve(app.getPath("userData"), "images");
      console.log("  Images root:", imagesRoot);

      if (!resolvedPath.startsWith(imagesRoot)) {
        console.warn("  ❌ Path outside images directory");
        return new Response("Forbidden", { status: 403 });
      }

      if (!fs.existsSync(resolvedPath)) {
        console.warn("  ❌ File not found:", resolvedPath);
        return new Response("Not found", { status: 404 });
      }

      console.log("  ✓ Serving file successfully");
      return net.fetch(pathToFileURL(resolvedPath).toString());
    } catch (error) {
      console.error("  ❌ Error:", error);
      return new Response("Invalid image request", { status: 400 });
    }
  });
}
```

---

## Common Issues & Fixes

### Issue 1: Path Encoding Problems

**Symptom**: URL looks wrong in DevTools

```
❌ local-image://file?path=...%3F%3F%3F...  (too many %)
```

**Solution**: Check filePaths.ts encoding

```typescript
// src/renderer/utils/filePaths.ts
export function toFileUrl(filePath?: string | null): string {
  if (!filePath) return "";
  if (/^(file|https?|data|local-image):/i.test(filePath)) {
    return filePath;
  }

  // Make sure path uses forward slashes for encoding
  const normalizedPath = filePath.replace(/\\/g, "/");
  return `local-image://file?path=${encodeURIComponent(filePath)}`;
}
```

### Issue 2: Windows Path Backslashes

**Symptom**: Path shows as `C:\Users\...\images` but URL fails

```
❌ path=C:\Users\admin\AppData\Local\...  (backslashes not encoded)
```

**Solution**: Use `path.resolve()` and verify in main.ts

```typescript
const resolvedPath = path.resolve(requestedPath);
// On Windows, this becomes: C:\Users\admin\AppData\Local\...
// path.resolve() normalizes it automatically
```

### Issue 3: Spaces in Path

**Symptom**: URLs with spaces fail

```
❌ local-image://file?path=C:\...\Dealership App\images\...
```

**Solution**: encodeURIComponent handles spaces

```typescript
// This is already done in toFileUrl()
return `local-image://file?path=${encodeURIComponent(filePath)}`;

// Result: path=C%3A%5C...%5CDealer...%20App%5C... (spaces encoded as %20)
```

### Issue 4: Database Path Format

**Symptom**: Database stores relative path but system expects absolute

```
❌ Database: "images/inspections/abc-123.jpg"
✓ System expects: "C:\Users\...\AppData\Local\Dealership App\images\..."
```

**Solution**: Check IPC handler `files:saveImage`

```typescript
// In src/main/ipc/handlers.ts - should return FULL path
ipcMain.handle(
  "files:saveImage",
  async (_event, sourceFilePath: string, category: string) => {
    const imagesDir = path.join(app.getPath("userData"), "images", category);
    const fileName = `${uuidv4()}${path.extname(sourceFilePath)}`;
    const destPath = path.join(imagesDir, fileName); // ← FULL path
    fs.copyFileSync(sourceFilePath, destPath);
    return { success: true, data: destPath }; // ← Returns full path
  },
);
```

### Issue 5: Protocol Not Registered at App Start

**Symptom**: Works after restart, not on fresh load

```
❌ local-image protocol not available initially
```

**Solution**: Verify registration order in main.ts

```typescript
// Line 22-29: Protocol MUST be registered before app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: "local-image",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

// Line 31+: Handler registered after
function registerLocalImageProtocol(): void {
  protocol.handle("local-image", async (request) => { ... });
}

// Called in app.on("ready", ...) or before window.loadURL()
```

---

## Network Tab Debugging

### Enable DevTools Network Logging

```typescript
// Add to InspectionDetailPage.tsx for debugging
useEffect(() => {
  if (inspection?.damage_map) {
    inspection.damage_map.forEach((damage) => {
      if (damage.photo_paths) {
        damage.photo_paths.forEach((photoPath) => {
          const url = toFileUrl(photoPath);
          console.log(`Photo URL: ${url}`);

          // Also log with fetch to see actual response
          fetch(url)
            .then((r) => console.log(`Status: ${r.status}`))
            .catch((e) => console.error(`Error: ${e}`));
        });
      }
    });
  }
}, [inspection]);
```

### Browser DevTools Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Filter for `local-image`
4. Check for these columns:
   - **Status**: Should be 200 (not 404)
   - **Type**: Should be image/jpeg or image/png
   - **Size**: Should show file size (not 0)
   - **Time**: Should be fast (<100ms)

#### Expected Network Entry

```
URL: local-image://file?path=C%3A%5CUsers%5C...%5Cimage.jpg
Method: GET
Status: 200 ✓
Type: image/jpeg
Size: 156 kB
Time: 45ms
```

#### Problem Indicators

```
❌ Status: 404 → File not found
❌ Status: 403 → Path outside images directory
❌ Status: 400 → Missing or invalid path parameter
❌ Type: text/plain → Protocol returned error response
```

---

## Real-Time Testing Script

### Add to main.ts for Testing

```typescript
// Test function to verify protocol works
async function testLocalImageProtocol() {
  const testImagePath = path.join(
    app.getPath("userData"),
    "images",
    "test-image.jpg",
  );

  console.log("🧪 Testing local-image protocol...");
  console.log("  Test path:", testImagePath);

  if (!fs.existsSync(testImagePath)) {
    console.warn("  ⚠️  Test image not found, creating dummy...");
    // Create a tiny test PNG
    const emptyPNG = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0xfe,
      0xff, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xe5, 0x21, 0xbc, 0x33, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    fs.writeFileSync(testImagePath, emptyPNG);
    console.log("  ✓ Test image created");
  }

  const encodedPath = encodeURIComponent(testImagePath);
  const testURL = `local-image://file?path=${encodedPath}`;

  console.log("  Test URL:", testURL);
  console.log("  ✓ Protocol ready!");

  return testURL;
}

// Call after app ready
app.on("ready", () => {
  registerLocalImageProtocol();
  const testUrl = testLocalImageProtocol();

  // Send test URL to renderer for verification
  mainWindow?.webContents.send("protocol-test-url", testUrl);
});
```

---

## Quick Fix Checklist

If images still don't show after debugging:

```
1. ☐ Restart the application (clears caches)
2. ☐ Check Windows file permissions on images directory
3. ☐ Clear browser cache (DevTools > Storage > Clear All)
4. ☐ Verify disk space (images directory isn't full)
5. ☐ Check antivirus isn't blocking file access
6. ☐ Try with a simple JPEG first (not PNG/WebP)
7. ☐ Check file extensions are correct (not .JPG vs .jpg)
8. ☐ Rebuild app: npm run build && npm start
```

---

## Support Commands

```bash
# Check images directory
ls -la "%LOCALAPPDATA%\Dealership App\images"

# Check database for photo_path entries
sqlite3 "%LOCALAPPDATA%\Dealership App\dealership.db" \
  "SELECT COUNT(*) FROM inspections WHERE photo_path IS NOT NULL;"

# Check main process logs (if available)
# Look for "local-image" in console output

# Rebuild and restart
npm run build
npm start
```

---

**If issues persist, please share:**

1. Main process console output (with logging enabled)
2. Browser DevTools Network tab screenshot
3. Path to an image file that fails to load
4. Results of SQL queries above
