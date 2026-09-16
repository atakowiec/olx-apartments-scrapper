const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}, globals = {}) {
  const filename = path.resolve(file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}
  }).outputText;
  const module = {exports: {}};
  const localRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}`, mocks, globals);
    return require(name);
  };
  vm.runInNewContext(code, {module, exports: module.exports, require: localRequire,
    URL, Request, Response, AbortController, TextEncoder, Buffer, crypto: require('node:crypto').webcrypto, console, process, ...globals}, {filename});
  return module.exports;
}
const logger = () => ({info() {}, warn() {}, error() {}});
const admin = {id: 'admin', username: 'admin', role: 'admin'};
const common = {'@/util/winstonLogger.ts': logger, '@/util/requireAdmin.ts': {
  requireAdmin: async () => null, requireUser: async () => null, authorize: async () => admin
}};
function reviewDatabase(rows) {
  const database = {user: {findUnique: async () => admin}, statusChange: {create: async () => ({})}, details: {
    findUnique: async ({where}) => rows.find(row => row.id === where.id) ?? null,
    update: async ({where, data}) => Object.assign(rows.find(row => row.id === where.id), data, {statusSetBy: admin}),
    findMany: async ({where}) => rows.filter(row =>
      (where.source === undefined || row.source === where.source) &&
      (where.loaded === undefined || row.loaded === where.loaded) &&
      (typeof where.status === 'string' ? row.status === where.status : where.status.in.includes(row.status)))
  }};
  database.$transaction = callback => callback(database);
  return database;
}
const searchUrl = 'https://www.olx.pl/nieruchomosci/mieszkania/wynajem/lublin/';

test('Otodom URLs can be stored but never fetched by the scraper', () => {
  const {parseListingUrl, parseImportUrl, isAllowedScraperRequest} = load('src/util/importUrl.ts');
  const canonical = 'https://www.otodom.pl/pl/oferta/studio-ID123';
  const parsed = parseListingUrl('https://otodom.pl/pl/oferta/studio-ID123/?utm_source=olx#photos');
  assert.equal(parsed.url, canonical);
  assert.equal(parsed.source, 'otodom');
  assert.equal(parseListingUrl('/d/oferta/studio.html').source, 'olx');
  assert.throws(() => parseImportUrl(canonical));
  for (const url of [canonical, 'https://www.otodom.pl/photo.jpg']) {
    assert.equal(isAllowedScraperRequest(url, true), false);
    assert.equal(isAllowedScraperRequest(url, false), false);
  }
  for (const url of ['http://www.otodom.pl/pl/oferta/x', 'https://www.otodom.pl.evil.test/pl/oferta/x',
    'https://user@www.otodom.pl/pl/oferta/x', 'https://www.otodom.pl:8443/pl/oferta/x',
    'https://www.otodom.pl/pl/wyniki', 'javascript:alert(1)']) assert.throws(() => parseListingUrl(url));
});

test('Otodom cards are saved once from search data without detail requests and retain decisions on reimport', async () => {
  const url = 'https://www.otodom.pl/pl/oferta/studio-ID123';
  const rows = [];
  const navigations = [];
  const snapshots = [];
  let calls = 0;
  const card = {url, title: 'Studio', priceText: '2 700 zł', surfaceText: '35 m²',
    description: 'Studio\n2 700 zł\nWarszawa, Mokotów - 14 września 2026\n35 m²', images: 'https://images.olxcdn.com/photo.jpg'};
  const {handleImportUrl} = load('src/services/apartmentsService.ts', {...common,
    '@/util/prisma.ts': {details: {findMany: async () => rows, create: async ({data}) => rows.push({...data, status: 'pending'})}},
    '@/util/puppeteer.ts': {loadPage: async target => {
      navigations.push(target);
      assert.equal(new URL(target).hostname, 'www.olx.pl');
      return {evaluate: async () => ++calls % 2 ? 1 : [card, {...card, url: `${url}?tracking=1`}]};
    }}
  }, {process: {env: {LAST_PAGE_SELECTOR: '.pages', SEARCH_URL_SELECTOR: '.links'}}});
  await handleImportUrl(searchUrl, value => snapshots.push(value));
  assert.equal(navigations.length, 2);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source, 'otodom');
  assert.equal(rows[0].loaded, false);
  assert.equal(rows[0].price, 2700);
  assert.equal(rows[0].rent, null);
  assert.equal(rows[0].surfaceArea, 35);
  assert.equal(rows[0].description, card.description);
  assert.equal(rows[0].images, card.images);
  assert.equal(snapshots.at(-1).saved, 1);
  assert.equal(snapshots.at(-1).apartmentsFailed, 0);
  rows[0].status = 'maybe';
  await handleImportUrl(searchUrl, value => snapshots.push(value));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'maybe');
  assert.equal(snapshots.at(-1).existing, 1);
});

test('review defaults to loaded OLX, includes partial Otodom only on request and saves all Otodom decisions', async () => {
  const rows = [
    {id: 1, source: 'olx', loaded: true, status: 'pending'},
    {id: 2, source: 'olx', loaded: false, status: 'pending'},
    {id: 3, source: 'otodom', loaded: false, status: 'pending'},
  ];
  const mocks = {...common, '@/util/prisma.ts': reviewDatabase(rows)};
  const {GET} = load('src/app/api/apartments/random/route.ts', mocks);
  const {PATCH} = load('src/app/api/apartments/[id]/route.ts', mocks);
  const request = source => new Request(`http://app/api/apartments/random${source ? `?source=${source}` : ''}`);
  assert.equal((await (await GET(request())).json()).id, 1);
  assert.equal((await (await GET(request('otodom'))).json()).id, 3);
  assert.equal((await GET(request('invalid'))).status, 400);
  for (const status of ['accepted', 'rejected', 'maybe']) {
    assert.equal((await PATCH(new Request('http://app/api/apartments/3', {method: 'PATCH', body: JSON.stringify({status})}), {params: {id: '3'}})).status, 200);
    assert.equal(rows[2].status, status);
    assert.equal((await GET(request('otodom'))).status, 404);
  }
});

