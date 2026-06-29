/* ============================================
   Vitalis HMS — Core JavaScript (Enhanced)
   ============================================ */

(function() {
    'use strict';

    /* ---- Cursor Glow ---- */
    var cursorGlow = document.getElementById('cursorGlow');
    var cursorActive = false;

    if (cursorGlow && window.matchMedia('(pointer: fine)').matches) {
        document.addEventListener('mousemove', function(e) {
            if (!cursorActive) {
                cursorGlow.classList.add('active');
                cursorActive = true;
            }
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
        });

        document.addEventListener('mouseleave', function() {
            cursorGlow.classList.remove('active');
            cursorActive = false;
        });
    }

    /* ---- Button Ripple Effect ---- */
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.btn');
        if (!btn) return;
        var rect = btn.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width) * 100;
        var y = ((e.clientY - rect.top) / rect.height) * 100;
        btn.style.setProperty('--ripple-x', x + '%');
        btn.style.setProperty('--ripple-y', y + '%');
    });

    /* ---- Scroll Progress Bar ---- */
    var scrollProgress = document.getElementById('scrollProgress');

    function updateScrollProgress() {
        if (!scrollProgress) return;
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        scrollProgress.style.width = progress + '%';
    }

    /* ---- Scroll Arrow Button ---- */
    var scrollArrow = document.getElementById('scrollArrow');
    var scrollArrowBtn = document.getElementById('scrollArrowBtn');
    var scrollArrowProgress = document.getElementById('scrollArrowProgress');
    var arrowCircumference = 2 * Math.PI * 23; // r=23
    var isAtTop = true;

    function updateScrollArrow() {
        if (!scrollArrow || !scrollArrowProgress) return;
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var progress = docHeight > 0 ? scrollTop / docHeight : 0;

        // Show arrow after scrolling past hero
        var heroHeight = window.innerHeight;
        if (scrollTop > heroHeight * 0.5) {
            scrollArrow.classList.add('visible');
        } else {
            scrollArrow.classList.remove('visible');
        }

        // Update progress ring
        var offset = arrowCircumference - (progress * arrowCircumference);
        scrollArrowProgress.style.strokeDashoffset = offset;

        // Toggle direction
        if (scrollTop > heroHeight * 0.8) {
            scrollArrow.classList.add('scroll-up');
            isAtTop = false;
        } else {
            scrollArrow.classList.remove('scroll-up');
            isAtTop = true;
        }
    }

    if (scrollArrowBtn) {
        scrollArrowBtn.addEventListener('click', function() {
            if (isAtTop) {
                // Scroll down to features
                var features = document.getElementById('features');
                if (features) {
                    features.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    /* ---- Reveal on Scroll (IntersectionObserver) ---- */
    var revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');

    if ('IntersectionObserver' in window) {
        var revealObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -40px 0px'
        });

        revealElements.forEach(function(el) {
            revealObserver.observe(el);
        });
    } else {
        // Fallback: show everything
        revealElements.forEach(function(el) {
            el.classList.add('visible');
        });
    }

    /* ---- Stat Counter Animation ---- */
    var statNumbers = document.querySelectorAll('.stat-number[data-target]');
    var statsAnimated = false;

    function animateCounters() {
        if (statsAnimated) return;
        statNumbers.forEach(function(el) {
            var target = parseFloat(el.getAttribute('data-target'));
            var suffix = el.getAttribute('data-suffix') || '';
            var isDecimal = el.getAttribute('data-decimal') === 'true';
            var duration = 2000;
            var startTime = null;

            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                var elapsed = timestamp - startTime;
                var progress = Math.min(elapsed / duration, 1);

                // Ease out cubic
                var eased = 1 - Math.pow(1 - progress, 3);
                var current = eased * target;

                if (isDecimal) {
                    el.innerHTML = current.toFixed(2) + '<span class="suffix">' + suffix + '</span>';
                } else {
                    el.innerHTML = Math.floor(current).toLocaleString() + '<span class="suffix">' + suffix + '</span>';
                }

                if (progress < 1) {
                    requestAnimationFrame(step);
                }
            }

            requestAnimationFrame(step);
        });
        statsAnimated = true;
    }

    if (statNumbers.length > 0 && 'IntersectionObserver' in window) {
        var statsObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    animateCounters();
                    statsObserver.disconnect();
                }
            });
        }, { threshold: 0.3 });

        var statsSection = document.getElementById('stats');
        if (statsSection) {
            statsObserver.observe(statsSection);
        }
    }

    /* ---- 3D Tilt on Feature Cards ---- */
    var tiltCards = document.querySelectorAll('[data-tilt]');

    tiltCards.forEach(function(card) {
        card.addEventListener('mousemove', function(e) {
            var rect = card.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var centerX = rect.width / 2;
            var centerY = rect.height / 2;
            var rotateX = ((y - centerY) / centerY) * -4;
            var rotateY = ((x - centerX) / centerX) * 4;

            card.style.transform = 'translateY(-6px) perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)';
        });

        card.addEventListener('mouseleave', function() {
            card.style.transform = 'translateY(0) perspective(800px) rotateX(0deg) rotateY(0deg)';
        });
    });

    /* ---- Unified Scroll Handler ---- */
    var ticking = false;

    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(function() {
                updateScrollProgress();
                updateScrollArrow();
                ticking = false;
            });
            ticking = true;
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // Initial call
    updateScrollProgress();
    updateScrollArrow();

})();