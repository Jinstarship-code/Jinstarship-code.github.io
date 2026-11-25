// 🏠 로비: 길드 라운지 대시보드 (헤더 + 참여 랭킹 / 전투력 TOP / 주간 성장 TOP 카드 3개)
//  - 참여 랭킹의 순위 계산은 js/ranking.js (화면 그리기만 이 파일의 lgRenderList를 사용)
//  - 전투력 TOP, 주간 성장 TOP은 구글 시트 CSV(data.js의 LOUNGE_SHEET_URL)에서 읽어옵니다.

let loungeData = null;        // null = 불러오는 중, 'error' = 실패, 객체 = 불러온 순위
let lgPowerClan = 0;          // 전투력 카드에서 보고 있는 클랜 번호
let lgGrowthSel = 'total';    // 성장 카드: 'total'(종합) 또는 클랜 번호
let lgMobileTab = 0;          // 모바일에서 보고 있는 카드 (0 = 참여, 1 = 전투력, 2 = 성장)

// ── 작은 도우미 ──
function lgToneOf(clanName) {
    const c = LOUNGE_CLANS.find(x => x.name === clanName);
    return c ? c.tone : 'gray';
}

// '+12,500' / '-3,200' / '0' 처럼 부호를 붙여서 표시. 숫자가 아니면 '-'
function lgDeltaText(n) {
    if (n === null || n === undefined || isNaN(n)) return '-';
    if (n > 0) return '+' + n.toLocaleString();
    if (n < 0) return '-' + Math.abs(n).toLocaleString();
    return '0';
}
function lgDeltaClass(n) {
    if (n === null || n === undefined || isNaN(n)) return 'flat';
    return n > 0 ? 'up' : (n < 0 ? 'down' : 'flat');
}
// 시트 값 → 숫자 ('12,500', '+12,500', '−3,200', '▼3,200' 모두 가능, 그 외는 null)
function lgParseDelta(raw) {
    let s = String(raw === undefined || raw === null ? '' : raw).trim();
    if (!s) return null;
    const neg = /[▼↓]/.test(s);
    s = s.replace(/[▲▼↑↓,\s+]/g, '').replace(/[−–]/g, '-');
    if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
    const n = Number(s);
    return neg ? -Math.abs(n) : n;
}

function lgChip(label, isOn, onClick, className) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = (className || '') + (isOn ? ' on' : '');
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
}

const LG_ICONS = {
    people: '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="currentColor"><circle cx="24" cy="15" r="6.5"/><path d="M12 38v-3.5c0-5 5-8.5 12-8.5s12 3.5 12 8.5V38z"/><circle cx="9.5" cy="20.5" r="4.5" opacity=".7"/><path d="M1.5 36v-2.5c0-3.8 3.4-6.5 8-6.5 1.6 0 3 .3 4.2.9-2.4 1.8-3.7 4.2-3.7 7.1V36z" opacity=".7"/><circle cx="38.5" cy="20.5" r="4.5" opacity=".7"/><path d="M46.5 36v-2.5c0-3.8-3.4-6.5-8-6.5-1.6 0-3 .3-4.2.9 2.4 1.8 3.7 4.2 3.7 7.1V36z" opacity=".7"/></g></svg>',
    swords: '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8l22 22M40 8L18 30"/><path d="M27 33l6 6M21 33l-6 6"/><path d="M33 39l4-4M15 39l-4-4"/></g></svg>',
    growth: '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 36l12-12 8 8 16-18"/><path d="M32 14h10v10"/></g></svg>',
    crown: '<svg viewBox="0 0 40 26" aria-hidden="true"><path d="M3 22L1 6l9 8 10-12 10 12 9-8-2 16z" fill="currentColor"/></svg>',
    emblem: '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lgEmb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a21a33"/><stop offset="1" stop-color="#5d0f20"/></linearGradient></defs><path d="M4 18c10 0 18 4 28 12C42 22 50 18 60 18c-2 12-8 20-18 24-4 1.6-7 4.5-10 10-3-5.500-6-8.400-10-10C12 38 6 30 4 18z" fill="url(#lgEmb)" opacity=".9"/><path d="M32 8l9 6v14c0 7-4 12-9 16-5-4-9-9-9-16V14z" fill="#fff" stroke="#7a1226" stroke-width="2.4" stroke-linejoin="round"/><path d="M26 18l6 14 6-14" fill="none" stroke="#7a1226" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="12.500" r="2.200" fill="#d4a73a"/></svg>',
};

