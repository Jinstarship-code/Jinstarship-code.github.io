// 👥 길드원 현황 도구: 닉네임 검색 · 직급/등급 필터 · 닉네임 눌러서 상세 정보
// 표 그리기는 info.js의 renderMemberRows가 맡고, 여기서는 '누구를 보여줄지'와 도구 상자 동작만 다룹니다.
// 상태는 root._sheet.view에 클랜(시트)마다 따로 저장됩니다.

// 검색어 정리: 앞뒤 공백 제거 + 대소문자 구분 없이
function normalizeQuery(text) {
    return String(text || '').trim().toLowerCase();
}

// 직급·등급 글자 비교용: 앞뒤 공백 제거 + 시트의 '플레티넘' 오타를 '플래티넘'으로 통일
function normalizeLabel(text) {
    return String(text || '').trim().replace('플레티넘', '플래티넘');
}

// 검색어 + 직급 + 등급 조건을 모두 만족하는 길드원만 남김 (이미 정렬된 목록을 받으므로 정렬과 서로 영향이 없음)
function filterMembers(root, rows) {
    const { data, view } = root._sheet;
    const nickCol = data.header.indexOf('닉네임');
    const roleCol = data.header.indexOf('길드 직급');
    const gradeCol = data.header.indexOf('활동 등급');
    const q = normalizeQuery(view.query);
    return rows.filter(row => {
        if (q && !normalizeQuery(row[nickCol]).includes(q)) return false;
        if (view.role && normalizeLabel(row[roleCol]) !== view.role) return false;
        if (view.grade && normalizeLabel(row[gradeCol]) !== view.grade) return false;
        return true;
    });
}

