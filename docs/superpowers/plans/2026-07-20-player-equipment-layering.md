# Player Equipment Layering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 장비를 장착해도 기본 몸의 발과 보행이 바뀌지 않는 부품식 캐릭터 렌더러를 만든다.

**Architecture:** 기본 몸 스프라이트는 항상 같은 시트와 애니메이션을 사용한다. 복장은 별도 투명 시트로 몸의 프레임·방향·로컬 변형을 공유하고, 인게임 전용 무기 컷아웃은 방향·액션 프레임별 손 부착점을 따른다.

**Tech Stack:** TypeScript, Phaser 3, Vite, Vitest, Pillow 기반 자산 처리

## Global Constraints

- 몸과 복장 레이어는 2048×1280, 256px 프레임, 5행×8열이다.
- 원점은 `(0.5, 0.97)`, 표시 배율은 `0.51`, 발 기준선은 하단 7px이다.
- 장비 교체는 기본 몸 애니메이션을 교체하지 않는다.
- 완료 전 `npm test -- --run`, `npm run build`, 브라우저 플레이 검증을 수행한다.

---

### Task 1: 장비 레이어 상태 계약

**Files:**
- Modify: `src/game/phaser/playerVisualMode.ts`
- Test: `src/game/phaser/playerVisualMode.test.ts`

**Interfaces:**
- Produces: `resolvePlayerLayers(equipment): { armor: boolean; weapon: boolean }`

- [x] 장비 조합 네 가지가 올바른 레이어 가시성으로 매핑되는 실패 테스트를 작성한다.
- [x] 해당 테스트가 함수 부재로 실패하는지 실행한다.
- [x] 최소 매핑 함수를 구현한다.
- [x] 집중 테스트를 통과시킨다.

### Task 2: 부품 시트 제작과 규격 검사

**Files:**
- Create: `scripts/build_player_equipment_v6.py`
- Create: `scripts/process_world_weapons_v1.py`
- Create: `public/assets/characters/joseon-hero-base-body-v6.png`
- Create: `public/assets/characters/joseon-hero-armor-layer-v3.png`
- Create: `public/assets/characters/joseon-hero-warden-layer-v1.png`
- Create: `public/assets/weapons/*-world-v1.png`
- Modify: `src/game/assets/manifest.ts`
- Test: `src/game/assets/manifest.test.ts`

**Interfaces:**
- Produces: `ASSETS.playerArmorLayers`, `ASSETS.playerWeapons`

- [x] 매니페스트가 복장 40프레임 레이어를 요구하는 실패 테스트를 작성한다.
- [x] 테스트 실패를 확인한다.
- [x] 생성 착용 시트에서 기본 몸을 제외한 복장 픽셀만 추출하는 재현 가능한 스크립트를 작성한다.
- [x] 결과 해상도·알파·프레임 점유를 검사하고 매니페스트를 추가한다.
- [x] 집중 테스트를 통과시킨다.

### Task 3: Phaser 주인공 레이어 렌더러

**Files:**
- Create: `src/game/phaser/playerLayerState.ts`
- Create: `src/game/phaser/playerLayerState.test.ts`
- Modify: `src/game/phaser/HuntingScene.ts`

**Interfaces:**
- Produces: `frameForPlayerLayer(row, column)`, `weaponAttachmentForFrame(...)` 및 세 스프라이트 동기화

- [x] 걷기·공격 프레임 번호가 모든 레이어에서 같아야 하는 실패 테스트를 작성한다.
- [x] 테스트 실패를 확인한다.
- [x] 기본 몸·복장·무기 스프라이트를 하나의 루트에 추가하고 복장은 몸 프레임을, 무기는 손 부착점을 따르게 한다.
- [x] 장비 교체 시 가시성만 갱신하고 진행 중 공격을 취소한다.
- [x] 피격·사망·히트스톱이 모든 보이는 레이어에 적용되도록 기존 단일 스프라이트 처리를 확장한다.
- [x] 집중 테스트를 통과시킨다.

### Task 4: 전체 검증

**Files:**
- Modify: `docs/SPRITE_MODELING_GUIDE.md`

- [x] 부품식 주인공 자산 규칙을 모델링 지침에 고정한다.
- [x] `npm test -- --run`을 실행해 전체 통과를 확인한다.
- [x] `npm run build`를 실행해 타입·배포 빌드를 확인한다.
- [ ] 브라우저에서 빈손, 검만, 복장만, 검+복장 조합의 보행과 공격을 캡처하고 콘솔 오류가 없는지 확인한다.
