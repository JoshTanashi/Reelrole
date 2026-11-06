import voice from '../../data/voice-lines.json';

export type ReactionTag = keyof typeof voice.lines;
const LINES = voice.lines as Record<string, string[]>;

/**
 * Picks a line for a tag without repeating anything from the last 12 used
 * this session (HANDOVER §4 voice rules / §11).
 */
export class Voice {
  private recent: string[] = [];
  constructor(private rng: () => number = Math.random, private lru = 12) {}

  say(tag: string, fallback = 'neutralGood', filter: (line: string) => boolean = () => true): string {
    const base = LINES[tag]?.length ? LINES[tag]! : LINES[fallback] ?? [''];
    const pool = base.filter(filter).length ? base.filter(filter) : base;
    const fresh = pool.filter((l) => !this.recent.includes(l));
    const choices = fresh.length ? fresh : pool;
    const line = choices[Math.floor(this.rng() * choices.length)]!;
    this.recent.push(line);
    if (this.recent.length > this.lru) this.recent.shift();
    return line;
  }
}

/** Session-wide voice. */
export const voiceSession = new Voice();
