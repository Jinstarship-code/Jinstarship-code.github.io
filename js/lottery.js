// 🎲 랜덤 추첨기: 참가자 중에서 중복 없이 N명을 뽑습니다.
// 당첨자는 애니메이션 전에 먼저 정해지고, 슬롯 애니메이션과 폭죽은 보여주기용입니다. (새 라이브러리 없음)

const LOTTERY_COLORS = ['#cc0000', '#f5c518', '#ff9a76', '#ffffff', '#9b59b6', '#5dade2', '#a9dc76'];

let lotteryBusy = false;           // 추첨 애니메이션 진행 중
let lotterySkip = false;           // '건너뛰기'를 눌렀는지
let lotteryLast = null;            // 마지막 추첨 결과 (결과 복사용)
const lotteryPrev = new Set();     // 이번 접속에서 이미 뽑힌 사람들 ('이전 당첨자 제외'용)
const lotteryHistory = [];         // 추첨 기록

const lotteryEl = id => document.getElementById(id);
const lotterySleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const lotteryReduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// ── 공정한 무작위: 브라우저의 암호용 난수(crypto)를 쓰고, 한쪽으로 치우치지 않게 보정 ──
function randInt(n) {
    if (window.crypto && window.crypto.getRandomValues) {
        const limit = Math.floor(0x100000000 / n) * n;
        const buf = new Uint32Array(1);
        do { window.crypto.getRandomValues(buf); } while (buf[0] >= limit);
        return buf[0] % n;
    }
    return Math.floor(Math.random() * n);
}

// 중복 없이 n명 뽑기 (앞에서부터 하나씩 섞어서 뽑는 방식). 뽑힌 순서가 곧 당첨 순서
function pickWinners(pool, n) {
    const arr = pool.slice();
    for (let i = 0; i < n; i++) {
        const j = i + randInt(arr.length - i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, n);
}

// ── 참가자 입력 정리: 줄바꿈·쉼표·탭으로 나누고, 같은 이름은 한 명으로 ──
function parseLotteryNames(text) {
    const seen = new Set();
    const names = [];
    let dupes = 0;
    String(text || '').split(/[\n,\t]+/).forEach(raw => {
        const name = raw.trim();
        if (!name) return;
        if (seen.has(name)) { dupes++; return; }
        seen.add(name);
        names.push(name);
    });
    return { names, dupes };
}

function lotteryState() {
    const { names, dupes } = parseLotteryNames(lotteryEl('ltNames').value);
    const exclude = lotteryEl('ltExclude').checked;
    const pool = exclude ? names.filter(name => !lotteryPrev.has(name)) : names;
    return { names, dupes, pool, exclude };
}

function readWinnerCount() {
    const n = parseInt(lotteryEl('ltWinners').value, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
}

// 참가자 수 안내 + 입력 검사 + 추첨 버튼 켜고 끄기
function updateLotteryInfo() {
    const { names, dupes, pool, exclude } = lotteryState();
    const n = readWinnerCount();
    const info = lotteryEl('ltInfo');
    let message = '참가자 ' + names.length + '명';
    if (dupes) message += ' (같은 이름 ' + dupes + '개는 한 명으로 처리)';
    if (exclude && lotteryPrev.size && pool.length > 0) message += ' · 이전 당첨자를 빼면 ' + pool.length + '명';

    let problem = '';
    if (pool.length === 0) problem = names.length ? '이전 당첨자를 빼면 뽑을 사람이 없어요.' : '참가자를 입력해 주세요.';
    else if (n > pool.length) problem = '뽑을 인원(' + n + '명)이 참가자 수(' + pool.length + '명)보다 많아요.';

    info.textContent = problem ? message + ' · ' + problem : message;
    info.classList.toggle('warn', !!problem);
    lotteryEl('ltWinners').max = String(Math.max(1, pool.length));
    lotteryEl('ltDraw').disabled = lotteryBusy || !!problem;
}

function stepWinners(delta) {
    const { pool } = lotteryState();
    const next = Math.min(Math.max(1, readWinnerCount() + delta), Math.max(1, pool.length));
    lotteryEl('ltWinners').value = String(next);
    updateLotteryInfo();
}

// ── 길드원 불러오기 (길드 운영의 시트 데이터 사용) ──
function renderLotteryImport() {
    const box = lotteryEl('ltImport');
    box.innerHTML = '';
    const leaves = getInfoLeaves().filter(l => GUILD_DATA[l.key]);
    if (leaves.length === 0) {
        box.appendChild(makeCell('span', '길드원 목록을 불러오지 못했어요. 이름을 직접 입력해 주세요.', 'lt-hint'));
        return;
    }
    box.appendChild(makeCell('span', '길드원 불러오기', 'lt-import-label'));
    const addChip = (label, handler) => {
        const b = makeCell('button', label, 'lt-chip');
        b.type = 'button';
        b.addEventListener('click', handler);
        box.appendChild(b);
    };
    leaves.forEach(leaf => addChip(leaf.label, () => importLotteryNames([leaf])));
    if (leaves.length > 1) addChip('전체', () => importLotteryNames(leaves));
    addChip('지우기', () => { lotteryEl('ltNames').value = ''; updateLotteryInfo(); });

    const label = document.createElement('label');
    label.className = 'lt-check lt-check-sm';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'ltSkipQuit';
    cb.checked = true;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' 겜접음 제외'));
    box.appendChild(label);
}

