const fs = require('fs');
const path = require('path');
const srcDir = path.join(__dirname, '..');
const outDir = path.join(__dirname, '..', 'out');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const srcPath = path.join(src, name);
    const destPath = path.join(dest, name);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      if (['node_modules', '.git', 'out', 'scripts'].includes(name)) continue;
      copyDir(srcPath, destPath);
    } else if (!['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].includes(name)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
copyDir(srcDir, outDir);
console.log('Static site copied to out/');
