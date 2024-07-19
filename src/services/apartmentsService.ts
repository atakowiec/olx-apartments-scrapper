import {loadPage} from "@/util/puppeteer.ts";
import loggerFactory from "@/util/winstonLogger.ts";
import {Page} from "puppeteer";
import prisma from "@/util/prisma.ts";

const logger = loggerFactory("import");

export type DetailsType = {
  rent: number;
  price: number;
  title: string;
  description: string;
  images: string;
  url: string;
  loaded: boolean;
}

export async function handleImportUrl(url: string) {
  const urlObject = new URL(url);
  urlObject.searchParams.set("page", "1");

  logger.info(`Importing data from ${urlObject.toString()}`);
  const lastPage = await findLastPage(url.toString());
  logger.info(`Found ${lastPage} pages, starting import...`);

  const urls = await findUrlsFromSearchPages(urlObject, lastPage);

  const inDatabase = await prisma.details.findMany({select: {url: true}});

  const newUrls = Array.from(urls).filter((url) => inDatabase.every((dbUrl) => dbUrl.url !== url));
  logger.info(`Found ${urls.size} distinct urls, ${newUrls.length} are new`);

  for await (const details of readDatailPages(newUrls)) {
    if (details === undefined) continue;

    await prisma.details.create({data: details});
    logger.info(`Saved details from ${details.url} - ${details.title}`);
  }
}

async function findUrlsFromSearchPages(urlObject: URL, lastPage: number) {
  const urls = new Set<string>();

  for (let i = 1; i <= lastPage; i++) {
    let tries = 0;
    tries++;
    try {
      logger.info(`Importing page ${i} (${urlObject.toString()})`);

      urlObject.searchParams.set("page", i.toString());
      const page = await loadPage(urlObject.toString(), process.env.SEARCH_URL_SELECTOR);
      const pageUrls = await readSearchPage(page);
      logger.info(`Found ${pageUrls.length} urls on page ${i}`);

      pageUrls.map(validateAndFixURL).filter(url => url !== undefined).forEach((url: string) => urls.add(url));
    } catch (e) {
      logger.error(`Failed to import page ${i}, retrying...`, e);
      if (tries > 5) {
        logger.error(`Failed to import page ${i} 5 times, skipping to next page`);
      }
      i--;
    }
  }

  return urls
}

async function findLastPage(url: string) {
  const page = await loadPage(url, process.env.LAST_PAGE_SELECTOR);

  return await page.evaluate((selector) => {
    return parseInt([...document.querySelectorAll(selector)].at(-1).textContent);
  }, process.env.LAST_PAGE_SELECTOR);
}

function validateAndFixURL(url: string): string | undefined {
  try {
    new URL(url);
    return url;
  } catch (e) {
    try {
      new URL(`https://www.olx.pl${url}`);
      return `https://www.olx.pl${url}`;
    } catch (e) {
      return undefined;
    }
  }
}

async function readSearchPage(page: Page): Promise<string[]> {
  return await page.evaluate((selector) => {
    return [...document.querySelectorAll(selector)].map((el) => el.getAttribute("href"));
  }, process.env.SEARCH_URL_SELECTOR);
}

async function* readDatailPages(urls: string[]) {
  let i = 0
  for (let url of urls) {
    i++;
    logger.info(`[${i}/${urls.length}] Importing details from ${url}`);

    yield await handleSingleDetailsPage(url);
  }
}

async function handleSingleDetailsPage(url: string): Promise<DetailsType | undefined> {
  // I will handle this in the future
  if (!url.startsWith("https://www.olx.pl")) {
    logger.warn(`Skipping url ${url}, not from olx.pl`)
    return {
      url,
      loaded: false,
      description: "",
      images: "",
      price: 0,
      rent: 0,
      title: ""
    }
  }

  let tries = 5;
  while (tries-- > 0) {
    try {
      return await readSingleDetailsPage(url);
    } catch (e) {
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
  const page = await loadPage(url, "div.css-1dp6pbg");

  const result = await page.evaluate<string[]>((descriptionSelector, imagesSelector, priceSelector, titleSelector, rentSelector) => {
      const description = document.querySelector(descriptionSelector)?.textContent.replace("<br>", "\n");
      const images = [...document.querySelectorAll(imagesSelector)].map((el) => el.getAttribute("src")).join("\n");
      const title = document.querySelector(titleSelector)?.textContent.replace(" • OLX.pl", "").trim();

      const priceText = document.querySelector(priceSelector)?.textContent;
      const price = parseFloat(priceText.replace(" zł", "").replace(" ", "").replace(",", "."))

      const rentText = [...document.querySelectorAll(rentSelector)].find((el) => el.textContent.includes("Czynsz (dodatkowo):"))?.textContent.slice(20, -3) ?? "";
      const rent = rentText.length > 1 ? parseFloat(rentText) : 0;

      return {description, images, price, title, rent};
    },
    process.env.APARTMENT_DESCRIPTION_SELECTOR,
    process.env.APARTMENT_IMAGES_SELECTOR,
    process.env.APARTMENT_PRICE_SELECTOR,
    process.env.APARTMENT_TITLE_SELECTOR,
    process.env.APARTMENT_RENT_SELECTOR);

  return {
    ...result,
    url,
    loaded: !!result.title
  } as DetailsType;
}