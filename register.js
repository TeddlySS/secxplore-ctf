// register.js
import { supabase } from './supabaseClient.js';
import { setupNavUser } from './navAuth.js';

// ------------------------
// 1) พื้นหลังอนุภาค
// ------------------------
function createParticles() {
  const particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;

  for (let i = 0; i < 50; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 15 + 's';
    particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
    particlesContainer.appendChild(particle);
  }
}

// ------------------------
// 2) Toggle password (ใช้กับ onclick ใน HTML)
// ------------------------
function togglePasswordVisibility(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  if (!input || !button) return;

  const eyeClosed = button.querySelector('.eye-closed');
  const eyeOpen = button.querySelector('.eye-open');

  if (input.type === 'password') {
    input.type = 'text';
    if (eyeClosed) eyeClosed.style.display = 'none';
    if (eyeOpen) eyeOpen.style.display = 'block';
  } else {
    input.type = 'password';
    if (eyeClosed) eyeClosed.style.display = 'block';
    if (eyeOpen) eyeOpen.style.display = 'none';
  }
}

// ทำให้ HTML เรียกได้: onclick="togglePasswordVisibility(...)"
window.togglePasswordVisibility = togglePasswordVisibility;

// ------------------------
// 3) Password strength + match (ใช้ id: strengthBar / strengthText)
// ------------------------
function checkPasswordStrength(password) {
  const strengthBar = document.getElementById('strengthBar');
  const strengthText = document.getElementById('strengthText');

  if (!strengthBar || !strengthText) return 0;

  let strength = 0;
  const feedback = [];

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

  strengthBar.className = 'strength-bar';
  if (strength <= 2) {
    strengthBar.classList.add('strength-weak');
    strengthText.textContent = `Need: ${feedback.join(', ')}`;
    strengthText.style.color = 'var(--danger)';
  } else if (strength <= 4) {
    strengthBar.classList.add('strength-medium');
    strengthText.textContent = `Recommended: ${feedback.join(', ')}`;
    strengthText.style.color = 'var(--warning)';
  } else {
    strengthBar.classList.add('strength-strong');
    strengthText.textContent = 'Strong password';
    strengthText.style.color = 'var(--success)';
  }

  return strength;
}

