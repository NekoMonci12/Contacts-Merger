import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { parseFile } from './src/vcard-parser.js';
import { deduplicate } from './src/deduplicator.js';
import vCard from 'vcf';

async function main() {
    console.log(chalk.bold.green('vCard Merger & Deduplicator'));

    const runtimeDir = 'runtime';
    const inputDir = path.join(runtimeDir, 'input');
    const outputDir = path.join(runtimeDir, 'output');

    // Ensure directories exist
    await fs.ensureDir(inputDir);
    await fs.ensureDir(outputDir);

    // Clean output directory
    console.log(chalk.yellow(`Cleaning output directory: ${outputDir}`));
    await fs.emptyDir(outputDir);

    const modeArgIdx = process.argv.indexOf('--mode');
    const defaultAction = modeArgIdx !== -1 ? process.argv[modeArgIdx + 1] : null;

    // Find output file arg, skipping --mode and its value
    const outputFileArg = process.argv.slice(2).find((arg, i, arr) => {
        if (arg.startsWith('--')) return false;
        if (i > 0 && arr[i-1] === '--mode') return false;
        return true;
    });

    let outputFilename = outputFileArg || 'merged_contacts.vcf';
    if (!outputFilename.toLowerCase().endsWith('.vcf')) {
        outputFilename += '.vcf';
    }
    const outputFile = path.join(outputDir, outputFilename);

    const files = glob.sync(`${inputDir.replace(/\\/g, '/')}/**/*.vcf`);
    if (files.length === 0) {
        console.log(chalk.yellow('No .vcf files found.'));
        return;
    }

    console.log(chalk.blue(`Found ${files.length} vCard files. Parsing...`));

    let allContacts = [];
    for (const file of files) {
        console.log(chalk.gray(`  Loading: ${path.basename(file)}`));
        try {
            const contacts = await parseFile(file);
            allContacts = allContacts.concat(contacts);
        } catch (err) {
            console.error(chalk.red(`  Error parsing ${file}: ${err.message}`));
        }
    }

    console.log(chalk.blue(`Total contacts loaded: ${allContacts.length}. Starting deduplication${defaultAction ? ` (Mode: ${defaultAction})` : ''}...`));

    const uniqueContacts = await deduplicate(allContacts, defaultAction);

    console.log(chalk.green(`\nDeduplication complete. ${uniqueContacts.length} unique contacts remaining.`));

    // Convert back to vCard string
    let outputContent = '';
    uniqueContacts.forEach(contact => {
        // Create a new Card object to be safe and clean
        const card = new vCard();
        card.set('fn', contact.fn);
        if (contact.n) card.set('n', contact.n);
        
        contact.tel.forEach(t => card.add('tel', t));
        contact.email.forEach(e => card.add('email', e));
        
        if (contact.org) card.set('org', contact.org);
        if (contact.title) card.set('title', contact.title);
        if (contact.note) card.set('note', contact.note);

        outputContent += card.toString('3.0') + '\n';
    });

    await fs.writeFile(outputFile, outputContent);
    console.log(chalk.bold.white(`\nMerged file saved to: ${outputFile}`));
}

main().catch(err => {
    console.error(chalk.red('\nAn unexpected error occurred:'));
    console.error(err);
});
