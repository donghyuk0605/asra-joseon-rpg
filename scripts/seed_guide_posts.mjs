import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD0suy93neUfrJmj72tNDQxBUqvap_oeic",
  authDomain: "haze-479ed.firebaseapp.com",
  projectId: "haze-479ed",
  storageBucket: "haze-479ed.firebasestorage.app",
  messagingSenderId: "41005434075",
  appId: "1:41005434075:web:46c734146f22638c5878fe",
  measurementId: "G-BKXJ0JB160",
  databaseURL: "https://haze-83cb5-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const now = Date.now();
const minutes = (m) => new Date(now - m * 60 * 1000);
const hours = (h) => new Date(now - h * 60 * 60 * 1000);
const days = (d) => new Date(now - d * 24 * 60 * 60 * 1000);

const postsToSeed = [
  {
    category: 'party',
    nickname: '칼날바람',
    title: '울릉도 해안 2구역 왜구 보스 같이 깰분 있나요 ㅠㅠ',
    body: `아 진짜 미치겟네 ㅋㅋㅋ 왜구 장수 패턴 뭔데 이렇게 쎔??
체력 반 이상 깎으면 기습 베기 쓰는데 여기서 계속 누움...

혹시 지금 울릉도 계신 분 중에 같이 잡아주실 분 계신가요 ㅠㅠ
35렙 이상 환도나 궁수 분이면 더 조음!! 댓글 주세여`,
    profile: { characterId: 'kim-donghyeok', regionName: '울릉 해안', level: 38 },
    createdAt: minutes(12),
    comments: [
      { nickname: '도깨비방망이', body: '저 지금 울릉도 선착장임 방 만드시면 귓 주세요 ㄱㄱ', createdAt: minutes(8) },
      { nickname: '칼날바람', body: '오 님 ㄳㄳ 방 만드는 중요!', createdAt: minutes(5) }
    ]
  },
  {
    category: 'general',
    nickname: '강화장인',
    title: '환도 4강 도전했다가 터졌습니다...하',
    body: `멘탈 나가서 글 씀ㅋㅋㅋㅋㅋ
3강에서 스펙 좀 올려보겠다고 4강 질렀는데 그대로 파괴되서 사라짐...

다들 3강에서 만족하고 쓰세요 제발...
강화 주문서 또 어디서 구하냐 아 빡친다 진짜 ㅋㅋㅋㅋㅋ`,
    profile: { characterId: 'kim-donghyeok', regionName: '전주 저잣거리', level: 45 },
    createdAt: minutes(35),
    comments: [
      { nickname: '전주부자', body: 'ㅋㅋㅋㅋ 강화는 3강이 국룰임 욕심부리다 다터짐', createdAt: minutes(28) },
      { nickname: '강화장인', body: '눈물나네여 거래소에서 다시 주문서 사는중 ㅠㅠ', createdAt: minutes(15) }
    ]
  },
  {
    category: 'question',
    nickname: '연화사망꾼',
    title: '무당 캐릭터 쿨타임 줄이는 템 어디서 나오나요??',
    body: `무당 스킬 쿨타임이 너무 길어서 딜로스 엄청 심한데
쿨감 붙은 부적이나 장신구 혹시 어디서 드랍되는지 아시는분 계신가여??

백자 부적 말고 다른 템도 잇나요??`,
    profile: { characterId: 'osaka-mudang', regionName: '오사카', level: 32 },
    createdAt: hours(1),
    comments: [
      { nickname: '묘향산도사', body: '묘향산 서낭당 퀘 깨면 청옥 부적 주는데 그거 쿨감 8프로 붙어잇음!', createdAt: minutes(50) },
      { nickname: '연화사망꾼', body: '오 묘향산 가야겟네요 정보 ㄳㄳ!!', createdAt: minutes(40) }
    ]
  },
  {
    category: 'general',
    nickname: '조선싸움꾼',
    title: '온라인 1v1 전장 모드 졸잼이네 ㅋㅋㅋ',
    body: `방 만들어놓고 기다리니까 사람 들어와서 한판 떳는데
싱글에서 키운 장비랑 레벨 그대로 적용되는거 실화냐 ㅋㅋㅋ

근데 상대 궁수 분 스텝 계속 밟아서 베기가 안박힘 ㅠㅠㅠ
무사 스킬 뭐 써야 궁수 잡음? 다들 전장 들러보셈 재미씀 ㅋㅋㅋ`,
    profile: { characterId: 'kim-donghyeok', regionName: '울릉 전장', level: 51 },
    createdAt: hours(2),
    comments: [
      { nickname: '명사수', body: '궁수는 거리 조절이 생명이라 붙어서 파갑 날리셔야댐 ㅋㅋㅋ', createdAt: hours(1.7) }
    ]
  },
  {
    category: 'strategy',
    nickname: '스토리덕후',
    title: '광해 스토리 3장 보스 패턴 팁 드림 (스포주의)',
    body: `3장 경복궁 서낭당 파트에서 보스 나오기 직전에
호위병 3명이랑 같이 서낭당 들러서 제례하면 축복 버프 줌.

이거 받고 들어가면 기력 회복 속도 개빨라져서 스킬 무한으로 굴릴 수 잇음.
모르시는 분들 많길래 적어봄!!`,
    profile: { characterId: 'gwanghae-prince', regionName: '경복궁 내전', level: 58 },
    createdAt: hours(3),
    comments: [
      { nickname: '광해바라기', body: '와 진짜요?? 몰라서 5번 죽었는데 ㅋㅋㅋ 개꿀팁 ㄳ', createdAt: hours(2.5) }
    ]
  },
  {
    category: 'strategy',
    nickname: '산길방랑자',
    title: '문경새재 지날 때 포션 많이 챙기세여...',
    body: `산길 들어가자마자 멧돼지랑 왜구 기습 존나 들어옴 ㅋㅋㅋ
포션 5개 들고 갔다가 거인 왜구한테 찢기고 전주성으로 부활함...

최소 탕약 15개 이상 챙기고 가세요 꼭...!!`,
    profile: { characterId: 'frontier-archer', regionName: '조령 관문', level: 28 },
    createdAt: hours(5),
    comments: [
      { nickname: '초보유저', body: '아 ㅠㅠ 저도 거기서 계속 죽어서 접을뻔 ㅋㅋㅋ 포션 사러 갑니다', createdAt: hours(4) }
    ]
  },
  {
    category: 'party',
    nickname: '거상김씨',
    title: '거래 제안소에 은장 환도 120엽전에 올렷는데 사가실분?',
    body: `운종가 거래 제안소에 은장 환도 +1강 120엽전에 올려둠!
시세보다 약간 싸게 올렸으니 필요하신 분 예약 누르세요 ㄱㄱ`,
    profile: { characterId: 'kim-donghyeok', regionName: '전주 저잣거리', level: 40 },
    createdAt: hours(7),
    comments: [
      { nickname: '구매희망', body: '지금 예약 눌렀슴다! 확정 부탁요', createdAt: hours(6) }
    ]
  },
  {
    category: 'general',
    nickname: '유랑객',
    title: '여행 모드로 맵 구경하는데 배경 경치 지리네요',
    body: `전투 없이 지형 통과하면서 맵 구경하는 모드 있길래 해봤는데
울릉도 해안 노을 지는 풍경이랑 BGM 진짜 좋네...

스샷 몇장 찍었는데 그래픽 감성 미쳤음 ㅋㅋㅋ 쉬어가기 딱 조음`,
    profile: { characterId: 'travel', regionName: '울릉도 해안', level: 1 },
    createdAt: hours(9),
    comments: []
  },
  {
    category: 'question',
    nickname: '활쟁이',
    title: '궁수 캐릭 기력 관리 다들 어케 하시나요?',
    body: `정찰 화살 쏘고 연사 날리면 기력 게이지 바로 바닥나는데
기력 회복 보석 끼는 게 나음 아니면 스탯을 찍는 게 나음??

궁수 선배님들 답변 좀 해주세여 ㅠㅠ`,
    profile: { characterId: 'frontier-archer', regionName: '압록강 변방', level: 36 },
    createdAt: hours(11),
    comments: [
      { nickname: '신궁', body: '기력 스탯은 20까지만 찍고 장신구로 회복률 맞추는 게 제일 효율 조음', createdAt: hours(10) }
    ]
  },
  {
    category: 'party',
    nickname: '직장인무사',
    title: '퇴근하고 저녁에 같이 열렙하실 분 계신가여',
    body: `8시 이후로 접속 가능합니당
혼자 사냥터 도니까 좀 심심해서 파티 사냥이나 퀘스트 같이 하실 분 모셔요!

나이대 비슷하면 더 좋을듯 ㅋㅋ 댓글 남겨주세여~`,
    profile: { characterId: 'kim-donghyeok', regionName: '전주', level: 30 },
    createdAt: hours(15),
    comments: []
  },
  {
    category: 'strategy',
    nickname: '탐정임당',
    title: '전주 관아 지하 감옥 자물쇠 열쇠 위치 공유',
    body: `지하 감옥 2층 상자 열쇠 안 보여서 한참 찾았는데
오른쪽 구석 항아리 깨니까 나오더라구요 ㅋㅋㅋ

막히신 분들 항아리 꼭 깨보세요!!`,
    profile: { characterId: 'osaka-mudang', regionName: '전주 관아', level: 25 },
    createdAt: hours(20),
    comments: []
  },
  {
    category: 'general',
    nickname: '열공무사',
    title: '드뎌 50렙 찍었슴다 ㅋㅋㅋㅋㅋ',
    body: `울릉도 사냥터에서 밤새 노가다 뛰어서 50 달성 ㅠㅠ
장비도 은장 세트 맞춰가는데 딜 찍히는 거 보니까 기분 째지네요 ㅋㅋㅋ

다들 즐겜하세요!!`,
    profile: { characterId: 'kim-donghyeok', regionName: '경복궁', level: 50 },
    createdAt: days(1),
    comments: [
      { nickname: '축하맨', body: '오 축하드립니다 ㅋㅋㅋ 50렙 상의 장비 간지 나죠', createdAt: hours(22) }
    ]
  }
];

