import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { ITEM_CATALOG } from '../src/game/items/catalog';
import { ASSETS } from '../src/game/assets/manifest';
import {
  ITEM_VISUAL_COVERAGE,
  ITEM_WORLD_VISUAL_GAPS,
  MONSTER_ASSET_REUSE_GROUPS,
  MONSTER_VISUAL_COVERAGE,
  PROP_VISUAL_COVERAGE,
  REGION_VISUAL_COVERAGE,
  VISUAL_COVERAGE_SUMMARY,
  type VisualAssetReference,
} from '../src/game/assets/visualCoverage';

const root = process.cwd();
const publicAssetRoot = resolve(root, 'public/assets');
const outputRoot = resolve(root, 'docs/graphics');
const jsonOutput = resolve(outputRoot, 'visual-coverage.generated.json');
const markdownOutput = resolve(outputRoot, 'VISUAL_COVERAGE_REPORT.md');

const walkFiles = (directory: string): string[] => {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walkFiles(path) : [path];
    })
    .sort();
};

const isAssetReference = (value: unknown): value is VisualAssetReference => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<VisualAssetReference>;
  return typeof candidate.key === 'string' && typeof candidate.path === 'string';
};

const collectAssetReferences = (value: unknown): VisualAssetReference[] => {
  if (isAssetReference(value)) return [value];
  if (!value || typeof value !== 'object') return [];
  return Object.values(value as Record<string, unknown>).flatMap(collectAssetReferences);
};

const publicFiles = walkFiles(publicAssetRoot);
const publicEntries = publicFiles.map((path) => {
  const assetPath = `/assets/${relative(publicAssetRoot, path).replaceAll('\\', '/')}`;
  const stats = statSync(path);
  const domain = assetPath.split('/')[2] ?? 'unknown';
  return { path, assetPath, domain, bytes: stats.size };
});
const publicPathSet = new Set(publicEntries.map((entry) => entry.assetPath));

const managedTextFiles = [
  ...walkFiles(resolve(root, 'src')),
  ...['index.html', 'guide.html', 'public/manifest.webmanifest', 'public/sw.js']
    .map((path) => resolve(root, path))
    .filter(existsSync),
].filter((path) => ['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.webmanifest'].includes(extname(path)))
  // Test fixtures intentionally mention retired and missing paths to assert
  // cleanup behavior. They are not bundled runtime references.
  .filter((path) => !/\.(?:test|spec)\.[^.]+$/.test(path));

const literalAssetPattern = /\/assets\/[A-Za-z0-9_./-]+\.(?:png|webp|jpg|jpeg|svg)/g;
const sourceLiteralPaths = new Set<string>();
for (const path of managedTextFiles) {
  const source = readFileSync(path, 'utf8');
  for (const match of source.matchAll(literalAssetPattern)) sourceLiteralPaths.add(match[0]);
}
const manifestPaths = collectAssetReferences(ASSETS).map((asset) => asset.path);
const itemIconPaths = Object.values(ITEM_CATALOG).map((item) => item.iconPath);
const referencedPaths = new Set([...sourceLiteralPaths, ...manifestPaths, ...itemIconPaths]);
const missingReferencedPaths = [...referencedPaths].filter((path) => !publicPathSet.has(path)).sort();
const unreferencedPublicFiles = publicEntries
  .filter((entry) => !referencedPaths.has(entry.assetPath))
  .map((entry) => ({ path: entry.assetPath, bytes: entry.bytes }));

const domainSummary = Object.values(publicEntries.reduce((summary, entry) => {
  const current = summary[entry.domain] ?? { domain: entry.domain, files: 0, bytes: 0 };
  current.files += 1;
  current.bytes += entry.bytes;
  summary[entry.domain] = current;
  return summary;
}, {} as Record<string, { domain: string; files: number; bytes: number }>))
  .sort((left, right) => right.bytes - left.bytes || left.domain.localeCompare(right.domain));

const contentGroups = new Map<string, Array<{ path: string; bytes: number }>>();
for (const entry of publicEntries) {
  const digest = createHash('sha256').update(readFileSync(entry.path)).digest('hex');
  const group = contentGroups.get(digest) ?? [];
  group.push({ path: entry.assetPath, bytes: entry.bytes });
  contentGroups.set(digest, group);
}
const duplicateContentGroups = [...contentGroups.entries()]
  .filter(([, files]) => files.length > 1)
  .map(([sha256, files]) => ({
    sha256,
    files,
    reclaimableBytes: files.slice(1).reduce((total, file) => total + file.bytes, 0),
  }))
  .sort((left, right) => right.reclaimableBytes - left.reclaimableBytes);

const versionFamily = (assetPath: string): string => assetPath
  .replace(/-v\d+(?=\.[^.]+$)/, '')
  .replace(/\.(png|webp|jpg|jpeg|svg)$/, '');
const versionGroups = new Map<string, Array<{ path: string; bytes: number }>>();
for (const entry of publicEntries) {
  const family = versionFamily(entry.assetPath);
  const group = versionGroups.get(family) ?? [];
  group.push({ path: entry.assetPath, bytes: entry.bytes });
  versionGroups.set(family, group);
}
const versionFamilies = [...versionGroups.entries()]
  .filter(([, files]) => files.length > 1)
  .map(([family, files]) => ({ family, files }))
  .sort((left, right) => right.files.length - left.files.length || left.family.localeCompare(right.family));

