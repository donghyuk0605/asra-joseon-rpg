import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GameSimulation } from '../src/game/simulation/GameSimulation';
import {
  CAMPAIGN_FIELD_ROUTES,
  fieldExitApproachPoint,
  fieldExitGuidesForRegion,
} from '../src/game/world/fieldRoutes';
import { MAP_HEIGHT, MAP_WIDTH, REGION_ORIGINS } from '../src/game/world/layout';
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

const intentionalOneWayRoutes = new Set([
  'izuhara:busanjin',
  'gyeongbokinner:pyongyanginner',
  'heuksuvillage:jurchenvillage',
  'pyongyanginner:gyeongbokgate',
  'namhansanseong:gyeongbokinner',
  'ganghwado:gyeongbokinner',
]);
const unexpectedUnpairedLocalExits = unpairedLocalExits.filter((exit) => (
  !intentionalOneWayRoutes.has(`${exit.from}:${exit.to}`)
));

const localAdjacency = new Map(regions.map((region) => [region, new Set<RegionId>()]));
for (const region of regions) {
  for (const exit of exitsByRegion[region]) {
    localAdjacency.get(region)?.add(exit.destination);
    localAdjacency.get(exit.destination)?.add(region);
  }
}
const localComponents: RegionId[][] = [];
const pendingRegions = new Set(regions);
while (pendingRegions.size > 0) {
  const start = pendingRegions.values().next().value as RegionId;
  const component: RegionId[] = [];
  const queue = [start];
  pendingRegions.delete(start);
  while (queue.length > 0) {
    const region = queue.shift()!;
    component.push(region);
    for (const neighbor of localAdjacency.get(region) ?? []) {
      if (!pendingRegions.delete(neighbor)) continue;
      queue.push(neighbor);
    }
  }
  localComponents.push(component.sort());
}

const blockedExitApproaches: string[] = [];
const disconnectedExitApproaches: string[] = [];
for (const region of regions) {
  const game = new GameSimulation(region);
  const origin = REGION_ORIGINS[region];
  const collision = game as unknown as {
    isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
  };
  const clear = (x: number, y: number) => collision.isRoutePointClear({
    x: origin.x + x,
    y: origin.y + y,
  }, 20);
  for (const exit of exitsByRegion[region]) {
    const approach = fieldExitApproachPoint(exit);
    const key = `${region}:${exit.destination}:${exit.id}`;
    if (!clear(approach.x, approach.y)) {
      blockedExitApproaches.push(key);
      continue;
    }
    const queue = [approach];
    const seen = new Set([`${Math.round(approach.x / 16)},${Math.round(approach.y / 16)}`]);
    let reachedInterior = approach.x >= 500 && approach.x <= 1036
      && approach.y >= 300 && approach.y <= 724;
    while (queue.length && !reachedInterior) {
      const point = queue.shift()!;
      for (const [dx, dy] of [
        [32, 0], [-32, 0], [0, 32], [0, -32],
        [24, 24], [-24, 24], [24, -24], [-24, -24],
      ]) {
        const x = Math.max(24, Math.min(MAP_WIDTH - 24, point.x + dx));
        const y = Math.max(24, Math.min(MAP_HEIGHT - 24, point.y + dy));
        const pointKey = `${Math.round(x / 16)},${Math.round(y / 16)}`;
        if (seen.has(pointKey) || !clear(x, y)) continue;
        seen.add(pointKey);
        if (x >= 500 && x <= 1036 && y >= 300 && y <= 724) {
          reachedInterior = true;
          break;
        }
        queue.push({ x, y });
      }
    }
    if (!reachedInterior) disconnectedExitApproaches.push(key);
  }
}

const unsafeAtlasArrivals: string[] = [];
const atlasGame = new GameSimulation('village');
atlasGame.enableTravelMode();
const atlasCollision = atlasGame as unknown as {
  isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
};
for (const node of WORLD_MAP_NODES) {
  const result = atlasGame.travelByWorldMap(node.destination);
  if (result !== 'traveled' || !atlasCollision.isRoutePointClear(atlasGame.player, 20)) {
    unsafeAtlasArrivals.push(`${node.id}:${result}`);
  }
}

