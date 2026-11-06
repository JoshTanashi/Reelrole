import { useEffect, useState } from 'react';
import { loadCatalogue, type Catalogue } from './catalogue';

let cached: Catalogue | null = null;

/** Catalogue for components; null while loading (boot preloads it behind the sting). */
export function useCatalogue(): Catalogue | null {
  const [cat, setCat] = useState<Catalogue | null>(cached);
  useEffect(() => {
    if (cached) return;
    let live = true;
    loadCatalogue().then((c) => {
      cached = c;
      if (live) setCat(c);
    });
    return () => {
      live = false;
    };
  }, []);
  return cat;
}
