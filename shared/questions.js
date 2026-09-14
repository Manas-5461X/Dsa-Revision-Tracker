/**
 * Generates a stable ID for a question based on its URL or fallback info.
 */
export function generateQuestionId(questionName, patternName, urls) {
    // 1. Try to extract LeetCode slug
    const leetcodeUrl = urls.find(url => url && url.includes('leetcode.com/problems/'));
    if (leetcodeUrl) {
        const match = leetcodeUrl.match(/leetcode\.com\/problems\/([^/]+)/);
        if (match && match[1]) {
            return `leetcode:${match[1]}`;
        }
    }
    
    // 2. Try GeeksForGeeks
    const gfgUrl = urls.find(url => url && url.includes('geeksforgeeks.org/problems/'));
    if (gfgUrl) {
        const match = gfgUrl.match(/geeksforgeeks\.org\/problems\/([^/]+)/);
        if (match && match[1]) {
            return `gfg:${match[1]}`;
        }
    }

    // 3. Fallback: Slugify question + pattern
    const slugify = (text) => (text || '').toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
        
    return `fallback:${slugify(patternName)}-${slugify(questionName)}`;
}

/**
 * Deduplicates and structures questions.
 */
export function normalizeQuestions(parsedRows) {
    const questions = [];
    const questionIds = new Set();
    let currentPattern = "Uncategorized";

    // Assuming row 0 is title, row 1 is headers: Pattern, Question, Link 1, Link 2, Link 3
    for (let i = 2; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        if (row.length < 2) continue; // Skip empty rows

        const patternCol = row[0] ? row[0].trim() : '';
        const questionCol = row[1] ? row[1].trim() : '';
        const links = row.slice(2, 5).map(l => l ? l.trim() : '').filter(l => l !== '');

        // Detect Pattern Row: Column B has text, no links exist, or explicitly says "pattern"
        const isPatternRow = questionCol && links.length === 0 && (!patternCol || patternCol.toLowerCase().includes('pattern') || questionCol.toLowerCase().includes('pattern'));

        if (isPatternRow) {
            currentPattern = questionCol.replace(/^\d+\.\s*/, '').trim(); // Remove leading numbers
            continue;
        }

        // If it's a valid question
        if (questionCol) {
            const id = generateQuestionId(questionCol, currentPattern, links);
            
            // Extract difficulty
            let rawName = questionCol;
            let difficulty = "medium"; // default
            
            const diffMatch = rawName.match(/\((easy|medium|hard)\)$/i);
            if (diffMatch) {
                difficulty = diffMatch[1].toLowerCase();
                rawName = rawName.replace(/\((easy|medium|hard)\)$/i, '').trim();
            }

            // Deduplicate
            if (!questionIds.has(id)) {
                questionIds.add(id);
                questions.push({
                    id,
                    name: rawName,
                    difficulty: difficulty,
                    pattern: currentPattern,
                    links: links
                });
            }
        }
    }

    return questions;
}
