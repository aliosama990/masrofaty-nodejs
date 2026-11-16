const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const createApp = require('../app');
const openDatabase = require('../db');
const { today } = require('../utils/format');

async function startTestApp(t, databasePath = ':memory:') {
  const db = openDatabase(databasePath);
  const server = createApp(db).listen(0, '127.0.0.1');
  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    db.close();
  });
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    db,
    get: (url) => fetch(base + url, { redirect: 'manual' }),
    post: (url, body) => fetch(base + url, {
      method: 'POST', redirect: 'manual', body: new URLSearchParams(body)
    })
  };
}

function validExpense(overrides = {}) {
  return {
    title: 'Market groceries', amount: '12.34', categoryId: '1',
    date: today(), description: '', ...overrides
  };
}

function summaryValues(html) {
  return Object.fromEntries(Array.from(
    html.matchAll(/data-summary="(\w+)"[^>]*>(?:<small>EGP<\/small> )?([^<]+)<\/p>/g),
    (match) => [match[1], match[2]]
  ));
}

test('initializes the default categories, empty dashboard and error pages', async (t) => {
  const { db, get } = await startTestApp(t);
  const names = db.prepare('SELECT name FROM categories ORDER BY id').pluck().all();
  assert.deepEqual(names, ['Food', 'Transportation', 'Shopping', 'Bills', 'Entertainment', 'Other']);
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1);

  const response = await get('/');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Your ledger is empty/);
  assert.deepEqual(summaryValues(html), { month: '0.00', total: '0.00', count: '0' });
  for (const url of ['/missing', '/expenses/999/edit', '/expenses/invalid/delete']) {
    const missing = await get(url);
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /not found/);
  }
});

