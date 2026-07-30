// js/dashboard.js
import supabase from './supabase-client.js';
import { requireAuth } from './auth.js';

// Proteksi halaman
requireAuth();

// Inisialisasi Chart
let defectChart = null;

// Load data dashboard
async function loadDashboard() {
    try {
        // Ambil statistik dari view
        const { data: stats, error: statsError } = await supabase
            .from('dashboard_stats')
            .select('*')
            .single();
        
        if (statsError) throw statsError;
        updateKPIs(stats);
        
        // Ambil top 5 defect types
        const { data: topDefects, error: defectError } = await supabase
            .from('defects')
            .select('defect_type, quantity')
            .order('quantity', { ascending: false })
            .limit(5);
        
        if (defectError) throw defectError;
        renderDefectChart(topDefects);
        
        // Ambil inspeksi terakhir (5 data)
        const { data: recent, error: recentError } = await supabase
            .from('inspections')
            .select(`
                id,
                inspection_date,
                status,
                batches (
                    batch_number,
                    products (product_name)
                )
            `)
            .order('inspection_date', { ascending: false })
            .limit(5);
        
        if (recentError) throw recentError;
        renderRecentInspections(recent);
        
        // ===== REALTIME SUBSCRIPTION =====
        subscribeToRealtime();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Gagal memuat data dashboard', 'error');
    }
}

// Update KPI Cards
function updateKPIs(stats) {
    document.getElementById('total-inspections').textContent = stats.total_inspections || 0;
    document.getElementById('passed').textContent = stats.passed || 0;
    document.getElementById('rejected').textContent = stats.rejected || 0;
    
    const defectRate = stats.total_inspections > 0 
        ? ((stats.rejected / stats.total_inspections) * 100).toFixed(1)
        : 0;
    document.getElementById('defect-rate').textContent = defectRate + '%';
}

// Render Chart.js
function renderDefectChart(defects) {
    const ctx = document.getElementById('defectChart').getContext('2d');
    
    const labels = defects.map(d => d.defect_type);
    const data = defects.map(d => d.quantity);
    
    if (defectChart) {
        defectChart.destroy();
    }
    
    defectChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Defect',
                data: data,
                backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Render tabel inspeksi terbaru
function renderRecentInspections(inspections) {
    const tbody = document.querySelector('#recent-table tbody');
    tbody.innerHTML = '';
    
    inspections.forEach(insp => {
        const tr = document.createElement('tr');
        const productName = insp.batches?.products?.product_name || '-';
        const batchNumber = insp.batches?.batch_number || '-';
        const date = new Date(insp.inspection_date).toLocaleDateString('id-ID');
        const status = insp.status === 'pass' ? '✓ Pass' : '✗ Fail';
        const statusClass = insp.status === 'pass' ? 'pass' : 'fail';
        
        tr.innerHTML = `
            <td>${productName}</td>
            <td>${batchNumber}</td>
            <td>${date}</td>
            <td><span class="status ${statusClass}">${status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// ===== REALTIME SUBSCRIPTION =====
function subscribeToRealtime() {
    const channel = supabase
        .channel('dashboard-realtime')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'inspections'
            },
            (payload) => {
                console.log('New inspection added:', payload);
                // Reload dashboard otomatis
                loadDashboard();
                showToast('📊 Data inspeksi terbaru masuk!', 'info');
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'inspections'
            },
            (payload) => {
                console.log('Inspection updated:', payload);
                loadDashboard();
            }
        )
        .subscribe();
    
    return channel;
}

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #1a1a2e;
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        z-index: 9999;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Load saat halaman siap
document.addEventListener('DOMContentLoaded', loadDashboard);
