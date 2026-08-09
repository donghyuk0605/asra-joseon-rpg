# 베타 주인공·무공 이미지셋 규격

## 주인공 식별 계약

| 주인공 | 월드 이동·공격 시트 | 초상화 | 전투 계열 |
| --- | --- | --- | --- |
| 김동혁 | `joseon-hero-base-body-v8`, `joseon-hero-weapon-ready-body-v3` | `kim-donghyeok-portrait-v1.png` | 환도 |
| 하진 | `hajin-frontier-archer-actions-v2`, `hajin-frontier-melee-actions-v2` | `harlan-portrait-v1.png` | 각궁·환도 |
| 연화 | `osaka-mudang-actions-v2` | `yeonhwa-portrait-v1.webp` | 방울·부적·진혼굿 |
| 왕세자 광해 | `joseon-gwanghae-actions-v2` | `gwanghae-crown-prince-portrait-v1.webp` | 세자 검법 |

런타임은 선택 주인공, 실제 텍스처, 현재 동작을 `body`와 게임 `canvas`의 데이터 속성으로 함께 공개한다. `playerVisualMatch=mismatch`가 발생하면 선택 캐릭터와 렌더 시트가 섞인 회귀다.

모든 이동 시트는 `SPRITE_MODELING_GUIDE.md`의 256px 셀, 8열×5행, 걷기 0–3열, 공격 4–7열, 발선 249px 규격을 따른다. 하진 근접 자세와 연화 v2는 공격 열을 보존하고 걷기 열만 발선에 맞췄다.

## 전용 무공 아이콘 6×3

런타임 파일은 `public/assets/ui/skills/beta-skill-icon-atlas-v1.webp`이며 각 칸은 256×256이다. CSS는 `background-size: 600% 300%`로 자른다. 색상 회전으로 같은 그림을 재사용하지 않는다.

| 행 | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| 환도 | 회전베기 | 도약 내려꽂기 | 월영 돌진참 | 반월 검기 | 파도끊기 보법 | 예도 숙련 |
| 궁술 | 졸본 유성시 | 삼족오 추적시 | 동북면 철기시 | 황산 낙시진 | 팔도 봉수연시 | 신궁의 강궁법 |
| 무당·공용 | 망향 초혼방울 | 살풀이 부적불 | 결박 진혼굿 | 유랑신 내림 | 금강 체술 | 깨달음의 호흡 |

시각 언어는 다음처럼 고정한다.

- 환도: 무채색 철, 달빛 금색, 절제된 진홍.
- 궁술: 송진 녹색, 호박색, 철청색.
- 무당: 남보라, 청록 혼불, 바랜 자홍.
- 공용 패시브: 금속과 고서 중심의 억제된 금색.
- 모든 문양: 글자 없이 중앙 정렬, 32px에서도 구별되는 단일 실루엣, 낡은 철·황동 테두리.

## 재생성과 검증

```bash
npm run build:skill-icons
npm run validate:skill-icons
npm run build:protagonist-walks
npm run validate:protagonist-walks
```

브라우저 완료 기준은 네 주인공 각각 `selectedOrigin = activeOrigin = renderedPlayerOrigin`, `playerVisualMatch=matched`, 전용 초상화와 직업별 단축 무공 일치다. 모바일 기술 노드는 390×844에서 가로 넘침 없이 82px 높이와 43px 아이콘을 유지한다.
