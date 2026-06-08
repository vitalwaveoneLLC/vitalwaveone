// generate-icons.mjs
// Run this with: node generate-icons.mjs
// It creates all 8 icon sizes needed for the PWA
// Requires: npm install canvas

import { createCanvas } from "canvas";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUT_DIR = "./public/icons";

mkdirSync(OUT_DIR, { recursive: true });

for (const size of SIZES) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#f59e0b";
  const radius = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Truck icon (simplified)
  const s = size;
  ctx.strokeStyle = "#060e18";
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const pad = s * 0.18;
  const mid = s * 0.5;

  // Truck body (rectangle)
  ctx.strokeRect(pad, mid - s * 0.12, s * 0.52, s * 0.34);

  // Truck cab
  ctx.beginPath();
  ctx.moveTo(pad + s * 0.52, mid - s * 0.12);
  ctx.lineTo(pad + s * 0.52 + s * 0.14, mid - s * 0.12);
  ctx.lineTo(s - pad, mid + s * 0.05);
  ctx.lineTo(s - pad, mid + s * 0.22);
  ctx.lineTo(pad + s * 0.52, mid + s * 0.22);
  ctx.stroke();

  // Wheels
  ctx.fillStyle = "#060e18";
  ctx.beginPath();
  ctx.arc(pad + s * 0.15, mid + s * 0.26, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s - pad - s * 0.1, mid + s * 0.26, s * 0.07, 0, Math.PI * 2);
  ctx.fill();

  const buffer = canvas.toBuffer("image/png");
  const filename = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(filename, buffer);
  console.log(`✅ Created ${filename}`);
}

console.log("\n🎉 All icons created in public/icons/");
console.log("Now run: npm run build && npm run preview");
