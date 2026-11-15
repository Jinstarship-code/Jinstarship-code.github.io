// 🎯 명중 계산 탭

// ── 보스 테이블을 데이터로부터 자동 생성 (행 개수가 달라도 안전) ──
function buildBossTable() {
    const thead = document.getElementById('bossTableHead');
    const tbody = document.getElementById('bossTableBody');

    const headerRow = document.createElement('tr');
    BOSS_REGIONS.forEach(region => {
        const th = document.createElement('th');
        th.className = region.className;
        th.textContent = region.label;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const maxRows = Math.max(...BOSS_REGIONS.map(r => r.bosses.length));
    for (let i = 0; i < maxRows; i++) {
        const row = document.createElement('tr');
        BOSS_REGIONS.forEach(region => {
            const boss = region.bosses[i];
            const td = document.createElement('td');
            if (boss) {
                td.className = 'boss-cell';
                td.dataset.cut = boss.cut;
                td.textContent = `${boss.name}(${boss.cut})`;
            } else {
                td.className = 'boss-cell empty';
            }
            row.appendChild(td);
        });
        tbody.appendChild(row);
    }
}

// ── 합계 계산 및 보스 하이라이트 ──
function checkBosses() {
    const total = STAT_INPUT_IDS.reduce((sum, id) => {
        return sum + (parseInt(document.getElementById(id).value, 10) || 0);
    }, 0);

    document.getElementById('totalBox').textContent = total.toLocaleString();

    document.querySelectorAll('.boss-cell[data-cut]').forEach(cell => {
        const cut = parseInt(cell.dataset.cut, 10);
        cell.classList.toggle('active', total >= cut);
    });
}
