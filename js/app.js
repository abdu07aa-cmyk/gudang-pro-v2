// js/app.js - FILE SATU-SATUNYA, PASTI JALAN

// ===== KONFIGURASI SUPABASE =====
// GANTI DENGAN KREDENSIAL SUPABASE ANDA!
const SUPABASE_URL = 'https://dggspzjibisapdaowkkj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZ3NwemppYmlzYXBkYW93a2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NjMxNzksImV4cCI6MjA4MzQzOTE3OX0.DtDb10SzKfwJg3bbVq53nG9RIXbZYtitXn67ZtdBMFY';

let supabaseClient = null;

function initSupabase() {
    if (typeof supabaseJs !== 'undefined') {
        supabaseClient = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized');
        return true;
    }
    console.warn('⚠️ Supabase JS not loaded yet');
    return false;
}

// ===== AUTH FUNCTIONS =====
async function loginUser(email, password) {
    if (!supabaseClient) initSupabase();
    if (!supabaseClient) {
        return { success: false, message: 'Supabase not ready' };
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

function formatNumber(num) {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '0';
}

async function loadDashboardStats() {
    if (!supabaseClient) initSupabase();
    if (!supabaseClient) return;
    
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
window.logoutUser = logoutUser;
window.getCurrentUser = getCurrentUser;
window.loadDashboardStats = loadDashboardStats;
window.formatNumber = formatNumber;

// Auto-init
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initSupabase, 500);
    console.log('✅ App.js loaded (no modules!)');
});
