// js/app.js - VERSI PALING SIMPEL, PASTI JALAN

// ===== KONFIGURASI SUPABASE =====
// ⚠️ GANTI DENGAN KREDENSIAL SUPABASE ANDA!
// Bisa dapatkan dari: https://supabase.com/dashboard/project/_/settings/api
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

let supabaseClient = null;

// Inisialisasi Supabase
function initSupabase() {
    if (typeof supabaseJs !== 'undefined') {
        supabaseClient = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized');
        return true;
    }
    console.warn('⚠️ Supabase JS not loaded yet');
    return false;
}

// Login function
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

// Register function
async function registerUser(email, password, fullName) {
    if (!supabaseClient) initSupabase();
    if (!supabaseClient) {
        return { success: false, message: 'Supabase not ready' };
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

// Logout
function logoutUser() {
    if (supabaseClient) supabaseClient.auth.signOut();
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Get current user
function getCurrentUser() {
    try {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
}

// Utility functions
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
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Auto-init saat halaman load
document.addEventListener('DOMContentLoaded', function() {
    // Tunggu sebentar agar Supabase CDN selesai load
    setTimeout(initSupabase, 500);
    console.log('✅ App.js loaded');
});

// Export untuk digunakan di HTML
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.getCurrentUser = getCurrentUser;
window.initSupabase = initSupabase;
window.supabaseClient = supabaseClient;
window.showToast = showToast;
window.formatNumber = formatNumber;
