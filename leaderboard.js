import { supabase } from './supabaseClient.js';
import { setupNavUser } from './navAuth.js';

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    
    for (let i = 0; i < 100; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

// Extended leaderboard data - ranks 1-50
const leaderboardData = [
    { rank: 1, name: 'CyberNinja', username: 'CN', solved: 24, points: 5420 },
    { rank: 2, name: 'SecurityPro', username: 'SP', solved: 22, points: 4850 },
    { rank: 3, name: 'HackDefender', username: 'HD', solved: 20, points: 4200 },
    { rank: 4, name: 'CodeGuardian', username: 'CG', solved: 18, points: 3750 },
    { rank: 5, name: 'NetHunter', username: 'NH', solved: 17, points: 3650 },
    { rank: 6, name: 'CryptoBreaker', username: 'CB', solved: 16, points: 3500 },
    { rank: 7, name: 'DataDigger', username: 'DD', solved: 15, points: 3400 },
    { rank: 8, name: 'SystemSlayer', username: 'SS', solved: 14, points: 3250 },
    { rank: 9, name: 'ReverseRanger', username: 'RR', solved: 14, points: 3100 },
    { rank: 10, name: 'CloudHacker', username: 'CH', solved: 13, points: 2950 },
    { rank: 11, name: 'MobileHunter', username: 'MH', solved: 12, points: 2800 },
    { rank: 12, name: 'WebWarrior', username: 'WW', solved: 12, points: 2700 },
    { rank: 13, name: 'BinaryBuster', username: 'BB', solved: 11, points: 2600 },
    { rank: 14, name: 'PacketPro', username: 'PP', solved: 11, points: 2500 },
    { rank: 15, name: 'ScriptSleuth', username: 'SL', solved: 10, points: 2400 },
    { rank: 16, name: 'ByteBender', username: 'BY', solved: 10, points: 2350 },
    { rank: 17, name: 'LogicLancer', username: 'LL', solved: 9, points: 2300 },
    { rank: 18, name: 'CipherSeeker', username: 'CS', solved: 9, points: 2250 },
    { rank: 19, name: 'ThreatTracker', username: 'TT', solved: 8, points: 2200 },
    { rank: 20, name: 'VulnVanguard', username: 'VV', solved: 8, points: 2150 },
    { rank: 21, name: 'ShellShocker', username: 'SH', solved: 8, points: 2100 },
    { rank: 22, name: 'MalwareMaster', username: 'MM', solved: 7, points: 2050 },
    { rank: 23, name: 'ForensicFox', username: 'FF', solved: 7, points: 2000 },
    { rank: 24, name: 'KernelKnight', username: 'KN', solved: 7, points: 1950 },
    { rank: 25, name: 'ExploitExpert', username: 'EE', solved: 6, points: 1900 },
    { rank: 26, name: 'HackerHawk', username: 'HH', solved: 6, points: 1850 },
    { rank: 27, name: 'DebugDemon', username: 'DM', solved: 6, points: 1800 },
    { rank: 28, name: 'CodeSorcerer', username: 'CR', solved: 5, points: 1750 },
    { rank: 29, name: 'PixelPirate', username: 'PP', solved: 5, points: 1700 },
    { rank: 30, name: 'ByteBandit', username: 'BD', solved: 5, points: 1650 },
    { rank: 31, name: 'DataDiver', username: 'DV', solved: 4, points: 1600 },
    { rank: 32, name: 'ScriptSlinger', username: 'SG', solved: 4, points: 1550 },
    { rank: 33, name: 'BugBounty', username: 'BH', solved: 4, points: 1500 },
    { rank: 34, name: 'RootRider', username: 'RD', solved: 4, points: 1450 },
    { rank: 35, name: 'TerminalTerror', username: 'TT', solved: 3, points: 1400 },
    { rank: 36, name: 'KeylogKiller', username: 'KL', solved: 3, points: 1350 },
    { rank: 37, name: 'PortScanner', username: 'PS', solved: 3, points: 1300 },
    { rank: 38, name: 'SQLSlasher', username: 'SQ', solved: 3, points: 1250 },
    { rank: 39, name: 'XSSXplorer', username: 'XX', solved: 2, points: 1200 },
    { rank: 40, name: 'CSRFCrusher', username: 'CF', solved: 2, points: 1150 },
    { rank: 41, name: 'InjectionJedi', username: 'IJ', solved: 2, points: 1100 },
    { rank: 42, name: 'Hacker42', username: 'H4', solved: 10, points: 2350 }, // Current user
    { rank: 43, name: 'ByteBlaster', username: 'BL', solved: 2, points: 1300 },
    { rank: 44, name: 'CodeCrusher', username: 'CC', solved: 2, points: 1250 },
    { rank: 45, name: 'CyberSamurai', username: 'SM', solved: 1, points: 1000 },
    { rank: 46, name: 'TechNinja', username: 'TN', solved: 1, points: 950 },
    { rank: 47, name: 'HackMaster', username: 'HM', solved: 1, points: 900 },
    { rank: 48, name: 'SecuritySage', username: 'SG', solved: 1, points: 850 },
    { rank: 49, name: 'CyberWizard', username: 'CW', solved: 1, points: 800 },
    { rank: 50, name: 'DataDefender', username: 'DF', solved: 1, points: 750 }
];

// Get rank class for styling
function getRankClass(rank) {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return '';
}

// Get item class for top 3
function getItemClass(rank) {
    if (rank <= 3) return `top-3 rank-${rank}`;
    return '';
}

// Create leaderboard list
// Create leaderboard list
function createLeaderboard(showAll = false) {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;

    const startRank = 4;
    const endRank = 24;
    const visibleData = leaderboardData.slice(startRank - 1, endRank);

    leaderboardList.innerHTML = visibleData.map(player => {
        const isCurrentUser = player.rank === 42;
        const isNearUserRank = player.rank === 16;
        
        return `
            <div class="leaderboard-item ${getItemClass(player.rank)} ${isCurrentUser ? 'current-user' : ''} ${isNearUserRank ? 'near-user' : ''}">
                <div class="rank-number ${getRankClass(player.rank)}">#${player.rank}</div>
                <div class="player-info">
                    <div class="player-avatar">${player.username}</div>
                    <div class="player-details">
                        <h3>${player.name}</h3>
                        <div class="player-level">${player.solved}/24 Solved</div>
                    </div>
                </div>
                <div class="player-points">${player.points.toLocaleString()} Points</div>
            </div>
        `;
    }).join('');
}

// Handle filter button clicks
function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Handle different filter types
            const filterType = this.textContent;
            handleFilterChange(filterType);
        });
    });
}

