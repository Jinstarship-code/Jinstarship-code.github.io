// 자주 고치는 값(보스 목록, 가챠 확률, 공지, 메뉴, 시트 주소)을 모아둔 파일입니다.

// ── 데이터 영역: 보스를 추가/수정할 땐 여기만 건드리면 됩니다 ──
const BOSS_REGIONS = [
    {
        label: '월드 보스', className: 'th-world',
        bosses: [
            { name: '브라키움', cut: 480 },
            { name: '클레마무스', cut: 550 },
            { name: '데세르티', cut: 800 },
            { name: '엑세사', cut: 1000 },
            { name: '유서파트르', cut: 1220 },
            { name: '오르세카', cut: 1395 },
            { name: '인페르누스', cut: 2050 },
        ]
    },
    {
        label: '게헨나 2구역', className: 'th-gehenna2',
        bosses: [
            { name: '카심', cut: 600 },
            { name: '레물루스', cut: 830 },
            { name: '겔텐', cut: 1027 },
            { name: '에노크', cut: 1100 },
        ]
    },
    {
        label: '게헨나 3구역', className: 'th-gehenna3',
        bosses: [
            { name: '바르젤린', cut: 1350 },
            { name: '라파', cut: 1650 },
            { name: '팔리츠', cut: 2030 },
            { name: '마슈미드', cut: 2250 },
        ]
    },
];

const STAT_INPUT_IDS = ['stat1', 'stat2', 'stat3', 'stat4'];

// ── 가챠 데이터: 확률(%)과 등급 색상 ──
const GACHA_GRADES = [
    { name: '전설', rate: 0.015, bg: '#f5c518', text: '#5a4400', care: 0 },   // 황금색
    { name: '영웅', rate: 0.2,   bg: '#9b59b6', text: '#ffffff', care: 0 },   // 보라색
    { name: '희귀', rate: 2.1,   bg: '#5dade2', text: '#ffffff', care: 1 },   // 하늘색
    { name: '고급', rate: 23,    bg: '#a9dc76', text: '#2d4a12', care: 3 },   // 연두색
    { name: '일반', rate: 100 - (0.015 + 0.2 + 2.1 + 23), bg: '#d9d9d9', text: '#555555', care: 5 }, // 연회색 (나머지)
];

const GACHA_COST_PER_PULL = 2000; // 11연차 1회당 다이아

// 케어포인트: 카드 1장을 뽑을 때마다 등급별 care 값만큼 쌓이고, 아래 목표에 도달하면 천장 1회 달성
const GACHA_CARE_GOAL = 9000;

// ── 상단 '유틸리티' 메뉴에 들어가는 항목 (key = 탭 id) ──
// 새 기능을 추가할 땐: index.html에 <div id="키" class="tab-content"> 탭을 만들고, 여기에 한 줄만 추가하면 메뉴에 나타납니다.
const UTILITY_ITEMS = [
    { key: 'accuracy', label: '🎯 명중 계산' },
    { key: 'gacha', label: '🎰 가챠 시뮬레이션' },
];

// ── 공지사항 내용 (여기만 고치면 됩니다) ──
const NOTICES = [
    {
        key: 'schedule',
        title: '스케줄 공지',
        date: '2026.11.15',
        body: '※ 예시 내용입니다. 이 자리에 이번 주 스케줄 공지를 적어주세요.\n\n- 월요일 21:00  예시 일정 1\n- 수요일 20:00  예시 일정 2\n- 토요일 21:30  예시 일정 3',
    },
];

// ── 로비 카드 (누르면 공지사항 탭의 해당 공지로 이동) ──
const LOBBY_CARDS = [
    { title: '스케줄 공지', icon: '📅', color: '#cc0000', desc: '이번 주 스케줄을 확인하세요', noticeKey: 'schedule' },
];

// ── 정보 탭 왼쪽 메뉴 ──
// children = 하위 메뉴, sheetUrl = 그 클랜 구글 시트(웹에 게시한 CSV)의 주소
//  - 시트 탭마다 주소가 다릅니다: 구글 시트 > 파일 > 공유 > 웹에 게시 > 해당 시트 탭 선택 > 쉼표로 구분된 값(.csv) > 게시
//  - sheetUrl을 '' (빈 값)으로 두면 화면에 '준비 중입니다'로 표시됩니다.
const INFO_MENUS = [
    {
        key: 'weekly', label: '주간 활동',
        children: [
            { key: 'weekly-nanneo', label: '난너만패', sheetUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTxj_D0lg3phUHl6LeXs20jGc9Rnu-W8F29wN56nYUUBBSV9CNlOMnv0hHtbROVFYK1qf6mcq13eGj2/pub?gid=0&single=true&output=csv' },
            { key: 'weekly-waena', label: '왜나만패', sheetUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTxj_D0lg3phUHl6LeXs20jGc9Rnu-W8F29wN56nYUUBBSV9CNlOMnv0hHtbROVFYK1qf6mcq13eGj2/pub?gid=437010863&single=true&output=csv' },
        ],
    },
];

// ── 표 정렬 순서 (앞쪽일수록 높은 등급) ──
const ROLE_ORDER = ['길드장', '부길드장', '리더', '정예길드원', '일반길드원'];
const GRADE_ORDER = ['다이아', '플래티넘', '골드', '실버', '관심필요', '겜접음'];

// true: 미리보기용 더미 데이터 / false: 위 구글 시트 주소에서 실제 데이터 불러오기
// (실제 사이트에 올릴 때는 false로 바꿔주세요)
const USE_DUMMY_DATA = false;
