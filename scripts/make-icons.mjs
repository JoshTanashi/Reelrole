// Generates placeholder app icons (the reel "o" mark) until Joshie's final icon lands.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const holes = Array.from({ length: 5 }, (_, i) => {
  const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
  return `<circle cx="${50 + Math.cos(a) * 24}" cy="${50 + Math.sin(a) * 24}" r="11" fill="#000"/>`;
}).join('');

const icon = (pad, rounded) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="glow" cx="50%" cy="46%" r="60%">
      <stop offset="0" stop-color="#FF2E4D" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#07060A" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FF2E4D"/><stop offset="0.52" stop-color="#E81CFF"/><stop offset="1" stop-color="#6A3BFF"/>
    </linearGradient>
    <mask id="m"><circle cx="50" cy="50" r="50" fill="#fff"/>${holes}<circle cx="50" cy="50" r="6" fill="#000"/></mask>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="#07060A"/>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#glow)"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 100})">
    <circle cx="50" cy="50" r="50" fill="url(#g)" mask="url(#m)"/>
  </g>
</svg>`;

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/favicon.svg', icon(96, true));
const std = Buffer.from(icon(118, false));
const mask = Buffer.from(icon(150, false));
await sharp(std).resize(192).png().toFile('public/icons/icon-192.png');
await sharp(std).resize(512).png().toFile('public/icons/icon-512.png');
await sharp(mask).resize(512).png().toFile('public/icons/icon-maskable-512.png');
await sharp(std).resize(180).png().toFile('public/icons/apple-touch-icon.png');
console.log('icons written');
