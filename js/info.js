// 📖 정보 탭: 왼쪽 메뉴(하위 메뉴 포함) + 구글 시트(CSV) 불러와서 길드원 표 그리기

// 불러온 클랜별 시트 데이터 (로비의 참여 랭킹도 이 데이터를 같이 씁니다)
const GUILD_DATA = {};

// 클랜(시트) 화면의 뼈대. 클랜마다 하나씩 복사해서 사용합니다.
const CLAN_PANEL_HTML = `
    <div class="lobby-title">
        <span class="clan-chip"></span>
        <h3 class="sheet-title">길드원 주간 활동 트래커</h3>
        <p class="sheet-subtitle"></p>
    </div>
    <p class="dummy-note info-empty" style="display:none; padding:0 0 15px;">※ 미리보기용 더미 데이터입니다</p>
    <p class="sheet-status info-empty">데이터를 불러오는 중...</p>
    <div class="sheet-stats stat-grid"></div>
    <div class="sheet-table-card info-card" style="display:none;">
        <h3>👥 길드원 활동 현황</h3>
        <div class="member-tools">
            <div class="tool-search">
                <input type="text" class="tool-input" placeholder="닉네임 검색" aria-label="닉네임 검색" autocomplete="off" enterkeyhint="search">
                <button type="button" class="tool-clear" aria-label="검색어 지우기" title="검색어 지우기" hidden>✕</button>
            </div>
            <select class="tool-select tool-role" aria-label="길드 직급 필터"></select>
            <select class="tool-select tool-grade" aria-label="활동 등급 필터"></select>
            <button type="button" class="tool-reset" disabled>필터 초기화</button>
            <span class="tool-count"></span>
        </div>
        <p class="swipe-hint">← 좌우로 밀어서 모든 열을 볼 수 있어요 →</p>
        <div class="table-scroll">
            <table class="member-table"><thead></thead><tbody></tbody><tfoot></tfoot></table>
        </div>
    </div>`;

// 화면을 가진 메뉴만 펼친 목록 (하위 메뉴가 있으면 하위 메뉴들)
function getInfoLeaves() {
    const leaves = [];
    INFO_MENUS.forEach(item => {
        if (item.children && item.children.length) item.children.forEach(child => leaves.push(child));
        else leaves.push(item);
    });
    return leaves;
}

function openInfo(key) {
    document.querySelectorAll('.info-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.info-menu-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.info-group').forEach(g => g.classList.remove('has-active'));
    document.getElementById('info-' + key).classList.add('active');
    const btn = document.querySelector('.info-menu-item[data-info="' + key + '"]');
    btn.classList.add('active');
    const group = btn.closest('.info-group');
    if (group) group.classList.add('has-active');
}

function makeMenuButton(label, withAvatar, extraClass) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'info-menu-item ' + extraClass;
    if (withAvatar) btn.appendChild(makeCell('span', label.charAt(0), 'info-avatar'));
    btn.appendChild(makeCell('span', label));
    return btn;
}

// 메뉴 항목 하나의 화면 만들기: 시트가 있으면 표 화면, 없으면 '준비 중'
function createInfoPanel(leaf, panelWrap) {
    const panel = document.createElement('div');
    panel.id = 'info-' + leaf.key;
    panel.className = 'info-content';
    panelWrap.appendChild(panel);

    if (leaf.sheetUrl === undefined) {
        panel.innerHTML = '<div class="info-card"><h3></h3><p class="info-empty">준비 중입니다.</p></div>';
        panel.querySelector('h3').textContent = leaf.label;
        return null;
    }
    panel.innerHTML = CLAN_PANEL_HTML;
    panel.querySelector('.clan-chip').textContent = leaf.label;
    return loadGuildSheet(leaf, panel);
}

