// Ad types and formatting helpers
// Edge-runtime compatible — no Node.js APIs

export interface Ad {
  _id: string;
  sponsor: string;
  pitch: string;
  url: string;
  cpm: number;
  format?: "badge" | "text";
  logoSlug?: string;
  badgeColor?: string;
}

export function pickAd(ads: Ad[]): Ad | null {
  if (ads.length === 0) return null;
  return ads[Math.floor(Math.random() * ads.length)];
}

function badgeUrl(sponsor: string, logoSlug?: string, color?: string): string {
  const label = "Sponsored_by";
  const message = sponsor.replace(/-/g, "--").replace(/ /g, "_");
  const bg = color ?? "000";
  let url = `https://img.shields.io/badge/${label}-${message}-${bg}?style=flat`;
  if (logoSlug) {
    url += `&logo=${encodeURIComponent(logoSlug)}&logoColor=white`;
  }
  return url;
}

export function formatAdMarkdown(ad: Ad): string {
  const format = ad.format ?? "text";

  const linkUrl = ad.url.startsWith("http") ? ad.url : `https://${ad.url}`;

  if (format === "badge") {
    const badge = badgeUrl(ad.sponsor, ad.logoSlug, ad.badgeColor);
    // Badge renders as image in IDE webviews; in CLI the alt-text shows as a clean link
    return `\n\n---\n> [![Sponsored by ${ad.sponsor}](${badge})](${linkUrl}) ${ad.pitch}\n`;
  }

  // text format — clean single-line, works great in both IDE and CLI
  return `\n\n---\n> *Sponsored by [${ad.sponsor}](${linkUrl})* — ${ad.pitch}\n`;
}
