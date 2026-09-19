import { config } from './config.js';
import { parseCSV } from './parser.js';
import { normalizeQuestions } from './questions.js';
import { getCustomQuestions } from './firestore.js';

/**
 * Fetches the Google Sheet as CSV, parses it, and merges with custom questions.
 */
export async function fetchSheetQuestions() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${config.SHEET_ID}/export?format=csv&gid=${config.SHEET_GID}`;
        const response = await fetch(url);
        
        let sheetQuestions = [];
        if (response.ok) {
            const csvText = await response.text();
            const parsedRows = parseCSV(csvText);
            sheetQuestions = normalizeQuestions(parsedRows);
        } else {
            console.warn(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
            // We continue even if the sheet fails, to at least load custom questions
        }
        
        // Fetch custom questions
        const customQuestions = await getCustomQuestions();
        
        // Merge both arrays
        return [...sheetQuestions, ...customQuestions];
        
    } catch (error) {
        console.error("Error fetching questions data:", error);
        throw error;
    }
}
