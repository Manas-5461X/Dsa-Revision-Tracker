import { signInWithGoogle, signOutUser, subscribeToAuthState } from '../shared/auth.js';
import { fetchSheetQuestions } from '../shared/sheet.js';
import { updateProgress, setProgress, subscribeToProgress, getUserProfile, saveUserProfile } from '../shared/firestore.js';

// State
let questions = [];
let progressMap = {};
let unsubscribeProgress = null;
let charts = { timeline: null, status: null, pattern: null };
let currentNotesId = null;

// DOM Elements
const els = {
    globalLoading: document.getElementById('global-loading'),
    btnLogin: document.getElementById('btn-login'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    
    navQuestions: document.getElementById('nav-questions'),
    navAnalytics: document.getElementById('nav-analytics'),
    viewQuestions: document.getElementById('view-questions'),
    viewAnalytics: document.getElementById('view-analytics'),
    
    profileDisplay: document.getElementById('profile-display'),
    profileName: document.getElementById('profile-name'),
    
    profileModal: document.getElementById('profile-modal'),
    btnCloseProfile: document.getElementById('btn-close-profile'),
    btnSaveProfile: document.getElementById('btn-save-profile'),
    btnLogoutModal: document.getElementById('btn-logout-modal'),
    profileNameInput: document.getElementById('profile-name-input'),

    notesModal: document.getElementById('notes-modal'),
    btnCloseNotes: document.getElementById('btn-close-notes'),
    btnCancelNotes: document.getElementById('btn-cancel-notes'),
    btnSaveNotes: document.getElementById('btn-save-notes'),
    notesTextarea: document.getElementById('notes-modal-textarea'),
    notesSavingIndicator: document.getElementById('notes-saving-indicator'),
    
    mainContent: document.getElementById('main-content'),
    appContainer: document.getElementById('app'),
    landingPage: document.getElementById('landing-page'),
    
    loadingData: document.getElementById('loading-data'),
    
    questionsContainer: document.getElementById('questions-container'),
    
    statTotal: document.getElementById('stat-total'),
    statCompletedHero: document.getElementById('stat-completed-hero'),
    statRemaining: document.getElementById('stat-remaining'),
    statPercentage: document.getElementById('stat-percentage'),
    
    sidebarStatCompleted: document.getElementById('sidebar-stat-completed'),
    sidebarStatRemaining: document.getElementById('sidebar-stat-remaining'),
    qsTotal: document.getElementById('qs-total'),
    qsActive: document.getElementById('qs-active'),
    
    ctxTimeline: document.getElementById('timelineChart'),
    ctxStatus: document.getElementById('statusChart'),
    ctxPattern: document.getElementById('patternChart'),
    
    searchInput: document.getElementById('search-input'),
    patternFilter: document.getElementById('pattern-filter'),
    statusFilter: document.getElementById('status-filter'),
    
    btnRefresh: document.getElementById('btn-refresh'),
    btnExport: document.getElementById('btn-export'),
    btnImport: document.getElementById('btn-import')
};

// Initialize
function init() {
    initTheme();

    els.btnLogin.addEventListener('click', handleLogin);
    els.btnThemeToggle.addEventListener('click', toggleTheme);
    
    // Tab Navigation
    els.navQuestions.addEventListener('click', () => switchTab('questions'));
    els.navAnalytics.addEventListener('click', () => switchTab('analytics'));
    
    els.profileDisplay.addEventListener('click', () => els.profileModal.classList.remove('hidden'));
    els.btnCloseProfile.addEventListener('click', () => els.profileModal.classList.add('hidden'));
    els.btnLogoutModal.addEventListener('click', handleLogout);
    els.btnSaveProfile.addEventListener('click', handleSaveProfile);

    els.btnCloseNotes.addEventListener('click', () => els.notesModal.classList.add('hidden'));
    els.btnCancelNotes.addEventListener('click', () => els.notesModal.classList.add('hidden'));
    els.btnSaveNotes.addEventListener('click', handleSaveNotes);

    els.btnRefresh.addEventListener('click', loadData);
    
    els.searchInput.addEventListener('input', renderQuestions);
    els.patternFilter.addEventListener('change', renderQuestions);
    els.statusFilter.addEventListener('change', renderQuestions);
    
    els.btnExport.addEventListener('click', handleExport);
    els.btnImport.addEventListener('change', handleImport);

    subscribeToAuthState(handleAuthStateChange);
}

function switchTab(tab) {
    if (tab === 'questions') {
        els.navQuestions.classList.add('active');
        els.navAnalytics.classList.remove('active');
        els.viewQuestions.classList.remove('hidden');
        els.viewAnalytics.classList.add('hidden');
    } else {
        els.navAnalytics.classList.add('active');
        els.navQuestions.classList.remove('active');
        els.viewAnalytics.classList.remove('hidden');
        els.viewQuestions.classList.add('hidden');
        
        // Re-render charts when showing analytics to ensure proper canvas sizing
        updateStatsAndCharts();
    }
}

function initTheme() {
    // The inline script in HTML handles the initial 'data-theme' to prevent flashing.
    // We just need to update the button icon here.
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        els.btnThemeToggle.innerHTML = '<i class="ph ph-sun"></i>';
    } else {
        els.btnThemeToggle.innerHTML = '<i class="ph ph-moon"></i>';
    }
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        els.btnThemeToggle.innerHTML = '<i class="ph ph-moon"></i>';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        els.btnThemeToggle.innerHTML = '<i class="ph ph-sun"></i>';
    }
}

