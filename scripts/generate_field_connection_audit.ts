import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fieldExitGuidesForRegion } from '../src/game/world/fieldRoutes';
import { REGIONS, type RegionId } from '../src/game/world/regions';
import { WORLD_MAP_NODES, WORLD_MAP_ROUTES } from '../src/game/world/worldMap';
import { WORLD_TERRAIN_SEAMS, WORLD_TRAVEL_CONNECTIONS } from '../src/game/world/worldContinuity';

const regions = Object.keys(REGIONS) as RegionId[];
const exitsByRegion = Object.fromEntries(regions.map((region) => [
  region,
  fieldExitGuidesForRegion(region),
])) as Record<RegionId, ReturnType<typeof fieldExitGuidesForRegion>>;

const exitCount = regions.reduce((total, region) => total + exitsByRegion[region].length, 0);
const modeCounts = regions.flatMap((region) => exitsByRegion[region]).reduce(
  (counts, exit) => ({ ...counts, [exit.mode]: counts[exit.mode] + 1 }),
  { road: 0, ferry: 0, portal: 0 },
);
const regionsWithoutExit = regions.filter((region) => exitsByRegion[region].length === 0);
const atlasNodeByRegion = new Map<RegionId, string>();
for (const node of WORLD_MAP_NODES) {
  for (const region of node.regions) atlasNodeByRegion.set(region, node.id);
}
const regionsWithoutAtlasNode = regions.filter((region) => !atlasNodeByRegion.has(region));

const unpairedLocalExits = regions.flatMap((region) => exitsByRegion[region]
  .filter((exit) => !exitsByRegion[exit.destination]
    .some((candidate) => candidate.destination === region))
  .map((exit) => ({
    from: region,
    to: exit.destination,
    mode: exit.mode,
    requiresClear: exit.requiresClear,
  })));

const atlasAdjacency = new Map(WORLD_MAP_NODES.map((node) => [node.id, new Set<string>()]));
for (const route of WORLD_MAP_ROUTES) {
  atlasAdjacency.get(route.from)?.add(route.to);
  atlasAdjacency.get(route.to)?.add(route.from);
}
const atlasComponents: string[][] = [];
const pendingNodes = new Set(atlasAdjacency.keys());
while (pendingNodes.size > 0) {
  const start = pendingNodes.values().next().value as string;
  const component: string[] = [];
  const queue = [start];
  pendingNodes.delete(start);
  while (queue.length > 0) {
    const node = queue.shift()!;
    component.push(node);
    for (const neighbor of atlasAdjacency.get(node) ?? []) {
      if (!pendingNodes.delete(neighbor)) continue;
      queue.push(neighbor);
    }
  }
  atlasComponents.push(component.sort());
}

const report = {
  schemaVersion: 1,
  summary: {
    regions: regions.length,
    regionsWithLocalExit: regions.length - regionsWithoutExit.length,
    localExitGuides: exitCount,
    terrainSeams: WORLD_TERRAIN_SEAMS.length,
    ferryConnections: WORLD_TRAVEL_CONNECTIONS.length,
    atlasNodes: WORLD_MAP_NODES.length,
    atlasRoutes: WORLD_MAP_ROUTES.length,
    atlasComponents: atlasComponents.length,
    ...modeCounts,
  },
  regionsWithoutExit,
  regionsWithoutAtlasNode,
  unpairedLocalExits,
  atlasComponents,
  regions: regions.map((region) => ({
    id: region,
    name: REGIONS[region].name,
    atlasNode: atlasNodeByRegion.get(region) ?? null,
    exits: exitsByRegion[region].map((exit) => ({
      destination: exit.destination,
      destinationName: REGIONS[exit.destination].name,
      edge: exit.edge,
      mode: exit.mode,
      requiresClear: exit.requiresClear,
    })),
  })),
};

const table = (headers: string[], rows: string[][]): string => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
].join('\n');

const modeLabel = { road: '도보', ferry: '선박', portal: '전환' } as const;
const markdown = `# 필드·도시 연결 자동 감사 장부

이 파일은 \`npm run audit:routes\`로 생성한다. 직접 수정하지 않는다.

## 핵심 기준선

${table(['항목', '현재 값'], [
  ['전체 지역 / 로컬 출구 보유', `${report.summary.regions} / ${report.summary.regionsWithLocalExit}`],
  ['로컬 출구 안내', `${report.summary.localExitGuides}개`],
  ['도보 / 선박 / 장면 전환', `${report.summary.road} / ${report.summary.ferry} / ${report.summary.portal}`],
  ['연속 지형 이음새', `${report.summary.terrainSeams}개`],
  ['물리 선박 연결', `${report.summary.ferryConnections}개`],
  ['월드맵 거점 / 노선', `${report.summary.atlasNodes} / ${report.summary.atlasRoutes}`],
  ['월드맵 연결 성분', `${report.summary.atlasComponents}개`],
  ['로컬 출구 없는 지역', regionsWithoutExit.length ? regionsWithoutExit.join(', ') : '없음'],
])}

## 지역별 실제 출구

${table(['지역', '월드맵 거점', '실제 출구'], report.regions.map((region) => [
  `${region.name} (${region.id})`,
  region.atlasNode ?? '미등록',
  region.exits.map((exit) => (
    `${exit.destinationName} · ${modeLabel[exit.mode]}${exit.requiresClear ? ' · 조건부' : ''}`
  )).join('<br>') || '없음',
]))}

## 단방향 로컬 연결

스토리 진입, 전투 완료 귀환, 월드맵 이동처럼 의도된 장면 전환을 포함한다. 새 항목이 생기면 실제 왕복 필요 여부를 검토한다.

${unpairedLocalExits.length
    ? table(['출발', '도착', '방식', '조건'], unpairedLocalExits.map((exit) => [
      `${REGIONS[exit.from].name} (${exit.from})`,
      `${REGIONS[exit.to].name} (${exit.to})`,
      modeLabel[exit.mode],
      exit.requiresClear ? '완료 조건' : '-',
    ]))
    : '없음'}
`;

const outputRoot = resolve(process.cwd(), 'docs/maps');
mkdirSync(outputRoot, { recursive: true });
writeFileSync(resolve(outputRoot, 'field-connections.generated.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(resolve(outputRoot, 'FIELD_CONNECTION_AUDIT.md'), markdown);

if (regionsWithoutExit.length > 0) {
  throw new Error(`Local exits missing: ${regionsWithoutExit.join(', ')}`);
}
if (atlasComponents.length !== 1) {
  throw new Error(`World map is split into ${atlasComponents.length} disconnected components`);
}

console.log(
  `Field connection audit: ${regions.length} regions, ${exitCount} exits, `
  + `${WORLD_MAP_NODES.length} atlas nodes / ${WORLD_MAP_ROUTES.length} routes.`,
);
