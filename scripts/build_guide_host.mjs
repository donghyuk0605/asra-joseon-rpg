import { copyFile, link, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = join(projectRoot, 'dist');
const outputRoot = join(projectRoot, 'guide-dist');

const linkTree = async (source, destination) => {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const sourcePath = join(source, entry.name);
    const destinationPath = join(destination, entry.name);
    if (entry.isDirectory()) {
      await linkTree(sourcePath, destinationPath);
      continue;
    }
    try {
      await link(sourcePath, destinationPath);
    } catch (error) {
      if (!['EXDEV', 'EPERM', 'EOPNOTSUPP'].includes(error.code)) throw error;
      await copyFile(sourcePath, destinationPath);
    }
  }
};

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await linkTree(join(sourceRoot, 'assets'), join(outputRoot, 'assets'));
await copyFile(join(sourceRoot, 'guide', 'index.html'), join(outputRoot, 'index.html'));

console.log('Prepared guide-dist with the guide page at its hosting root.');
