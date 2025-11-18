import { supabase } from './supabaseClient.js';
import { setupNavUser } from './navAuth.js';
// State Management
let userData = {
    id: 1,
    username: 'user123',
    displayName: 'User Name',
    email: 'user@example.com',
    avatar: 'https://ui-avatars.com/api/?name=User&size=200&background=00ff88&color=0a0e27&bold=true',
    role: 'user',
    score: 1250,
    rank: 5,
    solvedChallenges: 12,
    memberSince: 'October 28, 2025',
    twoFactorEnabled: false
};

let editMode = false;
let currentPasswordStep = 1;
let otpTimer = null;
let otpTimeLeft = 60;

// Initialize Page
document.addEventListener('DOMContentLoaded', function() {
    createParticles();
    loadUserData();
});

// Create Particles
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

// Load User Data
function loadUserData() {
    // In production, fetch from API
    // const response = await fetch('/api/user/profile');
    // userData = await response.json();
    
    // Load from localStorage if exists
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        const user = JSON.parse(storedUser);
        userData.username = user.username || userData.username;
    }
    
    // Update UI
    document.getElementById('displayUsername').textContent = '@' + userData.username;
    document.getElementById('userRole').textContent = userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
    document.getElementById('userScore').textContent = userData.score;
    document.getElementById('userRank').textContent = '#' + userData.rank;
    document.getElementById('solvedChallenges').textContent = userData.solvedChallenges;
    
    document.getElementById('username').value = userData.username;
    document.getElementById('displayName').value = userData.displayName;
    document.getElementById('email').value = userData.email;
    document.getElementById('memberSince').value = userData.memberSince;
    document.getElementById('userEmail').textContent = userData.email;
    
    document.getElementById('avatarPreview').src = userData.avatar;
    document.getElementById('twoFactorToggle').checked = userData.twoFactorEnabled;
}

// ====================================
// Avatar Management
// ====================================

function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image size must be less than 5MB', 'error');
        return;
    }
    
    // Preview image
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('avatarPreview').src = e.target.result;
        userData.avatar = e.target.result;
        
        // In production, upload to server
        uploadAvatar(file);
    };
    reader.readAsDataURL(file);
}

async function uploadAvatar(file) {
    try {
        // Simulate upload
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In production:
        // const formData = new FormData();
        // formData.append('avatar', file);
        // const response = await fetch('/api/user/avatar', {
        //     method: 'POST',
        //     body: formData
        // });
        
        showToast('Avatar updated successfully!', 'success');
    } catch (error) {
        console.error('Avatar upload error:', error);
        showToast('Failed to upload avatar', 'error');
    }
}

// ====================================
// Account Edit Mode
// ====================================

function toggleEditMode() {
    editMode = !editMode;
    
    const displayNameInput = document.getElementById('displayName');
    const emailInput = document.getElementById('email');
    const editBtn = document.getElementById('editAccountBtn');
    const actions = document.getElementById('accountActions');
    
    if (editMode) {
        displayNameInput.disabled = false;
        emailInput.disabled = false;
        editBtn.textContent = '❌ Cancel';
        editBtn.classList.add('btn-secondary');
        editBtn.classList.remove('btn-edit');
        actions.style.display = 'flex';
    } else {
        displayNameInput.disabled = true;
        emailInput.disabled = true;
        editBtn.textContent = '✏️ Edit';
        editBtn.classList.remove('btn-secondary');
        editBtn.classList.add('btn-edit');
        actions.style.display = 'none';
        
        // Reset to original values
        loadUserData();
    }
}

function cancelEdit() {
    toggleEditMode();
}

async function saveAccountChanges() {
    const displayName = document.getElementById('displayName').value;
    const email = document.getElementById('email').value;
    
    // Validate
    if (!displayName || displayName.trim().length < 2) {
        showToast('Display name must be at least 2 characters', 'error');
        return;
    }
    
    if (!email || !email.includes('@')) {
        showToast('Please enter a valid email', 'error');
        return;
    }
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In production:
        // const response = await fetch('/api/user/profile', {
        //     method: 'PUT',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ displayName, email })
        // });
        
        userData.displayName = displayName;
        userData.email = email;
        
        toggleEditMode();
        showToast('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Save error:', error);
        showToast('Failed to save changes', 'error');
    }
}

// ====================================
// Password Reset Modal
// ====================================

function openPasswordModal() {
    document.getElementById('passwordModal').classList.add('active');
    showPasswordStep(1);
    document.getElementById('currentPassword').value = '';
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
    currentPasswordStep = 1;
    clearPasswordFields();
}

function showPasswordStep(step) {
    document.querySelectorAll('.password-step').forEach(el => {
        el.classList.remove('active');
    });
    
    if (step === 'success') {
        document.getElementById('stepSuccess').classList.add('active');
    } else {
        document.getElementById('step' + step).classList.add('active');
    }
    
    currentPasswordStep = step;
}