// ── 순위 목록 그리기 (세 카드가 같이 씀) ──
// items: [{ rank, name, clan, tone, valueText, valueClass }]  (valueText가 비면 오른쪽 수치 없음)
function lgRenderList(box, items) {
    box.innerHTML = '';
    if (!items.length) { box.appendChild(makeCell('p', '표시할 순위가 아직 없어요.', 'lg-empty')); return; }

    // TOP 3: 포디움 (2위 · 1위 · 3위 순서로 배치)
    const podium = document.createElement('div');
    podium.className = 'lg-podium';
    [1, 0, 2].forEach(pos => {
        const it = items[pos];
        if (!it) return;
        const slot = document.createElement('div');
        slot.className = 'lg-slot m' + Math.min(it.rank, 3) + (pos === 0 ? ' first' : '');
        const medal = document.createElement('div');
        medal.className = 'lg-medal';
        if (pos === 0) { const c = document.createElement('span'); c.className = 'lg-crown'; c.innerHTML = LG_ICONS.crown; medal.appendChild(c); }
        medal.appendChild(makeCell('b', String(it.rank)));
        slot.appendChild(medal);
        const nm = makeCell('div', it.name, 'lg-pname');
        nm.title = it.name;
        slot.appendChild(nm);
        slot.appendChild(makeCell('span', it.clan, 'lg-badge ' + it.tone));
        if (it.valueText) slot.appendChild(makeCell('div', it.valueText, 'lg-pval ' + (it.valueClass || '')));
        podium.appendChild(slot);
    });
    box.appendChild(podium);

    // 4위부터: 목록
    const list = document.createElement('div');
    list.className = 'lg-rows';
    items.slice(3).forEach(it => {
        const row = document.createElement('div');
        row.className = 'lg-row';
        row.appendChild(makeCell('span', String(it.rank), 'lg-no' + (it.rank <= 3 ? ' m' + it.rank : '')));
        row.appendChild(makeCell('span', Array.from(it.name)[0] || '?', 'lg-av'));
        const mid = document.createElement('div');
        mid.className = 'lg-mid';
        const nm = makeCell('span', it.name, 'lg-name');
        nm.title = it.name;
        mid.appendChild(nm);
        mid.appendChild(makeCell('span', it.clan, 'lg-badge ' + it.tone));
        row.appendChild(mid);
        if (it.valueText) row.appendChild(makeCell('span', it.valueText, 'lg-val ' + (it.valueClass || '')));
        list.appendChild(row);
    });
    box.appendChild(list);
}

// ── 대시보드 뼈대 ──
function lgBuildCard(opt) {
    const card = document.createElement('section');
    card.className = 'lg-card';
    const head = document.createElement('div');
    head.className = 'lg-card-head';
    const ico = document.createElement('span');
    ico.className = 'lg-ico';
    ico.innerHTML = LG_ICONS[opt.icon];
    head.appendChild(ico);
    const tt = document.createElement('div');
    tt.className = 'lg-card-tt';
    const line = document.createElement('div');
    line.className = 'lg-card-line';
    line.appendChild(makeCell('h4', opt.title));
    line.appendChild(makeCell('span', opt.tag, 'lg-tag'));
    tt.appendChild(line);
    tt.appendChild(makeCell('p', opt.sub, 'lg-card-sub' + (opt.subId ? '' : '')));
    if (opt.subId) tt.lastChild.id = opt.subId;
    head.appendChild(tt);
    head.appendChild(makeCell('span', 'TOP 10', 'lg-top'));
    card.appendChild(head);

    const controls = document.createElement('div');
    controls.className = 'lg-controls';
    card.appendChild(controls);
    const body = document.createElement('div');
    body.className = 'lg-body';
    card.appendChild(body);
    const foot = document.createElement('div');
    foot.className = 'lg-foot';
    card.appendChild(foot);
    return { card, controls, body, foot };
}