test('creates, edits and confirms deletion of a saved expense', async (t) => {
  const { db, get, post } = await startTestApp(t);
  const response = await post('/expenses', validExpense({ description: '<script>unsafe</script>' }));
  assert.equal(response.status, 303);
  const saved = await get(response.headers.get('location'));
  const list = await saved.text();
  assert.match(list, /Expense added/);
  assert.match(list, /&lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.doesNotMatch(list, /<script>unsafe/);
  const id = db.prepare('SELECT id FROM expenses').pluck().get();

  const editUrl = `/expenses/${id}/edit`;
  assert.match(await (await get(editUrl)).text(), /value="12.34"/);
  const edited = await post(editUrl, validExpense({ title: 'Bus fare', amount: '.5', categoryId: '2' }));
  assert.equal(edited.status, 303);
  assert.deepEqual(db.prepare('SELECT title, amount_cents, category_id, description FROM expenses').get(), {
    title: 'Bus fare', amount_cents: 50, category_id: 2, description: ''
  });

  const deleteUrl = `/expenses/${id}/delete`;
  assert.match(await (await get(deleteUrl)).text(), /Delete expense\?/);
  assert.match(await (await get('/expenses')).text(), /Bus fare/);
  const removed = await post(deleteUrl, {});
  assert.equal(removed.status, 303);
  assert.match(await (await get(removed.headers.get('location'))).text(), /Expense deleted/);
  assert.equal((await get(editUrl)).status, 404);
  assert.equal((await post(deleteUrl, {})).status, 404);
  assert.equal(db.prepare('SELECT COUNT(*) FROM expenses').pluck().get(), 0);
});

test('rejects invalid input and duplicate category names while preserving saved data', async (t) => {
  const { db, post } = await startTestApp(t);
  const invalidResponse = await post('/expenses', validExpense({
    title: ' ', amount: '2.555', categoryId: '999', date: '2026-02-30', description: 'a'.repeat(501)
  }));
  assert.equal(invalidResponse.status, 422);
  const invalidHtml = await invalidResponse.text();
  for (const field of ['title', 'amount', 'category', 'date', 'description']) {
    assert.match(invalidHtml, new RegExp(`id="${field}-error"`));
  }
  assert.equal(db.prepare('SELECT COUNT(*) FROM expenses').pluck().get(), 0);
  assert.equal((await post('/categories', { name: '  ' })).status, 422);
  assert.equal((await post('/categories', { name: ' fOoD ' })).status, 422);
  assert.equal((await post('/categories', { name: ' Health ' })).status, 303);
  const categoryId = db.prepare("SELECT id FROM categories WHERE name = 'Health'").pluck().get();
  assert.equal((await post('/expenses', validExpense({ categoryId }))).status, 303);
  const id = db.prepare('SELECT id FROM expenses').pluck().get();
  assert.equal((await post(`/expenses/${id}/edit`, validExpense({ amount: '0' }))).status, 422);
  assert.equal(db.prepare('SELECT amount_cents FROM expenses').pluck().get(), 1234);
});

test('combines filters, sorts by date and calculates current-month and all-time totals', async (t) => {
  const { get, post } = await startTestApp(t);
  const month = today().slice(0, 7);
  const fixtures = [
    validExpense({ title: 'Market 10% sale', amount: '0.10', date: `${month}-01` }),
    validExpense({ title: 'Market lunch', amount: '0.20', date: `${month}-02` }),
    validExpense({ title: 'Market taxi', amount: '4.75', categoryId: '2', date: `${month}-03` }),
    validExpense({ title: 'Market archived', amount: '3.00', date: '2000-01-15' })
  ];
  for (const expense of fixtures) assert.equal((await post('/expenses', expense)).status, 303);

  const filtered = await (await get(`/expenses?q=mArKeT&category=1&month=${month}&sort=oldest`)).text();
  assert.match(filtered, /2 expenses shown/);
  assert.ok(filtered.indexOf('Market 10% sale') < filtered.indexOf('Market lunch'));
  assert.doesNotMatch(filtered, /Market taxi|Market archived/);
  const newest = await (await get('/expenses')).text();
  assert.ok(newest.indexOf('Market taxi') < newest.indexOf('Market lunch'));
  const literalPercent = await (await get('/expenses?q=%25')).text();
  assert.match(literalPercent, /1 expense shown/);
  assert.match(literalPercent, /Market 10% sale/);
  const noMatches = await (await get('/expenses?q=%27%20OR%201%3D1--')).text();
  assert.match(noMatches, /No expenses match these filters/);

  const dashboard = await (await get('/')).text();
  assert.deepEqual(summaryValues(dashboard), { month: '5.05', total: '8.05', count: '4' });
  assert.match(dashboard, /Food<\/span>\s*<span class="money"><small>EGP<\/small> 3\.30/);
  assert.match(dashboard, /Transportation<\/span>\s*<span class="money"><small>EGP<\/small> 4\.75/);
  assert.ok(dashboard.indexOf('Market taxi') < dashboard.indexOf('Market lunch'));
});

test('persists records and seeds default categories only once across database opens', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'masrofaty-'));
  const filename = path.join(directory, 'test.sqlite');
  let db;
  try {
    db = openDatabase(filename);
    db.prepare("INSERT INTO categories (name) VALUES ('Health')").run();
    db.prepare("INSERT INTO expenses (title, amount_cents, category_id, date) VALUES ('Medicine', 5000, 7, '2026-01-01')").run();
    assert.throws(() => db.prepare("DELETE FROM categories WHERE name = 'Health'").run(), {
      code: 'SQLITE_CONSTRAINT_FOREIGNKEY'
    });
    db.close();

    db = openDatabase(filename);
    assert.equal(db.prepare('SELECT COUNT(*) FROM categories').pluck().get(), 7);
    assert.equal(db.prepare('SELECT title FROM expenses').pluck().get(), 'Medicine');
  } finally {
    if (db?.open) db.close();
    fs.rmSync(filename, { force: true });
    fs.rmdirSync(directory);
  }
});
