import { supabase } from './supabaseClient.js';
import { setupNavUser } from './navAuth.js';

// Create floating particles
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

// Global variables
let userEmail = '';
let generatedOTP = '';
let otpExpiryTime;
let timerInterval;
let resendTimerInterval;
let resendCooldown = 60;

// Toggle password visibility
function togglePasswordVisibility(inputId, button) {
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

// Generate random OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Show message
function showMessage(message, type = 'success', containerId = 'step1') {
    const container = document.getElementById(containerId);
    const form = container.querySelector('form');
    
    // Remove existing message
    const existingMessage = container.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert before form
    container.insertBefore(messageDiv, form);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        messageDiv.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => messageDiv.remove(), 300);
    }, 5000);
}

// Simulate sending email with OTP
function sendOTPEmail(email, otp) {
    console.log('======================');
    console.log('📧 EMAIL SENT');
    console.log('======================');
    console.log('To:', email);
    console.log('Subject: secXplore - Password Reset OTP Code');
    console.log('');
    console.log('Your OTP Code: ' + otp);
    console.log('');
    console.log('This code will expire in 5 minutes.');
    console.log('======================');
    
    // In production, this would call your backend API to send actual email
    // Example:
    // fetch('/api/send-otp', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email: email, otp: otp })
    // });
}

// Step 1: Request OTP
function handleRequestOTP(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const btn = document.getElementById('requestOtpBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    
    // Validate email
    if (!email || !email.includes('@')) {
        showMessage('Please enter a valid email address', 'error', 'step1');
        return;
    }
    
    // Show loading
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    btn.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        // Generate OTP
        generatedOTP = generateOTP();
        userEmail = email;
        
        // Set expiry time (5 minutes from now)
        otpExpiryTime = Date.now() + (5 * 60 * 1000);
        
        // Send email (simulated)
        sendOTPEmail(email, generatedOTP);
        
        // Show success message
        showMessage('OTP code has been sent to your email!', 'success', 'step1');
        
        // Reset button
        btnText.style.display = 'block';
        btnLoading.style.display = 'none';
        btn.disabled = false;
        
        // Move to step 2 after short delay
        setTimeout(() => {
            goToStep(2);
        }, 1500);
    }, 2000);
}

// Step 2: Setup OTP inputs
function setupOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        // Auto focus next input
        input.addEventListener('input', function(e) {
            if (this.value.length === 1) {
                this.classList.add('filled');
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
                
                // Check if all inputs are filled
                const allFilled = Array.from(otpInputs).every(inp => inp.value.length === 1);
                if (allFilled) {
                    // Auto submit after a short delay
                    setTimeout(() => {
                        document.getElementById('verifyOtpForm').dispatchEvent(new Event('submit'));
                    }, 300);
                }
            }
        });
        
        // Handle backspace
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value === '') {
                if (index > 0) {
                    otpInputs[index - 1].focus();
                    otpInputs[index - 1].value = '';
                    otpInputs[index - 1].classList.remove('filled');
                }
            }
        });
        
        // Only allow numbers
        input.addEventListener('keypress', function(e) {
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
            }
        });
        
        // Handle paste
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text');
            const digits = pastedData.replace(/\D/g, '').slice(0, 6);
            
            digits.split('').forEach((digit, i) => {
                if (otpInputs[i]) {
                    otpInputs[i].value = digit;
                    otpInputs[i].classList.add('filled');
                }
            });
            
            if (digits.length === 6) {
                setTimeout(() => {
                    document.getElementById('verifyOtpForm').dispatchEvent(new Event('submit'));
                }, 300);
            }
        });
    });
}

// Start OTP timer
function startOTPTimer() {
    const timerElement = document.getElementById('timer');
    
    timerInterval = setInterval(() => {
        const now = Date.now();
        const timeLeft = Math.max(0, otpExpiryTime - now);
        
        if (timeLeft === 0) {
            clearInterval(timerInterval);
            timerElement.textContent = '00:00';
            timerElement.style.color = 'var(--danger)';
            showMessage('OTP code has expired. Please request a new one.', 'error', 'step2');
            
            // Disable verify button
            document.getElementById('verifyOtpBtn').disabled = true;
            return;
        }
        
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Change color when time is running out
        if (timeLeft < 60000) {
            timerElement.style.color = 'var(--danger)';
        }
    }, 1000);
}

