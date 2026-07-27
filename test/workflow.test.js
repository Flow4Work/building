const test = require('node:test');
const assert = require('node:assert/strict');
const { mockTopics, mockStory, mockTranslate, mockMetadata } = require('../.test-dist/src/lib/ai/mock.js');
const { countGraphemes } = require('../.test-dist/src/lib/graphemes.js');

test('mock topic recommendation avoids recent exact titles when alternatives exist', () => {
  const recent = ['너무 애쓰지 않아도 된다', '지나간 인연을 붙잡지 말라'];
  const topics = mockTopics(recent);
  assert.equal(topics.length, 6);
  assert.equal(topics.includes(recent[0]), false);
  assert.equal(topics.includes(recent[1]), false);
});

test('mock story stays near target length', () => {
  const text = mockStory('inspired_buddha', '이젠 잘 쉬어야 한다', 1100);
  const n = countGraphemes(text);
  assert.ok(n >= 1070 && n <= 1130, `length=${n}`);
});

test('all four language mock results and metadata are independent', () => {
  for (const lang of ['en', 'ja', 'zh', 'th']) {
    const translated = mockTranslate('원문', lang);
    const meta = mockMetadata('이젠 잘 쉬어야 한다', lang);
    assert.ok(translated.includes('원문'));
    assert.ok(meta.title.length > 0);
    assert.ok(meta.hashtags.length >= 10);
  }
});
