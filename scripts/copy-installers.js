import { cpSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const bundleDir = join(root, 'src-tauri', 'target', 'release', 'bundle');
const installDir = join(root, 'install');

mkdirSync(installDir, { recursive: true });

const extensions = ['.msi', '.exe', '.dmg', '.deb', '.rpm', '.AppImage', '.app.tar.gz'];

function copyInstallers(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      copyInstallers(fullPath);
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      const dest = join(installDir, entry.name);
      cpSync(fullPath, dest);
      console.log(`Copied: ${entry.name} -> install/`);
    }
  }
}

try {
  copyInstallers(bundleDir);
  console.log('Installers copied to install/ directory.');
} catch (e) {
  console.error('Warning: Could not copy installers:', e.message);
}