test('partial prices and Otodom links render without implying a known monthly total', () => {
  const {default: Prices} = load('src/components/ApartmentPrices.tsx');
  const {default: Card} = load('src/components/ApartmentCard.tsx', {'@/style/style.module.scss': {}});
  const render = require('react-dom/server').renderToStaticMarkup;
  const apartment = {title: 'Studio', source: 'otodom', price: 2700, rent: null, description: 'Warszawa',
    images: '', surfaceArea: 35, url: 'https://www.otodom.pl/pl/oferta/studio-ID123'};
  const price = render(Prices({apartment}));
  assert.ok(price.includes('czynsz nieznany'));
  assert.ok(!price.includes('/ miesiąc'));
  assert.ok(render(Prices({apartment: {...apartment, price: null}})).includes('Cena: brak danych'));
  const card = render(Card({apartment}));
  assert.ok(card.includes('Otwórz ogłoszenie na Otodom'));
  assert.ok(card.includes('target="_blank"'));
  assert.match(card, /podgląd z wyników OLX/i);
});

test('search card extraction matches the saved OLX HTML, including area rather than terrace size', async () => {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({headless: true});
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => void request.abort());
    await page.setJavaScriptEnabled(false);
    await page.setContent(fs.readFileSync('tests/fixtures/otodom-search-cards.html', 'utf8'));
    const {readSearchCards, searchCardPrice} = load('src/util/searchCards.ts');
    const cards = await page.evaluate(readSearchCards, '.legacy-selector');
    const unique = [...new Map(cards.map(card => [card.url, card])).values()];
    assert.equal(unique.length, 2);
    assert.equal(unique[0].title, 'Komfortowe studio w sąsiedztwie stacji metra Wilanowska');
    assert.equal(searchCardPrice(unique[0].priceText), 2700);
    assert.equal(unique[0].surfaceText, '35 m²');
    assert.ok(unique[0].description.includes('Warszawa, Mokotów - 14 września 2026'));
    assert.ok(unique[0].images.includes('s=510x383'));
    assert.ok(unique[1].title.includes('taras 26 m²'));
    assert.notEqual(unique[1].surfaceText, '26 m²');
    assert.ok(!unique[0].description.includes('Obserwuj'));
    assert.equal(searchCardPrice('Zapytaj o cenę'), null);
    assert.equal(searchCardPrice('2 700,50 zł do negocjacji'), 2701);
  } finally {await browser.close();}
});

