// 🎰 가챠 시뮬레이션 탭

let gachaDiaTotal = 0;
let gachaPullCount = 0;
let gachaCarePoints = 0;

// ── 가챠 1회 뽑기: 확률 누적 방식으로 등급 결정 ──
function pullOneGacha() {
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const grade of GACHA_GRADES) {
        cumulative += grade.rate;
        if (roll < cumulative) return grade;
    }
    return GACHA_GRADES[GACHA_GRADES.length - 1];
}

function renderGachaResults(results) {
    const container = document.getElementById('gachaResults');
    container.innerHTML = '';
    results.forEach(grade => {
        const card = document.createElement('div');
        card.className = 'gacha-card';
        card.style.background = grade.bg;
        card.style.color = grade.text;
        card.textContent = grade.name;
        container.appendChild(card);
    });
}

// 횟수 / 누적 다이아 / 케어포인트 / 천장 달성 표시를 현재 값으로 다시 그림
function updateGachaDisplay() {
    document.getElementById('gachaPullCount').textContent = gachaPullCount.toLocaleString();
    document.getElementById('gachaDiaTotal').textContent = gachaDiaTotal.toLocaleString();
    document.getElementById('gachaCarePoints').textContent = gachaCarePoints.toLocaleString();
    document.getElementById('gachaCareGoal').textContent = '/' + GACHA_CARE_GOAL.toLocaleString() + 'p';

    const reached = Math.floor(gachaCarePoints / GACHA_CARE_GOAL); // 천장 달성 횟수
    document.getElementById('gachaPityBadge').style.display = reached > 0 ? 'inline-flex' : 'none';
    document.getElementById('gachaPityText').textContent = reached + ' 천장 달성';
}

function doGachaPull() {
    const results = Array.from({ length: 11 }, pullOneGacha);
    renderGachaResults(results);
    gachaPullCount += 1;
    gachaDiaTotal += GACHA_COST_PER_PULL;
    gachaCarePoints += results.reduce((sum, grade) => sum + (grade.care || 0), 0);
    updateGachaDisplay();
}

function resetGachaDia() {
    gachaPullCount = 0;
    gachaDiaTotal = 0;
    gachaCarePoints = 0;
    updateGachaDisplay();
}

// ── 등급별 확률 박스 (js/data.js의 GACHA_GRADES에서 자동으로 만듦) ──
function formatRate(rate) {
    return String(Number(rate.toFixed(3)));   // 74.68500000001 같은 오차를 정리 (최대 소수 3자리)
}

function renderGachaRates() {
    const list = document.getElementById('gachaRates');
    list.innerHTML = '';
    GACHA_GRADES.forEach(grade => {
        const li = document.createElement('li');
        li.className = 'rate-item';
        li.style.setProperty('--g-bg', grade.bg);
        li.style.setProperty('--g-fg', grade.fg || grade.bg);
        li.appendChild(makeCell('span', '', 'rate-swatch'));
        li.appendChild(makeCell('span', grade.name, 'rate-name'));
        li.appendChild(makeCell('span', formatRate(grade.rate) + '%', 'rate-value'));
        list.appendChild(li);
    });
}