function clearPasswordFields() {
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmNewPassword').value = '';
    
    // Clear OTP
    for (let i = 1; i <= 6; i++) {
        document.getElementById('otp' + i).value = '';
    }
    
    if (otpTimer) {
        clearInterval(otpTimer);
        otpTimer = null;
    }
}

// Step 1: Verify Current Password
async function verifyCurrentPassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    
    if (!currentPassword) {
        showToast('Please enter your current password', 'error');
        return;
    }
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In production:
        // const response = await fetch('/api/auth/verify-password', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ password: currentPassword })
        // });
        
        // Mock validation (password: admin123)
        if (currentPassword === 'admin123') {
            showPasswordStep(2);
            sendOTP();
        } else {
            showToast('Incorrect password', 'error');
        }
    } catch (error) {
        console.error('Verify password error:', error);
        showToast('Verification failed', 'error');
    }
}

// Step 2: Send OTP
async function sendOTP() {
    try {
        // Simulate sending OTP
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // In production:
        // await fetch('/api/auth/send-otp', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ email: userData.email })
        // });
        
        // Mock OTP: 123456
        console.log('OTP sent: 123456');
        showToast('OTP sent to ' + userData.email, 'success');
        
        // Start timer
        startOTPTimer();
        
        // Focus first OTP input
        document.getElementById('otp1').focus();
    } catch (error) {
        console.error('Send OTP error:', error);
        showToast('Failed to send OTP', 'error');
    }
}

function startOTPTimer() {
    otpTimeLeft = 60;
    const timerElement = document.getElementById('otpTimer');
    
    otpTimer = setInterval(() => {
        otpTimeLeft--;
        timerElement.textContent = ` (${otpTimeLeft}s)`;
        
        if (otpTimeLeft <= 0) {
            clearInterval(otpTimer);
            timerElement.textContent = '';
        }
    }, 1000);
}

function resendOTP() {
    if (otpTimeLeft > 0) {
        showToast('Please wait before resending OTP', 'warning');
        return;
    }
    
    // Clear existing OTP inputs
    for (let i = 1; i <= 6; i++) {
        document.getElementById('otp' + i).value = '';
    }
    
    sendOTP();
}

// OTP Input Navigation
function moveToNext(current, nextId) {
    if (current.value.length === 1) {
        const next = document.getElementById(nextId);
        if (next) {
            next.focus();
        }
    }
}

// Step 2: Verify OTP
async function verifyOTP() {
    let otp = '';
    for (let i = 1; i <= 6; i++) {
        const value = document.getElementById('otp' + i).value;
        if (!value) {
            showToast('Please enter complete OTP', 'error');
            return;
        }
        otp += value;
    }
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In production:
        // const response = await fetch('/api/auth/verify-otp', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ otp })
        // });
        
        // Mock validation (OTP: 123456)
        if (otp === '123456') {
            showPasswordStep(3);
            
            // Setup password strength checker
            document.getElementById('newPassword').addEventListener('input', function() {
                checkPasswordStrength(this.value);
                checkPasswordsMatch();
            });
            
            document.getElementById('confirmNewPassword').addEventListener('input', checkPasswordsMatch);
        } else {
            showToast('Invalid OTP', 'error');
        }
    } catch (error) {
        console.error('Verify OTP error:', error);
        showToast('Verification failed', 'error');
    }
}

// Password Strength Checker
function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    let strength = 0;
    let feedback = [];
    
    if (password.length >= 8) strength++;
    else feedback.push('at least 8 characters');
    
    if (/[A-Z]/.test(password)) strength++;
    else feedback.push('uppercase');
    
    if (/[a-z]/.test(password)) strength++;
    else feedback.push('lowercase');
    
    if (/[0-9]/.test(password)) strength++;
    else feedback.push('number');
    
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    else feedback.push('special character');
    
    strengthBar.className = 'strength-bar';
    if (strength <= 2) {
        strengthBar.classList.add('weak');
        strengthText.textContent = 'Weak - Need: ' + feedback.join(', ');
        strengthText.style.color = 'var(--danger)';
    } else if (strength <= 4) {
        strengthBar.classList.add('medium');
        strengthText.textContent = 'Medium - Add: ' + feedback.join(', ');
        strengthText.style.color = 'var(--warning)';
    } else {
        strengthBar.classList.add('strong');
        strengthText.textContent = 'Strong password!';
        strengthText.style.color = 'var(--success)';
    }
    
    return strength;
}

function checkPasswordsMatch() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const matchElement = document.getElementById('passwordMatch');
    
    if (!confirmPassword) {
        matchElement.textContent = '';
        return false;
    }
    
    if (newPassword === confirmPassword) {
        matchElement.textContent = 'Passwords match ✓';
        matchElement.className = 'password-match success';
        return true;
    } else {
        matchElement.textContent = 'Passwords do not match ✗';
        matchElement.className = 'password-match error';
        return false;
    }
}

