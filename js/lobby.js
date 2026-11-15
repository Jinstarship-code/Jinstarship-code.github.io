// 🏠 로비 탭 + 📢 공지사항 탭

function renderNotices() {
    const list = document.getElementById('noticeList');
    list.innerHTML = '';
    NOTICES.forEach(n => {
        const card = document.createElement('div');
        card.className = 'notice-card';
        card.id = 'notice-' + n.key;

        const head = document.createElement('div');
        head.className = 'notice-head';
        head.appendChild(makeCell('h3', n.title));
        head.appendChild(makeCell('span', n.date, 'notice-date'));
        card.appendChild(head);

        card.appendChild(makeCell('p', n.body, 'notice-body'));
        list.appendChild(card);
    });
}

// 공지사항 탭으로 이동해서 해당 공지로 스크롤 + 잠깐 강조
function goNotice(key) {
    openTab('notice');
    const el = document.getElementById('notice-' + key);
    if (!el) return;
    if (el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
}

function renderLobbyCards() {
    const grid = document.getElementById('newsGrid');
    grid.innerHTML = '';
    LOBBY_CARDS.forEach(c => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'news-card';
        btn.style.setProperty('--news-color', c.color);
        btn.appendChild(makeCell('div', c.icon + ' ' + c.title, 'news-card-title'));
        btn.appendChild(makeCell('p', c.desc, 'news-card-desc'));
        btn.appendChild(makeCell('span', '자세히 보기 →', 'news-card-go'));
        btn.addEventListener('click', () => goNotice(c.noticeKey));
        grid.appendChild(btn);
    });
}
