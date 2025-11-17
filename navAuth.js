// navAuth.js
import { supabase } from './supabaseClient.js';

export async function setupNavUser() {
  const signInBtn = document.getElementById('navSignInBtn');
  const profileBtn = document.getElementById('navProfileBtn');
  const avatarImg = document.getElementById('navAvatar');
  const usernameSpan = document.getElementById('navUsername');

  if (!signInBtn || !profileBtn) {
    return;
  }

  // ดึง user ปัจจุบันจาก Supabase
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    // ยังไม่ล็อกอิน → โชว์ Sign In
    signInBtn.style.display = 'inline-flex';
    profileBtn.style.display = 'none';
    return;
  }

  const authUser = data.user;

  // ค่า default จาก auth
  let displayName =
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    authUser.email?.split('@')[0] ||
    'Player';

  let avatarUrl =
    authUser.user_metadata?.avatar_url ||
    authUser.user_metadata?.picture ||
    null;

  // ลองไปดึงจาก table users อีกที (ถ้าเธอเก็บ avatar ไว้ใน column avatar)
  try {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('display_name, username, avatar')
      .eq('email', authUser.email)
      .maybeSingle();

    if (!profileError && profile) {
      if (profile.display_name) displayName = profile.display_name;
      if (profile.username && !authUser.user_metadata?.full_name) {
        displayName = profile.username;
      }
      if (profile.avatar) avatarUrl = profile.avatar;
    }
  } catch (e) {
    console.warn('load profile for nav error:', e);
  }

  // ถ้าไม่มีรูปเลย ใช้ ui-avatars แทน
  if (!avatarUrl) {
    const encoded = encodeURIComponent(displayName || 'Player');
    avatarUrl = `https://ui-avatars.com/api/?name=${encoded}&size=200&background=00ff88&color=0a0e27&bold=true`;
  }

  // อัปเดต UI
  avatarImg.src = avatarUrl;
  usernameSpan.textContent = displayName;

  signInBtn.style.display = 'none';
  profileBtn.style.display = 'inline-flex';
}
