const test = require('node:test');
const assert = require('node:assert/strict');
const { loadProjects, saveProjects, fallbackCopy } = require('../.test-dist/src/lib/storage.js');

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => map.has(k) ? map.get(k) : null,
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

test('localStorage save then restore keeps project data', () => {
  const localStorage = fakeStorage();
  global.window = { localStorage };
  const projects = [{ id: 'p1', title: '테스트', sourceText: '원고' }];
  saveProjects(projects);
  assert.deepEqual(loadProjects(), projects);
  delete global.window;
});

test('corrupt localStorage never crashes and returns empty list', () => {
  const localStorage = fakeStorage();
  localStorage.setItem('ai-story-studio.projects.v1', '{bad');
  global.window = { localStorage };
  assert.deepEqual(loadProjects(), []);
  delete global.window;
});

test('copy uses Clipboard API when available', async () => {
  let copied = '';
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async (text) => { copied = text; } } } });
  await fallbackCopy('복사 테스트');
  assert.equal(copied, '복사 테스트');
  delete globalThis.navigator;
});

test('copy falls back to execCommand when Clipboard API fails', async () => {
  let selected = false;
  let removed = false;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async () => { throw new Error('denied'); } } } });
  global.document = {
    createElement: () => ({ value: '', style: {}, setAttribute: () => {}, select: () => { selected = true; } }),
    body: { appendChild: () => {}, removeChild: () => { removed = true; } },
    execCommand: (cmd) => cmd === 'copy',
  };
  await fallbackCopy('fallback');
  assert.equal(selected, true);
  assert.equal(removed, true);
  delete globalThis.navigator;
  delete global.document;
});
