// 1. 탭 전환 기능
function openTab(tabId) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));

    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    
    // 버튼 불 켜기
    if(tabId === 'accuracy') document.getElementById('btn-accuracy').classList.add('active');
    if(tabId === 'settings') document.getElementById('btn-settings').classList.add('active');
}

// 2. 명중 계산 및 보스 체크 로직 (통합)
function checkBosses() {
    const stat1 = parseInt(document.getElementById('stat1').value) || 0;
    const stat2 = parseInt(document.getElementById('stat2').value) || 0;
    const stat3 = parseInt(document.getElementById('stat3').value) || 0;
    const stat4 = parseInt(document.getElementById('stat4').value) || 0;
    
    const totalScore = stat1 + stat2 + stat3 + stat4;
    document.getElementById('totalBox').innerText = totalScore.toLocaleString();

    const cells = document.querySelectorAll('.boss-cell');
    cells.forEach(cell => {
        const cutStr = cell.getAttribute('data-cut');
        if(cutStr) {
            const cutValue = parseInt(cutStr);
            if(totalScore >= cutValue) {
                cell.classList.add('active');
            } else {
                cell.classList.remove('active');
            }
        }
    });
}

// 초기화 실행
window.onload = function() {
    checkBosses();
}
