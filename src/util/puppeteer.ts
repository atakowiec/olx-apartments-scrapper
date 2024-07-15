import puppeteer, {Page} from "puppeteer";
import {writeFile} from "@/util/util.ts";

const browser = await puppeteer.launch();
const page = await browser.newPage();

export async function loadPage(url: string, waitForSelector: string): Promise<Page> {
  await page.goto(url);

  try {
    await page.waitForSelector(waitForSelector);
  } catch (e) {
    writeFile("./logs/error.html", await page.content());
    throw e;
  }

  return page;
}