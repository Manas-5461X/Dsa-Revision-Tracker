import { config } from './config.js?v=3';
import { parseCSV } from './parser.js?v=3';
import { normalizeQuestions } from './questions.js?v=3';

/**
 * Fetches the Google Sheet as CSV and returns normalized questions.
 * Handles the view-only CSV export URL.
 */
export async function fetchSheetQuestions() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${config.SHEET_ID}/export?format=csv&gid=${config.SHEET_GID}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        const parsedRows = parseCSV(csvText);
        return normalizeQuestions(parsedRows);
        
    } catch (error) {
        console.error("Error fetching Google Sheet data:", error);
        throw error;
    }
}