function importLotteryNames(leaves) {
    const skipQuit = lotteryEl('ltSkipQuit') ? lotteryEl('ltSkipQuit').checked : false;
    const names = [];
    leaves.forEach(leaf => {
        const { header, members } = GUILD_DATA[leaf.key].data;
        const nickCol = header.indexOf('닉네임');
        const gradeCol = header.indexOf('활동 등급');
        members.forEach(row => {
            const name = (row[nickCol] || '').trim();
            const grade = gradeCol >= 0 ? (row[gradeCol] || '').trim() : '';
            if (name && !(skipQuit && grade === '겜접음')) names.push(name);
        });
    });
    lotteryEl('ltNames').value = names.join('\n');
    updateLotteryInfo();
}

// ── 슬롯 화면 ──
function setReel(text, landed) {
    const reel = lotteryEl('ltReel');
    reel.textContent = text;
    reel.classList.remove('tick', 'land');
    void reel.offsetWidth;   // 같은 애니메이션을 다시 재생하기 위한 처리
    reel.classList.add(landed ? 'land' : 'tick');
}

// 이름이 빠르게 바뀌다가 점점 느려지면서 당첨자에게 멈춤
async function spinReel(pool, winner, duration) {
    const start = performance.now();
    let delay = 45;
    while (!lotterySkip && performance.now() - start < duration) {
        setReel(pool[randInt(pool.length)], false);
        await lotterySleep(delay);
        delay = Math.min(delay * 1.1, 320);
    }
    setReel(winner, true);
}

function addWinnerCard(list, name, order, animate) {
    const li = document.createElement('li');
    li.className = 'lt-win' + (animate ? ' pop' : '');
    li.appendChild(makeCell('span', String(order), 'lt-win-no'));
    li.appendChild(makeCell('span', name, 'lt-win-name'));
    li.appendChild(makeCell('span', '✨', 'lt-win-star'));
    list.appendChild(li);
}

// ── 폭죽 (캔버스에 직접 그림) ──
let confettiParticles = [];
let confettiFrame = null;

