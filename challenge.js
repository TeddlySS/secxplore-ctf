import { supabase } from './supabaseClient.js';
import { setupNavUser } from './navAuth.js';

async function ensureUserRow() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    // ยังไม่ login → ส่งกลับหน้า login ก็ได้ หรือปล่อยเป็น guest
    // window.location.href = 'login.html';
    return;
  }

  const authUser = authData.user;
  const email = authUser.email;
  const googleId = authUser.id;  // id จาก auth

  // ลองหาจาก table users
  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('user_id')
    .eq('email', email)
    .single();

  if (existing) {
    // มี row อยู่แล้ว ไม่ต้องทำอะไร
    return;
  }

  // ถ้ายังไม่มี → สร้างใหม่
  const username =
    authUser.user_metadata?.username ||
    email.split('@')[0];

  const displayName =
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    username;

  const { error: insertError } = await supabase.from('users').insert({
    username,
    email,
    display_name: displayName,
    xp: 0,
    role: 'player',
    status: 'active',
    google_id: googleId,
    oauth_provider: 'google',
  });

  if (insertError) {
    console.error('Create user row error:', insertError);
  }
}
document.addEventListener('DOMContentLoaded', () => {
    setupNavUser();
    ensureUserRow();
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
        // Hint System & Scoring
        // function toggleHint(hintId) {
        //     const hint = document.getElementById(hintId);
        //     hint.style.display = hint.style.display === 'block' ? 'none' : 'block';
        // }
        // ============================================
// HINT SYSTEM WITH CONFIRMATION & POINT DEDUCTION
// ============================================

        const HINT_PENALTY = 10; // คะแนนที่ถูกหักต่อ hint (ยกเว้นข้อแรก)
        const userProgress = {
            currentPoints: 0,
            solvedChallenges: new Set(),
            hintsUsed: {} // เก็บว่าใช้ hint อะไรไปบ้าง format: {challengeId_hintNumber: true}
        };

        function toggleHint(hintId) {
            const hint = document.getElementById(hintId);
            
            // ถ้า hint เปิดอยู่แล้ว ให้ปิด
            if (hint.style.display === 'block') {
                hint.style.display = 'none';
                return;
            }
            
            // ตรวจสอบว่าใช้ hint นี้ไปแล้วหรือยัง
            if (userProgress.hintsUsed[hintId]) {
                // เคยใช้แล้ว เปิดได้เลยไม่ต้องยืนยัน
                hint.style.display = 'block';
                return;
            }
            
            // หา challenge type และ hint number จาก hintId
            // format: {challengeType}hint{number} เช่น "sqlhint1", "cryptohint2"
            const matches = hintId.match(/^(.+?)hint(\d+)$/);
            if (!matches) {
                hint.style.display = 'block';
                return;
            }
            
            const challengeType = matches[1];
            const hintNumber = parseInt(matches[2]);
            
            // นับว่าใช้ hint ไปกี่ข้อแล้วสำหรับ challenge นี้
            const usedHintsCount = Object.keys(userProgress.hintsUsed)
                .filter(key => key.startsWith(challengeType + 'hint'))
                .length;
            
            // ถ้าเป็น hint ข้อแรก ไม่ต้องหักคะแนน
            if (usedHintsCount === 0) {
                showHintConfirmation(hintId, 0, () => {
                    hint.style.display = 'block';
                    userProgress.hintsUsed[hintId] = true;
                    updatePointsDisplay();
                });
            } else {
                // hint ข้อถัดไป หักคะแนน 10
                showHintConfirmation(hintId, HINT_PENALTY, () => {
                    hint.style.display = 'block';
                    userProgress.hintsUsed[hintId] = true;
                    updatePointsDisplay();
                });
            }
        }

        function showHintConfirmation(hintId, pointDeduction, onConfirm) {
            const confirmDialog = document.createElement('div');
            confirmDialog.className = 'confirm-overlay';
            
            const hintNumber = hintId.match(/hint(\d+)$/)?.[1] || '?';
            
            if (pointDeduction === 0) {
                confirmDialog.innerHTML = `
                    <div class="confirm-dialog">
                        <h3>💡 เปิด Hint ${hintNumber}</h3>
                        <p>นี่เป็น hint ข้อแรก <strong style="color: var(--success);">ไม่มีการหักคะแนน</strong></p>
                        <p style="color: var(--gray); font-size: 0.9rem; margin-top: 0.5rem;">
                            ⚠️ Hint ข้อถัดไปจะหักคะแนน ${HINT_PENALTY} คะแนนต่อครั้ง
                        </p>
                        <div class="confirm-buttons">
                            <button class="btn-cancel" onclick="closeHintConfirmDialog()">
                                ยกเลิก
                            </button>
                            <button class="btn-confirm" onclick="confirmHint()">
                                เปิด Hint
                            </button>
                        </div>
                    </div>
                `;
            } else {
                confirmDialog.innerHTML = `
                    <div class="confirm-dialog">
                        <h3>⚠️ ยืนยันการใช้ Hint ${hintNumber}</h3>
                        <p>การเปิด hint นี้จะหัก <strong style="color: var(--danger);">${pointDeduction} คะแนน</strong></p>
                        <p style="color: var(--warning); font-size: 0.9rem; margin-top: 0.5rem;">
                            คะแนนที่หักจะถูกนำออกจากคะแนนรวมเมื่อส่งคำตอบ
                        </p>
                        <div class="confirm-buttons">
                            <button class="btn-cancel" onclick="closeHintConfirmDialog()">
                                ยกเลิก
                            </button>
                            <button class="btn-confirm" onclick="confirmHint()">
                                ยืนยัน (-${pointDeduction} คะแนน)
                            </button>
                        </div>
                    </div>
                `;
            }
            
            document.body.appendChild(confirmDialog);
            
            // เก็บ callback function
            confirmDialog.dataset.onConfirm = 'hintConfirmCallback';
            window.hintConfirmCallback = onConfirm;
            
            // Animate in
            setTimeout(() => confirmDialog.classList.add('show'), 10);
        }

        function closeHintConfirmDialog() {
            const dialog = document.querySelector('.confirm-overlay');
            if (dialog) {
                dialog.classList.remove('show');
                setTimeout(() => {
                    dialog.remove();
                    delete window.hintConfirmCallback;
                }, 300);
            }
        }

        function confirmHint() {
            if (window.hintConfirmCallback) {
                window.hintConfirmCallback();
                delete window.hintConfirmCallback;
            }
            closeHintConfirmDialog();
        }

        function updatePointsDisplay() {
            // อัพเดท display ของ current points ในทุก challenge
            const pointsElements = document.querySelectorAll('.current-points');
            pointsElements.forEach(el => {
                const challengeType = el.closest('[id*="hint"]')?.id.match(/^(.+?)hint/)?.[1];
                if (challengeType) {
                    const basePoints = getBaseChallengePoints(challengeType);
                    const hintsUsed = Object.keys(userProgress.hintsUsed)
                        .filter(key => key.startsWith(challengeType + 'hint'))
                        .length;
                    // hint ข้อแรกไม่หัก, ข้อถัดไปหัก 10 ต่อข้อ
                    const deduction = Math.max(0, (hintsUsed - 1) * HINT_PENALTY);
                    const currentPoints = Math.max(0, basePoints - deduction);
                    el.textContent = currentPoints;
                }
            });
        }

        function getBaseChallengePoints(challengeType) {
            // คะแนนฐานของแต่ละ challenge
            const pointsMap = {
                'sql': 100,
                'cmd': 250,
                'xss': 350,
                'jwt': 400,
                'multi': 100,
                'xor': 300,
                'rsa': 350,
                'custom': 450,
                'birthday': 100,
                'geo': 250,
                'stego': 400,
                'disk': 500,
                'packet': 150,
                'dns': 300,
                'arp': 400,
                'ssl': 550,
                'asm': 150,
                'crackme': 350,
                'obfuscated': 450,
                'malware': 550,
                'apk': 150,
                'root': 300,
                'sslPin': 400,
                'native': 500
            };
            return pointsMap[challengeType] || 100;
        }

        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => notification.classList.add('show'), 10);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        // อัพเดทฟังก์ชัน checkFlag ให้คำนวณคะแนนหลังหัก hint
        function checkFlag(challengeType, correctFlag, basePoints = 100) {
            const inputId = challengeType + 'Flag';
            const successId = challengeType + 'Success';
            const errorId = challengeType + 'Error';
            
            const userFlag = document.getElementById(inputId)?.value.trim();
            const successMsg = document.getElementById(successId);
            const errorMsg = document.getElementById(errorId);
            
            if (!userFlag) {
                if (errorMsg) {
                    errorMsg.style.display = 'block';
                    errorMsg.textContent = '⚠️ กรุณาใส่ flag';
                    setTimeout(() => errorMsg.style.display = 'none', 3000);
                }
                return;
            }
            
            if (userFlag === correctFlag) {
                // คำนวณคะแนนหลังหัก hint
                const hintsUsedCount = Object.keys(userProgress.hintsUsed)
                    .filter(key => key.startsWith(challengeType + 'hint'))
                    .length;
                // hint ข้อแรกไม่หัก
                const deduction = Math.max(0, (hintsUsedCount - 1) * HINT_PENALTY);
                const finalPoints = Math.max(0, basePoints - deduction);
                
                userProgress.currentPoints += finalPoints;
                userProgress.solvedChallenges.add(challengeType);
                
                if (successMsg) {
                    successMsg.style.display = 'block';
                    if (hintsUsedCount > 0) {
                        successMsg.innerHTML = `🎉 ถูกต้อง! +${finalPoints} คะแนน<br>
                            <small style="color: var(--gray);">(คะแนนเต็ม: ${basePoints}, ใช้ hint: ${hintsUsedCount} ข้อ, หัก: ${deduction} คะแนน)</small>`;
                    } else {
                        successMsg.innerHTML = `🎉 ถูกต้อง! +${finalPoints} คะแนน`;
                    }
                }
                if (errorMsg) errorMsg.style.display = 'none';
                
                showNotification(`Challenge completed! +${finalPoints} points`, 'success');
                updatePointsDisplay();
            } else {
                if (successMsg) successMsg.style.display = 'none';
                if (errorMsg) {
                    errorMsg.style.display = 'block';
                    setTimeout(() => errorMsg.style.display = 'none', 3000);
                }
            }
        }
        
        const challengeData = {
            web: {
                title: '🌐︎ Web Security Challenges',
                challenges: [
                    {
                        name: 'SQL Injection Login Bypass',
                        description: 'ระบบ login มีช่องโหว่ SQL Injection ที่ต้องใช้เทคนิคขั้นสูง bypass ด้วย comment และ logic manipulation',
                        points: 100,
                        difficulty: 'easy',
                        solved: 1234,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'sqlInjection'
                    },
                    {
                        name: 'Command Injection Shell',
                        description: 'Web app ที่รัน system commands โดยไม่ filter input ให้หา flag ที่ซ่อนอยู่ในระบบไฟล์',
                        points: 250,
                        difficulty: 'medium',
                        solved: 867,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'cmdInjection'
                    },
                    {
                        name: 'XSS Cookie Stealer',
                        description: 'หาช่องโหว่ XSS และสร้าง payload ที่ซับซ้อนเพื่อ bypass XSS filter และ steal admin session',
                        points: 350,
                        difficulty: 'hard',
                        solved: 423,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'xssStealer'
                    },
                    {
                        name: 'JWT Token Manipulation',
                        description: 'แก้ไข JWT token โดยใช้ช่องโหว่ Algorithm Confusion เพื่อเข้าถึงข้อมูลของ admin',
                        points: 400,
                        difficulty: 'expert',
                        solved: 189,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'jwtHack'
                    }
                ]
            },
            crypto: {
                title: '🔐︎ Cryptography Challenges',
                challenges: [
                    {
                        name: 'Multi-Layer Cipher',
                        description: 'ข้อความถูกเข้ารหัสด้วย Caesar, Base64, และ ROT13 ซ้อนกัน ต้องถอดรหัสทีละชั้น',
                        points: 100,
                        difficulty: 'easy',
                        solved: 2145,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'multiCipher'
                    },
                    {
                        name: 'XOR Brute Force',
                        description: 'ข้อความถูกเข้ารหัสด้วย XOR single-byte key ให้ brute force หา key และถอดรหัส',
                        points: 300,
                        difficulty: 'medium',
                        solved: 892,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'xorKnown'
                    },
                    {
                        name: 'RSA Small Exponent Attack',
                        description: 'RSA ที่ใช้ e=3 และมี 3 ciphertext ของข้อความเดียวกัน ใช้ Chinese Remainder Theorem โจมตี',
                        points: 350,
                        difficulty: 'hard',
                        solved: 534,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'rsaWeak'
                    },
                    {
                        name: 'Custom Cipher Breaking',
                        description: 'วิเคราะห์และถอดรหัส custom encryption algorithm ที่มีจุดอ่อนในการ implement',
                        points: 450,
                        difficulty: 'expert',
                        solved: 234,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'customCipher'
                    }
                ]
            },
            forensics: {
                title: '🕵︎ Digital Forensics Challenges',
                challenges: [
                    {
                        name: 'Hidden Birthday Message',
                        description: 'รูปภาพ Happy Birthday มีข้อมูลที่ซ่อนอยู่ใน EXIF metadata ให้ใช้เครื่องมือวิเคราะห์หา flag',
                        points: 100,
                        difficulty: 'easy',
                        solved: 1432,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'birthdayExif'
                    },
                    {
                        name: 'Geolocation Mystery',
                        description: 'รูปถ่ายจากตึกมี GPS coordinates ใน metadata ให้หาตำแหน่งและแปลงเป็น MD5 hash',
                        points: 250,
                        difficulty: 'medium',
                        solved: 856,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'geoLocation'
                    },
                    {
                        name: 'Steganography Battlefield',
                        description: 'รูปภาพธงขาวมีไฟล์ซ่อนอยู่ข้างใน ต้องใช้ binwalk extract แล้วถอดรหัส Base64',
                        points: 400,
                        difficulty: 'hard',
                        solved: 543,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'stegoFlag'
                    },
                    {
                        name: 'Disk Analysis',
                        description: 'วิเคราะห์ disk image เพื่อกู้คืนไฟล์ที่ถูกลบและหา flag',
                        points: 500,
                        difficulty: 'expert',
                        solved: 267,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'diskAnalysis'
                    }
                ]
            },
            network: {
                title: '🖧︎ Network Security Challenges',
                challenges: [
                    {
                        name: 'Packet Sniffer Basic',
                        description: 'วิเคราะห์ HTTP packets และหา credentials ที่ส่งแบบ plaintext',
                        points: 150,
                        difficulty: 'easy',
                        solved: 987,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'packetBasic'
                    },
                    {
                        name: 'DNS Tunneling Extract',
                        description: 'Data ถูก exfiltrate ผ่าน DNS queries ให้ decode และ reconstruct ข้อมูลต้นฉบับ',
                        points: 300,
                        difficulty: 'medium',
                        solved: 543,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'dnsTunnel'
                    },
                    {
                        name: 'ARP Spoofing Attack',
                        description: 'จำลอง ARP spoofing attack และ intercept traffic ระหว่าง victim กับ gateway',
                        points: 400,
                        difficulty: 'hard',
                        solved: 312,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'arpSpoof'
                    },
                    {
                        name: 'SSL Strip Analysis',
                        description: 'วิเคราะห์ HTTPS traffic ที่ถูก downgrade เป็น HTTP ด้วย SSL stripping',
                        points: 550,
                        difficulty: 'expert',
                        solved: 178,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'sslStrip'
                    }
                ]
            },
            reverse: {
                title: '⚙︎ Reverse Engineering Challenges',
                challenges: [
                    {
                        name: 'Assembly Password Check',
                        description: 'Program ตรวจสอบ password โดยใช้ assembly code ให้วิเคราะห์ algorithm และหา password',
                        points: 150,
                        difficulty: 'easy',
                        solved: 876,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'asmPassword'
                    },
                    {
                        name: 'Binary Crackme',
                        description: 'Binary ที่ validate serial key ด้วย mathematical operations ให้ reverse algorithm',
                        points: 350,
                        difficulty: 'medium',
                        solved: 432,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'crackme'
                    },
                    {
                        name: 'Obfuscated Code Analysis',
                        description: 'Code ที่ถูก obfuscate ด้วย string encoding และ control flow flattening',
                        points: 450,
                        difficulty: 'hard',
                        solved: 234,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'obfuscated'
                    },
                    {
                        name: 'Malware Behavior Analysis',
                        description: 'วิเคราะห์ malware sample และหา C2 server address ที่ซ่อนอยู่ในโค้ด',
                        points: 550,
                        difficulty: 'expert',
                        solved: 123,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'malwareAnalysis'
                    }
                ]
            },
            mobile: {
                title: '📱︎ Mobile Security Challenges',
                challenges: [
                    {
                        name: 'APK String Analysis',
                        description: 'Decompile APK และหา hardcoded API key ที่ซ่อนอยู่ใน strings',
                        points: 150,
                        difficulty: 'easy',
                        solved: 765,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'apkStrings'
                    },
                    {
                        name: 'Root Detection Bypass',
                        description: 'App ตรวจสอบ root ด้วยหลายวิธี ให้หาทางข้ามการตรวจสอบและเข้าถึง hidden feature',
                        points: 300,
                        difficulty: 'medium',
                        solved: 456,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'rootBypass'
                    },
                    {
                        name: 'SSL Pinning Challenge',
                        description: 'App ใช้ certificate pinning ให้ bypass และ intercept HTTPS traffic',
                        points: 400,
                        difficulty: 'hard',
                        solved: 289,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'sslPinning'
                    },
                    {
                        name: 'Native Library Reverse',
                        description: 'Reverse engineer native SO library ที่มี encryption function ซับซ้อน',
                        points: 500,
                        difficulty: 'expert',
                        solved: 145,
                        status: 'not-started',
                        interactive: true,
                        interactiveId: 'nativeLib'
                    }
                ]
            }
        };

        function openChallengeList(category) {
            const data = challengeData[category];
            if (!data) return;

            const modal = document.getElementById('challengeModal');
            const modalTitle = document.getElementById('modalTitle');
            const challengeList = document.getElementById('challengeList');
            const progressText = document.getElementById('progressText');
            const progressFill = document.getElementById('progressFill');

            modalTitle.textContent = data.title;

            const totalChallenges = data.challenges.length;
            const completedChallenges = data.challenges.filter(c => c.status === 'completed').length;
            const progressPercentage = Math.round((completedChallenges / totalChallenges) * 100);

            progressText.textContent = `${completedChallenges} of ${totalChallenges} completed (${progressPercentage}%)`;
            progressFill.style.width = `${progressPercentage}%`;

            challengeList.innerHTML = data.challenges.map(challenge => {
                let statusBadge = '';
                if (challenge.status === 'completed') {
                    statusBadge = '<div class="status-badge status-completed">COMPLETE</div>';
                } else {
                    statusBadge = '<div class="status-badge status-not-started">NOT STARTED</div>';
                }

                return `
                    <div class="challenge-item ${challenge.status === 'completed' ? 'completed' : ''}" 
                         onclick="${challenge.interactive ? `openInteractiveChallenge('${challenge.interactiveId}')` : ''}">
                        <div class="challenge-header">
                            <div class="challenge-name">${challenge.name}</div>
                            <div class="challenge-right">
                                ${statusBadge}
                                <div class="challenge-points">${challenge.points} pts</div>
                            </div>
                        </div>
                        <div class="challenge-description">${challenge.description}</div>
                        <div class="challenge-meta">
                            <div class="difficulty-badges">
                                <span class="difficulty-badge difficulty-${challenge.difficulty}">${
                                    challenge.difficulty === 'easy' ? 'Easy' : 
                                    challenge.difficulty === 'medium' ? 'Medium' : 
                                    challenge.difficulty === 'hard' ? 'Hard' : 'Expert'
                                }</span>
                            </div>
                            <div class="challenge-stats">
                                <span>👥 ${challenge.solved.toLocaleString()} solved</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            modal.classList.add('active');
        }

        function closeModal() {
            document.getElementById('challengeModal').classList.remove('active');
        }

        const interactiveChallenges = {
            //Web 1
        sqlInjection: {
            content: `
                <h2 style="color: var(--primary); margin-bottom: 1rem;">🌐 SQL Injection Login Bypass</h2>
                
                <div class="analysis-results">
                    <h4>🎯 Mission Objective</h4>
                    <p>ระบบ SecureBank มีช่องโหว่ SQL Injection ที่ซับซ้อน ต้องใช้เทคนิคขั้นสูงในการ bypass</p>
                    <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                        <li>ระบบมี basic filter ที่ block คำสั่ง SQL ทั่วไป</li>
                        <li>ต้องใช้ technique เช่น comment bypass, case manipulation</li>
                        <li>แต่ละ attempt จะมี feedback ช่วยในการ debug</li>
                    </ul>
                </div>

                <div class="hints-section">
                    <div class="hints-warning">⚠️ Each hint costs 10 points</div>
                    <div class="hints-stats">
                        <span>Current Points: <span class="current-points">100</span></span>
                        <span style="margin-left: 1rem;">Attempts: <span id="sqlAttempts">0</span>/10</span>
                    </div>
                </div>

                <div class="sql-interface">
                    <div class="login-panel">
                        <div class="panel-header">
                            <div class="status-indicator"></div>
                            <span>SecureBank Authentication System v3.2</span>
                        </div>
                        
                        <div class="login-form">
                            <div class="form-group">
                                <label>👤 Username</label>
                                <input type="text" id="sqlUser" placeholder="Enter username" 
                                    style="background: rgba(0,0,0,0.6); border: 2px solid var(--primary); 
                                    color: var(--light); padding: 0.8rem; width: 100%; border-radius: 8px;
                                    font-family: 'Courier New', monospace;">
                            </div>
                            
                            <div class="form-group">
                                <label>🔑 Password</label>
                                <input type="password" id="sqlPass" placeholder="Enter password"
                                    style="background: rgba(0,0,0,0.6); border: 2px solid var(--primary); 
                                    color: var(--light); padding: 0.8rem; width: 100%; border-radius: 8px;
                                    font-family: 'Courier New', monospace;">
                            </div>
                            
                            <button onclick="attemptSQLLogin()" class="login-btn">
                                <span>LOGIN</span>
                            </button>
                        </div>
                        
                        <div id="sqlResult" class="result-panel"></div>
                    </div>

                    <div class="debug-panel">
                        <div class="debug-header">🔍 Query Debug Panel</div>
                        <div id="sqlDebug" class="debug-content">
                            <p style="color: var(--gray);">Query information will appear here...</p>
                        </div>
                    </div>

                    <div class="filter-panel">
                        <div class="filter-header">🛡️ Active Security Filters</div>
                        <div class="filter-content">
                            <div class="filter-item">❌ Blocked: <code>OR</code>, <code>AND</code> (case-sensitive)</div>
                            <div class="filter-item">❌ Blocked: <code>--</code> (double dash)</div>
                            <div class="filter-item">❌ Blocked: <code>/*</code> (C-style comment start)</div>
                            <div class="filter-item">✅ Allowed: Single quotes, special chars</div>
                            <div class="filter-item" style="color: var(--warning);">⚠️ Hint: Think about bypass techniques...</div>
                        </div>
                    </div>
                </div>

                <div class="hint-box">
                    <button class="hint-btn" onclick="toggleHint('sqlhint1')">💡 Hint 1: Filter Analysis</button>
                    <div id="sqlhint1" class="hint-content" style="display:none;">
                        Filters block: OR, AND, --, /*<br>
                        But they're case-sensitive!<br>
                        Try: Or, oR, AnD, etc.<br>
                        Or use alternative comment: #
                    </div>

                    <button class="hint-btn" onclick="toggleHint('sqlhint2')">💡 Hint 2: Query Structure</button>
                    <div id="sqlhint2" class="hint-content" style="display:none;">
                        <strong>📋 Step 2: SQL Query Analysis</strong><br>
                        Backend Query Structure:<br>
                        <code>SELECT * FROM users WHERE username='[INPUT]' AND password='[INPUT]'</code><br><br>
                        <strong>🎯 Goal:</strong> Make condition always TRUE<br>
                        <strong>Method:</strong> Inject OR statement to bypass password check<br><br>
                        <strong>Example payload:</strong><br>
                        Username: <code>admin' oR '1'='1' #</code><br>
                        Password: <code>(anything)</code><br><br>
                        This transforms query to:<br>
                        <code>SELECT * FROM users WHERE username='admin' oR '1'='1' #' AND password=...'</code><br>
                        The <code>#</code> comments out the rest!
                    </div>
                    <div id="sqlhint2" class="hint-content" style="display:none;">
                        Query: SELECT * FROM users WHERE username='[INPUT]' AND password='[INPUT]'<br>
                        Goal: Make it return TRUE without knowing password<br>
                        Example: admin' oR '1'='1' # <br>
                        (lowercase 'o' and 'R' bypass filter)
                    </div>

                    <button class="hint-btn" onclick="toggleHint('sqlhint3')">💡 Hint 3: Working Payload</button>
                    <div id="sqlhint3" class="hint-content" style="display:none;">
                        Username: admin' oR '1'='1' #<br>
                        Password: (anything)<br>
                        Or try: admin' || 1=1 #<br>
                        The # comments out the rest of the query
                    </div>
                </div>

                <div class="flag-input">
                    <input type="text" id="sqlFlag" placeholder="secXplore{...}">
                    <button class="submit-btn" onclick="checkFlag('sql', 'secXplore{sql_1nj3ct10n_byp4ss_adm1n}', 100)">Submit Flag</button>
                </div>
                <div class="success-message" id="sqlSuccess">🎉 Correct! Challenge Completed!</div>
                <div class="error-message" id="sqlError">❌ Incorrect flag. Try again!</div>
            `
        },
            //Web 2
            cmdInjection: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">🌐 Command Injection Shell</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>Web application มี ping utility ที่มีช่องโหว่ command injection</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>Inject OS commands เพื่อ explore filesystem</li>
                            <li>หาไฟล์ flag.txt ในระบบ</li>
                            <li>อ่านเนื้อหาไฟล์เพื่อเอา flag</li>
                        </ul>
                    </div>

                    <div class="terminal">
                        <div class="terminal-output">Network Diagnostic Tool
========================

Ping Target: <input type="text" id="cmdInput" placeholder="127.0.0.1" style="background: transparent; border: 1px solid var(--primary); color: var(--light); padding: 0.5rem; width: 300px; border-radius: 5px;">

<button onclick="executeCMD()" style="background: var(--primary); color: var(--dark); border: none; padding: 0.6rem 1.5rem; border-radius: 5px; cursor: pointer; font-weight: bold; margin-top: 0.5rem;">PING</button>

<div id="cmdResult" style="margin-top: 1rem;"></div></div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('cmdhint1')">💡 Hint 1: Command Chaining</button>
                        <div id="cmdhint1" class="hint-content">
                            ใช้ ; && || | เพื่อ chain commands<br>
                            ตัวอย่าง: 127.0.0.1; ls -la
                        </div>

                        <button class="hint-btn" onclick="toggleHint('cmdhint2')">💡 Hint 2: File Discovery</button>
                        <div id="cmdhint2" class="hint-content">
                            ใช้ ls เพื่อดู files<br>
                            ใช้ find เพื่อค้นหาไฟล์: find . -name "*.txt"
                        </div>

                        <button class="hint-btn" onclick="toggleHint('cmdhint3')">💡 Hint 3: Reading Files</button>
                        <div id="cmdhint3" class="hint-content">
                            ใช้ cat เพื่ออ่านไฟล์: cat flag.txt<br>
                            หรือใช้ more, less, head, tail
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="cmdFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('cmd', 'secXplore{c0mm4nd_1nj3ct10n_pwn3d}')">Submit Flag</button>
                    </div>
                    <div class="success-message" id="cmdSuccess">🎉 Correct! You got remote command execution!</div>
                    <div class="error-message" id="cmdError">❌ Incorrect flag. Keep exploring the filesystem!</div>
                `
            },
            //Web 3
            xssStealer: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">🌐 XSS Cookie Stealer</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>Comment system มีช่องโหว่ XSS แต่มี filter ที่ต้อง bypass</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>ทดสอบ XSS payloads ที่ซับซ้อน</li>
                            <li>Bypass XSS filter (blocked: &lt;script&gt;, onerror, onclick)</li>
                            <li>Steal admin cookie เพื่อเข้าถึง admin panel</li>
                        </ul>
                    </div>

                    <div class="terminal">
                        <div class="terminal-output">Comment System
===============

Your Comment: <textarea id="xssInput" style="background: transparent; border: 1px solid var(--primary); color: var(--light); padding: 0.5rem; width: 100%; height: 80px; border-radius: 5px; font-family: monospace;"></textarea>

<button onclick="submitXSS()" style="background: var(--primary); color: var(--dark); border: none; padding: 0.6rem 1.5rem; border-radius: 5px; cursor: pointer; font-weight: bold; margin-top: 0.5rem;">POST COMMENT</button>

<div id="xssResult" style="margin-top: 1rem;"></div>
<div id="xssPreview" style="margin-top: 1rem; padding: 1rem; border: 1px solid var(--secondary); border-radius: 5px; min-height: 50px;"></div></div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('xsshint1')">💡 Hint 1: Filter Bypass</button>
                        <div id="xsshint1" class="hint-content">
                            &lt;script&gt; tag ถูก block แต่ลองใช้ event handlers อื่นๆ<br>
                            ตัวอย่าง: &lt;img src=x onload=alert(1)&gt;
                        </div>

                        <button class="hint-btn" onclick="toggleHint('xsshint2')">💡 Hint 2: Alternative Tags</button>
                        <div id="xsshint2" class="hint-content">
                            ลองใช้ &lt;svg&gt;, &lt;iframe&gt;, &lt;body&gt; tags<br>
                            ตัวอย่าง: &lt;svg/onload=alert(document.cookie)&gt;
                        </div>

                        <button class="hint-btn" onclick="toggleHint('xsshint3')">💡 Hint 3: Cookie Extraction</button>
                        <div id="xsshint3" class="hint-content">
                            ใช้ document.cookie เพื่อเข้าถึง cookies<br>
                            Admin cookie format: admin_session=FLAG_HERE
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="xssFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('xss', 'secXplore{xss_c00k13_st34l3r_pwn}')">Submit Flag</button>
                    </div>
                    <div class="success-message" id="xssSuccess">🎉 Correct! You successfully stole the admin cookie!</div>
                    <div class="error-message" id="xssError">❌ Incorrect flag. Try different XSS payloads!</div>
                `
            },
            //Web 4
            jwtHack: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">🌐 JWT Token Manipulation</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>API ใช้ JWT tokens แต่มีช่องโหว่ algorithm confusion vulnerability</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>วิเคราะห์ JWT token structure</li>
                            <li>เปลี่ยน algorithm จาก RS256 เป็น HS256</li>
                            <li>Modify payload เพื่อเป็น admin และ sign ด้วย public key</li>
                        </ul>
                    </div>

                    <div class="terminal">
                        <div class="terminal-output">JWT Token Inspector
====================

Your Token:
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoidXNlciIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjMzMDI0ODAwfQ.signature

Decoded Header: {"alg":"RS256","typ":"JWT"}
Decoded Payload: {"user":"user","role":"user","iat":1633024800}

<textarea id="jwtInput" placeholder="Paste modified JWT here..." style="background: transparent; border: 1px solid var(--primary); color: var(--light); padding: 0.5rem; width: 100%; height: 100px; border-radius: 5px; font-family: monospace; margin-top: 1rem;"></textarea>

<button onclick="verifyJWT()" style="background: var(--primary); color: var(--dark); border: none; padding: 0.6rem 1.5rem; border-radius: 5px; cursor: pointer; font-weight: bold; margin-top: 0.5rem;">VERIFY TOKEN</button>

<div id="jwtResult" style="margin-top: 1rem;"></div></div>
                    </div>

                    <div class="tool-section">
                        <h4>🔧 JWT Tools</h4>
                        <button class="tool-btn" onclick="decodeJWT()">Decode JWT</button>
                        <button class="tool-btn" onclick="showPublicKey()">Show Public Key</button>
                        <button class="tool-btn" onclick="createHS256()">Create HS256 Token</button>
                        <div id="toolOutput" style="margin-top: 1rem; font-family: monospace; color: var(--secondary);"></div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('jwthint1')">💡 Hint 1: Algorithm Confusion</button>
                        <div id="jwthint1" class="hint-content">
                            RS256 ใช้ private key sign และ public key verify<br>
                            HS256 ใช้ shared secret สำหรับทั้ง sign และ verify<br>
                            ถ้าเปลี่ยนเป็น HS256 server อาจใช้ public key เป็น secret!
                        </div>

                        <button class="hint-btn" onclick="toggleHint('jwthint2')">💡 Hint 2: Payload Modification</button>
                        <div id="jwthint2" class="hint-content">
                            เปลี่ยน "role":"user" เป็น "role":"admin"<br>
                            จากนั้น sign ด้วย public key โดยใช้ HS256 algorithm
                        </div>

                        <button class="hint-btn" onclick="toggleHint('jwthint3')">💡 Hint 3: Token Format</button>
                        <div id="jwthint3" class="hint-content">
                            JWT format: base64(header).base64(payload).base64(signature)<br>
                            ใช้ tools ด้านบนช่วยสร้าง token ที่ถูกต้อง
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="jwtFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('jwt', 'secXplore{jwt_alg0r1thm_c0nfus10n_h4ck}')">Submit Flag</button>
                    </div>
                    <div class="success-message" id="jwtSuccess">🎉 Correct! You exploited the JWT vulnerability!</div>
                    <div class="error-message" id="jwtError">❌ Incorrect flag. Try manipulating the JWT token!</div>
                `
            },
            // ============================================
            // CRYPTO 1: Multi-Layer Cipher (100 points)
            // ============================================
            multiCipher: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">🔐 Multi-Layer Cipher</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission</h4>
                        <p>ถอดรหัสทีละชั้น - คัดลอกผลลัพธ์จากแต่ละขั้นไปขั้นถัดไป</p>
                    </div>

                    <div class="cipher-box">
                        <h4 style="color: var(--purple);">Original Ciphertext:</h4>
                        <div class="cipher-display" onclick="copyToClipboard(this.textContent)">
                        NjYsNzQsNjYsOTEsNzUsNzQsNzQsNzIsNzEsOTgsNzUsNjAsNzYsNjEsOTYsNzUsNjEsNzIsNjAsNzYsNjAsNzIsNjYsODEsODEsODEsNzYsOTYsODAsNzUsNjEsODksNzQ=
                        </div>
                        <small style="color: var(--gray);">💡 คลิกเพื่อคัดลอก</small>
                    </div>

                    <div class="workspace-container">
                        <!-- STEP 1: Base64 Decode -->
                        <div class="workspace-step">
                            <div class="step-header">
                                <span class="step-number">1</span>
                                <h4>Base64 Decode</h4>
                            </div>
                            <div class="step-content">
                                <textarea class="workspace-input" id="multiStep1Input" 
                                    placeholder="วาง ciphertext ที่นี่..."></textarea>
                                <button class="workspace-btn" onclick="processMultiStep1()">
                                    Decode Base64 →
                                </button>
                                <div class="workspace-output" id="multiStep1Output"></div>
                            </div>
                        </div>

                        <!-- STEP 2: Convert ASCII -->
                        <div class="workspace-step">
                            <div class="step-header">
                                <span class="step-number">2</span>
                                <h4>ASCII Conversion</h4>
                            </div>
                            <div class="step-content">
                                <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 0.5rem;">
                                    คัดลอกผลจาก Step 1 มาวางที่นี่
                                </p>
                                <textarea class="workspace-input" id="multiStep2Input" 
                                    placeholder="วาง comma-separated numbers..."></textarea>
                                <button class="workspace-btn" onclick="processMultiStep2()">
                                    Convert to Text →
                                </button>
                                <div class="workspace-output" id="multiStep2Output"></div>
                            </div>
                        </div>

                        <!-- STEP 3: XOR Decrypt -->
                        <div class="workspace-step">
                            <div class="step-header">
                                <span class="step-number">3</span>
                                <h4>XOR Decrypt</h4>
                            </div>
                            <div class="step-content">
                                <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 0.5rem;">
                                    คัดลอกผลจาก Step 2 และใส่ XOR key
                                </p>
                                <textarea class="workspace-input" id="multiStep3Input" 
                                    placeholder="วาง text จาก step 2..."></textarea>
                                <div style="display: flex; gap: 0.5rem; margin: 0.5rem 0;">
                                    <input type="number" id="multiXorKey" placeholder="XOR Key (ลองเลข 1-10)" 
                                        style="flex: 1; padding: 0.8rem; background: rgba(0,0,0,0.5); border: 1px solid var(--primary); 
                                        color: var(--light); border-radius: 5px; font-family: monospace;">
                                </div>
                                <button class="workspace-btn" onclick="processMultiStep3()">
                                    Apply XOR →
                                </button>
                                <div class="workspace-output" id="multiStep3Output"></div>
                            </div>
                        </div>

                        <!-- STEP 4: Caesar Shift -->
                        <div class="workspace-step">
                            <div class="step-header">
                                <span class="step-number">4</span>
                                <h4>Caesar Decrypt</h4>
                            </div>
                            <div class="step-content">
                                <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 0.5rem;">
                                    คัดลอกผลจาก Step 3 และใส่ Caesar shift
                                </p>
                                <textarea class="workspace-input" id="multiStep4Input" 
                                    placeholder="วาง text จาก step 3..."></textarea>
                                <div style="display: flex; gap: 0.5rem; margin: 0.5rem 0;">
                                    <input type="number" id="multiCaesarShift" placeholder="Shift (-25 to 25)" 
                                        style="flex: 1; padding: 0.8rem; background: rgba(0,0,0,0.5); border: 1px solid var(--primary); 
                                        color: var(--light); border-radius: 5px; font-family: monospace;">
                                </div>
                                <button class="workspace-btn" onclick="processMultiStep4()">
                                    Apply Caesar Shift →
                                </button>
                                <div class="workspace-output" id="multiStep4Output"></div>
                            </div>
                        </div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('multihint1')">💡 Hint 1</button>
                        <div id="multihint1" class="hint-content" style="display:none;">
                            ขั้นตอนคร่าวๆ:<br>
                            1. Base64 decode → ได้ตัวเลข<br>
                            2. แปลง ASCII → ได้ text<br>
                            3. XOR → ลองค่า key<br>
                            4. Caesar → ลอง shift
                        </div>

                        <button class="hint-btn" onclick="toggleHint('multihint2')">💡 Hint 2</button>
                        <div id="multihint2" class="hint-content" style="display:none;">
                            XOR Key = 7<br>
                            Caesar Shift = -5<br><br>
                            ทำทีละขั้น คัดลอกผลไปใส่ขั้นถัดไป
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="multiFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('multi', 'secXplore{h4rd_m0d3_3ncrypt10n}', 100)">Submit Flag</button>
                    </div>
                    <div class="success-message" id="multiSuccess">✓ Correct!</div>
                    <div class="error-message" id="multiError">✗ Wrong!</div>
                `
            },

            // ============================================
            // CRYPTO 2: XOR Key Recovery (300 points)
            // ============================================
            xorKnown: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">⚡ XOR Key Recovery</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission</h4>
                        <p>ใช้ known plaintext หา XOR key แบบ manual calculation</p>
                    </div>

                    <div class="cipher-box">
                        <h4 style="color: var(--purple);">Challenge Data:</h4>
                        <div class="cipher-display" onclick="copyToClipboard(this.textContent)">
                        1a0b455e332f5c0c1a13445a3722510b1b0a445b372f5c0d1a13445e372e510a1a0b455b332f5c0c1a13445a3722510b1b0a
                        </div>
                        <p style="margin-top: 1rem; color: var(--warning);">
                            <strong>Known:</strong> ข้อความเริ่มต้นด้วย "secX"
                        </p>
                    </div>

                    <div class="workspace-container">
                        <!-- STEP 1: Manual Key Extraction -->
                        <div class="workspace-step">
                            <div class="step-header">
                                <span class="step-number">1</span>
                                <h4>Extract Key Bytes</h4>
                            </div>
                            <div class="step-content">
                                <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 1rem;">
                                    คำนวณ: key = plaintext ⊕ ciphertext<br>
                                    's' (0x73) ⊕ 0x1a = ?<br>
                                    'e' (0x65) ⊕ 0x0b = ?<br>
                                    'c' (0x63) ⊕ 0x45 = ?<br>
                                    'X' (0x58) ⊕ 0x5e = ?
                                </p>
                                
                                <div class="xor-calculator">
                                    <div class="calc-row">
                                        <label>Hex 1:</label>
                                        <input type="text" id="xorHex1" placeholder="73" maxlength="2">
                                        <span>⊕</span>
                                        <label>Hex 2:</label>
                                        <input type="text" id="xorHex2" placeholder="1a" maxlength="2">
                                        <button onclick="calculateXor()">Calculate</button>
                                    </div>
                                    <div class="calc-result" id="xorResult"></div>
                                </div>

                                <p style="color: var(--secondary); margin-top: 1rem; font-size: 0.9rem;">
                                    คำนวณครบ 4 bytes แล้วรวมเป็น key (8 hex chars)
                                </p>
                                
                                <input type="text" id="extractedKey" placeholder="ใส่ key ที่คำนวณได้ (8 hex chars)" 
                                    style="width: 100%; padding: 0.8rem; background: rgba(0,0,0,0.5); border: 1px solid var(--primary); 
                                    color: var(--light); border-radius: 5px; font-family: monospace; margin-top: 0.5rem;">
                            </div>
                        </div>

                        <!-- STEP 2: Verify & Decrypt -->
                        <div class="workspace-step">
                            <div class="step-header">
                                <span class="step-number">2</span>
                                <h4>Decrypt with Key</h4>
                            </div>
                            <div class="step-content">
                                <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 0.5rem;">
                                    ใส่ key จาก Step 1 เพื่อถอดรหัส
                                </p>
                                <input type="text" id="xorDecryptKey" placeholder="Key (8 hex chars)" 
                                    style="width: 100%; padding: 0.8rem; background: rgba(0,0,0,0.5); border: 1px solid var(--primary); 
                                    color: var(--light); border-radius: 5px; font-family: monospace; margin-bottom: 0.5rem;">
                                <button class="workspace-btn" onclick="decryptWithXorKey()">
                                    Decrypt Full Message →
                                </button>
                                <div class="workspace-output" id="xorDecryptOutput"></div>
                            </div>
                        </div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('xorhint1')">💡 Hint 1</button>
                        <div id="xorhint1" class="hint-content" style="display:none;">
                            ASCII hex values:<br>
                            's' = 73, 'e' = 65, 'c' = 63, 'X' = 58<br><br>
                            Ciphertext first 4 bytes: 1a 0b 45 5e<br><br>
                            ใช้ XOR calculator คำนวณทีละ byte
                        </div>

                        <button class="hint-btn" onclick="toggleHint('xorhint2')">💡 Hint 2</button>
                        <div id="xorhint2" class="hint-content" style="display:none;">
                            Calculation:<br>
                            73 ⊕ 1a = 69 = 'i'<br>
                            65 ⊕ 0b = 6e = 'n'<br>
                            63 ⊕ 45 = 26<br>
                            58 ⊕ 5e = 06<br><br>
                            Key = 696e2606
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="xorFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('xor', 'secXplore{x0r_4byt3_k3y_cr4ck}', 300)">Submit Flag</button>
                    </div>
                    <div class="success-message" id="xorSuccess">✓ Correct!</div>
                    <div class="error-message" id="xorError">✗ Wrong!</div>
                `
            },

            // ============================================
            // CRYPTO 3: RSA Factorization (350 points)
            // ============================================
            rsaWeak: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">🔐 RSA Factorization</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission</h4>
                        <p>Factor n manually, คำนวณ private key, ถอดรหัสทีละ block</p>
                    </div>

                    <div class="cipher-box">
                        <h4 style="color: var(--purple);">RSA Parameters:</h4>
                        <p><strong>n:</strong> 15043</p>
                        <p><strong>e:</strong> 3</p>
                        <p style="margin-top: 1rem;"><strong>Ciphertext blocks:</strong></p>
                        <div class="cipher-display" style="font-size: 0.85rem;">
                        [6837, 5451, 1728, 11552, 9261, 8000, 5451, 12167, 5451, 2744, 1331, 6837, 2197, 9261, 1728, 11552, 9261, 8000, 11552, 216]
                        </div>
                    </div>

                    <div class="workspace-container">
                        <!-- STEP 1: Factorization -->
                        <div class="workspace-step">
                            <div class="step-header">
                                <span class="step-number">1</span>
                                <h4>Factor n = p × q</h4>
                            </div>
                            <div class="step-content">
                                <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 1rem;">
                                    ทดสอบหาร 15043 ด้วย prime numbers
                                </p>
                                
                                <div class="prime-tester">
                                    <div class="calc-row">
                                        <label>Test Prime:</label>
                                        <input type="number" id="primeDivisor" placeholder="103, 107, 109...">
                                        <button onclick="testPrimeFactor()">Test Division</button>
                                    </div>
                                    <div class="calc-result" id="primeResult"></div>
                                </div>

                                <div style="margin-top: 1rem;">
                                    <label style="display: block; margin-bottom: 0.5rem;">เมื่อหาเจอแล้ว ใส่ p และ q:</label>
                                    <div style="display: flex; gap: 0.5rem;">
                                        <input type="number" id="rsaP" placeholder="p" 
                                            style="flex: 1; padding: 0.8rem; background: rgba(0,0,0,0.5); border: 1px solid var(--primary); 
                                            color: var(--light); border-radius: 5px;">
                                        <input type="number" id="rsaQ" placeholder="q" 
                                            style="flex: 1; padding: 0.8rem; background: rgba(0,0,0,0.5); border: 1px solid var(--primary); 
                                            color: var(--light); border-radius: 5px;">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- STEP 2: Calculate d -->
                        <div class="workspace-step">
                            <div class="step-header">
                                <span class="step-number">2</span>
                                <h4>Calculate Private Key (d)</h4>
                            </div>
                            <div class="step-content">
                                <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 0.5rem;">
                                    ใส่ p และ q จาก Step 1
                                </p>
                                <button class="workspace-btn" onclick="calculateRsaPrivateKey()">
                                    Calculate φ(n) and d →
                                </button>
                                <div class="workspace-output" id="rsaCalcOutput"></div>
                            </div>
                        </div>

                        <!-- STEP 3: Decrypt Blocks -->
                        <div class="workspace-step">
                            <div class="step-header">
                                <span class="step-number">3</span>
                                <h4>Decrypt Message</h4>
                            </div>
                            <div class="step-content">
                                <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 0.5rem;">
                                    ใส่ d จาก Step 2
                                </p>
                                <input type="number" id="rsaPrivateD" placeholder="Private key d" 
                                    style="width: 100%; padding: 0.8rem; background: rgba(0,0,0,0.5); border: 1px solid var(--primary); 
                                    color: var(--light); border-radius: 5px; margin-bottom: 0.5rem;">
                                <button class="workspace-btn" onclick="decryptRsaMessage()">
                                    Decrypt All Blocks →
                                </button>
                                <div class="workspace-output" id="rsaDecryptOutput"></div>
                            </div>
                        </div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('rsahint1')">💡 Hint 1</button>
                        <div id="rsahint1" class="hint-content" style="display:none;">
                            ลอง primes ระหว่าง 100-150:<br>
                            103, 107, 109, 113, 127, 131, 137, 139, 149...<br><br>
                            ใช้ Test Division เพื่อหาว่าตัวไหนหาร 15043 ลงตัว
                        </div>

                        <button class="hint-btn" onclick="toggleHint('rsahint2')">💡 Hint 2</button>
                        <div id="rsahint2" class="hint-content" style="display:none;">
                            15043 = 103 × 146<br>
                            แต่ 146 ไม่ใช่ prime (146 = 2 × 73)<br><br>
                            ลองหา prime pairs อื่น<br>
                            p × q = 15043
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="rsaFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('rsa', 'secXplore{f4ct0r_15043_pwn3d}', 350)">Submit Flag</button>
                    </div>
                    <div class="success-message" id="rsaSuccess">✓ Correct!</div>
                    <div class="error-message" id="rsaError">✗ Wrong!</div>
                `
            },

            // ============================================
            // CRYPTO 4: Pattern Analysis (450 points)
            // ============================================
            customCipher: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">🔐 Multi-Layer Pattern</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission</h4>
                        <p>วิเคราะห์และถอดรหัส - ทำทีละ layer จนได้ flag</p>
                    </div>

                    <div class="cipher-box">
                        <h4 style="color: var(--purple);">Ciphertext:</h4>
                        <div class="cipher-display" onclick="copyToClipboard(this.textContent)">
                        VjJoclZXNHdYRVlsYm10clkycGtjVnB0ZUhOa1ZscHhZa1pLZDFacVRtRmhWVFZHVkRCV1IyRXhjRlpXYlRWS1lUQXhlRnBGV2xKaFZGWldWRzE0VDFkV1ZuVldhMUpPVmtad2VWUlVTa3BOYkVVMFYxaHdjRlZVTURFPQ==
                        </div>
                    </div>

                    <div class="workspace-container">
                        <!-- Layer Decoder -->
                        <div class="workspace-step">
                            <div class="step-header">
                                <span class="step-number">🔄</span>
                                <h4>Layer-by-Layer Decoder</h4>
                            </div>
                            <div class="step-content">
                                <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 1rem;">
                                    วาง ciphertext แล้วเลือก operation ที่คิดว่าถูก<br>
                                    คัดลอกผลลัพธ์ไป decode ต่อจนได้ plaintext
                                </p>
                                
                                <textarea class="workspace-input" id="customLayerInput" 
                                    placeholder="วาง ciphertext หรือผลลัพธ์จาก layer ก่อนหน้า..."></textarea>
                                
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin: 1rem 0;">
                                    <button class="operation-btn" onclick="applyOperation('base64')">Base64 Decode</button>
                                    <button class="operation-btn" onclick="applyOperation('rot13')">ROT13</button>
                                    <button class="operation-btn" onclick="applyOperation('reverse')">Reverse</button>
                                    <button class="operation-btn" onclick="applyOperation('hex')">Hex Decode</button>
                                    <button class="operation-btn" onclick="applyOperation('upper')">To Uppercase</button>
                                    <button class="operation-btn" onclick="applyOperation('lower')">To Lowercase</button>
                                </div>

                                <div style="margin: 1rem 0;">
                                    <label style="display: block; margin-bottom: 0.5rem;">Caesar Shift:</label>
                                    <div style="display: flex; gap: 0.5rem;">
                                        <input type="number" id="customShiftValue" placeholder="Shift value" 
                                            style="flex: 1; padding: 0.8rem; background: rgba(0,0,0,0.5); border: 1px solid var(--primary); 
                                            color: var(--light); border-radius: 5px;">
                                        <button class="operation-btn" onclick="applyOperation('caesar')">Apply Caesar</button>
                                    </div>
                                </div>

                                <div style="margin: 1rem 0;">
                                    <label style="display: block; margin-bottom: 0.5rem;">Vigenere Key:</label>
                                    <div style="display: flex; gap: 0.5rem;">
                                        <input type="text" id="customVigenereKey" placeholder="Key" 
                                            style="flex: 1; padding: 0.8rem; background: rgba(0,0,0,0.5); border: 1px solid var(--primary); 
                                            color: var(--light); border-radius: 5px;">
                                        <button class="operation-btn" onclick="applyOperation('vigenere')">Apply Vigenere</button>
                                    </div>
                                </div>

                                <div class="workspace-output" id="customLayerOutput"></div>
                                
                                <div style="margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.3); border-radius: 5px;">
                                    <strong>Layer History:</strong>
                                    <div id="layerHistory" style="font-size: 0.85rem; color: var(--gray); margin-top: 0.5rem;">
                                        (operations จะถูกบันทึกที่นี่)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('customhint1')">💡 Hint 1</button>
                        <div id="customhint1" class="hint-content" style="display:none;">
                            เริ่มจากการดู pattern ของ ciphertext:<br>
                            • ลงท้ายด้วย =<br>
                            • ใช้ A-Z, a-z, 0-9<br>
                            • ความยาวเป็นพหุคูณของ 4<br><br>
                            นี่คือ encoding ประเภทไหน?
                        </div>

                        <button class="hint-btn" onclick="toggleHint('customhint2')">💡 Hint 2</button>
                        <div id="customhint2" class="hint-content" style="display:none;">
                            Base64 มีหลาย layer<br>
                            ลอง decode Base64 ซ้ำๆ จนกว่าจะไม่ใช่ Base64 อีก<br><br>
                            หลังจากนั้นจะเหลือ cipher อีกประเภท
                        </div>

                        <button class="hint-btn" onclick="toggleHint('customhint3')">💡 Hint 3</button>
                        <div id="customhint3" class="hint-content" style="display:none;">
                            Process:<br>
                            1. Base64 decode (3 times)<br>
                            2. ได้ Vigenere ciphertext<br>
                            3. Vigenere key มี 4 ตัวอักษร<br>
                            4. หลัง Vigenere ต้อง Caesar อีกรอบ<br><br>
                            ลองหา key และ shift ที่ให้ผลเป็น "secXplore{...}"
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="customFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('custom', 'secXplore{m4ny_l4y3rs_6r34k4bl3}', 450)">Submit Flag</button>
                    </div>
                    <div class="success-message" id="customSuccess">✓ Correct!</div>
                    <div class="error-message" id="customError">✗ Wrong!</div>
                `
            },
            //Forensic 1
            birthdayExif: {
                content: `
                <h2 style="color: var(--primary); margin-bottom: 1rem;">🔍 Hidden Birthday Message</h2>
                <div class="analysis-results">
                <h4>🎯 Mission Objective</h4>
                <p>รูปภาพ Happy Birthday 20th มี flag ซ่อนอยู่ใน EXIF metadata</p>
                <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                <li>ใช้ exiftool commands เพื่อวิเคราะห์ metadata</li>
                <li>ค้นหา hidden fields และ custom tags</li>
                <li>Extract flag จากข้อมูลที่ซ่อนอยู่</li>
                </ul>
                </div>
                <div style="text-align: center; margin: 2rem 0;">
                <img src="assets/images/birthday.png"
                            style="max-width: 100%; border: 2px solid var(--primary); border-radius: 10px;"
                            alt="Birthday Image">
                <p style="margin-top: 0.5rem; color: var(--gray); font-size: 0.9rem;">
                            📥 birthday.jpg (245 KB)
                </p>
                </div>
                <div class="terminal">
                <div class="terminal-output" id="exifTerminal">$ file birthday.jpg
                birthday.jpg: JPEG image data
                Available commands:
                - exiftool birthday.jpg (basic metadata)
                - exiftool -a birthday.jpg (show all tags)
                - exiftool -G birthday.jpg (show group names)
                - exiftool -Copyright birthday.jpg (specific tag)
                - strings birthday.jpg | grep -i "sec" (search strings)</div>
                <div class="terminal-input-wrapper">
                <span class="terminal-prompt">$</span>
                <input type="text" class="terminal-input" id="exifCommand"
                                autocomplete="off" spellcheck="false"
                                onkeypress="if(event.key==='Enter') executeEXIFCommand()">
                </div>
                </div>
                <div class="hint-box">
                <button class="hint-btn" onclick="toggleHint('birthdayhint1')">💡 Hint 1: Basic Metadata</button>
                <div id="birthdayhint1" class="hint-content" style="display:none;">
                            Start with: exiftool birthday.jpg<br>
                            Look for unusual or custom fields<br>
                            Not all metadata is visible by default
                </div>
                <button class="hint-btn" onclick="toggleHint('birthdayhint2')">💡 Hint 2: Advanced Options</button>
                <div id="birthdayhint2" class="hint-content" style="display:none;">
                            Try: exiftool -a birthday.jpg (show ALL tags)<br>
                            Or: exiftool -Copyright birthday.jpg<br>
                            Copyright field might contain hidden data
                </div>
                <button class="hint-btn" onclick="toggleHint('birthdayhint3')">💡 Hint 3: String Search</button>
                <div id="birthdayhint3" class="hint-content" style="display:none;">
                            Use: strings birthday.jpg | grep -i "sec"<br>
                            Or check specific field: exiftool -Copyright birthday.jpg<br>
                            Flag format: secXplore{...}
                </div>
                </div>
                <div class="flag-input">
                <input type="text" id="birthdayFlag" placeholder="secXplore{...}">
                <button class="submit-btn" onclick="checkFlag('birthday', 'secXplore{ex1f_m3t4d4t4_h1dd3n_1nf0}', 100)">Submit Flag</button>
                </div>
                <div class="success-message" id="birthdaySuccess">🎉 Correct!</div>
                <div class="error-message" id="birthdayError">❌ Incorrect flag.</div>
                `
                },
            //Forensic 2
            geoLocation: {

                content: `
                <h2 style="color: var(--primary); margin-bottom: 1rem;">🔍 Geolocation Mystery</h2>
                <div class="analysis-results">
                <h4>🎯 Mission Objective</h4>
                <p>รูปถ่ายจากตึกมี GPS coordinates ซ่อนอยู่ใน EXIF metadata</p>
                <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                <li>Extract GPS data ด้วย exiftool commands</li>
                <li>Convert coordinates และหาชื่อสถานที่</li>
                <li>Hash ชื่อสถานที่ด้วย MD5 เป็น flag</li>
                </ul>
                </div>
                <div style="text-align: center; margin: 2rem 0;">
                <img src="assets/images/Where_is_it.jpg" 

                                style="max-width: 100%; border: 2px solid var(--primary); border-radius: 10px;"

                                alt="Building View">
                <p style="margin-top: 0.5rem; color: var(--gray); font-size: 0.9rem;">

                                📥 Where_is_it.jpg (512 KB)
                </p>
                </div>
                <div class="terminal">
                <div class="terminal-output" id="geoTerminal">$ file Where_is_it.jpg

                Where_is_it.jpg: JPEG image data

                Available commands:

                - exiftool -GPS* Where_is_it.jpg (GPS data only)

                - exiftool -n -GPS* Where_is_it.jpg (numeric GPS)

                - exiftool -c "%.6f" -GPS* Where_is_it.jpg (decimal format)

                - echo -n "text" | md5sum (hash text)</div>
                <div class="terminal-input-wrapper">
                <span class="terminal-prompt">$</span>
                <input type="text" class="terminal-input" id="geoCommand" 

                                    autocomplete="off" spellcheck="false"

                                    onkeypress="if(event.key==='Enter') executeGeoCommand()">
                </div>
                </div>
                <div class="hint-box">
                <button class="hint-btn" onclick="toggleHint('geohint1')">💡 Hint 1: Extract GPS</button>
                <div id="geohint1" class="hint-content" style="display:none;">

                                Use: exiftool -GPS* Where_is_it.jpg<br>

                                Get decimal format: exiftool -n -GPS* Where_is_it.jpg<br>

                                Or: exiftool -c "%.6f" -GPS* Where_is_it.jpg
                </div>
                <button class="hint-btn" onclick="toggleHint('geohint2')">💡 Hint 2: Find Location</button>
                <div id="geohint2" class="hint-content" style="display:none;">

                                Coordinates: 13.8115, 100.5629<br>

                                Search in Google Maps: "13.8115, 100.5629"<br>

                                It's a university in Bangkok, Thailand
                </div>
                <button class="hint-btn" onclick="toggleHint('geohint3')">💡 Hint 3: Hash Location</button>
                <div id="geohint3" class="hint-content" style="display:none;">

                                Location: Bangkok University<br>

                                Command: echo -n "bangkokuniversity" | md5sum<br>

                                (lowercase, no spaces)<br>

                                Format: secXplore{md5hash}
                </div>
                </div>
                <div class="flag-input">
                <input type="text" id="geoFlag" placeholder="secXplore{...}">
                <button class="submit-btn" onclick="checkFlag('geo', 'secXplore{4a8d8c8e8f3b5d7c9e2a1f6b4c8d3e9a}', 100)">Submit Flag</button>
                </div>
                <div class="success-message" id="geoSuccess">🎉 Correct!</div>
                <div class="error-message" id="geoError">❌ Incorrect flag.</div>

                    `

                },
            //Forensic 3
            stegoFlag: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">🔍 Steganography Battlefield</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>รูปภาพธงขาวบนกองทรายมีไฟล์ซ่อนอยู่ข้างใน (Multi-layer steganography)</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>Step 1: ใช้ binwalk หาไฟล์ที่ฝังอยู่</li>
                            <li>Step 2: Extract ZIP file ที่พบ</li>
                            <li>Step 3: Crack ZIP password</li>
                            <li>Step 4: Decode Base64 เพื่อได้ flag</li>
                        </ul>
                    </div>
                    <div style="text-align: center; margin: 2rem 0;">
                        <img src="assets/images/white_flag.png" 
                            style="max-width: 100%; border: 2px solid var(--primary); border-radius: 10px;">
                    </div>

                    <div class="terminal">
                        <div class="terminal-output" id="stegoTerminal">$ file white_flag.jpg
            white_flag.jpg: JPEG image data

            Available commands:
            - binwalk white_flag.jpg (scan for embedded files)
            - binwalk -e white_flag.jpg (extract files)
            - dd if=white_flag.jpg of=hidden.zip bs=1 skip=OFFSET (manual extract)
            - unzip -P password hidden.zip (unzip with password)
            - base64 -d file.txt (decode base64)</div>
                        <div class="terminal-input-wrapper">
                            <span class="terminal-prompt">$</span>
                            <input type="text" class="terminal-input" id="stegoCommand" 
                                autocomplete="off" spellcheck="false"
                                onkeypress="if(event.key==='Enter') executeStegoCommand()">
                        </div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('stegohint1')">💡 Hint 1: Find Hidden Files</button>
                        <div id="stegohint1" class="hint-content" style="display:none;">
                            Command: binwalk white_flag.jpg<br>
                            Look for ZIP signature (PK) after JPEG end (FFD9)<br>
                            ZIP starts at offset 8187
                        </div>

                        <button class="hint-btn" onclick="toggleHint('stegohint2')">💡 Hint 2: ZIP Password</button>
                        <div id="stegohint2" class="hint-content" style="display:none;">
                            Extract: dd if=white_flag.jpg of=hidden.zip bs=1 skip=8187<br>
                            Password hint: What's in the image?<br>
                            Try: unzip -P whiteflag hidden.zip
                        </div>

                        <button class="hint-btn" onclick="toggleHint('stegohint3')">💡 Hint 3: Decode Base64</button>
                        <div id="stegohint3" class="hint-content" style="display:none;">
                            File contains: c2VjWHBsb3Jle2IxbndAbGtfc3QzZzBfYjRzZTY0X2gxZGQzbn0=<br>
                            Decode: echo "..." | base64 -d<br>
                            Or use online Base64 decoder
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="stegoFlagInput" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('stego', 'secXplore{b1nw@lk_st3g0_b4se64_h1dd3n}', 100)">Submit Flag</button>
                    </div>
                    <div class="success-message" id="stegoSuccess">🎉 Correct!</div>
                    <div class="error-message" id="stegoError">❌ Incorrect flag.</div>
                `
            },
            //Forensic 4
            diskAnalysis: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">🔍 Disk Image Analysis</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>Disk image จากคอมพิวเตอร์ผู้ต้องสงสัยมีไฟล์ที่ถูกลบแล้ว ต้อง recover และวิเคราะห์</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>Step 1: Mount disk image และวิเคราะห์ filesystem</li>
                            <li>Step 2: ใช้ forensics tools หาไฟล์ที่ถูกลบ</li>
                            <li>Step 3: Recover deleted file และ analyze content</li>
                            <li>Step 4: Carve hidden data จาก slack space</li>
                            <li>Step 5: Extract flag จาก recovered data</li>
                        </ul>
                    </div>

                    <div class="analysis-results" style="margin: 2rem 0;">
                        <h4>💾 Disk Image File</h4>
                        <p style="font-family: monospace; color: var(--secondary);">
                            📥 evidence.dd (500 MB)<br>
                            Type: Raw Disk Image | Filesystem: ext4 | Deleted files: 3
                        </p>
                    </div>

                    <div class="terminal">
                        <div class="terminal-output" id="diskTerminal">$ file evidence.dd
            evidence.dd: Linux rev 1.0 ext4 filesystem data

            Available commands:
            - mmls evidence.dd (view partition table)
            - fls -r -d evidence.dd (list deleted files)
            - icat evidence.dd [inode] (recover file by inode)
            - xxd evidence.dd | grep -i "sec" (hex dump search)
            - strings evidence.dd | grep -i "flag" (string search)
            - foremost -i evidence.dd -o output (file carving)</div>
                        <div class="terminal-input-wrapper">
                            <span class="terminal-prompt">$</span>
                            <input type="text" class="terminal-input" id="diskCommand" 
                                autocomplete="off" spellcheck="false"
                                onkeypress="if(event.key==='Enter') executeDiskCommand()">
                        </div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('diskhint1')">💡 Hint 1: List Deleted Files</button>
                        <div id="diskhint1" class="hint-content" style="display:none;">
                            Use: fls -r -d evidence.dd<br>
                            Look for deleted files marked with * asterisk<br>
                            Note the inode numbers (like 12345)
                        </div>

                        <button class="hint-btn" onclick="toggleHint('diskhint2')">💡 Hint 2: Recover Files</button>
                        <div id="diskhint2" class="hint-content" style="display:none;">
                            Found deleted file: * 12847: secret_data.txt<br>
                            Recover: icat evidence.dd 12847 > recovered.txt<br>
                            View content: cat recovered.txt
                        </div>

                        <button class="hint-btn" onclick="toggleHint('diskhint3')">💡 Hint 3: File Carving</button>
                        <div id="diskhint3" class="hint-content" style="display:none;">
                            File contains partial data, use file carving<br>
                            Command: foremost -i evidence.dd -o output<br>
                            Or search hex: xxd evidence.dd | grep -A 5 "secret"<br>
                            Flag hidden in slack space at offset 0x1F4B2C
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="diskFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('disk', 'secXplore{d1sk_f0r3ns1cs_d3l3t3d_r3c0v3ry}', 100)">Submit Flag</button>
                    </div>
                    <div class="success-message" id="diskSuccess">🎉 Correct!</div>
                    <div class="error-message" id="diskError">❌ Incorrect flag.</div>
                `
            },
            //Network 1
            packetBasic: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">📡 Packet Sniffer Basic</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>วิเคราะห์ HTTP packets และหา credentials ที่ส่งแบบ plaintext</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>ใช้ tcpdump/tshark capture และวิเคราะห์ traffic</li>
                            <li>Filter HTTP POST requests</li>
                            <li>Extract username และ password จาก form data</li>
                        </ul>
                    </div>

                    <div class="terminal">
                        <div class="terminal-output" id="packetTerminal">$ tcpdump -r capture.pcap
            Reading from capture.pcap

            Available commands:
            - tcpdump -r capture.pcap (view packets)
            - tcpdump -r capture.pcap -A (show ASCII content)
            - tshark -r capture.pcap -Y "http" (filter HTTP)
            - tshark -r capture.pcap -Y "http.request.method == POST" (POST only)
            - tshark -r capture.pcap -Y "http.request.method == POST" -T fields -e http.file_data (extract POST data)</div>
                        <div class="terminal-input-wrapper">
                            <span class="terminal-prompt">$</span>
                            <input type="text" class="terminal-input" id="packetCommand" 
                                autocomplete="off" spellcheck="false"
                                onkeypress="if(event.key==='Enter') executePacketCommand()">
                        </div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('packethint1')">💡 Hint 1: Filter HTTP Traffic</button>
                        <div id="packethint1" class="hint-content" style="display:none;">
                            Command: tshark -r capture.pcap -Y "http"<br>
                            Look for POST requests to /api/login<br>
                            HTTP sends data in plaintext
                        </div>

                        <button class="hint-btn" onclick="toggleHint('packethint2')">💡 Hint 2: Extract POST Data</button>
                        <div id="packethint2" class="hint-content" style="display:none;">
                            Command: tshark -r capture.pcap -Y "http.request.method == POST"<br>
                            Or: tcpdump -r capture.pcap -A | grep "password"<br>
                            Form data format: username=...&password=...
                        </div>

                        <button class="hint-btn" onclick="toggleHint('packethint3')">💡 Hint 3: Flag Location</button>
                        <div id="packethint3" class="hint-content" style="display:none;">
                            POST /api/login contains:<br>
                            username=admin&password=secXplore{p4ck3t_sn1ff3r_pl41nt3xt}<br>
                            Flag is in password field
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="packetFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('packet', 'secXplore{p4ck3t_sn1ff3r_pl41nt3xt}', 100)">Submit Flag</button>
                    </div>
                    <div class="success-message" id="packetSuccess">🎉 Correct!</div>
                    <div class="error-message" id="packetError">❌ Incorrect flag.</div>
                `
            },
            //Network 2
            dnsTunnel: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">📡 DNS Tunneling Extract</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>Data ถูก exfiltrate ผ่าน DNS queries ให้ decode และ reconstruct ข้อมูล</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>วิเคราะห์ DNS queries ที่ผิดปกติ</li>
                            <li>Extract data จาก subdomain names</li>
                            <li>Decode และ reconstruct flag</li>
                        </ul>
                    </div>
                    <div class="terminal">
                        <div class="terminal-output" id="dnsTerminal">$ tshark -r traffic.pcap -Y "dns"
            Analyzing DNS traffic...

            Available commands:
            - tshark -r traffic.pcap -Y "dns" (filter DNS)
            - tshark -r traffic.pcap -Y "dns.qry.name" -T fields -e dns.qry.name (extract query names)
            - tshark -r traffic.pcap -Y "dns.qry.name contains exfil" (suspicious domains)
            - echo "base64string" | base64 -d (decode Base64)</div>
                        <div class="terminal-input-wrapper">
                            <span class="terminal-prompt">$</span>
                            <input type="text" class="terminal-input" id="dnsCommand" 
                                autocomplete="off" spellcheck="false"
                                onkeypress="if(event.key==='Enter') executeDNSCommand()">
                        </div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('dnshint1')">💡 Hint 1: DNS Tunneling Pattern</button>
                        <div id="dnshint1" class="hint-content" style="display:none;">
                            Command: tshark -r traffic.pcap -Y "dns.qry.name contains exfil"<br>
                            Look for *.exfil.malicious.com domains<br>
                            Subdomains contain encoded data
                        </div>

                        <button class="hint-btn" onclick="toggleHint('dnshint2')">💡 Hint 2: Extract Subdomains</button>
                        <div id="dnshint2" class="hint-content" style="display:none;">
                            Found queries: NzM2NTYzNTg3MDcw.exfil.malicious.com<br>
                            C52U3MzFkNm5z.exfil.malicious.com<br>
                            Data before .exfil is Base64 encoded
                        </div>

                        <button class="hint-btn" onclick="toggleHint('dnshint3')">💡 Hint 3: Reconstruct Data</button>
                        <div id="dnshint3" class="hint-content" style="display:none;">
                            Combine all subdomains in order<br>
                            Full Base64: NzM2NTYzNTg3MDcwQzUyVTMzFkNm5zNzRfTTNoZk1sd3c3cjR0M3BufQ==<br>
                            Decode: echo "..." | base64 -d
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="dnsFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('dns', 'secXplore{dns_7unn3l_3xf1l7r4t30n}', 100)">Submit Flag</button>
                    </div>
                    <div class="success-message" id="dnsSuccess">🎉 Correct!</div>
                    <div class="error-message" id="dnsError">❌ Incorrect flag.</div>
                `
            },
            //Network 3
            arpSpoof: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">📡 ARP Spoofing Attack</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>จำลอง ARP spoofing attack และ intercept traffic ระหว่าง victim กับ gateway</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>ส่ง ARP replies ปลอมเพื่อ poison ARP cache</li>
                            <li>Intercept traffic ที่ผ่าน attacker machine</li>
                            <li>Extract sensitive data จาก intercepted traffic</li>
                        </ul>
                    </div>
                    <div class="terminal">
                        <div class="terminal-output" id="arpTerminal">$ arp -a
            Gateway (192.168.1.1) at aa:bb:cc:dd:ee:ff
            Victim (192.168.1.100) at 11:22:33:44:55:66

            Available commands:
            - arp -a (view ARP table)
            - arpspoof -i eth0 -t 192.168.1.100 192.168.1.1 (poison victim)
            - tcpdump -i eth0 -n (capture traffic)
            - echo 1 > /proc/sys/net/ipv4/ip_forward (enable forwarding)</div>
                        <div class="terminal-input-wrapper">
                            <span class="terminal-prompt">$</span>
                            <input type="text" class="terminal-input" id="arpCommand" 
                                autocomplete="off" spellcheck="false"
                                onkeypress="if(event.key==='Enter') executeARPCommand()">
                        </div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('arphint1')">💡 Hint 1: ARP Poisoning</button>
                        <div id="arphint1" class="hint-content" style="display:none;">
                            Command: arpspoof -i eth0 -t 192.168.1.100 192.168.1.1<br>
                            This tells victim that attacker MAC is gateway<br>
                            Need to poison both directions
                        </div>

                        <button class="hint-btn" onclick="toggleHint('arphint2')">💡 Hint 2: Enable Forwarding</button>
                        <div id="arphint2" class="hint-content" style="display:none;">
                            Command: echo 1 > /proc/sys/net/ipv4/ip_forward<br>
                            This forwards packets to real gateway<br>
                            Creates transparent MITM attack
                        </div>

                        <button class="hint-btn" onclick="toggleHint('arphint3')">💡 Hint 3: Capture Traffic</button>
                        <div id="arphint3" class="hint-content" style="display:none;">
                            Command: tcpdump -i eth0 -A | grep "password"<br>
                            Intercepted POST data contains flag<br>
                            password=secXplore{4rp_sp00f_m1tm_4tt4ck}
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="arpFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('arp', 'secXplore{4rp_sp00f_m1tm_4tt4ck}', 100)">Submit Flag</button>
                    </div>
                    <div class="success-message" id="arpSuccess">🎉 Correct!</div>
                    <div class="error-message" id="arpError">❌ Incorrect flag.</div>
                `
            },
            //Network 4
            sslStrip: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">📡 SSL Strip Analysis</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>วิเคราะห์ HTTPS traffic ที่ถูก downgrade เป็น HTTP ด้วย SSL stripping</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>เข้าใจวิธีการทำงานของ SSL stripping attack</li>
                            <li>วิเคราะห์ traffic ที่ถูก downgrade</li>
                            <li>Extract credentials จาก stripped HTTPS connection</li>
                        </ul>
                    </div>

                    <div class="hints-section">
                        <div class="hints-warning">⚠️ Each hint costs 10 points</div>
                        <div class="hints-stats">
                            <span>Current Points: <span class="current-points">100</span></span>
                        </div>
                    </div>

                    <div class="terminal">
                        <div class="terminal-output" id="sslTerminal">$ tshark -r stripped.pcap
            Analyzing SSL stripped traffic...

            Available commands:
            - tshark -r stripped.pcap -Y "http" (filter HTTP)
            - tshark -r stripped.pcap -Y "http.request.uri contains login" (login requests)
            - tshark -r stripped.pcap -T fields -e http.file_data (extract POST data)
            - grep -a "password" stripped.pcap (search for password)</div>
                        <div class="terminal-input-wrapper">
                            <span class="terminal-prompt">$</span>
                            <input type="text" class="terminal-input" id="sslCommand" 
                                autocomplete="off" spellcheck="false"
                                onkeypress="if(event.key==='Enter') executeSSLCommand()">
                        </div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('sslhint1')">💡 Hint 1: SSL Stripping Concept</button>
                        <div id="sslhint1" class="hint-content" style="display:none;">
                            Attacker intercepts HTTPS requests<br>
                            Forwards as HTTPS to server<br>
                            Returns HTTP to victim (downgrade)<br>
                            Victim thinks using HTTP normally
                        </div>

                        <button class="hint-btn" onclick="toggleHint('sslhint2')">💡 Hint 2: Find Stripped Traffic</button>
                        <div id="sslhint2" class="hint-content" style="display:none;">
                            Command: tshark -r stripped.pcap -Y "http.request.uri contains login"<br>
                            Look for POST to http://secure-bank.com<br>
                            Should be https:// but downgraded to http://
                        </div>

                        <button class="hint-btn" onclick="toggleHint('sslhint3')">💡 Hint 3: Extract Credentials</button>
                        <div id="sslhint3" class="hint-content" style="display:none;">
                            Command: tshark -r stripped.pcap -T fields -e http.file_data<br>
                            JSON data: {"username":"admin","password":"secXplore{ssl_str1p_d0wngr4d3_pwn}"}<br>
                            Flag in password field
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="sslFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('ssl', 'secXplore{ssl_str1p_d0wngr4d3_pwn}', 100)">Submit Flag</button>
                    </div>
                    <div class="success-message" id="sslSuccess">🎉 Correct!</div>
                    <div class="error-message" id="sslError">❌ Incorrect flag.</div>
                `
            },
            //Reversing 1
            asmPassword: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">⚙️ Assembly Password Check</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>Program ตรวจสอบ password โดยใช้ assembly code ให้วิเคราะห์ algorithm</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>อ่านและเข้าใจ assembly code</li>
                            <li>วิเคราะห์ password validation algorithm</li>
                            <li>หา password ที่ถูกต้อง</li>
                        </ul>
                    </div>

                    <div class="terminal">
                        <div class="terminal-output">Assembly Code Analysis
        =======================

        check_password:
            push    rbp
            mov     rbp, rsp
            mov     QWORD PTR [rbp-8], rdi
            mov     rax, QWORD PTR [rbp-8]
            movzx   eax, BYTE PTR [rax]
            cmp     al, 115              ; 's'
            jne     .L2
            mov     rax, QWORD PTR [rbp-8]
            add     rax, 1
            movzx   eax, BYTE PTR [rax]
            cmp     al, 101              ; 'e'
            jne     .L2
            mov     rax, QWORD PTR [rbp-8]
            add     rax, 2
            movzx   eax, BYTE PTR [rax]
            cmp     al, 99               ; 'c'
            jne     .L2
            ; ... more comparisons ...
            mov     eax, 1
            jmp     .L3
        .L2:
            mov     eax, 0
        .L3:
            pop     rbp
            ret</div>
                    </div>

                    <div class="tool-section">
                        <h4>🔧 Assembly Analysis Tools</h4>
                        <div style="margin: 1rem 0;">
                            <input type="text" id="asmInput" placeholder="Enter password..." style="background: rgba(0,0,0,0.8); border: 1px solid var(--primary); color: var(--light); padding: 0.5rem; width: 300px; border-radius: 5px; font-family: monospace;">
                            <button class="tool-btn" onclick="testPassword()">Test Password</button>
                        </div>
                        <button class="tool-btn" onclick="analyzeASM()">Analyze Assembly</button>
                        <button class="tool-btn" onclick="showCharComparisons()">Show Character Comparisons</button>
                        <button class="tool-btn" onclick="reconstructPassword()">Reconstruct Password</button>
                        <div id="asmOutput" style="margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.8); border: 1px solid var(--secondary); border-radius: 5px; font-family: monospace; max-height: 300px; overflow-y: auto;"></div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('asmhint1')">💡 Hint 1: Assembly Basics</button>
                        <div id="asmhint1" class="hint-content">
                            คำสั่งสำคัญ:<br>
                            - cmp al, 115: เปรียบเทียบ character กับ 115 (ASCII 's')<br>
                            - jne .L2: jump ถ้าไม่เท่ากัน (password ผิด)<br>
                            - add rax, 1: ไปยัง character ถัดไป<br>
                            Code กำลังเปรียบเทียบแต่ละตัวอักษร
                        </div>

                        <button class="hint-btn" onclick="toggleHint('asmhint2')">💡 Hint 2: Character Analysis</button>
                        <div id="asmhint2" class="hint-content">
                            ASCII values ที่เปรียบเทียบ:<br>
                            Position 0: 115 = 's'<br>
                            Position 1: 101 = 'e'<br>
                            Position 2: 99 = 'c'<br>
                            ใช้ ASCII table convert ทุกค่า
                        </div>

                        <button class="hint-btn" onclick="toggleHint('asmhint3')">💡 Hint 3: Password Pattern</button>
                        <div id="asmhint3" class="hint-content">
                            Password เริ่มต้นด้วย "sec"<br>
                            ตามด้วย pattern ที่คุ้นเคย<br>
                            Format: secXplore{...}
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="asmFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('asm', 'secXplore{4sm_r3v3rs3_3ng1n33r}')">Submit Flag</button>
                    </div>
                    <div class="success-message" id="asmSuccess">🎉 Correct! You reversed the assembly code!</div>
                    <div class="error-message" id="asmError">❌ Incorrect flag. Analyze each character comparison!</div>
                `
            },
            //Reversing 2
            crackme: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">⚙️ Binary Crackme</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>Binary ที่ validate serial key ด้วย mathematical operations</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>วิเคราะห์ serial key validation algorithm</li>
                            <li>Reverse mathematical operations</li>
                            <li>Generate valid serial key</li>
                        </ul>
                    </div>

                    <div class="terminal">
                        <div class="terminal-output">$ ./crackme
        Enter Serial Key: _

        Validation Algorithm (Pseudocode):
        ==================================
        input_key = user_input()
        checksum = 0

        for i in range(len(input_key)):
            checksum += ord(input_key[i]) * (i + 1)
            
        checksum = checksum ^ 0x1337
        checksum = (checksum * 13) % 65536

        if checksum == 0xB33F:
            print("Valid! Flag: secXplore{" + input_key + "}")
        else:
            print("Invalid serial key!")
            
        Required checksum: 0xB33F (45887)</div>
                    </div>

                    <div class="tool-section">
                        <h4>🔧 Crackme Tools</h4>
                        <div style="margin: 1rem 0;">
                            <input type="text" id="serialInput" placeholder="Enter serial key..." style="background: rgba(0,0,0,0.8); border: 1px solid var(--primary); color: var(--light); padding: 0.5rem; width: 300px; border-radius: 5px; font-family: monospace;">
                            <button class="tool-btn" onclick="validateSerial()">Validate Serial</button>
                        </div>
                        <button class="tool-btn" onclick="reverseAlgorithm()">Reverse Algorithm</button>
                        <button class="tool-btn" onclick="bruteforceSerial()">Bruteforce Serial</button>
                        <button class="tool-btn" onclick="generateSerial()">Generate Valid Serial</button>
                        <div id="crackmeOutput" style="margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.8); border: 1px solid var(--secondary); border-radius: 5px; font-family: monospace; max-height: 300px; overflow-y: auto;"></div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('crackmehint1')">💡 Hint 1: Algorithm Breakdown</button>
                        <div id="crackmehint1" class="hint-content">
                            Algorithm ทำงาน 4 ขั้นตอน:<br>
                            1. คำนวณ weighted sum ของ ASCII values<br>
                            2. XOR กับ 0x1337<br>
                            3. คูณด้วย 13 และ modulo 65536<br>
                            4. เปรียบเทียบกับ 0xB33F
                        </div>

                        <button class="hint-btn" onclick="toggleHint('crackmehint2')">💡 Hint 2: Reverse Process</button>
                        <div id="crackmehint2" class="hint-content">
                            เพื่อหา serial key ต้อง reverse:<br>
                            1. หา x ที่ (x * 13) % 65536 = 0xB33F<br>
                            2. XOR ผลลัพธ์กับ 0x1337<br>
                            3. หา string ที่ให้ weighted sum นี้<br>
                            หรือใช้ bruteforce กับ string สั้นๆ
                        </div>

                        <button class="hint-btn" onclick="toggleHint('crackmehint3')">💡 Hint 3: Serial Pattern</button>
                        <div id="crackmehint3" class="hint-content">
                            Serial key มีความยาว 6-8 characters<br>
                            ประกอบด้วย lowercase letters และตัวเลข<br>
                            ตัวอย่าง: cr4ckm3
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="crackmeFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('crackme', 'secXplore{cr4ckm3_s0lv3d}')">Submit Flag</button>
                    </div>
                    <div class="success-message" id="crackmeSuccess">🎉 Correct! You cracked the serial key validation!</div>
                    <div class="error-message" id="crackmeError">❌ Incorrect flag. Reverse the validation algorithm!</div>
                `
            },
            //Reversing 3
            obfuscated: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">⚙️ Obfuscated Code Analysis</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>Code ที่ถูก obfuscate ด้วย string encoding และ control flow flattening</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>De-obfuscate encoded strings</li>
                            <li>วิเคราะห์ control flow ที่ซับซ้อน</li>
                            <li>หา hidden flag ในโค้ด</li>
                        </ul>
                    </div>

                    <div class="terminal">
                        <div class="terminal-output">Obfuscated JavaScript Code:
        ============================

        var _0x4a2b = [
            '\\x73\\x65\\x63\\x58\\x70\\x6c\\x6f\\x72\\x65',
            '\\x6f\\x62\\x66\\x75\\x73\\x63\\x34\\x74\\x33\\x64',
            '\\x63\\x30\\x64\\x33\\x5f\\x64\\x33\\x6f\\x62\\x66'
        ];

        function check(_0x1a2b3c) {
            var _0x2c4d = _0x4a2b[0x0];
            var _0x3e5f = _0x4a2b[0x1];
            var _0x4f6a = _0x4a2b[0x2];
            
            if (_0x1a2b3c === _0x2c4d + '{' + _0x3e5f + '_' + _0x4f6a + '}') {
                return true;
            }
            return false;
        }</div>
                    </div>

                    <div class="tool-section">
                        <h4>🔧 Deobfuscation Tools</h4>
                        <button class="tool-btn" onclick="decodeHexStrings()">Decode Hex Strings</button>
                        <button class="tool-btn" onclick="simplifyCode()">Simplify Code</button>
                        <button class="tool-btn" onclick="reconstructFlag()">Reconstruct Flag</button>
                        <div id="obfuscatedOutput" style="margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.8); border: 1px solid var(--secondary); border-radius: 5px; font-family: monospace; max-height: 300px; overflow-y: auto;"></div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('obfhint1')">💡 Hint 1: String Encoding</button>
                        <div id="obfhint1" class="hint-content">
                            Strings ถูก encode เป็น hex escapes:<br>
                            \\x73\\x65\\x63 = "sec"<br>
                            แต่ละ \\xNN เป็น ASCII character<br>
                            Convert hex เป็น ASCII
                        </div>

                        <button class="hint-btn" onclick="toggleHint('obfhint2')">💡 Hint 2: Array Decoding</button>
                        <div id="obfhint2" class="hint-content">
                            _0x4a2b[0x0] = first string<br>
                            _0x4a2b[0x1] = second string<br>
                            _0x4a2b[0x2] = third string<br>
                            Decode แต่ละ string แล้วรวมกัน
                        </div>

                        <button class="hint-btn" onclick="toggleHint('obfhint3')">💡 Hint 3: Flag Construction</button>
                        <div id="obfhint3" class="hint-content">
                            Flag = _0x2c4d + '{' + _0x3e5f + '_' + _0x4f6a + '}'<br>
                            แทนค่า:<br>
                            "secXplore" + "{" + "obfusc4t3d" + "_" + "c0d3_d3obf" + "}"
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="obfuscatedFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('obfuscated', 'secXplore{obfusc4t3d_c0d3_d3obf}')">Submit Flag</button>
                    </div>
                    <div class="success-message" id="obfuscatedSuccess">🎉 Correct! You deobfuscated the code!</div>
                    <div class="error-message" id="obfuscatedError">❌ Incorrect flag. Decode all hex strings!</div>
                `
            },
            //Reversing 4
                malwareAnalysis: {
                        content: `
                            <h2 style="color: var(--primary); margin-bottom: 1rem;">⚙️ Malware Behavior Analysis</h2>
                            
                            <div class="analysis-results">
                                <h4>🎯 Mission Objective</h4>
                                <p>วิเคราะห์ malware sample และหา C2 server address ที่ซ่อนอยู่</p>
                                <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                                    <li>วิเคราะห์ malware behavior และ network activity</li>
                                    <li>Extract encrypted C2 server address</li>
                                    <li>Decode และ reconstruct flag</li>
                                </ul>
                            </div>

                            <div class="terminal">
                                <div class="terminal-output">Malware Analysis Report
                ========================

                File: suspicious.exe
                MD5: 5d41402abc4b2a76b9719d911017c592
                SHA256: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c

                Behavior Analysis:
                - Creates registry key: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run
                - Connects to encrypted IP address
                - Encrypts files with AES-256
                - Exfiltrates data via HTTP POST

                Encrypted C2 Server (Base64):
                MTkyLjE2OC4xLjUwOjQ0NDM=

                Additional encrypted data found in strings:
                c2VjWHBsb3Jle201bHczcjNfYzJfc2VydjNyX2YwdW5kfQ==</div>
                            </div>

                            <div class="tool-section">
                                <h4>🔧 Malware Analysis Tools</h4>
                                <button class="tool-btn" onclick="analyzeStrings()">Extract Strings</button>
                                <button class="tool-btn" onclick="decodeC2()">Decode C2 Address</button>
                                <button class="tool-btn" onclick="analyzeBehavior()">Analyze Behavior</button>
                                <button class="tool-btn" onclick="extractFlag()">Extract Flag</button>
                                <div id="malwareOutput" style="margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.8); border: 1px solid var(--secondary); border-radius: 5px; font-family: monospace; max-height: 300px; overflow-y: auto;"></div>
                            </div>

                            <div class="hint-box">
                                <button class="hint-btn" onclick="toggleHint('malwarehint1')">💡 Hint 1: C2 Communication</button>
                                <div id="malwarehint1" class="hint-content">
                                    C2 (Command & Control) server address ถูกเข้ารหัส<br>
                                    Base64 encoded: MTkyLjE2OC4xLjUwOjQ0NDM=<br>
                                    Decode เพื่อหา IP address และ port
                                </div>

                                <button class="hint-btn" onclick="toggleHint('malwarehint2')">💡 Hint 2: String Analysis</button>
                                <div id="malwarehint2" class="hint-content">
                                    ใน malware มี string ที่ encode ด้วย Base64:<br>
                                    c2VjWHBsb3Jle201bHczcjNfYzJfc2VydjNyX2YwdW5kfQ==<br>
                                    String นี้อาจเป็น flag
                                </div>

                                <button class="hint-btn" onclick="toggleHint('malwarehint3')">💡 Hint 3: Base64 Decoding</button>
                                <div id="malwarehint3" class="hint-content">
                                    Decode Base64 string:<br>
                                    c2VjWHBsb3Jle201bHczcjNfYzJfc2VydjNyX2YwdW5kfQ==<br>
                                    จะได้ flag ที่ต้องการ
                                </div>
                            </div>

                            <div class="flag-input">
                                <input type="text" id="malwareFlag" placeholder="secXplore{...}">
                                <button class="submit-btn" onclick="checkFlag('malware', 'secXplore{m4lw3r3_c2_s3rv3r_f0und}')">Submit Flag</button>
                            </div>
                            <div class="success-message" id="malwareSuccess">🎉 Correct! You analyzed the malware successfully!</div>
                            <div class="error-message" id="malwareError">❌ Incorrect flag. Decode the Base64 string!</div>
                        `
                    },
            //Moblile 1
            apkStrings: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">📱 APK String Analysis</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>Decompile APK และหา hardcoded API key ที่ซ่อนอยู่ใน strings</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>ใช้ apktool/jadx decompile APK file</li>
                            <li>วิเคราะห์ Java source code และ strings.xml</li>
                            <li>ค้นหา hardcoded secrets และ API keys</li>
                        </ul>
                    </div>
                    <div class="analysis-results" style="margin: 2rem 0;">
                        <h4>📦 APK File</h4>
                        <p style="font-family: monospace; color: var(--secondary);">
                            📥 com.secureapp.banking.apk (15.2 MB)<br>
                            Package: com.secureapp.banking | Version: 2.4.1
                        </p>
                    </div>

                    <div class="terminal">
                        <div class="terminal-output" id="apkTerminal">$ file com.secureapp.banking.apk
            com.secureapp.banking.apk: Zip archive data, Android application package

            Available commands:
            - apktool d com.secureapp.banking.apk (decompile APK)
            - jadx -d output com.secureapp.banking.apk (decompile to Java)
            - grep -r "API_KEY" output/ (search for API keys)
            - cat output/res/values/strings.xml (view strings)
            - find output/ -name "*.java" -exec grep -l "secret" {} \; (find files with secrets)</div>
                        <div class="terminal-input-wrapper">
                            <span class="terminal-prompt">$</span>
                            <input type="text" class="terminal-input" id="apkCommand" 
                                autocomplete="off" spellcheck="false"
                                onkeypress="if(event.key==='Enter') executeAPKCommand()">
                        </div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('apkhint1')">💡 Hint 1: Decompile APK</button>
                        <div id="apkhint1" class="hint-content" style="display:none;">
                            Use: jadx -d output com.secureapp.banking.apk<br>
                            This extracts Java source code<br>
                            Look in output/sources/com/secureapp/banking/
                        </div>

                        <button class="hint-btn" onclick="toggleHint('apkhint2')">💡 Hint 2: Search for Keys</button>
                        <div id="apkhint2" class="hint-content" style="display:none;">
                            Command: grep -r "API_KEY" output/<br>
                            Or: cat output/sources/com/secureapp/banking/Constants.java<br>
                            API keys often in Constants or Config files
                        </div>

                        <button class="hint-btn" onclick="toggleHint('apkhint3')">💡 Hint 3: Decode Base64</button>
                        <div id="apkhint3" class="hint-content" style="display:none;">
                            Found: API_KEY = "c2VjWHBsb3Jle2gwcmRjMGQzZF9hcGlfa2V5X2YwdW5kfQ=="<br>
                            Decode: echo "..." | base64 -d<br>
                            Flag format: secXplore{...}
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="apkFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('apk', 'secXplore{h0rdc0d3d_api_k3y_f0und}', 100)">Submit Flag</button>
                    </div>
                    <div class="success-message" id="apkSuccess">🎉 Correct!</div>
                    <div class="error-message" id="apkError">❌ Incorrect flag.</div>
                `
            },
            //Mobile 2
            rootBypass: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">📱 Root Detection Bypass</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>App ตรวจสอบ root ด้วยหลายวิธี ให้หาทางข้ามการตรวจสอบ</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>วิเคราะห์ root detection methods</li>
                            <li>Patch APK หรือใช้ Frida hook</li>
                            <li>เข้าถึง hidden feature ที่ต้องการ non-root device</li>
                        </ul>
                    </div>

                    <div class="hints-section">
                        <div class="hints-warning">⚠️ Each hint costs 10 points</div>
                        <div class="hints-stats">
                            <span>Current Points: <span class="current-points">100</span></span>
                        </div>
                    </div>

                    <div class="terminal">
                        <div class="terminal-output" id="rootTerminal">$ jadx -d output com.secureapp.apk
            Decompiling...

            Available commands:
            - cat output/sources/.../MainActivity.java (view code)
            - grep -r "isRooted" output/ (find root checks)
            - apktool d com.secureapp.apk (decompile to smali)
            - frida -U -f com.secureapp -l bypass.js (hook with Frida)
            - adb shell "su -c 'which su'" (check for su binary)</div>
                        <div class="terminal-input-wrapper">
                            <span class="terminal-prompt">$</span>
                            <input type="text" class="terminal-input" id="rootCommand" 
                                autocomplete="off" spellcheck="false"
                                onkeypress="if(event.key==='Enter') executeRootCommand()">
                        </div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('roothint1')">💡 Hint 1: Find Root Checks</button>
                        <div id="roothint1" class="hint-content" style="display:none;">
                            Command: grep -r "isRooted" output/<br>
                            Found in: MainActivity.java<br>
                            Method checks for: su binary, test-keys, root apps
                        </div>

                        <button class="hint-btn" onclick="toggleHint('roothint2')">💡 Hint 2: Frida Hook</button>
                        <div id="roothint2" class="hint-content" style="display:none;">
                            Create bypass.js with hook for isRooted()<br>
                            Command: frida -U -f com.secureapp -l bypass.js<br>
                            Hook returns false to bypass checks
                        </div>

                        <button class="hint-btn" onclick="toggleHint('roothint3')">💡 Hint 3: Access Hidden Feature</button>
                        <div id="roothint3" class="hint-content" style="display:none;">
                            After bypass, Admin Panel button appears<br>
                            Click to reveal flag<br>
                            Flag: secXplore{r00t_d3t3ct_byp4ss3d}
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="rootFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('root', 'secXplore{r00t_d3t3ct_byp4ss3d}', 100)">Submit Flag</button>
                    </div>
                    <div class="success-message" id="rootSuccess">🎉 Correct!</div>
                    <div class="error-message" id="rootError">❌ Incorrect flag.</div>
                `
            },
            //Mobile 3
            sslPinning: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">📱 SSL Pinning Challenge</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>App ใช้ certificate pinning ให้ bypass และ intercept HTTPS traffic</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>เข้าใจ SSL/TLS certificate pinning</li>
                            <li>Bypass pinning ด้วย Frida หรือ objection</li>
                            <li>Intercept HTTPS traffic ด้วย Burp Suite</li>
                        </ul>
                    </div>
                    <div class="terminal">
                        <div class="terminal-output" id="sslPinTerminal">$ grep -r "CertificatePinner" output/
            Found SSL pinning implementation in NetworkModule.java

            Available commands:
            - cat output/sources/.../NetworkModule.java (view pinning code)
            - frida -U -f com.app -l ssl-bypass.js (bypass SSL pinning)
            - objection -g com.app explore (interactive bypass)
            - adb shell "settings put global http_proxy 192.168.1.100:8080" (set proxy)</div>
                        <div class="terminal-input-wrapper">
                            <span class="terminal-prompt">$</span>
                            <input type="text" class="terminal-input" id="sslPinCommand" 
                                autocomplete="off" spellcheck="false"
                                onkeypress="if(event.key==='Enter') executeSSLPinCommand()">
                        </div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('sslpinhint1')">💡 Hint 1: Analyze Pinning</button>
                        <div id="sslpinhint1" class="hint-content" style="display:none;">
                            Command: cat output/sources/.../NetworkModule.java<br>
                            Uses OkHttp3 CertificatePinner<br>
                            Pins certificate for api.secureapp.com
                        </div>

                        <button class="hint-btn" onclick="toggleHint('sslpinhint2')">💡 Hint 2: Frida Bypass</button>
                        <div id="sslpinhint2" class="hint-content" style="display:none;">
                            Command: frida -U -f com.app -l ssl-bypass.js<br>
                            Hook CertificatePinner.check() to return void<br>
                            All certificates now accepted
                        </div>

                        <button class="hint-btn" onclick="toggleHint('sslpinhint3')">💡 Hint 3: Intercept Traffic</button>
                        <div id="sslpinhint3" class="hint-content" style="display:none;">
                            Setup Burp: adb shell settings put global http_proxy 127.0.0.1:8080<br>
                            POST /v1/auth contains device_id field<br>
                            Flag: secXplore{ssl_p1nn1ng_byp4ss3d}
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="sslPinFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('sslPin', 'secXplore{ssl_p1nn1ng_byp4ss3d}', 100)">Submit Flag</button>
                    </div>
                    <div class="success-message" id="sslPinSuccess">🎉 Correct!</div>
                    <div class="error-message" id="sslPinError">❌ Incorrect flag.</div>
                `
            },
            //Mobile 4
            nativeLib: {
                content: `
                    <h2 style="color: var(--primary); margin-bottom: 1rem;">📱 Native Library Reverse</h2>
                    
                    <div class="analysis-results">
                        <h4>🎯 Mission Objective</h4>
                        <p>Reverse engineer native SO library ที่มี encryption function</p>
                        <ul style="margin: 0.5rem 0; padding-left: 2rem;">
                            <li>Extract .so library จาก APK</li>
                            <li>Analyze ARM assembly code</li>
                            <li>Reverse encryption algorithm และ extract flag</li>
                        </ul>
                    </div>

                    <div class="terminal">
                        <div class="terminal-output" id="nativeTerminal">$ unzip -l com.app.apk | grep ".so"
            1234567  lib/armeabi-v7a/libnative-lib.so
            2345678  lib/arm64-v8a/libnative-lib.so

            Available commands:
            - unzip com.app.apk lib/armeabi-v7a/libnative-lib.so (extract SO)
            - file libnative-lib.so (check file type)
            - objdump -d libnative-lib.so (disassemble)
            - strings libnative-lib.so | grep -i "flag" (search strings)
            - readelf -s libnative-lib.so (view symbols)</div>
                        <div class="terminal-input-wrapper">
                            <span class="terminal-prompt">$</span>
                            <input type="text" class="terminal-input" id="nativeCommand" 
                                autocomplete="off" spellcheck="false"
                                onkeypress="if(event.key==='Enter') executeNativeCommand()">
                        </div>
                    </div>

                    <div class="hint-box">
                        <button class="hint-btn" onclick="toggleHint('nativehint1')">💡 Hint 1: Disassemble SO</button>
                        <div id="nativehint1" class="hint-content" style="display:none;">
                            Command: objdump -d libnative-lib.so<br>
                            Find encrypt function at offset 0x1234<br>
                            Uses XOR 0x42 and ADD 0x10
                        </div>

                        <button class="hint-btn" onclick="toggleHint('nativehint2')">💡 Hint 2: Reverse Algorithm</button>
                        <div id="nativehint2" class="hint-content" style="display:none;">
                            Encryption: byte = (input ^ 0x42) + 0x10<br>
                            Decryption: byte = (encrypted - 0x10) ^ 0x42<br>
                            Found encrypted string in strings
                        </div>

                        <button class="hint-btn" onclick="toggleHint('nativehint3')">💡 Hint 3: Decrypt Flag</button>
                        <div id="nativehint3" class="hint-content" style="display:none;">
                            Encrypted: 93A7C3BFA3B793CBA3B793CFB3AF93BF93CFB3CF93B793C7<br>
                            Python: chr(((0x93 - 0x10) ^ 0x42)) for each byte<br>
                            Result: secXplore{n4t1v3_l1b_r3v3rs3d}
                        </div>
                    </div>

                    <div class="flag-input">
                        <input type="text" id="nativeFlag" placeholder="secXplore{...}">
                        <button class="submit-btn" onclick="checkFlag('native', 'secXplore{n4t1v3_l1b_r3v3rs3d}', 100)">Submit Flag</button>
                    </div>
                    <div class="success-message" id="nativeSuccess">🎉 Correct!</div>
                    <div class="error-message" id="nativeError">❌ Incorrect flag.</div>
                `
            }
        };
        // Open interactive challenge
        function openInteractiveChallenge(challengeId) {
            const challenge = interactiveChallenges[challengeId];
            if (!challenge) {
                alert('This challenge is not yet available');
                return;
            }

            document.getElementById('interactiveContent').innerHTML = challenge.content;
            document.getElementById('interactiveModal').classList.add('active');
        }
        function checkFlag(challengeType, correctFlag, basePoints = 100) {
            const inputId = challengeType + 'Flag';
            const successId = challengeType + 'Success';
            const errorId = challengeType + 'Error';
            
            const userFlag = document.getElementById(inputId).value.trim();
            const successMsg = document.getElementById(successId);
            const errorMsg = document.getElementById(errorId);
            
            if (userFlag === correctFlag) {
                // Calculate final points after hint penalties
                const hintsUsedCount = Object.keys(userProgress.hintsUsed)
                    .filter(key => key.startsWith(challengeType)).length;
                const finalPoints = Math.max(0, basePoints - (hintsUsedCount * HINT_PENALTY));
                
                userProgress.currentPoints += finalPoints;
                userProgress.solvedChallenges.add(challengeType);
                
                successMsg.style.display = 'block';
                successMsg.innerHTML = `🎉 Correct! +${finalPoints} points (Base: ${basePoints}, Hints used: ${hintsUsedCount})`;
                errorMsg.style.display = 'none';
                
                updatePointsDisplay();
                showNotification(`Challenge completed! +${finalPoints} points`, 'success');
            } else {
                successMsg.style.display = 'none';
                errorMsg.style.display = 'block';
                setTimeout(() => {
                    errorMsg.style.display = 'none';
                }, 3000);
            }
        }

        // ============================================
        // CHALLENGE FUNCTIONS - WEB SECURITY
        // ============================================

        let sqlAttemptCount = 0;
        const MAX_SQL_ATTEMPTS = 10;

        function attemptSQLLogin() {
            if (sqlAttemptCount >= MAX_SQL_ATTEMPTS) {
                showSQLResult('danger', '❌ Maximum attempts reached! Refresh to try again.');
                return;
            }
            
            sqlAttemptCount++;
            document.getElementById('sqlAttempts').textContent = sqlAttemptCount;
            
            const user = document.getElementById('sqlUser').value;
            const pass = document.getElementById('sqlPass').value;
            const resultPanel = document.getElementById('sqlResult');
            const debugPanel = document.getElementById('sqlDebug');
            
            if (!user || !pass) {
                showSQLResult('warning', '⚠️ Please enter both username and password');
                updateDebug('No input provided', '');
                return;
            }
            
            // Build the SQL query (for display)
            const query = `SELECT * FROM users WHERE username='${user}' AND password='${pass}'`;
            
            // Check for blocked patterns (case-sensitive)
            const blockedPatterns = ['OR', 'AND', '--', '/*'];
            let blocked = false;
            let blockedPattern = '';
            
            for (let pattern of blockedPatterns) {
                if (user.includes(pattern) || pass.includes(pattern)) {
                    blocked = true;
                    blockedPattern = pattern;
                    break;
                }
            }
            
            if (blocked) {
                showSQLResult('danger', `❌ Security Filter Triggered!<br>Blocked pattern detected: <code>${blockedPattern}</code><br>Try to bypass the filter...`);
                updateDebug(query, 'BLOCKED');
                return;
            }
            
            // Check for successful injection patterns
            const successPatterns = [
                /admin'.*or.*'1'='1'/i,
                /admin'.*\|\|.*1=1/i,
                /admin'.*or.*1=1/i,
                /admin'.*union/i
            ];
            
            let successful = false;
            for (let pattern of successPatterns) {
                if (user.toLowerCase().match(pattern)) {
                    // Check if it uses comment to close the query
                    if (user.includes('#') || user.includes(';')) {
                        successful = true;
                        break;
                    }
                }
            }
            
            if (successful) {
                showSQLResult('success', `✅ Authentication Successful!<br><br>
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(0,255,136,0.1); border-radius: 8px;">
                        <strong>Access Level: ADMINISTRATOR</strong><br>
                        User ID: 1<br>
                        Username: admin<br>
                        Role: superadmin<br><br>
                        🎉 Flag: <code style="color: var(--success); font-size: 1.1rem;">secXplore{sql_1nj3ct10n_byp4ss_adm1n}</code>
                    </div>`);
                updateDebug(query, 'SUCCESS', 'Query returned 1 row(s)<br>Admin access granted!');
            } else if (user.includes("'")) {
                showSQLResult('warning', `⚠️ SQL Syntax Error<br>Your injection attempt caused a syntax error.<br>Check the debug panel for details.`);
                updateDebug(query, 'SYNTAX ERROR', 'Unclosed quote or invalid syntax');
            } else {
                showSQLResult('danger', `❌ Login Failed<br>Invalid credentials<br><small>Hint: There's a SQL injection vulnerability here...</small>`);
                updateDebug(query, 'FAILED', 'Query returned 0 row(s)');
            }
        }

        function showSQLResult(type, message) {
            const resultPanel = document.getElementById('sqlResult');
            const colors = {
                success: 'rgba(0, 255, 136, 0.2)',
                danger: 'rgba(255, 0, 102, 0.2)',
                warning: 'rgba(255, 170, 0, 0.2)'
            };
            const borderColors = {
                success: 'var(--success)',
                danger: 'var(--danger)',
                warning: 'var(--warning)'
            };
            
            resultPanel.style.background = colors[type];
            resultPanel.style.border = `2px solid ${borderColors[type]}`;
            resultPanel.innerHTML = message;
            
            // Animate
            resultPanel.style.animation = 'none';
            setTimeout(() => {
                resultPanel.style.animation = 'slideIn 0.3s ease';
            }, 10);
        }

        function updateDebug(query, status, details = '') {
            const debugPanel = document.getElementById('sqlDebug');
            const statusColors = {
                'SUCCESS': 'var(--success)',
                'FAILED': 'var(--danger)',
                'BLOCKED': 'var(--warning)',
                'SYNTAX ERROR': 'var(--danger)'
            };
            
            debugPanel.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <strong style="color: var(--secondary);">Query Executed:</strong><br>
                    <code style="color: var(--light); word-break: break-all;">${query}</code>
                </div>
                <div style="margin-bottom: 1rem;">
                    <strong style="color: var(--secondary);">Status:</strong> 
                    <span style="color: ${statusColors[status] || 'var(--light)'};">${status}</span>
                </div>
                ${details ? `<div><strong style="color: var(--secondary);">Details:</strong><br>${details}</div>` : ''}
            `
        };

        function executeCMD() {
            const input = document.getElementById('cmdInput').value;
            const result = document.getElementById('cmdResult');
            
            if (!input) {
                result.innerHTML = `<span style="color: var(--warning);">⚠️ Please enter a target IP</span>`;
                return;
            }

            if (input.includes(';') || input.includes('&&') || input.includes('||') || input.includes('|')) {
                const parts = input.split(/[;&|]+/);
                const commands = parts.slice(1).join(' ').toLowerCase();
                
                if (commands.includes('ls') || commands.includes('dir')) {
                    result.innerHTML = `<span style="color: var(--light);">Pinging ${parts[0]}...
        PING ${parts[0]} (${parts[0]}) 56(84) bytes of data.
        64 bytes from ${parts[0]}: icmp_seq=1 ttl=64 time=0.042 ms

        --- ${parts[0]} ping statistics ---
        1 packets transmitted, 1 received, 0% packet loss

        Executing: ${commands}
        Files found:
        index.php
        config.php
        uploads/
        .htaccess
        flag.txt

        Hint: Try reading flag.txt with 'cat' command!</span>`;
                } else if (commands.includes('cat') && commands.includes('flag')) {
                    result.innerHTML = `<span style="color: var(--success);">Pinging ${parts[0]}...
        PING ${parts[0]} (${parts[0]}) 56(84) bytes of data.
        64 bytes from ${parts[0]}: icmp_seq=1 ttl=64 time=0.038 ms

        Executing: ${commands}

        ✅ Content of flag.txt:
        secXplore{c0mm4nd_1nj3ct10n_pwn3d}

        Copy the flag and submit below!</span>`;
                } else {
                    result.innerHTML = `<span style="color: var(--secondary);">Pinging ${parts[0]}...
        PING ${parts[0]} (${parts[0]}) 56(84) bytes of data.
        64 bytes from ${parts[0]}: icmp_seq=1 ttl=64 time=0.045 ms

        Executing: ${commands}
        Command executed but no relevant output.</span>`;
                }
            } else {
                result.innerHTML = `<span style="color: var(--light);">Pinging ${input}...
        PING ${input} (${input}) 56(84) bytes of data.
        64 bytes from ${input}: icmp_seq=1 ttl=64 time=0.042 ms

        --- ${input} ping statistics ---
        1 packets transmitted, 1 received, 0% packet loss, time 0ms
        rtt min/avg/max/mdev = 0.042/0.042/0.042/0.000 ms</span>`;
            }
        }

        function submitXSS() {
            const input = document.getElementById('xssInput').value;
            const result = document.getElementById('xssResult');
            const preview = document.getElementById('xssPreview');
            
            if (!input) {
                result.innerHTML = `<span style="color: var(--warning);">⚠️ Please enter a comment</span>`;
                return;
            }

            if (input.toLowerCase().includes('<script') || input.toLowerCase().includes('onerror') || input.toLowerCase().includes('onclick')) {
                result.innerHTML = `<span style="color: var(--danger);">❌ XSS Filter: Blocked dangerous patterns</span>`;
                preview.innerHTML = '';
                return;
            }

            if (input.includes('<svg') || input.includes('<img') || input.includes('<iframe') || input.includes('onload')) {
                result.innerHTML = `<span style="color: var(--success);">✅ Comment Posted Successfully!

        XSS Payload Executed!
        Admin Cookie Stolen: admin_session=secXplore{xss_c00k13_st34l3r_pwn}

        Copy the flag and submit below!</span>`;
                preview.innerHTML = `<div style="color: var(--success);">Comment Preview: ${input.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
            } else {
                result.innerHTML = `<span style="color: var(--secondary);">Comment posted but no XSS triggered. Try different payloads!</span>`;
                preview.innerHTML = `<div>Comment Preview: ${input.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
            }
        }

        function verifyJWT() {
            const token = document.getElementById('jwtInput').value.trim();
            const result = document.getElementById('jwtResult');
            
            if (!token) {
                result.innerHTML = `<span style="color: var(--warning);">⚠️ Please enter a JWT token</span>`;
                return;
            }

            try {
                const parts = token.split('.');
                if (parts.length !== 3) {
                    result.innerHTML = `<span style="color: var(--danger);">❌ Invalid JWT format</span>`;
                    return;
                }

                const header = JSON.parse(atob(parts[0]));
                const payload = JSON.parse(atob(parts[1]));

                if (header.alg === 'HS256' && payload.role === 'admin') {
                    result.innerHTML = `<span style="color: var(--success);">✅ Token Verified Successfully!

        Access Level: ADMIN
        Algorithm: HS256
        Flag: secXplore{jwt_alg0r1thm_c0nfus10n_h4ck}

        You successfully exploited the algorithm confusion vulnerability!</span>`;
                } else if (payload.role === 'admin') {
                    result.innerHTML = `<span style="color: var(--warning);">⚠️ Role is admin but wrong algorithm. Try HS256!</span>`;
                } else {
                    result.innerHTML = `<span style="color: var(--danger);">❌ Access Denied: Insufficient privileges</span>`;
                }
            } catch (e) {
                result.innerHTML = `<span style="color: var(--danger);">❌ Token decoding error</span>`;
            }
        }

        function decodeJWT() {
            document.getElementById('toolOutput').innerHTML = `Original Token Decoded:
        Header: {"alg":"RS256","typ":"JWT"}
        Payload: {"user":"user","role":"user","iat":1633024800}

        To become admin, change "role":"user" to "role":"admin"`;
        }

        function showPublicKey() {
            document.getElementById('toolOutput').innerHTML = `Public Key (PEM):
        -----BEGIN PUBLIC KEY-----
        MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
        -----END PUBLIC KEY-----

        Hint: Use this as HMAC secret for HS256!`;
        }

        function createHS256() {
            document.getElementById('toolOutput').innerHTML = `Sample HS256 Token with admin role:
        eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoidXNlciIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTYzMzAyNDgwMH0.signature

        Try pasting this in the verify box!`;
        }

        // ============================================
        // UTILITY FUNCTIONS
        // ============================================
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text.trim()).then(() => {
                showNotification('Copied to clipboard!', 'success');
            });
        }

        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                padding: 1rem 1.5rem;
                background: ${type === 'success' ? 'var(--success)' : 'var(--warning)'};
                color: #000;
                border-radius: 8px;
                font-weight: bold;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 2000);
        }

        // ============================================
        // CRYPTO 1 FUNCTIONS
        // ============================================
        function processMultiStep1() {
            const input = document.getElementById('multiStep1Input').value.trim();
            const output = document.getElementById('multiStep1Output');
            
            if (!input) {
                output.innerHTML = '<span style="color: var(--warning);">⚠️ ใส่ ciphertext ก่อน</span>';
                return;
            }
            
            try {
                const decoded = atob(input);
                output.innerHTML = `<strong style="color: var(--success);">✓ Decoded:</strong>\n<div class="result-box" onclick="copyToClipboard(this.textContent)">${decoded}</div>\n<small style="color: var(--gray);">คลิกเพื่อคัดลอก → ไปใส่ใน Step 2</small>`;
            } catch (e) {
                output.innerHTML = `<span style="color: var(--danger);">✗ Invalid Base64</span>`;
            }
        }

        function processMultiStep2() {
            const input = document.getElementById('multiStep2Input').value.trim();
            const output = document.getElementById('multiStep2Output');
            
            if (!input) {
                output.innerHTML = '<span style="color: var(--warning);">⚠️ ใส่ตัวเลขจาก Step 1</span>';
                return;
            }
            
            try {
                const numbers = input.split(',').map(n => parseInt(n.trim()));
                let text = '';
                for (let num of numbers) {
                    if (!isNaN(num)) text += String.fromCharCode(num);
                }
                output.innerHTML = `<strong style="color: var(--success);">✓ Converted:</strong>\n<div class="result-box" onclick="copyToClipboard(this.textContent)">${text}</div>\n<small style="color: var(--gray);">คลิกเพื่อคัดลอก → ไปใส่ใน Step 3</small>`;
            } catch (e) {
                output.innerHTML = `<span style="color: var(--danger);">✗ Invalid format</span>`;
            }
        }

        function processMultiStep3() {
            const input = document.getElementById('multiStep3Input').value.trim();
            const key = parseInt(document.getElementById('multiXorKey').value);
            const output = document.getElementById('multiStep3Output');
            
            if (!input || !key) {
                output.innerHTML = '<span style="color: var(--warning);">⚠️ ใส่ text และ XOR key</span>';
                return;
            }
            
            let result = '';
            for (let c of input) {
                result += String.fromCharCode(c.charCodeAt(0) ^ key);
            }
            
            output.innerHTML = `<strong style="color: var(--success);">✓ XOR Result (key=${key}):</strong>\n<div class="result-box" onclick="copyToClipboard(this.textContent)">${result}</div>\n<small style="color: var(--gray);">คลิกเพื่อคัดลอก → ไปใส่ใน Step 4</small>`;
        }

        function processMultiStep4() {
            const input = document.getElementById('multiStep4Input').value.trim();
            const shift = parseInt(document.getElementById('multiCaesarShift').value);
            const output = document.getElementById('multiStep4Output');
            
            if (!input || isNaN(shift)) {
                output.innerHTML = '<span style="color: var(--warning);">⚠️ ใส่ text และ shift value</span>';
                return;
            }
            
            let result = '';
            for (let c of input) {
                if (c.match(/[a-z]/i)) {
                    const base = c <= 'Z' ? 65 : 97;
                    result += String.fromCharCode(((c.charCodeAt(0) - base - shift + 26) % 26) + base);
                } else {
                    result += c;
                }
            }
            
            output.innerHTML = `<strong style="color: var(--success);">✓ Caesar Result (shift=${shift}):</strong>\n<div class="result-box" onclick="copyToClipboard(this.textContent)">${result}</div>\n${result.includes('secXplore{') ? '<strong style="color: var(--success); font-size: 1.2em;">🎉 FLAG FOUND!</strong>' : ''}`;
        }

        // ============================================
        // CRYPTO 2 FUNCTIONS
        // ============================================
        function calculateXor() {
            const hex1 = document.getElementById('xorHex1').value.trim();
            const hex2 = document.getElementById('xorHex2').value.trim();
            const output = document.getElementById('xorResult');
            
            if (!hex1 || !hex2) {
                output.innerHTML = '<span style="color: var(--warning);">⚠️ ใส่ hex ทั้ง 2 ช่อง</span>';
                return;
            }
            
            const val1 = parseInt(hex1, 16);
            const val2 = parseInt(hex2, 16);
            const result = val1 ^ val2;
            const resultHex = result.toString(16).padStart(2, '0');
            const resultChar = result >= 32 && result < 127 ? String.fromCharCode(result) : '';
            
            output.innerHTML = `<strong style="color: var(--success);">Result:</strong> 0x${resultHex} = ${result} ${resultChar ? `= '${resultChar}'` : ''}`;
        }

        function decryptWithXorKey() {
            const key = document.getElementById('xorDecryptKey').value.trim();
            const output = document.getElementById('xorDecryptOutput');
            const cipher = "1a0b455e332f5c0c1a13445a3722510b1b0a445b372f5c0d1a13445e372e510a1a0b455b332f5c0c1a13445a3722510b1b0a";
            
            if (!key || key.length !== 8) {
                output.innerHTML = '<span style="color: var(--warning);">⚠️ Key ต้องเป็น 8 hex chars</span>';
                return;
            }
            
            try {
                const keyBytes = [];
                for (let i = 0; i < 8; i += 2) {
                    keyBytes.push(parseInt(key.substr(i, 2), 16));
                }
                
                let result = '';
                for (let i = 0; i < cipher.length; i += 2) {
                    const cByte = parseInt(cipher.substr(i, 2), 16);
                    const kByte = keyBytes[(i/2) % 4];
                    result += String.fromCharCode(cByte ^ kByte);
                }
                
                output.innerHTML = `<strong style="color: var(--success);">✓ Decrypted:</strong>\n<div class="result-box">${result}</div>\n${result.includes('secXplore{') ? '<strong style="color: var(--success); font-size: 1.2em;">🎉 FLAG FOUND!</strong>' : '<span style="color: var(--danger);">Key ไม่ถูกต้อง ลองใหม่</span>'}`;
            } catch (e) {
                output.innerHTML = `<span style="color: var(--danger);">✗ Error: ${e.message}</span>`;
            }
        }

        // ============================================
        // CRYPTO 3 FUNCTIONS
        // ============================================
        function testPrimeFactor() {
            const prime = parseInt(document.getElementById('primeDivisor').value);
            const output = document.getElementById('primeResult');
            const n = 15043;
            
            if (!prime) {
                output.innerHTML = '<span style="color: var(--warning);">⚠️ ใส่ตัวเลข</span>';
                return;
            }
            
            const remainder = n % prime;
            if (remainder === 0) {
                const quotient = n / prime;
                output.innerHTML = `<strong style="color: var(--success);">✓ FOUND!</strong>\n${n} ÷ ${prime} = ${quotient}\n\n${n} = ${prime} × ${quotient}`;
            } else {
                output.innerHTML = `<span style="color: var(--danger);">✗ ${n} % ${prime} = ${remainder}</span>\nไม่หารลงตัว ลองตัวอื่น`;
            }
        }

        function calculateRsaPrivateKey() {
            const p = parseInt(document.getElementById('rsaP').value);
            const q = parseInt(document.getElementById('rsaQ').value);
            const output = document.getElementById('rsaCalcOutput');
            const e = 3;
            
            if (!p || !q) {
                output.innerHTML = '<span style="color: var(--warning);">⚠️ ใส่ p และ q จาก Step 1</span>';
                return;
            }
            
            if (p * q !== 15043) {
                output.innerHTML = `<span style="color: var(--danger);">✗ p × q = ${p * q} ≠ 15043</span>\nลองใหม่`;
                return;
            }
            
            const phi = (p - 1) * (q - 1);
            const d = modInverse(e, phi);
            
            output.innerHTML = `<strong style="color: var(--success);">✓ Calculation:</strong>\n\nφ(n) = (${p}-1) × (${q}-1) = ${phi}\n\nPrivate key: d = ${d}\n\n<span style="color: var(--secondary);">ใส่ d นี้ใน Step 3</span>`;
        }

        function decryptRsaMessage() {
            const d = parseInt(document.getElementById('rsaPrivateD').value);
            const output = document.getElementById('rsaDecryptOutput');
            const n = 15043;
            const cipher = [6837,5451,1728,11552,9261,8000,5451,12167,5451,2744,1331,6837,2197,9261,1728,11552,9261,8000,11552,216];
            
            if (!d) {
                output.innerHTML = '<span style="color: var(--warning);">⚠️ ใส่ d จาก Step 2</span>';
                return;
            }
            
            let result = '';
            for (let c of cipher) {
                result += String.fromCharCode(modPow(c, d, n));
            }
            
            output.innerHTML = `<strong style="color: var(--success);">✓ Decrypted:</strong>\n<div class="result-box">${result}</div>\n${result.includes('secXplore{') ? '<strong style="color: var(--success); font-size: 1.2em;">🎉 FLAG FOUND!</strong>' : '<span style="color: var(--danger);">d ไม่ถูกต้อง</span>'}`;
        }

        function modPow(base, exp, mod) {
            let result = 1;
            base = base % mod;
            while (exp > 0) {
                if (exp % 2 === 1) result = (result * base) % mod;
                exp = Math.floor(exp / 2);
                base = (base * base) % mod;
            }
            return result;
        }

        function modInverse(a, m) {
            let m0 = m, x0 = 0, x1 = 1;
            while (a > 1) {
                let q = Math.floor(a / m);
                let t = m;
                m = a % m;
                a = t;
                t = x0;
                x0 = x1 - q * x0;
                x1 = t;
            }
            return x1 < 0 ? x1 + m0 : x1;
        }

        // ============================================
        // CRYPTO 4 FUNCTIONS
        // ============================================
        let operationHistory = [];

        function applyOperation(op) {
            const input = document.getElementById('customLayerInput').value.trim();
            const output = document.getElementById('customLayerOutput');
            const history = document.getElementById('layerHistory');
            
            if (!input) {
                output.innerHTML = '<span style="color: var(--warning);">⚠️ ใส่ text ก่อน</span>';
                return;
            }
            
            let result = '';
            let opName = '';
            
            try {
                switch(op) {
                    case 'base64':
                        result = atob(input);
                        opName = 'Base64 Decode';
                        break;
                    case 'rot13':
                        for (let c of input) {
                            if (c.match(/[a-z]/i)) {
                                const base = c <= 'Z' ? 65 : 97;
                                result += String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
                            } else {
                                result += c;
                            }
                        }
                        opName = 'ROT13';
                        break;
                    case 'reverse':
                        result = input.split('').reverse().join('');
                        opName = 'Reverse';
                        break;
                    case 'hex':
                        const hex = input.replace(/[^0-9A-Fa-f]/g, '');
                        for (let i = 0; i < hex.length; i += 2) {
                            result += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
                        }
                        opName = 'Hex Decode';
                        break;
                    case 'upper':
                        result = input.toUpperCase();
                        opName = 'To Uppercase';
                        break;
                    case 'lower':
                        result = input.toLowerCase();
                        opName = 'To Lowercase';
                        break;
                    case 'caesar':
                        const shift = parseInt(document.getElementById('customShiftValue').value);
                        if (isNaN(shift)) {
                            output.innerHTML = '<span style="color: var(--warning);">⚠️ ใส่ shift value</span>';
                            return;
                        }
                        for (let c of input) {
                            if (c.match(/[a-z]/i)) {
                                const base = c <= 'Z' ? 65 : 97;
                                result += String.fromCharCode(((c.charCodeAt(0) - base - shift + 26) % 26) + base);
                            } else {
                                result += c;
                            }
                        }
                        opName = `Caesar (shift=${shift})`;
                        break;
                    case 'vigenere':
                        const key = document.getElementById('customVigenereKey').value.trim().toLowerCase();
                        if (!key) {
                            output.innerHTML = '<span style="color: var(--warning);">⚠️ ใส่ Vigenere key</span>';
                            return;
                        }
                        let keyIndex = 0;
                        for (let c of input) {
                            if (c.match(/[a-z]/i)) {
                                const base = c <= 'Z' ? 65 : 97;
                                const keyChar = key[keyIndex % key.length];
                                const keyShift = keyChar.charCodeAt(0) - 97;
                                result += String.fromCharCode(((c.charCodeAt(0) - base - keyShift + 26) % 26) + base);
                                keyIndex++;
                            } else {
                                result += c;
                            }
                        }
                        opName = `Vigenere (key=${key})`;
                        break;
                }
                
                operationHistory.push(opName);
                output.innerHTML = `<strong style="color: var(--success);">✓ ${opName}:</strong>\n<div class="result-box" onclick="copyToClipboard(this.textContent)">${result}</div>\n<small style="color: var(--gray);">คลิกเพื่อคัดลอก</small>\n${result.includes('secXplore{') ? '<strong style="color: var(--success); font-size: 1.2em;">🎉 FLAG FOUND!</strong>' : ''}`;
                
                history.innerHTML = operationHistory.map((op, i) => `${i + 1}. ${op}`).join('<br>');
            } catch (e) {
                output.innerHTML = `<span style="color: var(--danger);">✗ Error: ${e.message}</span>`;
            }
        }


        // ============================================
        // CHALLENGE FUNCTIONS - FORENSICS
        // ============================================

        // EXIF Command Executor
        function executeStegoCommand() {
            const input = document.getElementById('stegoCommand');
            const command = input.value.trim();
            const terminal = document.getElementById('stegoTerminal');
            
            if (!command) return;
            
            // แสดงคำสั่งที่พิมพ์พร้อม prompt
            terminal.innerHTML += `\n$ ${command}`;
            
            const cmd = command.toLowerCase();
            
            if (cmd.includes('binwalk') && !cmd.includes('-e')) {
                terminal.innerHTML += `
        DECIMAL   HEXADECIMAL  DESCRIPTION
        --------------------------------------------------------------------------------
        0         0x0          JPEG image data, JFIF standard 1.01
        8185      0x1FF9       End of JPEG (FF D9)
        8187      0x1FFB       Zip archive data, encrypted
        8534      0x2156       End of Zip archive

        Found ZIP file at offset 8187!`;
            } 
            else if (cmd.includes('binwalk -e') || cmd.includes('dd')) {
                terminal.innerHTML += `
        Extracting hidden.zip...
        347 bytes extracted
        File: hidden.zip (password protected)`;
            } 
            else if (cmd.includes('unzip')) {
                if (cmd.includes('whiteflag')) {
                    terminal.innerHTML += `
        Archive: hidden.zip
        inflating: secret.txt

        Contents of secret.txt:
        c2VjWHBsb3Jle2IxbndAbGtfc3QzZzBfYjRzZTY0X2gxZGQzbn0=`;
                } else {
                    terminal.innerHTML += `
        Archive: hidden.zip
        Error: incorrect password
        Hint: Look at the image content`;
                }
            } 
            else if (cmd.includes('base64 -d') || cmd.includes('base64 --decode')) {
                terminal.innerHTML += `
        secXplore{b1nw@lk_st3g0_b4se64_h1dd3n}`;
            } 
            else {
                terminal.innerHTML += `
        bash: ${command}: command not found
        Try: binwalk white_flag.jpg`;
            }
            
            // Clear input
            input.value = '';
            
            // Scroll to bottom
            const terminalContainer = terminal.closest('.terminal');
            terminalContainer.scrollTop = terminalContainer.scrollHeight;
            
            // Focus back to input
            input.focus();
        }
        function executeEXIFCommand() {
            const input = document.getElementById('exifCommand');
            const command = input.value.trim();
            const terminal = document.getElementById('exifTerminal');
            if (!command) return;
            // แสดงคำสั่งที่พิมพ์
            terminal.innerHTML += `\n$ ${command}`;
            const cmd = command.toLowerCase();
            // exiftool with -a flag (all tags)
            if (cmd.includes('exiftool') && cmd.includes('birthday') && cmd.includes('-a')) {
                terminal.innerHTML += `
            ExifTool Version Number         : 12.40
            File Name                       : birthday.jpg
            File Size                       : 245 KB
            File Type                       : JPEG
            File Type Extension             : jpg
            MIME Type                       : image/jpeg
            Image Width                     : 1200
            Image Height                    : 800
            Encoding Process                : Baseline DCT, Huffman coding
            Bits Per Sample                 : 8
            Color Components                : 3
            Y Cb Cr Sub Sampling            : YCbCr4:2:0 (2 2)
            Camera Model Name               : Canon EOS 5D
            Date/Time Original              : 2024:01:20 14:30:00
            Create Date                     : 2024:01:20 14:30:00
            Artist                          : Anonymous
            Copyright                       : secXplore{ex1f_m3t4d4t4_h1dd3n_1nf0}
            User Comment                    : Happy 20th Birthday!
            Software                        : Adobe Photoshop CS6
            Color Space                     : sRGB
            Exif Image Width                : 1200
            Exif Image Height               : 800
            GPS Position                    : (not set)`;
            }
            // exiftool with -Copyright flag
            else if (cmd.includes('exiftool') && cmd.includes('-copyright')) {
                terminal.innerHTML += `
            Copyright                       : secXplore{ex1f_m3t4d4t4_h1dd3n_1nf0}`;
            }
            // exiftool with -G flag (group names)
            else if (cmd.includes('exiftool') && cmd.includes('birthday') && cmd.includes('-g')) {
                terminal.innerHTML += `
            [File]          File Name                       : birthday.jpg
            [File]          File Size                       : 245 KB
            [File]          File Type                       : JPEG
            [EXIF]          Camera Model Name               : Canon EOS 5D
            [EXIF]          Date/Time Original              : 2024:01:20 14:30:00
            [EXIF]          Artist                          : Anonymous
            [IFD0]          Copyright                       : secXplore{ex1f_m3t4d4t4_h1dd3n_1nf0}
            [EXIF]          User Comment                    : Happy 20th Birthday!`;
            }
            // basic exiftool
            else if (cmd.includes('exiftool') && cmd.includes('birthday')) {
                terminal.innerHTML += `
            File Name                       : birthday.jpg
            File Size                       : 245 KB
            File Type                       : JPEG
            Image Width                     : 1200
            Image Height                    : 800
            Camera Model Name               : Canon EOS 5D
            Date/Time Original              : 2024:01:20 14:30:00
            Artist                          : Anonymous
            Try: exiftool -a birthday.jpg for all tags`;
            }
            // strings command
            else if (cmd.includes('strings') && cmd.includes('birthday')) {
                if (cmd.includes('grep') && cmd.includes('sec')) {
                    terminal.innerHTML += `
            Searching for 'sec' pattern...
            secXplore{ex1f_m3t4d4t4_h1dd3n_1nf0}`;
                } else {
                    terminal.innerHTML += `
            JFIF
            Adobe
            Photoshop
            Canon
            EOS 5D
            Anonymous
            Happy 20th Birthday!
            secXplore{ex1f_m3t4d4t4_h1dd3n_1nf0}
            sRGB
            ...`;
                }
            }
            // file command
            else if (cmd === 'file birthday.jpg') {
                terminal.innerHTML += `
            birthday.jpg: JPEG image data, JFIF standard 1.01, resolution (DPI), density 72x72, segment length 16, baseline, precision 8, 1200x800, components 3`;
            }
            // ls command
            else if (cmd === 'ls' || cmd === 'ls -la') {
                terminal.innerHTML += `
            total 245
            -rw-r--r-- 1 user user 245KB Jan 20 14:30 birthday.jpg`;
            }
            // help
            else if (cmd === 'help') {
                terminal.innerHTML += `
            Available commands:
            - exiftool birthday.jpg
            - exiftool -a birthday.jpg (show all tags)
            - exiftool -G birthday.jpg (with group names)
            - exiftool -Copyright birthday.jpg (specific field)
            - strings birthday.jpg | grep -i "sec"
            - file birthday.jpg
            - ls`;
            }
            // clear
            else if (cmd === 'clear') {
                terminal.innerHTML = `$ file birthday.jpg
            birthday.jpg: JPEG image data
            Available commands:
            - exiftool birthday.jpg (basic metadata)
            - exiftool -a birthday.jpg (show all tags)
            - exiftool -G birthday.jpg (show group names)
            - exiftool -Copyright birthday.jpg (specific tag)
            - strings birthday.jpg | grep -i "sec" (search strings)`;
                input.value = '';
                return;
            }
            // command not found
            else {
                terminal.innerHTML += `
            bash: ${command}: command not found
            Type 'help' for available commands`;
            }
            // Clear input and scroll
            input.value = '';
            const terminalContainer = terminal.closest('.terminal');
            terminalContainer.scrollTop = terminalContainer.scrollHeight;
            input.focus();
            }

        function executeGeoCommand() {
            const input = document.getElementById('geoCommand');
            const command = input.value.trim();
            const terminal = document.getElementById('geoTerminal');
            if (!command) return;
            terminal.innerHTML += `\n$ ${command}`;
            const cmd = command.toLowerCase();
            // exiftool with GPS and numeric format
            if (cmd.includes('exiftool') && cmd.includes('gps') && (cmd.includes('-n') || cmd.includes('%.6f'))) {
                terminal.innerHTML += `
            GPS Latitude                    : 13.8115
            GPS Longitude                   : 100.5629
            GPS Altitude                    : 45 m Above Sea Level
            GPS Latitude Ref                : North
            GPS Longitude Ref               : East
            GPS Altitude Ref                : Above Sea Level
            GPS Time Stamp                  : 07:30:00
            GPS Date Stamp                  : 2024:01:20`;
            }
            // exiftool with GPS (DMS format)
            else if (cmd.includes('exiftool') && cmd.includes('gps')) {
                terminal.innerHTML += `
            GPS Latitude                    : 13 deg 48' 41.40" N
            GPS Longitude                   : 100 deg 33' 46.44" E
            GPS Altitude                    : 45 m Above Sea Level
            GPS Time Stamp                  : 07:30:00
            GPS Date Stamp                  : 2024:01:20
            GPS Position                    : 13 deg 48' 41.40" N, 100 deg 33' 46.44" E
            Use -n flag for decimal format: exiftool -n -GPS* Where_is_it.jpg`;
            }
            // basic exiftool
            else if (cmd.includes('exiftool') && cmd.includes('where')) {
                terminal.innerHTML += `
            File Name                       : Where_is_it.jpg
            File Size                       : 512 KB
            Camera Model                    : iPhone 12
            Date/Time Original              : 2024:01:20 14:30:00
            GPS Position                    : 13 deg 48' 41.40" N, 100 deg 33' 46.44" E
            Try: exiftool -GPS* Where_is_it.jpg for GPS data only`;
            }
            // md5sum with correct answer
            else if (cmd.includes('md5') && cmd.includes('bangkokuniversity')) {
                terminal.innerHTML += `
            4a8d8c8e8f3b5d7c9e2a1f6b4c8d3e9a  -`;
            }
            // md5sum general
            else if (cmd.includes('echo') && cmd.includes('md5')) {
                if (cmd.includes('bangkok') && !cmd.includes('bangkokuniversity')) {
                    terminal.innerHTML += `
            Wrong format. Try: echo -n "bangkokuniversity" | md5sum
            (lowercase, no spaces)`;
                } else {
                    terminal.innerHTML += `
            Usage: echo -n "text" | md5sum
            Example: echo -n "bangkokuniversity" | md5sum`;
                }
            }
            // file command
            else if (cmd.includes('file') && cmd.includes('where')) {
                terminal.innerHTML += `
            Where_is_it.jpg: JPEG image data, EXIF standard 2.2, resolution (DPI), density 72x72`;
            }
            // help
            else if (cmd === 'help') {
                terminal.innerHTML += `
            Available commands:
            - exiftool Where_is_it.jpg
            - exiftool -GPS* Where_is_it.jpg (GPS only)
            - exiftool -n -GPS* Where_is_it.jpg (decimal)
            - echo -n "text" | md5sum
            - file Where_is_it.jpg
            - ls`;
            }
            // clear
            else if (cmd === 'clear') {
                terminal.innerHTML = `$ file Where_is_it.jpg
            Where_is_it.jpg: JPEG image data
            Available commands:
            - exiftool -GPS* Where_is_it.jpg (GPS data only)
            - exiftool -n -GPS* Where_is_it.jpg (numeric GPS)
            - exiftool -c "%.6f" -GPS* Where_is_it.jpg (decimal format)
            - echo -n "text" | md5sum (hash text)`;
                input.value = '';
                return;
            }
            // ls
            else if (cmd === 'ls' || cmd === 'ls -la') {
                terminal.innerHTML += `
            total 512
            -rw-r--r-- 1 user user 512KB Jan 20 14:30 Where_is_it.jpg`;
            }
            // command not found
            else {
                terminal.innerHTML += `
            bash: ${command}: command not found
            Type 'help' for available commands`;
            }
            input.value = '';
            const terminalContainer = terminal.closest('.terminal');
            terminalContainer.scrollTop = terminalContainer.scrollHeight;
            input.focus();
            }

        // Disk Image Analysis Functions
        function executeDiskCommand() {
            const input = document.getElementById('diskCommand');
            const command = input.value.trim();
            const terminal = document.getElementById('diskTerminal');
            
            if (!command) return;
            
            terminal.innerHTML += `\n$ ${command}`;
            
            const cmd = command.toLowerCase();
            
            // mmls - view partition table
            if (cmd.includes('mmls')) {
                terminal.innerHTML += `
        DOS Partition Table
        Offset Sector: 0
        Units are in 512-byte sectors

            Slot      Start        End          Length       Description
        000:  Meta      0000000000   0000000000   0000000001   Primary Table (#0)
        001:  -------   0000000000   0000002047   0000002048   Unallocated
        002:  000:000   0000002048   0001026047   0001024000   Linux (0x83)
        003:  -------   0001026048   0001048575   0000022528   Unallocated

        Partition 002 contains ext4 filesystem`;
            }
            // fls - list files including deleted
            else if (cmd.includes('fls') && cmd.includes('-d')) {
                terminal.innerHTML += `
        r/r 11: lost+found
        d/d 12: home
        r/r 15: .bash_history
        r/r 16: Documents
        * r/r 12847: secret_data.txt (deleted)
        r/r 17: Pictures
        r/r 18: Downloads
        * r/r 12848: important.pdf (deleted)
        * r/r 12849: .hidden_file (deleted)
        r/r 19: Desktop

        Found 3 deleted files!
        Note inode 12847 for secret_data.txt`;
            }
            // fls without -d (only active files)
            else if (cmd.includes('fls') && !cmd.includes('-d')) {
                terminal.innerHTML += `
        r/r 11: lost+found
        d/d 12: home
        r/r 15: .bash_history
        r/r 16: Documents
        r/r 17: Pictures
        r/r 18: Downloads
        r/r 19: Desktop

        No deleted files shown. Use -d flag to show deleted files`;
            }
            // icat - recover file by inode (wrong inode)
            else if (cmd.includes('icat') && !cmd.includes('12847')) {
                terminal.innerHTML += `
        Error: Cannot recover file from inode
        File may be too fragmented or overwritten
        Try inode 12847 for secret_data.txt`;
            }
            // icat - recover correct file
            else if (cmd.includes('icat') && cmd.includes('12847')) {
                if (cmd.includes('>') || cmd.includes('cat')) {
                    terminal.innerHTML += `
        File recovered successfully!

        Content of secret_data.txt:
        ============================
        Project: SecretOps
        Date: 2024-01-15
        Status: CONFIDENTIAL

        Notes:
        - Meeting at 3 PM
        - Password changed to: [CORRUPTED]
        - Flag location: Check slack space at offset 0x1F4B2C
        - [DATA CORRUPTED - USE FILE CARVING]

        File appears corrupted. Try file carving or hex search`;
                } else {
                    terminal.innerHTML += `
        QnJvamVjdDogU2VjcmV0T3BzCkRhdGU6IDIwMjQtMDEtMTUKU3RhdHVz...
        (binary data - redirect to file: icat evidence.dd 12847 > recovered.txt)`;
                }
            }
            // strings search for flag
            else if (cmd.includes('strings') && cmd.includes('flag')) {
                terminal.innerHTML += `
        Searching for "flag" in strings...

        /home/user/.bash_history
        rm secret_data.txt
        shred -u important.pdf
        Flag location: slack space
        Project SecretOps
        Meeting notes
        [PARTIAL] secXplore{d1sk_f0
        [CORRUPTED DATA]

        Partial flag found! Need to search deeper`;
            }
            // strings search for sec
            else if (cmd.includes('strings') && cmd.includes('sec')) {
                terminal.innerHTML += `
        secret_data.txt
        SecretOps
        secXplore{d1sk_f0r3ns1cs_d3l3t3d_r3c0v3ry}
        /home/user/.secret
        Security clearance

        Full flag found in strings!`;
            }
            // xxd hex dump with grep
            else if (cmd.includes('xxd') && cmd.includes('grep')) {
                if (cmd.includes('sec') || cmd.includes('flag')) {
                    terminal.innerHTML += `
        001f4b20: 6461 7461 2073 6563 5870 6c6f 7265 7b64  data secXplore{d
        001f4b30: 3173 6b5f 6630 7233 6e73 3163 735f 6433  1sk_f0r3ns1cs_d3
        001f4b40: 6c33 7433 645f 7233 6330 7633 7279 7d00  l3t3d_r3c0v3ry}.

        Flag found at offset 0x1F4B2C!
        secXplore{d1sk_f0r3ns1cs_d3l3t3d_r3c0v3ry}`;
                } else {
                    terminal.innerHTML += `
        00000000: 5375 7065 7220 626c 6f63 6b20 6261 636b  Super block back
        00000010: 7570 2073 746f 7265 6420 6174 2062 6c6f  up stored at blo
        Try: xxd evidence.dd | grep -i "sec"`;
                }
            }
            // foremost file carving
            else if (cmd.includes('foremost')) {
                terminal.innerHTML += `
        Foremost version 1.5.7 by Jesse Kornblum, Kris Kendall, and Nick Mikus
        Processing: evidence.dd
        |*************************************************|

        Extracting files...
        jpg:= 3
        png:= 2
        txt:= 5
        pdf:= 1

        Output written to: output/
        Check output/txt/00000847.txt for recovered data

        File 00000847.txt contains:
        secXplore{d1sk_f0r3ns1cs_d3l3t3d_r3c0v3ry}`;
            }
            // fsstat - filesystem statistics
            else if (cmd.includes('fsstat')) {
                terminal.innerHTML += `
        FILE SYSTEM INFORMATION
        --------------------------------------------
        File System Type: Ext4
        Volume Name: evidence
        Volume ID: 1a2b3c4d5e6f7890

        METADATA INFORMATION
        --------------------------------------------
        Inode Range: 11 - 12849
        Root Directory: 2
        Free Inodes: 134217728

        First Data Block: 0
        Block Size: 4096
        Fragment Size: 4096
        Blocks Per Group: 32768
        Total Block Groups: 15

        Deleted inodes available for recovery`;
            }
            // dd to extract specific offset
            else if (cmd.includes('dd') && cmd.includes('skip') && cmd.includes('0x1f4b2c')) {
                terminal.innerHTML += `
        32+0 records in
        32+0 records out
        32 bytes copied

        Extracted data:
        secXplore{d1sk_f0r3ns1cs_d3l3t3d_r3c0v3ry}`;
            }
            // dd wrong offset
            else if (cmd.includes('dd') && cmd.includes('skip')) {
                terminal.innerHTML += `
        Extracted data contains no useful information
        Try offset 0x1F4B2C (decimal: 2050860)`;
            }
            // help
            else if (cmd === 'help') {
                terminal.innerHTML += `
        Available commands:
        - mmls evidence.dd (partition table)
        - fls -r -d evidence.dd (list deleted files)
        - icat evidence.dd [inode] (recover file)
        - strings evidence.dd | grep -i "pattern"
        - xxd evidence.dd | grep -i "pattern"
        - foremost -i evidence.dd -o output
        - fsstat evidence.dd (filesystem stats)
        - dd if=evidence.dd bs=1 skip=OFFSET count=100`;
            }
            // clear
            else if (cmd === 'clear') {
                terminal.innerHTML = `$ file evidence.dd
        evidence.dd: Linux rev 1.0 ext4 filesystem data

        Available commands:
        - mmls evidence.dd (view partition table)
        - fls -r -d evidence.dd (list deleted files)
        - icat evidence.dd [inode] (recover file by inode)
        - xxd evidence.dd | grep -i "sec" (hex dump search)
        - strings evidence.dd | grep -i "flag" (string search)
        - foremost -i evidence.dd -o output (file carving)`;
                input.value = '';
                return;
            }
            // command not found
            else {
                terminal.innerHTML += `
        bash: ${command}: command not found
        Type 'help' for available commands`;
            }
            
            input.value = '';
            const terminalContainer = terminal.closest('.terminal');
            terminalContainer.scrollTop = terminalContainer.scrollHeight;
            input.focus();
        }

        // ============================================
        // CHALLENGE FUNCTIONS - NETWORK SECURITY
        // ============================================

        // Packet Sniffer Command Executor
        function executePacketCommand() {
            const input = document.getElementById('packetCommand');
            const command = input.value.trim();
            const terminal = document.getElementById('packetTerminal');
            
            if (!command) return;
            
            terminal.innerHTML += `\n$ ${command}`;
            
            const cmd = command.toLowerCase();
            
            if (cmd.includes('tcpdump -r') && !cmd.includes('-a')) {
                terminal.innerHTML += `
        14:23:01.123456 IP 192.168.1.105.52341 > 10.0.0.50.80: Flags [S], seq 1234567890
        14:23:01.124567 IP 10.0.0.50.80 > 192.168.1.105.52341: Flags [S.], seq 9876543210
        14:23:01.234567 IP 192.168.1.105.52341 > 10.0.0.50.80: Flags [P.], POST /api/login

        Too many packets. Use tshark -Y "http" to filter`;
            }
            else if (cmd.includes('tcpdump') && cmd.includes('-a')) {
                terminal.innerHTML += `
        POST /api/login HTTP/1.1
        Host: insecure-bank.com
        Content-Type: application/x-www-form-urlencoded

        username=admin&password=secXplore{p4ck3t_sn1ff3r_pl41nt3xt}&remember=true

        Found plaintext credentials!`;
            }
            else if (cmd.includes('tshark') && cmd.includes('http') && !cmd.includes('post')) {
                terminal.innerHTML += `
        147   14.523456 192.168.1.105 → 10.0.0.50    HTTP GET /index.html
        289   29.123456 192.168.1.105 → 10.0.0.50    HTTP GET /api/data
        432   43.654321 192.168.1.105 → 10.0.0.50    HTTP POST /api/login

        Use -Y "http.request.method == POST" to filter POST only`;
            }
            else if (cmd.includes('tshark') && cmd.includes('post')) {
                if (cmd.includes('-t fields')) {
                    terminal.innerHTML += `
        username=admin&password=secXplore{p4ck3t_sn1ff3r_pl41nt3xt}&remember=true

        Flag found in POST data!`;
                } else {
                    terminal.innerHTML += `
        432   43.654321 192.168.1.105 → 10.0.0.50    HTTP POST /api/login
        
        Frame 432: HTTP POST /api/login
            Content-Type: application/x-www-form-urlencoded
            Form data: username=admin&password=secXplore{p4ck3t_sn1ff3r_pl41nt3xt}

        Add -T fields -e http.file_data to extract data`;
                }
            }
            else if (cmd === 'help') {
                terminal.innerHTML += `
        Available commands:
        - tcpdump -r capture.pcap
        - tcpdump -r capture.pcap -A
        - tshark -r capture.pcap -Y "http"
        - tshark -r capture.pcap -Y "http.request.method == POST"`;
            }
            else if (cmd === 'clear') {
                terminal.innerHTML = `$ tcpdump -r capture.pcap
        Reading from capture.pcap

        Available commands:
        - tcpdump -r capture.pcap (view packets)
        - tcpdump -r capture.pcap -A (show ASCII content)
        - tshark -r capture.pcap -Y "http" (filter HTTP)
        - tshark -r capture.pcap -Y "http.request.method == POST" (POST only)
        - tshark -r capture.pcap -Y "http.request.method == POST" -T fields -e http.file_data (extract POST data)`;
                input.value = '';
                return;
            }
            else {
                terminal.innerHTML += `
        bash: ${command}: command not found`;
            }
            
            input.value = '';
            const terminalContainer = terminal.closest('.terminal');
            terminalContainer.scrollTop = terminalContainer.scrollHeight;
            input.focus();
        }

        // DNS Tunneling Command Executor
        function executeDNSCommand() {
            const input = document.getElementById('dnsCommand');
            const command = input.value.trim();
            const terminal = document.getElementById('dnsTerminal');
            
            if (!command) return;
            
            terminal.innerHTML += `\n$ ${command}`;
            
            const cmd = command.toLowerCase();
            
            if (cmd.includes('tshark') && cmd.includes('dns') && !cmd.includes('exfil') && !cmd.includes('-t fields')) {
                terminal.innerHTML += `
            3   0.002222 192.168.1.105 → 8.8.8.8      DNS Standard query A google.com
            4   0.003333 8.8.8.8 → 192.168.1.105      DNS Standard query response
        15   1.234567 192.168.1.105 → 8.8.8.8      DNS Standard query A NzM2NTYz.exfil.malicious.com
        28   2.345678 192.168.1.105 → 8.8.8.8      DNS Standard query A NTg3MDcw.exfil.malicious.com

        Suspicious DNS queries detected! Use filter with "exfil"`;
            }
            else if (cmd.includes('tshark') && cmd.includes('exfil') && cmd.includes('-t fields')) {
                terminal.innerHTML += `
        NzM2NTYzNTg3MDcw.exfil.malicious.com
        QzUyVTM.exfil.malicious.com
        zFkNm5z.exfil.malicious.com
        NzRfTTN.exfil.malicious.com
        oZk1sd3c.exfil.malicious.com
        3cjR0M3.exfil.malicious.com
        BufQ==.exfil.malicious.com

        DNS tunneling detected! Combine subdomains and decode Base64`;
            }
            else if (cmd.includes('tshark') && cmd.includes('exfil') && !cmd.includes('-t fields')) {
                terminal.innerHTML += `
        15   1.234567 192.168.1.105 → 8.8.8.8      DNS A NzM2NTYzNTg3MDcw.exfil.malicious.com
        28   2.345678 192.168.1.105 → 8.8.8.8      DNS A QzUyVTM.exfil.malicious.com
        31   2.456789 192.168.1.105 → 8.8.8.8      DNS A zFkNm5z.exfil.malicious.com

        Add -T fields -e dns.qry.name to extract query names only`;
            }
            else if (cmd.includes('echo') && cmd.includes('base64 -d')) {
                if (cmd.includes('NzM2NTYzNTg3MDcwQzUyVTMzFkNm5zNzRfTTNoZk1sd3c3cjR0M3BufQ==')) {
                    terminal.innerHTML += `
        secXplore{dns_7unn3l_3xf1l7r4t30n}`;
                } else {
                    terminal.innerHTML += `
        Combine all subdomains first, then decode`;
                }
            }
            else if (cmd === 'help') {
                terminal.innerHTML += `
        Available commands:
        - tshark -r traffic.pcap -Y "dns"
        - tshark -r traffic.pcap -Y "dns.qry.name contains exfil"
        - tshark -r traffic.pcap -Y "dns.qry.name" -T fields -e dns.qry.name
        - echo "base64" | base64 -d`;
            }
            else if (cmd === 'clear') {
                terminal.innerHTML = `$ tshark -r traffic.pcap -Y "dns"
        Analyzing DNS traffic...

        Available commands:
        - tshark -r traffic.pcap -Y "dns" (filter DNS)
        - tshark -r traffic.pcap -Y "dns.qry.name" -T fields -e dns.qry.name (extract query names)
        - tshark -r traffic.pcap -Y "dns.qry.name contains exfil" (suspicious domains)
        - echo "base64string" | base64 -d (decode Base64)`;
                input.value = '';
                return;
            }
            else {
                terminal.innerHTML += `
        bash: ${command}: command not found`;
            }
            
            input.value = '';
            const terminalContainer = terminal.closest('.terminal');
            terminalContainer.scrollTop = terminalContainer.scrollHeight;
            input.focus();
        }

        // ARP Spoofing Command Executor
        function executeARPCommand() {
            const input = document.getElementById('arpCommand');
            const command = input.value.trim();
            const terminal = document.getElementById('arpTerminal');
            
            if (!command) return;
            
            terminal.innerHTML += `\n$ ${command}`;
            
            const cmd = command.toLowerCase();
            
            if (cmd.includes('arp -a')) {
                terminal.innerHTML += `
        Interface: eth0
        Internet Address      Physical Address      Type
        192.168.1.1          aa:bb:cc:dd:ee:ff     dynamic
        192.168.1.100        11:22:33:44:55:66     dynamic
        192.168.1.50         aa:aa:aa:aa:aa:aa     dynamic (self)`;
            }
            else if (cmd.includes('arpspoof') && cmd.includes('192.168.1.100')) {
                terminal.innerHTML += `
        aa:aa:aa:aa:aa:aa aa:bb:cc:dd:ee:ff 0806 42: arp reply 192.168.1.1 is-at aa:aa:aa:aa:aa:aa
        aa:aa:aa:aa:aa:aa aa:bb:cc:dd:ee:ff 0806 42: arp reply 192.168.1.1 is-at aa:aa:aa:aa:aa:aa

        ARP poisoning active! Victim thinks attacker MAC is gateway`;
            }
            else if (cmd.includes('ip_forward') || cmd.includes('echo 1')) {
                terminal.innerHTML += `
        IP forwarding enabled
        Traffic will be forwarded transparently to real gateway`;
            }
            else if (cmd.includes('tcpdump') && cmd.includes('grep')) {
                terminal.innerHTML += `
        POST /login HTTP/1.1
        Host: bank.com
        Content-Type: application/x-www-form-urlencoded

        username=victim@email.com&password=secXplore{4rp_sp00f_m1tm_4tt4ck}

        Intercepted credentials from MITM attack!`;
            }
            else if (cmd.includes('tcpdump') && !cmd.includes('grep')) {
                terminal.innerHTML += `
        14:25:01.123456 IP 192.168.1.100.52341 > 10.0.0.50.80: Flags [P.], POST /login
        14:25:01.234567 IP 10.0.0.50.80 > 192.168.1.100.52341: Flags [.], ack

        Add -A flag or pipe to grep to see data`;
            }
            else if (cmd === 'help') {
                terminal.innerHTML += `
        Available commands:
        - arp -a
        - arpspoof -i eth0 -t 192.168.1.100 192.168.1.1
        - echo 1 > /proc/sys/net/ipv4/ip_forward
        - tcpdump -i eth0 -A | grep "password"`;
            }
            else if (cmd === 'clear') {
                terminal.innerHTML = `$ arp -a
        Gateway (192.168.1.1) at aa:bb:cc:dd:ee:ff
        Victim (192.168.1.100) at 11:22:33:44:55:66

        Available commands:
        - arp -a (view ARP table)
        - arpspoof -i eth0 -t 192.168.1.100 192.168.1.1 (poison victim)
        - tcpdump -i eth0 -n (capture traffic)
        - echo 1 > /proc/sys/net/ipv4/ip_forward (enable forwarding)`;
                input.value = '';
                return;
            }
            else {
                terminal.innerHTML += `
        bash: ${command}: command not found`;
            }
            
            input.value = '';
            const terminalContainer = terminal.closest('.terminal');
            terminalContainer.scrollTop = terminalContainer.scrollHeight;
            input.focus();
        }

        // SSL Strip Command Executor
        function executeSSLCommand() {
            const input = document.getElementById('sslCommand');
            const command = input.value.trim();
            const terminal = document.getElementById('sslTerminal');
            
            if (!command) return;
            
            terminal.innerHTML += `\n$ ${command}`;
            
            const cmd = command.toLowerCase();
            
            if (cmd.includes('tshark') && cmd.includes('http') && !cmd.includes('login')) {
                terminal.innerHTML += `
        147   14.523456 192.168.1.105 → 10.0.0.50    HTTP GET http://secure-bank.com/
        289   29.123456 192.168.1.105 → 10.0.0.50    HTTP POST http://secure-bank.com/api/login

        Notice: Should be https:// but downgraded to http://`;
            }
            else if (cmd.includes('tshark') && cmd.includes('login') && !cmd.includes('-t fields')) {
                terminal.innerHTML += `
        289   29.123456 192.168.1.105 → 10.0.0.50    HTTP POST http://secure-bank.com/api/login

        Frame 289: HTTP POST
            Content-Type: application/json
            
        Use -T fields -e http.file_data to extract JSON`;
            }
            else if (cmd.includes('tshark') && cmd.includes('-t fields')) {
                terminal.innerHTML += `
        {"username":"victim@email.com","password":"secXplore{ssl_str1p_d0wngr4d3_pwn}","session":"abc123"}

        Flag found in JSON password field!`;
            }
            else if (cmd.includes('grep') && cmd.includes('password')) {
                terminal.innerHTML += `
        Searching binary content...
        password":"secXplore{ssl_str1p_d0wngr4d3_pwn}

        Flag extracted from stripped HTTPS traffic!`;
            }
            else if (cmd === 'help') {
                terminal.innerHTML += `
        Available commands:
        - tshark -r stripped.pcap -Y "http"
        - tshark -r stripped.pcap -Y "http.request.uri contains login"
        - tshark -r stripped.pcap -T fields -e http.file_data
        - grep -a "password" stripped.pcap`;
            }
            else if (cmd === 'clear') {
                terminal.innerHTML = `$ tshark -r stripped.pcap
        Analyzing SSL stripped traffic...

        Available commands:
        - tshark -r stripped.pcap -Y "http" (filter HTTP)
        - tshark -r stripped.pcap -Y "http.request.uri contains login" (login requests)
        - tshark -r stripped.pcap -T fields -e http.file_data (extract POST data)
        - grep -a "password" stripped.pcap (search for password)`;
                input.value = '';
                return;
            }
            else {
                terminal.innerHTML += `
        bash: ${command}: command not found`;
            }
            
            input.value = '';
            const terminalContainer = terminal.closest('.terminal');
            terminalContainer.scrollTop = terminalContainer.scrollHeight;
            input.focus();
        }

        // ============================================
        // CHALLENGE FUNCTIONS - MOBILE SECURITY
        // ============================================

        // APK Command Executor
        function executeAPKCommand() {
            const input = document.getElementById('apkCommand');
            const command = input.value.trim();
            const terminal = document.getElementById('apkTerminal');
            
            if (!command) return;
            
            terminal.innerHTML += `\n$ ${command}`;
            
            const cmd = command.toLowerCase();
            
            if (cmd.includes('jadx') && cmd.includes('-d')) {
                terminal.innerHTML += `
        INFO  - loading...
        INFO  - processing classes.dex
        INFO  - decompiling...
        INFO  - done

        Output directory: output/
        Check: output/sources/com/secureapp/banking/`;
            }
            else if (cmd.includes('apktool d')) {
                terminal.innerHTML += `
        I: Using Apktool 2.7.0
        I: Loading resource table...
        I: Decoding AndroidManifest.xml
        I: Decoding file-resources...
        I: Decoding values */* XMLs...
        I: Baksmaling classes.dex...
        I: Copying assets and libs...
        I: Copying unknown files...
        I: Copying original files...

        Decompiled to: com.secureapp.banking/`;
            }
            else if (cmd.includes('grep') && cmd.includes('api_key')) {
                terminal.innerHTML += `
        output/sources/com/secureapp/banking/Constants.java:    public static final String API_KEY = "c2VjWHBsb3Jle2gwcmRjMGQzZF9hcGlfa2V5X2YwdW5kfQ==";
        output/sources/com/secureapp/banking/Config.java:    private static final String API_ENDPOINT = "https://api.example.com";

        Hardcoded API key found!`;
            }
            else if (cmd.includes('cat') && cmd.includes('constants.java')) {
                terminal.innerHTML += `
        package com.secureapp.banking;

        public class Constants {
            public static final String API_ENDPOINT = "https://api.example.com";
            public static final String API_KEY = "c2VjWHBsb3Jle2gwcmRjMGQzZF9hcGlfa2V5X2YwdW5kfQ==";
            private static final String SECRET = "hidden_flag";
        }

        Base64 encoded key found!`;
            }
            else if (cmd.includes('echo') && cmd.includes('base64 -d')) {
                if (cmd.includes('c2VjWHBsb3Jle2gwcmRjMGQzZF9hcGlfa2V5X2YwdW5kfQ==')) {
                    terminal.innerHTML += `
        secXplore{h0rdc0d3d_api_k3y_f0und}`;
                } else {
                    terminal.innerHTML += `
        Usage: echo "base64string" | base64 -d`;
                }
            }
            else if (cmd === 'help') {
                terminal.innerHTML += `
        Available commands:
        - jadx -d output com.secureapp.banking.apk
        - apktool d com.secureapp.banking.apk
        - grep -r "API_KEY" output/
        - cat output/sources/.../Constants.java
        - echo "base64" | base64 -d`;
            }
            else if (cmd === 'clear') {
                terminal.innerHTML = `$ file com.secureapp.banking.apk
        com.secureapp.banking.apk: Zip archive data, Android application package

        Available commands:
        - apktool d com.secureapp.banking.apk (decompile APK)
        - jadx -d output com.secureapp.banking.apk (decompile to Java)
        - grep -r "API_KEY" output/ (search for API keys)
        - cat output/res/values/strings.xml (view strings)
        - find output/ -name "*.java" -exec grep -l "secret" {} \; (find files with secrets)`;
                input.value = '';
                return;
            }
            else {
                terminal.innerHTML += `
        bash: ${command}: command not found
        Type 'help' for available commands`;
            }
            
            input.value = '';
            const terminalContainer = terminal.closest('.terminal');
            terminalContainer.scrollTop = terminalContainer.scrollHeight;
            input.focus();
        }

        // Root Bypass Command Executor
        function executeRootCommand() {
            const input = document.getElementById('rootCommand');
            const command = input.value.trim();
            const terminal = document.getElementById('rootTerminal');
            
            if (!command) return;
            
            terminal.innerHTML += `\n$ ${command}`;
            
            const cmd = command.toLowerCase();
            
            if (cmd.includes('grep') && cmd.includes('isrooted')) {
                terminal.innerHTML += `
        output/sources/com/secureapp/MainActivity.java:    private boolean isRooted() {
        output/sources/com/secureapp/MainActivity.java:        if (checkSuBinary()) return true;
        output/sources/com/secureapp/MainActivity.java:        if (checkTestKeys()) return true;

        Root detection found in MainActivity.java`;
            }
            else if (cmd.includes('cat') && cmd.includes('mainactivity.java')) {
                terminal.innerHTML += `
        private boolean isRooted() {
            // Check for su binary
            if (new File("/system/bin/su").exists()) return true;
            if (new File("/system/xbin/su").exists()) return true;
            
            // Check for test-keys
            String buildTags = android.os.Build.TAGS;
            if (buildTags != null && buildTags.contains("test-keys")) return true;
            
            return false;
        }

        Multiple root checks found!`;
            }
            else if (cmd.includes('frida') && cmd.includes('bypass')) {
                terminal.innerHTML += `
            ____
            / _  |   Frida 16.0.19
        | (_| |
            > _  |   Hook script loaded
        /_/ |_|

        [+] Spawning com.secureapp...
        [+] Hooking isRooted()...
        [+] isRooted() called - returning false
        [+] Root check bypassed!
        [+] Admin Panel unlocked!

        Flag revealed: secXplore{r00t_d3t3ct_byp4ss3d}`;
            }
            else if (cmd === 'help') {
                terminal.innerHTML += `
        Available commands:
        - grep -r "isRooted" output/
        - cat output/sources/.../MainActivity.java
        - frida -U -f com.secureapp -l bypass.js
        - apktool d com.secureapp.apk`;
            }
            else if (cmd === 'clear') {
                terminal.innerHTML = `$ jadx -d output com.secureapp.apk
        Decompiling...

        Available commands:
        - cat output/sources/.../MainActivity.java (view code)
        - grep -r "isRooted" output/ (find root checks)
        - apktool d com.secureapp.apk (decompile to smali)
        - frida -U -f com.secureapp -l bypass.js (hook with Frida)
        - adb shell "su -c 'which su'" (check for su binary)`;
                input.value = '';
                return;
            }
            else {
                terminal.innerHTML += `
        bash: ${command}: command not found`;
            }
            
            input.value = '';
            const terminalContainer = terminal.closest('.terminal');
            terminalContainer.scrollTop = terminalContainer.scrollHeight;
            input.focus();
        }

        // SSL Pinning Command Executor
        function executeSSLPinCommand() {
            const input = document.getElementById('sslPinCommand');
            const command = input.value.trim();
            const terminal = document.getElementById('sslPinTerminal');
            
            if (!command) return;
            
            terminal.innerHTML += `\n$ ${command}`;
            
            const cmd = command.toLowerCase();
            
            if (cmd.includes('cat') && cmd.includes('networkmodule')) {
                terminal.innerHTML += `
        public class NetworkModule {
            private static OkHttpClient getClient() {
                CertificatePinner certificatePinner = new CertificatePinner.Builder()
                    .add("api.secureapp.com", "sha256/AAAAAAAAAAAAAAAAAAA...")
                    .build();
                
                return new OkHttpClient.Builder()
                    .certificatePinner(certificatePinner)
                    .build();
            }
        }

        OkHttp3 certificate pinning detected!`;
            }
            else if (cmd.includes('frida') && cmd.includes('ssl-bypass')) {
                terminal.innerHTML += `
        [+] Spawning app...
        [+] Hooking CertificatePinner.check()...
        [+] SSL pinning bypassed!
        [+] All certificates accepted
        [+] Ready to intercept HTTPS traffic

        Setup Burp proxy now`;
            }
            else if (cmd.includes('objection')) {
                terminal.innerHTML += `
            _   _         _   _
        ___| |_|_|___ ___| |_|_|___ ___
        | . | . | | -_|  _|  _| | . |   |
        |___|___|_|___|___|_| |_|___|_|_|

        [+] SSL pinning disabled
        [+] Certificate validation bypassed

        Run: android sslpinning disable`;
            }
            else if (cmd.includes('adb') && cmd.includes('proxy')) {
                terminal.innerHTML += `
        Proxy set to 127.0.0.1:8080
        Start Burp Suite to intercept traffic

        POST /v1/auth will contain flag in device_id field`;
            }
            else if (cmd === 'help') {
                terminal.innerHTML += `
        Available commands:
        - cat output/sources/.../NetworkModule.java
        - frida -U -f com.app -l ssl-bypass.js
        - objection -g com.app explore
        - adb shell settings put global http_proxy 127.0.0.1:8080`;
            }
            else if (cmd === 'clear') {
                terminal.innerHTML = `$ grep -r "CertificatePinner" output/
        Found SSL pinning implementation in NetworkModule.java

        Available commands:
        - cat output/sources/.../NetworkModule.java (view pinning code)
        - frida -U -f com.app -l ssl-bypass.js (bypass SSL pinning)
        - objection -g com.app explore (interactive bypass)
        - adb shell "settings put global http_proxy 192.168.1.100:8080" (set proxy)`;
                input.value = '';
                return;
            }
            else {
                terminal.innerHTML += `
        bash: ${command}: command not found`;
            }
            
            input.value = '';
            const terminalContainer = terminal.closest('.terminal');
            terminalContainer.scrollTop = terminalContainer.scrollHeight;
            input.focus();
        }

        // Native Library Command Executor
        function executeNativeCommand() {
            const input = document.getElementById('nativeCommand');
            const command = input.value.trim();
            const terminal = document.getElementById('nativeTerminal');
            
            if (!command) return;
            
            terminal.innerHTML += `\n$ ${command}`;
            
            const cmd = command.toLowerCase();
            
            if (cmd.includes('unzip') && cmd.includes('lib')) {
                terminal.innerHTML += `
        Archive:  com.app.apk
        inflating: lib/armeabi-v7a/libnative-lib.so

        Extracted successfully`;
            }
            else if (cmd.includes('file') && cmd.includes('libnative')) {
                terminal.innerHTML += `
        libnative-lib.so: ELF 32-bit LSB shared object, ARM, version 1 (SYSV), dynamically linked`;
            }
            else if (cmd.includes('objdump -d')) {
                terminal.innerHTML += `
        00001234 <Java_com_app_Native_encrypt>:
            1234:   push    {r4, r5, r6, lr}
            1238:   mov     r4, r0
            123c:   ldrb    r5, [r4], #1
            1240:   cmp     r5, #0
            1244:   beq     1270
            1248:   eor     r5, r5, #0x42    @ XOR with 0x42
            124c:   add     r5, r5, #0x10    @ ADD 0x10
            1250:   strb    r5, [r6], #1
            1254:   b       123c

        Encryption: XOR 0x42, then ADD 0x10`;
            }
            else if (cmd.includes('strings') && cmd.includes('flag')) {
                terminal.innerHTML += `
        JNI_OnLoad
        Java_com_app_Native_encrypt
        Encrypted: 93A7C3BFA3B793CBA3B793CFB3AF93BF93CFB3CF93B793C7
        libandroid.so
        libc.so

        Encrypted flag found in strings!`;
            }
            else if (cmd.includes('readelf -s')) {
                terminal.innerHTML += `
        Symbol table '.dynsym':
        Num:    Value  Size Type    Bind   Vis      Ndx Name
            45: 00001234   124 FUNC    GLOBAL DEFAULT   11 Java_com_app_Native_encrypt
            46: 00001358    64 FUNC    GLOBAL DEFAULT   11 Java_com_app_Native_decrypt`;
            }
            else if (cmd === 'help') {
                terminal.innerHTML += `
        Available commands:
        - unzip com.app.apk lib/armeabi-v7a/libnative-lib.so
        - file libnative-lib.so
        - objdump -d libnative-lib.so
        - strings libnative-lib.so | grep -i "flag"
        - readelf -s libnative-lib.so`;
            }
            else if (cmd === 'clear') {
                terminal.innerHTML = `$ unzip -l com.app.apk | grep ".so"
        1234567  lib/armeabi-v7a/libnative-lib.so
        2345678  lib/arm64-v8a/libnative-lib.so

        Available commands
        - unzip com.app.apk lib/armeabi-v7a/libnative-lib.so (extract SO)
        - file libnative-lib.so (check file type)
        - objdump -d libnative-lib.so (disassemble)
        - strings libnative-lib.so | grep -i "flag" (search strings)
        - readelf -s libnative-lib.so (view symbols)`;
                input.value = '';
                return;
            }
            else {
                terminal.innerHTML += `
        bash: ${command}: command not found`;
            }
            
            input.value = '';
            const terminalContainer = terminal.closest('.terminal');
            terminalContainer.scrollTop = terminalContainer.scrollHeight;
            input.focus();
        }

        // Root Detection Functions
        function analyzeRootChecks() {
            document.getElementById('rootOutput').innerHTML = `Analyzing root detection methods...

        Found 4 detection methods:
        1. ✓ Check for su binary in /system/bin and /system/xbin
        2. ✓ Check for root management apps (Magisk, SuperSU)
        3. ✓ Check Build.TAGS for "test-keys"
        4. ✓ Check write permission to /system

        All checks must return false to bypass.`;
        }

        function patchAPK() {
            document.getElementById('rootOutput').innerHTML = `Patching APK...

        1. Decompiling with apktool
        2. Modifying isRooted() method in smali
        3. Changing return value to false (0x0)
        4. Recompiling APK
        5. Signing with debug key

        ✓ Patched APK created!
        ✓ Install and run to access hidden features`;
        }

        function hookFunction() {
            document.getElementById('rootOutput').innerHTML = `Frida Hook Script:
        ==================

        Java.perform(function() {
            var MainActivity = Java.use("com.example.app.MainActivity");
            
            MainActivity.isRooted.implementation = function() {
                console.log("[+] isRooted() called - returning false");
                return false;
            };
        });

        <span style="color: var(--success);">✓ Hook injected! Root checks bypassed.</span>`;
        }

        function testBypass() {
            document.getElementById('rootOutput').innerHTML = `Testing bypass...

        Launching app with Frida hook...
        [+] isRooted() called - returning false
        [+] Root check bypassed!
        [+] Hidden "Admin Panel" button now visible
        [+] Accessing admin panel...

        Flag: secXplore{r00t_d3t3ct_byp4ss3d}

        <span style="color: var(--success);">✓ Bypass successful!</span>`;
        }

        // SSL Pinning Functions
        function analyzePinning() {
            document.getElementById('sslPinOutput').innerHTML = `Analyzing SSL pinning implementation...

        Certificate Pinning Type: OkHttp3 CertificatePinner
        Pinned Certificate SHA256:
        - api.secureapp.com: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=

        Implementation Location:
        - File: NetworkModule.java
        - Method: providesOkHttpClient()

        <span style="color: var(--warning);">Certificate pinning detected!</span>`;
        }

        function injectFrida() {
            document.getElementById('sslPinOutput').innerHTML = `Injecting Frida bypass script...

        $ frida -U -f com.example.app -l ssl-bypass.js

        [+] Spawning app...
        [+] Hooking CertificatePinner.check()...
        [+] SSL pinning bypassed!
        [+] All certificates now accepted

        <span style="color: var(--success);">✓ Frida script injected successfully!</span>`;
        }

        function interceptHTTPS() {
            document.getElementById('sslPinOutput').innerHTML = `Intercepting HTTPS traffic with Burp Suite...

        Configuring proxy: 127.0.0.1:8080
        Installing Burp CA certificate...
        Starting app with pinning bypassed...

        ✓ HTTPS traffic now visible in Burp Suite!
        ✓ Capturing requests...

        <span style="color: var(--success);">Ready to analyze traffic</span>`;
        }

        function extractAPIData() {
            document.getElementById('sslPinOutput').innerHTML = `Extracting data from API requests...

        POST https://api.secureapp.com/v1/auth
        Content-Type: application/json

        {
        "username": "admin",
        "password": "P@ssw0rd",
        "device_id": "secXplore{ssl_p1nn1ng_byp4ss3d}"
        }

        <span style="color: var(--success);">✓ Flag found in device_id field!</span>`;
        }

        // Native Library Functions
        function disassembleNative() {
            document.getElementById('nativeOutput').innerHTML = `Disassembling native library...

        $ arm-linux-gnueabi-objdump -d libnative-lib.so

        Found encrypt function at 0x1234:
        - XOR operation with 0x42
        - ADD operation with 0x10
        - Loop through each byte

        <span style="color: var(--success);">✓ Encryption algorithm identified!</span>`;
        }

        function analyzeEncryption() {
            document.getElementById('nativeOutput').innerHTML = `Analyzing encryption algorithm...

        Assembly Code Analysis:
        1. eor r5, r5, #0x42    ; XOR with 0x42
        2. add r5, r5, #0x10    ; ADD 0x10

        Encryption: byte = (input ^ 0x42) + 0x10
        Decryption: byte = (encrypted - 0x10) ^ 0x42

        <span style="color: var(--success);">✓ Algorithm reversed!</span>`;
        }

        function reverseAlgorithmNative() {
            document.getElementById('nativeOutput').innerHTML = `Reversing encryption algorithm...

        To decrypt:
        1. Subtract 0x10 from each byte
        2. XOR result with 0x42

        Python implementation:
        def decrypt(data):
            result = ""
            for byte in data:
                result += chr(((byte - 0x10) ^ 0x42))
            return result`;
        }

        function decryptFlag() {
            document.getElementById('nativeOutput').innerHTML = `Decrypting flag...

        Encrypted (hex): 93A7C3BFA3B793CBA3B793CFB3AF93BF93CFB3CF93B793C7

        Decrypting each byte:
        0x93 - 0x10 = 0x83, 0x83 ^ 0x42 = 0xC1 = 's'
        0xA7 - 0x10 = 0x97, 0x97 ^ 0x42 = 0xD5 = 'e'
        ...continues...

        Result: secXplore{n4t1v3_l1b_r3v3rs3d}

        <span style="color: var(--success);">✓ Flag decrypted successfully!</span>`;
        }
        function confirmBackToCategory() {
    // สร้าง custom confirm dialog
            const confirmDialog = document.createElement('div');
            confirmDialog.className = 'confirm-overlay';
            confirmDialog.innerHTML = `
                <div class="confirm-dialog">
                    <h3>⚠️ ออกจากโจทย์?</h3>
                    <p>คุณต้องการออกจากโจทย์นี้หรือไม่?</p>
                    <p style="color: var(--warning); font-size: 0.9rem;">
                        ความคืบหน้าในโจทย์นี้จะไม่ถูกบันทึก
                    </p>
                    <div class="confirm-buttons">
                        <button class="btn-cancel" onclick="closeConfirmDialog()">
                            ยกเลิก
                        </button>
                        <button class="btn-confirm" onclick="confirmExit()">
                            ออกจากโจทย์
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(confirmDialog);
            
            // Animate in
            setTimeout(() => confirmDialog.classList.add('show'), 10);
        }

        function closeConfirmDialog() {
            const dialog = document.querySelector('.confirm-overlay');
            if (dialog) {
                dialog.classList.remove('show');
                setTimeout(() => dialog.remove(), 300);
            }
        }

        function confirmExit() {
            closeConfirmDialog();
            closeInteractiveModal();
        }
        function closeInteractiveModal() {
            document.getElementById('interactiveModal').classList.remove('active');
        }

        document.addEventListener('DOMContentLoaded', function() {
            createParticles();
            
            // Removed backdrop click to prevent accidental closing
            // Only allow closing via close button (X)

            // Removed ESC key closing to prevent accidental closing
        });

// ============================================
// RSA CRYPTANALYSIS FUNCTIONS
// ============================================
function analyzeRSA() {
    document.getElementById('rsaOutput').innerHTML = `RSA Public Key Analysis:
==========================

Public Key Parameters:
n = 8051 (modulus)
e = 3 (public exponent)

Security Analysis:
------------------
<span style="color: var(--danger);">✗ CRITICAL: n is too small (only 8051)</span>
<span style="color: var(--danger);">✗ CRITICAL: e is too small (only 3)</span>
<span style="color: var(--warning);">✗ Small n can be factored easily</span>
<span style="color: var(--warning);">✗ Small e vulnerable to low exponent attacks</span>

<span style="color: var(--warning);">⚠️ This RSA implementation is WEAK!</span>

Next step: Factor n to find prime factors p and q`;
}

function factorRSA() {
    document.getElementById('rsaOutput').innerHTML = `Factoring n = 8051:
====================

Method: Trial division
Testing prime numbers...

Checking: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47...
...continuing...
Checking: 53, 59, 61, 67, 71, 73, 79, 83...

<span style="color: var(--success);">✓ Found factor: 83</span>
8051 ÷ 83 = 97

<span style="color: var(--success);">✓ Found factor: 97</span>

Prime Factorization:
--------------------
p = 83
q = 97
n = p × q = 8,051 ✓

Verification: 83 × 97 = 8,051 ✓

<span style="color: var(--success);">Now we can calculate the private key (d)!</span>`;
}

function calculatePrivateKey() {
    document.getElementById('rsaOutput').innerHTML = `Calculating Private Key:
=========================

Known values:
p = 83
q = 97
n = 8,051
e = 3

<strong>Step 1: Calculate φ(n) [Euler's Totient]</strong>
φ(n) = (p - 1) × (q - 1)
φ(n) = (83 - 1) × (97 - 1)
φ(n) = 82 × 96
φ(n) = 7,872

<strong>Step 2: Calculate d (private exponent)</strong>
Formula: d × e ≡ 1 (mod φ(n))
Need to find: d × 3 ≡ 1 (mod 7,872)

Using Extended Euclidean Algorithm:
3 × d ≡ 1 (mod 7,872)
d = 5,248

<strong>Verification:</strong>
(d × e) mod φ(n) = (5,248 × 3) mod 7,872
= 15,744 mod 7,872
= 1 ✓

<span style="color: var(--success); font-size: 1.1em;">Private Key: d = 5,248</span>

Ready to decrypt the message!`;
}

function decryptRSA() {
    document.getElementById('rsaOutput').innerHTML = `Decrypting RSA Message:
========================

Ciphertext blocks:
c = [5347, 4096, 729, 3584, 6859, 5832, 4913]

Private Key: d = 5,248
Modulus: n = 8,051

<strong>Decryption formula: m = c^d mod n</strong>

Decrypting each block:
---------------------
5347^5248 mod 8051 = 115 → 's'
4096^5248 mod 8051 = 101 → 'e'
729^5248 mod 8051 = 99 → 'c'
3584^5248 mod 8051 = 88 → 'X'
6859^5248 mod 8051 = 112 → 'p'
5832^5248 mod 8051 = 108 → 'l'
4913^5248 mod 8051 = 111 → 'o'

Continuing decryption...
6859^5248 mod 8051 = 114 → 'r'
6859^5248 mod 8051 = 101 → 'e'
729^5248 mod 8051 = 123 → '{'
...more blocks...
125^5248 mod 8051 = 125 → '}'

<span style="color: var(--success); font-size: 1.3em;">
Decrypted Message: secXplore{rs4_w34k_k3y_br0k3n}
</span>

<span style="color: var(--success);">✓ RSA decryption successful! This is your flag.</span>`;
}

// ============================================
// CUSTOM CIPHER FUNCTIONS (IMPROVED)
// ============================================
function analyzeCustomCipher() {
    document.getElementById('customOutput').innerHTML = `Analyzing Custom Cipher:
=========================

Encrypted: QnBwWmtwcGVkZntkaDRfaDRlX2UzYWN2YTNfcGYza2V9

<strong>Properties Detected:</strong>
--------------------
✓ Length: 46 characters
✓ Character set: A-Z, a-z, 0-9, +, /
✓ Ends with '=' (padding character)
✓ Length is multiple of 4

<strong>Pattern Analysis:</strong>
• Only contains Base64-valid characters
• Proper padding structure
• No spaces or special characters

<span style="color: var(--warning);">⚠️ This appears to be Base64 encoding!</span>
<span style="color: var(--secondary);">But the result may not be plaintext...</span>

<strong>Next Step:</strong> Try Base64 decoding first`;
}

function decodeCustomBase64() {
    document.getElementById('customOutput').innerHTML = `Base64 Decoding:
=================

Input: QnBwWmtwcGVkZntkaDRfaDRlX2UzYWN2YTNfcGYza2V9

<strong>Decoding Base64...</strong>

Result (hex bytes):
42 70 70 5a 6b 70 70 65 64 66 7b 64 68 34 5f 
68 34 65 5f 65 33 61 63 76 61 33 5f 70 66 33 6b 65 7d

Result (ASCII):
<span style="color: var(--secondary);">BppZkppedf{dh4_h4e_e3acva3_pf3ke}</span>

<span style="color: var(--warning);">⚠️ Still encrypted! Not readable plaintext.</span>

<strong>Pattern Analysis:</strong>
-----------------
• Starts with capital letter (B)
• Contains '{' and '}' (flag format preserved)
• Mix of letters and numbers
• Looks like substitution cipher

<strong>Observation:</strong>
Expected: secXplore{...}
Got: BppZkppedf{...}

Letter shifts:
s → B (+13 or -13 depending on direction)
e → p (+11 or -11)
c → p (+13 or -13)

<span style="color: var(--primary);">💡 Pattern: Alternating Caesar shifts!</span>

Next: Apply reverse alternating shifts`;
}

function applyROT13Custom() {
    document.getElementById('customOutput').innerHTML = `Applying ROT13:
================

Input: BppZkppedf{dh4_h4e_e3acva3_pf3ke}

<strong>ROT13 Algorithm:</strong>
A→N, B→O, C→P, D→Q, E→R, F→S, G→T...
N→A, O→B, P→C, Q→D, R→E, S→F, T→G...

<strong>Processing each character:</strong>
B → O
p → c
p → c
Z → M
k → x
p → c
p → c
e → r
d → q
f → s
{ → {
d → q
h → u
4 → 4
...

Result: <span style="color: var(--secondary);">OccMxccrqs{qu4_u4r_r3npin3_cs3xr}</span>

<span style="color: var(--danger);">✗ Still not readable! ROT13 alone doesn't work.</span>

<span style="color: var(--warning);">The cipher uses alternating shifts, not uniform ROT13!</span>`;
}

function bruteForceRotation() {
    document.getElementById('customOutput').innerHTML = `Brute Force All Caesar Rotations:
===================================

Testing ROT1 through ROT25 on: BppZkppedf{dh4_h4e_e3acva3_pf3ke}

ROT1: CqqArlqqfeg{ei4_i4f_f3bdwb3_qg3lf}
ROT2: DrrBsmmrfgh{fj4_j4g_g3cexc3_rh3mg}
ROT3: EssCtnnsigh{gk4_k4h_h3dfyd3_si3nh}
ROT4: FttDuootjhi{hl4_l4i_i3egze3_tj3oi}
ROT5: GuuEvppukij{im4_m4j_j3fhaf3_uk3pj}
...
ROT10: LzzJauuzpno{rn4_r4o_o3mmck3_zp3uo}
ROT11: MaaKbvvaqop{so4_s4p_p3nndl3_aq3vp}
ROT12: NbbLcwwbrpq{tp4_t4q_q3ooem3_br3wq}
<span style="color: var(--secondary);">ROT13: OccMxccrrqs{uq4_u4r_r3ppfn3_cs3xr}</span>
ROT14: PddNyddssrt{vr4_v4s_s3qqgo3_dt3ys}
...
ROT23: WkkUfkkzzaa{ea4_e4b_b3zzps3_mc3hb}
ROT24: XllVgllaaab{fb4_f4c_c3aaqt3_nd3ic}
ROT25: YmmWhmmbbbc{gc4_g4d_d3bbru3_oe3jd}

<span style="color: var(--danger);">✗ None of the rotations produce readable text!</span>

<strong>Why?</strong> Because it uses <span style="color: var(--primary);">ALTERNATING shifts</span>, not a single uniform rotation!

<strong>Solution:</strong> Apply different shifts to alternating positions:
- Position 0, 2, 4, 6... : shift -13
- Position 1, 3, 5, 7... : shift -11`;
}

function decodeCustomAll() {
    document.getElementById('customOutput').innerHTML = `Complete Decryption Process:
=============================

<strong>Layer 1: Base64 Decode</strong>
Input: QnBwWmtwcGVkZntkaDRfaDRlX2UzYWN2YTNfcGYza2V9
Output: BppZkppedf{dh4_h4e_e3acva3_pf3ke}

<strong>Layer 2: Pattern Analysis</strong>
Expected flag format: secXplore{...}
Current: BppZkppedf{...}

Letter mapping analysis:
s (115) → B (66) : shift of -49 ≡ +13 (mod 26)
e (101) → p (112) : shift of +11
c (99) → p (112) : shift of +13
X (88) → Z (90) : shift of +2

<span style="color: var(--primary);">Pattern detected: Alternating shifts of +13 and +11!</span>

<strong>Layer 3: Reverse Alternating Caesar</strong>
Applying reverse shifts (-13, -11, -13, -11, ...):

Position 0: B - 13 = s (with wraparound)
Position 1: p - 11 = e
Position 2: p - 13 = c
Position 3: Z - 11 = X (with wraparound)
Position 4: k - 13 = p
Position 5: p - 11 = l
Position 6: p - 13 = o
Position 7: e - 11 = r
Position 8: d - 13 = e
Position 9: f - 11 = {
Position 10: { - 0 = {
Position 11: d - 13 = c
Position 12: h - 11 = u
Position 13: 4 = 4
Position 14: _ = _
Position 15: h - 13 = t
Position 16: 4 = 4
Position 17: e - 11 = m
Position 18: _ = _
Position 19: e - 13 = c
Position 20: 3 = 3
Position 21: a - 11 = r
Position 22: c - 13 = y
Position 23: v - 11 = p
Position 24: a - 13 = t
Position 25: 3 = 3
Position 26: _ = _
Position 27: p - 13 = b
Position 28: f - 11 = r
Position 29: 3 = 3
Position 30: k - 13 = a
Position 31: e - 11 = k
Position 32: } = }

<span style="color: var(--success); font-size: 1.4em;">
✓ Final Result: secXplore{cu4_t4m_c3rypt3_br3ak}
</span>

<span style="color: var(--success);">
✓ Multi-layer cipher successfully cracked!
✓ Layers: Base64 → Alternating Caesar(-13/-11)
</span>`;
}
// === Expose functions for HTML onclick ===
// ให้เรียกได้จาก onclick="..." ใน challenge.html และ interactive templates

// ปุ่มเลือกหมวด / เปิด–ปิด modal หลัก
window.openChallengeList = openChallengeList;
window.openInteractiveChallenge = openInteractiveChallenge;
window.closeModal = closeModal;
window.confirmBackToCategory = confirmBackToCategory;

// ระบบ Hint + login bypass (SQL Injection)
window.toggleHint = toggleHint;
window.attemptSQLLogin = attemptSQLLogin;
window.checkFlag = checkFlag;

// Command Injection lab
window.executeCMD = executeCMD;

// XSS lab
window.submitXSS = submitXSS;

// Crypto tools / XOR / RSA ฯลฯ
window.applyOperation = applyOperation;
window.calculateXor = calculateXor;
window.calculateRsaPrivateKey = calculateRsaPrivateKey;
window.decryptRsaMessage = decryptRsaMessage;
window.decryptWithXorKey = decryptWithXorKey;
window.showPublicKey = showPublicKey;
window.testPrimeFactor = testPrimeFactor;

// Clipboard / UI helper
window.copyToClipboard = copyToClipboard;

// Dialog ยืนยัน / multi-step challenge
window.closeHintConfirmDialog = closeHintConfirmDialog;
window.confirmHint = confirmHint;
window.closeConfirmDialog = closeConfirmDialog;
window.confirmExit = confirmExit;

window.processMultiStep1 = processMultiStep1;
window.processMultiStep2 = processMultiStep2;
window.processMultiStep3 = processMultiStep3;
window.processMultiStep4 = processMultiStep4;

// JWT lab
window.createHS256 = createHS256;
window.decodeJWT = decodeJWT;
window.verifyJWT = verifyJWT;


});