async function handleLogin() {
    try {
        await signInWithGoogle();
    } catch (error) {
        alert("Failed to sign in: " + error.message);
    }
}

async function handleLogout() {
    try {
        els.profileModal.classList.add('hidden');
        await signOutUser();
    } catch (error) {
        alert("Failed to sign out.");
    }
}

async function handleSaveProfile() {
    const newName = els.profileNameInput.value.trim();
    if (!newName) return;
    
    try {
        await saveUserProfile(newName);
        els.profileName.textContent = newName;
        els.profileModal.classList.add('hidden');
    } catch (error) {
        alert("Failed to save profile.");
    }
}

async function handleAuthStateChange(user) {
    els.globalLoading.classList.add('hidden');
    
    if (user) {
        els.landingPage.style.display = 'none';
        els.appContainer.style.display = 'flex';
        
        // Load User Profile
        const profile = await getUserProfile();
        const displayName = profile?.displayName || user.displayName || "User";
        els.profileName.textContent = displayName;
        els.profileNameInput.value = displayName;

        // Prompt if no name ever set (just a heuristic, if it equals "User")
        if (displayName === "User" || !profile) {
            els.profileModal.classList.remove('hidden');
        }

        loadData();
    } else {
        els.appContainer.style.display = 'none';
        els.landingPage.style.display = 'flex';
        
        if (unsubscribeProgress) {
            unsubscribeProgress();
            unsubscribeProgress = null;
        }
    }
}

