// sampling-calc.js - Hitung sample size berdasarkan AQL
const AQL_TABLE = {
    'S-1': { '2': 2, '8': 3, '15': 5, '50': 8, '150': 13, '500': 20, '>500': 32 },
    'S-2': { '2': 3, '8': 5, '15': 8, '50': 13, '150': 20, '500': 32, '>500': 50 },
    'I':   { '2': 2, '8': 3, '15': 5, '50': 8, '150': 13, '500': 20, '>500': 32 },
    'II':  { '2': 3, '8': 5, '15': 8, '50': 13, '150': 20, '500': 32, '>500': 50 },
    'III': { '2': 5, '8': 8, '15': 13, '50': 20, '150': 32, '500': 50, '>500': 80 }
};

export function calculateAQL(lotSize, level = 'II') {
    const table = AQL_TABLE[level] || AQL_TABLE['II'];
    if (lotSize <= 2) return table['2'];
    if (lotSize <= 8) return table['8'];
    if (lotSize <= 15) return table['15'];
    if (lotSize <= 50) return table['50'];
    if (lotSize <= 150) return table['150'];
    if (lotSize <= 500) return table['500'];
    return table['>500'];
}
