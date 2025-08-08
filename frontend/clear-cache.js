const fs = require('fs');
const path = require('path');

// Clear any potential cache files
const cacheDirs = [
  'node_modules/.vite',
  'node_modules/.cache',
  'dist'
];

cacheDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`Clearing ${dir}...`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

console.log('Cache cleared! Please restart the development server with: npm run dev');
