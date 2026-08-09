# 아스라 그래픽 자동 감사 장부

이 파일은 `npm run audit:graphics`로 생성한다. 직접 수정하지 않는다.

## 핵심 기준선

| 항목 | 현재 값 |
| --- | --- |
| 지역 대응 | 81개 |
| 전용 배경 지역 | 46개 |
| 모듈 조합 지역 | 35개 |
| 몬스터 종류 / 실제 시각 키 | 61종 / 38개 |
| 공유 외형 몬스터 | 34종 |
| 아이템 / 장착 월드 외형 공백 | 60종 / 0종 |
| 등록된 환경 객체 자산 | 34개 |
| 배포 자산 | 501개 · 311.0MB |
| 미참조 배포 자산 | 132개 |
| 동일 내용 중복 | 3묶음 · 50.1KB 회수 가능 |
| 코드 렌더 도형 / 고정 실물 후보 | 130곳 / 0곳 |
| 존재하지 않는 참조 | 0개 |

## 자산 영역별 용량

| 영역 | 파일 | 용량 |
| --- | --- | --- |
| environment | 203 | 173.4MB |
| characters | 86 | 50.1MB |
| monsters | 34 | 36.7MB |
| ui | 46 | 31.0MB |
| bosses | 11 | 14.1MB |
| items | 77 | 3.1MB |
| fx | 4 | 1.2MB |
| charms | 14 | 863.9KB |
| weapons | 26 | 495.9KB |

## 몬스터 외형 재사용 위험

| 시각 키 | 공유 수 | 몬스터 |
| --- | --- | --- |
| ulleung-guard-actions-v1 | 6 | ulleung-guard, ulleung-executioner, yeongwol-swordsman, jeonju-swordsman, joseon-border-swordsman, royal-guard |
| japanese-swordsman-actions-v1 | 4 | osaka-overseer, osaka-ronin, wako-raider, japanese-swordsman |
| joseon-archer-actions-v1 | 4 | ulleung-archer, yeongwol-archer, jeonju-archer, joseon-border-archer |
| joseon-pododaejang-actions-v1 | 4 | ulleung-captain, yeongwol-commander, jeonju-commander, joseon-border-commander |
| joseon-spearman-actions-v1 | 4 | ulleung-veteran, yeongwol-spearman, jeonju-spearman, joseon-border-spearman |
| boar-actions | 2 | japanese-wild-boar, boar |
| japanese-archer-actions-v1 | 2 | wako-archer, japanese-archer |
| japanese-general-actions-v1 | 2 | wako-captain, japanese-general |
| japanese-gunner-actions-v1 | 2 | osaka-gunner, japanese-gunner |
| joseon-shield-guard-actions-v1 | 2 | yeongwol-shield, jeonju-shield |
| ulleung-water-deer-actions-v1 | 2 | ulleung-water-deer, japanese-sika-deer |

## 장착 월드 외형 공백

| 아이템 | 슬롯 | 공백 |
| --- | --- | --- |

## 고정 실물로 의심되는 코드 도형

| 줄 | 도형 | 코드 |
| --- | --- | --- |

## 동일 내용 중복 자산

- 17.7KB: `/assets/items/frost-hwando-v1.png`, `/assets/weapons/frost-hwando-world-v1.png`
- 17.3KB: `/assets/items/storm-hwando-v1.png`, `/assets/weapons/storm-hwando-world-v1.png`
- 15.2KB: `/assets/items/ember-hwando-v1.png`, `/assets/weapons/ember-hwando-world-v1.png`

## 버전·포맷 중복 계열