// Step 3: Reset Password
async function resetPassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    if (!newPassword || !confirmPassword) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    const strength = checkPasswordStrength(newPassword);
    if (strength < 3) {
        showToast('Password is too weak', 'error');
        return;
    }
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // In production:
        // const response = await fetch('/api/user/reset-password', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ newPassword })
        // });
        
        showPasswordStep('success');
        
        // Auto close after 3 seconds
        setTimeout(() => {
            closePasswordModal();
        }, 3000);
    } catch (error) {
        console.error('Reset password error:', error);
        showToast('Failed to reset password', 'error');
    }
}

// Toggle Password Visibility
function togglePasswordField(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('.eye-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
    } else {
        input.type = 'password';
        icon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;
    }
}

// ====================================
// Two-Factor Authentication
// ====================================

async function toggle2FA() {
    const toggle = document.getElementById('twoFactorToggle');
    const enabled = toggle.checked;
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In production:
        // const response = await fetch('/api/user/2fa', {
        //     method: 'PUT',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ enabled })
        // });
        
        userData.twoFactorEnabled = enabled;
        
        if (enabled) {
            showToast('Two-factor authentication enabled', 'success');
        } else {
            showToast('Two-factor authentication disabled', 'warning');
        }
    } catch (error) {
        console.error('2FA toggle error:', error);
        showToast('Failed to update 2FA settings', 'error');
        toggle.checked = !enabled; // Revert
    }
}

// ====================================
// Account Deletion
// ====================================

function confirmDeleteAccount() {
    document.getElementById('deleteAccountModal').classList.add('active');
    document.getElementById('deleteAccountPassword').value = '';
    document.getElementById('deleteConfirmText').value = '';
}

function closeDeleteAccountModal() {
    document.getElementById('deleteAccountModal').classList.remove('active');
    document.getElementById('deleteAccountPassword').value = '';
    document.getElementById('deleteConfirmText').value = '';
}

async function executeDeleteAccount() {
    const password = document.getElementById('deleteAccountPassword').value;
    const confirmText = document.getElementById('deleteConfirmText').value;
    
    // Validate password
    if (!password) {
        showToast('Please enter your password', 'error');
        return;
    }
    
    // Validate confirmation text
    if (confirmText !== 'DELETE') {
        showToast('Please type "DELETE" to confirm', 'error');
        return;
    }
    
    try {
        // Simulate password verification
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In production:
        // const response = await fetch('/api/user/verify-password', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ password })
        // });
        
        // Mock password check (password: admin123)
        if (password !== 'admin123') {
            showToast('Incorrect password', 'error');
            return;
        }
        
        // Proceed with deletion
        await deleteAccount();
        
    } catch (error) {
        console.error('Delete account error:', error);
        showToast('Failed to delete account', 'error');
    }
}

async function deleteAccount() {
    try {
        // Show loading
        const deleteBtn = document.querySelector('#deleteAccountModal .btn-danger');
        const originalText = deleteBtn.textContent;
        deleteBtn.textContent = 'Deleting...';
        deleteBtn.disabled = true;
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // In production:
        // const response = await fetch('/api/user/account', {
        //     method: 'DELETE',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ password })
        // });
        
        closeDeleteAccountModal();
        showToast('Account deleted successfully', 'success');
        
        // Redirect to homepage after 2 seconds
        setTimeout(() => {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        }, 2000);
    } catch (error) {
        console.error('Delete account error:', error);
        showToast('Failed to delete account', 'error');
        
        // Reset button
        const deleteBtn = document.querySelector('#deleteAccountModal .btn-danger');
        deleteBtn.textContent = '🗑️ Permanently Delete Account';
        deleteBtn.disabled = false;
    }
}

// ====================================
// Utility Functions
// ====================================

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--warning)'};
        color: var(--dark);
        padding: 1rem 2rem;
        border-radius: 10px;
        font-weight: bold;
        z-index: 9999;
        animation: slideInRight 0.3s ease-out;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}
// Expose functions for inline onclick handlers in profile.html
window.cancelEdit = cancelEdit;
window.closeDeleteAccountModal = closeDeleteAccountModal;
window.closePasswordModal = closePasswordModal;
window.confirmDeleteAccount = confirmDeleteAccount;
window.executeDeleteAccount = executeDeleteAccount;
window.handleAvatarChange = handleAvatarChange;
window.logout = logout;
window.openPasswordModal = openPasswordModal;
window.resendOTP = resendOTP;
window.resetPassword = resetPassword;
window.saveAccountChanges = saveAccountChanges;
window.toggle2FA = toggle2FA;
window.toggleEditMode = toggleEditMode;
window.togglePasswordField = togglePasswordField;
window.verifyCurrentPassword = verifyCurrentPassword;
window.verifyOTP = verifyOTP;


// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
