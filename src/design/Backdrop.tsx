/**
 * Static cinematic backdrop for M0: brand glows + vignette + film grain.
 * M2 replaces the glows with the living MeshGradient (mood-reactive).
 */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(60% 42% at 50% 34%, rgba(255,46,77,0.5) 0%, transparent 70%)',
            'radial-gradient(45% 35% at 12% 70%, rgba(232,28,255,0.16) 0%, transparent 70%)',
            'radial-gradient(50% 40% at 92% 82%, rgba(106,59,255,0.20) 0%, transparent 70%)',
          ].join(','),
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 50% 40%, transparent 45%, rgba(0,0,0,0.75) 100%)' }}
      />
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
