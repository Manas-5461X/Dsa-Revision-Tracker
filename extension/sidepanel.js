import { signInWithGoogle, signOutUser, subscribeToAuthState } from './auth-extension.js';
import { fetchSheetQuestions } from '../shared/sheet.js';
import { updateProgress, subscribeToProgress } from '../shared/firestore.js';

// State
let questions = [];
let progressMap = {};
let unsubscribeProgress = null;
let currentTabQuestion = null;

// DOM Elements
const els = {
    authLoading: document.getElementById('loading-auth'),
    unauth: document.getElementById('unauthenticated'),
    auth: document.getElementById('authenticated'),
    userEmail: document.getElementById('user-email'),
    btnLogin: document.getElementById('btn-login'),
    btnLogout: document.getElementById('btn-logout'),
    
    mainContent: document.getElementById('main-content'),
    loadingData: document.getElementById('loading-data'),
    errorMsg: document.getElementById('error-message'),
    
    currentSection: document.getElementById('current-question-section'),
    currentName: document.getElementById('current-name'),
    currentPattern: document.getElementById('current-pattern'),
    btnToggleCurrent: document.getElementById('btn-toggle-current'),
    currentSaving: document.getElementById('current-saving'),
    
    searchInput: document.getElementById('search-input'),
    patternFilter: document.getElementById('pattern-filter'),
    questionsContainer: document.getElementById('questions-container'),
    
    btnRefresh: document.getElementById('btn-refresh'),
    btnNextUnsolved: document.getElementById('btn-next-unsolved')
};

function init() {
    els.btnLogin.addEventListener('click', handleLogin);
    els.btnLogout.addEventListener('click', handleLogout);
    els.btnRefresh.addEventListener('click', loadData);
    els.btnNextUnsolved.addEventListener('click', openNextUnsolved);
    
    els.searchInput.addEventListener('input', renderQuestions);
    els.patternFilter.addEventListener('change', renderQuestions);
    
    subscribeToAuthState(handleAuthStateChange);
}

async function handleLogin() {
    try {
        await signInWithGoogle();
    } catch (error) {
        showError("Failed to sign in: " + error.message);
    }
}

async function handleLogout() {
    try {
        await signOutUser();
    } catch (error) {
        showError("Failed to sign out.");
    }
}

function handleAuthStateChange(user) {
    els.authLoading.classList.add('hidden');
    
    if (user) {
        els.unauth.classList.add('hidden');
        els.auth.classList.remove('hidden');
        // els.userEmail.textContent = user.email; // Removed from HTML
        
        els.mainContent.classList.remove('hidden');
        loadData();
    } else {
        els.auth.classList.add('hidden');
        els.unauth.classList.remove('hidden');
        els.mainContent.classList.add('hidden');
        
        if (unsubscribeProgress) {
            unsubscribeProgress();
            unsubscribeProgress = null;
        }
    }
}

async function loadData() {
    showLoading(true);
    hideError();
    
    try {
        questions = await fetchSheetQuestions();
        populatePatternFilter();
        
        if (unsubscribeProgress) {
            unsubscribeProgress();
        }
        
        unsubscribeProgress = subscribeToProgress((newProgressMap) => {
            progressMap = newProgressMap;
            detectActiveTabQuestion();
            renderQuestions();
            showLoading(false);
        });
        
    } catch (error) {
        showLoading(false);
        showError("Unable to load Google Sheet data. " + error.message);
    }
}

function populatePatternFilter() {
    const patterns = new Set(questions.map(q => q.pattern));
    els.patternFilter.innerHTML = '<option value="all">All Patterns</option>';
    Array.from(patterns).sort().forEach(pattern => {
        const option = document.createElement('option');
        option.value = pattern;
        option.textContent = pattern;
        els.patternFilter.appendChild(option);
    });
}

function detectActiveTabQuestion() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        const url = tabs[0].url;
        
        // Detect LeetCode slug
        if (url && url.includes('leetcode.com/problems/')) {
            const match = url.match(/leetcode\.com\/problems\/([^/]+)/);
            if (match && match[1]) {
                const slug = match[1];
                const expectedId = `leetcode:${slug}`;
                
                const matchedQ = questions.find(q => q.id === expectedId);
                if (matchedQ) {
                    currentTabQuestion = matchedQ;
                    renderCurrentQuestion();
                    return;
                }
            }
        }
        
        // Clear current section if not found
        currentTabQuestion = null;
        els.currentSection.classList.add('hidden');
    });
}