// 메뉴 만들기. 상위 메뉴를 누르면 첫 번째 하위 메뉴가 열립니다.
function buildInfoMenu() {
    const menu = document.getElementById('infoMenu');
    const panelWrap = document.getElementById('infoPanelWrap');
    menu.innerHTML = '';
    panelWrap.innerHTML = '';
    const loads = [];   // 시트 불러오기 작업들 (전부 끝나면 랭킹을 그림)

    INFO_MENUS.forEach(item => {
        if (item.children && item.children.length) {
            const group = document.createElement('div');
            group.className = 'info-group';

            const parent = makeMenuButton(item.label, true, 'info-parent');
            parent.appendChild(makeCell('span', '▾', 'info-caret'));
            parent.addEventListener('click', () => openInfo(item.children[0].key));
            group.appendChild(parent);

            const sub = document.createElement('div');
            sub.className = 'info-sub';
            item.children.forEach(child => {
                const btn = makeMenuButton(child.label, false, 'info-child');
                btn.dataset.info = child.key;
                btn.addEventListener('click', () => openInfo(child.key));
                sub.appendChild(btn);
                loads.push(createInfoPanel(child, panelWrap));
            });
            group.appendChild(sub);
            menu.appendChild(group);
        } else {
            const btn = makeMenuButton(item.label, true, '');
            btn.dataset.info = item.key;
            btn.addEventListener('click', () => openInfo(item.key));
            menu.appendChild(btn);
            loads.push(createInfoPanel(item, panelWrap));
        }
    });

    const first = getInfoLeaves()[0];
    if (first) openInfo(first.key);
    return Promise.all(loads.filter(Boolean));
}

// CSV 텍스트 -> 2차원 배열 (따옴표/쉼표/줄바꿈 처리)
function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { cell += '"'; i++; }
                else inQuotes = false;
            } else cell += c;
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ',') {
            row.push(cell); cell = '';
        } else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(cell); rows.push(row); row = []; cell = '';
        } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
}

const firstFilled = r => (r.find(c => c.trim() !== '') || '').trim();

// 시트 구조를 읽어서 제목/요약카드/표 데이터로 나누기 ('닉네임' 헤더 줄을 기준으로 찾음)
function parseGuildSheet(rows) {
    const h = rows.findIndex(r => r.some(c => c.trim() === '닉네임'));
    if (h < 0) throw new Error('헤더(닉네임)를 찾을 수 없습니다');

    const header = rows[h].map(c => c.trim());
    const nickIdx = header.indexOf('닉네임');
    const colIdx = header.map((t, i) => i).filter(i => header[i] !== '');

    const members = [];
    let footer = null;
    for (let r = h + 1; r < rows.length; r++) {
        const row = rows[r];
        if (row.some(c => c.trim().startsWith('길드 전체'))) { footer = row; break; }
        if ((row[nickIdx] || '').trim() !== '') members.push(row);
    }

    const above = rows.slice(0, h).filter(r => r.some(c => c.trim() !== ''));
    let title = '', subtitle = '', stats = [];
    if (above.length >= 3) {
        const [labelRow, valueRow, capRow] = above.slice(-3);
        labelRow.forEach((cell, i) => {
            if (cell.trim() !== '') {
                stats.push({
                    label: cell.trim(),
                    value: (valueRow[i] || '').trim(),
                    caption: (capRow[i] || '').trim(),
                });
            }
        });
        const head = above.slice(0, -3);
        if (head[0]) title = firstFilled(head[0]);
        if (head[1]) subtitle = firstFilled(head[1]);
    }
    return { header, colIdx, members, footer, title, subtitle, stats };
}

function roleClass(t) {
    if (t.includes('부길드장')) return 'role-sub';
    if (t.includes('길드장')) return 'role-leader';
    if (t.includes('리더')) return 'role-lead';
    if (t.includes('정예')) return 'role-elite';
    return '';
}

function gradeClass(t) {
    if (t.includes('겜접')) return 'grade-quit';
    if (t.includes('관심')) return 'grade-warn';
    if (t.includes('다이아')) return 'grade-diamond';
    if (t.includes('플래')) return 'grade-platinum';
    if (t.includes('골드')) return 'grade-gold';
    if (t.includes('실버')) return 'grade-silver';
    if (t.includes('브론즈')) return 'grade-bronze';
    return '';
}

// ── 표 정렬 ──
// 정렬할 수 있는 열: 직급·등급(순서표 기준), 숫자 열(레벨·누적·평균·주차)
function sortTypeOf(name) {
    if (name === '길드 직급' || name === '활동 등급') return 'rank';
    if (name === '레벨' || name === '누적 활동' || name === '주간 평균' || /^\d+주차$/.test(name)) return 'number';
    return null;
}

