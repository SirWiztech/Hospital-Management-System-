/* ============================================
   Vitalis HMS — Landing Page JavaScript
   ============================================ */

(function() {
    'use strict';

    /* ================================================================
       NAVBAR — Scroll State & Active Link Tracking
       ================================================================ */
    var navbar = document.getElementById('navbar');
    var navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    var sections = document.querySelectorAll('section[id]');

    function updateNavbar() {
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > 60) {
            navbar.classList.add('scrolled');
            navbar.classList.remove('at-top');
        } else {
            navbar.classList.remove('scrolled');
            navbar.classList.add('at-top');
        }
    }

    function updateActiveLink() {
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        var offset = 120;

        sections.forEach(function(section) {
            var top = section.offsetTop - offset;
            var bottom = top + section.offsetHeight;
            var id = section.getAttribute('id');

            navLinks.forEach(function(link) {
                if (link.getAttribute('href') === '#' + id) {
                    if (scrollTop >= top && scrollTop < bottom) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                }
            });
        });
    }

    /* ================================================================
       MOBILE MENU
       ================================================================ */
    var navToggle = document.getElementById('navToggle');
    var navMobile = document.getElementById('navMobile');
    var mobileLinks = navMobile ? navMobile.querySelectorAll('.nav-link') : [];

    if (navToggle && navMobile) {
        navToggle.addEventListener('click', function() {
            navToggle.classList.toggle('open');
            navMobile.classList.toggle('open');
            document.body.style.overflow = navMobile.classList.contains('open') ? 'hidden' : '';
        });

        mobileLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                navToggle.classList.remove('open');
                navMobile.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    /* ================================================================
       HERO VIDEO — Auto-play with Image Slider Fallback
       ================================================================ */
    var heroVideo = document.getElementById('heroVideo');
    var heroSlider = document.getElementById('heroSlider');
    var videoReady = false;

    if (heroVideo) {
        heroVideo.addEventListener('canplaythrough', function() {
            videoReady = true;
            heroVideo.play().then(function() {
                heroVideo.classList.add('playing');
            }).catch(function() {
                // Autoplay blocked — slider stays visible
                videoReady = false;
            });
        });

        heroVideo.addEventListener('error', function() {
            videoReady = false;
        });

        // If video doesn't load within 3s, keep slider
        setTimeout(function() {
            if (!videoReady && heroSlider) {
                heroSlider.style.opacity = '1';
            }
        }, 3000);
    }

    /* ================================================================
       HERO IMAGE SLIDER
       ================================================================ */
    var slides = document.querySelectorAll('.hero-slide');
    var dotsContainer = document.getElementById('sliderDots');
    var currentSlide = 0;
    var slideInterval = null;
    var SLIDE_DURATION = 6000;

    // Build dots
    if (dotsContainer && slides.length > 0) {
        slides.forEach(function(_, i) {
            var dot = document.createElement('div');
            dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
            dot.addEventListener('click', function() {
                goToSlide(i);
                resetInterval();
            });
            dotsContainer.appendChild(dot);
        });
    }

    var dots = document.querySelectorAll('.slider-dot');

    function goToSlide(index) {
        slides[currentSlide].classList.remove('active');
        if (dots[currentSlide]) {
            dots[currentSlide].classList.remove('active');
            // Reset the progress animation
            var afterEl = dots[currentSlide].querySelector('::after');
            dots[currentSlide].style.setProperty('--reset', 'true');
        }

        currentSlide = index;

        slides[currentSlide].classList.add('active');
        if (dots[currentSlide]) {
            dots[currentSlide].classList.remove('active');
            // Force reflow to restart CSS transition
            void dots[currentSlide].offsetWidth;
            dots[currentSlide].classList.add('active');
        }
    }

    function nextSlide() {
        var next = (currentSlide + 1) % slides.length;
        goToSlide(next);
    }

    function resetInterval() {
        if (slideInterval) clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, SLIDE_DURATION);
    }

    // Start slider (only runs if video isn't playing)
    if (slides.length > 1) {
        resetInterval();
    }

    // Pause slider when video is playing
    function checkVideoState() {
        if (heroVideo && heroVideo.classList.contains('playing')) {
            if (slideInterval) clearInterval(slideInterval);
        } else {
            if (!slideInterval && slides.length > 1) {
                resetInterval();
            }
        }
    }

    if (heroVideo) {
        heroVideo.addEventListener('playing', checkVideoState);
    }

    /* ================================================================
       HERO PARTICLES
       ================================================================ */
    var particlesContainer = document.getElementById('heroParticles');

    if (particlesContainer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        var particleCount = 25;

        for (var i = 0; i < particleCount; i++) {
            var particle = document.createElement('div');
            particle.className = 'hero-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.width = (Math.random() * 3 + 1) + 'px';
            particle.style.height = particle.style.width;
            particle.style.animationDuration = (Math.random() * 12 + 8) + 's';
            particle.style.animationDelay = (Math.random() * 10) + 's';
            particle.style.opacity = (Math.random() * 0.3 + 0.05).toString();
            particlesContainer.appendChild(particle);
        }
    }

    /* ================================================================
       UNIFIED SCROLL HANDLER
       ================================================================ */
    var ticking = false;

    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(function() {
                updateNavbar();
                updateActiveLink();
                ticking = false;
            });
            ticking = true;
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // Initial calls
    updateNavbar();
    updateActiveLink();

    /* ================================================================
       SMOOTH SCROLL FOR ANCHOR LINKS
       ================================================================ */
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            var targetId = this.getAttribute('href');
            if (targetId === '#') return;
            var target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                var offsetTop = target.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

})();