// Start resend cooldown
function startResendCooldown() {
    const resendBtn = document.getElementById('resendBtn');
    const resendTimerElement = document.getElementById('resendTimer');
    
    resendCooldown = 60;
    resendBtn.disabled = true;
    
    resendTimerInterval = setInterval(() => {
        resendCooldown--;
        resendTimerElement.textContent = resendCooldown;
        
        if (resendCooldown === 0) {
            clearInterval(resendTimerInterval);
            resendBtn.disabled = false;
            resendBtn.innerHTML = 'Resend Code';
        }
    }, 1000);
}

// Handle resend OTP
function handleResendOTP() {
    const resendBtn = document.getElementById('resendBtn');
    
    // Generate new OTP
    generatedOTP = generateOTP();
    otpExpiryTime = Date.now() + (5 * 60 * 1000);
    
    // Send email
    sendOTPEmail(userEmail, generatedOTP);
    
    // Clear existing OTP inputs
    document.querySelectorAll('.otp-input').forEach(input => {
        input.value = '';
        input.classList.remove('filled', 'error');
    });
    
    // Reset timers
    clearInterval(timerInterval);
    clearInterval(resendTimerInterval);
    startOTPTimer();
    startResendCooldown();
    
    // Enable verify button
    document.getElementById('verifyOtpBtn').disabled = false;
    
    // Show success message
    showMessage('New OTP code has been sent!', 'success', 'step2');
    
    // Focus first input
    document.querySelector('.otp-input').focus();
}

// Step 2: Verify OTP
function handleVerifyOTP(e) {
    e.preventDefault();
    
    // Get OTP from inputs
    const otpInputs = document.querySelectorAll('.otp-input');
    const enteredOTP = Array.from(otpInputs).map(input => input.value).join('');
    
    // Validate OTP length
    if (enteredOTP.length !== 6) {
        showMessage('Please enter the complete 6-digit code', 'error', 'step2');
        return;
    }
    
    const btn = document.getElementById('verifyOtpBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    
    // Show loading
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    btn.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        // Check if OTP is expired
        if (Date.now() > otpExpiryTime) {
            showMessage('OTP code has expired. Please request a new one.', 'error', 'step2');
            otpInputs.forEach(input => input.classList.add('error'));
            btnText.style.display = 'block';
            btnLoading.style.display = 'none';
            btn.disabled = false;
            return;
        }
        
        // Verify OTP
        if (enteredOTP === generatedOTP) {
            // Clear timers
            clearInterval(timerInterval);
            clearInterval(resendTimerInterval);
            
            // Show success message
            showMessage('Code verified successfully!', 'success', 'step2');
            
            // Move to step 3
            setTimeout(() => {
                goToStep(3);
            }, 1500);
        } else {
            showMessage('Invalid OTP code. Please try again.', 'error', 'step2');
            otpInputs.forEach(input => {
                input.classList.add('error');
                input.value = '';
                input.classList.remove('filled');
            });
            
            // Remove error class after animation
            setTimeout(() => {
                otpInputs.forEach(input => input.classList.remove('error'));
            }, 500);
            
            // Focus first input
            otpInputs[0].focus();
        }
        
        // Reset button
        btnText.style.display = 'block';
        btnLoading.style.display = 'none';
        btn.disabled = false;
    }, 1500);
}

// Password strength checker
function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    let strength = 0;
    let feedback = [];
    
    if (password.length >= 8) strength++;
    else feedback.push('at least 8 characters');
    
    if (/[A-Z]/.test(password)) strength++;
    else feedback.push('uppercase letter');
    
    if (/[a-z]/.test(password)) strength++;
    else feedback.push('lowercase letter');
    
    if (/[0-9]/.test(password)) strength++;
    else feedback.push('number');
    
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    else feedback.push('special character');
    
    // Update strength bar
    strengthBar.className = 'strength-bar';
    if (strength <= 2) {
        strengthBar.classList.add('strength-weak');
        strengthText.textContent = `Weak - Need: ${feedback.join(', ')}`;
        strengthText.style.color = 'var(--danger)';
    } else if (strength <= 4) {
        strengthBar.classList.add('strength-medium');
        strengthText.textContent = `Medium - Add: ${feedback.join(', ')}`;
        strengthText.style.color = 'var(--warning)';
    } else {
        strengthBar.classList.add('strength-strong');
        strengthText.textContent = 'Strong password ✓';
        strengthText.style.color = 'var(--success)';
    }
    
    return strength;
}

