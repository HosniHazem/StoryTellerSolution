#!/usr/bin/env node

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { StoryBuilder } from './builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * CLI Tool - Build story from match events
 * 
 * Usage:
 *   npm run build
 *   node src/cli.js
 */

console.log('🏟️  Building story from match events...\n');

try {
  // Paths
  const projectRoot = join(__dirname, '..');
  const eventsPath = join(projectRoot, 'data', 'match_events.json');
  const assetsPath = join(projectRoot, 'assets');
  const outputPath = join(projectRoot, 'out', 'story.json');

  // Build story
  const builder = new StoryBuilder(eventsPath, assetsPath);
  const story = builder.build();

  // Write output
  writeFileSync(outputPath, JSON.stringify(story, null, 2), 'utf-8');

  // Success summary
  console.log('✅ Story built successfully!');
  console.log(`📄 Output: ${outputPath}`);
  console.log(`📊 Pages: ${story.pages.length}`);
  console.log(`⚽ Score: ${story.metrics.score}`);
  console.log('\n💡 Run "npm run preview" to view the story\n');

} catch (error) {
  console.error('❌ Error building story:', error.message);
  console.error(error.stack);
  process.exit(1);
}
