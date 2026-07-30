// js/inspection.js
import supabase from './supabase-client.js';
import { requireAuth } from './auth.js';
import { calculateAQL } from './sampling-calc.js';

// State
let currentDefects = [];
let selectedFiles = [];
let currentBatchId = null;

// Load daftar produk untuk dropdown
async function loadProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('id, product_code, product_name')
        .order('product_name');
    
    if (error) throw error;
    const select = document.getElementById('product-select');
    select.innerHTML = '<option value="">Pilih Produk...</option>';
    data.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.product_code} - ${p.product_name}</option>`;
    });
}

// Load detail batch
document.getElementById('batch-number').addEventListener('change', async function() {
    const batchNumber = this.value;
    if (!batchNumber) return;
    
    const { data, error } = await supabase
        .from('batches')
        .select('id, lot_size, product_id, products(product_name)')
        .eq('batch_number', batchNumber)
        .single();
    
    if (error) {
        alert('Batch tidak ditemukan!');
        return;
    }
    
    currentBatchId = data.id;
    document.getElementById('lot-size').value = data.lot_size;
    document.getElementById('product-name-display').textContent = data.products.product_name;
    
    // Hitung sample size berdasarkan AQL
    const sampleSize = calculateAQL(data.lot_size, 'II');
    document.getElementById('sample-size').textContent = sampleSize;
});

// Tambah defect dengan foto
async function addDefect() {
    const type = document.getElementById('defect-type').value;
    const category = document.getElementById('defect-category').value;
    const description = document.getElementById('defect-desc').value;
    const quantity = parseInt(document.getElementById('defect-qty').value) || 1;
    const location = document.getElementById('defect-location').value;
    
    if (!type || !description) {
        alert('Harap isi jenis dan deskripsi defect!');
        return;
    }
    
    // Upload foto ke Supabase Storage
    let photoUrls = [];
    const files = document.getElementById('defect-photos').files;
    
    for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `defects/${fileName}`;
        
        const { data, error } = await supabase.storage
            .from('qc-photos')
            .upload(filePath, file);
        
        if (error) {
            console.error('Upload error:', error);
            continue;
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
            .from('qc-photos')
            .getPublicUrl(filePath);
        
        photoUrls.push(urlData.publicUrl);
    }
    
    // Simpan defect ke state (belum ke database)
    currentDefects.push({
        id: Date.now(),
        type,
        category,
        description,
        quantity,
        location,
        photos: photoUrls,
        timestamp: new Date().toISOString()
    });
    
    updateDefectList();
    clearDefectForm();
}

// Update daftar defect di UI
function updateDefectList() {
    const container = document.getElementById('defect-list');
    container.innerHTML = '';
    
    currentDefects.forEach((defect, index) => {
        const div = document.createElement('div');
        div.className = 'defect-item';
        div.innerHTML = `
            <div class="defect-badge ${defect.type.toLowerCase()}">${defect.type}</div>
            <div class="defect-info">
                <strong>${defect.category}</strong>
                <p>${defect.description}</p>
                <small>Qty: ${defect.quantity} | ${defect.location || '-'}</small>
                ${defect.photos.map(url => `<img src="${url}" width="50" height="50" style="object-fit:cover;border-radius:8px;">`).join('')}
            </div>
            <button onclick="removeDefect(${index})" class="btn-delete">✕</button>
        `;
        container.appendChild(div);
    });
    
    // Update counter
    const major = currentDefects.filter(d => d.type === 'Major').length;
    const minor = currentDefects.filter(d => d.type === 'Minor').length;
    const critical = currentDefects.filter(d => d.type === 'Critical').length;
    document.getElementById('major-count').textContent = major;
    document.getElementById('minor-count').textContent = minor;
    document.getElementById('critical-count').textContent = critical;
}

// Submit inspeksi ke Supabase
async function submitInspection() {
    if (!currentBatchId) {
        alert('Silakan pilih batch terlebih dahulu!');
        return;
    }
    
    if (currentDefects.length === 0) {
        if (!confirm('Tidak ada defect. Lanjutkan sebagai PASS?')) return;
    }
    
    const user = requireAuth();
    const sampleSize = parseInt(document.getElementById('sample-size').textContent) || 0;
    
    try {
        // 1. Insert ke tabel inspections
        const { data: inspection, error: inspError } = await supabase
            .from('inspections')
            .insert({
                batch_id: currentBatchId,
                inspector_id: user.id,
                sample_size: sampleSize,
                aql_level: 'II',
                total_defects: currentDefects.length,
                status: currentDefects.length === 0 ? 'pass' : 'reject',
                notes: document.getElementById('inspection-notes').value
            })
            .select()
            .single();
        
        if (inspError) throw inspError;
        
        // 2. Insert defects
        for (const defect of currentDefects) {
            const { data: defectData, error: defectError } = await supabase
                .from('defects')
                .insert({
                    inspection_id: inspection.id,
                    defect_type: defect.type,
                    category: defect.category,
                    description: defect.description,
                    quantity: defect.quantity,
                    location: defect.location,
                    photo_url: defect.photos[0] || null // simpan foto pertama
                })
                .select()
                .single();
            
            if (defectError) throw defectError;
            
            // 3. Insert photos ke defect_photos
            if (defect.photos.length > 0) {
                const photosData = defect.photos.map(url => ({
                    defect_id: defectData.id,
                    photo_url: url
                }));
                
                const { error: photoError } = await supabase
                    .from('defect_photos')
                    .insert(photosData);
                
                if (photoError) throw photoError;
            }
        }
        
        // 4. Update status batch
        await supabase
            .from('batches')
            .update({ status: 'inspected' })
            .eq('id', currentBatchId);
        
        alert('✅ Inspeksi berhasil disimpan!');
        resetForm();
        
    } catch (error) {
        console.error('Submit error:', error);
        alert('Gagal menyimpan inspeksi: ' + error.message);
    }
}

// Reset form
function resetForm() {
    currentDefects = [];
    document.getElementById('defect-list').innerHTML = '';
    document.getElementById('batch-number').value = '';
    document.getElementById('lot-size').value = '';
    document.getElementById('sample-size').textContent = '0';
    document.getElementById('inspection-notes').value = '';
    document.getElementById('major-count').textContent = '0';
    document.getElementById('minor-count').textContent = '0';
    document.getElementById('critical-count').textContent = '0';
}

// Hapus defect dari list
window.removeDefect = function(index) {
    currentDefects.splice(index, 1);
    updateDefectList();
};

// Clear form defect
function clearDefectForm() {
    document.getElementById('defect-type').value = '';
    document.getElementById('defect-category').value = '';
    document.getElementById('defect-desc').value = '';
    document.getElementById('defect-qty').value = '1';
    document.getElementById('defect-location').value = '';
    document.getElementById('defect-photos').value = '';
}

// Inisialisasi
document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    await loadProducts();
    
    // Event listeners
    document.getElementById('add-defect-btn').addEventListener('click', addDefect);
    document.getElementById('submit-inspection-btn').addEventListener('click', submitInspection);
});