async function loadData() {
    showLoading(true);
    
    try {
        questions = await fetchSheetQuestions();
        populatePatternFilter();
        
        if (unsubscribeProgress) unsubscribeProgress();
        
        unsubscribeProgress = subscribeToProgress((newProgressMap) => {
            progressMap = newProgressMap;
            updateStatsAndCharts();
            renderQuestions();
            showLoading(false);
        });
        
    } catch (error) {
        showLoading(false);
        alert("Unable to load Google Sheet data. " + error.message);
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

function updateStatsAndCharts() {
    const total = questions.length;
    const completed = questions.filter(q => progressMap[q.id]?.status === 'done').length;
    const remaining = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    if(els.statTotal) els.statTotal.textContent = total;
    if(els.statCompletedHero) els.statCompletedHero.textContent = completed;
    if(els.statRemaining) els.statRemaining.textContent = remaining;
    if(els.statPercentage) els.statPercentage.textContent = percentage + '%';
    
    if(els.sidebarStatCompleted) els.sidebarStatCompleted.textContent = completed;
    if(els.sidebarStatRemaining) els.sidebarStatRemaining.textContent = remaining;
    if(els.qsTotal) els.qsTotal.textContent = total;
    if(els.qsActive) els.qsActive.textContent = completed;
    
    renderCharts(completed, remaining);
}

function renderCharts(completed, remaining) {
    if (charts.status) charts.status.destroy();
    charts.status = new Chart(els.ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Remaining'],
            datasets: [{
                data: [completed, remaining],
                backgroundColor: ['#10b981', '#e5e7eb'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: { cutout: '80%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });

    const patternData = {};
    questions.forEach(q => {
        if (!patternData[q.pattern]) patternData[q.pattern] = { total: 0, completed: 0 };
        patternData[q.pattern].total++;
        if (progressMap[q.id]?.status === 'done') patternData[q.pattern].completed++;
    });

    const patternLabels = Object.keys(patternData).sort();
    const patternCompleted = patternLabels.map(p => patternData[p].completed);

    if (charts.pattern) charts.pattern.destroy();
    charts.pattern = new Chart(els.ctxPattern, {
        type: 'bar',
        data: {
            labels: patternLabels.map(l => l.length > 15 ? l.substring(0, 15) + '...' : l),
            datasets: [{ label: 'Completed', data: patternCompleted, backgroundColor: '#10b981', borderRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, border: { display: false }, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }
    });

    const timelineData = {};
    Object.values(progressMap).forEach(p => {
        if (p.status === 'done' && p.updatedAt) {
            const dateStr = new Date(p.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            timelineData[dateStr] = (timelineData[dateStr] || 0) + 1;
        }
    });
    
    const timelineLabels = Object.keys(timelineData).sort((a,b) => new Date(a) - new Date(b));
    const timelineValues = timelineLabels.map(l => timelineData[l]);

    if (timelineLabels.length === 0) {
        timelineLabels.push(new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        timelineValues.push(0);
    }

    if (charts.timeline) charts.timeline.destroy();
    charts.timeline = new Chart(els.ctxTimeline, {
        type: 'line',
        data: {
            labels: timelineLabels,
            datasets: [{ label: 'Questions Completed', data: timelineValues, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 3, fill: true, tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#f3f4f6' }, border: { display: false }, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }
    });
}

function renderQuestions() {
    els.questionsContainer.innerHTML = '';
    
    const searchTerm = els.searchInput.value.toLowerCase();
    const selectedPattern = els.patternFilter.value;
    const selectedStatus = els.statusFilter.value; 
    
    const filteredQuestions = questions.filter(q => {
        const matchesSearch = q.name.toLowerCase().includes(searchTerm) || q.pattern.toLowerCase().includes(searchTerm);
        const matchesPattern = selectedPattern === 'all' || q.pattern === selectedPattern;
        
        const qStatus = progressMap[q.id]?.status || 'not-done';
        
        let matchesStatus = true;
        if (selectedStatus === 'completed') {
            matchesStatus = qStatus === 'done';
        } else if (selectedStatus === 'uncompleted') {
            matchesStatus = qStatus !== 'done';
        }
                
        return matchesSearch && matchesPattern && matchesStatus;
    });
    
    if (filteredQuestions.length === 0) {
        els.questionsContainer.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-muted);"><i class="ph ph-empty large-icon"></i><p>No questions found.</p></div>';
        return;
    }

    const grouped = {};
    filteredQuestions.forEach(q => {
        if (!grouped[q.pattern]) grouped[q.pattern] = [];
        grouped[q.pattern].push(q);
    });

    Object.keys(grouped).forEach(pattern => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'pattern-group';
        
        const title = document.createElement('h2');
        title.className = 'pattern-title';
        title.innerHTML = `${pattern} <span class="pattern-count">${grouped[pattern].length}</span>`;
        groupDiv.appendChild(title);

        const gridDiv = document.createElement('div');
        gridDiv.className = 'pattern-questions-grid';
        
        grouped[pattern].forEach(q => {
            const prog = progressMap[q.id] || { status: 'not-done', notes: '' };
            const qStatus = prog.status;
            
            const item = document.createElement('div');
            item.className = 'question-item';
            
            let linksHtml = q.links.map((link, i) => {
                let text = link.includes('leetcode.com') ? 'LC' : link.includes('geeksforgeeks.org') ? 'GFG' : `Link ${i+1}`;
                return `<a href="${link}" target="_blank" rel="noopener noreferrer" class="q-link">${text}</a>`;
            }).join('');
            
            let diffBadge = '';
            if (q.difficulty) diffBadge = `<span class="diff-badge diff-${q.difficulty}">${q.difficulty}</span>`;
            
            item.innerHTML = `
                <div class="q-card-main">
                    <h4>${q.name}</h4>
                    <div class="q-card-badges">
                        <select class="status-select status-${qStatus}" data-id="${q.id}">
                            <option value="not-done" ${qStatus === 'not-done' ? 'selected' : ''}>Not Done</option>
                            <option value="attempted" ${qStatus === 'attempted' ? 'selected' : ''}>Attempted</option>
                            <option value="done" ${qStatus === 'done' ? 'selected' : ''}>Done</option>
                        </select>
                        ${diffBadge}
                        ${linksHtml}
                    </div>
                </div>
                <div class="q-card-footer">
                    <button class="btn-notes btn-full-width ${prog.notes ? 'has-notes' : ''}" data-id="${q.id}">
                        ${prog.notes ? 'VIEW NOTES' : 'ADD NOTE'} ➔
                    </button>
                    <span id="saving-${q.id}" class="saving-indicator hidden"><i class="ph ph-spinner-gap spin"></i></span>
                </div>
            `;
            
            gridDiv.appendChild(item);
        });
        
        groupDiv.appendChild(gridDiv);
        els.questionsContainer.appendChild(groupDiv);
    });
    
    document.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const newStatus = e.target.value;
            e.target.className = `status-select status-${newStatus}`;
            await handleStatusChange(id, newStatus);
        });
    });

    document.querySelectorAll('.btn-notes').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            openNotesModal(id);
        });
    });
}

function openNotesModal(id) {
    currentNotesId = id;
    const prog = progressMap[id] || { notes: '' };
    els.notesTextarea.value = prog.notes;
    els.notesModal.classList.remove('hidden');
}

async function handleSaveNotes() {
    if (!currentNotesId) return;
    const text = els.notesTextarea.value;
    els.notesSavingIndicator.classList.remove('hidden');
    
    try {
        await updateProgress(currentNotesId, { notes: text });
        els.notesSavingIndicator.innerHTML = '<i class="ph ph-check" style="color: var(--success)"></i>';
        setTimeout(() => {
            els.notesModal.classList.add('hidden');
            els.notesSavingIndicator.classList.add('hidden');
            els.notesSavingIndicator.innerHTML = '<i class="ph ph-spinner-gap spin"></i>';
        }, 500);
    } catch (err) {
        console.error("Notes error:", err);
        alert("Failed to save notes: " + (err.message || err));
        els.notesSavingIndicator.innerHTML = '<i class="ph ph-warning" style="color: var(--danger)"></i>';
        setTimeout(() => {
            els.notesSavingIndicator.classList.add('hidden');
            els.notesSavingIndicator.innerHTML = '<i class="ph ph-spinner-gap spin"></i>';
        }, 3000);
    }
}

async function handleStatusChange(id, newStatus) {
    const savingIndicator = document.getElementById(`saving-${id}`);
    savingIndicator.classList.remove('hidden');
    
    try {
        await updateProgress(id, { status: newStatus });
        savingIndicator.innerHTML = '<i class="ph ph-check" style="color: var(--success)"></i>';
        setTimeout(() => {
            savingIndicator.classList.add('hidden');
            savingIndicator.innerHTML = '<i class="ph ph-spinner-gap spin"></i>';
        }, 1000);
    } catch (error) {
        console.error("Status error:", error);
        alert("Failed to save status: " + (error.message || error));
        
        // Try to find the indicator again in case DOM was rebuilt by onSnapshot
        const currentInd = document.getElementById(`saving-${id}`);
        if (currentInd) {
            currentInd.innerHTML = '<i class="ph ph-warning" style="color: var(--danger)"></i>';
            currentInd.classList.remove('hidden');
            setTimeout(() => {
                currentInd.classList.add('hidden');
                currentInd.innerHTML = '<i class="ph ph-spinner-gap spin"></i>';
            }, 3000);
        }
    }
}

function handleExport() {
    if (Object.keys(progressMap).length === 0) {
        alert("No progress to export.");
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(progressMap, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "dsa_tracker_progress.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (confirm("Merge this imported progress? This overwrites matching questions.")) {
                showLoading(true);
                for (const [id, value] of Object.entries(importedData)) {
                    let status = 'not-done';
                    let notes = '';
                    if (typeof value === 'boolean') {
                        status = value ? 'done' : 'not-done';
                    } else {
                        status = value.status || (value.completed ? 'done' : 'not-done');
                        notes = value.notes || '';
                    }
                    await updateProgress(id, { status, notes });
                }
                showLoading(false);
                alert("Import successful!");
            }
        } catch (error) {
            alert("Error parsing JSON file. Make sure it is a valid backup.");
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function showLoading(show) {
    if (show) els.loadingData.classList.remove('hidden');
    else els.loadingData.classList.add('hidden');
}

init();
