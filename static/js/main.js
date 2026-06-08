/**
 * Hands Tracker - Main Page JavaScript
 * Animations, particles, and interactive effects
 */

document.addEventListener('DOMContentLoaded', function() {
    initParticles();
    initScrollAnimations();
    initHologramEffect();
});

// Particle System
function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        // Random properties
        const size = Math.random() * 4 + 2;
        const left = Math.random() * 100;
        const delay = Math.random() * 15;
        const duration = Math.random() * 10 + 10;

        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = left + '%';
        particle.style.animationDelay = delay + 's';
        particle.style.animationDuration = duration + 's';

        // Random colors
        const colors = ['#00f0ff', '#ff00a0', '#ffea00', '#00ff88'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.boxShadow = `0 0 ${size * 2}px ${particle.style.background}`;

        container.appendChild(particle);
    }
}

// Scroll Animations
function initScrollAnimations() {
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

    // Observe feature cards
    document.querySelectorAll('.feature-card, .step-card, .tech-item, .contact-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Hologram Effect
function initHologramEffect() {
    const hand = document.querySelector('.hologram-hand i');
    if (!hand) return;

    const gestures = ['fa-hand-paper', 'fa-hand-peace', 'fa-hand-rock', 'fa-hand-point-up', 'fa-thumbs-up', 'fa-hand-sparkles'];
    let current = 0;

    setInterval(() => {
        current = (current + 1) % gestures.length;
        hand.className = 'fas ' + gestures[current];
    }, 2000);
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
