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
    const sub = document.getElementById('rankSub');
    const foot = document.getElementById('rankFoot');
    weeksBox.innerHTML = ''; clansBox.innerHTML = ''; listBox.innerHTML = ''; foot.innerHTML = '';

    if (!rankReady) {
        listBox.appendChild(makeCell('p', '불러오는 중...', 'lg-empty'));
        return;
    }

    const leaves = getInfoLeaves().filter(l => GUILD_DATA[l.key]);
    const totalClans = getInfoLeaves().filter(l => l.sheetUrl !== undefined).length;
    const entries = collectRankEntries(leaves);
    const weeks = [...new Set(entries.flatMap(e => Object.keys(e.weeks).map(Number)))].sort((a, b) => a - b);

    if (leaves.length === 0 || weeks.length === 0) {
        sub.textContent = '';
        listBox.appendChild(makeCell('p', '랭킹을 불러오지 못했어요.', 'lg-empty'));
        return;
    }

    const nowWeek = currentRankWeek(entries, weeks);
    const week = (rankWeek !== null && weeks.includes(rankWeek)) ? rankWeek : nowWeek;
    if (rankClan !== 'all' && !leaves.some(l => l.key === rankClan)) rankClan = 'all';

    // 주차 버튼
    weeks.forEach(w => {
        const label = w + '주차' + (w === nowWeek ? ' · 이번 주' : '');
        weeksBox.appendChild(makeRankButton(label, w === week, 'lg-chip', () => { rankWeek = w; renderRanking(); }));
    });

    const onChip = weeksBox.querySelector('.on');   // 선택한 주차가 보이도록 칩 줄만 옆으로 이동
    if (onChip) weeksBox.scrollLeft = onChip.offsetLeft - weeksBox.clientWidth / 2 + onChip.offsetWidth / 2;

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

    const scope = rankClan === 'all' ? leaves.map(l => l.label).join(' + ') + (leaves.length > 1 ? ' 합산' : '') : leaves.find(l => l.key === rankClan).label;
    sub.textContent = scope + ' · ' + week + '주차 활동 횟수 기준';

    if (shown.length === 0) {
        listBox.appendChild(makeCell('p', week + '주차 활동 기록이 아직 없어요.', 'lg-empty'));
    } else {
        lgRenderList(listBox, shown.map(({ e, value, rank }) => ({
            rank, name: e.name, clan: e.clanLabel, tone: lgToneOf(e.clanLabel), valueText: value.toLocaleString() + '회',
        })));
    }

    // 카드 아래: 전체 랭킹 보기(= 정보 탭의 길드원 표) + 인원수
    const inScope = entries.filter(e => e.name && (rankClan === 'all' || e.clanKey === rankClan)).length;
    lgSetTotal(entries.filter(e => e.name).length);
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'lg-more';
    go.textContent = '전체 랭킹 보기 →';
    go.addEventListener('click', () => openTab('info'));
    foot.appendChild(go);
    foot.appendChild(makeCell('span', '총 ' + inScope + '명', 'lg-count'));
    const notes = ['같은 횟수는 같은 순위예요.'];
    if (leaves.length < totalClans) notes.push('일부 클랜 데이터를 불러오지 못했어요.');
    foot.appendChild(makeCell('p', notes.join(' '), 'lg-foot-note'));
}
