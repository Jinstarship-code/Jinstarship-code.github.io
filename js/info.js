// 📖 정보 탭: 왼쪽 메뉴 + 구글 시트(CSV) 불러와서 길드원 표 그리기

function openInfo(key) {
    document.querySelectorAll('.info-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.info-menu-item').forEach(b => b.classList.remove('active'));
    document.getElementById('info-' + key).classList.add('active');
    document.querySelector('.info-menu-item[data-info="' + key + '"]').classList.add('active');
}

// 메뉴 버튼 생성 + 로비 외 항목은 '준비 중' 화면 자동 생성
function buildInfoMenu() {
    const menu = document.getElementById('infoMenu');
    const panelWrap = document.getElementById('infoPanelWrap');

    INFO_MENUS.forEach((item, i) => {
        const btn = document.createElement('button');
        btn.className = 'info-menu-item' + (i === 0 ? ' active' : '');
        btn.dataset.info = item.key;

        const avatar = document.createElement('span');
        avatar.className = 'info-avatar';
        avatar.textContent = item.label.charAt(0);

        const label = document.createElement('span');
        label.textContent = item.label;

        btn.appendChild(avatar);
        btn.appendChild(label);
        btn.addEventListener('click', () => openInfo(item.key));
        menu.appendChild(btn);

        if (!document.getElementById('info-' + item.key)) {
            const panel = document.createElement('div');
            panel.id = 'info-' + item.key;
            panel.className = 'info-content';
            panel.innerHTML = '<div class="info-card"><h3></h3><p class="info-empty">준비 중입니다.</p></div>';
            panel.querySelector('h3').textContent = item.label;
            panelWrap.appendChild(panel);
        }
    });
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
    if (t.includes('정예')) return 'role-elite';
    return '';
}

function gradeClass(t) {
    if (t.includes('관심')) return 'grade-warn';
    if (t.includes('다이아')) return 'grade-diamond';
    if (t.includes('플래')) return 'grade-platinum';
    if (t.includes('골드')) return 'grade-gold';
    if (t.includes('실버')) return 'grade-silver';
    if (t.includes('브론즈')) return 'grade-bronze';
    return '';
}

function renderGuildSheet(data) {
    const { header, colIdx, members, footer, title, subtitle, stats } = data;

    if (title) document.getElementById('sheetTitle').textContent = title;
    document.getElementById('sheetSubtitle').textContent = subtitle;

    // 요약 카드
    const statsBox = document.getElementById('sheetStats');
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
    const table = document.getElementById('activityTable');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    const tfoot = table.querySelector('tfoot');
    thead.innerHTML = ''; tbody.innerHTML = ''; tfoot.innerHTML = '';

    const headRow = document.createElement('tr');
    colIdx.forEach(i => {
        const th = makeCell('th', header[i]);
        if (header[i] === '닉네임') th.className = 'cell-nick';
        else if (header[i] === 'No.') th.className = 'cell-no';
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    // 길드원 줄
    members.forEach(row => {
        const tr = document.createElement('tr');
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
                wrap.appendChild(makeCell('span', text, 'nick-name'));
                td.appendChild(wrap);
            } else if (name === 'No.') {
                td.className = 'cell-no';
                td.textContent = text;
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
            } else {
                td.textContent = text;
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

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

    document.getElementById('sheetTableCard').style.display = 'block';
}

async function loadGuildSheet() {
    const status = document.getElementById('sheetStatus');
    try {
        let text;
        if (USE_DUMMY_DATA) {
            text = buildDummyCSV();
            document.getElementById('dummyNote').style.display = 'block';
        } else {
            const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            text = await res.text();
        }
        renderGuildSheet(parseGuildSheet(parseCSV(text)));
        status.style.display = 'none';
    } catch (err) {
        console.error('시트 불러오기 실패:', err);
        status.textContent = '데이터를 불러오지 못했습니다. 잠시 후 새로고침 해주세요.';
    }
}
