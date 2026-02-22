// Ad types and formatting helpers
// Edge-runtime compatible — no Node.js APIs

export interface Ad {
  _id: string;
  sponsor: string;
  pitch: string;
  url: string;
  cpm: number;
}

export function pickAd(ads: Ad[]): Ad | null {
  if (ads.length === 0) return null;
  return ads[Math.floor(Math.random() * ads.length)];
}

export function formatAdMarkdown(ad: Ad): string {
  const linkUrl = ad.url.startsWith("http") ? ad.url : `https://${ad.url}`;

  // Plain text format — works cleanly in CLI, VS Code extension, and web
  return `\n\n---\n> *Sponsored by [${ad.sponsor}](${linkUrl})* — ${ad.pitch}\n`;
}
