// 🎰 가챠 시뮬레이션 탭

let gachaDiaTotal = 0;

let gachaPullCount = 0;

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

function doGachaPull() {
    const results = Array.from({ length: 11 }, pullOneGacha);
    renderGachaResults(results);
    gachaPullCount += 1;
    gachaDiaTotal += GACHA_COST_PER_PULL;
    document.getElementById('gachaPullCount').textContent = gachaPullCount.toLocaleString();
    document.getElementById('gachaDiaTotal').textContent = gachaDiaTotal.toLocaleString();
}

function resetGachaDia() {
    gachaPullCount = 0;
    gachaDiaTotal = 0;
    document.getElementById('gachaPullCount').textContent = '0';
    document.getElementById('gachaDiaTotal').textContent = '0';
}