test('review API persists all three decisions, lists reviewed apartments and excludes them from the queue', async () => {
  const rows = [1, 2, 3].map(id => ({id, status: 'pending', loaded: true}));
  const database = reviewDatabase(rows);
  const mocks = {...common, '@/util/prisma.ts': database};
  const {PATCH} = load('src/app/api/apartments/[id]/route.ts', mocks);
  const {GET: list} = load('src/app/api/apartments/route.ts', mocks);
  const {GET: next} = load('src/app/api/apartments/random/route.ts', mocks);
  const request = body => new Request('http://app/api/apartments/1', {method: 'PATCH', body});
  for (const [index, status] of ['accepted', 'maybe', 'rejected'].entries()) {
    const response = await PATCH(request(JSON.stringify({status})), {params: {id: String(index + 1)}});
    assert.equal(response.status, 200);
    assert.equal(rows[index].status, status);
  }
  assert.equal((await next(new Request('http://app/api/apartments/random'))).status, 404);
  const response = await list();
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).length, 3);
  await PATCH(request('{"status":"maybe"}'), {params: {id: '1'}});
  assert.equal(rows[0].status, 'maybe');
  for (const body of ['{', 'null', '{}', '{"status":"approved"}', '{"status":"pending"}', '{"status":42}']) {
    assert.equal((await PATCH(request(body), {params: {id: '1'}})).status, 400);
  }
  for (const id of ['0', '-1', 'abc', '1.5', '9007199254740992']) {
    assert.equal((await PATCH(request('{"status":"accepted"}'), {params: {id}})).status, 400);
  }
  assert.equal((await PATCH(request('{"status":"accepted"}'), {params: {id: '99'}})).status, 404);
  assert.equal(rows[0].status, 'maybe');
});

test('review API checks authentication before reading or updating the database', async () => {
  const mocks = {...common,
    '@/util/requireAdmin.ts': {
      requireUser: async () => require('next/server').NextResponse.json({}, {status: 401}),
      authorize: async () => require('next/server').NextResponse.json({}, {status: 401})
    },
    '@/util/prisma.ts': {details: new Proxy({}, {get() {throw new Error('Database must not be touched');}})}
  };
  const {PATCH} = load('src/app/api/apartments/[id]/route.ts', mocks);
  const {GET} = load('src/app/api/apartments/route.ts', mocks);
  assert.equal((await GET(new Request('http://app/api/apartments'))).status, 401);
  assert.equal((await PATCH(new Request('http://app/api/apartments/1', {method: 'PATCH'}), {params: {id: '1'}})).status, 401);
});

test('surface area supports Polish decimals, legacy descriptions and missing values', () => {
  const {extractSurfaceArea, apartmentSurface} = load('src/types/apartment.ts');
  assert.equal(extractSurfaceArea('Powierzchnia: 42,5 m²'), 42.5);
  assert.equal(extractSurfaceArea('Mieszkanie 63.25 m2'), 63.25);
  assert.equal(extractSurfaceArea('Cena 2400 zł'), null);
  assert.equal(extractSurfaceArea('0 m²'), null);
  assert.equal(apartmentSurface({surfaceArea: 51, title: 'Pokój 10 m²', description: ''}), 51);
  assert.equal(apartmentSurface({title: 'Mieszkanie', description: 'Powierzchnia 38 m²'}), 38);
});

test('URL policy rejects local addresses, lookalike hosts, credentials, ports and non-search URLs', () => {
  const {parseImportUrl, isAllowedScraperRequest} = load('src/util/importUrl.ts');
  assert.equal(parseImportUrl(searchUrl).hostname, 'www.olx.pl');
  for (const value of [undefined, null, {}, '', 'http://olx.pl/nieruchomosci/mieszkania/',
    'https://127.0.0.1/', 'https://www.olx.pl.evil.test/nieruchomosci/mieszkania/',
    'https://www.olx.pl@evil.test/', 'https://user@olx.pl/nieruchomosci/mieszkania/',
    'https://olx.pl:8443/nieruchomosci/mieszkania/', 'https://olx.pl/oferta/example']) {
    assert.throws(() => parseImportUrl(value));
  }
  assert.equal(isAllowedScraperRequest('https://127.0.0.1/', true), false);
  assert.equal(isAllowedScraperRequest('https://evil.test/', false), false);
  assert.equal(isAllowedScraperRequest('https://images.olxcdn.com/photo.jpg', false), true);
  assert.equal(isAllowedScraperRequest('https://images.olxcdn.com/photo.jpg', true), false);
  assert.equal(isAllowedScraperRequest('https://www.olx.pl.evil.test/', true), false);
});