function renderCurrentQuestion() {
    if (!currentTabQuestion) return;
    
    els.currentSection.classList.remove('hidden');
    els.currentName.textContent = currentTabQuestion.name;
    els.currentPattern.textContent = currentTabQuestion.pattern;
    
    const qStatus = progressMap[currentTabQuestion.id]?.status || 'not-done';
    els.btnToggleCurrent.outerHTML = `
        <select id="btn-toggle-current" class="status-select status-${qStatus}" style="width: 100%; margin-top: 0.5rem;">
            <option value="not-done" ${qStatus === 'not-done' ? 'selected' : ''}>Not Done</option>
            <option value="attempted" ${qStatus === 'attempted' ? 'selected' : ''}>Attempted</option>
            <option value="done" ${qStatus === 'done' ? 'selected' : ''}>Done</option>
        </select>
    `;
    
    // Re-bind element
    els.btnToggleCurrent = document.getElementById('btn-toggle-current');
    els.btnToggleCurrent.addEventListener('change', async (e) => {
        const newStatus = e.target.value;
        e.target.className = `status-select status-${newStatus}`;
        await handleToggleQuestion(currentTabQuestion.id, newStatus, true);
    });
}

function renderQuestions() {
    els.questionsContainer.innerHTML = '';
    
    const searchTerm = els.searchInput.value.toLowerCase();
    const selectedPattern = els.patternFilter.value;
    
    const filteredQuestions = questions.filter(q => {
        const matchesSearch = q.name.toLowerCase().includes(searchTerm) || q.pattern.toLowerCase().includes(searchTerm);
        const matchesPattern = selectedPattern === 'all' || q.pattern === selectedPattern;
        return matchesSearch && matchesPattern;
    });
    
    if (filteredQuestions.length === 0) {
        els.questionsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);"><i class="ph ph-empty large-icon" style="font-size: 2rem;"></i><p>No matches found.</p></div>';
        return;
    }
    
    filteredQuestions.forEach(q => {
        const qStatus = progressMap[q.id]?.status || 'not-done';
        
        const card = document.createElement('div');
        card.className = 'question-card';
        
        card.innerHTML = `
            <div class="question-info">
                <h4>${q.name}</h4>
                <p>${q.pattern}</p>
            </div>
            <div class="question-actions" style="margin-top: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                <select id="btn-toggle-${q.id}" class="status-select status-${qStatus}">
                    <option value="not-done" ${qStatus === 'not-done' ? 'selected' : ''}>Not Done</option>
                    <option value="attempted" ${qStatus === 'attempted' ? 'selected' : ''}>Attempted</option>
                    <option value="done" ${qStatus === 'done' ? 'selected' : ''}>Done</option>
                </select>
                <span id="saving-${q.id}" class="saving-indicator hidden"><i class="ph ph-spinner-gap spin"></i></span>
            </div>
        `;
        
        els.questionsContainer.appendChild(card);
    });
    
    // Add event listeners
    filteredQuestions.forEach(q => {
        const select = document.getElementById(`btn-toggle-${q.id}`);
        select.addEventListener('change', async (e) => {
            const newStatus = e.target.value;
            e.target.className = `status-select status-${newStatus}`;
            await handleToggleQuestion(q.id, newStatus, false);
        });
    });
}

async function handleToggleQuestion(id, newStatus, isCurrentBtn = false) {
    let savingIndicator = isCurrentBtn ? els.currentSaving : document.getElementById(`saving-${id}`);
    
    if (savingIndicator) savingIndicator.classList.remove('hidden');
    
    try {
        await updateProgress(id, { status: newStatus });
        if (savingIndicator) {
            savingIndicator.innerHTML = '<i class="ph ph-check" style="color: var(--success)"></i>';
            setTimeout(() => {
                savingIndicator.classList.add('hidden');
                savingIndicator.innerHTML = '<i class="ph ph-spinner-gap spin"></i>';
            }, 1000);
        }
    } catch (error) {
        if (savingIndicator) {
            savingIndicator.innerHTML = '<i class="ph ph-warning" style="color: var(--danger)"></i>';
            setTimeout(() => {
                savingIndicator.classList.add('hidden');
                savingIndicator.innerHTML = '<i class="ph ph-spinner-gap spin"></i>';
            }, 2000);
        }
    }
}

function openNextUnsolved() {
    const selectedPattern = els.patternFilter.value;
    
    const filteredQuestions = questions.filter(q => {
        return selectedPattern === 'all' || q.pattern === selectedPattern;
    });
    
    const nextUnsolved = filteredQuestions.find(q => progressMap[q.id]?.status !== 'done');
    
    if (nextUnsolved && nextUnsolved.links && nextUnsolved.links[0]) {
        chrome.tabs.create({ url: nextUnsolved.links[0] });
    } else {
        alert("No unsolved questions found in this filter!");
    }
}

function showLoading(show) {
    if (show) els.loadingData.classList.remove('hidden');
    else els.loadingData.classList.add('hidden');
}

function showError(msg) {
    els.errorMsg.textContent = msg;
    els.errorMsg.classList.remove('hidden');
}

function hideError() {
    els.errorMsg.classList.add('hidden');
}

init();
