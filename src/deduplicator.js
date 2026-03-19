import { normalizePhone, normalizeEmail } from './vcard-parser.js';
import inquirer from 'inquirer';
import chalk from 'chalk';

/**
 * Deduplicates a list of contacts based on phone or email.
 * @param {Array} contacts 
 * @returns {Promise<Array>}
 */
async function deduplicate(contacts) {
    const uniqueContacts = [];
    const phoneMap = new Map(); // Normalized Phone -> uniqueContact index
    const emailMap = new Map(); // Normalized Email -> uniqueContact index

    for (const contact of contacts) {
        let duplicateIdx = -1;

        // Check phones
        for (const phone of contact.tel) {
            const normalized = normalizePhone(phone);
            if (normalized && phoneMap.has(normalized)) {
                duplicateIdx = phoneMap.get(normalized);
                break;
            }
        }

        // Check emails (if no duplicate found by phone)
        if (duplicateIdx === -1) {
            for (const email of contact.email) {
                const normalized = normalizeEmail(email);
                if (normalized && emailMap.has(normalized)) {
                    duplicateIdx = emailMap.get(normalized);
                    break;
                }
            }
        }

        if (duplicateIdx !== -1) {
            // Found a potential duplicate!
            const existing = uniqueContacts[duplicateIdx];
            
            // Determine match reason for logging
            let matchReason = '';
            for (const phone of contact.tel) {
                const n = normalizePhone(phone);
                if (n && uniqueContacts[duplicateIdx].tel.some(p => normalizePhone(p) === n)) {
                    matchReason = `Phone: ${phone}`;
                    break;
                }
            }
            if (!matchReason) {
                for (const email of contact.email) {
                    const n = normalizeEmail(email);
                    if (n && uniqueContacts[duplicateIdx].email.some(e => normalizeEmail(e) === n)) {
                        matchReason = `Email: ${email}`;
                        break;
                    }
                }
            }

            const action = await promptMergeAction(existing, contact, matchReason);

            if (action === 'merge') {
                const merged = await mergeContacts(existing, contact);
                uniqueContacts[duplicateIdx] = merged;
                updateMaps(merged, duplicateIdx, phoneMap, emailMap);
                console.log(chalk.green('  ✔ Merged details.'));
            } else if (action === 'keep_existing') {
                console.log(chalk.gray('  ➜ Kept existing.'));
            } else if (action === 'use_new') {
                uniqueContacts[duplicateIdx] = contact;
                updateMaps(contact, duplicateIdx, phoneMap, emailMap);
                console.log(chalk.blue('  ➜ Used incoming.'));
            } else if (action === 'add') {
                uniqueContacts.push(contact);
                updateMaps(contact, uniqueContacts.length - 1, phoneMap, emailMap);
                console.log(chalk.yellow('  ➜ Added as separate.'));
            }
        } else {
            // New unique contact
            const idx = uniqueContacts.length;
            uniqueContacts.push(contact);
            updateMaps(contact, idx, phoneMap, emailMap);
        }
    }

    return uniqueContacts;
}

function updateMaps(contact, idx, phoneMap, emailMap) {
    contact.tel.forEach(p => {
        const n = normalizePhone(p);
        if (n) phoneMap.set(n, idx);
    });
    contact.email.forEach(e => {
        const n = normalizeEmail(e);
        if (n) emailMap.set(n, idx);
    });
}

async function promptMergeAction(existing, incoming, matchReason) {
    console.log(chalk.yellow('\n--- Potential Duplicate Detected ---'));
    console.log(chalk.white(`Match criteria: ${matchReason}`));
    console.log(chalk.cyan('Existing:'), `${existing.fn} (${existing.tel.join(', ')} / ${existing.email.join(', ')})`);
    console.log(chalk.magenta('Incoming:'), `${incoming.fn} (${incoming.tel.join(', ')} / ${incoming.email.join(', ')})`);

    console.log(chalk.gray('\nActions:'));
    console.log(chalk.gray('  [M] Merge  - Keep properties from both contacts'));
    console.log(chalk.gray('  [K] Keep   - Skip incoming, keep existing only'));
    console.log(chalk.gray('  [U] Use    - Overwrite existing with incoming'));
    console.log(chalk.gray('  [A] Add    - Keep both as separate contacts'));

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                { name: 'Merge details (M)', value: 'merge' },
                { name: 'Keep existing (K)', value: 'keep_existing' },
                { name: 'Use incoming (U)', value: 'use_new' },
                { name: 'Add as separate (A)', value: 'add' }
            ]
        }
    ]);

    return action;
}

async function mergeContacts(existing, incoming) {
    // Basic merge: combine arrays, unique values
    const merged = {
        fn: existing.fn, // We'll ask to confirm name below
        tel: [...new Set([...existing.tel, ...incoming.tel])],
        email: [...new Set([...existing.email, ...incoming.email])],
        org: existing.org || incoming.org,
        title: existing.title || incoming.title,
        note: (existing.note && incoming.note) ? `${existing.note}\n---\n${incoming.note}` : (existing.note || incoming.note),
        raw: existing.raw // We'll need to update this too or build a new one
    };

    if (existing.fn !== incoming.fn && incoming.fn !== 'Unnamed') {
        const { name } = await inquirer.prompt([
            {
                type: 'list',
                name: 'name',
                message: `Which name to use for ${existing.tel[0] || existing.email[0]}?`,
                choices: [existing.fn, incoming.fn]
            }
        ]);
        merged.fn = name;
    }

    return merged;
}

export {
    deduplicate
};
