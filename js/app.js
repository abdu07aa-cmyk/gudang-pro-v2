// js/app.js - VERSI FINAL, PASTI JALAN

// ===== KONFIGURASI SUPABASE =====
// ⚠️ GANTI DENGAN KREDENSIAL SUPABASE ANDA!
const SUPABASE_URL = 'https://dggspzjibisapdaowkkj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZ3NwemppYmlzYXBkYW93a2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NjMxNzksImV4cCI6MjA4MzQzOTE3OX0.DtDb10SzKfwJg3bbVq53nG9RIXbZYtitXn67ZtdBMFY';

let supabaseClient = null;

// ===== INIT SUPABASE =====
function initSupabase() {
    console.log('🔄 Init Supabase...');
    
    // CDN yang Anda pakai (cdn.jsdelivr.net) menghasilkan variable GLOBAL: supabase
    // BUKAN supabaseJs!
    if (typeof supabase !== 'undefined' && supabase !== null) {
        console.log('✅ Found global "supabase"');
        try {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase client created!');
            return true;
        } catch (e) {
            console.error('❌ Error creating client:', e);
            return false;
        }
    }
    
    // Fallback: coba dari window
    if (window.supabase) {
        console.log('✅ Found window.supabase');
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase client created!');
            return true;
        } catch (e) {
            console.error('❌ Error creating client:', e);
            return false;
        }
    }
    
    console.warn('⚠️ Supabase not found, retrying...');
    setTimeout(initSupabase, 1000);
    return false;
}

// ===== LOGIN =====
async function loginUser(email, password) {
    if (!supabaseClient) {
        const ok = initSupabase();
        if (!ok) {
            return { success: false, message: 'Supabase tidak siap. Refresh halaman.' };
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

// ===== REGISTER =====
async function registerUser(email, password, fullName) {
    if (!supabaseClient) {
        const ok = initSupabase();
        if (!ok) {
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

// ===== LOGOUT =====
function logoutUser() {
    if (supabaseClient) supabaseClient.auth.signOut();
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// ===== GET CURRENT USER =====
function getCurrentUser() {
    try {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
}

// ===== UTILITY =====
function formatNumber(num) {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '0';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.textContent = message;
    const colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb' };
    toast.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
        background: ${colors[type] || colors.info}; color: white; 
        padding: 12px 24px; border-radius: 12px; z-index: 9999;
        font-weight: 500; max-width: 90%; text-align: center;
        animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== DASHBOARD STATS =====
async function loadDashboardStats() {
    if (!supabaseClient) {
        const ok = initSupabase();
        if (!ok) return;
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

// ===== AUTO INIT =====
console.log('🚀 App.js loaded');
setTimeout(initSupabase, 500);
