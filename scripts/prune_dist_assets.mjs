import { copyFile, readFile, readdir, rm, stat } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
let removed = 0;
let reclaimedBytes = 0;

const collectFiles = async (directory, predicate) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(path, predicate));
    } else if (predicate(path)) {
      files.push(path);
    }
  }
  return files;
};

const walk = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (extname(entry.name).toLowerCase() !== '.png') continue;
    const webp = path.slice(0, -4) + '.webp';
    try {
      await stat(webp);
    } catch {
      continue;
    }
    reclaimedBytes += (await stat(path)).size;
    await rm(path);
    removed += 1;
  }
};

await walk(root);

const emittedAssets = join(root, 'assets');
const runtimeTextFiles = [
  ...await collectFiles(root, (path) => path.endsWith('.html')),
  join(root, 'manifest.webmanifest'),
  join(root, 'sw.js'),
  ...(await readdir(emittedAssets))
    .filter((name) => name.endsWith('.js') || name.endsWith('.css'))
    .map((name) => join(emittedAssets, name)),
];
const runtimeText = (await Promise.all(runtimeTextFiles.map((path) => readFile(path, 'utf8')))).join('\n');

const pruneUnreferenced = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await pruneUnreferenced(path);
      continue;
    }
    if (directory === emittedAssets && (entry.name.endsWith('.js') || entry.name.endsWith('.css'))) continue;
    const assetUrl = `/${relative(root, path).split(sep).join('/')}`;
    if (runtimeText.includes(assetUrl)) continue;
    reclaimedBytes += (await stat(path)).size;
    await rm(path);
    removed += 1;
  }
};

await pruneUnreferenced(emittedAssets);

// Keep the last publicly shipped entry names alive for clients that still have
// an older index.html in a browser cache. Firebase rewrites missing assets to
// HTML, which otherwise leaves those clients with an unstyled screen.
const indexHtml = await readFile(join(root, 'index.html'), 'utf8');
const currentScript = indexHtml.match(/\/assets\/(index-[^"'<>]+\.js)/)?.[1];
const currentStyle = indexHtml.match(/\/assets\/(index-[^"'<>]+\.css)/)?.[1];
const legacyEntryAliases = {
  js: ['index-VmUw0mgo.js', 'index-OzYCRni5.js'],
  css: ['index-CwICAx6J.css', 'index-Kco0up0o.css'],
};
if (currentScript) {
  await Promise.all(legacyEntryAliases.js.map((name) => copyFile(join(emittedAssets, currentScript), join(emittedAssets, name))));
}
if (currentStyle) {
  await Promise.all(legacyEntryAliases.css.map((name) => copyFile(join(emittedAssets, currentStyle), join(emittedAssets, name))));
}

console.log(`Pruned ${removed} duplicate or unreferenced assets (${(reclaimedBytes / 1024 / 1024).toFixed(1)} MiB).`);