test('failed search page stops after five attempts and continues with the next page', async () => {
  const attempts = [];
  let initial = true;
  const {handleImportUrl} = load('src/services/apartmentsService.ts', {...common,
    '@/util/prisma.ts': {details: {findMany: async () => []}},
    '@/util/puppeteer.ts': {loadPage: async url => {
      if (initial) {initial = false; return {evaluate: async () => 2};}
      const page = Number(new URL(url).searchParams.get('page'));
      attempts.push(page);
      if (page === 1) throw new Error('Permanent failure');
      return {evaluate: async () => []};
    }}
  }, {process: {env: {LAST_PAGE_SELECTOR: '.pages', SEARCH_URL_SELECTOR: '.links'}}});
  await handleImportUrl(searchUrl);
  assert.deepEqual(attempts, [1, 1, 1, 1, 1, 2]);
});

test('successful retry stops retrying the current page', async () => {
  let calls = 0;
  const {handleImportUrl} = load('src/services/apartmentsService.ts', {...common,
    '@/util/prisma.ts': {details: {findMany: async () => []}},
    '@/util/puppeteer.ts': {loadPage: async () => {
      calls++;
      if (calls === 1) return {evaluate: async () => 1};
      if (calls === 2) throw new Error('Transient failure');
      return {evaluate: async () => []};
    }}
  }, {process: {env: {LAST_PAGE_SELECTOR: '.pages', SEARCH_URL_SELECTOR: '.links'}}});
  await handleImportUrl(searchUrl);
  assert.equal(calls, 3);
});

test('import endpoint validates input before starting work', async () => {
  const imports = [];
  const {POST} = load('src/app/api/apartments/import/route.ts', {...common,
    '@/services/apartmentsService.ts': {handleImportUrl: async url => {imports.push(url);}}
  });
  for (const body of ['{', '{}', 'null', JSON.stringify({url: 'http://localhost/'})]) {
    assert.equal((await POST(new Request('http://app/api', {method: 'POST', body}))).status, 400);
  }
  assert.equal(imports.length, 0);
  assert.equal((await POST(new Request('http://app/api', {method: 'POST', body: JSON.stringify({url: searchUrl})}))).status, 202);
  assert.equal(imports.length, 1);
});

test('empty database returns 404 and populated database returns an apartment', async () => {
  let rows = [];
  const {GET, dynamic} = load('src/app/api/apartments/random/route.ts', {...common,
    '@/util/prisma.ts': {details: {findMany: async () => rows}}
  });
  assert.equal(dynamic, 'force-dynamic');
  assert.equal((await GET(new Request('http://app/api/apartments/random'))).status, 404);
  rows = [{id: 1, title: 'Apartment'}];
  assert.deepEqual(await (await GET(new Request('http://app/api/apartments/random'))).json(), rows[0]);
});

test('home renders empty/error states instead of passing invalid data to the card', async () => {
  for (const [response, expected] of [
    [new Response('{}', {status: 404}), 'Brak mieszkań'],
    [new Response('{}', {status: 500}), 'Nie udało'],
    [new Response('{"error":"bad response"}'), 'Nie udało'],
    [new Error('Network failure'), 'Nie udało']
  ]) {
    const state = [];
    let index = 0;
    let effect;
    const react = {...require('react'),
      useState(initial) {const i = index++; if (!(i in state)) state[i] = initial; return [state[i], value => {state[i] = value;}];},
      useRef(initial) {return {current: initial};},
      useEffect(callback) {effect ??= callback;}
    };
    const {default: Home} = load('src/app/(admin)/page.tsx', {
      react,
      '@/components/ApartmentCard.tsx': () => {throw new Error('Card must not render');},
      '@/components/ApartmentButtons.tsx': () => null
    }, {fetch: async () => {if (response instanceof Error) throw response; return response;}});
    Home();
    const cleanup = effect();
    await new Promise(resolve => setImmediate(resolve));
    index = 0;
    const html = require('react-dom/server').renderToStaticMarkup(Home());
    assert.ok(html.includes(expected), html);
    assert.equal(state[0], null);
    cleanup();
  }
});

