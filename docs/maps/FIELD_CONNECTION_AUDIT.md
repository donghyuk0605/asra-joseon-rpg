# 필드·도시 연결 자동 감사 장부

이 파일은 `npm run audit:routes`로 생성한다. 직접 수정하지 않는다.

## 핵심 기준선

| 항목 | 현재 값 |
| --- | --- |
| 전체 지역 / 로컬 출구 보유 | 81 / 81 |
| 로컬 출구 안내 | 142개 |
| 도보 / 선박 / 장면 전환 | 122 / 9 / 11 |
| 연속 지형 이음새 | 55개 |
| 물리 선박 연결 | 3개 |
| 월드맵 거점 / 노선 | 23 / 35 |
| 월드맵 연결 성분 | 1개 |
| 로컬 출구 없는 지역 | 없음 |

## 지역별 실제 출구

| 지역 | 월드맵 거점 | 실제 출구 |
| --- | --- | --- |
| 월영 솔고개 (solgogae) | yeongwol | 달빛고을 · 도보 |
| 달빛고을 (village) | yeongwol | 월영 솔고개 · 도보<br>청람 안개숲 · 도보<br>흑철 폐광고개 · 도보<br>월하 그림자들 · 도보 |
| 청람 안개숲 (mistwood) | yeongwol | 달빛고을 · 도보<br>영월 관아 앞 훈련마당 · 도보 |
| 영월 관아 앞 훈련마당 (yeongwol) | yeongwol | 전주 완산벌 대사냥터 · 도보<br>청람 안개숲 · 도보<br>영월 관아 지휘부 · 도보 |
| 영월 관아 지휘부 (yeongwolhq) | yeongwol | 영월 관아 앞 훈련마당 · 도보<br>원주 치악산역 · 도보 |
| 전주 완산벌 대사냥터 (jeonjufield) | jeonju | 영월 관아 앞 훈련마당 · 도보<br>전주성 풍남문 대회전 · 도보 |
| 전주성 풍남문 대회전 (jeonjugate) | jeonju | 전주성 대읍성 · 도보<br>전주 완산벌 대사냥터 · 도보 |
| 전주성 대읍성 (jeonju) | jeonju | 부산진성 혈전 · 전환<br>전주성 풍남문 대회전 · 도보 |
| 오사카 외항 포로촌 (osaka) | osaka | 셋쓰 달그림자 산촌 · 도보 · 조건부 |
| 셋쓰 달그림자 산촌 (settsuvillage) | osaka | 오사카 외항 포로촌 · 도보<br>야마자키 삼나무 사냥숲 · 도보 · 조건부 |
| 야마자키 삼나무 사냥숲 (yamazakihunt) | osaka | 셋쓰 달그림자 산촌 · 도보<br>오사카 성하마을 · 도보 · 조건부 |
| 오사카 성하마을 (osakacastle) | osaka | 야마자키 삼나무 사냥숲 · 도보<br>오사카 군선봉행 성채 · 도보 · 조건부 |
| 오사카 군선봉행 성채 (shogunkeep) | osaka | 오사카 성하마을 · 도보<br>사카이 자유항 · 도보 · 조건부 |
| 사카이 자유항 (sakaicity) | osaka | 오사카 군선봉행 성채 · 도보<br>이즈미 대나무 고개 · 도보 · 조건부 |
| 이즈미 대나무 고개 (izumihunt) | osaka | 사카이 자유항 · 도보<br>아와지 해협 사냥터 · 선박 · 조건부 |
| 아와지 해협 사냥터 (awajicoast) | osaka | 이즈미 대나무 고개 · 선박<br>이키 고노우라 항구 · 선박 · 조건부 |
| 이키 고노우라 항구 (ikiport) | osaka | 아와지 해협 사냥터 · 선박<br>대마도 아리아케 산림 · 선박 · 조건부 |
| 대마도 아리아케 산림 (tsushimahunt) | osaka | 이키 고노우라 항구 · 선박<br>대마도 이즈하라 성하 · 도보 · 조건부 |
| 대마도 이즈하라 성하 (izuhara) | osaka | 대마도 아리아케 산림 · 도보<br>부산진성 혈전 · 전환 · 조건부 |
| 부산진성 혈전 (busanjin) | busan | 전주성 대읍성 · 전환<br>거제 견내량 수군진 · 선박<br>탄금대 대회전 · 도보 |
| 탄금대 대회전 (tangeumdae) | chungju | 부산진성 혈전 · 도보<br>경복궁 광화문 · 전환 |
| 경복궁 광화문 (gyeongbokgate) | hanseong | 탄금대 대회전 · 전환<br>경복궁 근정전 · 도보 |
| 경복궁 근정전 (gyeongbokcourt) | hanseong | 경복궁 광화문 · 도보<br>경복궁 사정전·강녕전 · 도보 |
| 경복궁 사정전·강녕전 (gyeongbokinner) | hanseong | 경복궁 근정전 · 도보<br>평양성 내성 · 전환 |
| 한성 숭례문·칠패장 (hanseongsouth) | hanseong | 한성 종루·운종가 · 도보<br>수원 읍치 장터 · 도보 |
| 한성 종루·운종가 (hanseongmarket) | hanseong | 창덕궁 · 왕세자 광해 분조청 · 도보<br>한성 숭례문·칠패장 · 도보 |
| 창덕궁 · 왕세자 광해 분조청 (changdeokgung) | hanseong | 개성 송도 장시 · 도보<br>한성 종루·운종가 · 도보 |
| 개성 송도 장시 (gaeseong) | gaeseong | 창덕궁 · 왕세자 광해 분조청 · 도보<br>해주 염전포 · 도보 |
| 수원 읍치 장터 (suwon) | suwon | 한성 숭례문·칠패장 · 도보<br>충주 목계나루 · 도보 |
| 충주 목계나루 (chungju) | chungju | 수원 읍치 장터 · 도보<br>안동부 서원길 · 도보 |
| 안동부 서원길 (andong) | andong | 충주 목계나루 · 도보 |
| 원주 치악산역 (wonju) | wonju | 영월 관아 지휘부 · 도보<br>강릉 경포 봉화길 · 도보 |
| 강릉 경포 봉화길 (gangneung) | gangneung | 원주 치악산역 · 도보 |
| 해주 염전포 (haeju) | haeju | 개성 송도 장시 · 도보 |
| 거제 견내량 수군진 (geoje) | geoje | 부산진성 혈전 · 선박 |
| 황주 달고개 역참 (hwangju) | episode2-northwest-road | 재령 갈대벌 · 도보 |
| 재령 갈대벌 (jaeryeong) | episode2-northwest-road | 황주 달고개 역참 · 도보<br>안주 청천강진 · 도보 |
| 안주 청천강진 (anju) | episode2-northwest-road | 재령 갈대벌 · 도보<br>의주 용만관 · 도보 |
| 의주 용만관 (uiju) | episode2-northwest-road | 안주 청천강진 · 도보 |
| 양주 송화 봉수로 (yangju) | episode2-mountain-road | 가평 잣나무 물레촌 · 도보 |
| 가평 잣나무 물레촌 (gapyeong) | episode2-mountain-road | 양주 송화 봉수로 · 도보<br>평창 눈재 사냥터 · 도보 |
| 평창 눈재 사냥터 (pyeongchang) | episode2-mountain-road | 가평 잣나무 물레촌 · 도보<br>삼척 죽서루 해풍길 · 도보 |
| 삼척 죽서루 해풍길 (samcheok) | episode2-mountain-road | 평창 눈재 사냥터 · 도보 |
| 이천 도요지 (icheon) | episode2-central-river | 여주 신륵 나루 · 도보 |
| 여주 신륵 나루 (yeoju) | episode2-central-river | 이천 도요지 · 도보<br>청주 상당 벌판 · 도보 |
| 청주 상당 벌판 (cheongju) | episode2-central-river | 여주 신륵 나루 · 도보<br>공주 금강진 · 도보 |
| 공주 금강진 (gongju) | episode2-central-river | 청주 상당 벌판 · 도보 |
| 제물포 월미 나루 (jemulpo) | episode2-west-coast | 남양 염초장 · 도보 |
| 남양 염초장 (namyang) | episode2-west-coast | 제물포 월미 나루 · 도보<br>보령 오천 수영 · 도보 |
| 보령 오천 수영 (boryeong) | episode2-west-coast | 남양 염초장 · 도보<br>군산 금강 하구 · 도보 |
| 군산 금강 하구 (gunsan) | episode2-west-coast | 보령 오천 수영 · 도보 |
| 남원 광한 대숲 (namwon) | episode2-honam-road | 순천만 갈대포 · 도보 |
| 순천만 갈대포 (suncheon) | episode2-honam-road | 남원 광한 대숲 · 도보<br>목포 유달진 · 도보 |
| 목포 유달진 (mokpo) | episode2-honam-road | 순천만 갈대포 · 도보<br>나주 배꽃들 · 도보 |
| 나주 배꽃들 (naju) | episode2-honam-road | 목포 유달진 · 도보 |
| 상주 낙동 역원 (sangju) | episode2-yeongnam-road | 대구 달성 약령장 · 도보 |
| 대구 달성 약령장 (daegu) | episode2-yeongnam-road | 상주 낙동 역원 · 도보<br>진주 남강진 · 도보 |
| 진주 남강진 (jinju) | episode2-yeongnam-road | 대구 달성 약령장 · 도보<br>통영 삼도수군진 · 도보 |
| 통영 삼도수군진 (tongyeong) | episode2-yeongnam-road | 진주 남강진 · 도보 |
| 여진 설원부락 (jurchenvillage) | jurchen | 장백 자작나무 사냥터 · 도보<br>압록 국경 전선 · 도보 |
| 장백 자작나무 사냥터 (changbaihunt) | jurchen | 여진 설원부락 · 도보<br>백산부 부족마을 · 도보 · 조건부 |
| 백산부 부족마을 (baeksanvillage) | jurchen | 장백 자작나무 사냥터 · 도보<br>송화강 사슴벌 사냥터 · 도보 · 조건부 |
| 송화강 사슴벌 사냥터 (songhuahunt) | jurchen | 백산부 부족마을 · 도보<br>송화부 부족마을 · 도보 · 조건부 |
| 송화부 부족마을 (songhuavillage) | jurchen | 송화강 사슴벌 사냥터 · 도보<br>흑송령 산짐승 사냥터 · 도보 · 조건부 |
| 흑송령 산짐승 사냥터 (blackpinehunt) | jurchen | 송화부 부족마을 · 도보<br>흑수부 부족마을·회맹장 · 도보 · 조건부 |
| 흑수부 부족마을·회맹장 (heuksuvillage) | jurchen | 흑송령 산짐승 사냥터 · 도보<br>여진 설원부락 · 전환 · 조건부 |
| 압록 국경 전선 (manchufrontier) | yalu | 여진 설원부락 · 도보<br>평양성 북곽 · 도보 |
| 평양성 북곽 (pyongyangouter) | pyongyang | 압록 국경 전선 · 도보<br>평양성 대동문 · 도보 · 조건부 |
| 평양성 대동문 (pyongyanggate) | pyongyang | 평양성 북곽 · 도보<br>평양성 내성 · 도보 · 조건부 |
| 평양성 내성 (pyongyanginner) | pyongyang | 평양성 대동문 · 도보<br>경복궁 광화문 · 전환 · 조건부 |
| 남한산성 최종 방어선 (namhansanseong) | hanseong | 경복궁 사정전·강녕전 · 전환 · 조건부 |
| 강화도 최종 방어선 (ganghwado) | hanseong | 경복궁 사정전·강녕전 · 선박 · 조건부 |
| 흑철 폐광고개 (minepass) | yeongwol | 무영광산 지하 · 전환<br>달빛고을 · 도보 |
| 월하 그림자들 (moonfield) | yeongwol | 달빛고을 · 도보 |
| 무영광산 지하 (dungeon) | 미등록 | 흑철 폐광고개 · 전환 |
| 울릉도 관청 감옥터 (ulleungdo) | ulleung | 울릉 바람고개 · 도보<br>울릉 관아 · 도보 |
| 울릉 해안 해송숲 (ulleungcoast) | ulleung | 울릉 억새초원 · 도보 |
| 울릉 억새초원 (ulleungmeadow) | ulleung | 울릉 해안 해송숲 · 도보<br>약탈당한 울릉 해송마을 · 도보 |
| 약탈당한 울릉 해송마을 (ulleunghunt) | ulleung | 울릉 억새초원 · 도보<br>울릉 바람고개 · 도보 |
| 울릉 바람고개 (ulleungridge) | ulleung | 약탈당한 울릉 해송마을 · 도보<br>울릉도 관청 감옥터 · 도보 |
| 울릉 관아 (ulleungvillage) | ulleung | 울릉도 관청 감옥터 · 도보 |

## 단방향 로컬 연결

스토리 진입, 전투 완료 귀환, 월드맵 이동처럼 의도된 장면 전환을 포함한다. 새 항목이 생기면 실제 왕복 필요 여부를 검토한다.

| 출발 | 도착 | 방식 | 조건 |
| --- | --- | --- | --- |
| 대마도 이즈하라 성하 (izuhara) | 부산진성 혈전 (busanjin) | 전환 | 완료 조건 |
| 경복궁 사정전·강녕전 (gyeongbokinner) | 평양성 내성 (pyongyanginner) | 전환 | - |
| 흑수부 부족마을·회맹장 (heuksuvillage) | 여진 설원부락 (jurchenvillage) | 전환 | 완료 조건 |
| 평양성 내성 (pyongyanginner) | 경복궁 광화문 (gyeongbokgate) | 전환 | 완료 조건 |
| 남한산성 최종 방어선 (namhansanseong) | 경복궁 사정전·강녕전 (gyeongbokinner) | 전환 | 완료 조건 |
| 강화도 최종 방어선 (ganghwado) | 경복궁 사정전·강녕전 (gyeongbokinner) | 선박 | 완료 조건 |
