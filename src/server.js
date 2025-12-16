import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
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

const MIME_TYPES = {
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
  // Default to index.html
  let filePath = req.url === '/' ? '/preview/index.html' : req.url;
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
  console.log(`📁 Serving: ${projectRoot}`);
  console.log(`\n💡 Press Ctrl+C to stop\n`);
});
