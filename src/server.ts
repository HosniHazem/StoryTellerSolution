import { createServer } from 'http';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Simple HTTP Server for Story Preview
 * 
 * Serves static files and story data
 * No external dependencies - just Node.js built-ins
 */

const PORT = 3000;
const projectRoot = join(__dirname, '..');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif'
};

const server = createServer((req, res) => {
  // API endpoint to update story.json for live edits
  if (req.url === '/api/story' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // rudimentary protection against very large bodies
      if (body.length > 5_000_000) {
        res.writeHead(413);
        res.end('Payload too large');
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const storyPath = join(projectRoot, 'out', 'story.json');
        writeFileSync(storyPath, JSON.stringify(parsed, null, 2), 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (error) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });

    return;
  }

  // Default to index.html
  let filePath = req.url === '/' ? '/preview/index.html' : req.url;
  if (!filePath) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }
  filePath = join(projectRoot, filePath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(projectRoot)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(500);
    res.end('Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`\n🎬 Story Preview Server`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
  console.log(`🛠  Editor: http://localhost:${PORT}/preview/editor.html`);
  console.log(`📁 Serving: ${projectRoot}`);
  console.log(`\n💡 Press Ctrl+C to stop\n`);
});
