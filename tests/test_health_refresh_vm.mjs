/**
 * INVVITRINE-1: offline Node vm regressions for gateway health UI.
 * Never calls a live backend — fetch is mocked.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1]
// Drop auto-start timers/boot refresh so tests drive refresh explicitly.
const body = script
  .replace(/\nrefresh\(true\);\s*\nsetInterval\(\(\) => refresh\(false\), 15000\);\s*\nsetInterval\(\(\) => refresh\(true\), 60000\);\s*/, '\n')

function el(id) {
  return {
    id,
    textContent: '',
    innerHTML: '',
    className: '',
  }
}

function makeDom() {
  const nodes = {
    solar: el('solar'),
    batt: el('batt'),
    grid: el('grid'),
    load: el('load'),
    bv: el('bv'),
    bi: el('bi'),
    bp: el('bp'),
    health: el('health'),
    mqtt: el('mqtt'),
    updated: el('updated'),
    dot: el('dot'),
    when: el('when'),
  }
  return {
    getElementById(id) {
      if (!nodes[id]) throw new Error('missing element ' + id)
      return nodes[id]
    },
    _nodes: nodes,
  }
}

function makeFetch(plan) {
  // plan: array of {urlIncludes, status, json}
  let i = 0
  return async (url) => {
    const step = plan[i++]
    if (!step) throw new Error('unexpected fetch ' + url)
    assert.ok(String(url).includes(step.urlIncludes), `url ${url} vs ${step.urlIncludes}`)
    if (step.error) throw new Error(step.error)
    return {
      ok: step.status >= 200 && step.status < 300,
      status: step.status,
      async json() {
        if (step.jsonError) throw new Error(step.jsonError)
        return step.json
      },
    }
  }
}

async function runSequence(plan) {
  const document = makeDom()
  const context = {
    document,
    fetch: makeFetch(plan),
    console: { warn() {}, log() {} },
    setInterval() { return 0 },
    Date,
    JSON,
    Error,
    Promise,
  }
  vm.createContext(context)
  vm.runInContext(body, context)
  // Expose refresh from context
  const refresh = vm.runInContext('refresh', context)
  return { refresh, document, context }
}

const snapOk = {
  urlIncludes: '/api/gateway/snapshot',
  status: 200,
  json: { system: { '0/Dc/Pv/Power': 1 } },
}

{
  // Sequence A: health HTTP 503, then successful snapshot-only refresh.
  // Must not show mqtt=connected / healthy dot from optimistic init.
  const { refresh, document } = await runSequence([
    snapOk,
    { urlIncludes: '/api/gateway/health', status: 503, json: { status: 'ok', mqtt_connected: true } },
    snapOk,
  ])
  await refresh(true)
  assert.equal(document.getElementById('mqtt').textContent, 'down')
  assert.equal(document.getElementById('dot').className, 'dot bad')
  await refresh(false)
  assert.equal(document.getElementById('mqtt').textContent, 'down')
  assert.equal(document.getElementById('dot').className, 'dot bad')
  assert.notEqual(document.getElementById('health').textContent, 'ok')
}

{
  // Sequence B: negative health JSON 200, then snapshot-only keeps it.
  const { refresh, document } = await runSequence([
    snapOk,
    { urlIncludes: '/api/gateway/health', status: 200, json: { status: 'degraded', mqtt_connected: false } },
    snapOk,
  ])
  await refresh(true)
  assert.equal(document.getElementById('mqtt').textContent, 'down')
  assert.equal(document.getElementById('dot').className, 'dot bad')
  assert.equal(document.getElementById('health').textContent, 'degraded')
  await refresh(false)
  assert.equal(document.getElementById('mqtt').textContent, 'down')
  assert.equal(document.getElementById('dot').className, 'dot bad')
  assert.equal(document.getElementById('health').textContent, 'degraded')
}

{
  // Positive health still enables connected after unknown init.
  const { refresh, document } = await runSequence([
    snapOk,
    { urlIncludes: '/api/gateway/health', status: 200, json: { status: 'ok', mqtt_connected: true } },
  ])
  await refresh(true)
  assert.equal(document.getElementById('mqtt').textContent, 'connected')
  assert.equal(document.getElementById('dot').className, 'dot')
}

for (const failure of [
  { error: 'network unavailable' },
  { status: 200, jsonError: 'malformed health response' },
]) {
  const { refresh, document } = await runSequence([
    snapOk,
    { urlIncludes: '/api/gateway/health', status: 200, json: { status: 'ok', mqtt_connected: true } },
    snapOk,
    { urlIncludes: '/api/gateway/health', ...failure },
    snapOk,
  ])
  await refresh(true)
  assert.equal(document.getElementById('mqtt').textContent, 'connected')
  await refresh(true)
  await refresh(false)
  assert.equal(document.getElementById('mqtt').textContent, 'down')
  assert.equal(document.getElementById('dot').className, 'dot bad')
}

console.log('ok: 5 health refresh sequences')