function checkPasswordMatch() {
  const password = document.getElementById('password')?.value || '';
  const confirmPassword =
    document.getElementById('confirmPassword')?.value || '';
  const matchIndicator = document.getElementById('passwordMatch');

  if (!matchIndicator) return false;

  if (confirmPassword === '') {
    matchIndicator.textContent = '';
    matchIndicator.className = 'password-match';
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

// ------------------------
// 4) Validate form (เปิด/ปิดปุ่ม Create Account)
// ------------------------
function validateForm() {
  const username = document.getElementById('username')?.value || '';
  const email = document.getElementById('email')?.value || '';
  const password = document.getElementById('password')?.value || '';
  const confirmPassword =
    document.getElementById('confirmPassword')?.value || '';
  const termsAccepted = document.getElementById('terms')?.checked;
  const registerBtn = document.getElementById('registerBtn');

  if (!registerBtn) return;

  const isUsernameValid = username.length >= 3 && username.length <= 20;
  const isEmailValid = email.includes('@') && email.includes('.');
  const isPasswordStrong = checkPasswordStrength(password) >= 3;
  const isPasswordMatch =
    password === confirmPassword && confirmPassword !== '';

  if (
    isUsernameValid &&
    isEmailValid &&
    isPasswordStrong &&
    isPasswordMatch &&
    termsAccepted
  ) {
    registerBtn.disabled = false;
    registerBtn.style.opacity = '1';
  } else {
    registerBtn.disabled = true;
    registerBtn.style.opacity = '0.6';
  }
}

// ------------------------
// 5) Username availability (fake check เหมือนเดิม)
// ------------------------
function checkUsernameAvailability(username) {
  const unavailableUsernames = [
    'admin',
    'root',
    'user',
    'test',
    'cyberguard',
    'ctf',
  ];

  if (username.length < 3) {
    return {
      available: false,
      message: 'Username must be at least 3 characters',
    };
  }

  if (unavailableUsernames.includes(username.toLowerCase())) {
    return { available: false, message: 'This username is not available' };
  }

  return { available: true, message: 'Username is available ✓' };
}

function setupUsernameValidation() {
  const usernameInput = document.getElementById('username');
  if (!usernameInput) return;

  let validationTimeout;
  usernameInput.addEventListener('input', function () {
    const username = this.value;

    clearTimeout(validationTimeout);

    const existingMessage =
      this.parentElement.querySelector('.username-validation');
    if (existingMessage) existingMessage.remove();

    if (username.length >= 3) {
      validationTimeout = setTimeout(() => {
        const validation = checkUsernameAvailability(username);
        const messageElement = document.createElement('div');
        messageElement.className = `username-validation ${
          validation.available ? 'match-success' : 'match-error'
        }`;
        messageElement.textContent = validation.message;
        messageElement.style.fontSize = '0.9rem';
        messageElement.style.marginTop = '0.5rem';
        this.parentElement.appendChild(messageElement);
        validateForm();
      }, 500);
    } else {
      validateForm();
    }
  });
}

// ------------------------
// 6) เอฟเฟกต์ input + keyboard
// ------------------------
function setupInputEffects() {
  const inputs = document.querySelectorAll('.form-input');

  inputs.forEach((input) => {
    input.addEventListener('focus', function () {
      this.parentElement.classList.add('focused');
    });

    input.addEventListener('blur', function () {
      if (!this.value) {
        this.parentElement.classList.remove('focused');
      }
    });

    input.addEventListener('input', function () {
      if (this.value) {
        this.classList.add('has-value');
      } else {
        this.classList.remove('has-value');
      }
    });
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches('.form-input')) {
      const registerBtn = document.getElementById('registerBtn');
      if (registerBtn && !registerBtn.disabled) {
        const form = document.getElementById('registerForm');
        if (form) form.dispatchEvent(new Event('submit'));
      }
    }
  });
}

// ------------------------
// 7) helper message + validate password logic
// ------------------------
function showMessage(message) {
  // ถ้าอยากทำเป็น toast สวย ๆ ค่อยมาแต่งเพิ่มได้
  alert(message);
}

function validatePassword(password, confirmPassword) {
  if (password.length < 8) {
    return 'Password ต้องมีอย่างน้อย 8 ตัวอักษร';
  }
  if (password !== confirmPassword) {
    return 'Password และ Confirm password ต้องตรงกัน';
  }
  return null;
}

// ------------------------
// 8) สมัครสมาชิกจริงกับ Supabase
// ------------------------
async function handleRegistration(e) {
  e.preventDefault();

  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const registerBtn = document.getElementById('registerBtn');

  if (
    !usernameInput ||
    !emailInput ||
    !passwordInput ||
    !confirmPasswordInput ||
    !registerBtn
  ) {
    showMessage('ฟอร์มไม่สมบูรณ์');
    return;
  }

  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();

  if (!username || !email || !password || !confirmPassword) {
    showMessage('กรุณากรอกข้อมูลให้ครบ');
    return;
  }

  const pwdError = validatePassword(password, confirmPassword);
  if (pwdError) {
    showMessage(pwdError);
    return;
  }

  registerBtn.disabled = true;
  const originalText = registerBtn.textContent;
  registerBtn.textContent = 'Creating account...';

  try {
    // 1) สมัครใน Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }, // เก็บไว้ใน user_metadata
      },
    });

    if (error) {
      console.error(error);
      showMessage(error.message || 'สมัครสมาชิกไม่สำเร็จ');
      return;
    }

    // 2) สร้าง row ใน table users (ถ้า policy อนุญาต)
    // ถ้า RLS ไม่ให้ insert ตรงนี้ fail แต่อย่างน้อย auth ก็สำเร็จแล้ว
    try {
      const { error: insertError } = await supabase.from('users').insert({
        username,
        email,
        display_name: username,
        xp: 0,
        role: 'player',
        status: 'active',
      });
      if (insertError) {
        console.warn('Insert users error (ไม่ critical):', insertError);
      }
    } catch (insertErr) {
      console.warn('users insert exception:', insertErr);
    }

    showMessage('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
    window.location.href = 'login.html';
  } catch (err) {
    console.error(err);
    showMessage(err.message || 'เกิดข้อผิดพลาดระหว่างสมัครสมาชิก');
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = originalText;
  }
}

// ------------------------
// 9) Google OAuth สำหรับหน้า Register
// ------------------------
async function signInWithGoogleFromRegister() {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // ถ้าคุณ deploy ที่ secxplore.site แล้วให้ใส่ URL ที่อนุญาตใน Supabase
        redirectTo: `${window.location.origin}/home.html`,
      },
    });

    if (error) {
      console.error(error);
      showMessage(
        'ไม่สามารถเชื่อมต่อ Google ได้: ' + (error.message || 'unknown error'),
      );
    }
  } catch (err) {
    console.error(err);
    showMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ Google');
  }
}

// ให้เรียกจาก HTML: onclick="handleGoogleSignIn()"
window.handleGoogleSignIn = function () {
  signInWithGoogleFromRegister();
};

// ------------------------
// 10) Setup ตอนโหลดหน้า
// ------------------------
function setupFormEvents() {
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');
  const termsCheckbox = document.getElementById('terms');
  const registerForm = document.getElementById('registerForm');

  if (passwordInput) {
    passwordInput.addEventListener('input', function () {
      checkPasswordStrength(this.value);
      checkPasswordMatch();
      validateForm();
    });
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', function () {
      checkPasswordMatch();
      validateForm();
    });
  }

  if (usernameInput) {
    usernameInput.addEventListener('input', validateForm);
  }

  if (emailInput) {
    emailInput.addEventListener('input', validateForm);
  }

  if (termsCheckbox) {
    termsCheckbox.addEventListener('change', validateForm);
  }

  if (registerForm) {
    registerForm.addEventListener('submit', handleRegistration);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  setupNavUser();          // ให้ navbar sync กับสถานะ login ปัจจุบัน
  setupFormEvents();
  setupUsernameValidation();
  setupInputEffects();
  setupKeyboardShortcuts();

  const firstInput = document.querySelector('.form-input');
  if (firstInput) {
    setTimeout(() => {
      firstInput.focus();
    }, 500);
  }

  validateForm();
});