function burstConfetti(count) {
    if (lotteryReduceMotion()) return;
    const stage = lotteryEl('ltStage');
    const canvas = lotteryEl('ltConfetti');
    const rect = stage.getBoundingClientRect();
    if (rect.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const reelRect = lotteryEl('ltReel').parentElement.getBoundingClientRect();
    const ox = reelRect.left - rect.left + reelRect.width / 2;
    const oy = reelRect.top - rect.top + reelRect.height / 2;
    for (let i = 0; i < count; i++) {
        confettiParticles.push({
            x: ox, y: oy,
            vx: (Math.random() - 0.5) * 14, vy: -(Math.random() * 9 + 4),
            size: 6 + Math.random() * 7, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
            color: LOTTERY_COLORS[Math.floor(Math.random() * LOTTERY_COLORS.length)],
            age: 0, life: 80 + Math.random() * 60,
        });
    }
    if (!confettiFrame) confettiFrame = requestAnimationFrame(confettiTick);
}

function confettiTick() {
    const canvas = lotteryEl('ltConfetti');
    const ctx = canvas.getContext('2d');
    const dpr = canvas.width / (canvas.clientWidth || canvas.width);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiParticles = confettiParticles.filter(p => p.age < p.life);
    confettiParticles.forEach(p => {
        p.age++;
        p.vy += 0.32;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.min(1, (p.life - p.age) / 30);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
    });
    if (confettiParticles.length) confettiFrame = requestAnimationFrame(confettiTick);
    else { confettiFrame = null; ctx.clearRect(0, 0, canvas.width, canvas.height); }
}

// ── 추첨 ──
function setLotteryLocked(locked) {
    lotteryBusy = locked;
    ['ltNames', 'ltWinners', 'ltTitle', 'ltExclude', 'ltMinus', 'ltPlus', 'ltClear'].forEach(id => { lotteryEl(id).disabled = locked; });
    document.querySelectorAll('#ltImport button, #ltImport input').forEach(el => { el.disabled = locked; });
    lotteryEl('ltStage').classList.toggle('spinning', locked);
    updateLotteryInfo();
}

async function drawLottery() {
    if (lotteryBusy) return;
    const { pool } = lotteryState();
    const n = readWinnerCount();
    if (pool.length === 0 || n > pool.length) { updateLotteryInfo(); return; }

    const winners = pickWinners(pool, n);            // 당첨자는 여기서 이미 정해짐
    const title = lotteryEl('ltTitle').value.trim();
    const winList = lotteryEl('ltWinList');
    const status = lotteryEl('ltStatus');
    const animate = !lotteryReduceMotion();

    lotterySkip = false;
    setLotteryLocked(true);
    winList.innerHTML = '';
    lotteryEl('ltCopy').hidden = true;
    lotteryEl('ltSkip').hidden = !animate;
    lotteryEl('ltReel').parentElement.classList.remove('done');

    const perWinner = n <= 3 ? 1900 : n <= 6 ? 1200 : 800;
    for (let k = 0; k < n; k++) {
        const winner = winners[k];
        if (animate && !lotterySkip) {
            status.textContent = n === 1 ? '추첨 중…' : (k + 1) + '번째 당첨자를 뽑는 중… (' + (k + 1) + '/' + n + ')';
            await spinReel(pool, winner, k === 0 ? perWinner : perWinner * 0.75);
            if (!lotterySkip) { burstConfetti(36); await lotterySleep(420); }
        } else {
            setReel(winner, true);
        }
        addWinnerCard(winList, winner, k + 1, animate && !lotterySkip);
    }

    // 마무리
    winners.forEach(name => lotteryPrev.add(name));
    lotteryLast = { title, total: pool.length, winners };
    lotteryHistory.unshift({ title, winners, time: new Date() });
    setReel(n === 1 ? winners[0] : '🎉 당첨 완료!', true);
    lotteryEl('ltReel').parentElement.classList.add('done');
    status.textContent = '🎉 ' + n + '명 당첨! 축하합니다';
    burstConfetti(110);
    lotteryEl('ltSkip').hidden = true;
    lotteryEl('ltCopy').hidden = false;
    setLotteryLocked(false);
    renderLotteryHistory();
}

function renderLotteryHistory() {
    const box = lotteryEl('ltHistoryBox');
    const list = lotteryEl('ltHistory');
    list.innerHTML = '';
    box.hidden = lotteryHistory.length === 0;
    lotteryHistory.forEach(item => {
        const li = document.createElement('li');
        const hh = String(item.time.getHours()).padStart(2, '0');
        const mm = String(item.time.getMinutes()).padStart(2, '0');
        li.appendChild(makeCell('b', hh + ':' + mm));
        li.appendChild(makeCell('span', ' ' + (item.title || '추첨') + ' · ' + item.winners.length + '명 → ' + item.winners.join(', ')));
        list.appendChild(li);
    });
}

function lotteryResultText() {
    if (!lotteryLast) return '';
    const head = '🎲 랜덤 추첨 결과' + (lotteryLast.title ? ' (' + lotteryLast.title + ')' : '');
    const lines = lotteryLast.winners.map((name, i) => (i + 1) + '. ' + name);
    return [head, '참가자 ' + lotteryLast.total + '명 중 ' + lotteryLast.winners.length + '명 당첨', ...lines].join('\n');
}

async function copyLotteryResult() {
    const text = lotteryResultText();
    const status = lotteryEl('ltStatus');
    try {
        await navigator.clipboard.writeText(text);
        status.textContent = '📋 결과를 복사했어요. 채팅창에 붙여넣기 하세요.';
    } catch (err) {
        const ta = document.createElement('textarea');   // 클립보드 권한이 없을 때의 대체 방법
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand && document.execCommand('copy');
        ta.remove();
        status.textContent = ok ? '📋 결과를 복사했어요. 채팅창에 붙여넣기 하세요.' : '복사하지 못했어요. 직접 선택해서 복사해 주세요.';
    }
}

// 결과·기록 초기화 (참가자 목록은 그대로)
function resetLottery() {
    if (lotteryBusy) return;
    lotteryPrev.clear();
    lotteryHistory.length = 0;
    lotteryLast = null;
    lotteryEl('ltWinList').innerHTML = '';
    lotteryEl('ltCopy').hidden = true;
    lotteryEl('ltStatus').textContent = '참가자를 입력하고 추첨을 시작하세요';
    setReel('추첨 대기 중', false);
    lotteryEl('ltReel').classList.remove('tick');
    lotteryEl('ltReel').parentElement.classList.remove('done');
    renderLotteryHistory();
    updateLotteryInfo();
}

function initLottery() {
    lotteryEl('ltNames').addEventListener('input', updateLotteryInfo);
    lotteryEl('ltWinners').addEventListener('input', updateLotteryInfo);
    lotteryEl('ltExclude').addEventListener('change', updateLotteryInfo);
    lotteryEl('ltMinus').addEventListener('click', () => stepWinners(-1));
    lotteryEl('ltPlus').addEventListener('click', () => stepWinners(1));
    lotteryEl('ltDraw').addEventListener('click', drawLottery);
    lotteryEl('ltSkip').addEventListener('click', () => { lotterySkip = true; });
    lotteryEl('ltCopy').addEventListener('click', copyLotteryResult);
    lotteryEl('ltClear').addEventListener('click', resetLottery);
    lotteryEl('ltImport').appendChild(makeCell('span', '길드원 목록을 불러오는 중...', 'lt-hint'));
    updateLotteryInfo();
}
