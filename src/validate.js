import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Validator - Ensures story.json matches the schema
 */

const projectRoot = join(__dirname, '..');
const schemaPath = join(projectRoot, 'schema', 'story.schema.json');
const storyPath = join(projectRoot, 'out', 'story.json');

console.log('🔍 Validating story against schema...\n');

try {
  const schemaData = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  const story = JSON.parse(readFileSync(storyPath, 'utf-8'));

  // Remove $schema to avoid Ajv issues with draft-2020-12
  const { $schema, ...schema } = schemaData;

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  
  const validate = ajv.compile(schema);
  const valid = validate(story);

  if (valid) {
    console.log('✅ Story is valid!\n');
    console.log(`📊 Pack ID: ${story.pack_id}`);
    console.log(`📄 Title: ${story.title}`);
    console.log(`📖 Pages: ${story.pages.length}`);
    console.log(`  - Cover: ${story.pages.filter(p => p.type === 'cover').length}`);
    console.log(`  - Highlights: ${story.pages.filter(p => p.type === 'highlight').length}`);
    console.log(`  - Info: ${story.pages.filter(p => p.type === 'info').length}\n`);
  } else {
    console.error('❌ Validation failed:\n');
    validate.errors.forEach(err => {
      console.error(`  - ${err.instancePath}: ${err.message}`);
    });
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
