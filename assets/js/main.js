document.addEventListener('DOMContentLoaded', async function () {

    // ===== Dark Mode =====
    const themeToggle = document.getElementById('theme-toggle');
    const root = document.documentElement;

    function setTheme(theme) {
        root.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
    }

    themeToggle.addEventListener('click', function () {
        const current = root.getAttribute('data-theme');
        setTheme(current === 'dark' ? 'light' : 'dark');
    });

    // ===== Sticky Navbar =====
    const navbar = document.getElementById('navbar');

    function updateNavbar() {
        if (window.scrollY > 60) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', updateNavbar, { passive: true });
    updateNavbar();

    // ===== Hero Canvas: 3D Point Cloud / SfM Animation =====
    initHeroCanvas();

    // ===== Scroll Fade-In =====
    const observer = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.fade-in').forEach(function (el) {
        observer.observe(el);
    });

    // ===== Publications =====
    const publicationsContainer = document.getElementById('publications-container');

    try {
        const response = await fetch('publications/list.json');
        const publicationFiles = await response.json();

        for (const file of publicationFiles) {
            const pubResponse = await fetch('publications/' + file);
            const pubText = await pubResponse.text();
            const publication = parsePublication(pubText);
            const card = createPublicationCard(publication);
            publicationsContainer.appendChild(card);
        }

        addAbstractToggleListeners();
    } catch (error) {
        console.error('Error loading publications:', error);
        publicationsContainer.innerHTML = '<p>Error loading publications. Please try again later.</p>';
    }
});

function parsePublication(text) {
    const parts = text.split('---');
    if (parts.length < 3) {
        throw new Error('Invalid publication format');
    }

    const frontmatter = parts[1].trim();
    const abstract = parts[2].trim();
    const publication = {};

    frontmatter.split('\n').forEach(function (line) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();

            if (key === 'links') {
                publication.links = {};
            } else if (line.startsWith('  ') && publication.links) {
                const linkKey = line.trim().split(':')[0].trim();
                const linkValue = line.trim().split(':')[1].trim();
                publication.links[linkKey] = linkValue.replace(/"/g, '');
            } else {
                publication[key] = value.replace(/"/g, '');
            }
        }
    });

    publication.abstract = abstract;
    return publication;
}

function ensureAbsoluteUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/') || url.startsWith('projects/')) return url;
    return 'https://' + url;
}

function createPublicationCard(pub) {
    const card = document.createElement('div');
    card.className = 'publication-card';
    card.id = pub.id;

    var linksHTML = '';
    if (pub.links.paper) {
        linksHTML += '<a href="' + ensureAbsoluteUrl(pub.links.paper) + '" class="publication-link" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-pdf"></i> Paper</a>';
    }
    if (pub.links.code) {
        linksHTML += '<a href="' + ensureAbsoluteUrl(pub.links.code) + '" class="publication-link" target="_blank" rel="noopener noreferrer"><i class="fas fa-code"></i> Code</a>';
    }
    if (pub.links.website) {
        linksHTML += '<a href="' + ensureAbsoluteUrl(pub.links.website) + '" class="publication-link" target="_blank" rel="noopener noreferrer"><i class="fas fa-globe"></i> Website</a>';
    }
    if (pub.links.data) {
        linksHTML += '<a href="' + ensureAbsoluteUrl(pub.links.data) + '" class="publication-link" target="_blank" rel="noopener noreferrer"><i class="fas fa-database"></i> Data</a>';
    }
    if (pub.links.checkpoints) {
        linksHTML += '<a href="' + ensureAbsoluteUrl(pub.links.checkpoints) + '" class="publication-link" target="_blank" rel="noopener noreferrer"><i class="fas fa-cube"></i> Checkpoints</a>';
    }
    if (pub.links.bibtex) {
        linksHTML += '<a href="' + pub.links.bibtex + '" class="publication-link bibtex-link"><i class="fas fa-quote-right"></i> BibTeX</a>';
    }

    card.innerHTML =
        '<div class="publication-image">' +
            '<img src="' + pub.thumbnail + '" alt="' + pub.title + '">' +
        '</div>' +
        '<div class="publication-content">' +
            '<h3 class="publication-title">' + pub.title + '</h3>' +
            '<p class="publication-authors">' + pub.authors + '</p>' +
            '<p class="publication-venue">' + pub.venue + ', ' + pub.year + '</p>' +
            '<div class="publication-links">' + linksHTML + '</div>' +
            '<button class="show-abstract-btn" data-pub-id="' + pub.id + '">Show Abstract</button>' +
            '<div class="publication-abstract" id="abstract-' + pub.id + '">' + pub.abstract + '</div>' +
        '</div>';

    return card;
}

