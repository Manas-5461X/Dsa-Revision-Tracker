/**
 * A lightweight CSV parser that handles quoted fields.
 */
export function parseCSV(csvText) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        
        if (inQuotes) {
            if (char === '"') {
                // Check if it's an escaped quote
                if (i + 1 < csvText.length && csvText[i + 1] === '"') {
                    currentCell += '"';
                    i++; // Skip the next quote
                } else {
                    inQuotes = false;
                }
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentCell);
                currentCell = '';
            } else if (char === '\n' || char === '\r') {
                if (char === '\r' && i + 1 < csvText.length && csvText[i + 1] === '\n') {
                    i++; // Skip \n after \r
                }
                currentRow.push(currentCell);
                rows.push(currentRow);
                currentRow = [];
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
    }
    
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }
    
    return rows;
}
