// 시작 코드: 페이지가 열리면 각 탭을 준비합니다. (가장 마지막에 불러옵니다)

// ── 이벤트 연결 (인라인 onclick/oninput 대신 한 곳에서 관리) ──
function init() {
    initTheme();
    buildBossTable();

    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => openTab(btn.dataset.tab));
    });

    buildUtilityMenu();

    // 상단 '뱀피르' 제목을 누르면 로비로 이동
    const siteTitle = document.getElementById('siteTitle');
    siteTitle.addEventListener('click', () => {
        openTab('lobby');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    siteTitle.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); siteTitle.click(); }
    });

    initLounge();                            // 로비 대시보드 뼈대 + 전투력·성장 시트 불러오기
    renderRanking();                         // 처음엔 '불러오는 중'
    initLottery();
    buildInfoMenu().then(() => {             // 두 클랜 시트가 다 오면 랭킹·추첨기의 길드원 불러오기 준비
        onGuildDataReady();
        renderLotteryImport();
    });
    initSchedule();

    STAT_INPUT_IDS.forEach(id => {
        document.getElementById(id).addEventListener('input', checkBosses);
    });

    document.getElementById('gachaPullBtn').addEventListener('click', doGachaPull);
    document.getElementById('gachaResetBtn').addEventListener('click', resetGachaDia);

    checkBosses();
    renderGachaRates();
    updateGachaDisplay();
}

document.addEventListener('DOMContentLoaded', init);
