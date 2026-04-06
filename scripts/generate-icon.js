// Converts public/images/PAK_JAPAN logo.png → build/icon.ico (Windows) and build/icon.icns (macOS)
// Run automatically as part of `npm run package` via the "build:icons" script.

const fs = require("fs");
const path = require("path");
const png2icons = require("png2icons");

const src = path.join(__dirname, "../public/images/PAK_JAPAN logo.png");
const destIco = path.join(__dirname, "../build/icon.ico");
const destIcns = path.join(__dirname, "../build/icon.icns");

if (!fs.existsSync(src)) {
  console.error("[generate-icon] Source PNG not found:", src);
  process.exit(1);
}

fs.mkdirSync(path.dirname(destIco), { recursive: true });

const input = fs.readFileSync(src);

// Generate .ico for Windows
const icoBuffer = png2icons.createICO(input, png2icons.BILINEAR, 0, true);
if (!icoBuffer) {
  console.error("[generate-icon] Failed to generate .ico");
  process.exit(1);
}
fs.writeFileSync(destIco, icoBuffer);
console.log("[generate-icon] Icon written to", destIco);

// Generate .icns for macOS
const icnsBuffer = png2icons.createICNS(input, png2icons.BILINEAR, 0);
if (!icnsBuffer) {
  console.error("[generate-icon] Failed to generate .icns");
  process.exit(1);
}
fs.writeFileSync(destIcns, icnsBuffer);
console.log("[generate-icon] Icon written to", destIcns);
