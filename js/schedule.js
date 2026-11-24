// 📅 스케줄 탭: 가로 = 요일(월~일), 세로 = 시간(1시간 단위). 일정은 구글 시트(js/data.js의 SCHEDULE_SHEET_URL)에서 읽어옵니다.

const SCH_DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const SCH_MIN_VISUAL = 30;      // 너무 짧은 일정(예: 10분)도 겹침 계산에서는 이만큼(분) 차지하는 것으로 봄

let schItems = null;            // null = 불러오는 중, 'error' = 실패, 배열 = 불러온 일정
let schWeekOffset = 0;          // 0 = 이번 주, -1 = 지난주, 1 = 다음 주
let schSelectedKey = null;      // 눌러서 선택한 일정
let schPendingScroll = true;    // 탭이 열릴 때 가장 이른 일정 위치로 스크롤해야 하는지

function schPad(n) { return String(n).padStart(2, '0'); }

// ── 시트 값 읽기 ──
// 날짜: '2026-11-24', '2026. 11. 26', '2026/11/26' 모두 가능. 비어 있으면 null
function schParseDate(str) {
    const m = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(String(str || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

// 시간: '20:00', '8:30', '오후 8:00:00' 가능 → 하루 중 몇 분인지
function schParseTime(str) {
    const s = String(str || '').trim();
    const m = /(\d{1,2}):(\d{2})/.exec(s);
    if (!m) return null;
    let h = +m[1];
    if (/오후|PM/i.test(s) && h < 12) h += 12;
    if (/오전|AM/i.test(s) && h === 12) h = 0;
    return h * 60 + +m[2];
}

// 요일: '매일', '월요일', '월,수', '평일', '주말' → 요일 번호 배열(월=0…일=6), 전체 요일이면 null
function schParseDays(str) {
    const s = String(str || '').replace(/\s/g, '');
    if (s === '' || /매일|everyday|daily/i.test(s)) return null;
    if (s.includes('평일')) return [0, 1, 2, 3, 4];
    if (s.includes('주말')) return [5, 6];
    const days = [];
    (s.replace(/요일/g, '').match(/[월화수목금토일]/g) || []).forEach(ch => {
        const i = SCH_DAYS.indexOf(ch);
        if (!days.includes(i)) days.push(i);
    });
    if (days.length === 0) { console.warn('[스케줄] 알 수 없는 요일 값:', str); return null; }
    return days;
}

function schHashColor(title) {
    let h = 0;
    for (const ch of title) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return SCHEDULE_COLORS[h % SCHEDULE_COLORS.length];
}

function parseScheduleSheet(rows) {
    if (rows.length < 2) return [];
    const header = rows[0].map(x => String(x).trim().toLowerCase());
    const col = name => header.indexOf(name);
    const idx = {
        type: col('schedule_type'), title: col('title'), weekday: col('weekday'),
        sd: col('start_date'), ed: col('end_date'), st: col('start_time'), et: col('end_time'), desc: col('description'),
    };
    const get = (row, i) => (i >= 0 && row[i] !== undefined ? String(row[i]).trim() : '');
    const items = [];
    rows.slice(1).forEach((row, n) => {
        const title = get(row, idx.title);
        const start = schParseTime(get(row, idx.st));
        let end = schParseTime(get(row, idx.et));
        if (!title || start === null) return;               // 제목이나 시작 시간이 없는 줄은 건너뜀
        if (end === null || end <= start) end = end === null ? start + 60 : 24 * 60;   // 끝 시간이 없으면 1시간, 자정을 넘기면 24:00까지
        const type = get(row, idx.type);
        items.push({
            key: 'sch' + n,
            type: /일회/.test(type) ? '일회성' : '반복',
            title,
            days: schParseDays(get(row, idx.weekday)),
            startDate: schParseDate(get(row, idx.sd)),
            endDate: schParseDate(get(row, idx.ed)),
            start, end,
            desc: get(row, idx.desc),
            color: schHashColor(title),
        });
    });
    return items;
}

// 그 날짜(date)에 열리는 일정만 골라냄
function schEventsOn(date, dayIdx) {
    const t = date.getTime();
    return schItems.filter(it =>
        (!it.startDate || t >= it.startDate.getTime()) &&
        (!it.endDate || t <= it.endDate.getTime()) &&
        (!it.days || it.days.includes(dayIdx)));
}

// 시간이 겹치는 일정은 가로로 나란히(lane) 배치
function schAssignLanes(events) {
    const sorted = events.slice().sort((a, b) => a.start - b.start);
    const laneEnds = [];
    sorted.forEach(ev => {
        let lane = laneEnds.findIndex(end => end <= ev.start);
        if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
        laneEnds[lane] = Math.max(ev.end, ev.start + SCH_MIN_VISUAL);
        ev._lane = lane;
    });
    return Math.max(1, laneEnds.length);
}

function schTimeText(min) { return schPad(Math.floor(min / 60)) + ':' + schPad(min % 60); }
function schDateText(d) { return `${d.getMonth() + 1}/${d.getDate()}`; }

// ── 시작: 시트를 불러오고 화면 이벤트 연결 ──
async function initSchedule() {
    document.getElementById('schPrev').addEventListener('click', () => schMoveWeek(-1));
    document.getElementById('schNext').addEventListener('click', () => schMoveWeek(1));
    document.getElementById('schToday').addEventListener('click', () => schMoveWeek(0));
    renderSchedule();   // '불러오는 중' 표시

    try {
        let text;
        if (USE_DUMMY_DATA) {
            text = buildDummyScheduleCSV();
        } else {
            if (!SCHEDULE_SHEET_URL) throw new Error('js/data.js의 SCHEDULE_SHEET_URL이 비어 있습니다.');
            const res = await fetch(SCHEDULE_SHEET_URL, { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            text = await res.text();
        }
        schItems = parseScheduleSheet(parseCSV(text));
    } catch (err) {
        console.error('[스케줄] 시트 불러오기 실패:', err);
        schItems = 'error';
    }
    schPendingScroll = true;
    renderSchedule();
}

function schMoveWeek(step) {
    schWeekOffset = step === 0 ? 0 : schWeekOffset + step;
    schSelectedKey = null;
    schPendingScroll = true;
    renderSchedule();
    schApplyScroll();
}

function renderSchedule() {
    const board = document.getElementById('scheduleBoard');
    const detail = document.getElementById('scheduleDetail');
    if (!board) return;
    board.innerHTML = '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayIdx = (now.getDay() + 6) % 7;                       // 월=0 … 일=6
    const monday = new Date(today); monday.setDate(today.getDate() - todayIdx + schWeekOffset * 7);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    document.getElementById('scheduleWeek').textContent =
        `${monday.getMonth() + 1}월 ${monday.getDate()}일 ~ ${sunday.getMonth() + 1}월 ${sunday.getDate()}일` +
        (schWeekOffset === 0 ? ' (이번 주)' : '');

    if (schItems === null) { board.appendChild(makeCell('div', '스케줄을 불러오는 중입니다…', 'sch-status')); detail.innerHTML = ''; return; }
    if (schItems === 'error') { board.appendChild(makeCell('div', '스케줄을 불러오지 못했습니다. 잠시 후 새로고침 해주세요.', 'sch-status')); detail.innerHTML = ''; return; }

    const hours = SCHEDULE_TO - SCHEDULE_FROM;
    const totalMin = hours * 60;
    const grid = document.createElement('div');
    grid.className = 'sch-grid';
    grid.style.setProperty('--hours', hours);

    // 머리글: 시간 + 월 화 수 … 일 (날짜 포함)
    grid.appendChild(makeCell('div', '시간', 'sch-corner'));
    const days = SCH_DAYS.map((name, d) => {
        const date = new Date(monday); date.setDate(monday.getDate() + d);
        const isToday = date.getTime() === today.getTime();
        const head = makeCell('div', '', 'sch-dayhead' + (isToday ? ' today' : ''));
        head.appendChild(makeCell('b', name));
        head.appendChild(makeCell('small', schDateText(date)));
        grid.appendChild(head);
        return { date, isToday };
    });

    // 왼쪽 시간 눈금 (1시간 단위)
    const times = document.createElement('div');
    times.className = 'sch-times';
    for (let h = SCHEDULE_FROM; h < SCHEDULE_TO; h++) times.appendChild(makeCell('div', schPad(h) + ':00', 'sch-time'));
    grid.appendChild(times);

    let weekFirst = Infinity, weekCount = 0, selected = null;
    days.forEach(({ date, isToday }, d) => {
        const col = document.createElement('div');
        col.className = 'sch-col' + (isToday ? ' today' : '');
        const events = schEventsOn(date, d).map(it => Object.assign({}, it));
        const lanes = schAssignLanes(events);

        events.forEach(ev => {
            const s = Math.max(ev.start, SCHEDULE_FROM * 60);
            const e = Math.min(ev.end, SCHEDULE_TO * 60);
            if (e <= s) return;
            weekCount++; weekFirst = Math.min(weekFirst, s);
            const evKey = ev.key + '@' + schDateText(date);
            const bar = document.createElement('button');
            bar.type = 'button';
            bar.className = 'sch-event' + (ev.type === '일회성' ? ' once' : '') + (e - s < 45 ? ' compact' : '') + (evKey === schSelectedKey ? ' selected' : '');
            bar.style.top = ((s - SCHEDULE_FROM * 60) / totalMin * 100) + '%';
            bar.style.height = ((e - s) / totalMin * 100) + '%';
            bar.style.left = (ev._lane / lanes * 100) + '%';
            bar.style.width = (100 / lanes) + '%';
            bar.style.background = ev.color;
            bar.title = `${ev.title}  ${schTimeText(ev.start)} ~ ${schTimeText(ev.end)}` + (ev.desc ? '\n' + ev.desc : '');
            bar.appendChild(makeCell('span', ev.title, 'sch-ev-title'));
            bar.appendChild(makeCell('small', schTimeText(ev.start) + '~' + schTimeText(ev.end), 'sch-ev-time'));
            bar.addEventListener('click', () => { schSelectedKey = (schSelectedKey === evKey ? null : evKey); renderSchedule(); });
            col.appendChild(bar);
            if (evKey === schSelectedKey) selected = { ev, date, d };
        });

        // 오늘 칸에는 현재 시각 표시선
        if (isToday) {
            const nowMin = now.getHours() * 60 + now.getMinutes();
            if (nowMin >= SCHEDULE_FROM * 60 && nowMin <= SCHEDULE_TO * 60) {
                const line = document.createElement('div');
                line.className = 'sch-now';
                line.style.top = ((nowMin - SCHEDULE_FROM * 60) / totalMin * 100) + '%';
                col.appendChild(line);
            }
        }
        grid.appendChild(col);
    });

    const wrap = document.createElement('div');
    wrap.className = 'sch-scroll';
    wrap.appendChild(grid);
    board.appendChild(wrap);
    wrap.dataset.first = isFinite(weekFirst) ? weekFirst : '';

    // 아래: 선택한 일정의 자세한 내용
    detail.innerHTML = '';
    if (selected) {
        const { ev, date, d } = selected;
        const card = document.createElement('div');
        card.className = 'sch-detail-card';
        card.style.borderLeftColor = ev.color;
        const h = makeCell('h4', ev.title);
        h.appendChild(makeCell('span', ev.type, 'sch-tag'));
        card.appendChild(h);
        card.appendChild(makeCell('p', `🗓 ${date.getMonth() + 1}월 ${date.getDate()}일 (${SCH_DAYS[d]})  ⏰ ${schTimeText(ev.start)} ~ ${schTimeText(ev.end)}`));
        if (ev.startDate || ev.endDate) {
            const f = x => x ? `${x.getFullYear()}.${x.getMonth() + 1}.${x.getDate()}` : '';
            card.appendChild(makeCell('p', `📆 진행 기간: ${f(ev.startDate)} ~ ${f(ev.endDate)}`));
        }
        if (ev.desc) card.appendChild(makeCell('p', ev.desc));
        detail.appendChild(card);
    } else if (weekCount === 0) {
        detail.appendChild(makeCell('div', '이 주에는 등록된 일정이 없습니다.', 'sch-detail-hint'));
    } else {
        detail.appendChild(makeCell('div', '일정을 누르면 자세한 내용이 나옵니다. (점선 테두리 = 일회성 일정)', 'sch-detail-hint'));
    }
    schRestoreScroll(wrap);
}

// 다시 그려도 스크롤 위치가 유지되도록 기억해 둠
let schLastTop = 0, schLastLeft = 0;
function schRestoreScroll(wrap) {
    wrap.scrollTop = schLastTop;
    wrap.scrollLeft = schLastLeft;
    wrap.addEventListener('scroll', () => { schLastTop = wrap.scrollTop; schLastLeft = wrap.scrollLeft; });
}

// 탭을 열 때 가장 이른 일정 1시간 전 시간대부터 보이게 (탭이 보이는 상태에서 실행해야 높이를 알 수 있음)
function schApplyScroll() {
    const wrap = document.querySelector('.sch-scroll');
    const col = document.querySelector('.sch-col');
    if (!wrap || !col || !schPendingScroll || !col.offsetHeight) return;
    const first = wrap.dataset.first === '' ? null : +wrap.dataset.first;
    const frac = first === null ? 0 : Math.max(0, (first - 60 - SCHEDULE_FROM * 60) / ((SCHEDULE_TO - SCHEDULE_FROM) * 60));
    wrap.scrollTop = frac * col.offsetHeight;
    schLastTop = wrap.scrollTop;
    schPendingScroll = false;
}
