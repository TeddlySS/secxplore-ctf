import { supabase } from './supabaseClient.js';
import { setupNavUser } from './navAuth.js';
// Create Particles
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

        // Animate Stats Counter
        function animateValue(element, start, end, duration) {
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const value = Math.floor(progress * (end - start) + start);
                element.textContent = value + (element.id === 'totalUsers' || element.id === 'totalSolves' ? '+' : '');
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                }
            };
            window.requestAnimationFrame(step);
        }

        // Intersection Observer for Stats Animation
        const observerOptions = {
            threshold: 0.5
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const statsSection = entry.target;
                    animateValue(document.getElementById('totalChallenges'), 0, 24, 2000);
                    animateValue(document.getElementById('totalUsers'), 0, 150, 2000);
                    animateValue(document.getElementById('totalSolves'), 0, 890, 2000);
                    observer.unobserve(statsSection);
                }
            });
        }, observerOptions);

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            createParticles();
            setupNavUser();
            
            const statsSection = document.querySelector('.stats-section');
            if (statsSection) {
                observer.observe(statsSection);
            }
        });