import type { ItemId } from '../simulation/types';
import { EPISODE2_REGION_LAYOUTS } from '../world/episode2Regions';
import { REGIONS, type RegionId } from '../world/regions';

export type ItemAcquisitionInfo = Readonly<{
  primary: string;
  detail: string;
  regions: readonly RegionId[];
}>;

const source = (
  primary: string,
  detail: string,
  regions: readonly RegionId[] = [],
): ItemAcquisitionInfo => Object.freeze({ primary, detail, regions });

/**
 * Hand-authored sources cover fixed rewards and systems that cannot be inferred
 * from a region drop pool. Keeping this separate from presentation copy makes
 * the bag useful as an in-game codex without changing the actual drop rules.
 */
const FIXED_ITEM_SOURCES: Partial<Record<ItemId, ItemAcquisitionInfo>> = {
  'worn-hwando': source('울릉도 탈옥 첫 전리품', '감옥터의 첫 포졸이 확정 드랍 · 해송마을 수련목 3회 보상', ['ulleungdo', 'ulleunghunt']),
  'frontier-horn-bow': source('하진 전용 시작 장비', '북방 사수 하진을 선택하면 처음부터 지급', ['manchufrontier']),
  'white-birch-bow': source('압록 전선 멧돼지 사냥', '하진으로 첫 멧돼지 처치 시 확정 드랍', ['manchufrontier']),
  'iron-horn-warbow': source('압록 전선 멧돼지 사냥', '하진의 첫 보상 이후 멧돼지 희귀 드랍', ['manchufrontier']),
  'thunderbird-bow': source('일본 원정 왜장 토벌', '하진으로 일본군 장수를 처치할 때 희귀 드랍', ['osaka', 'osakacastle', 'shogunkeep']),
  'northwind-warbow': source('압록 전선 사건 보상', '북방 사건 지휘 목표를 완수하면 미보유 장비 우선 지급', ['manchufrontier']),
  'dokkaebi-club': source('도깨비·죽림귀 토벌', '도깨비 계열 적의 희귀 전리품', ['solgogae', 'mistwood']),
  'hunter-durumagi': source('적병 토벌 공통 전리품', '산적·관군·왜구 계열 적의 장비 드랍', ['solgogae', 'yeongwol', 'busanjin']),
  'boar-tusk-charm': source('멧돼지 사냥', '각지 멧돼지의 일반 부적 드랍', ['solgogae', 'jeonjufield', 'ulleungridge']),
  'frontier-lamellar-coat': source('압록 국경 지휘관', '하진으로 조선 국경군 지휘관 처치 시 미보유 확정 드랍', ['manchufrontier']),
  'falcon-eye-bracer': source('압록 국경 궁수·돌무지', '하진으로 국경 궁수 처치 또는 돌무지 제단 조사', ['manchufrontier']),
  'border-war-dispatch': source('쓰러진 조선 파발꾼', '압록 전선의 파발꾼 랜드마크 최초 조사 보상', ['manchufrontier']),
  'jurchen-iron-arrowheads': source('여진 선봉 보급 썰매', '압록 전선의 보급 썰매 최초 조사 보상', ['manchufrontier']),
  'joseon-border-token': source('조선 국경군 토벌', '하진으로 압록 전선 국경군 처치 시 드랍', ['manchufrontier']),
  'moonsteel-hwando': source('울릉 탐관오리·도깨비', '울릉 현감 확정 드랍 · 도깨비 계열 극희귀 드랍', ['ulleungvillage', 'solgogae', 'mistwood']),
  'ember-hwando': source('왜구 대장·달빛고을 대장간', '왜구 대장 희귀 드랍 또는 상점 구매', ['ulleungvillage', 'busanjin', 'village']),
  'frost-hwando': source('울릉 산군·달빛고을 대장간', '산군 희귀 드랍 또는 상점 구매', ['ulleungridge', 'village']),
  'storm-hwando': source('감영 지휘관·달빛고을 대장간', '영월·전주 지휘관 희귀 드랍 또는 상점 구매', ['yeongwolhq', 'jeonjugate', 'village']),
  'venom-hwando': source('청람 죽림귀 토벌', '죽림귀의 희귀 속성무기 드랍', ['mistwood', 'jeonjufield']),
  'gale-hwando': source('왜구 궁수 토벌', '왜구 궁수의 희귀 속성무기 드랍', ['ulleungvillage', 'busanjin', 'tsushimahunt']),
  'earth-hwando': source('흑철 광산귀 토벌', '폐광의 광산귀 희귀 드랍', ['minepass']),
  'shadow-hwando': source('월하 원귀 토벌', '월하 그림자들의 원귀 희귀 드랍', ['moonfield']),
  'warden-durumagi': source('정예 적병 토벌', '산적·관군·왜구 계열 적의 극희귀 장비 드랍', ['solgogae', 'yeongwolhq', 'busanjin']),
  'silver-tiger-charm': source('멧돼지 사냥', '각지 멧돼지의 극희귀 부적 드랍', ['solgogae', 'jeonjufield', 'ulleungridge']),
  'ulleung-tiger-pelt': source('울릉 산군 사냥', '첫 산군 확정 · 이후 높은 확률로 드랍', ['ulleungridge']),
  'tiger-pelt-armor': source('울릉 대장간 제작', '울릉 산군 호피 3장과 180전 필요', ['ulleungvillage']),
  'bear-claw-gauntlet': source('치악산 큰곰 토벌', '원주 치악산역 큰곰의 지역 전리품', ['wonju']),
  'chiaksan-claw-knife': source('치악산 큰곰 토벌', '원주 큰곰의 첫 미보유 지역 장비', ['wonju']),
  'haetae-ward-charm': source('경포 해태귀 토벌', '강릉 해태귀의 첫 미보유 지역 장비', ['gangneung']),
  'gangneung-sea-bow': source('경포 해태귀 토벌', '강릉 해태귀의 지역 전리품', ['gangneung']),
  'coastal-scout-coat': source('경포 해태귀 토벌', '강릉 해태귀의 지역 전리품', ['gangneung']),
  'crane-feather-talisman': source('해주 백학귀 토벌', '해주 백학귀의 첫 미보유 지역 장비', ['haeju']),
  'haeju-reed-cape': source('해주 백학귀 토벌', '해주 백학귀의 지역 전리품', ['haeju']),
  'saltfield-ritual-knife': source('해주 백학귀 토벌', '해주 백학귀의 지역 전리품', ['haeju']),
  'sea-salt-amulet': source('거제 해무원귀 토벌', '거제 해무원귀의 첫 미보유 지역 장비', ['geoje']),
  'geoje-anchor-hwando': source('거제 해무원귀 토벌', '거제 해무원귀의 지역 전리품', ['geoje']),
  'pine-resin-torch': source('치악산 큰곰 토벌', '원주 큰곰에게서 얻는 지역 재료', ['wonju']),
  'naval-signal-seal': source('동해·남해 괴이 토벌', '강릉 해태귀 또는 거제 해무원귀의 지역 재료', ['gangneung', 'geoje']),
  'crane-quill-bundle': source('해주 백학귀 토벌', '해주 백학귀의 지역 재료', ['haeju']),
  'salt-crystal-bundle': source('서해·남해 괴이 토벌', '해주 백학귀 또는 거제 해무원귀의 지역 재료', ['haeju', 'geoje']),
  'weapon-enchant-scroll': source('상점·정예 토벌·밀수품', '달빛고을 구매, 감옥 밀수품, 쇼군 보상 또는 8회 토벌 보정', ['village', 'ulleungdo', 'shogunkeep']),
  'armor-enchant-scroll': source('상점·정예 토벌·관아 궤짝', '달빛고을 구매, 관아 압수품, 쇼군 보상 또는 8회 토벌 보정', ['village', 'ulleungvillage', 'shogunkeep']),
  'crescent-manual': source('청람 죽림귀 첫 토벌', '월영참을 익히기 전 죽림귀가 확정 드랍', ['mistwood', 'jeonjufield']),
  'insight-manual': source('월하 원귀 첫 토벌', '심안을 익히기 전 월하 원귀가 확정 드랍', ['moonfield']),
};

const episode2SourcesFor = (itemId: ItemId): ItemAcquisitionInfo | null => {
  const regions = (Object.entries(EPISODE2_REGION_LAYOUTS) as Array<[
    RegionId,
    (typeof EPISODE2_REGION_LAYOUTS)[keyof typeof EPISODE2_REGION_LAYOUTS],
  ]>)
    .filter(([, layout]) => layout.dropPool.includes(itemId))
    .map(([region]) => region);
  if (regions.length === 0) return null;
  const names = regions.map((region) => REGIONS[region].name);
  return source(
    `${REGIONS[regions[0]].province.split(' · ')[0]} 지역 토벌`,
    `${names.join(' · ')} 전리품 목록`,
    regions,
  );
};

export const itemAcquisitionInfo = (itemId: ItemId): ItemAcquisitionInfo => (
  episode2SourcesFor(itemId)
  ?? FIXED_ITEM_SOURCES[itemId]
  ?? source('지역 토벌·사건 보상', '관련 지역의 적과 사건을 진행하면 획득 가능')
);