function initLounge() {
    const root = document.getElementById('lounge');
    if (!root) return;
    root.innerHTML = '';

    // 헤더: 엠블럼 + GUILD LOUNGE + SEASON / WEEKLY REPORT + 이번 주·클랜 수·총 인원
    const now = new Date();
    const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const md = d => schPad(d.getMonth() + 1) + '.' + schPad(d.getDate());
    const header = document.createElement('header');
    header.className = 'lg-header';
    const emb = document.createElement('span');
    emb.className = 'lg-emblem';
    emb.innerHTML = LG_ICONS.emblem;
    header.appendChild(emb);
    const ttl = document.createElement('div');
    ttl.className = 'lg-head-tt';
    ttl.appendChild(makeCell('h3', 'GUILD LOUNGE'));
    const sub = document.createElement('p');
    sub.className = 'lg-head-sub';
    sub.appendChild(makeCell('span', LOUNGE_SEASON, 'lg-season'));
    sub.appendChild(makeCell('span', 'WEEKLY REPORT'));
    ttl.appendChild(sub);
    ttl.appendChild(makeCell('p', '함께하는 오늘, 더 강해지는 우리', 'lg-head-msg'));
    header.appendChild(ttl);
    const stats = document.createElement('div');
    stats.className = 'lg-stats';
    [['이번 주', md(mon) + ' ~ ' + md(sun), null], ['클랜 수', LOUNGE_CLANS.length + '개', null], ['총 인원', '-', 'lgTotal']].forEach(([k, v, id]) => {
        const s = document.createElement('div');
        s.className = 'lg-stat';
        s.appendChild(makeCell('small', k));
        const b = makeCell('b', v);
        if (id) b.id = id;
        s.appendChild(b);
        stats.appendChild(s);
    });
    header.appendChild(stats);
    root.appendChild(header);

    const cards = document.createElement('div');
    cards.className = 'lg-cards';

    // 카드 1: 참여 랭킹 (id는 ranking.js가 채움)
    const c1 = lgBuildCard({ icon: 'people', title: '참여 랭킹', tag: 'WEEKLY', sub: '주간 활동 횟수를 기준으로 한 순위입니다.', subId: 'rankSub' });
    c1.controls.innerHTML = '<div id="rankWeeks" class="lg-weeks"></div><div id="rankClans" class="lg-seg"></div>';
    c1.body.id = 'rankList';
    c1.body.appendChild(makeCell('p', '불러오는 중...', 'lg-empty'));
    c1.foot.id = 'rankFoot';
    cards.appendChild(c1.card);

    // 카드 2: 전투력 TOP (클랜별, 수치는 공개하지 않음)
    const c2 = lgBuildCard({ icon: 'swords', title: '전투력 TOP', tag: 'TOTAL', sub: '클랜별 전투력 순위입니다. (전투력 수치는 비공개)' });
    c2.controls.id = 'lgPowerCtl'; c2.body.id = 'lgPowerList'; c2.foot.id = 'lgPowerFoot';
    c2.body.appendChild(makeCell('p', '불러오는 중...', 'lg-empty'));
    cards.appendChild(c2.card);

    // 카드 3: 주간 성장 TOP (종합은 증감 수치 표시)
    const c3 = lgBuildCard({ icon: 'growth', title: '주간 성장 TOP', tag: 'GROWTH', sub: '지난주 대비 전투력 성장량을 기준으로 한 순위입니다.' });
    c3.controls.id = 'lgGrowthCtl'; c3.body.id = 'lgGrowthList'; c3.foot.id = 'lgGrowthFoot';
    c3.body.appendChild(makeCell('p', '불러오는 중...', 'lg-empty'));
    cards.appendChild(c3.card);
    // 모바일(폭 720px 이하)에서는 위 탭으로 카드 3개를 하나의 카드처럼 번갈아 보여줌 (넓은 화면에서는 탭이 숨겨지고 카드 3개가 나란히 보임)
    const merge = document.createElement('div');
    merge.className = 'lg-merge';
    const tabs = document.createElement('div');
    tabs.className = 'lg-tabs';
    tabs.setAttribute('role', 'tablist');
    ['참여 랭킹', '전투력 TOP', '주간 성장'].forEach((label, i) => {
        const b = lgChip(label, i === lgMobileTab, () => lgSetTab(i), 'lg-tab');
        b.setAttribute('role', 'tab');
        tabs.appendChild(b);
    });
    [c1, c2, c3].forEach((c, i) => c.card.classList.toggle('on', i === lgMobileTab));
    merge.appendChild(tabs);
    merge.appendChild(cards);
    root.appendChild(merge);

    root.appendChild(makeCell('p', '※ 전투력 순위는 시트에 게시된 TOP 10 기준이며, 전투력 수치는 공개하지 않아요. 주간 성장은 두 클랜 종합 기준이에요.', 'lg-note'));

    loadLoungeSheet();
}

