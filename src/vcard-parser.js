import vCard from 'vcf';
import fs from 'fs-extra';
import path from 'path';

/**
 * Parses a vCard file and returns an array of contact objects.
 * @param {string} filePath - Path to the .vcf file.
 * @returns {Promise<Array>}
 */
async function parseFile(filePath) {
    let data = await fs.readFile(filePath, 'utf-8');
    // Remove BOM and standardize line endings to CRLF (standard vCard requires \r\n)
    data = data.replace(/^\uFEFF/, '').replace(/\r?\n/g, '\r\n').trim();
    const cards = vCard.parse(data);
    return cards.map(card => {
        const getVal = (prop) => {
            const val = card.get(prop);
            if (!val) return null;
            if (Array.isArray(val)) return val.map(v => v.valueOf().trim());
            return val.valueOf().trim();
        };

        return {
            fn: getVal('fn') || 'Unnamed',
            n: getVal('n') || '',
            tel: Array.isArray(getVal('tel')) ? getVal('tel') : (getVal('tel') ? [getVal('tel')] : []),
            email: Array.isArray(getVal('email')) ? getVal('email') : (getVal('email') ? [getVal('email')] : []),
            org: getVal('org') || '',
            title: getVal('title') || '',
            note: getVal('note') || '',
            raw: card
        };
    });
}

/**
 * Normalizes a phone number by removing all non-numeric characters.
 * @param {string} phone 
 * @returns {string}
 */
function normalizePhone(phone) {
    if (!phone) return '';
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Indonesian specific normalization: 08... -> 628...
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    }
    
    return cleaned;
}

/**
 * Normalizes an email address.
 * @param {string} email 
 * @returns {string}
 */
function normalizeEmail(email) {
    if (!email) return '';
    return email.trim().toLowerCase();
}

export {
    parseFile,
    normalizePhone,
    normalizeEmail
};
