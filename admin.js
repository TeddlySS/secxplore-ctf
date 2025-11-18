
import { supabase } from './supabaseClient.js';
import { setupNavUser } from './navAuth.js';
const state = {
    currentSection: 'dashboard',
    challenges: [],
    users: [],
    submissions: [],
    hints: [],
    selectedChallenge: null,
    currentUser: null
};

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initializeAdmin();
    loadDashboardData();
    setupEventListeners();
});

function initializeAdmin() {
    // Direct access to admin panel - no authentication required
    state.currentUser = {
        user_id: 'admin-001',
        username: 'Admin',
        role: 'admin'
    };
    
    document.getElementById('adminUsername').textContent = 'Admin';
    
    showSection('dashboard');
}

function setupEventListeners() {
    // Challenge form submission
    document.getElementById('challengeForm')?.addEventListener('submit', handleChallengeSubmit);
    
    // Hint form submission
    document.getElementById('hintForm')?.addEventListener('submit', handleHintSubmit);
    
    // File upload
    const fileUpload = document.getElementById('fileUpload');
    if (fileUpload) {
        fileUpload.addEventListener('change', handleFileUpload);
    }
    
    // Image preview
    const challengeImage = document.getElementById('challengeImage');
    if (challengeImage) {
        challengeImage.addEventListener('change', previewImage);
    }
    
    // Drag and drop for file upload
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary)';
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = 'var(--border)';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--border)';
            const files = e.dataTransfer.files;
            handleFileUpload({ target: { files } });
        });
    }
}

// ==========================================
// Navigation
// ==========================================

