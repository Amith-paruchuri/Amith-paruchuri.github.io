/* Site interactions and animations. Uses Motion (motion.dev), loaded as window.Motion. */
(function () {
    var M = window.Motion;
    var root = document.documentElement;
    var animated = root.classList.contains('js') && !!M;
    if (M) window.__motionReady = true;
    if (!animated) { root.classList.remove('js'); root.classList.add('no-js'); }

    var $ = function (s, c) { return (c || document).querySelector(s); };
    var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var EASE = [0.22, 1, 0.36, 1];

    /* ── Hero neural network: drifting nodes that wire up to the pointer ── */
    (function neural() {
        var cv = $('.neural');
        if (!cv || !cv.getContext) return;
        var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!finePointer || reducedMotion) { cv.remove(); return; }
        var ctx = cv.getContext('2d'), W = 0, H = 0, nodes = [], running = false, visible = true;
        var m = { x: -9999, y: -9999, on: false };
        var LINK = 120, REACH = 170;
        var rgb = '124,42,42';

        function size() {
            var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
            W = r.width; H = r.height;
            cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            var target = Math.min(110, Math.round(W * H / 11000));
            while (nodes.length < target) nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .32, vy: (Math.random() - .5) * .32, r: 1 + Math.random() * 1.5 });
            nodes.length = target;
        }

        window.addEventListener('pointermove', function (e) {
            if (e.pointerType === 'touch') return;
            var r = cv.getBoundingClientRect();
            m.x = e.clientX - r.left; m.y = e.clientY - r.top;
            m.on = m.y >= 0 && m.y <= H;
        }, { passive: true });
        document.addEventListener('pointerleave', function () { m.on = false; });

        function frame() {
            if (!visible) { running = false; return; }
            ctx.clearRect(0, 0, W, H);
            for (var i = 0; i < nodes.length; i++) {
                var p = nodes[i];
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > W) p.vx *= -1;
                if (p.y < 0 || p.y > H) p.vy *= -1;
                var dx = m.x - p.x, dy = m.y - p.y, dm = Math.sqrt(dx * dx + dy * dy), near = m.on && dm < REACH;
                if (near) { p.x += dx * 0.004; p.y += dy * 0.004; }
                for (var j = i + 1; j < nodes.length; j++) {
                    var q = nodes[j], ex = p.x - q.x, ey = p.y - q.y;
                    if (Math.abs(ex) > LINK || Math.abs(ey) > LINK) continue;
                    var d = Math.sqrt(ex * ex + ey * ey);
                    if (d < LINK) {
                        ctx.strokeStyle = 'rgba(' + rgb + ',' + (0.13 * (1 - d / LINK)).toFixed(3) + ')';
                        ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
                    }
                }
                if (near) {
                    ctx.strokeStyle = 'rgba(' + rgb + ',' + (0.5 * (1 - dm / REACH)).toFixed(3) + ')';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(m.x, m.y); ctx.stroke();
                }
                ctx.fillStyle = 'rgba(' + rgb + ',' + (near ? 0.85 : 0.3) + ')';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (near ? 0.8 : 0), 0, 6.2832); ctx.fill();
            }
            requestAnimationFrame(frame);
        }
        function start() { if (!running) { running = true; requestAnimationFrame(frame); } }

        size();
        var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(size, 150); });
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }).observe(cv);
        }
        document.addEventListener('visibilitychange', function () { visible = !document.hidden; if (visible) start(); });
        start();
        if (animated) M.animate(cv, { opacity: [0, 1] }, { duration: 1.6, delay: 0.4 });
    })();

    /* ── Project filter counts and no-figure cards ── */
    var cards = $$('.project-card');
    cards.forEach(function (c) { if (!$('.card-figure', c)) c.classList.add('no-figure'); });
    var btns = $$('.filter-btn');
    btns.forEach(function (b) {
        var f = b.dataset.filter;
        var n = f === 'all' ? cards.length : cards.filter(function (c) { return c.dataset.category.split(' ').indexOf(f) > -1; }).length;
        var span = document.createElement('span');
        span.className = 'count';
        span.textContent = n;
        b.appendChild(span);
    });

    /* ── Nav: scrolled state + active section ── */
    var nav = $('nav');
    var links = $$('.nav-links a');
    var pill = $('.nav-pill');
    var current = null;

    function movePill(a, instant) {
        if (!pill) return;
        if (!a) { pill.style.opacity = 0; return; }
        var x = a.offsetLeft, w = a.offsetWidth;
        if (animated && !instant && pill.style.opacity === '1') {
            M.animate(pill, { x: x, width: w }, { type: 'spring', stiffness: 420, damping: 36 });
        } else {
            pill.style.transform = 'translateX(' + x + 'px)';
            pill.style.width = w + 'px';
        }
        pill.style.opacity = 1;
        if (a.scrollIntoView && window.innerWidth < 680) {
            var box = a.parentElement;
            box.scrollTo({ left: x - box.clientWidth / 2 + w / 2, behavior: 'smooth' });
        }
    }

    function updateNav() {
        nav.classList.toggle('scrolled', window.scrollY > 8);
        var mid = window.innerHeight * 0.35, active = null;
        links.forEach(function (a) {
            var sec = document.querySelector(a.getAttribute('href'));
            if (sec && sec.getBoundingClientRect().top <= mid) active = a;
        });
        if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) active = links[links.length - 1];
        if (active !== current) {
            links.forEach(function (a) { a.classList.toggle('active', a === active); });
            movePill(active);
            current = active;
        }
    }
    window.addEventListener('scroll', updateNav, { passive: true });
    window.addEventListener('resize', function () { movePill(current, true); });
    updateNav();

    /* ── Lightbox (no captions) ── */
    var lb = $('.lightbox'), lbImg = $('.lightbox img');
    function openLb(src, alt) {
        lbImg.src = src; lbImg.alt = alt || '';
        lb.classList.add('open');
        document.body.style.overflow = 'hidden';
        if (animated) {
            M.animate(lb, { opacity: [0, 1] }, { duration: 0.25 });
            M.animate(lbImg, { opacity: [0, 1], scale: [0.92, 1], y: [16, 0] }, { type: 'spring', stiffness: 260, damping: 26 });
        }
    }
    function closeLb() {
        var done = function () { lb.classList.remove('open'); document.body.style.overflow = ''; };
        if (animated) M.animate(lb, { opacity: 0 }, { duration: 0.2 }).then(done); else done();
    }
    $$('.card-figure').forEach(function (fig) {
        var img = $('img', fig);
        fig.setAttribute('tabindex', '0');
        fig.setAttribute('role', 'button');
        fig.setAttribute('aria-label', 'Enlarge figure: ' + (img.alt || ''));
        fig.addEventListener('click', function () { openLb(img.src, img.alt); });
        fig.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(img.src, img.alt); } });
    });
    lb.addEventListener('click', closeLb);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb.classList.contains('open')) closeLb(); });

    /* ── Project filters ── */
    var row = $('.filter-row');
    var fpill = document.createElement('span');
    fpill.className = 'filter-pill';
    row.appendChild(fpill);
    row.classList.add('has-pill');
    function placeFilterPill(btn, instant) {
        var props = { x: btn.offsetLeft, y: btn.offsetTop, width: btn.offsetWidth, height: btn.offsetHeight };
        if (animated && !instant) {
            M.animate(fpill, props, { type: 'spring', stiffness: 380, damping: 32 });
        } else {
            fpill.style.transform = 'translate(' + props.x + 'px,' + props.y + 'px)';
            fpill.style.width = props.width + 'px';
            fpill.style.height = props.height + 'px';
        }
    }
    placeFilterPill($('.filter-btn.active'), true);
    window.addEventListener('resize', function () { placeFilterPill($('.filter-btn.active'), true); });

    var filtering = false;
    btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (btn.classList.contains('active') || filtering) return;
            btns.forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            placeFilterPill(btn);
            var f = btn.dataset.filter;
            var match = function (c) { return f === 'all' || c.dataset.category.split(' ').indexOf(f) > -1; };

            if (!animated) {
                cards.forEach(function (c) { c.classList.toggle('hidden', !match(c)); });
                return;
            }
            filtering = true;
            var visible = cards.filter(function (c) { return !c.classList.contains('hidden'); });
            M.animate(visible, { opacity: 0, y: 12, scale: 0.98 }, { duration: 0.22, ease: 'easeIn' }).then(function () {
                cards.forEach(function (c) { c.classList.toggle('hidden', !match(c)); });
                var shown = cards.filter(match);
                shown.forEach(function (c) { c.style.opacity = 0; });
                M.animate(shown, { opacity: [0, 1], y: [24, 0], scale: [0.98, 1] },
                    { delay: M.stagger(0.05), duration: 0.55, ease: EASE }).then(function () { filtering = false; });
                var grid = $('.project-grid');
                var top = grid.getBoundingClientRect().top;
                if (top < 0) window.scrollTo({ top: window.scrollY + top - 140, behavior: 'smooth' });
            });
        });
    });
    btns.forEach(function (b) { b.setAttribute('aria-pressed', b.classList.contains('active') ? 'true' : 'false'); });

    /* ── Card cursor spotlight ── */
    if (finePointer) {
        cards.forEach(function (c) {
            c.addEventListener('pointermove', function (e) {
                var r = c.getBoundingClientRect();
                c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                c.style.setProperty('--my', (e.clientY - r.top) + 'px');
            });
        });
    }

    if (!animated) {
        $$('.highlight').forEach(function (h) { h.classList.add('lit'); });
        return;
    }

    /* ════════ Motion-only from here ════════ */
    try { runMotion(); } catch (err) {
        if (window.console) console.error(err);
        root.classList.remove('js'); root.classList.add('no-js');
        $$('[data-reveal], .h1-ch').forEach(function (el) { el.style.opacity = ''; el.style.transform = ''; });
    }

    function runMotion() {
    var animate = M.animate, inView = M.inView, scroll = M.scroll, stagger = M.stagger;

    /* Scroll progress bar */
    scroll(animate('.progress', { scaleX: [0, 1] }, { ease: 'linear' }));

    /* Hero: letters rise, then the rest cascades in */
    $$('.h1-line').forEach(function (line) {
        var host = line.querySelector('em') || line;
        var text = host.textContent;
        host.textContent = '';
        text.split('').forEach(function (ch) {
            var s = document.createElement('span');
            s.className = 'h1-ch';
            s.setAttribute('aria-hidden', 'true');
            s.textContent = ch;
            host.appendChild(s);
        });
    });
    animate('.h1-ch', { y: ['105%', '0%'] }, { delay: stagger(0.035, { startDelay: 0.15 }), duration: 0.9, ease: EASE });
    animate('.avatar-wrap', { opacity: [0, 1], scale: [0.8, 1], rotate: [-8, 0] }, { type: 'spring', stiffness: 140, damping: 18, delay: 0.1 });
    animate($$('.eyebrow, .tagline, .social-links'), { opacity: [0, 1], y: [14, 0], filter: ['blur(6px)', 'blur(0px)'] },
        { delay: stagger(0.12, { startDelay: 0.35 }), duration: 0.8, ease: EASE });
    animate('.blob', { opacity: [0, 1], scale: [0.6, 1] }, { duration: 1.8, ease: EASE });

    /* Slow ambient drift on the hero glow, parallax with scroll */
    animate('.blob.b1', { x: [0, -30, 10, 0], y: [0, 20, -14, 0] }, { duration: 18, repeat: Infinity, ease: 'easeInOut' });
    animate('.blob.b2', { x: [0, 24, -18, 0], y: [0, -16, 12, 0] }, { duration: 22, repeat: Infinity, ease: 'easeInOut' });
    scroll(animate('.hero', { y: [0, -40] }, { ease: 'linear' }), { target: $('.hero-wrap'), offset: ['start start', 'end start'] });

    /* Magnetic social pills */
    if (finePointer) {
        $$('.social-pill, .to-top').forEach(function (p) {
            p.addEventListener('pointermove', function (e) {
                var r = p.getBoundingClientRect();
                var dx = (e.clientX - r.left - r.width / 2) * 0.25;
                var dy = (e.clientY - r.top - r.height / 2) * 0.35;
                animate(p, { x: dx, y: dy }, { type: 'spring', stiffness: 300, damping: 20 });
            });
            p.addEventListener('pointerleave', function () {
                animate(p, { x: 0, y: 0 }, { type: 'spring', stiffness: 260, damping: 14 });
            });
        });
    }

    /* Bio: opening paragraph lights up word by word as you scroll */
    var scrub = $('[data-scrub]');
    if (scrub) {
        var words = [];
        (function wrap(node) {
            Array.prototype.slice.call(node.childNodes).forEach(function (n) {
                if (n.nodeType === 3) {
                    var frag = document.createDocumentFragment();
                    n.textContent.split(/(\s+)/).forEach(function (part) {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
                        var w = document.createElement('span');
                        w.className = 'word';
                        w.textContent = part;
                        words.push(w);
                        frag.appendChild(w);
                    });
                    node.replaceChild(frag, n);
                } else if (n.nodeType === 1) { wrap(n); }
            });
        })(scrub);
        scrub.style.opacity = 1;
        words.forEach(function (w) { w.style.opacity = 0.18; });
        scroll(function (p) {
            var lit = p * words.length * 1.15;
            for (var i = 0; i < words.length; i++) {
                var o = Math.min(1, Math.max(0.18, lit - i + 0.18));
                words[i].style.opacity = o;
            }
        }, { target: scrub, offset: ['start 0.85', 'end 0.55'] });
    }

    /* Generic reveal for everything else marked data-reveal */
    var handled = ['avatar-wrap', 'eyebrow', 'tagline', 'social-links'];
    var groups = new Map();
    $$('[data-reveal]').forEach(function (el) {
        if (el.hasAttribute('data-scrub')) return;
        if (handled.some(function (c) { return el.classList.contains(c); })) return;
        inView(el, function () {
            var isHead = el.classList.contains('section-head');
            if (isHead) el.classList.add('in');
            var isCard = el.classList.contains('project-card') || el.parentElement.classList.contains('award-grid');
            // small stagger for siblings that enter together
            var parent = el.parentElement;
            var n = groups.get(parent) || 0;
            groups.set(parent, n + 1);
            setTimeout(function () { groups.set(parent, Math.max(0, (groups.get(parent) || 1) - 1)); }, 120);
            var delay = Math.min(n, 4) * 0.08;
            animate(el, isCard
                ? { opacity: [0, 1], y: [36, 0], scale: [0.97, 1] }
                : { opacity: [0, 1], y: [22, 0], filter: ['blur(4px)', 'blur(0px)'] },
                { duration: isCard ? 0.75 : 0.8, delay: delay, ease: EASE });

            // inner stagger: tags and links inside experience items, chips in tech card
            var inner = $$('.tool-tag, .link-row a, .chip', el);
            if (inner.length) animate(inner, { opacity: [0, 1], y: [8, 0] }, { delay: stagger(0.03, { startDelay: delay + 0.25 }), duration: 0.45, ease: EASE });
            var crest = $('.crest-img', el);
            if (crest) animate(crest, { scale: [0.6, 1], rotate: [-20, 0] }, { type: 'spring', stiffness: 180, damping: 14, delay: delay + 0.05 });
            var hl = $$('.highlight', el);
            hl.forEach(function (h) { h.classList.add('lit'); });
        }, { margin: '0px 0px -12% 0px' });
    });

    /* Education timeline draws as you scroll through it */
    var tl = $('.timeline');
    if (tl) {
        scroll(animate('.timeline-fill', { scaleY: [0, 1] }, { ease: 'linear' }), { target: tl, offset: ['start 0.75', 'end 0.6'] });
    }
    }
})();
