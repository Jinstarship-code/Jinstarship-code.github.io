// 🏠 로비 탭

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
        btn.addEventListener('click', () => openTab('schedule'));
        grid.appendChild(btn);
    });
}
