// 미리보기용 더미 시트 데이터 (data.js의 USE_DUMMY_DATA가 true일 때만 사용)

// 더미 CSV: 실제 시트와 같은 구조로 만들어서 같은 코드로 화면을 그림
function buildDummyCSV() {
    const weeks = 5;
    const members = [
        ['길드원01', '길드장', 104, [3, 2, 4, 3, 2]],
        ['길드원02', '부길드장', 105, [2, 3, 2, 3, 1]],
        ['길드원03', '부길드장', 101, [1, 2, 3, 1, 2]],
        ['길드원04', '정예길드원', 96, [2, 2, 1, 2, 2]],
        ['길드원05', '정예길드원', 99, [1, 1, 2, 1, 0]],
        ['길드원06', '정예길드원', 95, [1, 0, 1, 1, 1]],
        ['길드원07', '일반길드원', 98, [0, 1, 0, 1, 0]],
        ['길드원08', '일반길드원', 102, [1, 0, 0, 0, 1]],
        ['길드원09', '일반길드원', 97, [0, 0, 0, 1, 0]],
        ['길드원10', '일반길드원', 103, [0, 0, 0, 0, 0]],
    ];
    const gradeOf = avg => avg >= 2.4 ? '다이아' : avg >= 1.8 ? '플래티넘' : avg >= 1.4 ? '골드' : avg >= 0.6 ? '실버' : avg > 0 ? '브론즈' : '관심필요';
    const blank = () => new Array(weeks + 8).fill('');
    const line = cells => cells.join(',');

    let grandTotal = 0;
    const weekTotals = new Array(weeks).fill(0);
    let topCount = 0;
    const memberLines = members.map((m, i) => {
        const total = m[3].reduce((a, b) => a + b, 0);
        const avg = total / weeks;
        const grade = gradeOf(avg);
        if (grade === '다이아') topCount++;
        grandTotal += total;
        m[3].forEach((v, w) => { weekTotals[w] += v; });
        return line(['', i + 1, m[0], m[1], m[2], total + '회', avg.toFixed(1) + '회', grade, ...m[3].map(v => v + '회')]);
    });

    const n = members.length;
    const lines = [];
    lines.push(line(blank()));
    const t = blank(); t[1] = '⚔️ 길드원 주간 활동 트래커'; lines.push(line(t));
    const sub = blank(); sub[1] = '길드원별 주차별 활동량 집계 대시보드 (더미 데이터)'; lines.push(line(sub));
    lines.push(line(blank()));
    const l1 = blank(); l1[1] = '👥 총 길드원 수'; l1[3] = '⚡ 총 누적 활동 수'; l1[6] = '📊 주간 평균 활동(인당)'; l1[9] = '👑 활동 우수자 비율'; lines.push(line(l1));
    const v1 = blank(); v1[1] = n + '명'; v1[3] = grandTotal + '회'; v1[6] = (grandTotal / n / weeks).toFixed(1) + '회'; v1[9] = (topCount / n * 100).toFixed(1) + '%'; lines.push(line(v1));
    const c1 = blank(); c1[1] = '정원 관리 지표'; c1[3] = '전체 활동 총합'; c1[6] = '길드원 1인 평균'; c1[9] = '다이아 등급 이상'; lines.push(line(c1));
    lines.push(line(blank()));
    const head = ['', 'No.', '닉네임', '길드 직급', '레벨', '누적 활동', '주간 평균', '활동 등급'];
    for (let w = 1; w <= weeks; w++) head.push(w + '주차');
    lines.push(line(head));
    lines.push(...memberLines);
    const foot = blank();
    foot[1] = '길드 전체 합계 및 평균'; foot[5] = grandTotal + '회'; foot[6] = (grandTotal / n / weeks).toFixed(1) + '회'; foot[7] = '활동 ' + n + ' / 50명';
    weekTotals.forEach((v, w) => { foot[8 + w] = v + '회'; });
    lines.push(line(foot));
    return lines.join('\n');
}

// 미리보기용 더미 스케줄 CSV (USE_DUMMY_DATA가 true일 때만 사용)
function buildDummyScheduleCSV() {
    return [
        'schedule_type,title,weekday,start_date,end_date,start_time,end_time,description',
        '반복,월드보스,매일,,,20:00,20:10,매일 진행하는 월드보스',
        '반복,길드 콘텐츠,일요일,,,21:00,22:00,월드보스 종료 후 진행',
        '일회성,특별 이벤트,매일,2026-11-24,2026-11-26,15:00,16:00,해당 날짜에만 진행하는 이벤트',
    ].join('\n');
}

// 미리보기용 더미 로비 시트 CSV (USE_DUMMY_DATA가 true일 때만 사용)
function buildDummyLoungeCSV() {
    const a = ['길드원A', '길드원B', '길드원C', '길드원D', '길드원E', '길드원F', '길드원G', '길드원H', '길드원I', '길드원J'];
    const b = ['길드원K', '길드원L', '길드원M', '길드원N', '길드원O', '길드원P', '길드원Q', '길드원R', '길드원S', '길드원T'];
    const rows = [',,,,,,,,,,,,,', ',,,,,,,,,,,,,', ',,,,,,,,,,,,,', ',,구분,순위,닉네임,구분,순위,닉네임,,구분,순위,닉네임,전투력 증감,소속클랜'];
    for (let i = 0; i < 10; i++) rows.push(`,,전투력 TOP,${i + 1},${a[i]},전투력 TOP,${i + 1},${b[i]},,주간 종합성장 TOP,${i + 1},${i % 2 ? b[i] : a[i]},${30000 - i * 2500},${i % 2 ? '왜나만패' : '난너만패'}`);
    for (let i = 0; i < 10; i++) rows.push(`,,주간 성장 TOP,${i + 1},${a[9 - i]},주간 성장 TOP,${i + 1},${b[9 - i]},,,,,,`);
    return rows.join('\n');
}
