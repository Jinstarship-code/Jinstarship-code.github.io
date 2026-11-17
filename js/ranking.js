// 🏆 로비의 참여 랭킹: 두 클랜의 주차별 활동 횟수를 합쳐서 순위를 매깁니다. (시트 데이터는 info.js가 불러온 GUILD_DATA를 사용)

let rankReady = false;   // 클랜 시트 불러오기가 끝났는지
let rankWeek = null;     // 사용자가 고른 주차 (null이면 '이번 주')
let rankClan = 'all';    // 'all' 또는 클랜 key

function onGuildDataReady() {
    rankReady = true;
    renderRanking();
}

// 불러온 클랜들(메뉴 순서대로)의 길드원 활동 기록을 한 목록으로 모음
function collectRankEntries(leaves) {
    const entries = [];
    leaves.forEach((leaf, clanIndex) => {
        const data = GUILD_DATA[leaf.key].data;
        const nickCol = data.header.indexOf('닉네임');
        const weekCols = {};   // 주차 번호 → 열 번호
        data.colIdx.forEach(i => {
            const m = /^(\d+)주차$/.exec(data.header[i]);
            if (m) weekCols[Number(m[1])] = i;
        });
        data.members.forEach(row => {
            const weeks = {};
            Object.keys(weekCols).forEach(w => { weeks[w] = parseNumber(row[weekCols[w]]); });
            entries.push({ name: (row[nickCol] || '').trim(), clanKey: leaf.key, clanLabel: leaf.label, clanIndex, weeks });
        });
    });
    return entries;
}

// '이번 주' = 활동이 기록된 가장 최근 주차 (data.js의 RANKING_WEEK에 숫자를 넣으면 그 주차로 고정)
function currentRankWeek(entries, weeks) {
    if (typeof RANKING_WEEK === 'number') return RANKING_WEEK;
    let current = null;
    weeks.forEach(w => {
        if (entries.some(e => (e.weeks[w] || 0) > 0)) current = w;
    });
    return current !== null ? current : weeks[0];
}

function makeRankButton(label, isOn, className, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = className + (isOn ? ' on' : '');
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
}

function renderRanking() {
    const listBox = document.getElementById('rankList');
    const weeksBox = document.getElementById('rankWeeks');
    const clansBox = document.getElementById('rankClans');
    const title = document.getElementById('rankTitle');
    const sub = document.getElementById('rankSub');
    const foot = document.getElementById('rankFoot');
    weeksBox.innerHTML = ''; clansBox.innerHTML = ''; listBox.innerHTML = ''; foot.textContent = '';

    if (!rankReady) {
        listBox.appendChild(makeCell('p', '불러오는 중...', 'info-empty'));
        return;
    }

    const leaves = getInfoLeaves().filter(l => GUILD_DATA[l.key]);
    const totalClans = getInfoLeaves().filter(l => l.sheetUrl !== undefined).length;
    const entries = collectRankEntries(leaves);
    const weeks = [...new Set(entries.flatMap(e => Object.keys(e.weeks).map(Number)))].sort((a, b) => a - b);

    if (leaves.length === 0 || weeks.length === 0) {
        title.textContent = '🏆 참여 랭킹';
        sub.textContent = '';
        listBox.appendChild(makeCell('p', '랭킹을 불러오지 못했어요.', 'info-empty'));
        return;
    }

    const nowWeek = currentRankWeek(entries, weeks);
    const week = (rankWeek !== null && weeks.includes(rankWeek)) ? rankWeek : nowWeek;
    if (rankClan !== 'all' && !leaves.some(l => l.key === rankClan)) rankClan = 'all';

    // 주차 버튼
    weeks.forEach(w => {
        const label = w + '주차' + (w === nowWeek ? ' · 이번 주' : '');
        weeksBox.appendChild(makeRankButton(label, w === week, 'rk-chip', () => { rankWeek = w; renderRanking(); }));
    });

    // 클랜 선택 버튼 (전체 / 클랜별)
    clansBox.style.display = leaves.length > 1 ? 'inline-flex' : 'none';
    if (leaves.length > 1) {
        clansBox.appendChild(makeRankButton('전체', rankClan === 'all', '', () => { rankClan = 'all'; renderRanking(); }));
        leaves.forEach(l => clansBox.appendChild(makeRankButton(l.label, rankClan === l.key, '', () => { rankClan = l.key; renderRanking(); })));
    }

    // 순위 계산 (같은 횟수는 같은 순위, 활동 0회는 제외)
    const pool = entries.filter(e => e.name && (rankClan === 'all' || e.clanKey === rankClan) && (e.weeks[week] || 0) > 0);
    pool.sort((a, b) => b.weeks[week] - a.weeks[week]);
    const ranked = pool.map(e => ({ e, value: e.weeks[week], rank: 1 + pool.filter(o => o.weeks[week] > e.weeks[week]).length }));
    const shown = ranked.filter(r => r.rank <= RANKING_TOP).slice(0, 20);

    title.textContent = '🏆 ' + week + '주차 참여 랭킹 TOP ' + RANKING_TOP;
    const scope = rankClan === 'all' ? leaves.map(l => l.label).join(' + ') + (leaves.length > 1 ? ' 합산' : '') : leaves.find(l => l.key === rankClan).label;
    sub.textContent = scope + ' · ' + week + '주차 활동 횟수 기준';

    if (shown.length === 0) {
        listBox.appendChild(makeCell('p', week + '주차 활동 기록이 아직 없어요.', 'info-empty'));
    }
    const max = shown.length ? shown[0].value : 1;
    shown.forEach(({ e, value, rank }) => {
        const row = document.createElement('div');
        row.className = 'rk-row';
        row.appendChild(makeCell('span', String(rank), 'rk-no' + (rank <= 3 ? ' m' + rank : '')));
        row.appendChild(makeCell('span', Array.from(e.name)[0] || '?', 'rk-av'));

        const mid = document.createElement('div');
        mid.className = 'rk-mid';
        const top = document.createElement('div');
        top.className = 'rk-top';
        const nameEl = makeCell('span', e.name, 'rk-name');
        nameEl.title = e.name;
        top.appendChild(nameEl);
        top.appendChild(makeCell('span', e.clanLabel, 'rk-clan c' + (e.clanIndex % 3)));
        mid.appendChild(top);
        const bar = document.createElement('div');
        bar.className = 'rk-bar';
        const fill = document.createElement('i');
        fill.style.width = Math.max(4, Math.round(value / max * 100)) + '%';
        bar.appendChild(fill);
        mid.appendChild(bar);
        row.appendChild(mid);

        row.appendChild(makeCell('span', value.toLocaleString() + '회', 'rk-cnt'));
        listBox.appendChild(row);
    });

    const notes = ['같은 횟수는 같은 순위예요.'];
    if (leaves.length < totalClans) notes.push('일부 클랜 데이터를 불러오지 못했어요.');
    foot.textContent = notes.join(' ');
}
