// 시작 코드: 페이지가 열리면 각 탭을 준비합니다. (가장 마지막에 불러옵니다)

// ── 이벤트 연결 (인라인 onclick/oninput 대신 한 곳에서 관리) ──
function init() {
    initTheme();
    buildBossTable();

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => openTab(btn.dataset.tab));
    });

    buildInfoMenu();
    renderLobbyCards();
    renderNotices();
    loadGuildSheet();

    STAT_INPUT_IDS.forEach(id => {
        document.getElementById(id).addEventListener('input', checkBosses);
    });

    document.getElementById('gachaPullBtn').addEventListener('click', doGachaPull);
    document.getElementById('gachaResetBtn').addEventListener('click', resetGachaDia);

    checkBosses();
}

document.addEventListener('DOMContentLoaded', init);
