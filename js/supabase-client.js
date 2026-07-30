// js/supabase-client.js
// Cara import yang benar untuk Supabase JS v2
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/module/index.js';
// ATAU gunakan CDN alternatif:
// import { createClient } from 'https://unpkg.com/@supabase/supabase-js@2/dist/module/index.js';

import { SUPABASE_CONFIG } from './config.js';

// Inisialisasi Supabase client
const supabase = createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

export default supabase;
