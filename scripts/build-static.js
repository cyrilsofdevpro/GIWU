const fs = require('fs');
const path = require('path');
const srcDir = path.join(__dirname, '..');
const distDir = path.join(__dirname, '..', 'dist');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const srcPath = path.join(src, name);
    const destPath = path.join(dest, name);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'scripts'].includes(name)) continue;
      copyDir(srcPath, destPath);
    } else if (!['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].includes(name)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
copyDir(srcDir, distDir);
console.log('Static site copied to dist/');
