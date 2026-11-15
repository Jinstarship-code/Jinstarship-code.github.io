// 여러 탭에서 같이 쓰는 기능: 다크모드, 탭 전환, 공통 도우미

// ── 다크모드 ──
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeToggleBtn').textContent = theme === 'dark' ? '☀ 라이트모드' : '🌙 다크모드';
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    try {
        localStorage.setItem('vampir-theme', next);
    } catch (e) {}
    applyTheme(next);
}

function initTheme() {
    let saved = 'light';
    try {
        saved = localStorage.getItem('vampir-theme') || 'light';
    } catch (e) {}
    applyTheme(saved);
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
}

function makeCell(tag, text, className) {
    const el = document.createElement(tag);
    el.textContent = text;
    if (className) el.className = className;
    return el;
}

// ── 탭 전환 ──
function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    // 유틸리티 메뉴 안에 있는 탭이면 상단의 '유틸리티' 버튼을 강조
    const inUtility = UTILITY_ITEMS.some(item => item.key === tabId);
    const activeBtn = document.getElementById(inUtility ? 'btn-utility' : 'btn-' + tabId);
    activeBtn.classList.add('active');
    if (activeBtn.scrollIntoView) activeBtn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}