test('scraper progress counts retries, existing listings, saved listings and skipped failures', async () => {
  const existing = 'https://www.olx.pl/oferta/existing';
  const fresh = 'https://www.olx.pl/oferta/fresh';
  const broken = 'https://www.olx.pl/oferta/broken';
  const snapshots = [];
  const saved = [];
  let discovery = true;
  const selectors = Object.fromEntries(['LAST_PAGE_SELECTOR', 'SEARCH_URL_SELECTOR',
    'APARTMENT_DESCRIPTION_SELECTOR', 'APARTMENT_IMAGES_SELECTOR', 'APARTMENT_PRICE_SELECTOR',
    'APARTMENT_TITLE_SELECTOR', 'APARTMENT_RENT_SELECTOR'].map(key => [key, '.selector']));
  const {handleImportUrl} = load('src/services/apartmentsService.ts', {...common,
    '@/util/prisma.ts': {details: {findMany: async () => [{url: existing}], create: async ({data}) => saved.push(data)}},
    '@/util/puppeteer.ts': {loadPage: async url => {
      if (discovery) {discovery = false; return {evaluate: async () => 3};}
      if (url === broken) throw new Error('Unavailable listing');
      if (url === fresh) return {evaluate: async () => ({title: 'Fresh', description: '', images: '', price: 1000, rent: 100})};
      const page = Number(new URL(url).searchParams.get('page'));
      if (page === 2) throw new Error('Unavailable page');
      return {evaluate: async () => page === 1 ? [existing, fresh, broken, fresh, 'http://localhost/'].map(url => ({url})) : []};
    }}
  }, {process: {env: selectors}});
  await handleImportUrl(searchUrl, progress => snapshots.push(progress));
  const last = snapshots.at(-1);
  assert.equal(snapshots[0].phase, 'discovery');
  assert.equal(last.phase, 'details');
  assert.equal(last.pagesTotal, 3);
  assert.equal(last.pagesProcessed, 3);
  assert.equal(last.pagesFailed, 1);
  assert.equal(last.urlsFound, 3);
  assert.equal(last.existing, 1);
  assert.equal(last.apartmentsTotal, 2);
  assert.equal(last.apartmentsProcessed, 2);
  assert.equal(last.saved, 1);
  assert.equal(last.apartmentsFailed, 1);
  assert.equal(saved.length, 1);
  assert.ok(snapshots.some(value => value.phase === 'search' && value.attempt === 5));
  assert.ok(snapshots.some(value => value.phase === 'details' && value.attempt === 5));
});

test('jobs expose live progress, reject overlapping imports, finish and allow another import', async () => {
  let finish;
  let report;
  let runs = 0;
  const jobs = load('src/services/importJobs.ts', {...common,
    '@/services/apartmentsService.ts': {handleImportUrl: (url, callback) => {
      runs++;
      report = callback;
      return new Promise(resolve => {finish = resolve;});
    }}
  });
  const {GET, POST} = load('src/app/api/apartments/import/route.ts', {...common, '@/services/importJobs.ts': jobs});
  const request = () => new Request('http://app/api', {method: 'POST', body: JSON.stringify({url: searchUrl})});
  assert.equal((await (await GET()).json()).job, null);
  const first = await POST(request());
  assert.equal(first.status, 202);
  const id = (await first.json()).job.id;
  report({phase: 'search', pagesTotal: 4, pagesProcessed: 2});
  const response = await GET();
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).job.pagesProcessed, 2);
  const conflict = await POST(request());
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).job.id, id);
  assert.equal(runs, 1);
  finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(jobs.getImportJob().status, 'completed');
  assert.ok(jobs.getImportJob().finishedAt);
  const next = jobs.startImport(searchUrl);
  assert.equal(next.started, true);
  assert.notEqual(next.job.id, id);
  assert.equal(next.job.pagesProcessed, 0);
  finish();
});

test('fatal import errors retain partial progress and release the import lock', async () => {
  const jobs = load('src/services/importJobs.ts', {...common,
    '@/services/apartmentsService.ts': {handleImportUrl: async (url, report) => {
      report({saved: 2});
      throw new Error('Database failure with private details');
    }}
  });
  jobs.startImport(searchUrl);
  await new Promise(resolve => setImmediate(resolve));
  const failed = jobs.getImportJob();
  assert.equal(failed.status, 'failed');
  assert.equal(failed.saved, 2);
  assert.ok(failed.finishedAt);
  assert.ok(failed.error);
  assert.ok(!failed.error.includes('private details'));
  assert.equal(jobs.startImport(searchUrl).started, true);
});

