function openTab(tabId) {
    console.log(tabId + " 탭 클릭됨");
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(c => c.classList.remove('active'));
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    const btn = document.getElementById('btn-' + tabId);
    if(btn) btn.classList.add('active');
}

function checkBosses() {
    const s1 = parseInt(document.getElementById('stat1').value) || 0;
    const s2 = parseInt(document.getElementById('stat2').value) || 0;
    const s3 = parseInt(document.getElementById('stat3').value) || 0;
    const s4 = parseInt(document.getElementById('stat4').value) || 0;
    const total = s1 + s2 + s3 + s4;
    document.getElementById('totalBox').innerText = total.toLocaleString();

    document.querySelectorAll('.boss-cell').forEach(cell => {
        const cut = parseInt(cell.getAttribute('data-cut'));
        if (cut && total >= cut) cell.classList.add('active');
        else cell.classList.remove('active');
    });
}

window.onload = () => checkBosses();