// 모바일 탭 전환
function lgSetTab(i) {
    lgMobileTab = i;
    document.querySelectorAll('#lounge .lg-tab').forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    document.querySelectorAll('#lounge .lg-card').forEach((c, k) => c.classList.toggle('on', k === i));
}

// 참여 랭킹 카드의 '전체 랭킹 보기'와 총 인원 (ranking.js에서 호출)
function lgSetTotal(n) {
    const el = document.getElementById('lgTotal');
    if (el) el.textContent = n + '명';
}

// ── 전투력·성장 시트 ──
function parseLoungeSheet(rows) {
    const hi = rows.findIndex(r => r.some(c => String(c).trim() === '구분'));
    if (hi < 0) throw new Error("머리글('구분')을 찾지 못했어요");
    const head = rows[hi].map(c => String(c).trim());
    const starts = [];
    head.forEach((c, i) => { if (c === '구분') starts.push(i); });
    const deltaCol = head.indexOf('전투력 증감');
    const clanCol = head.indexOf('소속클랜');
    const out = { power: [[], []], growth: [[], []], total: [] };

    rows.slice(hi + 1).forEach(r => {
        starts.forEach((st, k) => {
            const label = String(r[st] || '').trim();
            const name = String(r[st + 2] || '').trim();
            if (!label || !name) return;                       // 빈 칸은 건너뜀
            const rank = parseNumber(r[st + 1]);
            const entry = { rank, name };
            if (label.includes('종합')) {
                entry.delta = deltaCol >= 0 ? lgParseDelta(r[deltaCol]) : null;
                entry.clan = clanCol >= 0 ? String(r[clanCol] || '').trim() : '';
                out.total.push(entry);
            } else if (k < 2 && label.includes('성장')) {
                entry.clan = LOUNGE_CLANS[k].name; out.growth[k].push(entry);
            } else if (k < 2 && label.includes('전투력')) {
                entry.clan = LOUNGE_CLANS[k].name; out.power[k].push(entry);
            }
        });
    });

    // 시트의 순위 순서로 정리 (순위가 비어 있으면 줄 순서대로)
    const byRank = list => {
        const arr = list.map((e, i) => Object.assign(e, { _i: i }));
        arr.sort((a, b) => (a.rank === null ? 1e9 : a.rank) - (b.rank === null ? 1e9 : b.rank) || a._i - b._i);
        arr.forEach((e, i) => { if (e.rank === null) e.rank = i + 1; });
        return arr.slice(0, 10);
    };
    out.power = out.power.map(byRank);
    out.growth = out.growth.map(byRank);

    // 종합 성장: 증감 수치가 높은 순서로 다시 정렬하고, 같은 수치는 같은 순위
    const withNum = out.total.filter(e => e.delta !== null);
    const noNum = out.total.filter(e => e.delta === null);
    withNum.sort((a, b) => b.delta - a.delta || (a.rank === null ? 1e9 : a.rank) - (b.rank === null ? 1e9 : b.rank));
    withNum.forEach(e => { e.rank = 1 + withNum.filter(o => o.delta > e.delta).length; });
    out.total = withNum.concat(byRank(noNum).map(e => Object.assign(e, { rank: withNum.length + 1 }))).slice(0, 10);
    return out;
}