test('progress view renders idle, discovery, active, warning and failure states', () => {
  const {default: Progress} = load('src/components/ImportProgress.tsx');
  const {initialImportProgress} = load('src/types/importProgress.ts');
  const render = job => require('react-dom/server').renderToStaticMarkup(Progress({job}));
  assert.ok(render(null).includes('Brak aktywnego importu'));
  const job = {...initialImportProgress, id: '1', url: searchUrl, status: 'running', error: null};
  assert.ok(render(job).includes('Sprawdzanie liczby stron'));
  const active = render({...job, phase: 'search', pagesTotal: 5, pagesProcessed: 2, attempt: 3});
  assert.ok(active.includes('max="5" value="2"'));
  assert.ok(active.includes('Ponowna próba: 3 / 5'));
  assert.ok(render({...job, status: 'completed', pagesFailed: 1}).includes('z błędami'));
  assert.ok(render({...job, status: 'completed', saved: 0}).includes('Import zakończony'));
  assert.ok(render({...job, status: 'failed', error: 'Test error'}).includes('role="alert"'));
});

test('import page restores an active job, retries polling failures and displays completion', async () => {
  const {initialImportProgress} = load('src/types/importProgress.ts');
  const active = {...initialImportProgress, id: 'restored', url: searchUrl, status: 'running',
    phase: 'details', apartmentsTotal: 3, apartmentsProcessed: 1, saved: 1, error: null};
  const replies = [{data: {job: active}}, new Error('Offline'),
    {data: {job: {...active, status: 'completed', apartmentsProcessed: 3, saved: 3}}}];
  const state = [];
  const refs = [];
  let stateIndex = 0;
  let refIndex = 0;
  let effect;
  let nextPoll;
  let lastSignal;
  const react = {...require('react'),
    useState(initial) {const i = stateIndex++; if (!(i in state)) state[i] = initial; return [state[i], value => {state[i] = value;}];},
    useRef(initial) {const i = refIndex++; return refs[i] ??= {current: initial};},
    useEffect(callback) {effect ??= callback;}
  };
  const {default: Page} = load('src/app/(admin)/import/page.tsx', {
    react,
    '@/axios/axios.ts': {get: async (url, config) => {
      assert.equal(url, '/api/apartments/import');
      lastSignal = config.signal;
      const reply = replies.shift();
      if (reply instanceof Error) throw reply;
      return reply;
    }},
    '@/components/Modal.tsx': {__esModule: true, default: () => null, ModalParagraph: () => null}
  }, {setTimeout: callback => {nextPoll = callback; return 1;}, clearTimeout: () => {nextPoll = undefined;}});
  const render = () => {
    stateIndex = refIndex = 0;
    return require('react-dom/server').renderToStaticMarkup(Page());
  };
  assert.ok(render().includes('Odczytywanie stanu importu'));
  const cleanup = effect();
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(render().includes('Import w toku'));
  assert.ok(render().includes('max="3" value="1"'));
  await nextPoll();
  assert.ok(render().includes('Ponawiam połączenie'));
  await nextPoll();
  const complete = render();
  assert.ok(complete.includes('Import zakończony'));
  assert.ok(!complete.includes('Ponawiam połączenie'));
  assert.ok(complete.includes('Przejrzyj mieszkania'));
  cleanup();
  assert.equal(lastSignal.aborted, true);
  assert.equal(nextPoll, undefined);
});


test('sessions require configuration, correct credentials and valid unexpired signatures', async () => {
  const env = {ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'test-password-long', ADMIN_SESSION_SECRET: 'a'.repeat(64)};
  const session = load('src/util/session.ts', {}, {process: {env}});
  assert.equal(await session.credentialsMatch('admin', 'wrong'), false);
  assert.equal(await session.credentialsMatch('wrong', env.ADMIN_PASSWORD), false);
  assert.equal(await session.credentialsMatch('admin', env.ADMIN_PASSWORD), true);
  const now = 1800000000000;
  const token = await session.createSession('admin', now);
  assert.equal(await session.verifySession(token, now), true);
  assert.equal(await session.verifySession(token, now + session.SESSION_SECONDS * 1000), false);
  assert.equal(await session.verifySession(token.replace(/.$/, token.endsWith('0') ? '1' : '0'), now), false);
  for (const malformed of [undefined, '', '1.fake.fake', 'x'.repeat(1000)]) {
    assert.equal(await session.verifySession(malformed, now), false);
  }
  env.ADMIN_PASSWORD = 'another-password-long';
  assert.equal(await session.verifySession(token, now), false);
  env.ADMIN_SESSION_SECRET = '';
  assert.equal(await session.verifySession(token, now), false);
  assert.equal(await session.credentialsMatch('admin', env.ADMIN_PASSWORD), false);
});

