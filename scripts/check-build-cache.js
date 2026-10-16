// Vymaže Rust build cache (src-tauri/target), pokud byl projekt přesunut do jiné složky.
// Cargo ukládá do cache absolutní cesty; po přesunu projektu pak build selže
// („failed to read plugin permissions … Systém nemůže nalézt uvedenou cestu“).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const targetDir = join(root, 'src-tauri', 'target');
const markerFile = join(targetDir, '.project-root');

const normalize = (p) => p.trim().toLowerCase().replace(/[\\/]+$/, '');

if (existsSync(targetDir)) {
  const recorded = existsSync(markerFile) ? readFileSync(markerFile, 'utf8') : '';
  if (recorded && normalize(recorded) !== normalize(root)) {
    console.log(`Projekt byl přesunut (${recorded.trim()} -> ${root}), mažu zastaralou build cache…`);
    rmSync(targetDir, { recursive: true, force: true });
  }
}

mkdirSync(targetDir, { recursive: true });
writeFileSync(markerFile, root);
