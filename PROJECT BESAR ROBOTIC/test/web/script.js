const firebaseConfig = {
    apiKey: "AIzaSyArzo0xdurFCyANC56c6lHdcoV8GjOGmIQ",
    databaseURL: "https://projek-besar-robbotic-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "projek-besar-robbotic"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// LIVE CLOCK
setInterval(() => {
    document.getElementById('live-clock').innerText = new Date().toLocaleTimeString('id-ID', {hour12: false});
}, 1000);

// ANIMASI SLIDE & TAB
function switchTab(target) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-tab-' + target).classList.add('active');

    const panes = document.querySelectorAll('.pane');
    panes.forEach(p => { p.style.display = 'none'; p.classList.remove('active'); });

    const activePane = document.getElementById('view-' + target);
    activePane.style.display = 'block';
    setTimeout(() => { activePane.classList.add('active'); }, 50);

    if(target === 'logs') generateCalendar();
}

// TOGGLE SIDEBAR GRAFIK
document.getElementById('toggle-chart').onclick = function() {
    const aside = document.getElementById('panel-charts');
    const isHidden = aside.classList.toggle('hidden');
    this.innerText = isHidden ? "📊 GRAFIK" : "✖ TUTUP";
};

// GRAFIK BINER & SENSOR
const chartOpt = (min, max, isRain = false) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
        x: { display: false },
        y: { min, max, ticks: { stepSize: isRain ? 1 : null, callback: v => isRain ? (v === 1 ? 'HUJAN' : 'KERING') : v } }
    }
});

const tempChart = new Chart(document.getElementById('tempChart'), {
    type: 'line', data: { labels: [], datasets: [{ data: [], borderColor: '#ff7675', fill: true, backgroundColor: 'rgba(255,118,117,0.1)', tension: 0.4 }] },
    options: chartOpt(0, 50)
});
const humChart = new Chart(document.getElementById('humChart'), {
    type: 'line', data: { labels: [], datasets: [{ data: [], borderColor: '#4318ff', fill: true, backgroundColor: 'rgba(67,24,255,0.1)', tension: 0.4 }] },
    options: chartOpt(0, 100)
});
const rainChart = new Chart(document.getElementById('rainChart'), {
    type: 'line', data: { labels: [], datasets: [{ data: [], borderColor: '#f1c40f', stepped: true }] },
    options: chartOpt(0, 1, true)
});

// FIREBASE LISTENER REALTIME
let lastState = 0;
db.ref('monitoring/current').on('value', snap => {
    const d = snap.val(); if(!d) return;
    const s = parseFloat(d.suhu).toFixed(1);
    const h = parseInt(d.kelembaban);
    const isWet = d.durasi_air >= 5 ? 1 : 0;

    if (lastState === 0 && isWet === 1) showToast("⚠️ PERINGATAN: Hujan terdeteksi!");
    lastState = isWet;

    document.getElementById('val-temp').innerText = s + "°C";
    document.getElementById('bar-temp').style.width = (s/50*100) + "%";
    document.getElementById('val-hum').innerText = h + "%";
    document.getElementById('bar-hum').style.width = h + "%";

    const rainTxt = document.getElementById('val-rain');
    rainTxt.innerText = isWet ? "HUJAN" : "KERING";
    rainTxt.style.color = isWet ? "#ff4757" : "#2ed573";
    document.getElementById('main-status-text').innerText = isWet ? "🚨 JALAN LICIN!" : "✅ JALAN NORMAL";

    const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    [ [tempChart, s], [humChart, h], [rainChart, isWet] ].forEach(([c, v]) => {
        if(c.data.labels.length > 20) { c.data.labels.shift(); c.data.datasets[0].data.shift(); }
        c.data.labels.push(time); c.data.datasets[0].data.push(v); c.update('none');
    });
});

// KALENDER REAL-TIME DENGAN TANGGAL HARI INI MUNDUR 30 HARI & DATA CSV
let globalCSVContent = "";

function generateCalendar() {
    const cont = document.getElementById('cal-container'); 
    cont.innerHTML = "";
    
    // Setup Header CSV
    globalCSVContent = "Tanggal,Suhu,Kelembaban,Kondisi Jalan\n";
    
    // Ambil tanggal hari ini
    const today = new Date();

    // Generate 30 hari ke belakang (Loop dari 29 sampai 0)
    for(let i = 29; i >= 0; i--) {
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - i);
        
        // Format Tanggal (Contoh: 21 Feb 2026)
        const dateString = pastDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        // Simulasi Data History (Anda bisa ganti dengan data database jika ada)
        const isR = Math.random() > 0.8; 
        const tempHistory = (22 + Math.random() * 8).toFixed(1);
        const humHistory = Math.floor(60 + Math.random() * 30);
        const statusHistory = isR ? "Hujan" : "Kering";

        // Tambahkan baris ke CSV String
        globalCSVContent += `${dateString},${tempHistory} °C,${humHistory}%,${statusHistory}\n`;

        // Buat Elemen Kotak Kalender
        const d = document.createElement('div');
        d.className = `cal-item ${isR ? 'cal-rain' : ''}`;
        d.innerHTML = `
            <div class="cal-date">${dateString}</div>
            <div class="cal-icon">${isR ? '🌧️' : '☀️'}</div>
            <div class="cal-stats">
                <span style="color: #ff7675;">🌡️ ${tempHistory}°C</span>
                <span style="color: #4facfe;">💧 ${humHistory}%</span>
                <span style="margin-top:2px; color: ${isR ? '#1976d2' : '#888'};">${statusHistory.toUpperCase()}</span>
            </div>
        `;
        cont.appendChild(d);
    }
}

// UTILS (CSV HIJAU, TOAST, THEME, MODAL)
function exportData() {
    // Memastikan kalender digenerate dulu agar globalCSVContent terisi
    if(globalCSVContent === "") generateCalendar(); 
    
    const blob = new Blob([globalCSVContent], {type:'text/csv'});
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob); 
    a.download = 'Laporan_Realtime_30_Hari.csv'; 
    a.click();
}

function showToast(m) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div'); t.className = 'toast'; t.innerText = m;
    c.appendChild(t); setTimeout(() => t.remove(), 4000);
}

document.getElementById('theme-checkbox').onchange = e => {
    document.body.classList.toggle('dark-theme', e.target.checked);
};

function openModal() { document.getElementById('modal-loc').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal-loc').classList.add('hidden'); }