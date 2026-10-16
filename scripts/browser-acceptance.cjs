'use strict';
// Serve the committed page and synthetic HTTP responses; never contact a plant.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {setTimeout: delay} = require('node:timers/promises');
const playwright = require(process.env.CI_PLAYWRIGHT_MODULE);
const diagnostics = process.env.CI_BROWSER_DIAGNOSTICS;
const runtime = JSON.parse(fs.readFileSync(path.join(diagnostics, 'runtime.json'), 'utf8'));
const html = fs.readFileSync(path.join(__dirname, '../index.html'));
const scenarios = [], pageErrors = [], blockedRequests = [], heldHealth = [];
const fixture = {
  snapshotStatus: 200,
  snapshot: {system: {
    '0/Dc/Pv/Power': 1500, '0/Dc/Battery/Power': -150,
    '0/Dc/Battery/Voltage': 52.15, '0/Dc/Battery/Current': -2.5,
    '0/Ac/Grid/L1/Power': -100, '0/Ac/Grid/L2/Power': 250,
    '0/Ac/Consumption/L1/Power': 1200, '0/Ac/Consumption/L3/Power': 400,
  }},
  healthStatus: 200, health: {status: 'ok', mqtt_connected: true},
  healthCalls: 0, holdNextHealth: false,
};
function respond(response, status, body) {
  response.writeHead(status, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
  response.end(typeof body === 'string' ? body : JSON.stringify(body));
}
const server = http.createServer((request, response) => {
  const route = new URL(request.url, 'http://localhost').pathname;
  if (request.method !== 'GET') return response.writeHead(405).end();
  if (route === '/') {
    response.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'no-store'});
    return response.end(html);
  }
  if (route === '/favicon.ico') return response.writeHead(204).end();
  if (route === '/api/gateway/snapshot') return respond(response, fixture.snapshotStatus, fixture.snapshot);
  if (route === '/api/gateway/health') {
    fixture.healthCalls++;
    if (fixture.holdNextHealth) {
      fixture.holdNextHealth = false;
      heldHealth.push(() => respond(response, 503, {status: 'late failure', mqtt_connected: false}));
      return;
    }
    return respond(response, fixture.healthStatus, fixture.health);
  }
  response.writeHead(404).end();
});
async function eventually(read, expected, message) {
  const deadline = Date.now() + 10000;
  async function poll() {
    const value = await read();
    if (value === expected) return;
    if (Date.now() >= deadline) assert.fail(`${message}: expected ${expected}, received ${value}`);
    await delay(30);
    return poll();
  }
  return poll();
}
async function scenario(name, test) {
  await test();
  scenarios.push(name);
  console.log('PASS ' + name);
}
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser, context, page;
  try {
    const denied = await Promise.all(['/package.json', '/.git/config', '/%2e%2e%2fpackage.json'].map(async route => (await fetch(origin + route)).status));
    assert.deepEqual(denied, [404, 404, 404]);
    const engine = process.env.CI_BROWSER_ENGINE, channel = process.env.CI_BROWSER_CHANNEL;
    browser = await playwright[engine].launch({headless: true, ...(channel ? {channel} : {})});
    assert.equal(browser.browserType().name(), runtime.engine);
    assert.equal(browser.version(), runtime.browserVersion);
    assert.equal(require(path.join(process.env.CI_PLAYWRIGHT_MODULE, 'package.json')).version, runtime.playwrightVersion);
    context = await browser.newContext({locale: 'en-US', viewport: {width: 1280, height: 900}, serviceWorkers: 'block'});
    await context.tracing.start({screenshots: true, snapshots: true});
    await context.route('**/*', async route => {
      if (new URL(route.request().url()).origin !== origin) {
        blockedRequests.push(route.request().url());
        await route.abort();
      } else await route.continue();
    });
    page = await context.newPage();
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.clock.install({time: new Date('2026-01-01T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-01-01T12:00:01Z'));
    const text = id => page.locator('#' + id).textContent();
    const waitText = (id, value) => eventually(() => text(id), value, id);
    await page.goto(origin);
    await scenario('real-page-renders-telemetry-units-and-phase-sums', async () => {
      await waitText('mqtt', 'connected');
      for (const [id, value] of Object.entries({solar:'1,500W', batt:'-150W', grid:'150W', load:'1,600W', bv:'52.15 V', bi:'-2.5 A'})) assert.equal(await text(id), value);
      assert.equal(await page.locator('#dot').getAttribute('class'), 'dot');
    });
    await scenario('scheduled-snapshot-refresh-retains-confirmed-health', async () => {
      const calls = fixture.healthCalls;
      fixture.snapshot.system['0/Dc/Pv/Power'] = 2500;
      await page.clock.runFor(15000);
      await waitText('solar', '2,500W');
      assert.equal(fixture.healthCalls, calls);
      assert.equal(await text('mqtt'), 'connected');
    });
    await scenario('http-health-failure-stays-unhealthy-on-snapshot-only-polls', async () => {
      fixture.healthStatus = 503;
      await page.clock.runFor(45000);
      await waitText('health', 'error');
      assert.equal(await text('mqtt'), 'down');
      fixture.snapshot.system['0/Dc/Pv/Power'] = 2600;
      await page.clock.runFor(15000);
      await waitText('solar', '2,600W');
      assert.equal(await text('health'), 'error');
      assert.equal(await page.locator('#dot').getAttribute('class'), 'dot bad');
    });
    await scenario('scheduled-health-recovery-clears-the-error', async () => {
      fixture.healthStatus = 200;
      await page.clock.runFor(45000);
      await waitText('mqtt', 'connected');
      assert.equal(await text('when'), 'live · gateway');
    });
    await scenario('malformed-health-cannot-retain-an-optimistic-connection', async () => {
      fixture.health = 'not valid json';
      await page.clock.runFor(60000);
      await eventually(() => page.locator('#dot').getAttribute('class'), 'dot warn', 'Malformed response must be visible');
      await page.clock.runFor(15000);
      await waitText('mqtt', 'down');
      assert.equal(await text('health'), 'unknown');
    });
    await scenario('snapshot-failure-is-visible-and-a-later-poll-recovers', async () => {
      fixture.snapshotStatus = 503;
      await page.clock.runFor(15000);
      await waitText('when', 'proxy/error · snap 503');
      fixture.snapshotStatus = 200;
      fixture.snapshot.system['0/Dc/Pv/Power'] = 2700;
      await page.clock.runFor(15000);
      await waitText('solar', '2,700W');
      assert.equal(await page.locator('#dot').getAttribute('class'), 'dot bad');
    });
    await scenario('late-health-failure-cannot-overwrite-a-newer-success', async () => {
      fixture.health = {status:'ok', mqtt_connected:true};
      fixture.holdNextHealth = true;
      await page.clock.runFor(15000);
      await eventually(() => heldHealth.length, 1, 'Old health request must remain pending');
      await page.clock.runFor(60000);
      await waitText('mqtt', 'connected');
      const completed = page.waitForResponse(response => response.url().endsWith('/api/gateway/health') && response.status() === 503);
      heldHealth.shift()();
      await completed;
      // Error responses are intentionally not read by the application. Drain
      // rendering turns without waiting for an unconsumed response body.
      const settled = page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.clock.runFor(40);
      await settled;
      assert.equal(await text('health'), 'ok');
      assert.equal(await text('mqtt'), 'connected');
    });
    await scenario('untrusted-status-is-text-and-missing-metrics-remain-empty', async () => {
      const marker = '<img src=x onerror="window.fixtureExecuted=true">';
      fixture.snapshot = {system:{'0/Dc/Pv/Power':marker}};
      fixture.health = {status:marker, mqtt_connected:false};
      await page.clock.runFor(60000);
      await waitText('health', marker);
      assert.equal(await text('solar'), '—W');
      assert.equal(await text('grid'), '—W');
      assert.equal(await page.locator('img').count(), 0);
      assert.equal(await page.evaluate(() => window.fixtureExecuted === true), false);
    });
    await scenario('mobile-layout-and-keyboard-navigation-remain-usable', async () => {
      await page.setViewportSize({width:390,height:844});
      const geometry = await page.evaluate(() => ({width:innerWidth, scroll:document.documentElement.scrollWidth,
        cards:[...document.querySelectorAll('.grid .card')].map(card => {const r=card.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})}));
      assert(geometry.scroll <= geometry.width, 'Page must not overflow a mobile viewport');
      for (let index=1;index<geometry.cards.length;index++) assert(geometry.cards[index].top >= geometry.cards[index-1].bottom, 'Cards must stack without overlap');
      // macOS WebKit uses Option+Tab for links. On Windows, Alt+Tab is an
      // OS task-switch shortcut rather than in-page keyboard navigation.
      const linkKey = engine === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
      await page.keyboard.press(linkKey);
      assert.equal(await page.locator(':focus').textContent(), 'inverter-gateway');
    });
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(blockedRequests, []);
    assert.equal(scenarios.length, 9);
    fs.writeFileSync(process.env.CI_BROWSER_EVIDENCE, JSON.stringify({...runtime, scenarios,
      testsPassed:scenarios.length, testsFailed:0, indexSha256:crypto.createHash('sha256').update(html).digest('hex')},null,2)+'\n');
  } catch (error) {
    if (page) await page.screenshot({path:path.join(diagnostics,'failure.png'),fullPage:true}).catch(() => {});
    throw error;
  } finally {
    for (const release of heldHealth.splice(0)) release();
    if (context) await context.tracing.stop({path:path.join(diagnostics,'trace.zip')}).catch(() => {});
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => {console.error(error);process.exitCode=1;});
