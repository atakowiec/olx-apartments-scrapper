const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const {PrismaClient} = require('@prisma/client');

function loader(database, env, extraMocks = {}) {
  const modules = new Map();
  const mocks = {'@/util/prisma.ts': database,
    '@/util/winstonLogger.ts': () => ({info() {}, warn() {}, error() {}}), ...extraMocks};
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}
    }).outputText;
    const module = {exports: {}};
    vm.runInNewContext(code, {module, exports: module.exports, require: name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      return name.startsWith('@/') ? load(`src/${name.slice(2)}`) : require(name);
    }, URL, Request, Response, TextEncoder, Buffer, crypto: require('node:crypto').webcrypto,
    process: {env}, console}, {filename: path.resolve(file)});
    modules.set(file, module.exports);
    return module.exports;
  }
  return load;
}

test('accounts, permissions, status audit and statistics work together in migrated SQLite', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'olx-accounts-'));
  const database = new PrismaClient({datasources: {db: {url: `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}`}}});
  const env = {ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'admin-test-password', ADMIN_SESSION_SECRET: 's'.repeat(64)};
  const load = loader(database, env);
  const makeRequest = (url, method = 'GET', cookie, body, origin = 'http://app') => new Request(`http://app${url}`, {
    method, headers: {...(cookie ? {cookie} : {}), origin, 'content-type': 'application/json'},
    ...(body !== undefined ? {body: JSON.stringify(body)} : {})
  });
  try {
    for (const migration of fs.readdirSync('prisma/migrations').filter(name => /^\d/.test(name)).sort()) {
      // Seed an old decision before the accounts migration, verifying data is preserved.
      if (migration.includes('user_accounts')) await database.$executeRawUnsafe(
        `INSERT INTO details (url,title,description,images,status) VALUES ('https://www.olx.pl/legacy','Legacy','','','accepted')`);
      const sql = fs.readFileSync(`prisma/migrations/${migration}/migration.sql`, 'utf8');
      for (const statement of sql.split(';').map(part => part.trim()).filter(Boolean)) await database.$executeRawUnsafe(statement);
    }
    const login = load('src/app/api/auth/login/route.ts').POST;
    const users = load('src/app/api/users/route.ts');
    const apartments = load('src/app/api/apartments/route.ts');
    const patch = load('src/app/api/apartments/[id]/route.ts').PATCH;
    const imports = load('src/app/api/apartments/import/route.ts');
    const stats = load('src/services/statistics.ts').getStatistics;
    const sessions = load('src/util/session.ts');
    const security = load('src/util/requireAdmin.ts');
    const password = 'user-password-123';
    const signIn = async (username, password) => {
      const response = await login(makeRequest('/api/auth/login', 'POST', null, {username, password}));
      assert.equal(response.status, 200);
      return response.headers.get('set-cookie').split(';')[0];
    };

    assert.equal((await users.GET(makeRequest('/api/users'))).status, 401);
    assert.equal((await users.POST(makeRequest('/api/users', 'POST', null, {username: 'alice', password}))).status, 401);
    assert.equal((await apartments.GET(makeRequest('/api/apartments'))).status, 401);
    const adminCookie = await signIn('admin', env.ADMIN_PASSWORD);
    assert.equal((await database.user.findUnique({where: {id: 'admin'}})).passwordHash, null);
    for (const body of [{username: 'x', password}, {username: 'alice', password: 'short'}, {username: 'alice', password, role: 'admin'}]) {
      assert.equal((await users.POST(makeRequest('/api/users', 'POST', adminCookie, body))).status, 400);
    }
    assert.equal((await users.POST(makeRequest('/api/users', 'POST', adminCookie, {username: 'alice', password}, 'http://evil'))).status, 403);
    const created = await users.POST(makeRequest('/api/users', 'POST', adminCookie, {username: 'alice', password}));
    assert.equal(created.status, 201);
    const alice = await created.json();
    assert.equal(alice.role, 'user');
    assert.equal('passwordHash' in alice, false);
    const stored = await database.user.findUnique({where: {id: alice.id}});
    assert.match(stored.passwordHash, /^scrypt:/);
    assert.ok(!stored.passwordHash.includes(password));
    assert.equal((await users.POST(makeRequest('/api/users', 'POST', adminCookie, {username: 'alice', password}))).status, 409);
    assert.equal((await login(makeRequest('/api/auth/login', 'POST', null, {username: 'alice', password: 'wrong-password'}))).status, 401);
    const userCookie = await signIn('alice', password);
    for (const [handler, url, method, body] of [
      [users.GET, '/api/users', 'GET'], [users.POST, '/api/users', 'POST', {username: 'hacker', password}],
      [apartments.DELETE, '/api/apartments', 'DELETE'], [imports.GET, '/api/apartments/import', 'GET'],
      [imports.POST, '/api/apartments/import', 'POST', {url: 'https://www.olx.pl/nieruchomosci/mieszkania/wynajem/'}]
    ]) assert.equal((await handler(makeRequest(url, method, userCookie, body))).status, 403);
    assert.equal((await apartments.GET(makeRequest('/api/apartments', 'GET', userCookie))).status, 200);
    const userList = await (await users.GET(makeRequest('/api/users', 'GET', adminCookie))).json();
    assert.ok(userList.every(user => !('passwordHash' in user)));

    const apartment = await database.details.create({data: {url: 'https://www.olx.pl/example', title: 'Test apartment', description: '', images: '', loaded: true}});
    const change = (cookie, status, origin = 'http://app') => patch(makeRequest(`/api/apartments/${apartment.id}`, 'PATCH', cookie,
      {status, userId: 'admin', statusSetById: 'admin'}, origin), {params: {id: String(apartment.id)}});
    assert.equal((await change(null, 'accepted')).status, 401);
    assert.equal((await change(userCookie, 'accepted', 'http://evil')).status, 403);
    const first = await (await change(userCookie, 'accepted')).json();
    assert.equal(first.statusSetBy.id, alice.id);
    assert.ok(first.statusSetAt);
    const duplicate = await (await change(adminCookie, 'accepted')).json();
    assert.equal(duplicate.statusSetBy.id, alice.id);
    assert.equal(duplicate.statusSetAt, first.statusSetAt);
    assert.equal(await database.statusChange.count(), 1);
    await change(adminCookie, 'maybe');
    await change(userCookie, 'rejected');
    const saved = (await (await apartments.GET(makeRequest('/api/apartments', 'GET', userCookie))).json()).find(row => row.id === apartment.id);
    assert.equal(saved.statusSetBy.username, 'alice');
    let report = await stats();
    assert.equal(report.total, 3);
    assert.equal(report.unattributed, 1);
    assert.equal(report.summary.find(row => row.id === alice.id).accepted, 1);
    assert.equal(report.summary.find(row => row.id === alice.id).rejected, 1);
    assert.equal(report.summary.find(row => row.id === 'admin').maybe, 1);
    assert.equal(report.history[0].fromStatus, 'maybe');
    assert.equal(report.history[0].user.username, 'alice');

    // A failed history write must roll back the apartment update as well.
    const broken = {$transaction: callback => database.$transaction(tx => callback({details: tx.details,
      statusChange: {create: async () => {throw new Error('audit failed');}}})), user: database.user};
    const failingPatch = loader(broken, env)('src/app/api/apartments/[id]/route.ts').PATCH;
    await assert.rejects(failingPatch(makeRequest(`/api/apartments/${apartment.id}`, 'PATCH', userCookie, {status: 'maybe'}), {params: {id: String(apartment.id)}}), /audit failed/);
    assert.equal((await database.details.findUnique({where: {id: apartment.id}})).status, 'rejected');
    assert.equal(await database.statusChange.count(), 3);

    // Signed claims are still checked against the live account and cannot swap identities.
    const token = userCookie.split('=')[1];
    assert.equal(await sessions.sessionSubject(token.replace(alice.id, 'admin')), null);
    const ghost = `${sessions.SESSION_COOKIE}=${await sessions.createSession('deleted-user')}`;
    assert.equal((await security.authorize(makeRequest('/api/apartments', 'GET', ghost))).status, 401);
    const ui = loader(database, env, {
      'next/headers': {cookies: () => ({get: () => ({value: token})})},
      'next/navigation': {redirect: url => {throw new Error(`Redirect ${url}`);}}
    });
    assert.equal((await ui('src/util/pageAuth.ts').authenticatedPage()).id, alice.id);
    await assert.rejects(ui('src/util/pageAuth.ts').authenticatedPage(true), /Redirect \//);
    const page = await ui('src/app/(admin)/stats/page.tsx').default({searchParams: {}});
    const html = require('react-dom/server').renderToStaticMarkup(page);
    assert.ok(html.includes('Skumulowany wykres'));
    assert.ok(html.includes('alice'));
    assert.ok(html.includes('Test apartment'));

    // Pagination and deleted-apartment snapshots preserve the audit trail.
    for (let index = 0; index < 50; index++) await database.statusChange.create({data: {
      userId: alice.id, apartmentId: apartment.id, apartmentTitle: apartment.title, apartmentUrl: apartment.url, fromStatus: 'pending', toStatus: 'maybe'
    }});
    report = await stats(99);
    assert.equal(report.page, 2);
    assert.equal(report.history.length, 3);
    assert.equal((await stats(-2)).page, 1);
    assert.equal((await stats(NaN)).page, 1);
    assert.equal((await apartments.DELETE(makeRequest('/api/apartments', 'DELETE', adminCookie))).status, 200);
    assert.equal(await database.details.count(), 0);
    report = await stats();
    assert.equal(report.total, 53);
    assert.ok(report.history.every(change => change.apartmentId === null && change.apartmentTitle === 'Test apartment'));
    env.ADMIN_PASSWORD = 'new-admin-password';
    assert.equal((await security.authorize(makeRequest('/api/apartments', 'GET', userCookie))).status, 401);
  } finally {
    await database.$disconnect();
    const cleanupPath = path.resolve(directory);
    assert.equal(path.dirname(cleanupPath), path.resolve(os.tmpdir()));
    assert.ok(path.basename(cleanupPath).startsWith('olx-accounts-'));
    fs.rmSync(cleanupPath, {recursive: true, force: true});
  }
});