async function loadLoungeSheet() {
    try {
        let text;
        if (USE_DUMMY_DATA) {
            text = buildDummyLoungeCSV();
        } else {
            if (!LOUNGE_SHEET_URL) throw new Error('js/data.js의 LOUNGE_SHEET_URL이 비어 있습니다.');
            const res = await fetch(LOUNGE_SHEET_URL, { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            text = await res.text();
        }
        loungeData = parseLoungeSheet(parseCSV(text));
    } catch (err) {
        console.error('[로비] 전투력·성장 시트 불러오기 실패:', err);
        loungeData = 'error';
    }
    renderPowerCard();
    renderGrowthCard();
}

function lgSheetStatus(box, ctl, foot) {
    if (loungeData === null || loungeData === 'error') {
        if (ctl) ctl.innerHTML = '';
        foot.textContent = '';
        box.innerHTML = '';
        box.appendChild(makeCell('p', loungeData === null ? '불러오는 중...' : '순위를 불러오지 못했어요. 잠시 후 새로고침 해주세요.', 'lg-empty'));
        return false;
    }
    return true;
}

function renderPowerCard() {
    const box = document.getElementById('lgPowerList'), ctl = document.getElementById('lgPowerCtl'), foot = document.getElementById('lgPowerFoot');
    if (!box || !lgSheetStatus(box, ctl, foot)) return;
    ctl.innerHTML = '';
    const seg = document.createElement('div');
    seg.className = 'lg-seg';
    LOUNGE_CLANS.forEach((c, i) => seg.appendChild(lgChip(c.name, i === lgPowerClan, () => { lgPowerClan = i; renderPowerCard(); })));
    ctl.appendChild(seg);
    const clan = LOUNGE_CLANS[lgPowerClan];
    lgRenderList(box, loungeData.power[lgPowerClan].map(e => ({ rank: e.rank, name: e.name, clan: clan.name, tone: clan.tone })));
    foot.textContent = clan.name + ' 전투력 순위 · 전투력 수치는 비공개';
}

function renderGrowthCard() {
    const box = document.getElementById('lgGrowthList'), ctl = document.getElementById('lgGrowthCtl'), foot = document.getElementById('lgGrowthFoot');
    if (!box || !lgSheetStatus(box, ctl, foot)) return;
    ctl.innerHTML = '';
    const seg = document.createElement('div');
    seg.className = 'lg-seg';
    seg.appendChild(lgChip('종합', lgGrowthSel === 'total', () => { lgGrowthSel = 'total'; renderGrowthCard(); }));
    LOUNGE_CLANS.forEach((c, i) => seg.appendChild(lgChip(c.name, lgGrowthSel === i, () => { lgGrowthSel = i; renderGrowthCard(); })));
    ctl.appendChild(seg);

    if (lgGrowthSel === 'total') {
        lgRenderList(box, loungeData.total.map(e => ({
            rank: e.rank, name: e.name, clan: e.clan || '-', tone: lgToneOf(e.clan),
            valueText: lgDeltaText(e.delta), valueClass: lgDeltaClass(e.delta),
        })));
        foot.textContent = '두 클랜 종합 · 주간 전투력 증감 기준';
    } else {
        const clan = LOUNGE_CLANS[lgGrowthSel];
        lgRenderList(box, loungeData.growth[lgGrowthSel].map(e => ({ rank: e.rank, name: e.name, clan: clan.name, tone: clan.tone })));
        foot.textContent = clan.name + ' 주간 성장 순위 · 증감 수치는 종합에서만 표시';
    }
}
