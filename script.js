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

// 2. 명중 계산기 로직
function calculateTotal() {
    const stat1 = parseInt(document.getElementById('stat1').value) || 0;
    const stat2 = parseInt(document.getElementById('stat2').value) || 0;
    const stat3 = parseInt(document.getElementById('stat3').value) || 0;
    const stat4 = parseInt(document.getElementById('stat4').value) || 0;
    
    const total = stat1 + stat2 + stat3 + stat4;
    document.getElementById('totalBox').innerText = total;
}

function checkBosses() {
    calculateTotal(); 
    const totalScore = parseInt(document.getElementById('totalBox').innerText) || 0;
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

// 3. 패키지 효율 계산 로직
function calculatePackages() {
    // 1다이아 가치(13.75원) 및 11회 소환권 가치(27500원) 고정 적용
    const unitDiaPrice = 13.75; 
    const unitTicketPrice = 27500;

    // 패키지 1 계산
    const p1Price = parseFloat(document.getElementById('pkg1-price').value) || 1;
    const p1Dia = parseFloat(document.getElementById('pkg1-dia').value) || 0;
    const p1Ticket = parseFloat(document.getElementById('pkg1-ticket').value) || 0;

    const p1Value = (p1Dia * unitDiaPrice) + (p1Ticket * unitTicketPrice);
    const p1Eff = (p1Value / p1Price) * 100;

    document.getElementById('pkg1-total-val').innerText = Math.round(p1Value).toLocaleString() + "원";
    document.getElementById('pkg1-eff').innerText = p1Eff.toFixed(1) + "%";
    toggleEffClass('pkg1-eff', p1Eff);

    // 패키지 2 계산
    const p2Price = parseFloat(document.getElementById('pkg2-price').value) || 1;
    const p2Dia = parseFloat(document.getElementById('pkg2-dia').value) || 0;
    const p2Ticket = parseFloat(document.getElementById('pkg2-ticket').value) || 0;

    const p2Value = (p2Dia * unitDiaPrice) + (p2Ticket * unitTicketPrice);
    const p2Eff = (p2Value / p2Price) * 100;

    document.getElementById('pkg2-total-val').innerText = Math.round(p2Value).toLocaleString() + "원";
    document.getElementById('pkg2-eff').innerText = p2Eff.toFixed(1) + "%";
    toggleEffClass('pkg2-eff', p2Eff);
}

function toggleEffClass(elementId, effValue) {
    const el = document.getElementById(elementId);
    if(effValue >= 100) {
        el.className = "efficiency-high";
    } else {
        el.className = "efficiency-low";
    }
}

// 초기화 코드 실행
window.onload = function() {
    calculateTotal();
    calculatePackages();
}
