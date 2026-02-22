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

function sanitize(str: string): string {
  // Strip newlines and markdown control chars that could break formatting
  return str
    .replace(/[\n\r]/g, " ")
    .replace(/[[\]()]/g, "")
    .trim();
}

export function formatAdMarkdown(ad: Ad): string {
  const sponsor = sanitize(ad.sponsor);
  const pitch = sanitize(ad.pitch);
  // Validate URL: must start with http(s) or be a bare domain
  const rawUrl = ad.url.startsWith("http") ? ad.url : `https://${ad.url}`;
  let linkUrl: string;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      linkUrl = "#";
    } else {
      linkUrl = parsed.href;
    }
  } catch {
    linkUrl = "#";
  }

  return `\n\n---\n> *Sponsored by [${sponsor}](${linkUrl})* — ${pitch}\n`;
}
