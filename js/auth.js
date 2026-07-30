// js/auth.js
import supabase from './supabase-client.js';

// Login
export async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/dashboard.html';
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: error.message };
    }
}

// Register
export async function register(email, password, fullName, role = 'inspector') {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role
                }
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
export async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Get current user
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Require auth (middleware)
export function requireAuth() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = '/login.html';
        return null;
    }
    return JSON.parse(user);
}
