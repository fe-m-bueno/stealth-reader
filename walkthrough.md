# Stealth Reader Walkthrough

## Overview
The Stealth Reader is a web application that disguises book reading as code editing. It parses EPUB files and transforms the text into pseudo-code (TypeScript), displayed in a VS Code-like interface.

## Features
- **Stealth Interface**: Identical to VS Code (Dark Modern theme).
- **Epub Parsing**: Loads books and extracts chapters.
- **Code-ification**: Transforms narrative into variables, functions, and comments.
- **Interactive**: Sidebar for navigation, tabs for chapters.

## How to Run
1. Navigate to `stealth-reader`:
   ```bash
   cd stealth-reader
   ```
2. Install dependencies (if not already):
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173`.

## Usage
1. **Load a Book**:
   - Click the "Open EPUB" button in the Explorer (Sidebar).
   - Or drag and drop an EPUB file onto the window (functionality implemented in Sidebar).
2. **Read**:
   - Click on chapters in the Sidebar.
   - The text will appear as code in the main editor area.
   - "Dialogue" becomes `const variable = "string";`.
   - "Narrative" becomes block comments `/** ... */`.

## Architecture
- **Frontend**: Svelte 5 (Runes), TailwindCSS.
- **State Management**: `book.svelte.ts` (Global Store).
- **Services**:
  - `epub.ts`: Handles EPUB parsing via `epubjs`.
  - `codeifier.ts`: Transforms text to code.

## Verification
The project builds successfully (`npm run build`).
Linting checks pass (mostly).