// Check password match
function checkPasswordMatch() {
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const matchIndicator = document.getElementById('passwordMatch');
    
    if (confirmPassword === '') {
        matchIndicator.textContent = '';
        return false;
    }
    
    if (password === confirmPassword) {
        matchIndicator.textContent = 'Passwords match ✓';
        matchIndicator.className = 'password-match match-success';
        return true;
    } else {
        matchIndicator.textContent = 'Passwords do not match ✗';
        matchIndicator.className = 'password-match match-error';
        return false;
    }
}

// Step 3: Reset Password
function handleResetPassword(e) {
    e.preventDefault();
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const btn = document.getElementById('resetPasswordBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    
    // Validate password strength
    const strength = checkPasswordStrength(newPassword);
    if (strength < 3) {
        showMessage('Please use a stronger password', 'error', 'step3');
        return;
    }
    
    // Validate password match
    if (newPassword !== confirmPassword) {
        showMessage('Passwords do not match', 'error', 'step3');
        return;
    }
    
    // Show loading
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    btn.disabled = true;
    
    // Simulate API call to reset password
    setTimeout(() => {
        // In production, this would call your backend API
        // fetch('/api/reset-password', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ 
        //         email: userEmail, 
        //         newPassword: newPassword,
        //         otp: generatedOTP 
        //     })
        // });
        
        console.log('======================');
        console.log('✅ PASSWORD RESET SUCCESS');
        console.log('======================');
        console.log('Email:', userEmail);
        console.log('New password has been set');
        console.log('======================');
        
        // Show success message
        alert('Password reset successful!\n\nYou can now sign in with your new password.');
        
        // Redirect to login page
        window.location.href = 'login.html';
    }, 2000);
}

// Navigate between steps
function goToStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.step-container').forEach(step => {
        step.style.display = 'none';
    });
    
    // Show target step
    const targetStep = document.getElementById(`step${stepNumber}`);
    targetStep.style.display = 'block';
    
    // Initialize step-specific features
    if (stepNumber === 2) {
        document.getElementById('displayEmail').textContent = userEmail;
        setupOTPInputs();
        startOTPTimer();
        startResendCooldown();
        
        // Focus first OTP input
        setTimeout(() => {
            document.querySelector('.otp-input').focus();
        }, 100);
    }
    
    if (stepNumber === 3) {
        // Focus new password input
        setTimeout(() => {
            document.getElementById('newPassword').focus();
        }, 100);
    }
}

// Back to step 1
function backToStep1() {
    // Clear timers
    clearInterval(timerInterval);
    clearInterval(resendTimerInterval);
    
    // Clear OTP inputs
    document.querySelectorAll('.otp-input').forEach(input => {
        input.value = '';
        input.classList.remove('filled', 'error');
    });
    
    // Reset email input
    document.getElementById('email').value = '';
    
    // Go to step 1
    goToStep(1);
}

// Setup form event listeners
function setupFormListeners() {
    // Step 1: Request OTP
    const requestOtpForm = document.getElementById('requestOtpForm');
    if (requestOtpForm) {
        requestOtpForm.addEventListener('submit', handleRequestOTP);
    }
    
    // Step 2: Verify OTP
    const verifyOtpForm = document.getElementById('verifyOtpForm');
    if (verifyOtpForm) {
        verifyOtpForm.addEventListener('submit', handleVerifyOTP);
    }
    
    // Resend button
    const resendBtn = document.getElementById('resendBtn');
    if (resendBtn) {
        resendBtn.addEventListener('click', handleResendOTP);
    }
    
    // Step 3: Reset Password
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', handleResetPassword);
    }
    
    // Password strength checker
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }
    
    // Password match checker
    const confirmPasswordInput = document.getElementById('confirmNewPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Create particles
    createParticles();
    
    // Setup form listeners
    setupFormListeners();
    
    // Focus on email input
    setTimeout(() => {
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.focus();
        }
    }, 500);
});