function showSection(sectionName) {
    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[onclick="showSection('${sectionName}')"]`)?.classList.add('active');
    
    // Update active section
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`section-${sectionName}`)?.classList.add('active');
    
    state.currentSection = sectionName;
    
    // Load section data
    loadSectionData(sectionName);
}

function loadSectionData(sectionName) {
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'challenges':
            loadChallenges();
            break;
        case 'hints':
            loadHintsChallenges();
            break;
        case 'users':
            loadUsers();
            break;
        case 'submissions':
            loadSubmissions();
            break;
        case 'statistics':
            loadStatistics();
            break;
        case 'files':
            renderAdminLogs();
            break;
    }
}

// ==========================================
// Dashboard Functions
// ==========================================

async function loadDashboardData() {
    try {
        // In production, fetch from API
        // const response = await fetch(`${API_BASE}/admin/dashboard`);
        // const data = await response.json();
        
        // Mock data for demonstration
        const data = {
            totalChallenges: 24,
            totalUsers: 156,
            totalSubmissions: 1247,
            solveRate: 67.3,
            recentActivity: [
                { icon: '', text: 'User "hacker123" solved "SQL Injection Basics"', time: '2 minutes ago' },
                { icon: '', text: 'New user "cyberpunk" registered', time: '15 minutes ago' },
                { icon: '', text: 'Admin added new challenge "XSS Master"', time: '1 hour ago' },
                { icon: '', text: 'User "ctf_pro" used a hint on "Crypto Challenge"', time: '2 hours ago' },
                { icon: '', text: 'User "elite_hacker" reached top 10', time: '3 hours ago' }
            ]
        };
        
        // Update stats
        document.getElementById('totalChallenges').textContent = data.totalChallenges;
        document.getElementById('totalUsers').textContent = data.totalUsers;
        document.getElementById('totalSubmissions').textContent = data.totalSubmissions;
        document.getElementById('solveRate').textContent = data.solveRate + '%';
        
        // Initialize charts
        initializeCharts();
        updateActivityStats();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

function initializeCharts() {
    // Initialize Chart.js charts
    // Submissions chart
    const submissionsCtx = document.getElementById('submissionsChart');
    if (submissionsCtx && typeof Chart !== 'undefined') {
        new Chart(submissionsCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Submissions',
                    data: [65, 78, 90, 81, 95, 102, 115],
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
    
    // Category chart
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx && typeof Chart !== 'undefined') {
        new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: ['Web', 'Crypto', 'Forensics', 'Network', 'Reverse', 'Mobile'],
                datasets: [{
                    data: [30, 25, 20, 10, 10, 5],
                    backgroundColor: [
                        '#00ff88',
                        '#00d4ff',
                        '#a855f7',
                        '#ffaa00',
                        '#ff4444',
                        '#ff69b4'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

// ==========================================
// Challenge Management
// ==========================================

async function loadChallenges() {
    try {
        // In production, fetch from API
        // const response = await fetch(`${API_BASE}/admin/challenges`);
        // state.challenges = await response.json();
        
        // Mock data
        state.challenges = [
            {
                id: '1',
                code: 'WEB001',
                title: 'SQL Injection Basics',
                category: 'web',
                difficulty: 'easy',
                points: 100,
                solves: 45,
                isActive: true
            },
            {
                id: '2',
                code: 'CRYPTO001',
                title: 'Caesar Cipher',
                category: 'crypto',
                difficulty: 'easy',
                points: 100,
                solves: 38,
                isActive: true
            },
            {
                id: '3',
                code: 'WEB002',
                title: 'XSS Attack',
                category: 'web',
                difficulty: 'medium',
                points: 200,
                solves: 22,
                isActive: true
            },
            {
                id: '4',
                code: 'FORENSICS001',
                title: 'Memory Dump Analysis',
                category: 'forensics',
                difficulty: 'hard',
                points: 400,
                solves: 8,
                isActive: true
            }
        ];
        
        renderChallengesTable();
    } catch (error) {
        console.error('Error loading challenges:', error);
        showToast('Failed to load challenges', 'error');
    }
}

function renderChallengesTable() {
    const tbody = document.getElementById('challengesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = state.challenges.map(challenge => `
        <tr>
            <td><strong>${challenge.code}</strong></td>
            <td>${challenge.title}</td>
            <td><span class="badge badge-${challenge.category}">${challenge.category}</span></td>
            <td><span class="badge badge-${challenge.difficulty}">${challenge.difficulty}</span></td>
            <td>${challenge.points}</td>
            <td>${challenge.solves}</td>
            <td><span class="badge badge-${challenge.isActive ? 'active' : 'inactive'}">
                ${challenge.isActive ? 'Active' : 'Inactive'}
            </span></td>
            <td>
                <button class="action-btn edit" onclick="editChallenge('${challenge.id}')">
                     Edit
                </button>
                <button class="action-btn delete" onclick="deleteChallenge('${challenge.id}')">
                     Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function filterChallenges() {
    const search = document.getElementById('challengeSearch').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const difficulty = document.getElementById('difficultyFilter').value;
    const status = document.getElementById('statusFilter').value;
    
    const filtered = state.challenges.filter(challenge => {
        const matchesSearch = !search || 
            challenge.title.toLowerCase().includes(search) ||
            challenge.code.toLowerCase().includes(search);
        const matchesCategory = !category || challenge.category === category;
        const matchesDifficulty = !difficulty || challenge.difficulty === difficulty;
        const matchesStatus = !status || 
            (status === 'active' && challenge.isActive) ||
            (status === 'inactive' && !challenge.isActive);
        
        return matchesSearch && matchesCategory && matchesDifficulty && matchesStatus;
    });
    
    // Render filtered challenges
    const tbody = document.getElementById('challengesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = filtered.map(challenge => `
        <tr>
            <td><strong>${challenge.code}</strong></td>
            <td>${challenge.title}</td>
            <td><span class="badge badge-${challenge.category}">${challenge.category}</span></td>
            <td><span class="badge badge-${challenge.difficulty}">${challenge.difficulty}</span></td>
            <td>${challenge.points}</td>
            <td>${challenge.solves}</td>
            <td><span class="badge badge-${challenge.isActive ? 'active' : 'inactive'}">
                ${challenge.isActive ? 'Active' : 'Inactive'}
            </span></td>
            <td>
                <button class="action-btn edit" onclick="editChallenge('${challenge.id}')">
                     Edit
                </button>
                <button class="action-btn delete" onclick="deleteChallenge('${challenge.id}')">
                     Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function openChallengeModal(challengeId = null) {
    const modal = document.getElementById('challengeModal');
    const form = document.getElementById('challengeForm');
    const title = document.getElementById('challengeModalTitle');
    
    if (challengeId) {
        // Edit mode
        const challenge = state.challenges.find(c => c.id === challengeId);
        title.textContent = 'Edit Challenge';
        
        // Populate form
        document.getElementById('challengeId').value = challenge.id;
        document.getElementById('challengeCode').value = challenge.code;
        document.getElementById('challengeTitle').value = challenge.title;
        document.getElementById('challengeCategory').value = challenge.category;
        document.getElementById('challengeTopic').value = challenge.topic || '';
        document.getElementById('challengeDifficulty').value = challenge.difficulty;
        document.getElementById('challengePoints').value = challenge.points;
        document.getElementById('challengeDescription').value = challenge.description || '';
        document.getElementById('challengeFlag').value = challenge.flag || '';
        document.getElementById('challengeAttempts').value = challenge.attemptsLimit || 0;
        document.getElementById('challengeTags').value = challenge.tags?.join(', ') || '';
        document.getElementById('challengeDocker').value = challenge.dockerImage || '';
        document.getElementById('challengeActive').checked = challenge.isActive;
    } else {
        // Add mode
        title.textContent = 'Add New Challenge';
        form.reset();
        document.getElementById('challengeId').value = '';
    }
    
    modal.classList.add('active');
}

function closeChallengeModal() {
    document.getElementById('challengeModal').classList.remove('active');
    document.getElementById('challengeForm').reset();
}

async function handleChallengeSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const challengeData = {
        id: document.getElementById('challengeId').value,
        code: document.getElementById('challengeCode').value,
        title: document.getElementById('challengeTitle').value,
        category: document.getElementById('challengeCategory').value,
        topic: document.getElementById('challengeTopic').value,
        difficulty: document.getElementById('challengeDifficulty').value,
        points: parseInt(document.getElementById('challengePoints').value),
        description: document.getElementById('challengeDescription').value,
        flag: document.getElementById('challengeFlag').value,
        attemptsLimit: parseInt(document.getElementById('challengeAttempts').value),
        tags: document.getElementById('challengeTags').value.split(',').map(t => t.trim()).filter(t => t),
        dockerImage: document.getElementById('challengeDocker').value,
        isActive: document.getElementById('challengeActive').checked
    };
    
    try {
        // In production, send to API
        // const response = await fetch(`${API_BASE}/admin/challenges`, {
        //     method: challengeData.id ? 'PUT' : 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(challengeData)
        // });
        
        // Mock success
        if (challengeData.id) {
            // Update existing
            const index = state.challenges.findIndex(c => c.id === challengeData.id);
            state.challenges[index] = { ...state.challenges[index], ...challengeData };
            showToast('Challenge updated successfully!', 'success');
        } else {
            // Add new
            challengeData.id = Date.now().toString();
            challengeData.solves = 0;
            state.challenges.push(challengeData);
            showToast('Challenge added successfully!', 'success');
        }
        
        renderChallengesTable();
        closeChallengeModal();
        
    } catch (error) {
        console.error('Error saving challenge:', error);
        showToast('Failed to save challenge', 'error');
    }
}

function editChallenge(challengeId) {
    openChallengeModal(challengeId);
}

async function deleteChallenge(challengeId) {
    const challenge = state.challenges.find(c => c.id === challengeId);
    if (!challenge) return;
    
    openDeleteConfirmModal(
        'Challenge',
        challengeId,
        `${challenge.code}: ${challenge.title}`,
        async (id) => {
            try {
                // In production, send to API
                // await fetch(`${API_BASE}/admin/challenges/${id}`, {
                //     method: 'DELETE'
                // });
                
                state.challenges = state.challenges.filter(c => c.id !== id);
                renderChallengesTable();
                
            } catch (error) {
                console.error('Error deleting challenge:', error);
                showToast('Failed to delete challenge', 'error');
            }
        }
    );
}

// ==========================================
// Hints Management
// ==========================================

async function loadHintsChallenges() {
    // Load challenges for hints sidebar
    const list = document.getElementById('hintsChallengeList');
    if (!list) return;
    
    if (state.challenges.length === 0) {
        await loadChallenges();
    }
    
    list.innerHTML = state.challenges.map(challenge => `
        <div class="hint-challenge-item" onclick="selectChallengeForHints('${challenge.id}')">
            <div><strong>${challenge.code}</strong></div>
            <div style="font-size: 0.9rem; color: var(--text-muted);">${challenge.title}</div>
        </div>
    `).join('');
}

function filterHintChallenges() {
    const search = document.getElementById('hintChallengeSearch').value.toLowerCase();
    const items = document.querySelectorAll('.hint-challenge-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(search) ? 'block' : 'none';
    });
}

async function selectChallengeForHints(challengeId) {
    state.selectedChallenge = state.challenges.find(c => c.id === challengeId);
    
    // Update UI
    document.querySelectorAll('.hint-challenge-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.target.closest('.hint-challenge-item').classList.add('selected');
    
    document.getElementById('noHintSelected').style.display = 'none';
    document.getElementById('hintEditor').style.display = 'block';
    document.getElementById('selectedChallengeName').textContent = state.selectedChallenge.title;
    
    // Load hints for this challenge
    await loadHintsForChallenge(challengeId);
}

async function loadHintsForChallenge(challengeId) {
    try {
        // In production, fetch from API
        // const response = await fetch(`${API_BASE}/admin/challenges/${challengeId}/hints`);
        // const hints = await response.json();
        
        // Mock data
        const hints = [
            {
                id: '1',
                challengeId,
                name: 'First Hint',
                description: 'Try looking at the source code',
                tier: 1,
                cost: 10,
                order: 1
            },
            {
                id: '2',
                challengeId,
                name: 'Second Hint',
                description: 'The vulnerability is in the login form',
                tier: 2,
                cost: 20,
                order: 2
            }
        ];
        
        renderHintsList(hints);
        
    } catch (error) {
        console.error('Error loading hints:', error);
        showToast('Failed to load hints', 'error');
    }
}

function renderHintsList(hints) {
    const list = document.getElementById('hintsList');
    if (!list) return;
    
    if (hints.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <p>No hints yet. Click "Add Hint" to create one.</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = hints.map(hint => `
        <div class="hint-item">
            <div class="hint-item-header">
                <span class="hint-item-title">${hint.name}</span>
                <div>
                    <button class="action-btn edit" onclick="editHint('${hint.id}')"></button>
                    <button class="action-btn delete" onclick="deleteHint('${hint.id}')"></button>
                </div>
            </div>
            <p>${hint.description}</p>
            <div class="hint-item-meta">
                <span>Tier: ${hint.tier}</span>
                <span>Cost: ${hint.cost} points</span>
                <span>Order: ${hint.order}</span>
            </div>
        </div>
    `).join('');
}

function addNewHint() {
    if (!state.selectedChallenge) {
        showToast('Please select a challenge first', 'warning');
        return;
    }
    
    openHintModal();
}

function openHintModal(hintId = null) {
    const modal = document.getElementById('hintModal');
    const form = document.getElementById('hintForm');
    const title = document.getElementById('hintModalTitle');
    
    if (hintId) {
        title.textContent = 'Edit Hint';
        // Load hint data and populate form
    } else {
        title.textContent = 'Add Hint';
        form.reset();
        document.getElementById('hintChallengeId').value = state.selectedChallenge.id;
    }
    
    modal.classList.add('active');
}

function closeHintModal() {
    document.getElementById('hintModal').classList.remove('active');
}

async function handleHintSubmit(e) {
    e.preventDefault();
    
    const hintData = {
        id: document.getElementById('hintId').value,
        challengeId: document.getElementById('hintChallengeId').value,
        name: document.getElementById('hintName').value,
        description: document.getElementById('hintDescription').value,
        tier: parseInt(document.getElementById('hintTier').value),
        cost: parseInt(document.getElementById('hintCost').value),
        order: parseInt(document.getElementById('hintOrder').value)
    };
    
    try {
        // In production, send to API
        showToast('Hint saved successfully!', 'success');
        closeHintModal();
        loadHintsForChallenge(state.selectedChallenge.id);
        
    } catch (error) {
        console.error('Error saving hint:', error);
        showToast('Failed to save hint', 'error');
    }
}

function editHint(hintId) {
    openHintModal(hintId);
}

async function deleteHint(hintId) {
    const hint = state.selectedChallenge.hints?.find(h => h.id === hintId);
    if (!hint) return;
    
    openDeleteConfirmModal(
        'Hint',
        hintId,
        `Hint: ${hint.name}`,
        async (id) => {
            try {
                // In production, send to API
                loadHintsForChallenge(state.selectedChallenge.id);
                
            } catch (error) {
                console.error('Error deleting hint:', error);
                showToast('Failed to delete hint', 'error');
            }
        }
    );
}

// ==========================================
// User Management
// ==========================================

async function loadUsers() {
    try {
        // Mock data
        state.users = [
            {
                id: '1',
                username: 'hacker123',
                email: 'hacker@example.com',
                displayName: 'Elite Hacker',
                role: 'user',
                score: 1250,
                rank: 1,
                createdAt: '2025-10-15 14:22',
                isActive: true
            },
            {
                id: '2',
                username: 'cyberpunk',
                email: 'cyber@example.com',
                displayName: 'Cyber Punk',
                role: 'user',
                score: 980,
                rank: 2,
                createdAt: '2025-10-20 08:45',
                isActive: true
            }
        ];
        
        renderUsersTable();
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Failed to load users', 'error');
    }
}

function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = state.users.map(user => `
        <tr>
            <td><strong>${user.username}</strong></td>
            <td>${user.email}</td>
            <td>${user.displayName}</td>
            <td><span class="badge badge-${user.role}">${user.role}</span></td>
            <td>${user.score}</td>
            <td>#${user.rank}</td>
            <td>${user.createdAt || user.created_at || 'N/A'}</td>
            <td><span class="badge badge-${user.isActive ? 'active' : 'inactive'}">
                ${user.isActive ? 'Active' : 'Inactive'}
            </span></td>
            <td>
                <button class="action-btn edit" onclick="changeUserRole('${user.id}')">Change Role</button>
                <button class="action-btn delete" onclick="deleteUser('${user.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function filterUsers() {
    const search = document.getElementById('userSearch').value.toLowerCase();
    const role = document.getElementById('roleFilter').value;
    const status = document.getElementById('userStatusFilter').value;
    
    const filtered = state.users.filter(user => {
        const matchesSearch = !search || 
            user.username.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search);
        const matchesRole = !role || user.role === role;
        const matchesStatus = !status || 
            (status === 'active' && user.isActive) ||
            (status === 'inactive' && !user.isActive);
        
        return matchesSearch && matchesRole && matchesStatus;
    });
    
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = filtered.map(user => `
        <tr>
            <td><strong>${user.username}</strong></td>
            <td>${user.email}</td>
            <td>${user.displayName}</td>
            <td><span class="badge badge-${user.role}">${user.role}</span></td>
            <td>${user.score}</td>
            <td>#${user.rank}</td>
            <td>${user.createdAt || user.created_at || 'N/A'}</td>
            <td><span class="badge badge-${user.isActive ? 'active' : 'inactive'}">
                ${user.isActive ? 'Active' : 'Inactive'}
                <button class="action-btn edit" onclick="changeUserRole('${user.id}')">Change Role</button>
                <button class="action-btn delete" onclick="deleteUser('${user.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

// ==========================================
// Submissions
// ==========================================

async function loadSubmissions() {
    try {
        // Mock data
        state.submissions = [
            {
                id: '1',
                username: 'hacker123',
                challenge: 'SQL Injection Basics',
                flagSubmitted: 'flag{sql_inject}',
                isCorrect: true,
                points: 100,
                timeTaken: 1234,
                hintsUsed: 0,
                submittedAt: '2025-10-28 10:30:15'
            },
            {
                id: '2',
                username: 'cyberpunk',
                challenge: 'XSS Attack',
                flagSubmitted: 'flag{wrong_flag}',
                isCorrect: false,
                points: 0,
                timeTaken: 567,
                hintsUsed: 1,
                submittedAt: '2025-10-28 10:25:30'
            }
        ];
        
        renderSubmissionsTable();
    } catch (error) {
        console.error('Error loading submissions:', error);
        showToast('Failed to load submissions', 'error');
    }
}

function renderSubmissionsTable() {
    const tbody = document.getElementById('submissionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = state.submissions.map(sub => `
        <tr>
            <td><strong>${sub.username}</strong></td>
            <td>${sub.challenge}</td>
            <td><code>${sub.flagSubmitted}</code></td>
            <td><span class="badge badge-${sub.isCorrect ? 'active' : 'inactive'}">
                ${sub.isCorrect ? ' Correct' : ' Incorrect'}
            </span></td>
            <td>${sub.points}</td>
            <td>${formatTime(sub.timeTaken)}</td>
            <td>${sub.hintsUsed}</td>
            <td>${sub.submittedAt}</td>
        </tr>
    `).join('');
}

function filterSubmissions() {
    const search = document.getElementById('submissionSearch').value.toLowerCase();
    const result = document.getElementById('submissionResultFilter').value;
    const date = document.getElementById('submissionDateFilter').value;
    
    const filtered = state.submissions.filter(sub => {
        const matchesSearch = !search || 
            sub.username.toLowerCase().includes(search) ||
            sub.challenge.toLowerCase().includes(search);
        const matchesResult = !result || 
            (result === 'correct' && sub.isCorrect) ||
            (result === 'incorrect' && !sub.isCorrect);
        const matchesDate = !date || sub.submittedAt.startsWith(date);
        
        return matchesSearch && matchesResult && matchesDate;
    });
    
    const tbody = document.getElementById('submissionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = filtered.map(sub => `
        <tr>
            <td><strong>${sub.username}</strong></td>
            <td>${sub.challenge}</td>
            <td><code>${sub.flagSubmitted}</code></td>
            <td><span class="badge badge-${sub.isCorrect ? 'active' : 'inactive'}">
                ${sub.isCorrect ? ' Correct' : ' Incorrect'}
            </span></td>
            <td>${sub.points}</td>
            <td>${formatTime(sub.timeTaken)}</td>
            <td>${sub.hintsUsed}</td>
            <td>${sub.submittedAt}</td>
        </tr>
    `).join('');
}

// ==========================================
// Statistics
// ==========================================

async function loadStatistics() {
    // Load advanced statistics
    initializeStatisticsCharts();
}

function showStatsTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    document.querySelectorAll('.stats-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`stats-${tabName}`).classList.add('active');
}

function initializeStatisticsCharts() {
    // Initialize additional charts for statistics page
}

// ==========================================
// File Management
// ==========================================

async function loadFiles() {
    const fileGrid = document.getElementById('fileGrid');
    if (!fileGrid) return;
    
    // Mock files
    const files = [
        { name: 'challenge1.zip', size: '2.5 MB', icon: '' },
        { name: 'exploit.py', size: '15 KB', icon: '' },
        { name: 'banner.png', size: '450 KB', icon: '' },
        { name: 'readme.txt', size: '2 KB', icon: '' }
    ];
    
    fileGrid.innerHTML = files.map(file => `
        <div class="file-card">
            <div class="file-icon">${file.icon}</div>
            <div class="file-name">${file.name}</div>
            <div class="file-size">${file.size}</div>
        </div>
    `).join('');
}

function openUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
}

async function handleFileUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('uploadProgressBar');
    const statusText = document.getElementById('uploadStatus');
    
    progressDiv.style.display = 'block';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        statusText.textContent = `Uploading ${file.name}...`;
        
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
            await new Promise(resolve => setTimeout(resolve, 50));
            progressBar.style.width = progress + '%';
        }
    }
    
    statusText.textContent = 'Upload complete!';
    showToast('Files uploaded successfully!', 'success');
    
    setTimeout(() => {
        closeUploadModal();
        progressDiv.style.display = 'none';
        loadFiles();
    }, 1000);
}

function previewImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
}

// ==========================================
// Settings
// ==========================================

function saveSettings() {
    showToast('Settings saved successfully!', 'success');
}

// ==========================================
// ==========================================
// Delete Confirmation System
// ==========================================

let deleteTarget = {
    type: '',
    id: '',
    name: '',
    callback: null
};

function openDeleteConfirmModal(type, id, name, callback) {
    deleteTarget = { type, id, name, callback };
    
    document.getElementById('deleteTargetName').textContent = name;
    document.getElementById('deleteAdminName').textContent = state.currentUser.username;
    document.getElementById('deletePassword').value = '';
    document.getElementById('deleteConfirmModal').classList.add('active');
}

function closeDeleteConfirmModal() {
    document.getElementById('deleteConfirmModal').classList.remove('active');
    document.getElementById('deletePassword').value = '';
    deleteTarget = { type: '', id: '', name: '', callback: null };
}

async function confirmDelete() {
    const password = document.getElementById('deletePassword').value;
    
    if (!password) {
        showToast('Please enter your password', 'error');
        return;
    }
    
    // Mock password check (in production, verify with backend)
    const isPasswordCorrect = password === 'admin123'; // Change this in production
    
    if (!isPasswordCorrect) {
        showToast('Incorrect password', 'error');
        return;
    }
    
    // Log the delete action
    await logAdminAction('delete', deleteTarget.type, deleteTarget.name);
    
    // Execute the delete callback
    if (deleteTarget.callback) {
        await deleteTarget.callback(deleteTarget.id);
    }
    
    closeDeleteConfirmModal();
    showToast(`${deleteTarget.type} deleted successfully`, 'success');
}

// ==========================================
// Admin Activity Logs
// ==========================================

let adminLogs = [
    {
        id: '1',
        timestamp: '2025-10-28 14:35:22',
        admin: 'Admin',
        action: 'create',
        target: 'Challenge',
        details: 'Created challenge "WEB005 - XSS Advanced"',
        ipAddress: '192.168.1.100'
    },
    {
        id: '2',
        timestamp: '2025-10-28 13:22:15',
        admin: 'Admin',
        action: 'update',
        target: 'Challenge',
        details: 'Updated challenge "CRYPTO001" description',
        ipAddress: '192.168.1.100'
    },
    {
        id: '3',
        timestamp: '2025-10-28 12:10:45',
        admin: 'Admin',
        action: 'delete',
        target: 'User',
        details: 'Deleted user "testuser123"',
        ipAddress: '192.168.1.100'
    },
    {
        id: '4',
        timestamp: '2025-10-28 11:05:30',
        admin: 'Admin',
        action: 'create',
        target: 'Hint',
        details: 'Added hint to challenge "WEB001"',
        ipAddress: '192.168.1.100'
    },
    {
        id: '5',
        timestamp: '2025-10-28 10:15:18',
        admin: 'Admin',
        action: 'update',
        target: 'Settings',
        details: 'Changed platform settings',
        ipAddress: '192.168.1.100'
    }
];

async function logAdminAction(action, targetType, details) {
    const log = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        admin: state.currentUser.username,
        action: action,
        target: targetType,
        details: details,
        ipAddress: '192.168.1.100' // In production, get real IP from backend
    };
    
    adminLogs.unshift(log);
    
    // In production, send to backend
    // await fetch(`${API_BASE}/admin/logs`, {
    //     method: 'POST',
    //     body: JSON.stringify(log)
    // });
    
    renderAdminLogs();
}

function renderAdminLogs() {
    const tbody = document.getElementById('adminLogsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = adminLogs.map(log => `
        <tr>
            <td>${log.timestamp}</td>
            <td><strong>${log.admin}</strong></td>
            <td><span class="badge badge-${log.action}">${log.action.toUpperCase()}</span></td>
            <td>${log.target}</td>
            <td>${log.details}</td>
            <td style="font-family: monospace; font-size: 0.9rem;">${log.ipAddress}</td>
        </tr>
    `).join('');
}

function filterLogs() {
    const search = document.getElementById('logSearch')?.value.toLowerCase() || '';
    const action = document.getElementById('logActionFilter')?.value || '';
    const date = document.getElementById('logDateFilter')?.value || '';
    
    const filtered = adminLogs.filter(log => {
        const matchesSearch = !search || 
            log.admin.toLowerCase().includes(search) ||
            log.details.toLowerCase().includes(search) ||
            log.target.toLowerCase().includes(search);
        
        const matchesAction = !action || log.action === action;
        
        const matchesDate = !date || log.timestamp.startsWith(date);
        
        return matchesSearch && matchesAction && matchesDate;
    });
    
    const tbody = document.getElementById('adminLogsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = filtered.map(log => `
        <tr>
            <td>${log.timestamp}</td>
            <td><strong>${log.admin}</strong></td>
            <td><span class="badge badge-${log.action}">${log.action.toUpperCase()}</span></td>
            <td>${log.target}</td>
            <td>${log.details}</td>
            <td style="font-family: monospace; font-size: 0.9rem;">${log.ipAddress}</td>
        </tr>
    `).join('');
}

// ==========================================
// Utility Functions
// ==========================================

function switchToUserView() {
    // Optional: Navigate to user view if exists
    const userViewUrl = 'main.html';
    if (confirm(`Navigate to user view at ${userViewUrl}?`)) {
        window.location.href = userViewUrl;
    }
}

async function logout() {
    const confirmLogout = confirm('Are you sure you want to logout?');
    if (!confirmLogout) return;

    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Supabase signOut error:', error);
            showToast('Logout failed', 'error');
            return;
        }

        window.location.href = 'home.html';
    } catch (err) {
        console.error('Unexpected logout error:', err);
        showToast('Logout error', 'error');
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function formatTime(seconds) {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function editUser(userId) {
    showToast('User edit feature coming soon', 'warning');
}

function deleteUser(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    
    openDeleteConfirmModal(
        'User',
        userId,
        user.username,
        async (id) => {
            try {
                // In production, send to API
                state.users = state.users.filter(u => u.id !== id);
                renderUsersTable();
                
            } catch (error) {
                console.error('Error deleting user:', error);
                showToast('Failed to delete user', 'error');
            }
        }
    );
}

// ==========================================
// Role Change with OTP Verification
// ==========================================

let otpSession = {
    userId: null,
    otp: null,
    expiry: null,
    verified: false
};

function changeUserRole(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('roleChangeUserId').value = userId;
    document.getElementById('roleChangeUsername').textContent = user.username;
    document.getElementById('newRole').value = user.role;
    document.getElementById('roleChangePassword').value = '';
    document.getElementById('otpCode').value = '';
    
    // Reset OTP session
    otpSession = {
        userId: userId,
        otp: null,
        expiry: null,
        verified: false
    };
    
    document.getElementById('roleChangeModal').classList.add('active');
}

function closeRoleChangeModal() {
    document.getElementById('roleChangeModal').classList.remove('active');
    otpSession = {
        userId: null,
        otp: null,
        expiry: null,
        verified: false
    };
}

function requestOTP() {
    const password = document.getElementById('roleChangePassword').value;
    
    if (!password) {
        showToast('Please enter your admin password first', 'warning');
        return;
    }
    
    // In production, verify password with backend
    // For demo, we'll simulate password verification
    const adminPassword = 'admin123'; // This should be verified by backend
    
    if (password !== adminPassword) {
        showToast('Invalid admin password', 'error');
        return;
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP expiry (5 minutes)
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 5);
    
    otpSession.otp = otp;
    otpSession.expiry = expiry;
    
    // In production, send OTP to admin's email via backend API
    console.log('OTP Code:', otp); // For demo purposes
    
    // Show success message
    showToast(`OTP sent to admin email! (Demo OTP: ${otp})`, 'success');
    
    // Disable request button temporarily
    const btn = document.getElementById('requestOtpBtn');
    btn.disabled = true;
    btn.textContent = '⏱️ OTP Sent (check console for demo)';
    
    setTimeout(() => {
        btn.disabled = false;
        btn.textContent = ' Request OTP';
    }, 30000); // 30 seconds cooldown
}

function confirmRoleChange() {
    const userId = document.getElementById('roleChangeUserId').value;
    const newRole = document.getElementById('newRole').value;
    const password = document.getElementById('roleChangePassword').value;
    const otpCode = document.getElementById('otpCode').value;
    
    // Validate inputs
    if (!password) {
        showToast('Please enter your admin password', 'warning');
        return;
    }
    
    if (!otpCode) {
        showToast('Please enter the OTP code', 'warning');
        return;
    }
    
    // Verify password (in production, verify with backend)
    const adminPassword = 'admin123';
    if (password !== adminPassword) {
        showToast('Invalid admin password', 'error');
        return;
    }
    
    // Verify OTP
    if (!otpSession.otp) {
        showToast('Please request OTP first', 'warning');
        return;
    }
    
    if (otpCode !== otpSession.otp) {
        showToast('Invalid OTP code', 'error');
        return;
    }
    
    // Check OTP expiry
    if (new Date() > otpSession.expiry) {
        showToast('OTP has expired. Please request a new one', 'error');
        otpSession.otp = null;
        return;
    }
    
    // Update user role
    const user = state.users.find(u => u.id === userId);
    if (user) {
        const oldRole = user.role;
        user.role = newRole;
        
        // In production, send to API
        // await updateUserRole(userId, newRole);
        
        renderUsersTable();
        closeRoleChangeModal();
        
        showToast(`Successfully changed ${user.username}'s role from ${oldRole} to ${newRole}`, 'success');
        
        // Log the action
        console.log(`Role changed: ${user.username} (${oldRole} → ${newRole}) by ${state.currentUser.username}`);
    }
}

// ==========================================
// User Statistics Chart
// ==========================================

function updateActivityStats() {
    // This function can be used to update stats dynamically
    // For now, stats are hardcoded in HTML
    // In production, fetch from API and update the table
    
    const statsBody = document.getElementById('activityStatsBody');
    if (!statsBody) return;
    
    // Stats are already in HTML, this function is for future API integration
    console.log('Activity stats table ready');
}

// ==========================================
// Export functions for global access
// ==========================================

window.showSection = showSection;
window.openChallengeModal = openChallengeModal;
window.closeChallengeModal = closeChallengeModal;
window.editChallenge = editChallenge;
window.deleteChallenge = deleteChallenge;
window.filterChallenges = filterChallenges;
window.selectChallengeForHints = selectChallengeForHints;
window.filterHintChallenges = filterHintChallenges;
window.addNewHint = addNewHint;
window.closeHintModal = closeHintModal;
window.editHint = editHint;
window.deleteHint = deleteHint;
window.filterUsers = filterUsers;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.filterSubmissions = filterSubmissions;
window.showStatsTab = showStatsTab;
window.openUploadModal = openUploadModal;
window.closeUploadModal = closeUploadModal;
window.saveSettings = saveSettings;
window.switchToUserView = switchToUserView;
window.logout = logout;
window.closeDeleteConfirmModal = closeDeleteConfirmModal;
window.confirmDelete = confirmDelete;
window.filterLogs = filterLogs;
window.changeUserRole = changeUserRole;
window.closeRoleChangeModal = closeRoleChangeModal;
window.requestOTP = requestOTP;
window.confirmRoleChange = confirmRoleChange;
