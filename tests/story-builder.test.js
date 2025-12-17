import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { StoryBuilder } from '../dist/builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const assetsPath = join(projectRoot, 'assets');

function buildStory(fixtureFile) {
  const eventsPath = join(projectRoot, 'data', fixtureFile);
  const builder = new StoryBuilder(eventsPath, assetsPath);
  return builder.build();
}

test('cover has no score and is the first page', () => {
  const story = buildStory('match_events_two_teams_score.json');
  const cover = story.pages[0];
  assert.equal(cover.type, 'cover');
  assert.ok(!cover.headline.includes('-'), 'Cover headline should not contain score');
});

test('half-time page is present when there is a second half', () => {
  const story = buildStory('match_events_two_teams_score.json');
  const hasHalfTime = story.pages.some(
    p => p.type === 'info' && p.headline === 'Half-time whistle'
  );
  assert.ok(hasHalfTime, 'Half-time page should be inserted');
});

test('images are not reused until pool is exhausted', () => {
  const story = buildStory('match_events_two_teams_score.json');
  const images = story.pages
    .map(p => p.image)
    .filter(Boolean);
  const unique = new Set(images);
  assert.equal(unique.size, images.length, 'Images should be unique across pages');
});

test('calm tone when conceding against the posting team', () => {
  const story = buildStory('match_events_celtic_loss_kilmarnock.json');
  const calmCaption = story.pages
    .filter(p => p.type === 'highlight' && p.caption)
    .map(p => p.caption)
    .find(text => text.includes('stay composed'));
  assert.ok(calmCaption, 'Should use calm caption when opponent scores against posting team');
});