test('all apartment handlers reject unauthenticated access even without middleware', async () => {
  const blocked = () => {throw new Error('Protected work must not run');};
  const mocks = {
    '@/util/winstonLogger.ts': logger,
    '@/util/prisma.ts': {details: {findMany: blocked, deleteMany: blocked}},
    '@/services/importJobs.ts': {startImport: blocked, getImportJob: blocked},
  };
  for (const [file, methods] of [
    ['src/app/api/apartments/route.ts', ['DELETE']],
    ['src/app/api/apartments/random/route.ts', ['GET']],
    ['src/app/api/apartments/import/route.ts', ['GET', 'POST']]
  ]) {
    const route = load(file, mocks);
    for (const method of methods) {
      const response = await route[method](new Request('http://app/api', {method}));
      assert.equal(response.status, 401);
    }
  }
});

test('authenticated deletion requires same origin and only then touches the database', async () => {
  const env = {ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'test-password-long', ADMIN_SESSION_SECRET: 'a'.repeat(64)};
  const globals = {process: {env}};
  const session = load('src/util/session.ts', {}, globals);
  const cookie = `${session.SESSION_COOKIE}=${await session.createSession('admin')}`;
  let deletions = 0;
  const {DELETE} = load('src/app/api/apartments/route.ts', {
    '@/util/winstonLogger.ts': logger,
    '@/util/prisma.ts': {user: {findUnique: async () => admin}, details: {deleteMany: async () => {deletions++;}}}
  }, globals);
  for (const origin of [undefined, 'http://evil.test']) {
    const headers = {cookie};
    if (origin) headers.origin = origin;
    assert.equal((await DELETE(new Request('http://app/api', {method: 'DELETE', headers}))).status, 403);
  }
  assert.equal(deletions, 0);
  assert.equal((await DELETE(new Request('http://app/api', {method: 'DELETE', headers: {cookie, origin: 'http://app'}}))).status, 200);
  assert.equal(deletions, 1);
});

test('authenticated status updates preserve the JSON body through the auth helper', async () => {
  const env = {ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'test-password-long', ADMIN_SESSION_SECRET: 'a'.repeat(64)};
  const globals = {process: {env}};
  const session = load('src/util/session.ts', {}, globals);
  const cookie = `${session.SESSION_COOKIE}=${await session.createSession('admin')}`;
  const rows = [{id: 1, status: 'pending', title: 'Example', url: 'https://www.olx.pl/example'}];
  const {PATCH} = load('src/app/api/apartments/[id]/route.ts', {
    '@/util/prisma.ts': reviewDatabase(rows)
  }, globals);
  const request = new Request('http://app/api/apartments/1', {
    method: 'PATCH', headers: {cookie, origin: 'http://app', 'content-type': 'application/json'},
    body: JSON.stringify({status: 'maybe'})
  });
  assert.equal((await PATCH(request, {params: {id: '1'}})).status, 200);
  assert.equal(rows[0].status, 'maybe');
  assert.equal(rows[0].statusSetById, 'admin');
});

test('login issues protected cookies; wrong credentials, cross-origin requests and excess attempts fail', async () => {
  const env = {ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'test-password-long', ADMIN_SESSION_SECRET: 'a'.repeat(64), NODE_ENV: 'production'};
  const {POST} = load('src/app/api/auth/login/route.ts', {
    '@/util/prisma.ts': {user: {findUnique: async () => null, upsert: async () => admin}}
  }, {process: {env}});
  const request = (password, origin = 'https://app') => new Request('https://app/api/auth/login', {
    method: 'POST', headers: {origin, 'content-type': 'application/json'}, body: JSON.stringify({username: 'admin', password})
  });
  assert.equal((await POST(request(env.ADMIN_PASSWORD, 'https://evil.test'))).status, 403);
  assert.equal((await POST(request('wrong'))).status, 401);
  const response = await POST(request(env.ADMIN_PASSWORD));
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=strict/i);
  assert.match(cookie, /Max-Age=28800/i);
  assert.ok(!cookie.includes(env.ADMIN_PASSWORD));
  for (let i = 0; i < 8; i++) assert.equal((await POST(request('wrong'))).status, 401);
  assert.equal((await POST(request('wrong'))).status, 429);
  env.ADMIN_SESSION_SECRET = '';
  assert.equal((await POST(request(env.ADMIN_PASSWORD))).status, 503);
});

