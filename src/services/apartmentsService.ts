import {loadPage} from "@/util/puppeteer.ts";
import loggerFactory from "@/util/winstonLogger.ts";
import {Page} from "puppeteer";
import prisma from "@/util/prisma.ts";
import {parseImportUrl, parseOlxUrl, parseListingUrl} from "@/util/importUrl.ts";
import {readSearchCards, searchCardPrice, type SearchCard} from "@/util/searchCards.ts";
import {initialImportProgress, type ImportProgress} from "@/types/importProgress.ts";
import {extractSurfaceArea} from "@/types/apartment.ts";
import {errorMessage} from "@/util/errorMessage.ts";

const logger = loggerFactory("import");

export type DetailsType = {
  rent: number | null;
  price: number | null;
  source?: string;
  title: string;
  description: string;
  images: string;
  url: string;
  loaded: boolean;
  surfaceArea?: number | null;
}

export async function handleImportUrl(url: string, onProgress: (progress: ImportProgress) => void | Promise<void> = () => {}) {
  const progress = {...initialImportProgress};
  const report = async (update: Partial<ImportProgress>) => {
    Object.assign(progress, update);
    await onProgress({...progress});
  };
  await report({phase: "discovery"});
  const urlObject = parseImportUrl(url);
  urlObject.searchParams.set("page", "1");

  logger.info(`Importing data from ${urlObject.toString()}`);
  const lastPage = await findLastPage(urlObject.toString());
  logger.info(`Found ${lastPage} pages, starting import...`);
  await report({phase: "search", pagesTotal: lastPage});

  const urls = await findUrlsFromSearchPages(urlObject, lastPage, report);

  const inDatabase = await prisma.details.findMany({select: {url: true}});

  const newUrls = Array.from(urls.keys()).filter((url) => inDatabase.every((dbUrl) => dbUrl.url !== url));
  logger.info(`Found ${urls.size} distinct urls, ${newUrls.length} are new`);
  await report({phase: "details", apartmentsTotal: newUrls.length, existing: urls.size - newUrls.length, attempt: 0});

  for (const url of newUrls) {
    const card = urls.get(url)!;
    const details = parseListingUrl(url).source === "otodom" ? {
      url, source: "otodom", title: card.title || "Ogłoszenie Otodom", description: card.description,
      images: card.images, price: searchCardPrice(card.priceText), rent: null,
      surfaceArea: extractSurfaceArea(card.surfaceText), loaded: false,
    } : await handleSingleDetailsPage(url, report);
    if (details === undefined) {
      await report({apartmentsFailed: progress.apartmentsFailed + 1});
    } else {
      await prisma.details.create({data: details});
      await report({saved: progress.saved + 1});
      logger.info(`Saved details from ${details.url} - ${details.title}`);
    }
    await report({apartmentsProcessed: progress.apartmentsProcessed + 1, attempt: 0});
  }
}

async function findUrlsFromSearchPages(urlObject: URL, lastPage: number, report: (update: Partial<ImportProgress>) => Promise<void>) {
  const urls = new Map<string, SearchCard>();
  let pagesFailed = 0;

  for (let i = 1; i <= lastPage; i++) {
    for (let attempt = 1; attempt <= 5; attempt++) {
      await report({attempt});
      try {
        urlObject.searchParams.set("page", i.toString());
        logger.info(`Importing page ${i} (${urlObject.toString()})`);

        const page = await loadPage(urlObject.toString(), `[data-testid="l-card"], ${requiredSelector("SEARCH_URL_SELECTOR")}`);
        const pageUrls = await readSearchPage(page);
        logger.info(`Found ${pageUrls.length} urls on page ${i}`);

        for (const card of pageUrls) {
          try {
            const {url} = parseListingUrl(card.url);
            if (!urls.has(url)) urls.set(url, card);
          } catch { /* Ignore unsupported destinations. */ }
        }
        break;
      } catch (e) {
        await report({lastError: {message: errorMessage(e), url: urlObject.toString(), attempt}});
        logger.error(`Failed to import page ${i}, attempt ${attempt}/5`, e);
        if (attempt === 5) {
          pagesFailed++;
          logger.error(`Skipping page ${i} after 5 failed attempts`);
        }
      }
    }
    await report({pagesProcessed: i, pagesFailed, urlsFound: urls.size, attempt: 0});
  }

  return urls
}

