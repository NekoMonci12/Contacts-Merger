# vCard Merger & Deduplicator

A powerful and interactive Node.js CLI tool for merging and deduplicating vCard (.vcf) files. Designed to handle large contact lists with smart normalization and flexible conflict resolution.

## Features

- **Automated Folder Management**: Automatically creates and manages `runtime/input` and `runtime/output` directories.
- **Clean Workspace**: Automatically clears the output directory on every run.
- **Indonesian Phone Normalization**: Smartly handles Indonesian number formats, treating `08...` and `+628...` as identical for accurate deduplication.
- **Interactive Merge**: Resolve duplicates manually with options to merge details, pick names, or keep/overwrite contacts.
- **Fast Mode**: Automated deduplication for large datasets—merge, keep, or overwrite all duplicates in seconds.
- **Progress Tracking**: Real-time progress indicators during processing (e.g., `1/6742`).
- **Robust Parsing**: Handles various line endings (CRLF/LF) and Byte Order Marks (BOM) automatically.

## Installation

1. Clone the repository.
2. Ensure you have [Node.js](https://nodejs.org/) installed (v16+ recommended).
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### 1. Prepare your files
Place all your `.vcf` files into the `runtime/input` folder.

### 2. Run the tool

#### Interactive Mode
Perfect for carefully reviewed merges. For every duplicate, the tool will ask for your preferred action.
```bash
npm start
```

#### Fast Mode (Automated)
Bypass all prompts and apply a single strategy to all duplicates found.
- **Merge All**: `npm run fast-merge` (Combines details and keeps international formats)
- **Keep Existing**: `npm run fast-keep` (Ignores all incoming duplicates)
- **Use Incoming**: `npm run fast-use` (Overwrites existing contacts with new ones)
- **Add All**: `npm run fast-add` (Keeps everything, effectively just merging files without deduplication)

### 3. Get your results
The deduplicated vCard file will be saved to:
`runtime/output/merged_contacts.vcf`

## Action Descriptions
- **[M] Merge**: Combines phone numbers, emails, and notes from both contacts.
- **[K] Keep**: Discards the incoming duplicate and keeps the one already in the list.
- **[U] Use**: Discards the existing contact and replaces it with the incoming one.
- **[A] Add**: Ignores the duplicate relationship and adds both as separate entries.

## Matching Logic
Contacts are considered duplicates if they share:
- An **email address** (normalized and case-insensitive).
- A **phone number** (normalized to international format, e.g., `+62`).
