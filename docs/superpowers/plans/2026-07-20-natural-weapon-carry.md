# Natural Weapon Carry Implementation Plan

> **For agentic workers:** Implement tasks in order and keep unrelated dirty-worktree changes intact.

**Goal:** 환도가 맨손 보행 몸에 떠 붙지 않고, 한손 저단 휴대 보행에서 양손 검술 공격으로 자연스럽게 이어지게 한다.

**Architecture:** 인벤토리 기반 장착 상태를 순수 함수로 해석해 빈손 몸과 무기 준비 몸을 고른다. 몸·복장은 같은 5×8 프레임을 공유하고, 무기는 `walk`/`attack` 포즈별 부착점과 배율을 사용한다.

**Tech Stack:** TypeScript, Phaser 3, Vite, Vitest, Pillow, ImageGen

## Task 1: 무기 비주얼 상태 계약

**Files:**
- Modify: `src/game/phaser/playerAttackVisual.ts`
- Modify: `src/game/phaser/playerAttackVisual.test.ts`
- Modify: `src/game/phaser/playerVisualMode.ts`
- Modify: `src/game/phaser/playerVisualMode.test.ts`

- [x] 무기 장착 보행·대기·공격이 새 몸과 애니메이션 키를 선택하는 실패 테스트를 작성한다.
- [x] 인벤토리에 없는 오래된 장착 ID는 빈손으로 처리하는 회귀 테스트를 유지한다.
- [x] 최소 상태 해석 함수를 구현해 집중 테스트를 통과시킨다.

## Task 2: 무기 준비 자세 이미지셋

**Files:**
- Create: `assets/sprites/joseon-hero-components-v8/source/*`
- Create: `assets/sprites/joseon-hero-components-v8/processed/*`
- Create: `public/assets/characters/joseon-hero-weapon-ready-body-v1.png`
- Create: `public/assets/characters/joseon-hero-hunter-weapon-ready-layer-v1.png`
- Create: `public/assets/characters/joseon-hero-warden-weapon-ready-layer-v1.png`
- Modify: `src/game/assets/manifest.ts`
- Modify: `src/game/assets/manifest.test.ts`

- [x] 기존 얼굴·체형·5방향을 참조해 한손 저단 보행과 양손 공격이 포함된 5×8 원본을 생성한다.
- [x] 마젠타를 투명화하고 몸 기준 공통 배율·발선으로 몸과 두 복장 레이어를 정규화한다.
- [x] 40개 프레임 점유, 2048×1280 해상도, 투명 배경, 프레임 침범 여부를 검사한다.

## Task 3: 부착점과 Phaser 통합

**Files:**
- Modify: `src/game/phaser/playerLayerState.ts`
- Modify: `src/game/phaser/playerLayerState.test.ts`
- Modify: `src/game/phaser/HuntingScene.ts`

- [x] `walk`/`attack` 모드별 5방향×4프레임 부착점과 배율 실패 테스트를 작성한다.
- [x] 무기 장착 보행 애니메이션을 등록하고 대기·이동 상태가 새 몸을 선택하게 한다.
- [x] 몸 스프라이트의 실제 frame/flip을 복장과 무기 레이어에 전달한다.
- [x] 공격 종료 후 장착 상태에 맞는 대기 몸으로 복귀하게 한다.

## Task 4: 완료 검증

**Files:**
- Modify: `docs/SPRITE_MODELING_GUIDE.md`

- [x] 모델링 지침에 한손 무기 휴대 몸과 부품식 장비 규칙을 고정한다.
- [x] `npm test -- --run`을 통과시킨다.
- [x] `npm run build`를 통과시킨다.
- [x] 브라우저에서 무기만/무기+복장 상태의 대기·8방향 보행·공격과 콘솔을 확인한다.