test('logout clears the cookie and rejects cross-origin logout', async () => {
  const {POST} = load('src/app/api/auth/logout/route.ts');
  const response = await POST(new Request('http://app/api/auth/logout', {method: 'POST', headers: {origin: 'http://app'}}));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'http://app/login');
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/i);
  assert.equal((await POST(new Request('http://app/api/auth/logout', {method: 'POST', headers: {origin: 'http://evil.test'}}))).status, 403);
});

test('middleware protects pages and APIs while allowing login; protected layout also checks sessions', async () => {
  const env = {ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'test-password-long', ADMIN_SESSION_SECRET: 'a'.repeat(64)};
  const globals = {process: {env}};
  const session = load('src/util/session.ts', {}, globals);
  const {middleware} = load('src/middleware.ts', {}, globals);
  const {NextRequest} = require('next/server');
  assert.equal((await middleware(new NextRequest('http://app/import'))).headers.get('location'), 'http://app/login');
  assert.equal((await middleware(new NextRequest('http://app/api/apartments/import'))).status, 401);
  assert.equal((await middleware(new NextRequest('http://app/login'))).status, 200);
  const token = await session.createSession('admin');
  const allowed = await middleware(new NextRequest('http://app/import', {headers: {cookie: `${session.SESSION_COOKIE}=${token}`}}));
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('cache-control'), 'private, no-store');
  let cookie;
  const {default: Layout} = load('src/app/(admin)/layout.tsx', {
    'next/headers': {cookies: () => ({get: () => cookie})},
    'next/navigation': {redirect: url => {throw new Error(`Redirect ${url}`);}},
    '@/components/MainNavbar.tsx': () => null,
    '@/util/prisma.ts': {user: {findUnique: async () => admin}}
  }, globals);
  await assert.rejects(Layout({children: 'private'}), /Redirect \/login/);
  cookie = {value: token};
  assert.ok(await Layout({children: 'private'}));
});

test('login redirects use the public proxy host and scheme, without leaking the internal port', async () => {
  const {middleware} = load('src/middleware.ts');
  const {NextRequest} = require('next/server');
  for (const [internal, headers, expected] of [
    ['https://localhost:3000/?next=https://evil.test', {
      host: 'pianka.cieszczyk.pl', 'x-forwarded-proto': 'https', 'x-forwarded-host': 'evil.test'
    }, 'https://pianka.cieszczyk.pl/login'],
    ['http://127.0.0.1:3000/apartments', {
      host: 'pianka.cieszczyk.pl', 'x-forwarded-proto': 'https'
    }, 'https://pianka.cieszczyk.pl/login'],
    ['http://localhost:3000/stats', {
      host: '127.0.0.1:3111', 'x-forwarded-proto': 'http'
    }, 'http://127.0.0.1:3111/login'],
    ['http://localhost:3000/users', {}, 'http://localhost:3000/login'],
  ]) {
    const response = await middleware(new NextRequest(internal, {headers}));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), expected);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
  const headers = {host: 'pianka.cieszczyk.pl', 'x-forwarded-proto': 'https'};
  assert.equal((await middleware(new NextRequest('https://localhost:3000/login', {headers}))).headers.get('location'), null);
  const api = await middleware(new NextRequest('https://localhost:3000/api/apartments', {headers}));
  assert.equal(api.status, 401);
  assert.equal(api.headers.get('location'), null);
});

test('origin checks use the browser-facing Host when Next uses an internal URL', () => {
  const {sameOrigin} = load('src/util/requireAdmin.ts');
  assert.equal(sameOrigin(new Request('http://localhost:3111/api', {headers: {
    host: '127.0.0.1:3111', origin: 'http://127.0.0.1:3111'
  }})), true);
  assert.equal(sameOrigin(new Request('http://localhost/api', {headers: {
    host: 'apartments.example', origin: 'https://apartments.example', 'x-forwarded-proto': 'https'
  }})), true);
  assert.equal(sameOrigin(new Request('http://localhost/api', {headers: {
    host: 'apartments.example', origin: 'https://evil.example', 'x-forwarded-proto': 'https'
  }})), false);
});
