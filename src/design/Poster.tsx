import { useMemo, useState } from 'react';
import { decode } from 'blurhash';
import { img, type ImgSize, type Title } from '../data/catalogue';

const hashCache = new Map<string, string>();
function blurUrl(hash: string): string {
  if (!hash) return '';
  const hit = hashCache.get(hash);
  if (hit) return hit;
  try {
    const w = 16, h = 24;
    const px = decode(hash, w, h);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return '';
    const data = ctx.createImageData(w, h);
    data.data.set(px);
    ctx.putImageData(data, 0, 0);
    const url = c.toDataURL();
    hashCache.set(hash, url);
    return url;
  } catch {
    return '';
  }
}

/** 2:3 poster with BlurHash placeholder and a 200ms fade-in (HANDOVER §14). */
export function Poster({ title, size = 'w342', className = '', eager = false }: { title: Title; size?: ImgSize; className?: string; eager?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const blur = useMemo(() => blurUrl(title.blurhash), [title.blurhash]);
  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-poster bg-bg-2 ${className}`}
      style={{ backgroundColor: title.color, backgroundImage: blur ? `url(${blur})` : undefined, backgroundSize: 'cover' }}
    >
      <img
        src={img(title.poster, size)}
        alt={title.title}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200"
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
}