function addAbstractToggleListeners() {
    document.querySelectorAll('.show-abstract-btn').forEach(function (button) {
        button.addEventListener('click', function () {
            const pubId = this.getAttribute('data-pub-id');
            const abstractEl = document.getElementById('abstract-' + pubId);
            const isOpen = abstractEl.classList.contains('open');

            if (isOpen) {
                abstractEl.classList.remove('open');
                this.classList.remove('active');
                this.textContent = 'Show Abstract';
            } else {
                abstractEl.classList.add('open');
                this.classList.add('active');
                this.textContent = 'Hide Abstract';
            }
        });
    });

    document.querySelectorAll('.bibtex-link').forEach(function (link) {
        link.addEventListener('click', async function (e) {
            e.preventDefault();
            try {
                const bibtexPath = this.getAttribute('href');
                const response = await fetch(bibtexPath);
                const bibtex = await response.text();
                showBibtexModal(bibtex);
            } catch (error) {
                console.error('Error loading BibTeX:', error);
            }
        });
    });
}

function showBibtexModal(bibtex) {
    const modal = document.createElement('div');
    modal.className = 'bibtex-modal';

    const content = document.createElement('div');
    content.className = 'bibtex-modal-content';

    const header = document.createElement('div');
    header.className = 'bibtex-modal-header';

    const title = document.createElement('h3');
    title.textContent = 'BibTeX';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'bibtex-modal-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';

    header.appendChild(title);
    header.appendChild(closeBtn);

    const code = document.createElement('pre');
    code.className = 'bibtex-code';
    code.textContent = bibtex;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'bibtex-copy-btn';
    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy to clipboard';

    copyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(bibtex).then(function () {
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(function () {
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy to clipboard';
            }, 2000);
        });
    });

    content.appendChild(header);
    content.appendChild(code);
    content.appendChild(copyBtn);
    modal.appendChild(content);
    document.body.appendChild(modal);

    function closeModal() {
        modal.style.opacity = '0';
        setTimeout(function () {
            if (modal.parentNode) modal.parentNode.removeChild(modal);
        }, 200);
    }

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handler);
        }
    });
}

