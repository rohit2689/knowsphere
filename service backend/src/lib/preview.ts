import dns from "node:dns/promises";
import net from "node:net";
import ogs from "open-graph-scraper";
import { HttpError } from "./errors.js";


const CARD_ONLY: Record<string, string> = {
  "twitter.com": "Twitter",
  "x.com": "X",
  "linkedin.com": "LinkedIn",
  "lnkd.in": "LinkedIn",
  "google.com": "Google",
  "goo.gl": "Google",
};

function findCardOnly(host: string): string | null {
  const key = Object.keys(CARD_ONLY).find((h) => host === h || host.endsWith("." + h));
  return key ? CARD_ONLY[key]! : null;
}

function getYouTubeId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") return u.pathname.slice(1) || null;
  if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    if (u.pathname === "/watch") return u.searchParams.get("v");
    const m = u.pathname.match(/^\/(shorts|embed)\/([\w-]+)/);
    if (m) return m[2] ?? null;
  }
  return null;
}

function isPrivateIp(ip: string): boolean {
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number) as [number, number];
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  const l = ip.toLowerCase();
  return l === "::1" || l === "::" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80");
}

async function assertPublicHost(hostname: string) {
  let addrs;
  try {
    addrs = await dns.lookup(hostname, { all: true });
  } catch {
    throw new HttpError(400, "Could not resolve this URL");
  }
  if (addrs.some((a) => isPrivateIp(a.address))) {
    throw new HttpError(400, "This URL is not allowed");
  }
}

export type Preview = {
  platform: string;
  imageUrl: string | null;
  title: string | null;
  description: string | null;
};

export async function resolvePreview(rawUrl: string): Promise<Preview> {
  const u = new URL(rawUrl);
  if (!["http:", "https:"].includes(u.protocol)) {
    throw new HttpError(400, "Only http/https URLs are allowed");
  }
  const host = u.hostname.replace(/^www\./, "");

  // 1. Twitter, LinkedIn, Google: koi fetch nahi, sirf card
  const label = findCardOnly(host);
  if (label) return { platform: label, imageUrl: null, title: null, description: null };

  // 2. YouTube: seedha thumbnail
  const ytId = getYouTubeId(u);
  if (ytId) {
    return {
      platform: "YouTube",
      imageUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      title: null,
      description: null,
    };
  }

  await assertPublicHost(u.hostname);
  try {
    const { result } = await ogs({
      url: rawUrl,
      timeout: 5, // seconds
      fetchOptions: {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        },
      },
    });
    return {
      platform: host,
      imageUrl: result.ogImage?.[0]?.url ?? result.twitterImage?.[0]?.url ?? null,
      title: result.ogTitle ?? null,
      description: result.ogDescription ?? null,
    };
  } catch {
    // 4. Fetch fail ho gaya: bina image ka card
    return { platform: host, imageUrl: null, title: null, description: null };
  }
}