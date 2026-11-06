import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getTagIcon } from '../src/data/tagImages.ts';

const source = readFileSync(
  new URL('../src/data/tagImages.ts', import.meta.url),
  'utf8'
);
const entries = [
  ...source
    .split('// タグアイコン')[0]
    .matchAll(/(?:'([^']+)'|(\w+)):\s*'([^']+)'/g),
].map(([, quoted, plain, value]) => [quoted || plain, value]);

test('all 180 badge entries are unique, lowercase and valid asset hashes', () => {
  assert.equal(entries.length, 180);
  assert.equal(new Set(entries.map(([tag]) => tag)).size, entries.length);
  for (const [tag, hash] of entries) {
    assert.equal(tag, tag.toLowerCase());
    assert.match(hash, /^[a-f0-9]{64}$/);
    assert.equal(getTagIcon(tag), `https://assets.resonite.com/${hash}`);
  }
});

test('updated potato and newly supported event badges resolve', () => {
  assert.equal(
    getTagIcon('potato'),
    'https://assets.resonite.com/adf9ba7eee98dfa36e8fcf4130f2d6e60d353566c9f315c0f28a000dd06cad2c'
  );
  for (const tag of [
    'team member',
    'hearing impaired',
    'mmc world 3rd',
    'mmc21 world:social 2nd',
    'mmc26 participant',
    'mmc26 volunteer but',
    'unifesta 2026',
    'nasachallenge25',
    'lbecompetition25',
  ]) {
    assert.match(
      getTagIcon(tag),
      /^https:\/\/assets\.resonite\.com\/[a-f0-9]{64}$/
    );
  }
});

test('legacy category aliases retain the same images', () => {
  for (const [alias, canonical] of [
    ['mmc22 avatar:accessories', 'mmc22 avatar'],
    ['mmc22 avatar:misc', 'mmc22 avatar'],
    ['mmc22 honorable_mention', 'mmc22 honorable mention'],
    ['mmc23 other:tau', 'mmc23 other'],
    ['mmc23 world:game', 'mmc23 world'],
  ])
    assert.equal(getTagIcon(alias), getTagIcon(canonical));
});

test('all 41 pride flags use fixed Resonite assets', () => {
  const flags = entries.filter(([tag]) => tag.startsWith('pride '));
  assert.equal(flags.length, 41);
  for (const [tag] of flags)
    assert.match(getTagIcon(tag), /^https:\/\/assets\.resonite\.com\//);
});

test('custom badges and unknown tags preserve their existing behavior', () => {
  assert.equal(
    getTagIcon('custom badge:example'),
    'https://assets.resonite.com/example'
  );
  assert.equal(getTagIcon('unknown badge'), null);
});
