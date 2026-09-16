const OLX_HOSTS = new Set(["www.olx.pl", "olx.pl"]);

// Storage policy only. Browser navigation remains restricted to OLX.
export function parseListingUrl(value: string): {url: string; source: "olx" | "otodom"} {
  const url = new URL(value, "https://www.olx.pl");
  if (url.protocol === "https:" && ["otodom.pl", "www.otodom.pl"].includes(url.hostname) &&
      !url.port && !url.username && !url.password && /^\/pl\/oferta\/[^/]+\/?$/.test(url.pathname)) {
    url.hostname = "www.otodom.pl";
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/$/, "");
    return {url: url.toString(), source: "otodom"};
  }
  return {url: parseOlxUrl(url.toString()).toString(), source: "olx"};
}

export function parseOlxUrl(value: unknown): URL {
  if (typeof value !== "string") throw new Error("URL must be a string");
  const url = new URL(value);
  if (url.protocol !== "https:" || !OLX_HOSTS.has(url.hostname) ||
      url.port || url.username || url.password) {
    throw new Error("Only HTTPS URLs on olx.pl are allowed");
  }
  url.hash = "";
  return url;
}

export function parseImportUrl(value: unknown): URL {
  const url = parseOlxUrl(value);
  if (!/^\/nieruchomosci\/mieszkania(?:\/|$)/.test(url.pathname)) {
    throw new Error("Use an OLX apartment search URL");
  }
  return url;
}

export function isAllowedScraperRequest(value: string, navigation: boolean): boolean {
  try {
    if (navigation) {
      parseOlxUrl(value);
      return true;
    }
    const url = new URL(value);
    return url.protocol === "https:" && !url.port && !url.username && !url.password &&
      ["olx.pl", "olxcdn.com"].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}