- `/assets/characters/joseon-hero-base-body`: `/assets/characters/joseon-hero-base-body-v4.png`, `/assets/characters/joseon-hero-base-body-v5.png`, `/assets/characters/joseon-hero-base-body-v6.png`, `/assets/characters/joseon-hero-base-body-v7.png`, `/assets/characters/joseon-hero-base-body-v8.png`
- `/assets/characters/joseon-hero-hunter-weapon-ready-layer`: `/assets/characters/joseon-hero-hunter-weapon-ready-layer-v1.png`, `/assets/characters/joseon-hero-hunter-weapon-ready-layer-v1.webp`, `/assets/characters/joseon-hero-hunter-weapon-ready-layer-v2.png`, `/assets/characters/joseon-hero-hunter-weapon-ready-layer-v2.webp`, `/assets/characters/joseon-hero-hunter-weapon-ready-layer-v3.png`
- `/assets/characters/joseon-hero-warden-weapon-ready-layer`: `/assets/characters/joseon-hero-warden-weapon-ready-layer-v1.png`, `/assets/characters/joseon-hero-warden-weapon-ready-layer-v1.webp`, `/assets/characters/joseon-hero-warden-weapon-ready-layer-v2.png`, `/assets/characters/joseon-hero-warden-weapon-ready-layer-v2.webp`, `/assets/characters/joseon-hero-warden-weapon-ready-layer-v3.png`
- `/assets/characters/joseon-hero-weapon-ready-body`: `/assets/characters/joseon-hero-weapon-ready-body-v1.png`, `/assets/characters/joseon-hero-weapon-ready-body-v1.webp`, `/assets/characters/joseon-hero-weapon-ready-body-v2.png`, `/assets/characters/joseon-hero-weapon-ready-body-v2.webp`, `/assets/characters/joseon-hero-weapon-ready-body-v3.png`
- `/assets/characters/joseon-hero-armor-layer`: `/assets/characters/joseon-hero-armor-layer-v1.png`, `/assets/characters/joseon-hero-armor-layer-v2.png`, `/assets/characters/joseon-hero-armor-layer-v3.png`, `/assets/characters/joseon-hero-armor-layer-v4.png`
- `/assets/characters/joseon-hero-tiger-pelt-weapon-ready-layer`: `/assets/characters/joseon-hero-tiger-pelt-weapon-ready-layer-v1.png`, `/assets/characters/joseon-hero-tiger-pelt-weapon-ready-layer-v2.png`, `/assets/characters/joseon-hero-tiger-pelt-weapon-ready-layer-v2.webp`, `/assets/characters/joseon-hero-tiger-pelt-weapon-ready-layer-v3.png`
- `/assets/environment/props/joseon-farm-plot-stages`: `/assets/environment/props/joseon-farm-plot-stages-v1.png`, `/assets/environment/props/joseon-farm-plot-stages-v2.png`, `/assets/environment/props/joseon-farm-plot-stages-v3.png`, `/assets/environment/props/joseon-farm-plot-stages-v4.png`
- `/assets/environment/ulleung-government-district`: `/assets/environment/ulleung-government-district-v1.png`, `/assets/environment/ulleung-government-district-v2.png`, `/assets/environment/ulleung-government-district-v3.png`, `/assets/environment/ulleung-government-district-v3.webp`
- `/assets/environment/generated/gangneung-gyeongpo`: `/assets/environment/generated/gangneung-gyeongpo-v1.webp`, `/assets/environment/generated/gangneung-gyeongpo-v2.webp`, `/assets/environment/generated/gangneung-gyeongpo-v3.webp`
- `/assets/environment/generated/geoje-naval-strait`: `/assets/environment/generated/geoje-naval-strait-v1.webp`, `/assets/environment/generated/geoje-naval-strait-v2.webp`, `/assets/environment/generated/geoje-naval-strait-v3.webp`
- `/assets/environment/generated/haeju-saltfield`: `/assets/environment/generated/haeju-saltfield-v1.webp`, `/assets/environment/generated/haeju-saltfield-v2.webp`, `/assets/environment/generated/haeju-saltfield-v3.webp`
- `/assets/environment/generated/wonju-chiaksan`: `/assets/environment/generated/wonju-chiaksan-v1.webp`, `/assets/environment/generated/wonju-chiaksan-v2.webp`, `/assets/environment/generated/wonju-chiaksan-v3.webp`
- `/assets/characters/joseon-gwanghae-actions`: `/assets/characters/joseon-gwanghae-actions-v1.png`, `/assets/characters/joseon-gwanghae-actions-v2.png`
- `/assets/characters/joseon-hero-armor-only`: `/assets/characters/joseon-hero-armor-only-v2.png`, `/assets/characters/joseon-hero-armor-only-v3.png`
- `/assets/characters/joseon-hero-fully-equipped`: `/assets/characters/joseon-hero-fully-equipped-v2.png`, `/assets/characters/joseon-hero-fully-equipped-v3.png`
- `/assets/characters/joseon-hero-hunter-weapon-attack-layer`: `/assets/characters/joseon-hero-hunter-weapon-attack-layer-v1.png`, `/assets/characters/joseon-hero-hunter-weapon-attack-layer-v1.webp`
- `/assets/characters/joseon-hero-tiger-pelt-layer`: `/assets/characters/joseon-hero-tiger-pelt-layer-v1.png`, `/assets/characters/joseon-hero-tiger-pelt-layer-v2.png`
- `/assets/characters/joseon-hero-unequipped`: `/assets/characters/joseon-hero-unequipped-v2.png`, `/assets/characters/joseon-hero-unequipped-v3.png`
- `/assets/characters/joseon-hero-warden-layer`: `/assets/characters/joseon-hero-warden-layer-v1.png`, `/assets/characters/joseon-hero-warden-layer-v2.png`
- `/assets/characters/joseon-hero-warden-weapon-attack-layer`: `/assets/characters/joseon-hero-warden-weapon-attack-layer-v1.png`, `/assets/characters/joseon-hero-warden-weapon-attack-layer-v1.webp`
- `/assets/characters/joseon-hero-weapon-attack-body`: `/assets/characters/joseon-hero-weapon-attack-body-v1.png`, `/assets/characters/joseon-hero-weapon-attack-body-v1.webp`
- `/assets/characters/joseon-hero-weapon-only`: `/assets/characters/joseon-hero-weapon-only-v2.png`, `/assets/characters/joseon-hero-weapon-only-v3.png`
- `/assets/environment/beta/beta-roadside-props`: `/assets/environment/beta/beta-roadside-props-v1.png`, `/assets/environment/beta/beta-roadside-props-v1.webp`
- `/assets/environment/campaign/busanjin-siege`: `/assets/environment/campaign/busanjin-siege-v1.webp`, `/assets/environment/campaign/busanjin-siege-v2.webp`
- `/assets/environment/campaign/changdeokgung-audience`: `/assets/environment/campaign/changdeokgung-audience-v1.webp`, `/assets/environment/campaign/changdeokgung-audience-v2.webp`
- `/assets/environment/campaign/hanseong-sungnyemun`: `/assets/environment/campaign/hanseong-sungnyemun-v1.webp`, `/assets/environment/campaign/hanseong-sungnyemun-v2.webp`
- `/assets/environment/campaign/previews/changdeokgung-audience-preview`: `/assets/environment/campaign/previews/changdeokgung-audience-preview-v1.webp`, `/assets/environment/campaign/previews/changdeokgung-audience-preview-v2.webp`
- `/assets/environment/campaign/previews/hanseong-sungnyemun-preview`: `/assets/environment/campaign/previews/hanseong-sungnyemun-preview-v1.webp`, `/assets/environment/campaign/previews/hanseong-sungnyemun-preview-v2.webp`
- `/assets/environment/jeonju-castle-town`: `/assets/environment/jeonju-castle-town-v1.png`, `/assets/environment/jeonju-castle-town-v1.webp`
- `/assets/environment/jeonju-pungnam-gate`: `/assets/environment/jeonju-pungnam-gate-v1.png`, `/assets/environment/jeonju-pungnam-gate-v1.webp`
- `/assets/environment/jeonju-wansan-field`: `/assets/environment/jeonju-wansan-field-v1.png`, `/assets/environment/jeonju-wansan-field-v1.webp`
- `/assets/environment/mistwood-village-feathered`: `/assets/environment/mistwood-village-feathered-v2.png`, `/assets/environment/mistwood-village-feathered-v2.webp`
- `/assets/environment/moonshadow-ridge`: `/assets/environment/moonshadow-ridge.png`, `/assets/environment/moonshadow-ridge.webp`
- `/assets/environment/moonshadow-village-world`: `/assets/environment/moonshadow-village-world-v1.png`, `/assets/environment/moonshadow-village-world-v1.webp`
- `/assets/environment/muyeong-dungeon-base`: `/assets/environment/muyeong-dungeon-base-v1.png`, `/assets/environment/muyeong-dungeon-base-v1.webp`
- `/assets/environment/props/episode2-joseon-village-prop-atlas`: `/assets/environment/props/episode2-joseon-village-prop-atlas-v1.png`, `/assets/environment/props/episode2-joseon-village-prop-atlas-v2.png`
- `/assets/environment/props/ulleung-prison-gate`: `/assets/environment/props/ulleung-prison-gate-v1.png`, `/assets/environment/props/ulleung-prison-gate-v2.png`
- `/assets/environment/props/ulleung-training-pine`: `/assets/environment/props/ulleung-training-pine-v1.png`, `/assets/environment/props/ulleung-training-pine-v2.png`
- `/assets/environment/props/world-seam-road-atlas`: `/assets/environment/props/world-seam-road-atlas-v3.png`, `/assets/environment/props/world-seam-road-atlas-v4.png`
- `/assets/environment/tiles/japan-ground-tile`: `/assets/environment/tiles/japan-ground-tile-v1.webp`, `/assets/environment/tiles/japan-ground-tile-v2.webp`
- `/assets/environment/tiles/northern-ground-tile`: `/assets/environment/tiles/northern-ground-tile-v1.webp`, `/assets/environment/tiles/northern-ground-tile-v2.webp`
- `/assets/environment/ulleung-coast-meadow-blend`: `/assets/environment/ulleung-coast-meadow-blend-v2.webp`, `/assets/environment/ulleung-coast-meadow-blend-v3.webp`
- `/assets/environment/ulleung-coastal-forest`: `/assets/environment/ulleung-coastal-forest-v1.png`, `/assets/environment/ulleung-coastal-forest-v1.webp`
- `/assets/environment/ulleung-highland-ridge`: `/assets/environment/ulleung-highland-ridge-v1.png`, `/assets/environment/ulleung-highland-ridge-v1.webp`
- `/assets/environment/ulleung-hunt-ridge-blend`: `/assets/environment/ulleung-hunt-ridge-blend-v2.webp`, `/assets/environment/ulleung-hunt-ridge-blend-v3.webp`
- `/assets/environment/ulleung-meadow-hunt-blend`: `/assets/environment/ulleung-meadow-hunt-blend-v2.webp`, `/assets/environment/ulleung-meadow-hunt-blend-v3.webp`
- `/assets/environment/ulleung-prison-government-blend`: `/assets/environment/ulleung-prison-government-blend-v2.webp`, `/assets/environment/ulleung-prison-government-blend-v3.webp`
- `/assets/environment/ulleung-raided-village`: `/assets/environment/ulleung-raided-village-v2.png`, `/assets/environment/ulleung-raided-village-v2.webp`
- `/assets/environment/ulleung-ridge-prison-blend`: `/assets/environment/ulleung-ridge-prison-blend-v2.webp`, `/assets/environment/ulleung-ridge-prison-blend-v3.webp`
- `/assets/environment/ulleungdo-prison-gates-aligned`: `/assets/environment/ulleungdo-prison-gates-aligned-v2.png`, `/assets/environment/ulleungdo-prison-gates-aligned-v2.webp`
- `/assets/environment/village-minepass-feathered`: `/assets/environment/village-minepass-feathered-v2.png`, `/assets/environment/village-minepass-feathered-v2.webp`
- `/assets/environment/village-moonfield-feathered`: `/assets/environment/village-moonfield-feathered-v2.png`, `/assets/environment/village-moonfield-feathered-v2.webp`
- `/assets/environment/yeongwol-command-headquarters`: `/assets/environment/yeongwol-command-headquarters-v1.png`, `/assets/environment/yeongwol-command-headquarters-v1.webp`
- `/assets/environment/yeongwol-training-yard`: `/assets/environment/yeongwol-training-yard-v1.png`, `/assets/environment/yeongwol-training-yard-v1.webp`
- `/assets/items/bear-claw-gauntlet`: `/assets/items/bear-claw-gauntlet-v1.svg`, `/assets/items/bear-claw-gauntlet-v2.png`
- `/assets/items/boar-tusk-charm`: `/assets/items/boar-tusk-charm-v3.png`, `/assets/items/boar-tusk-charm-v4.png`
- `/assets/items/chiaksan-claw-knife`: `/assets/items/chiaksan-claw-knife-v1.svg`, `/assets/items/chiaksan-claw-knife-v2.png`
- `/assets/items/coastal-scout-coat`: `/assets/items/coastal-scout-coat-v1.svg`, `/assets/items/coastal-scout-coat-v2.png`
- `/assets/items/crane-feather-talisman`: `/assets/items/crane-feather-talisman-v1.svg`, `/assets/items/crane-feather-talisman-v2.png`
- `/assets/items/crane-quill-bundle`: `/assets/items/crane-quill-bundle-v1.svg`, `/assets/items/crane-quill-bundle-v2.png`
- `/assets/items/dokkaebi-club`: `/assets/items/dokkaebi-club-v3.png`, `/assets/items/dokkaebi-club-v4.png`
- `/assets/items/gangneung-sea-bow`: `/assets/items/gangneung-sea-bow-v1.svg`, `/assets/items/gangneung-sea-bow-v2.png`
- `/assets/items/geoje-anchor-hwando`: `/assets/items/geoje-anchor-hwando-v1.svg`, `/assets/items/geoje-anchor-hwando-v2.png`
- `/assets/items/haeju-reed-cape`: `/assets/items/haeju-reed-cape-v1.svg`, `/assets/items/haeju-reed-cape-v2.png`
- `/assets/items/haetae-ward-charm`: `/assets/items/haetae-ward-charm-v1.svg`, `/assets/items/haetae-ward-charm-v2.png`
- `/assets/items/hunter-durumagi`: `/assets/items/hunter-durumagi-v3.png`, `/assets/items/hunter-durumagi-v4.png`
- `/assets/items/naval-signal-seal`: `/assets/items/naval-signal-seal-v1.svg`, `/assets/items/naval-signal-seal-v2.png`
- `/assets/items/pine-resin-torch`: `/assets/items/pine-resin-torch-v1.svg`, `/assets/items/pine-resin-torch-v2.png`
- `/assets/items/salt-crystal-bundle`: `/assets/items/salt-crystal-bundle-v1.svg`, `/assets/items/salt-crystal-bundle-v2.png`
- `/assets/items/saltfield-ritual-knife`: `/assets/items/saltfield-ritual-knife-v1.svg`, `/assets/items/saltfield-ritual-knife-v2.png`
- `/assets/items/sea-salt-amulet`: `/assets/items/sea-salt-amulet-v1.svg`, `/assets/items/sea-salt-amulet-v2.png`
- `/assets/items/worn-hwando`: `/assets/items/worn-hwando-v3.png`, `/assets/items/worn-hwando-v4.png`
- `/assets/ui/asra-title-keyart`: `/assets/ui/asra-title-keyart-v1.png`, `/assets/ui/asra-title-keyart-v1.webp`
- `/assets/ui/asra-title-keyart-mobile`: `/assets/ui/asra-title-keyart-mobile-v1.png`, `/assets/ui/asra-title-keyart-mobile-v1.webp`
- `/assets/ui/beta/beta-campaign-keyart`: `/assets/ui/beta/beta-campaign-keyart-v1.png`, `/assets/ui/beta/beta-campaign-keyart-v1.webp`
- `/assets/ui/beta/beta-panel-material`: `/assets/ui/beta/beta-panel-material-v1.png`, `/assets/ui/beta/beta-panel-material-v1.webp`
- `/assets/ui/wolyeongrok-loading-frame`: `/assets/ui/wolyeongrok-loading-frame-v1.png`, `/assets/ui/wolyeongrok-loading-frame-v1.webp`
- `/assets/ui/wolyeongrok-title-logo`: `/assets/ui/wolyeongrok-title-logo-v1.png`, `/assets/ui/wolyeongrok-title-logo-v1.webp`
- `/assets/ui/yeonhwa-portrait`: `/assets/ui/yeonhwa-portrait-v1.png`, `/assets/ui/yeonhwa-portrait-v1.webp`