// Handle filter changes
// Handle filter changes
function handleFilterChange(filterType) {
    // Simulate different time periods (in real app, this would filter by actual dates)
    switch(filterType) {
        case 'All Time':
            createLeaderboard(false);
            break;
        case 'This Week':
            createWeeklyLeaderboard();
            break;
        case 'This Month':
            createMonthlyLeaderboard();
            break;
    }
}

// Create weekly leaderboard (simulated)
function createWeeklyLeaderboard() {
    const weeklyData = leaderboardData.map(player => ({
        ...player,
        points: Math.floor(player.points * 0.3) // Simulate weekly XP
    })).sort((a, b) => b.points - a.points);
    
    // Reassign ranks
    weeklyData.forEach((player, index) => {
        player.rank = index + 1;
    });
    
    displayFilteredLeaderboard(weeklyData.slice(3, 20)); // Skip top 3 for list
}

// Create monthly leaderboard (simulated)
function createMonthlyLeaderboard() {
    const monthlyData = leaderboardData.map(player => ({
        ...player,
        points: Math.floor(player.points * 0.7) // Simulate monthly XP
    })).sort((a, b) => b.points - a.points);
    
    // Reassign ranks
    monthlyData.forEach((player, index) => {
        player.rank = index + 1;
    });
    
    displayFilteredLeaderboard(monthlyData.slice(3, 20)); // Skip top 3 for list
}

// Display filtered leaderboard
// Display filtered leaderboard
function displayFilteredLeaderboard(data) {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;

    leaderboardList.innerHTML = data.map(player => {
        const isCurrentUser = player.name === 'Hacker42';
        
        return `
            <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                <div class="rank-number">#${player.rank}</div>
                <div class="player-info">
                    <div class="player-avatar">${player.username}</div>
                    <div class="player-details">
                        <h3>${player.name}</h3>
                        <div class="player-level">${player.solved}/24 Solved</div>
                    </div>
                </div>
                <div class="player-points">${player.points.toLocaleString()} Points</div>
            </div>
        `;
    }).join('');
}

// Animate numbers on load
function animateNumbers() {
    const pointsElements = document.querySelectorAll('.points, .user-points, .player-points');
    
    pointsElements.forEach(element => {
        const finalValue = parseInt(element.textContent.replace(/[^0-9]/g, ''));
        let currentValue = 0;
        const increment = finalValue / 50;
        
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= finalValue) {
                currentValue = finalValue;
                clearInterval(timer);
            }
            
            if (element.classList.contains('user-points')) {
                element.textContent = Math.floor(currentValue).toLocaleString() + ' Points';
            } else {
                element.textContent = Math.floor(currentValue).toLocaleString() + ' Points';
            }
        }, 20);
    });
}

// Smooth scrolling for navigation
function setupSmoothScrolling() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
}

// Add scroll animations
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe leaderboard items
    setTimeout(() => {
        document.querySelectorAll('.leaderboard-item').forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            item.style.transition = `all 0.5s ease ${index * 0.1}s`;
            observer.observe(item);
        });
    }, 100);
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Create particles
    createParticles();

    setupNavUser();
    
    // Create initial leaderboard
    createLeaderboard();
    
    // Setup filter buttons
    setupFilterButtons();
    
    // Setup smooth scrolling
    setupSmoothScrolling();
    
    // Animate numbers after a short delay
    setTimeout(animateNumbers, 500);
    
    // Setup scroll animations
    setupScrollAnimations();
    
    // Add some interactive effects
    setupInteractiveEffects();
});

// Interactive effects
function setupInteractiveEffects() {
    // Add hover sound effect simulation
    document.querySelectorAll('.leaderboard-item, .podium-item').forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = this.classList.contains('podium-item') ? 
                'scale(1.05) translateY(-5px)' : 
                'translateX(8px) scale(1.02)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = this.classList.contains('podium-item') ? 
                'scale(1) translateY(0)' : 
                'translateX(0) scale(1)';
        });
    });

    // Add click ripple effect
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            this.appendChild(ripple);
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}