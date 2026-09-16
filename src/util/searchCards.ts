export type SearchCard = {
  url: string;
  title: string;
  priceText: string;
  surfaceText: string;
  description: string;
  images: string;
};

// Self-contained because Puppeteer executes this function in the page.
export function readSearchCards(selector: string): SearchCard[] {
  const links = new Set(document.querySelectorAll(`a[data-testid="card-title-link"], [data-cy="l-card"] a[href], ${selector}`));
  return [...links].map(link => {
    const card = link.closest('[data-testid="l-card"], [data-cy="l-card"]');
    const clean = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
    const copy = card?.cloneNode(true) as Element | undefined;
    copy?.querySelectorAll('button, svg, script, style').forEach(element => element.remove());
    const text: string[] = [];
    const collect = (node: Node) => {
      if (node.nodeType === 3 && clean(node.textContent)) text.push(clean(node.textContent));
      node.childNodes.forEach(collect);
    };
    if (copy) collect(copy);
    const images = [...(card?.querySelectorAll('img') ?? [])].map(img => {
      const candidates = (img.getAttribute('srcset') ?? '').split(',').map(value => {
        const [url, width] = value.trim().split(/\s+/);
        return {url, width: parseFloat(width) || 0};
      }).filter(value => value.url).sort((a, b) => b.width - a.width);
      const url = candidates[0]?.url || img.getAttribute('src') || img.getAttribute('data-src') || '';
      try {return new URL(url).protocol === 'https:' ? url : '';} catch {return '';}
    }).filter(Boolean);
    return {
      url: link.getAttribute('href') ?? '',
      title: clean(card?.querySelector('[data-testid="card-title-link"], h4, h6')?.textContent),
      priceText: clean(card?.querySelector('[data-testid="ad-price"]')?.textContent),
      // Prefer the area parameter over areas mentioned in a title (e.g. terrace size).
      surfaceText: clean(card?.querySelector('[data-testid="blueprint-card-param-icon"]')?.parentElement?.textContent),
      description: [...new Set(text)].join('\n'),
      images: [...new Set(images)].join('\n'),
    };
  }).filter(card => card.url);
}

export function searchCardPrice(text: string): number | null {
  const match = text.match(/(\d[\d\s]*(?:[.,]\d{1,2})?)\s*zł/i);
  const value = match ? Number(match[1].replace(/\s/g, '').replace(',', '.')) : NaN;
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}
