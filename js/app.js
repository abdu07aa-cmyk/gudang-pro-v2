const SUPABASE_URL = 'https://dggspzjibisapdaowkkj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZ3NwemppYmlzYXBkYW93a2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NjMxNzksImV4cCI6MjA4MzQzOTE3OX0.DtDb10SzKfwJg3bbVq53nG9RIXbZYtitXn67ZtdBMFY';

let supabaseClient = null;

function initSupabase() {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ OK');
        return true;
    }
    setTimeout(initSupabase, 1000);
    return false;
}

async function loginUser(email, password) {
    if (!supabaseClient) initSupabase();
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem('user', JSON.stringify(data.user));
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

window.loginUser = loginUser;
window.getCurrentUser = getCurrentUser;
console.log('✅ app.js loaded');
initSupabase();