## 미참조 배포 자산

- `/assets/characters/harlan-frontier-archer-actions-v1.png` (739.1KB)
- `/assets/characters/joseon-gwanghae-actions-v1.png` (809.7KB)
- `/assets/characters/joseon-hero-armor-layer-v1.png` (479.3KB)
- `/assets/characters/joseon-hero-armor-layer-v2.png` (386.6KB)
- `/assets/characters/joseon-hero-armor-layer-v3.png` (529.3KB)
- `/assets/characters/joseon-hero-armor-only-v2.png` (822.9KB)
- `/assets/characters/joseon-hero-base-body-v4.png` (870.7KB)
- `/assets/characters/joseon-hero-base-body-v5.png` (820.1KB)
- `/assets/characters/joseon-hero-base-body-v6.png` (885.1KB)
- `/assets/characters/joseon-hero-base-body-v7.png` (922.8KB)
- `/assets/characters/joseon-hero-fully-equipped-v2.png` (858.5KB)
- `/assets/characters/joseon-hero-hunter-weapon-attack-layer-v1.png` (538.3KB)
- `/assets/characters/joseon-hero-hunter-weapon-ready-layer-v1.png` (548.0KB)
- `/assets/characters/joseon-hero-hunter-weapon-ready-layer-v1.webp` (170.7KB)
- `/assets/characters/joseon-hero-hunter-weapon-ready-layer-v2.png` (569.6KB)
- `/assets/characters/joseon-hero-hunter-weapon-ready-layer-v2.webp` (402.0KB)
- `/assets/characters/joseon-hero-tiger-pelt-layer-v1.png` (447.6KB)
- `/assets/characters/joseon-hero-tiger-pelt-weapon-ready-layer-v1.png` (462.6KB)
- `/assets/characters/joseon-hero-tiger-pelt-weapon-ready-layer-v2.png` (483.9KB)
- `/assets/characters/joseon-hero-tiger-pelt-weapon-ready-layer-v2.webp` (333.8KB)
- `/assets/characters/joseon-hero-unequipped-v2.png` (841.0KB)
- `/assets/characters/joseon-hero-unequipped-v3.png` (854.5KB)
- `/assets/characters/joseon-hero-warden-layer-v1.png` (547.6KB)
- `/assets/characters/joseon-hero-warden-weapon-attack-layer-v1.png` (558.4KB)
- `/assets/characters/joseon-hero-warden-weapon-ready-layer-v1.png` (571.0KB)
- `/assets/characters/joseon-hero-warden-weapon-ready-layer-v1.webp` (177.8KB)
- `/assets/characters/joseon-hero-warden-weapon-ready-layer-v2.png` (587.9KB)
- `/assets/characters/joseon-hero-warden-weapon-ready-layer-v2.webp` (414.6KB)
- `/assets/characters/joseon-hero-weapon-attack-body-v1.png` (897.4KB)
- `/assets/characters/joseon-hero-weapon-only-v2.png` (710.1KB)
- `/assets/characters/joseon-hero-weapon-only-v3.png` (724.8KB)
- `/assets/characters/joseon-hero-weapon-ready-body-v1.png` (911.6KB)
- `/assets/characters/joseon-hero-weapon-ready-body-v1.webp` (302.4KB)
- `/assets/characters/joseon-hero-weapon-ready-body-v2.png` (950.4KB)
- `/assets/characters/joseon-hero-weapon-ready-body-v2.webp` (718.3KB)
- `/assets/environment/beta/beta-roadside-props-v1.png` (1.6MB)
- `/assets/environment/campaign/busanjin-siege-v1.webp` (360.0KB)
- `/assets/environment/campaign/changdeokgung-audience-v1.webp` (295.3KB)
- `/assets/environment/campaign/gyeongbok-royal-garden-v1.webp` (307.4KB)
- `/assets/environment/campaign/gyeongbok-sinmumun-v1.webp` (379.7KB)
- `/assets/environment/campaign/hanseong-sungnyemun-v1.webp` (356.8KB)
- `/assets/environment/campaign/joseon-post-road-seam-v1.webp` (93.8KB)
- `/assets/environment/campaign/previews/changdeokgung-audience-preview-v1.webp` (9.0KB)
- `/assets/environment/campaign/previews/hanseong-sungnyemun-preview-v1.webp` (13.4KB)
- `/assets/environment/campaign/samjeondo-humiliation-v1.webp` (426.2KB)
- `/assets/environment/generated/gangneung-gyeongpo-v1.webp` (335.9KB)
- `/assets/environment/generated/gangneung-gyeongpo-v2.webp` (501.8KB)
- `/assets/environment/generated/geoje-naval-strait-v1.webp` (268.8KB)
- `/assets/environment/generated/geoje-naval-strait-v2.webp` (509.2KB)
- `/assets/environment/generated/haeju-saltfield-v1.webp` (303.0KB)
- `/assets/environment/generated/haeju-saltfield-v2.webp` (507.9KB)
- `/assets/environment/generated/wonju-chiaksan-v1.webp` (324.1KB)
- `/assets/environment/generated/wonju-chiaksan-v2.webp` (498.9KB)
- `/assets/environment/jeonju-castle-town-v1.png` (3.4MB)
- `/assets/environment/jeonju-pungnam-gate-v1.png` (3.1MB)
- `/assets/environment/jeonju-wansan-field-v1.png` (3.2MB)
- `/assets/environment/mistwood-village-feathered-v2.png` (3.1MB)
- `/assets/environment/mistwood-village-transition-v1.png` (3.2MB)
- `/assets/environment/moonshadow-ridge.png` (3.2MB)
- `/assets/environment/moonshadow-village-world-v1.png` (5.2MB)
- `/assets/environment/muyeong-dungeon-base-v1.png` (2.7MB)
- `/assets/environment/props/episode2-joseon-village-prop-atlas-v1.png` (2.2MB)
- `/assets/environment/props/joseon-farm-plot-stages-v1.png` (1.4MB)
- `/assets/environment/props/joseon-farm-plot-stages-v2.png` (818.7KB)
- `/assets/environment/props/joseon-farm-plot-stages-v3.png` (828.6KB)
- `/assets/environment/props/ulleung-government-office-v1.png` (2.4MB)
- `/assets/environment/props/ulleung-prison-gate-v1.png` (1.8MB)
- `/assets/environment/props/ulleung-prison-gate-v2.png` (851.4KB)
- `/assets/environment/props/ulleung-training-pine-v1.png` (1.2MB)
- `/assets/environment/props/world-seam-road-atlas-v3.png` (1.8MB)
- `/assets/environment/props/yeongwol-structure-props-v1.png` (1.3MB)
- `/assets/environment/tiles/japan-ground-tile-v1.webp` (59.8KB)
- `/assets/environment/tiles/northern-ground-tile-v1.webp` (76.6KB)
- `/assets/environment/ulleung-coast-hunt-seam-v1.webp` (182.7KB)
- `/assets/environment/ulleung-coast-meadow-blend-v2.webp` (559.8KB)
- `/assets/environment/ulleung-coast-meadow-seam-v1.webp` (228.1KB)
- `/assets/environment/ulleung-coastal-forest-v1.png` (3.2MB)
- `/assets/environment/ulleung-coastal-training-ground-v1.png` (2.9MB)
- `/assets/environment/ulleung-government-district-v1.png` (3.2MB)
- `/assets/environment/ulleung-government-district-v2.png` (3.5MB)
- `/assets/environment/ulleung-government-district-v3.png` (3.5MB)
- `/assets/environment/ulleung-highland-ridge-v1.png` (3.3MB)
- `/assets/environment/ulleung-hunt-ridge-blend-v2.webp` (480.8KB)
- `/assets/environment/ulleung-hunt-ridge-seam-v1.webp` (213.7KB)
- `/assets/environment/ulleung-meadow-hunt-blend-v2.webp` (521.1KB)
- `/assets/environment/ulleung-meadow-hunt-seam-v1.webp` (232.6KB)
- `/assets/environment/ulleung-prison-government-blend-v2.webp` (477.8KB)
- `/assets/environment/ulleung-prison-government-seam-v1.webp` (190.4KB)
- `/assets/environment/ulleung-raided-village-v2.png` (3.4MB)
- `/assets/environment/ulleung-ridge-prison-blend-v2.webp` (498.7KB)
- `/assets/environment/ulleung-ridge-prison-seam-v1.webp` (179.6KB)
- `/assets/environment/ulleungdo-prison-coast-v1.png` (4.2MB)
- `/assets/environment/ulleungdo-prison-gates-aligned-v2.png` (2.9MB)
- `/assets/environment/ulleungdo-raided-village-v1.png` (3.3MB)
- `/assets/environment/village-minepass-feathered-v2.png` (2.9MB)
- `/assets/environment/village-minepass-transition-v1.png` (3.0MB)
- `/assets/environment/village-moonfield-feathered-v2.png` (3.1MB)
- `/assets/environment/village-moonfield-transition-v1.png` (3.2MB)
- `/assets/environment/yeongwol-command-headquarters-v1.png` (2.9MB)
- `/assets/environment/yeongwol-grand-government-v1.png` (3.2MB)
- `/assets/environment/yeongwol-training-yard-v1.png` (3.2MB)
- `/assets/items/bear-claw-gauntlet-v1.svg` (1008B)
- `/assets/items/boar-tusk-charm-v3.png` (45.2KB)
- `/assets/items/chiaksan-claw-knife-v1.svg` (1.0KB)
- `/assets/items/coastal-scout-coat-v1.svg` (816B)
- `/assets/items/crane-feather-talisman-v1.svg` (883B)
- `/assets/items/crane-quill-bundle-v1.svg` (603B)
- `/assets/items/dokkaebi-club-v3.png` (37.4KB)
- `/assets/items/gangneung-sea-bow-v1.svg` (895B)
- `/assets/items/geoje-anchor-hwando-v1.svg` (867B)
- `/assets/items/haeju-reed-cape-v1.svg` (766B)
- `/assets/items/haetae-ward-charm-v1.svg` (1008B)
- `/assets/items/hunter-durumagi-v3.png` (62.8KB)
- `/assets/items/naval-signal-seal-v1.svg` (607B)
- `/assets/items/pine-resin-torch-v1.svg` (838B)
- `/assets/items/salt-crystal-bundle-v1.svg` (670B)
- `/assets/items/saltfield-ritual-knife-v1.svg` (826B)
- `/assets/items/sea-salt-amulet-v1.svg` (811B)
- `/assets/items/worn-hwando-v3.png` (23.6KB)
- `/assets/ui/asra-title-keyart-mobile-v1.png` (2.2MB)
- `/assets/ui/asra-title-keyart-v1.png` (2.1MB)
- `/assets/ui/beta/beta-campaign-keyart-v1.png` (2.1MB)
- `/assets/ui/beta/beta-panel-material-v1.png` (2.3MB)
- `/assets/ui/equipment-paperdoll-panel-v2.webp` (423.1KB)
- `/assets/ui/inventory-bag-panel-v2.webp` (437.0KB)
- `/assets/ui/inventory-mobile-tabs-v2.webp` (135.0KB)
- `/assets/ui/item-detail-panel-v2.webp` (299.1KB)
- `/assets/ui/joseon-hud-ornament-atlas-v2.png` (1.7MB)
- `/assets/ui/wolyeongrok-loading-frame-v1.png` (1.7MB)
- `/assets/ui/wolyeongrok-title-logo-v1.png` (1.3MB)
- `/assets/ui/wolyeongrok-title-logo-v1.webp` (248.7KB)
- `/assets/ui/yeonhwa-portrait-v1.png` (2.1MB)

## 존재하지 않는 참조

- 없음
