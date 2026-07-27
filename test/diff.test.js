const test = require('node:test');
const assert = require('node:assert/strict');
const { strictSpeechDiff } = require('../.test-dist/src/lib/diff.js');
const { countGraphemes, withinTarget } = require('../.test-dist/src/lib/graphemes.js');

test('identical sentence never invents a difference', () => {
  assert.deepEqual(strictSpeechDiff('You smiled to give strength to others', 'You smiled to give strength to others'), []);
});

test('identical punctuation boundary remains equal', () => {
  assert.deepEqual(strictSpeechDiff('new wisdom begins to grow. In a calm heart,', 'new wisdom begins to grow. In a calm heart,'), []);
});

test('apostrophe loss is a candidate difference', () => {
  const result = strictSpeechDiff("the disciple's weary face", 'the disciples weary face');
  assert.ok(result.length > 0);
});

test('punctuation, whitespace and line breaks alone are ignored for speech diff', () => {
  assert.deepEqual(strictSpeechDiff('Hello,   world!\nAgain.', 'Hello world Again'), []);
});

test('changed spoken word is detected', () => {
  const result = strictSpeechDiff('You smiled to give strength to others', 'You smile to give strength to others');
  assert.equal(result.length, 1);
  assert.equal(result[0].type, 'changed');
  assert.equal(result[0].expected, 'smiled');
  assert.equal(result[0].actual, 'smile');
});

test('grapheme count handles composed Korean text', () => {
  assert.equal(countGraphemes('한글🙂'), 3);
  assert.equal(withinTarget('12345', 5, 0), true);
});