// "1,923회", "14.0회", "104" 같은 글자에서 숫자만 꺼냄 (비어 있으면 null)
function parseNumber(text) {
    const m = String(text || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
}

// 순서표에서의 높낮이 (높은 등급일수록 큰 값, 표에 없는 글자는 null)
function rankOf(name, text) {
    const list = name === '길드 직급' ? ROLE_ORDER : GRADE_ORDER;
    const idx = list.indexOf(String(text || '').trim().replace('플레티넘', '플래티넘'));
    return idx < 0 ? null : list.length - idx;
}

function sortValue(row, i, name) {
    const text = (row[i] || '').trim();
    return sortTypeOf(name) === 'rank' ? rankOf(name, text) : parseNumber(text);
}

// 정렬된 길드원 목록 (비어 있거나 모르는 값은 오름/내림차순 모두 맨 아래)
function sortedMembers(data, sort) {
    const items = data.members.map((row, idx) => ({ row, idx }));
    if (!sort.name) return items.map(it => it.row);
    const col = data.header.indexOf(sort.name);
    const factor = sort.dir === 'asc' ? 1 : -1;
    items.sort((a, b) => {
        const va = sortValue(a.row, col, sort.name);
        const vb = sortValue(b.row, col, sort.name);
        if (va === null && vb === null) return a.idx - b.idx;
        if (va === null) return 1;
        if (vb === null) return -1;
        if (va !== vb) return (va - vb) * factor;
        return a.idx - b.idx;
    });
    return items.map(it => it.row);
}

// 머리글을 누를 때마다: 내림차순 → 오름차순 → 원래 순서
function toggleSort(root, name) {
    const sort = root._sheet.sort;
    if (sort.name !== name) { sort.name = name; sort.dir = 'desc'; }
    else if (sort.dir === 'desc') { sort.dir = 'asc'; }
    else { sort.name = null; sort.dir = null; }
    renderMemberRows(root);
}

// 길드원 줄 그리기 (정렬 상태 반영, No.는 항상 1,2,3… 순서로 고정)
function renderMemberRows(root) {
    const { data, sort, attCols, view } = root._sheet;
    const { header, colIdx } = data;
    const tbody = root.querySelector('.member-table tbody');
    tbody.innerHTML = '';

    const rows = filterMembers(root, sortedMembers(data, sort));   // 정렬한 목록에서 검색·필터 조건에 맞는 사람만
    // 상세 정보가 펼쳐져 있던 길드원이 검색·필터로 사라졌으면 접음
    if (view.openId !== null && !rows.some(r => data.members.indexOf(r) === view.openId)) view.openId = null;

    rows.forEach((row, rowIndex) => {
        const rowId = data.members.indexOf(row);   // 시트에서의 원래 순번 (정렬·필터와 상관없이 같은 사람을 가리킴)
        const isOpen = view.openId === rowId;
        const tr = document.createElement('tr');
        if (isOpen) tr.classList.add('is-open');
        tr.classList.add('row-click');
        // 줄 어디를 눌러도 상세 정보가 펼쳐짐 / 접힘 (글자를 드래그해서 선택하는 중이면 무시)
        tr.addEventListener('click', () => {
            const selection = window.getSelection ? window.getSelection().toString().trim() : '';
            if (!selection) toggleMemberDetail(root, rowId);
        });
        colIdx.forEach(i => {
            const name = header[i];
            const raw = (row[i] || '').trim();
            const text = raw || '-';
            const td = document.createElement('td');

            if (name === '닉네임') {
                td.className = 'cell-nick';
                const wrap = document.createElement('div');
                wrap.className = 'nick-wrap';
                wrap.appendChild(makeCell('span', Array.from(text)[0] || '?', 'nick-avatar'));
                // 마우스를 올리면 전체 이름(title). 키보드로 닉네임에서 Enter/Space를 눌러도 상세 정보가 열림 (마우스 클릭은 위의 줄 클릭이 처리)
                const nameEl = makeCell('span', text, 'nick-name');
                nameEl.title = text;
                nameEl.tabIndex = 0;
                nameEl.setAttribute('role', 'button');
                nameEl.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                nameEl.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMemberDetail(root, rowId); }
                });
                wrap.appendChild(nameEl);
                td.appendChild(wrap);
            } else if (name === 'No.') {
                td.className = 'cell-no';
                td.textContent = String(rowIndex + 1);
            } else if (name === '길드 직급' && raw) {
                td.appendChild(makeCell('span', text, 'role-badge ' + roleClass(text)));
            } else if (name === '활동 등급' && raw) {
                td.appendChild(makeCell('span', text, 'grade-badge ' + gradeClass(text)));
            } else if (name === '레벨') {
                td.className = 'cell-lv';
                td.textContent = raw && !isNaN(raw) ? 'Lv.' + raw : text;
            } else if (name === '누적 활동') {
                td.className = 'cell-total';
                td.textContent = text;
            } else if (/^\d+주차$/.test(name)) {
                td.className = (parseInt(raw, 10) || 0) > 0 ? 'wk-hit' : 'wk-zero';
                td.textContent = text;
            } else if (attCols.has(i)) {
                td.className = 'att-col';
                if (raw) td.appendChild(makeAttendance(raw, attCols.get(i)));
                else td.textContent = '-';
            } else {
                td.textContent = text;
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
        if (isOpen) tbody.appendChild(buildMemberDetailRow(root, row));   // 펼쳐진 상세 정보 (members.js)
    });

    if (rows.length === 0) {
        const tr = document.createElement('tr');
        tr.className = 'no-result';
        const td = document.createElement('td');
        td.colSpan = colIdx.length;
        td.appendChild(makeCell('div', '조건에 맞는 길드원이 없어요.', 'sticky-fill'));
        tr.appendChild(td);
        tbody.appendChild(tr);
    }
    updateMemberTools(root, rows.length);   // 'N명 중 M명' 등 도구 상자 표시 갱신 (members.js)

    // 머리글의 ▲▼ 표시 갱신
    root.querySelectorAll('.member-table th.sortable').forEach(th => {
        const active = sort.name === th.dataset.col;
        if (active) th.dataset.sort = sort.dir; else delete th.dataset.sort;
        th.querySelector('.sort-ind').textContent = active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕';
        th.setAttribute('aria-sort', active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
    });
}

// ── 참석(T/F) 열: 'TTTFT' 같은 글자를 ✓ / ✕ 아이콘으로 바꿔서 보여줌 ──
const ATT_CHECK_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ATT_CROSS_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

// 열 이름과 상관없이, 값이 전부 T/F로만 된 열을 참석 열로 인식 (열 번호 → 가장 긴 글자 수)
function findAttendanceColumns(header, colIdx, members) {
    const reserved = ['No.', '닉네임', '길드 직급', '레벨', '누적 활동', '주간 평균', '활동 등급'];
    const result = new Map();
    colIdx.forEach(i => {
        const name = header[i];
        if (reserved.includes(name) || /^\d+주차$/.test(name)) return;
        const values = members.map(row => (row[i] || '').replace(/\s+/g, '')).filter(v => v !== '');
        if (values.length > 0 && values.every(v => /^[TFtf]+$/.test(v))) {
            result.set(i, Math.max(...values.map(v => v.length)));
        }
    });
    return result;
}

function makeAttendance(value, maxLen, withLabels) {
    const chars = Array.from(value.replace(/\s+/g, '').toUpperCase());
    const wrap = document.createElement('div');
    wrap.className = 'att-wrap';
    for (let k = 0; k < maxLen; k++) {
        const icon = document.createElement('span');
        if (chars[k] === 'T') {
            icon.className = 'att-icon att-ok';
            icon.innerHTML = ATT_CHECK_SVG;
            icon.title = (k + 1) + '주차 참석';
        } else if (chars[k] === 'F') {
            icon.className = 'att-icon att-no';
            icon.innerHTML = ATT_CROSS_SVG;
            icon.title = (k + 1) + '주차 미참';
        } else {
            icon.className = 'att-icon att-empty';   // 글자가 모자란 칸은 비워서 주차 위치를 맞춤
        }
        if (withLabels) {   // 상세 정보에서는 아이콘 아래에 '1주차' 이름표를 붙임
            const slot = document.createElement('span');
            slot.className = 'att-slot';
            slot.appendChild(icon);
            slot.appendChild(makeCell('small', (k + 1) + '주차'));
            wrap.appendChild(slot);
        } else {
            wrap.appendChild(icon);
        }
    }
    return wrap;
}

function renderGuildSheet(data, root) {
    const { header, colIdx, members, footer, title, subtitle, stats } = data;
    const attCols = findAttendanceColumns(header, colIdx, members);
    root._sheet = { data, sort: { name: null, dir: null }, attCols, view: { query: '', role: '', grade: '', openId: null } };   // view = 검색·필터 상태 (members.js)

    if (title) root.querySelector('.sheet-title').textContent = title;
    root.querySelector('.sheet-subtitle').textContent = subtitle;

    // 요약 카드
    const statsBox = root.querySelector('.sheet-stats');
    statsBox.innerHTML = '';
    stats.forEach(st => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.appendChild(makeCell('div', st.label, 'stat-label'));
        card.appendChild(makeCell('div', st.value || '-', 'stat-value'));
        card.appendChild(makeCell('div', st.caption, 'stat-caption'));
        statsBox.appendChild(card);
    });

    // 표 머리
    const table = root.querySelector('.member-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    const tfoot = table.querySelector('tfoot');
    thead.innerHTML = ''; tbody.innerHTML = ''; tfoot.innerHTML = '';

    const headRow = document.createElement('tr');
    colIdx.forEach(i => {
        const name = header[i];
        const th = makeCell('th', name);
        if (name === '닉네임') th.className = 'cell-nick';
        else if (name === 'No.') th.className = 'cell-no';
        else if (attCols.has(i)) th.className = 'att-col';
        else if (sortTypeOf(name)) {
            th.className = 'sortable';
            th.dataset.col = name;
            th.tabIndex = 0;
            th.setAttribute('role', 'button');
            th.appendChild(makeCell('span', '↕', 'sort-ind'));
            th.addEventListener('click', () => toggleSort(root, name));
            th.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort(root, name); }
            });
        }
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    setupMemberTools(root);   // 검색창 연결 (members.js)

    // 길드원 줄
    renderMemberRows(root);

    // 합계 줄
    if (footer) {
        const labelIdx = footer.findIndex(c => c.trim() !== '');
        const nextIdx = footer.findIndex((c, i) => i > labelIdx && c.trim() !== '');
        const tr = document.createElement('tr');
        const spanCols = colIdx.filter(i => i >= labelIdx && (nextIdx < 0 || i < nextIdx));
        const labelTd = makeCell('td', footer[labelIdx].trim());
        labelTd.colSpan = Math.max(spanCols.length, 1);
        tr.appendChild(labelTd);
        if (nextIdx >= 0) {
            colIdx.filter(i => i >= nextIdx).forEach(i => {
                tr.appendChild(makeCell('td', (footer[i] || '').trim() || '-'));
            });
        }
        tfoot.appendChild(tr);
    }

    root.querySelector('.sheet-table-card').style.display = 'block';
}

async function loadGuildSheet(clan, root) {
    const status = root.querySelector('.sheet-status');
    try {
        let text;
        if (USE_DUMMY_DATA) {
            text = buildDummyCSV();
            root.querySelector('.dummy-note').style.display = 'block';
        } else {
            if (!clan.sheetUrl) {
                console.warn('[' + clan.label + '] js/data.js의 sheetUrl이 비어 있습니다.');
                status.textContent = '준비 중입니다.';
                return null;
            }
            const res = await fetch(clan.sheetUrl, { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            text = await res.text();
        }
        const parsed = parseGuildSheet(parseCSV(text));
        GUILD_DATA[clan.key] = { label: clan.label, data: parsed };
        renderGuildSheet(parsed, root);
        status.style.display = 'none';
        return parsed;
    } catch (err) {
        console.error('[' + clan.label + '] 시트 불러오기 실패:', err);
        status.textContent = '데이터를 불러오지 못했습니다. 잠시 후 새로고침 해주세요.';
        return null;
    }
}
