import puppeteer, {Page} from "puppeteer";
import {writeFile} from "@/util/util.ts";
import {isAllowedScraperRequest, parseOlxUrl} from "@/util/importUrl.ts";

let pagePromise: Promise<Page> | undefined;

async function createPage(): Promise<Page> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", request => {
    const allowed = isAllowedScraperRequest(request.url(), request.isNavigationRequest());
    void (allowed ? request.continue() : request.abort()).catch(() => {});
  });
  return page;
}

export async function loadPage(url: string, waitForSelector: string | undefined): Promise<Page> {
  parseOlxUrl(url);
  if (!waitForSelector) throw new Error("Missing scraper selector configuration");
  const page = await (pagePromise ??= createPage().catch(error => {
    pagePromise = undefined;
    throw error;
  }));
  await page.goto(url);

  try {
    await page.waitForSelector(waitForSelector);
  } catch (e) {
    writeFile("./logs/error.html", await page.content());
    throw e;
  }

  return page;
}