// ===== Hero Canvas: 3D Point Cloud / Structure-from-Motion =====
function initHeroCanvas() {
    var canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var hero = canvas.parentElement;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w, h;

    // Mouse-driven rotation target and smoothed current values
    var targetRotY = 0, targetRotX = 0;
    var rotY = 0, rotX = 0;
    var mouseOver = false;

    function resize() {
        var rect = hero.getBoundingClientRect();
        w = rect.width;
        h = rect.height;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    hero.addEventListener('mousemove', function (e) {
        var rect = hero.getBoundingClientRect();
        var mx = (e.clientX - rect.left) / rect.width;
        var my = (e.clientY - rect.top) / rect.height;
        targetRotY = (mx - 0.5) * 0.55;
        targetRotX = (my - 0.5) * -0.35;
        mouseOver = true;
    });
    hero.addEventListener('mouseleave', function () {
        targetRotY = 0;
        targetRotX = 0;
        mouseOver = false;
    });

    function rand(a, b) { return a + Math.random() * (b - a); }

    // 3D world: points live in a cube centered at origin
    var SPREAD = 500;
    var POINT_COUNT = 90;
    var CONNECT_DIST_3D = 180;
    var FRUSTUM_COUNT = 8;
    var FOCAL = 800;

    var points3D = [];
    for (var i = 0; i < POINT_COUNT; i++) {
        points3D.push({
            x: rand(-SPREAD, SPREAD),
            y: rand(-SPREAD * 0.55, SPREAD * 0.55),
            z: rand(-SPREAD * 0.5, SPREAD * 0.5),
            vx: rand(-0.18, 0.18),
            vy: rand(-0.12, 0.12),
            vz: rand(-0.1, 0.1),
            r: rand(2, 4),
            pulse: rand(0, Math.PI * 2)
        });
    }

    var frustums3D = [];
    for (var j = 0; j < FRUSTUM_COUNT; j++) {
        frustums3D.push({
            x: rand(-SPREAD * 0.85, SPREAD * 0.85),
            y: rand(-SPREAD * 0.45, SPREAD * 0.45),
            z: rand(-SPREAD * 0.4, SPREAD * 0.4),
            vx: rand(-0.12, 0.12),
            vy: rand(-0.08, 0.08),
            vz: rand(-0.06, 0.06),
            yaw: rand(0, Math.PI * 2),
            vyaw: rand(-0.003, 0.003),
            size: rand(16, 28),
            opacity: rand(0.18, 0.38)
        });
    }

    var axes3D = [
        { x: -SPREAD * 0.7, y: -SPREAD * 0.35, z:  SPREAD * 0.2 },
        { x:  SPREAD * 0.75, y:  SPREAD * 0.3,  z: -SPREAD * 0.15 },
        { x:  SPREAD * 0.2,  y: -SPREAD * 0.4,  z: -SPREAD * 0.3 },
        { x: -SPREAD * 0.4,  y:  SPREAD * 0.35, z:  SPREAD * 0.35 }
    ];

    // Rotation helpers
    function rotateY(px, py, pz, angle) {
        var c = Math.cos(angle), s = Math.sin(angle);
        return { x: px * c + pz * s, y: py, z: -px * s + pz * c };
    }
    function rotateX(px, py, pz, angle) {
        var c = Math.cos(angle), s = Math.sin(angle);
        return { x: px, y: py * c - pz * s, z: py * s + pz * c };
    }

    function project(x3, y3, z3) {
        // Apply current rotation
        var r1 = rotateY(x3, y3, z3, rotY);
        var r2 = rotateX(r1.x, r1.y, r1.z, rotX);
        var depth = FOCAL + r2.z;
        if (depth < 50) depth = 50;
        var scale = FOCAL / depth;
        return {
            sx: w / 2 + r2.x * scale,
            sy: h / 2 + r2.y * scale,
            scale: scale,
            depth: depth,
            rz: r2.z
        };
    }

    function wrapCoord(v, limit) {
        if (v < -limit) return limit;
        if (v >  limit) return -limit;
        return v;
    }

    function drawFrame(time) {
        ctx.clearRect(0, 0, w, h);
        var t = time * 0.001;

        // Smooth rotation towards target
        var lerpSpeed = mouseOver ? 0.04 : 0.025;
        rotY += (targetRotY - rotY) * lerpSpeed;
        rotX += (targetRotX - rotX) * lerpSpeed;

        // Idle slow drift when mouse not over
        if (!mouseOver) {
            targetRotY = Math.sin(t * 0.15) * 0.08;
            targetRotX = Math.cos(t * 0.12) * 0.05;
        }

        // Project all points
        var projected = [];
        for (var i = 0; i < points3D.length; i++) {
            var p = points3D[i];
            p.x += p.vx;
            p.y += p.vy;
            p.z += p.vz;
            p.x = wrapCoord(p.x, SPREAD);
            p.y = wrapCoord(p.y, SPREAD * 0.55);
            p.z = wrapCoord(p.z, SPREAD * 0.5);

            var pr = project(p.x, p.y, p.z);
            var pulseFactor = 0.7 + 0.3 * Math.sin(t * 1.2 + p.pulse);
            var depthFade = Math.max(0.15, Math.min(1, pr.scale / 1.2));
            var alpha = 0.5 * depthFade * pulseFactor;

            projected.push({
                sx: pr.sx, sy: pr.sy,
                r: p.r * pr.scale * 0.9,
                alpha: alpha,
                scale: pr.scale,
                depth: pr.depth,
                x3: p.x, y3: p.y, z3: p.z
            });
        }

        // Draw connections (in 3D distance)
        for (var a = 0; a < projected.length; a++) {
            for (var b = a + 1; b < projected.length; b++) {
                var pa = projected[a], pb = projected[b];
                var dx3 = pa.x3 - pb.x3;
                var dy3 = pa.y3 - pb.y3;
                var dz3 = pa.z3 - pb.z3;
                var d3 = Math.sqrt(dx3 * dx3 + dy3 * dy3 + dz3 * dz3);
                if (d3 < CONNECT_DIST_3D) {
                    var avgScale = (pa.scale + pb.scale) / 2;
                    var lineAlpha = (1 - d3 / CONNECT_DIST_3D) * 0.25 * Math.min(avgScale / 1.0, 1);
                    ctx.beginPath();
                    ctx.moveTo(pa.sx, pa.sy);
                    ctx.lineTo(pb.sx, pb.sy);
                    ctx.strokeStyle = 'rgba(255,255,255,' + lineAlpha + ')';
                    ctx.lineWidth = Math.max(0.5, avgScale * 0.8);
                    ctx.stroke();
                }
            }
        }

        // Draw points (sorted back-to-front for depth)
        projected.sort(function (a, b) { return a.depth - b.depth; });
        for (var c = 0; c < projected.length; c++) {
            var pt = projected[c];
            if (pt.r < 0.5) continue;
            ctx.beginPath();
            ctx.arc(pt.sx, pt.sy, pt.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,' + pt.alpha + ')';
            ctx.fill();
        }

        // Draw camera frustums in 3D
        for (var f = 0; f < frustums3D.length; f++) {
            var fr = frustums3D[f];
            fr.x += fr.vx;
            fr.y += fr.vy;
            fr.z += fr.vz;
            fr.yaw += fr.vyaw;
            fr.x = wrapCoord(fr.x, SPREAD * 0.9);
            fr.y = wrapCoord(fr.y, SPREAD * 0.5);
            fr.z = wrapCoord(fr.z, SPREAD * 0.45);
            drawFrustum3D(fr, t);
        }

        // Draw coordinate axes in 3D
        drawAxes3D(t);

        requestAnimationFrame(drawFrame);
    }

    function drawFrustum3D(fr, t) {
        var s = fr.size;
        var cy = Math.cos(fr.yaw), sy = Math.sin(fr.yaw);

        // Local frustum corners (body + cone) rotated by yaw around Y
        var localPts = [
            // Body corners
            { x: -s * 0.3, y: -s * 0.25, z: 0 },
            { x:  s * 0.3, y: -s * 0.25, z: 0 },
            { x:  s * 0.3, y:  s * 0.25, z: 0 },
            { x: -s * 0.3, y:  s * 0.25, z: 0 },
            // Cone far corners
            { x:  s * 0.9, y: -s * 0.55, z: 0 },
            { x:  s * 0.9, y:  s * 0.55, z: 0 }
        ];

        var screenPts = [];
        for (var i = 0; i < localPts.length; i++) {
            var lp = localPts[i];
            var rx = lp.x * cy + lp.z * sy;
            var rz = -lp.x * sy + lp.z * cy;
            var pr = project(fr.x + rx, fr.y + lp.y, fr.z + rz);
            screenPts.push(pr);
        }

        var avgDepth = 0;
        for (var k = 0; k < screenPts.length; k++) avgDepth += screenPts[k].depth;
        avgDepth /= screenPts.length;
        var depthFade = Math.max(0.1, Math.min(1, FOCAL / avgDepth));
        var alpha = fr.opacity * depthFade;

        ctx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
        ctx.lineWidth = Math.max(0.8, depthFade * 1.4);

        // Camera body
        ctx.beginPath();
        ctx.moveTo(screenPts[0].sx, screenPts[0].sy);
        ctx.lineTo(screenPts[1].sx, screenPts[1].sy);
        ctx.lineTo(screenPts[2].sx, screenPts[2].sy);
        ctx.lineTo(screenPts[3].sx, screenPts[3].sy);
        ctx.closePath();
        ctx.stroke();

        // Faint fill
        ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.12) + ')';
        ctx.fill();

        // Frustum cone lines
        ctx.beginPath();
        ctx.moveTo(screenPts[1].sx, screenPts[1].sy);
        ctx.lineTo(screenPts[4].sx, screenPts[4].sy);
        ctx.moveTo(screenPts[2].sx, screenPts[2].sy);
        ctx.lineTo(screenPts[5].sx, screenPts[5].sy);
        ctx.moveTo(screenPts[4].sx, screenPts[4].sy);
        ctx.lineTo(screenPts[5].sx, screenPts[5].sy);
        ctx.stroke();

        // Lens dot (midpoint of right edge of body)
        var lensX = (screenPts[1].sx + screenPts[2].sx) / 2;
        var lensY = (screenPts[1].sy + screenPts[2].sy) / 2;
        ctx.beginPath();
        ctx.arc(lensX, lensY, Math.max(1.5, 2.5 * depthFade), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + Math.min(alpha + 0.15, 0.55) + ')';
        ctx.fill();
    }

    function drawAxes3D(t) {
        var axLen = 24;
        var baseAlpha = 0.14 + 0.06 * Math.sin(t * 0.5);
        var axisDirs = [
            { dx: axLen, dy: 0, dz: 0, color: '#ff6b6b' },
            { dx: 0, dy: -axLen, dz: 0, color: '#51cf66' },
            { dx: 0, dy: 0, dz: axLen, color: '#339af0' }
        ];

        for (var i = 0; i < axes3D.length; i++) {
            var origin = axes3D[i];
            var pO = project(origin.x, origin.y, origin.z);
            var depthFade = Math.max(0.2, Math.min(1, FOCAL / pO.depth));
            ctx.globalAlpha = baseAlpha * depthFade;
            ctx.lineWidth = Math.max(1, 1.5 * depthFade);

            for (var d = 0; d < axisDirs.length; d++) {
                var dir = axisDirs[d];
                var pE = project(origin.x + dir.dx, origin.y + dir.dy, origin.z + dir.dz);
                ctx.strokeStyle = dir.color;
                ctx.beginPath();
                ctx.moveTo(pO.sx, pO.sy);
                ctx.lineTo(pE.sx, pE.sy);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    }

    requestAnimationFrame(drawFrame);
}