// 필터 선택 상자 채우기: 시트에 실제로 있는 값만, 순서표(data.js) 순서대로, 표에 없는 값은 맨 뒤에
function fillFilterSelect(select, colName, data, order) {
    const col = data.header.indexOf(colName);
    if (col < 0) { select.hidden = true; return; }   // 시트에 그 열이 없으면 선택 상자를 숨김
    const counts = new Map();
    data.members.forEach(row => {
        const value = normalizeLabel(row[col]);
        if (value) counts.set(value, (counts.get(value) || 0) + 1);
    });
    const values = [...counts.keys()].sort((a, b) => {
        const ia = order.indexOf(a), ib = order.indexOf(b);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
    select.innerHTML = '';
    select.appendChild(new Option(colName + ' 전체', ''));
    values.forEach(value => select.appendChild(new Option(value + ' (' + counts.get(value) + ')', value)));
}

// 도구 상자(검색창·필터)에 이벤트 연결 — 클랜 화면마다 한 번
function setupMemberTools(root) {
    const { data, view } = root._sheet;
    const input = root.querySelector('.tool-input');
    const clearBtn = root.querySelector('.tool-clear');
    const roleSel = root.querySelector('.tool-role');
    const gradeSel = root.querySelector('.tool-grade');
    const resetBtn = root.querySelector('.tool-reset');

    fillFilterSelect(roleSel, '길드 직급', data, ROLE_ORDER);
    fillFilterSelect(gradeSel, '활동 등급', data, GRADE_ORDER);

    input.addEventListener('input', () => {
        view.query = input.value;
        renderMemberRows(root);
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Escape' && input.value) { e.preventDefault(); clearSearch(root); }
    });
    clearBtn.addEventListener('click', () => {
        clearSearch(root);
        input.focus();
    });

    roleSel.addEventListener('change', () => { view.role = roleSel.value; renderMemberRows(root); });
    gradeSel.addEventListener('change', () => { view.grade = gradeSel.value; renderMemberRows(root); });

    // 필터 초기화: 직급·등급 선택만 되돌림 (검색어는 검색창의 ✕로 지움)
    resetBtn.addEventListener('click', () => {
        view.role = '';
        view.grade = '';
        roleSel.value = '';
        gradeSel.value = '';
        renderMemberRows(root);
    });
}

function clearSearch(root) {
    root._sheet.view.query = '';
    root.querySelector('.tool-input').value = '';
    renderMemberRows(root);
}

// 가로 스크롤 상자의 보이는 폭을 CSS 변수(--scroll-w)로 저장 → 안내 문구·상세 정보가 옆으로 스크롤해도 화면 안에 머묾
function syncScrollWidth(root) {
    const scroller = root.querySelector('.table-scroll');
    if (scroller && scroller.clientWidth > 0) scroller.style.setProperty('--scroll-w', scroller.clientWidth + 'px');
}
window.addEventListener('resize', () => {
    document.querySelectorAll('.info-content').forEach(panel => { if (panel._sheet) syncScrollWidth(panel); });
});

// 도구 상자 표시 갱신: 지우기 버튼, 'N명 중 M명'
function updateMemberTools(root, shown) {
    const { data, view } = root._sheet;
    syncScrollWidth(root);
    const total = data.members.length;
    root.querySelector('.tool-clear').hidden = !view.query;
    root.querySelector('.tool-reset').disabled = !(view.role || view.grade);
    const filtered = shown !== total;
    root.querySelector('.tool-count').textContent = filtered ? '전체 ' + total + '명 중 ' + shown + '명' : '전체 ' + total + '명';
}

// ── 닉네임을 누르면 상세 정보 펼치기 ──
// 같은 사람을 다시 누르면 접히고, 다른 사람을 누르면 그 사람으로 바뀜 (한 번에 한 명만 열림)
function toggleMemberDetail(root, rowId) {
    const view = root._sheet.view;
    view.openId = view.openId === rowId ? null : rowId;
    renderMemberRows(root);
    if (view.openId !== null) revealDetail(root);
}

// 펼친 상세 정보가 표 상자 밖으로 잘려 있으면, 표 상자만 위아래로 스크롤해서 보이게 함
function revealDetail(root) {
    const scroller = root.querySelector('.table-scroll');
    const detail = root.querySelector('.detail-row');
    if (!scroller || !detail) return;
    const box = scroller.getBoundingClientRect();
    const rect = detail.getBoundingClientRect();
    if (rect.bottom > box.bottom) scroller.scrollTop += rect.bottom - box.bottom + 8;
    else if (rect.top < box.top + 40) scroller.scrollTop -= box.top + 40 - rect.top;   // 40 = 표 제목 줄 높이만큼 여유

    // 표 상자가 화면보다 길 수 있어서, 상세 정보가 화면 아래로 잘려 있으면 페이지도 함께 내림
    const after = detail.getBoundingClientRect();
    if (after.bottom > window.innerHeight) window.scrollBy({ top: after.bottom - window.innerHeight + 16, behavior: 'smooth' });
}

function detailSection(title) {
    const section = document.createElement('div');
    section.className = 'dt-sec';
    section.appendChild(makeCell('h4', title));
    return section;
}

// 한 길드원의 상세 정보 줄(<tr>) 만들기
function buildMemberDetailRow(root, row) {
    const { data, attCols } = root._sheet;
    const { header, colIdx } = data;
    const nick = (row[header.indexOf('닉네임')] || '').trim();
    const isWeek = name => /^\d+주차$/.test(name);

    const tr = document.createElement('tr');
    tr.className = 'detail-row';
    const td = document.createElement('td');
    td.colSpan = colIdx.length;
    const box = document.createElement('div');
    box.className = 'detail-box';

    // 머리: 아바타 + 전체 닉네임 + 접기 버튼
    const head = document.createElement('div');
    head.className = 'dt-head';
    head.appendChild(makeCell('span', Array.from(nick)[0] || '?', 'nick-avatar'));
    head.appendChild(makeCell('div', nick, 'dt-name'));
    const closeBtn = makeCell('button', '접기 ▴', 'dt-close');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', () => toggleMemberDetail(root, data.members.indexOf(row)));
    head.appendChild(closeBtn);
    box.appendChild(head);

    // 기본 정보: 번호·닉네임·주차·참석(T/F) 열을 뺀 나머지 열 (직급, 레벨, 활동 등급, 누적 활동, 주간 평균 …)
    const grid = document.createElement('div');
    grid.className = 'dt-grid';
    colIdx.forEach(i => {
        const name = header[i];
        if (name === 'No.' || name === '닉네임' || isWeek(name) || attCols.has(i)) return;
        const raw = (row[i] || '').trim();
        const item = document.createElement('div');
        item.className = 'dt-item';
        item.appendChild(makeCell('small', name));
        const value = document.createElement('b');
        if (name === '길드 직급' && raw) value.appendChild(makeCell('span', raw, 'role-badge ' + roleClass(raw)));
        else if (name === '활동 등급' && raw) value.appendChild(makeCell('span', raw, 'grade-badge ' + gradeClass(raw)));
        else if (name === '레벨') value.textContent = raw && !isNaN(raw) ? 'Lv.' + raw : (raw || '-');
        else value.textContent = raw || '-';
        item.appendChild(value);
        grid.appendChild(item);
    });
    box.appendChild(grid);

    // 주차별 활동: 횟수 + (1회 이상이면 ✓, 0회면 ✕, 기록이 없으면 표시 없음)
    const weekCols = colIdx.filter(i => isWeek(header[i]));
    if (weekCols.length) {
        const section = detailSection('주차별 활동');
        const list = document.createElement('div');
        list.className = 'dt-weeks';
        weekCols.forEach(i => {
            const raw = (row[i] || '').trim();
            const n = parseNumber(raw);
            const chip = document.createElement('div');
            chip.className = 'dt-wk' + (raw === '' ? ' dim' : '');
            chip.appendChild(makeCell('small', header[i]));
            chip.appendChild(makeCell('b', raw || '-'));
            if (raw !== '' && n !== null) {
                const icon = document.createElement('span');
                icon.className = 'att-icon ' + (n > 0 ? 'att-ok' : 'att-no');
                icon.innerHTML = n > 0 ? ATT_CHECK_SVG : ATT_CROSS_SVG;
                icon.title = header[i] + (n > 0 ? ' 참여' : ' 미참여');
                chip.appendChild(icon);
            }
            list.appendChild(chip);
        });
        section.appendChild(list);
        box.appendChild(section);
    }

    // 참석(T/F) 열마다: 주차별 ✓ / ✕ — PC는 한 줄에 나란히, 폰은 2열 (배치는 CSS .dt-att-list가 담당)
    const attList = document.createElement('div');
    attList.className = 'dt-att-list';
    colIdx.filter(i => attCols.has(i)).forEach(i => {
        const raw = (row[i] || '').trim();
        const section = detailSection(header[i] + ' 참석 기록');
        if (raw) section.appendChild(makeAttendance(raw, raw.replace(/\s+/g, '').length, true));
        else section.appendChild(makeCell('div', '기록 없음', 'dt-none'));
        attList.appendChild(section);
    });
    if (attList.children.length) box.appendChild(attList);

    td.appendChild(box);
    tr.appendChild(td);
    return tr;
}
