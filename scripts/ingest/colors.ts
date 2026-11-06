// Poster → dominant (vivid) colour + BlurHash (HANDOVER §7.2.4). Uses tiny w92 posters.
import sharp from 'sharp';
import { encode } from 'blurhash';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CACHE = join(import.meta.dirname, '..', '.cache', 'posters');
mkdirSync(CACHE, { recursive: true });

async function poster(path: string): Promise<Buffer> {
  const file = join(CACHE, path.replace(/\//g, '_'));
  if (existsSync(file)) return readFileSync(file);
  for (let i = 0; i < 4; i++) {
    const res = await fetch(`https://image.tmdb.org/t/p/w92${path}`);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(file, buf);
      return buf;
    }
    await new Promise((r) => setTimeout(r, 400 * 2 ** i));
  }
  throw new Error(`poster ${path}`);
}

const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');

export async function colorAndHash(path: string): Promise<{ color: string; blurhash: string }> {
  const buf = await poster(path);

  // Vivid colour: mean of the 15% most saturated+bright pixels (pure "dominant" is usually near-black).
  const { data } = await sharp(buf).resize(16, 24, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px: { r: number; g: number; b: number; score: number }[] = [];
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const s = max === 0 ? 0 : (max - min) / max, val = max / 255;
    px.push({ r, g, b, score: s * 0.7 + val * 0.3 - (val < 0.18 ? 1 : 0) });
  }
  px.sort((a, b) => b.score - a.score);
  const top = px.slice(0, Math.max(4, Math.round(px.length * 0.15)));
  const m = top.reduce((a, p) => ({ r: a.r + p.r, g: a.g + p.g, b: a.b + p.b }), { r: 0, g: 0, b: 0 });
  const color = hex(m.r / top.length, m.g / top.length, m.b / top.length);

  const small = await sharp(buf).resize(32, 48, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const blurhash = encode(new Uint8ClampedArray(small.data), small.info.width, small.info.height, 3, 4);
  return { color, blurhash };
}