async function seed() {
  console.log('Signing in anonymously...');
  const userCredential = await signInAnonymously(auth);
  const uid = userCredential.user.uid;
  console.log('Signed in with UID:', uid);

  for (const postData of postsToSeed) {
    const { comments, createdAt, ...fields } = postData;
    const authorId = `${uid}_${Math.random().toString(36).slice(2, 10)}`;
    const postPayload = {
      schemaVersion: 2,
      authorId: authorId.padEnd(20, '0'),
      ...fields,
      createdAt: Timestamp.fromDate(createdAt)
    };

    console.log(`Adding post: "${fields.title}" (${fields.category})`);
    const docRef = await addDoc(collection(db, 'guide_posts'), postPayload);
    console.log(` -> Post created ID: ${docRef.id}`);

    if (comments && comments.length > 0) {
      for (const commentData of comments) {
        const commentPayload = {
          schemaVersion: 1,
          authorId: `${uid}_comm_${Math.random().toString(36).slice(2, 8)}`.padEnd(20, '0'),
          nickname: commentData.nickname,
          body: commentData.body,
          createdAt: Timestamp.fromDate(commentData.createdAt)
        };
        const commentRef = await addDoc(collection(db, `guide_posts/${docRef.id}/comments`), commentPayload);
        console.log(`    -> Comment added ID: ${commentRef.id}`);
      }
    }
  }

  console.log('Successfully seeded all human-like posts and comments!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error seeding posts:', err);
  process.exit(1);
});
