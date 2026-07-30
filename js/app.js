// js/app.js - VERSI TERBARU (PASTI JALAN)

// ===== KONFIGURASI SUPABASE =====
// ⚠️ GANTI DENGAN KREDENSIAL SUPABASE ANDA!
// Bisa dapatkan dari: https://supabase.com/dashboard/project/_/settings/api
const SUPABASE_URL = 'https://dggspzjibisapdaowkkj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZ3NwemppYmlzYXBkYW93a2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NjMxNzksImV4cCI6MjA4MzQzOTE3OX0.DtDb10SzKfwJg3bbVq53nG9RIXbZYtitXn67ZtdBMFY';

let supabaseClient = null;

// Inisialisasi Supabase - CEK BAIK DARI CDN ATAU GLOBAL
function initSupabase() {
    // Cek apakah supabase tersedia dari CDN (umd)
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized from CDN');
        return true;
    }
    
    // Cek apakah supabaseJs tersedia (alternatif)
    if (typeof supabaseJs !== 'undefined') {
        supabaseClient = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized from supabaseJs');
        return true;
    }
    
    console.warn('⚠️ Supabase not loaded yet, retrying...');
    // Retry after 1 second
    setTimeout(initSupabase, 1000);
    return false;
}

// ===== FUNGSI AUTH =====
async function loginUser(email, password) {
    if (!supabaseClient) {
        const inited = initSupabase();
        if (!inited) {
            return { success: false, message: 'Supabase tidak siap. Coba refresh halaman.' };
        }
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        localStorage.setItem('user', JSON.stringify(data.user));
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: error.message };
    }
}

async function registerUser(email, password, fullName) {
    if (!supabaseClient) {
        const inited = initSupabase();
        if (!inited) {
            return { success: false, message: 'Supabase tidak siap' };
        }
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { full_name: fullName, role: 'inspector' }
            }
        });
        if (error) throw error;
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Register error:', error);
        return { success: false, message: error.message };
    }
}

function logoutUser() {
    if (supabaseClient) supabaseClient.auth.signOut();
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

function getCurrentUser() {
    try {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
}

// ===== FUNGSI UTILITY =====
function formatNumber(num) {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '0';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
        background: #1a1a2e; color: white; padding: 12px 24px;
        border-radius: 12px; z-index: 9999; font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
        max-width: 90%;
        text-align: center;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== FUNGSI DASHBOARD =====
async function loadDashboardStats() {
    if (!supabaseClient) {
        const inited = initSupabase();
        if (!inited) return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('dashboard_stats')
            .select('*')
            .single();
        
        if (!error && data) {
            const el = (id) => document.getElementById(id);
            if (el('total-inspections')) el('total-inspections').textContent = formatNumber(data.total_inspections || 0);
            if (el('passed')) el('passed').textContent = formatNumber(data.passed || 0);
            if (el('rejected')) el('rejected').textContent = formatNumber(data.rejected || 0);
            
            const total = data.total_inspections || 0;
            const rejected = data.rejected || 0;
            const rate = total > 0 ? ((rejected / total) * 100).toFixed(1) : 0;
            if (el('defect-rate')) el('defect-rate').textContent = rate + '%';
        }
    } catch (error) {
        console.log('Stats not available');
    }
}

// ===== EXPOSE KE GLOBAL =====
window.initSupabase = initSupabase;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.getCurrentUser = getCurrentUser;
window.loadDashboardStats = loadDashboardStats;
window.formatNumber = formatNumber;
window.showToast = showToast;

// Auto-init saat halaman load
document.addEventListener('DOMContentLoaded', function() {
    // Coba init setelah 500ms
    setTimeout(initSupabase, 500);
    // Coba lagi setelah 2 detik jika gagal
    setTimeout(initSupabase, 2000);
    console.log('✅ App.js loaded');
});