const blockedOpenCampaignRoutes: string[] = [];
const unsafeCampaignArrivals: string[] = [];
for (const route of CAMPAIGN_FIELD_ROUTES.filter((entry) => !entry.requiresClear)) {
  const game = new GameSimulation(route.region);
  const collision = game as unknown as {
    isRoutePointClear: (point: { x: number; y: number }, bodyRadius: number) => boolean;
  };
  game.travelToCampaignRegion(route.destination, route.entrance);
  const key = `${route.region}:${route.destination}:${route.id}`;
  if (game.region !== route.destination) blockedOpenCampaignRoutes.push(key);
  else if (!collision.isRoutePointClear(game.player, 20)) unsafeCampaignArrivals.push(key);
}

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
  schemaVersion: 2,
  summary: {
    regions: regions.length,
    regionsWithLocalExit: regions.length - regionsWithoutExit.length,
    localExitGuides: exitCount,
    terrainSeams: WORLD_TERRAIN_SEAMS.length,
    ferryConnections: WORLD_TRAVEL_CONNECTIONS.length,
    atlasNodes: WORLD_MAP_NODES.length,
    atlasRoutes: WORLD_MAP_ROUTES.length,
    atlasComponents: atlasComponents.length,
    localComponents: localComponents.length,
    blockedExitApproaches: blockedExitApproaches.length,
    disconnectedExitApproaches: disconnectedExitApproaches.length,
    unsafeAtlasArrivals: unsafeAtlasArrivals.length,
    blockedOpenCampaignRoutes: blockedOpenCampaignRoutes.length,
    unsafeCampaignArrivals: unsafeCampaignArrivals.length,
    unexpectedUnpairedLocalExits: unexpectedUnpairedLocalExits.length,
    ...modeCounts,
  },
  regionsWithoutExit,
  regionsWithoutAtlasNode,
  unpairedLocalExits,
  unexpectedUnpairedLocalExits,
  localComponents,
  blockedExitApproaches,
  disconnectedExitApproaches,
  unsafeAtlasArrivals,
  blockedOpenCampaignRoutes,
  unsafeCampaignArrivals,
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
      approach: { x: exit.approachX, y: exit.approachY },
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
  ['실제 필드 연결 성분', `${report.summary.localComponents}개`],
  ['출구 접근점 충돌 / 내부 단절', `${report.summary.blockedExitApproaches} / ${report.summary.disconnectedExitApproaches}`],
  ['월드맵 / 필드 이동 불안전 도착', `${report.summary.unsafeAtlasArrivals} / ${report.summary.unsafeCampaignArrivals}`],
  ['개방 표시된 이동의 실제 봉쇄', `${report.summary.blockedOpenCampaignRoutes}개`],
  ['로컬 출구 없는 지역', regionsWithoutExit.length ? regionsWithoutExit.join(', ') : '없음'],
])}

## 전구간 이동 안전성

- 81개 지역의 현장 출구 그래프는 ${localComponents.length}개 연결 성분으로 이어진다.
- 모든 출구의 접근 좌표는 충돌이 없고, 32px/24px 결정 그리드에서 필드 내부까지 이동할 수 있다.
- 23개 월드맵 거점과 조건 없이 개방된 모든 현장 표지는 충돌 없는 좌표에 도착한다.
- 스토리상 의도된 단방향 이동을 제외한 예상치 못한 단방향 연결은 ${unexpectedUnpairedLocalExits.length}개다.

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
if (localComponents.length !== 1) {
  throw new Error(`Local field graph is split into ${localComponents.length} disconnected components`);
}
if (unexpectedUnpairedLocalExits.length > 0) {
  throw new Error(`Unexpected one-way routes: ${unexpectedUnpairedLocalExits.map((exit) => `${exit.from}:${exit.to}`).join(', ')}`);
}
if (blockedExitApproaches.length > 0) {
  throw new Error(`Blocked exit approaches: ${blockedExitApproaches.join(', ')}`);
}
if (disconnectedExitApproaches.length > 0) {
  throw new Error(`Exit approaches disconnected from field interior: ${disconnectedExitApproaches.join(', ')}`);
}
if (unsafeAtlasArrivals.length > 0) {
  throw new Error(`Unsafe atlas arrivals: ${unsafeAtlasArrivals.join(', ')}`);
}
if (blockedOpenCampaignRoutes.length > 0) {
  throw new Error(`Open campaign routes are blocked: ${blockedOpenCampaignRoutes.join(', ')}`);
}
if (unsafeCampaignArrivals.length > 0) {
  throw new Error(`Unsafe campaign arrivals: ${unsafeCampaignArrivals.join(', ')}`);
}

console.log(
  `Field connection audit: ${regions.length} regions, ${exitCount} exits, `
  + `${localComponents.length} local component, `
  + `${WORLD_MAP_NODES.length} atlas nodes / ${WORLD_MAP_ROUTES.length} routes.`,
);
