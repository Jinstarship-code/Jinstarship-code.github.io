// 상단 '유틸리티' 드롭다운 메뉴 (마우스를 올리면 열리고, 터치 화면에서는 눌러서 열립니다)

let utilityCloseTimer = null;

function buildUtilityMenu() {
    const btn = document.getElementById('btn-utility');
    const menu = document.getElementById('utilityMenu');
    menu.innerHTML = '';

    UTILITY_ITEMS.forEach(item => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'submenu-item';
        b.dataset.tab = item.key;
        b.textContent = item.label;
        b.addEventListener('click', () => {
            closeUtilityMenu();
            openTab(item.key);
        });
        menu.appendChild(b);
    });

    // 마우스인지 터치인지는 화면 설정이 아니라 실제 입력 장치(pointerType)로 구분합니다.
    let lastPointerType = 'mouse';
    btn.addEventListener('pointerdown', e => { lastPointerType = e.pointerType; });
    btn.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') openUtilityMenu(); });
    btn.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') scheduleCloseUtilityMenu(); });
    menu.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') cancelCloseUtilityMenu(); });
    menu.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') scheduleCloseUtilityMenu(); });

    btn.addEventListener('click', e => {
        e.stopPropagation();
        if (lastPointerType === 'mouse' && e.detail > 0) { openUtilityMenu(); return; } // 마우스: 올리면 이미 열려 있음
        if (menu.classList.contains('open')) closeUtilityMenu();                         // 터치/키보드: 눌러서 열고 닫기
        else openUtilityMenu();
    });

    document.addEventListener('click', e => {
        if (!menu.contains(e.target) && e.target !== btn) closeUtilityMenu();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeUtilityMenu(); });
    window.addEventListener('resize', closeUtilityMenu);
    window.addEventListener('scroll', closeUtilityMenu, true);
}

function openUtilityMenu() {
    cancelCloseUtilityMenu();
    const btn = document.getElementById('btn-utility');
    const menu = document.getElementById('utilityMenu');

    menu.querySelectorAll('.submenu-item').forEach(el => {
        const tab = document.getElementById(el.dataset.tab);
        el.classList.toggle('active', !!tab && tab.classList.contains('active'));
    });

    menu.classList.add('open'); // 먼저 보이게 해야 폭을 잴 수 있음
    const r = btn.getBoundingClientRect();
    const w = menu.offsetWidth;
    menu.style.top = r.bottom + 'px';
    menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    btn.setAttribute('aria-expanded', 'true');
}

function closeUtilityMenu() {
    cancelCloseUtilityMenu();
    document.getElementById('utilityMenu').classList.remove('open');
    document.getElementById('btn-utility').setAttribute('aria-expanded', 'false');
}

function scheduleCloseUtilityMenu() {
    cancelCloseUtilityMenu();
    utilityCloseTimer = setTimeout(closeUtilityMenu, 180);
}

function cancelCloseUtilityMenu() {
    if (utilityCloseTimer) { clearTimeout(utilityCloseTimer); utilityCloseTimer = null; }
}
