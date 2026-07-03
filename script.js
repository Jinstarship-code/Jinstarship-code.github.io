// 1. 탭 전환 기능
function openTab(tabId) {
    const contents = document.querySelectorAll('.tab-content');
    for(let i=0; i<contents.length; i++) {
        contents[i].classList.remove('active');
    }
    const buttons = document.querySelectorAll('.tab-btn');
    for(let i=0; i<buttons.length; i++) {
        buttons[i].classList.remove('active');
    }
    document.getElementById(tabId).classList.add('active');
    
    // 탭 버튼 활성화 불 켜기
    if(tabId === 'accuracy') document.getElementById('btn-accuracy').classList.add('active');
    if(tabId === 'weekly') document.getElementById('btn-weekly').classList.add('active');
    if(tabId === 'settings') document.getElementById('btn-settings').classList.add('active');

    if(tabId === 'weekly') {
        calculatePackages();
    }
}

// 2. 명중 계산기 및 보스 체크 로직 (실시간 통합)
function checkBosses() {
    // 2-1. 명중 합계 계산
    const stat1 = parseInt(document.getElementById('stat1').value) || 0;
    const stat2 = parseInt(document.getElementById('stat2').value) || 0;
    const stat3 = parseInt(document.getElementById('stat3').value) || 0;
    const stat4 = parseInt(document.getElementById('stat4').value) || 0;
    
    const totalScore = stat1 + stat2 + stat3 + stat4;
    document.getElementById('totalBox').innerText = totalScore;

    // 2-2. 보스 테이블 실시간 불 켜기
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

// 3. 패키지 효율 계산 로직 (반복문으로 일괄 최적화)
function calculatePackages() {
    const unitDiaPrice = 13.75; 
    const unitTicketPrice = 27500;

    // HTML에 있는 모든 패키지 행(.package-row)을 찾아서 자동으로 반복 계산합니다.
    const rows = document.querySelectorAll('.package-row');
    
    rows.forEach(row => {
        const num = row.getAttribute('data-num'); // 예: "1" 또는 "2"
        
        const price = parseFloat(document.getElementById(`pkg${num}-price`).value) || 1;
        const dia = parseFloat(document.getElementById(`pkg${num}-dia`).value) || 0;
        const ticket = parseFloat(document.getElementById(`pkg${num}-ticket`).value) || 0;

        const totalValue = (dia * unitDiaPrice) + (ticket * unitTicketPrice);
        const efficiency = (totalValue / price) * 100;

        document.getElementById(`pkg${num}-total-val`).innerText = Math.round(totalValue).toLocaleString() + "원";
        
        const effElement = document.getElementById(`pkg${num}-eff`);
        effElement.innerText = efficiency.toFixed(1) + "%";
        
        // 효율 클래스 변경 (100% 기준)
        if(efficiency >= 100) {
            effElement.className = "efficiency-high";
        } else {
            effElement.className = "efficiency-low";
        }
    });
}

// 초기화 코드 실행
window.onload = function() {
    checkBosses();
    calculatePackages();
}