async function findLastPage(url: string) {
  const page = await loadPage(url, process.env.LAST_PAGE_SELECTOR);

  return await page.evaluate((selector) => {
    const lastPage = parseInt([...document.querySelectorAll(selector)].at(-1)?.textContent ?? "1");
    return Number.isFinite(lastPage) && lastPage > 0 ? lastPage : 1;
  }, requiredSelector("LAST_PAGE_SELECTOR"));
}

function validateAndFixURL(url: string): string | undefined {
  try {
    return parseOlxUrl(new URL(url, "https://www.olx.pl").toString()).toString();
  } catch {
    return undefined;
  }
}

async function readSearchPage(page: Page): Promise<SearchCard[]> {
  return await page.evaluate(readSearchCards, requiredSelector("SEARCH_URL_SELECTOR"));
}

async function handleSingleDetailsPage(url: string, report: (update: Partial<ImportProgress>) => Promise<void>): Promise<DetailsType | undefined> {
  if (!validateAndFixURL(url)) {
    logger.warn(`Skipping url ${url}, not from olx.pl`)
    return undefined;
  }

  let tries = 5;
  while (tries-- > 0) {
    await report({attempt: 5 - tries});
    try {
      return await readSingleDetailsPage(url);
    } catch (e) {
      await report({lastError: {message: errorMessage(e), url, attempt: 5 - tries}});
      if (tries == 0) {
        logger.error(`Failed to import details from ${url} 5 times, skipping to next url`);
      } else {
        logger.error(`Failed to import details from ${url}, retrying...`, e);
      }
    }
  }

  return undefined;
}

async function readSingleDetailsPage(url: string): Promise<DetailsType> {
  const page = await loadPage(url, requiredSelector("APARTMENT_PRICE_SELECTOR"));

  const result = await page.evaluate((descriptionSelector, imagesSelector, priceSelector, titleSelector, rentSelector) => {
      const description = document.querySelector(descriptionSelector)?.textContent?.replace("<br>", "\n") ?? "";
      const images = [...document.querySelectorAll(imagesSelector)].map((el) => el.getAttribute("src")).join("\n");
      const title = document.querySelector(titleSelector)?.textContent?.replace(" • OLX.pl", "").trim() ?? "";

      const priceText = document.querySelector(priceSelector)?.textContent;
      const price = parseFloat((priceText ?? "").replace(" zł", "").replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(price)) throw new Error("Missing or invalid apartment price");

      const rentText = [...document.querySelectorAll(rentSelector)].find((el) => el.textContent?.includes("Czynsz (dodatkowo):"))?.textContent?.slice(20, -3) ?? "";
      const rent = rentText.length > 1 ? parseFloat(rentText) : 0;

      const surfaceText = [...document.querySelectorAll(rentSelector)]
        .map(el => el.textContent ?? "").find(text => /powierzchnia/i.test(text)) ?? "";
      return {description, images, price, title, rent, surfaceText};
    },
    requiredSelector("APARTMENT_DESCRIPTION_SELECTOR"),
    requiredSelector("APARTMENT_IMAGES_SELECTOR"),
    requiredSelector("APARTMENT_PRICE_SELECTOR"),
    requiredSelector("APARTMENT_TITLE_SELECTOR"),
    requiredSelector("APARTMENT_RENT_SELECTOR"));

  const {surfaceText, ...details} = result;
  return {
    ...details,
    surfaceArea: extractSurfaceArea(surfaceText || `${result.title}\n${result.description}`),
    url,
    loaded: !!result.title
  } as DetailsType;
}

function requiredSelector(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing selector configuration: ${name}`);
  return value;
}
