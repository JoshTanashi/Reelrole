import traitsMeta from '../../data/traits.json';
import { trait, type Catalogue } from './catalogue';

/** Human vibe chips (HANDOVER §9.8): traits shown when value ≥ showAt. */
export const VIBES = [...traitsMeta.scales, ...traitsMeta.bools].map((t) => ({
  key: t.key,
  label: t.humanLabel,
  showAt: 'showAt' in t ? (t.showAt as number) : 0.9,
}));

export function vibesFor(cat: Catalogue, i: number, n = 5) {
  return VIBES.map((v) => ({ ...v, value: trait(cat, i, v.key) }))
    .filter((v) => v.value >= v.showAt)
    .sort((a, b) => b.value - b.showAt - (a.value - a.showAt))
    .slice(0, n);
}
