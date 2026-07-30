// ===== KONFIGURASI SUPABASE =====
const SUPABASE_URL = 'https://dggspzjibisapdaowkkj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZ3NwemppYmlzYXBkYW93a2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NjMxNzksImV4cCI6MjA4MzQzOTE3OX0.DtDb10SzKfwJg3bbVq53nG9RIXbZYtitXn67ZtdBMFY';

let supabaseClient = null;

// ===== INIT SUPABASE =====
function initSupabase() {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase Connected');
        return true;
    }
    setTimeout(initSupabase, 1000);
    return false;
}

// ===== LOGIN =====
async function loginUser(email, password) {
    console.log('🔐 Login function called');
    
    if (!supabaseClient) {
        initSupabase();
    }
    
    if (!supabaseClient) {
        return { success: false, message: 'Supabase tidak siap' };
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Login error:', error);
            throw error;
        }
        
        console.log('✅ Login success:', data.user.email);
        localStorage.setItem('user', JSON.stringify(data.user));
        return { success: true, user: data.user };
        
    } catch (error) {
        console.error('❌ Login failed:', error.message);
        return { success: false, message: error.message };
    }
}

// ===== REGISTER =====
async function registerUser(email, password, fullName) {
    console.log('📝 Register function called');
    
    if (!supabaseClient) {
        initSupabase();
    }
    
    if (!supabaseClient) {
        return { success: false, message: 'Supabase tidak siap' };
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { 
                    full_name: fullName,
                    role: 'inspector' 
                }
            }
        });
        
        if (error) {
            console.error('Register error:', error);
            throw error;
        }
        
        console.log('✅ Register success:', data.user.email);
        return { success: true, user: data.user };
        
    } catch (error) {
        console.error('❌ Register failed:', error.message);
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
    } catch {
        return null;
    }
}

// ===== EXPOSE KE GLOBAL =====
window.initSupabase = initSupabase;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.getCurrentUser = getCurrentUser;

console.log('🚀 app.js loaded');
initSupabase();
