// login.js
import { supabase } from './supabaseClient.js';
import { setupNavUser } from './navAuth.js';
// ---------- UI helper เล็ก ๆ ----------
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  for (let i = 0; i < 50; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDelay = Math.random() * 15 + 's';
    p.style.animationDuration = (Math.random() * 10 + 10) + 's';
    container.appendChild(p);
  }
}

function showMessage(msg) {
  alert(msg);
}

// ---------- แปลง username → email (ถ้า login เป็น username) ----------
async function resolveLoginToEmail(loginValue) {
  // ถ้ามี @ อยู่แล้ว ถือว่าเป็น email ตรง ๆ
  if (loginValue.includes('@')) return loginValue;

  // ถ้าเป็น username → ไปหา email ใน table users
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('username', loginValue)
    .single();

  if (error || !data) {
    throw new Error('ไม่พบบัญชีผู้ใช้สำหรับ username นี้');
  }
  return data.email;
}

// ---------- Login ด้วย email/username + password ----------
async function handleLogin(e) {
  e.preventDefault();

  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.querySelector('.login-btn');

  if (!loginForm || !usernameInput || !passwordInput || !loginBtn) return;

  const loginValue = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!loginValue || !password) {
    showMessage('กรุณากรอกข้อมูลให้ครบ');
    return;
  }

  loginBtn.disabled = true;
  const originalText = loginBtn.textContent;
  loginBtn.textContent = 'Signing in...';

  try {
    const email = await resolveLoginToEmail(loginValue);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(error);
      showMessage(error.message || 'เข้าสู่ระบบไม่สำเร็จ');
      return;
    }

    // เก็บข้อมูลพื้นฐานไว้ใช้ต่อ (optional)
    const user = data.user;
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ id: user.id, email: user.email }),
    );

    // ไปหน้า main
    window.location.href = 'home.html';
  } catch (err) {
    console.error(err);
    showMessage(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = originalText;
  }
}

// ---------- Google OAuth ----------
async function signInWithGoogle() {
  const googleBtn = document.getElementById('googleSignInBtn');
  if (!googleBtn) return;

  googleBtn.disabled = true;
  const originalHtml = googleBtn.innerHTML;
  googleBtn.innerHTML = 'Connecting to Google...';

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://secxplore.site/home.html',
      },
    });

    if (error) {
      console.error(error);
      showMessage(
        'ไม่สามารถเชื่อมต่อ Google ได้: ' + (error.message || 'unknown error'),
      );
    }
    // Supabase จะ redirect ไป Google ให้เอง
  } catch (err) {
    console.error(err);
    showMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ Google');
  } finally {
    googleBtn.disabled = false;
    googleBtn.innerHTML = originalHtml;
  }
}

// ---------- เช็ค session เดิม ----------
async function checkExistingSession() {
  const { data, error } = await supabase.auth.getSession();
  if (!error && data.session) {
    // ถ้ามี session อยู่แล้ว ส่งไป main ได้เลย
    window.location.href = 'home.html';
  }
}

// ---------- Ready ----------
document.addEventListener('DOMContentLoaded', () => {
  // particles สวย ๆ
  createParticles();

  // bind form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  // bind google
  const googleBtn = document.getElementById('googleSignInBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      signInWithGoogle();
    });
  }

  checkExistingSession();
});