const scenePath = resolve(root, 'src/game/phaser/HuntingScene.ts');
const sceneLines = readFileSync(scenePath, 'utf8').split('\n');
const primitivePattern = /this\.add\.(rectangle|ellipse|circle|polygon|graphics)\b/;
const fixedObjectKeyword = /door|crossbar|post|pole|flag|awning|blade|gate|palisade/i;
const renderPrimitiveOccurrences = sceneLines.flatMap((source, index) => {
  const match = source.match(primitivePattern);
  return match ? [{ line: index + 1, primitive: match[1], source: source.trim() }] : [];
});
const fixedObjectCandidates = renderPrimitiveOccurrences.filter((occurrence) =>
  fixedObjectKeyword.test(occurrence.source) && !/shadow/i.test(occurrence.source));

const report = {
  schemaVersion: 1,
  summary: {
    ...VISUAL_COVERAGE_SUMMARY,
    publicAssetFiles: publicEntries.length,
    publicAssetBytes: publicEntries.reduce((total, entry) => total + entry.bytes, 0),
    referencedAssetPaths: referencedPaths.size,
    missingReferencedPaths: missingReferencedPaths.length,
    unreferencedPublicFiles: unreferencedPublicFiles.length,
    duplicateContentGroups: duplicateContentGroups.length,
    duplicateReclaimableBytes: duplicateContentGroups.reduce((total, group) => total + group.reclaimableBytes, 0),
    versionFamilies: versionFamilies.length,
    renderPrimitiveOccurrences: renderPrimitiveOccurrences.length,
    fixedObjectCandidates: fixedObjectCandidates.length,
  },
  domains: domainSummary,
  regions: Object.values(REGION_VISUAL_COVERAGE),
  monsters: Object.values(MONSTER_VISUAL_COVERAGE),
  monsterReuseGroups: MONSTER_ASSET_REUSE_GROUPS,
  items: Object.values(ITEM_VISUAL_COVERAGE),
  itemWorldVisualGaps: ITEM_WORLD_VISUAL_GAPS,
  props: PROP_VISUAL_COVERAGE,
  missingReferencedPaths,
  unreferencedPublicFiles,
  duplicateContentGroups,
  versionFamilies,
  renderPrimitiveOccurrences,
  fixedObjectCandidates,
};

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${bytes}B`;
};

const table = (headers: string[], rows: string[][]): string => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
].join('\n');

const markdown = `# 아스라 그래픽 자동 감사 장부

이 파일은 \`npm run audit:graphics\`로 생성한다. 직접 수정하지 않는다.

## 핵심 기준선

${table(['항목', '현재 값'], [
  ['지역 대응', `${report.summary.regions}개`],
  ['전용 배경 지역', `${report.summary.dedicatedRegionBackgrounds}개`],
  ['모듈 조합 지역', `${report.summary.modularRegionCompositions}개`],
  ['몬스터 종류 / 실제 시각 키', `${report.summary.monsters}종 / ${report.summary.uniqueMonsterAssets}개`],
  ['공유 외형 몬스터', `${report.summary.sharedMonsterKinds}종`],
  ['아이템 / 장착 월드 외형 공백', `${report.summary.items}종 / ${report.summary.itemWorldVisualGaps}종`],
  ['등록된 환경 객체 자산', `${report.summary.propAssetEntries}개`],
  ['배포 자산', `${report.summary.publicAssetFiles}개 · ${formatBytes(report.summary.publicAssetBytes)}`],
  ['미참조 배포 자산', `${report.summary.unreferencedPublicFiles}개`],
  ['동일 내용 중복', `${report.summary.duplicateContentGroups}묶음 · ${formatBytes(report.summary.duplicateReclaimableBytes)} 회수 가능`],
  ['코드 렌더 도형 / 고정 실물 후보', `${report.summary.renderPrimitiveOccurrences}곳 / ${report.summary.fixedObjectCandidates}곳`],
  ['존재하지 않는 참조', `${report.summary.missingReferencedPaths}개`],
])}

## 자산 영역별 용량

${table(['영역', '파일', '용량'], domainSummary.map((domain) => [
  domain.domain,
  String(domain.files),
  formatBytes(domain.bytes),
]))}

## 몬스터 외형 재사용 위험

${table(['시각 키', '공유 수', '몬스터'], MONSTER_ASSET_REUSE_GROUPS.map((group) => [
  group.assetKey,
  String(group.count),
  group.kinds.join(', '),
]))}

## 장착 월드 외형 공백

${table(['아이템', '슬롯', '공백'], ITEM_WORLD_VISUAL_GAPS.map((item) => [
  `${item.name} (${item.id})`,
  item.slot,
  item.reason,
]))}

## 고정 실물로 의심되는 코드 도형

${table(['줄', '도형', '코드'], fixedObjectCandidates.map((candidate) => [
  String(candidate.line),
  candidate.primitive,
  `\`${candidate.source.replaceAll('|', '\\|')}\``,
]))}

## 동일 내용 중복 자산

${duplicateContentGroups.length === 0 ? '- 없음' : duplicateContentGroups.map((group) =>
  `- ${formatBytes(group.reclaimableBytes)}: ${group.files.map((file) => `\`${file.path}\``).join(', ')}`).join('\n')}

## 버전·포맷 중복 계열

${versionFamilies.length === 0 ? '- 없음' : versionFamilies.map((group) =>
  `- \`${group.family}\`: ${group.files.map((file) => `\`${file.path}\``).join(', ')}`).join('\n')}

## 미참조 배포 자산

${unreferencedPublicFiles.length === 0 ? '- 없음' : unreferencedPublicFiles.map((file) =>
  `- \`${file.path}\` (${formatBytes(file.bytes)})`).join('\n')}

## 존재하지 않는 참조

${missingReferencedPaths.length === 0 ? '- 없음' : missingReferencedPaths.map((path) => `- \`${path}\``).join('\n')}
`;

mkdirSync(outputRoot, { recursive: true });
writeFileSync(jsonOutput, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(markdownOutput, markdown);

console.log(JSON.stringify(report.summary, null, 2));
