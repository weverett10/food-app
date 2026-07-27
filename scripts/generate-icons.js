const sharp = require("sharp");
const path = require("path");

const BG = "#171717";
const FG = "#fafafa";

function svgIcon(size) {
  const plateR = size * 0.28;
  const cx = size * 0.42;
  const cy = size * 0.52;
  const forkX = size * 0.74;
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="${BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${plateR}" fill="none" stroke="${FG}" stroke-width="${size * 0.035}"/>
  <circle cx="${cx}" cy="${cy}" r="${plateR * 0.55}" fill="none" stroke="${FG}" stroke-width="${size * 0.02}"/>
  <g stroke="${FG}" stroke-width="${size * 0.035}" stroke-linecap="round">
    <line x1="${forkX}" y1="${size * 0.22}" x2="${forkX}" y2="${size * 0.78}"/>
    <line x1="${forkX - size * 0.05}" y1="${size * 0.22}" x2="${forkX - size * 0.05}" y2="${size * 0.36}"/>
    <line x1="${forkX + size * 0.05}" y1="${size * 0.22}" x2="${forkX + size * 0.05}" y2="${size * 0.36}"/>
    <path d="M ${forkX - size * 0.05} ${size * 0.36} Q ${forkX} ${size * 0.42} ${forkX} ${size * 0.5}" fill="none"/>
    <path d="M ${forkX + size * 0.05} ${size * 0.36} Q ${forkX} ${size * 0.42} ${forkX} ${size * 0.5}" fill="none"/>
  </g>
</svg>`;
}

async function main() {
  const outDir = path.join(__dirname, "..", "public", "icons");
  const fs = require("fs");
  fs.mkdirSync(outDir, { recursive: true });

  for (const size of [192, 512]) {
    const svg = Buffer.from(svgIcon(size));
    await sharp(svg).png().toFile(path.join(outDir, `icon-${size}.png`));
    console.log(`Wrote icon-${size}.png`);
  }
}

main();
