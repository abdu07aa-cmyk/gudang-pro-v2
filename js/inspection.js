// inspection.js - Full logic for QC inspection form
import { calculateAQL } from './sampling-calc.js';
import { saveInspection } from './storage.js';

let defectList = [];

// Fungsi utama start inspeksi
export function startInspection(batchId, lotSize, aqlLevel) {
    const sampleSize = calculateAQL(lotSize, aqlLevel);
    document.getElementById('sample-size').innerText = sampleSize;
    document.getElementById('batch-id').value = batchId;
    resetDefects();
}

// Tambah defect
export function addDefect(type, category, description) {
    defectList.push({
        id: Date.now(),
        type, // 'Major', 'Minor', 'Critical'
        category,
        description,
        timestamp: new Date().toISOString()
    });
    updateDefectCounter();
    renderDefectTable();
}

// Hapus defect
export function removeDefect(id) {
    defectList = defectList.filter(d => d.id !== id);
    updateDefectCounter();
    renderDefectTable();
}

// Update counter
function updateDefectCounter() {
    const major = defectList.filter(d => d.type === 'Major').length;
    const minor = defectList.filter(d => d.type === 'Minor').length;
    const critical = defectList.filter(d => d.type === 'Critical').length;
    document.getElementById('major-count').innerText = major;
    document.getElementById('minor-count').innerText = minor;
    document.getElementById('critical-count').innerText = critical;
}

// Submit inspeksi
export function submitInspection() {
    const result = {
        batchId: document.getElementById('batch-id').value,
        inspector: document.getElementById('inspector-name').value,
        date: new Date().toISOString(),
        totalDefect: defectList.length,
        defects: defectList,
        status: defectList.length === 0 ? 'PASS' : 'REJECT'
    };
    saveInspection(result);
    alert('Inspeksi berhasil disimpan!');
    resetDefects();
}

function resetDefects() {
    defectList = [];
    updateDefectCounter();
    renderDefectTable();
}

function renderDefectTable() {
    // Render ke tabel HTML
}
