/* Interactive Gekko method explorer.
 *
 * Two widgets, both driven by real model outputs exported from the pretrained
 * checkpoint (assets/explorer/data.js):
 *   1. a staged schematic of the two forward passes (with / without the reference view),
 *   2. a per-patch explorer of the reconstruction-error comparison, with the
 *      ground-truth co-visible / non-co-visible split.
 */
(function () {
    'use strict';

    var DATA = window.GEKKO_EXPLORER_DATA;
    if (!DATA) return;

    var GH = DATA.grid[0], GW = DATA.grid[1], P = DATA.patch;
    var IW = DATA.size[0], IH = DATA.size[1];
    var N = GH * GW;
    var COVIS = '#10b981', NOCOVIS = '#f59e0b';

    // ---------------------------------------------------------------- colours

    var PLASMA = [
        [13, 8, 135], [75, 3, 161], [125, 3, 168], [168, 34, 150], [203, 70, 121],
        [229, 107, 93], [248, 148, 65], [253, 195, 40], [240, 249, 33]
    ];

    function ramp(stops, t) {
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        var x = t * (stops.length - 1), i = Math.min(Math.floor(x), stops.length - 2), f = x - i;
        var a = stops[i], b = stops[i + 1];
        return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' +
            Math.round(a[1] + (b[1] - a[1]) * f) + ',' +
            Math.round(a[2] + (b[2] - a[2]) * f) + ')';
    }

    var plasma = ramp.bind(null, PLASMA);
    // shared ramp for both error maps so ell_CroCo and ell_MAE are directly comparable
    var ERR = [[8, 23, 56], [23, 63, 112], [30, 110, 150], [56, 163, 165], [140, 205, 160], [237, 248, 200]];
    var errRamp = ramp.bind(null, ERR);

    function quantile(arr, q) {
        var s = arr.slice().sort(function (a, b) { return a - b; });
        if (!s.length) return 1;
        return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
    }

    function css(name, fallback) {
        var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    }

    // ------------------------------------------------------------- pair state

    var pairs = DATA.pairs;
    var cur = 0;                // index into pairs
    var field = 'c_hat';        // active per-patch field
    var hover = -1;             // hovered patch index, -1 = none
    var pinned = -1;            // click-locked patch
    var images = {};            // pairId -> { name: HTMLImageElement }
    var derived = [];           // per-pair precomputed scales / subsets

    var IMG_NAMES = ['reference', 'target', 'masked', 'croco', 'mae', 'conf', 'covis'];

    function loadImages(p, done) {
        if (images[p.id]) { done(); return; }
        var set = {}, left = IMG_NAMES.length;
        IMG_NAMES.forEach(function (n) {
            var im = new Image();
            im.onload = im.onerror = function () { if (--left === 0) { images[p.id] = set; done(); } };
            im.src = 'assets/explorer/' + p.id + '/' + n + '.jpg';
            set[n] = im;
        });
    }

    pairs.forEach(function (p) {
        var masked = [], both = [];
        for (var i = 0; i < N; i++) {
            if (p.mask[i]) {
                masked.push(i);
                if (p.valid[i] > 0.6) both.push(i);
            }
        }
        var errs = masked.map(function (i) { return p.l_mae[i]; });
        var hi = quantile(errs, 0.97);
        var cov = both.filter(function (i) { return p.covis[i] > 0.5; });
        var non = both.filter(function (i) { return p.covis[i] <= 0.5; });
        var medRatio = function (idx) {
            if (!idx.length) return 1;
            return quantile(idx.map(function (i) { return p.l_mae[i] / Math.max(p.l_croco[i], 1e-6); }), 0.5);
        };
        derived.push({
            scored: both, cov: cov, non: non, errHi: hi,
            gainCov: medRatio(cov), gainNon: medRatio(non)
        });
    });

    // ------------------------------------------------------- widget 1: passes

    var STAGES = [
        { title: 'Sample a pair', text: 'Two frames of the same video, a few seconds apart. The pair carries no depth, no pose and no co-visibility annotation, only the two images.' },
        { title: 'Mask the target', text: '90% of the target’s patches are hidden. The reference view is left intact.' },
        { title: 'Encode both views', text: 'A single ViT encoder embeds both views. Its weights are shared between them, which is what makes the encoder Siamese.' },
        { title: 'Decode twice', text: 'The same decoder reconstructs the same masked target twice: once attending to the reference tokens, once with that cross-attention removed. Nothing else differs between the two passes.' },
        { title: 'Compare the two errors', text: 'The two errors say, patch by patch, how much the second view actually helped: C = (ℓMAE − ℓCroCo) / ℓMAE. It approaches 1 where the reference resolved the patch and 0 where it contributed nothing.' },
        { title: 'Predict the improvement', text: 'A third output channel Ĉ regresses C from the unmasked pair. Every masked patch then carries a binocular training signal, whether or not it is co-visible.' }
    ];

    var STAGE_MS = 2200;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var stage = 0, playing = !reduceMotion, timer = null, focus = 'both';

    function buildDiagram(root) {
        var el = {};
        root.innerHTML =
            '<div class="gk-diagram" data-stage="0" data-focus="both">' +
            '  <svg class="gk-wires" aria-hidden="true"></svg>' +
            '  <div class="gk-grid">' +
            '    <div class="gk-node gk-thumb" data-id="ref"><div class="gk-node-t">Reference view</div>' +
            '      <img data-img="reference" alt="Reference view"><div class="gk-node-s">seen only by pass A</div></div>' +
            '    <div class="gk-node gk-enc" data-id="encr">Shared<br>encoder</div>' +
            '    <div class="gk-node gk-dec gk-pass-a" data-id="deca"><span class="gk-tag">pass A</span>Decoder<br><em>+ cross-attention</em></div>' +
            '    <div class="gk-node gk-thumb gk-out" data-id="outa"><div class="gk-node-t">Cross-view completion</div>' +
            '      <img data-img="croco" alt="Reconstruction with the reference"><div class="gk-node-s">error <b>ℓ<sub>CroCo</sub></b></div></div>' +
            '    <div class="gk-node gk-cmp" data-id="cmp">' +
            '      <div class="gk-cmp-eq">C = (ℓ<sub>MAE</sub> − ℓ<sub>CroCo</sub>) / ℓ<sub>MAE</sub></div>' +
            '      <div class="gk-cmp-out"><img data-img="conf" alt="Predicted relative improvement">' +
            '        <span>predicted Ĉ</span></div></div>' +
            '    <div class="gk-node gk-thumb" data-id="tgt"><div class="gk-node-t">Target view</div>' +
            '      <img data-img="target" alt="Target view"><div class="gk-node-s"><span class="gk-masknote">90% masked</span></div></div>' +
            '    <div class="gk-node gk-enc" data-id="enct">Shared<br>encoder</div>' +
            '    <div class="gk-node gk-dec gk-pass-b" data-id="decb"><span class="gk-tag">pass B</span>Decoder<br><em>no reference</em></div>' +
            '    <div class="gk-node gk-thumb gk-out" data-id="outb"><div class="gk-node-t">Masked autoencoding</div>' +
            '      <img data-img="mae" alt="Reconstruction without the reference"><div class="gk-node-s">error <b>ℓ<sub>MAE</sub></b></div></div>' +
            '  </div>' +
            '</div>';

        el.diagram = root.querySelector('.gk-diagram');
        el.svg = root.querySelector('.gk-wires');
        el.nodes = {};
        root.querySelectorAll('[data-id]').forEach(function (n) { el.nodes[n.getAttribute('data-id')] = n; });
        return el;
    }

    // edges: from, to, class
    var EDGES = [
        ['ref', 'encr', 'e-ref'],
        ['tgt', 'enct', 'e-tgt'],
        ['enct', 'deca', 'e-tok e-tok-a', 'into-bottom'],
        ['enct', 'decb', 'e-tok e-tok-b'],
        ['encr', 'deca', 'e-cross'],
        ['deca', 'outa', 'e-outa'],
        ['decb', 'outb', 'e-outb'],
        ['outa', 'cmp', 'e-cmp e-cmp-a'],
        ['outb', 'cmp', 'e-cmp e-cmp-b', 'up']
    ];

    // Anchor each wire on the sides that actually face each other, so the same
    // code serves the wide (left-to-right) and narrow (stacked) layouts.
    function bez(x1, y1, c1x, c1y, c2x, c2y, x2, y2) {
        return 'M' + x1 + ',' + y1 + ' C' + c1x + ',' + c1y + ' ' + c2x + ',' + c2y + ' ' + x2 + ',' + y2;
    }

    function wirePath(ra, rb, box, mode, wide) {
        var l1 = ra.left - box.left, r1 = ra.right - box.left, t1 = ra.top - box.top, b1 = ra.bottom - box.top;
        var l2 = rb.left - box.left, r2 = rb.right - box.left, t2 = rb.top - box.top, b2 = rb.bottom - box.top;
        var cx1 = (l1 + r1) / 2, cy1 = (t1 + b1) / 2, cx2 = (l2 + r2) / 2, cy2 = (t2 + b2) / 2;

        // Two edges need a route the generic rule cannot find: one climbs back up
        // to the other pass's decoder, the other has to get past the card sitting
        // directly underneath it.
        if (wide && mode === 'into-bottom') {
            return bez(cx1, t1, cx1, t1 - (t1 - b2) * 0.6, cx2, b2 + (t1 - b2) * 0.6, cx2, b2);
        }
        if (mode === 'up' && b2 <= t1 + 2) {              // target directly above
            var k = (t1 - b2) * 0.5;
            return bez(cx1, t1, cx1, t1 - k, cx2, b2 + k, cx2, b2);
        }

        if (l2 >= r1 - 2) {                                  // target to the right
            var mx = (r1 + l2) / 2;
            return bez(r1, cy1, mx, cy1, mx, cy2, l2, cy2);
        }
        if (t2 >= b1 - 2) {                                  // target below
            var my = (b1 + t2) / 2;
            return bez(cx1, b1, cx1, my, cx2, my, cx2, t2);
        }
        // target above: bracket the wire round the right-hand side
        var xm = Math.max(r1, r2) + Math.min(26, Math.max(10, box.width - Math.max(r1, r2) - 6));
        return bez(r1, cy1, xm, cy1, xm, cy2, r2, cy2);
    }

    var ARROWS =
        '<defs>' +
        '<marker id="gk-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6"' +
        ' orient="auto-start-reverse" markerUnits="strokeWidth">' +
        '<path class="gk-head" d="M0,0.6 L7.4,4 L0,7.4 Z"/></marker>' +
        '<marker id="gk-arrow-x" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6"' +
        ' orient="auto-start-reverse" markerUnits="strokeWidth">' +
        '<path class="gk-head gk-head-x" d="M0,0.6 L7.4,4 L0,7.4 Z"/></marker>' +
        '</defs>';

    function drawWires(el) {
        var box = el.diagram.getBoundingClientRect();
        if (!box.width) return;
        el.svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
        el.svg.style.width = box.width + 'px';
        el.svg.style.height = box.height + 'px';
        var out = ARROWS;
        var wide = box.width >= 700;
        EDGES.forEach(function (e) {
            var a = el.nodes[e[0]], b = el.nodes[e[1]];
            if (!a || !b) return;
            // stacked, this one would run the whole height of the column behind
            // every card; the chain already implies it
            if (!wide && e[2].indexOf('e-cmp-a') >= 0) return;
            var d = wirePath(a.getBoundingClientRect(), b.getBoundingClientRect(), box, e[3], wide);
            var head = e[2].indexOf('e-cross') >= 0 ? 'gk-arrow-x' : 'gk-arrow';
            out += '<path class="gk-wire ' + e[2] + '" d="' + d + '" marker-end="url(#' + head + ')"/>';
            out += '<path class="gk-flow ' + e[2] + '" d="' + d + '"/>';
        });
        el.svg.innerHTML = out;
    }

    // ------------------------------------------------- widget 2: patch canvas

    function fieldValue(p, i) {
        if (field === 'c_hat') return p.c_hat[i];
        if (field === 'c') return p.c[i];
        if (field === 'l_croco') return p.l_croco[i];
        if (field === 'l_mae') return p.l_mae[i];
        return 0;
    }

    function fieldColour(p, d, i) {
        if (field === 'covis') {
            if (p.valid[i] <= 0.6) return 'rgba(130,130,130,0.55)';
            return p.covis[i] > 0.5 ? COVIS : NOCOVIS;
        }
        if (field === 'c_hat' || field === 'c') return plasma(fieldValue(p, i));
        return errRamp(fieldValue(p, i) / d.errHi);
    }

    // C and the two errors only exist on masked patches; Ĉ is predicted densely.
    function definedOnVisible() { return field === 'c_hat' || field === 'covis' || field === 'photo'; }

    function drawMap(ctx, p, d, W, H) {
        var im = images[p.id];
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(im.target, 0, 0, W, H);
        if (field === 'photo') { drawHover(ctx, p, W, H); return; }

        var cw = W / GW, ch = H / GH;
        ctx.globalAlpha = field === 'covis' ? 0.55 : 0.86;
        for (var i = 0; i < N; i++) {
            var x = (i % GW) * cw, y = Math.floor(i / GW) * ch;
            if (!p.mask[i] && !definedOnVisible()) continue;
            ctx.fillStyle = fieldColour(p, d, i);
            ctx.fillRect(x, y, cw + 0.5, ch + 0.5);
        }
        ctx.globalAlpha = 1;

        // patches the network could actually see keep the photo, marked with a dot
        if (!definedOnVisible()) {
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            for (var j = 0; j < N; j++) {
                if (p.mask[j]) continue;
                var vx = (j % GW) * cw, vy = Math.floor(j / GW) * ch;
                ctx.fillRect(vx + cw / 2 - 1, vy + ch / 2 - 1, 2, 2);
            }
        }
        drawHover(ctx, p, W, H);
    }

    function drawHover(ctx, p, W, H) {
        var i = pinned >= 0 ? pinned : hover;
        if (i < 0) return;
        var cw = W / GW, ch = H / GH;
        var x = (i % GW) * cw, y = Math.floor(i / GW) * ch;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        ctx.strokeRect(x - 1, y - 1, cw + 2, ch + 2);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(x - 2.5, y - 2.5, cw + 5, ch + 5);
    }

    function drawScatter(cv, p, d) {
        var dpr = window.devicePixelRatio || 1;
        var W = cv.clientWidth, H = cv.clientHeight;
        cv.width = W * dpr; cv.height = H * dpr;
        var ctx = cv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        var pad = { l: 44, r: 10, t: 12, b: 34 };
        var x0 = pad.l, y0 = H - pad.b, w = W - pad.l - pad.r, h = H - pad.t - pad.b;
        var lo = 1e-3, hi = Math.max(d.errHi * 1.6, 1e-2);
        var sx = function (v) { return x0 + (Math.log10(Math.max(v, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) * w; };
        var sy = function (v) { return y0 - (Math.log10(Math.max(v, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) * h; };

        var border = css('--border', '#e2e8f0'), muted = css('--text-muted', '#64748b');
        ctx.strokeStyle = border; ctx.fillStyle = muted;
        ctx.font = '10px Inter, sans-serif';
        ctx.lineWidth = 1;
        for (var e = -3; e <= 1; e++) {
            var gx = sx(Math.pow(10, e)), gy = sy(Math.pow(10, e));
            if (gx >= x0 && gx <= x0 + w) {
                ctx.globalAlpha = 0.5;
                ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y0 - h); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x0 + w, gy); ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.textAlign = 'center';
                ctx.fillText('1e' + e, gx, y0 + 13);
                ctx.textAlign = 'right';
                ctx.fillText('1e' + e, x0 - 5, gy + 3);
            }
        }
        // identity line: below it, the reference helped
        ctx.strokeStyle = muted; ctx.globalAlpha = 0.8; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(sx(lo), sy(lo)); ctx.lineTo(sx(hi), sy(hi)); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;

        ctx.fillStyle = muted; ctx.textAlign = 'center';
        ctx.fillText('ℓ MAE  (no reference)  →', x0 + w / 2, H - 3);
        ctx.save();
        ctx.translate(11, y0 - h / 2); ctx.rotate(-Math.PI / 2);
        ctx.fillText('ℓ CroCo  (with reference)  →', 0, 0);
        ctx.restore();

        d.scored.forEach(function (i) {
            var isCov = p.covis[i] > 0.5;
            ctx.fillStyle = isCov ? COVIS : NOCOVIS;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(sx(p.l_mae[i]), sy(p.l_croco[i]), 2.4, 0, 6.2832);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        var sel = pinned >= 0 ? pinned : hover;
        if (sel >= 0 && p.mask[sel]) {
            var px = sx(p.l_mae[sel]), py = sy(p.l_croco[sel]);
            ctx.strokeStyle = css('--text', '#1a1a2e'); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(px, py, 6, 0, 6.2832); ctx.stroke();
        }
        ctx.fillStyle = muted;
        ctx.textAlign = 'left';
        ctx.fillText('points below the line: the reference helped', x0 + 6, pad.t + 10);
    }

    // ------------------------------------------------------------------ build

    function init() {
        var host = document.getElementById('gekko-explorer');
        if (!host) return;

        host.innerHTML =
            '<div class="gk-tabs" role="tablist">' +
            pairs.map(function (p, i) {
                return '<button class="gk-tab' + (i ? '' : ' on') + '" data-pair="' + i + '">' + p.label + '</button>';
            }).join('') +
            '</div>' +

            '<div class="gk-card">' +
            '  <div class="gk-card-head"><h3>1 &middot; The two forward passes</h3>' +
            '    <div class="gk-ctrls">' +
            '      <button class="gk-btn gk-play" aria-label="Play or pause"><i class="fas fa-pause"></i></button>' +
            '      <div class="gk-seg" role="group">' +
            '        <button data-focus="both" class="on">Both</button>' +
            '        <button data-focus="a">With reference</button>' +
            '        <button data-focus="b">Without</button>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '  <div class="gk-steps">' + STAGES.map(function (s, i) {
                return '<button class="gk-step' + (i ? '' : ' on') + '" data-stage="' + i + '"><b>' + (i + 1) + '</b>' + s.title + '</button>';
            }).join('') + '</div>' +
            '  <div class="gk-diagram-host"></div>' +
            '  <p class="gk-stage-text"></p>' +
            '</div>' +

            '<div class="gk-card">' +
            '  <div class="gk-card-head"><h3>2 &middot; The error comparison, patch by patch</h3>' +
            '    <div class="gk-legend">' +
            '      <span><i class="gk-dot" style="background:' + COVIS + '"></i>co-visible</span>' +
            '      <span><i class="gk-dot" style="background:' + NOCOVIS + '"></i>not co-visible</span>' +
            '    </div>' +
            '  </div>' +
            '  <div class="gk-fields">' +
            '    <button data-field="c_hat" class="on">predicted Ĉ</button>' +
            '    <button data-field="c">measured C</button>' +
            '    <button data-field="l_croco">ℓ CroCo</button>' +
            '    <button data-field="l_mae">ℓ MAE</button>' +
            '    <button data-field="covis">ground-truth co-visibility</button>' +
            '    <button data-field="photo">photo</button>' +
            '  </div>' +
            '  <div class="gk-explore">' +
            '    <div class="gk-mapwrap">' +
            '      <canvas class="gk-map" width="' + IW + '" height="' + IH + '"></canvas>' +
            '      <div class="gk-maphint">hover a patch, or click to pin it</div>' +
            '      <div class="gk-scale"><span class="gk-scale-lo"></span><div class="gk-scale-bar"></div><span class="gk-scale-hi"></span></div>' +
            '    </div>' +
            '    <div class="gk-side">' +
            '      <div class="gk-inspect">' +
            '        <div class="gk-crops">' +
            '          <figure><canvas class="gk-crop" data-src="target" width="120" height="120"></canvas><figcaption>truth</figcaption></figure>' +
            '          <figure><canvas class="gk-crop" data-src="croco" width="120" height="120"></canvas><figcaption>with ref.</figcaption></figure>' +
            '          <figure><canvas class="gk-crop" data-src="mae" width="120" height="120"></canvas><figcaption>without</figcaption></figure>' +
            '        </div>' +
            '        <div class="gk-readout"></div>' +
            '      </div>' +
            '      <canvas class="gk-scatter"></canvas>' +
            '    </div>' +
            '  </div>' +
            '  <div class="gk-stats"></div>' +
            '</div>';

        var el = {
            tabs: host.querySelectorAll('.gk-tab'),
            play: host.querySelector('.gk-play'),
            seg: host.querySelectorAll('.gk-seg button'),
            steps: host.querySelectorAll('.gk-step'),
            stageText: host.querySelector('.gk-stage-text'),
            fields: host.querySelectorAll('.gk-fields button'),
            map: host.querySelector('.gk-map'),
            scatter: host.querySelector('.gk-scatter'),
            crops: host.querySelectorAll('.gk-crop'),
            readout: host.querySelector('.gk-readout'),
            stats: host.querySelector('.gk-stats'),
            scaleLo: host.querySelector('.gk-scale-lo'),
            scaleHi: host.querySelector('.gk-scale-hi'),
            scaleBar: host.querySelector('.gk-scale-bar')
        };
        var dia = buildDiagram(host.querySelector('.gk-diagram-host'));
        var mapCtx = el.map.getContext('2d');

        function p() { return pairs[cur]; }
        function d() { return derived[cur]; }

        // which nodes are lit at each stage (cumulative)
        var LIT = [
            ['ref', 'tgt'],
            ['ref', 'tgt'],
            ['ref', 'tgt', 'encr', 'enct'],
            ['ref', 'tgt', 'encr', 'enct', 'deca', 'decb'],
            ['ref', 'tgt', 'encr', 'enct', 'deca', 'decb', 'outa', 'outb', 'cmp'],
            ['ref', 'tgt', 'encr', 'enct', 'deca', 'decb', 'outa', 'outb', 'cmp']
        ];

        function setStage(i, userDriven) {
            stage = i;
            dia.diagram.setAttribute('data-stage', String(i));
            Object.keys(dia.nodes).forEach(function (k) {
                if (dia.nodes[k].classList.contains('gk-node')) {
                    dia.nodes[k].classList.toggle('lit', LIT[i].indexOf(k) >= 0);
                }
            });
            el.steps.forEach(function (b, k) { b.classList.toggle('on', k === i); });
            el.stageText.innerHTML = '<b>' + STAGES[i].title + '.</b> ' + STAGES[i].text;
            var img = dia.nodes.tgt.querySelector('img');
            var im = images[p().id];
            if (im) img.src = (i === 0 ? im.target : im.masked).src;
            if (userDriven) pause();
        }

        function tick() { setStage((stage + 1) % STAGES.length); }
        function play() { playing = true; el.play.innerHTML = '<i class="fas fa-pause"></i>'; clearInterval(timer); timer = setInterval(tick, STAGE_MS); }
        function pause() { playing = false; el.play.innerHTML = '<i class="fas fa-play"></i>'; clearInterval(timer); }

        function paintDiagramImages() {
            var im = images[p().id];
            dia.diagram.querySelectorAll('img[data-img]').forEach(function (n) {
                var key = n.getAttribute('data-img');
                if (key === 'target' && stage > 0) key = 'masked';
                n.src = im[key].src;
            });
        }

        function fmt(v, n) { return (v === undefined || v === null) ? '–' : v.toFixed(n === undefined ? 3 : n); }

        function updateScale() {
            var lo, hi, grad;
            if (field === 'covis') {
                el.scaleLo.textContent = 'not co-visible';
                el.scaleHi.textContent = 'co-visible';
                el.scaleBar.style.background = 'linear-gradient(90deg,' + NOCOVIS + ',' + COVIS + ')';
                return;
            }
            if (field === 'photo') {
                el.scaleLo.textContent = ''; el.scaleHi.textContent = '';
                el.scaleBar.style.background = 'transparent';
                return;
            }
            if (field === 'c_hat' || field === 'c') {
                lo = '0 · no help from the reference'; hi = 'reference resolved it · 1';
                grad = PLASMA.map(function (c, i) { return 'rgb(' + c.join(',') + ') ' + (i / (PLASMA.length - 1) * 100) + '%'; }).join(',');
            } else {
                lo = 'low error'; hi = 'high error · ' + fmt(d().errHi, 2);
                grad = ERR.map(function (c, i) { return 'rgb(' + c.join(',') + ') ' + (i / (ERR.length - 1) * 100) + '%'; }).join(',');
            }
            el.scaleLo.textContent = lo;
            el.scaleHi.textContent = hi;
            el.scaleBar.style.background = 'linear-gradient(90deg,' + grad + ')';
        }

        var CTX_PATCHES = 5, CROP = CTX_PATCHES * P, CROP_OUT = 120;

        function cropOrigin(i) {
            var half = Math.floor(CTX_PATCHES / 2);
            var cx = (i % GW) - half, cy = Math.floor(i / GW) - half;
            cx = Math.max(0, Math.min(GW - CTX_PATCHES, cx));
            cy = Math.max(0, Math.min(GH - CTX_PATCHES, cy));
            return [cx * P, cy * P, cx, cy];
        }

        function updateCrops() {
            var i = pinned >= 0 ? pinned : hover;
            var im = images[p().id];
            el.crops.forEach(function (cv) {
                var ctx = cv.getContext('2d');
                ctx.clearRect(0, 0, CROP_OUT, CROP_OUT);
                if (i < 0) return;
                var o = cropOrigin(i), k = CROP_OUT / CROP;
                ctx.imageSmoothingEnabled = true;
                ctx.drawImage(im[cv.getAttribute('data-src')], o[0], o[1], CROP, CROP, 0, 0, CROP_OUT, CROP_OUT);
                var bx = ((i % GW) - o[2]) * P * k, by = (Math.floor(i / GW) - o[3]) * P * k;
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgba(0,0,0,0.75)';
                ctx.strokeRect(bx + 1, by + 1, P * k - 2, P * k - 2);
                ctx.strokeStyle = 'rgba(255,255,255,0.95)';
                ctx.strokeRect(bx + 2.5, by + 2.5, P * k - 5, P * k - 5);
            });
        }

        function updateReadout() {
            var i = pinned >= 0 ? pinned : hover, pp = p();
            if (i < 0) {
                el.readout.innerHTML = '<div class="gk-empty">Hover the image to inspect a patch.</div>';
                return;
            }
            var isMasked = !!pp.mask[i];
            var gt = pp.valid[i] <= 0.6 ? '<span class="gk-chip gk-chip-un">no ground truth</span>'
                : pp.covis[i] > 0.5 ? '<span class="gk-chip gk-chip-cov">co-visible</span>'
                    : '<span class="gk-chip gk-chip-non">not co-visible</span>';
            var rows = '<div class="gk-kv"><span>ground truth</span><b>' + gt + '</b></div>' +
                '<div class="gk-kv"><span>predicted Ĉ</span><b>' + fmt(pp.c_hat[i]) + '</b></div>';
            if (isMasked) {
                var gain = pp.l_mae[i] / Math.max(pp.l_croco[i], 1e-6);
                rows += '<div class="gk-kv"><span>ℓ MAE (no reference)</span><b>' + fmt(pp.l_mae[i]) + '</b></div>' +
                    '<div class="gk-kv"><span>ℓ CroCo (with reference)</span><b>' + fmt(pp.l_croco[i]) + '</b></div>' +
                    '<div class="gk-kv"><span>measured C</span><b>' + fmt(pp.c[i]) + '</b></div>' +
                    '<div class="gk-bars">' +
                    '<div class="gk-bar"><i style="width:' + Math.min(100, pp.l_mae[i] / d().errHi * 100) + '%;background:' + NOCOVIS + '"></i><span>ℓ MAE</span></div>' +
                    '<div class="gk-bar"><i style="width:' + Math.min(100, pp.l_croco[i] / d().errHi * 100) + '%;background:' + COVIS + '"></i><span>ℓ CroCo</span></div>' +
                    '</div>' +
                    '<div class="gk-verdict">' + (gain >= 1.15
                        ? 'The reference cut the error <b>' + fmt(gain, 1) + '×</b>.'
                        : gain <= 0.95 ? 'The reference did not help here.'
                            : 'Both passes did about equally well, so the reference added nothing here.') + '</div>';
            } else {
                rows += '<div class="gk-verdict">This patch was <b>visible</b> to the network, so it carries no reconstruction target. Ĉ is predicted everywhere nonetheless.</div>';
            }
            el.readout.innerHTML = rows;
        }

        function updateStats() {
            var pp = p(), dd = d();
            el.stats.innerHTML =
                '<div class="gk-stat"><b>' + fmt(dd.gainCov, 2) + '×</b><span>median ℓ<sub>MAE</sub> ÷ ℓ<sub>CroCo</sub> on co-visible patches</span></div>' +
                '<div class="gk-stat"><b>' + fmt(dd.gainNon, 2) + '×</b><span>the same ratio where the reference sees nothing</span></div>' +
                '<div class="gk-stat"><b>' + fmt(pp.ap_hat, 2) + '</b><span>AP of predicted Ĉ as a co-visibility classifier</span></div>' +
                '<div class="gk-stat"><b>' + fmt(pp.ap_true, 2) + '</b><span>AP of the raw measured C it regresses</span></div>';
        }

        function redraw() {
            if (!images[p().id]) return;
            drawMap(mapCtx, p(), d(), IW, IH);
            drawScatter(el.scatter, p(), d());
            updateCrops(); updateReadout(); updateScale(); updateStats();
        }

        var probe = document.createElement('canvas');
        probe.width = probe.height = P;
        var probeCtx = probe.getContext('2d', { willReadFrequently: true });

        function patchContrast(im, i) {
            try {
                probeCtx.drawImage(im, (i % GW) * P, Math.floor(i / GW) * P, P, P, 0, 0, P, P);
                var px = probeCtx.getImageData(0, 0, P, P).data, s = 0, s2 = 0, n = P * P;
                for (var k = 0; k < px.length; k += 4) {
                    var v = 0.299 * px[k] + 0.587 * px[k + 1] + 0.114 * px[k + 2];
                    s += v; s2 += v * v;
                }
                return Math.sqrt(Math.max(s2 / n - (s / n) * (s / n), 0));
            } catch (e) { return 1; }
        }

        // a patch worth landing on: the reference clearly helped and there is
        // something to look at in the crop
        function defaultPatch(pp, dd, im) {
            var floor = quantile(dd.cov.map(function (k) { return pp.l_mae[k]; }), 0.6);
            var top = dd.cov.filter(function (k) { return pp.l_mae[k] >= floor; })
                .map(function (k) { return [k, pp.l_mae[k] / Math.max(pp.l_croco[k], 1e-6)]; })
                .sort(function (a, b) { return b[1] - a[1]; })
                .slice(0, 24);
            var best = top.length ? top[0][0] : -1, bestScore = -1;
            top.forEach(function (t) {
                var score = patchContrast(im.target, t[0]) * Math.min(t[1], 8);
                if (score > bestScore) { bestScore = score; best = t[0]; }
            });
            return best;
        }

        function selectPair(i) {
            cur = i; hover = -1; pinned = -1;
            el.tabs.forEach(function (b, k) { b.classList.toggle('on', k === i); });
            loadImages(pairs[i], function () {
                pinned = defaultPatch(pairs[i], derived[i], images[pairs[i].id]);
                paintDiagramImages();
                setStage(stage);
                redraw();
                drawWires(dia);
            });
        }

        // events -------------------------------------------------------------
        el.tabs.forEach(function (b) {
            b.addEventListener('click', function () { selectPair(+b.getAttribute('data-pair')); });
        });
        el.play.addEventListener('click', function () { playing ? pause() : play(); });
        el.seg.forEach(function (b) {
            b.addEventListener('click', function () {
                focus = b.getAttribute('data-focus');
                el.seg.forEach(function (o) { o.classList.toggle('on', o === b); });
                dia.diagram.setAttribute('data-focus', focus);
            });
        });
        el.steps.forEach(function (b) {
            b.addEventListener('click', function () { setStage(+b.getAttribute('data-stage'), true); });
        });
        el.fields.forEach(function (b) {
            b.addEventListener('click', function () {
                field = b.getAttribute('data-field');
                el.fields.forEach(function (o) { o.classList.toggle('on', o === b); });
                redraw();
            });
        });

        function patchAt(ev) {
            var r = el.map.getBoundingClientRect();
            var t = ev.touches ? ev.touches[0] : ev;
            var x = Math.floor((t.clientX - r.left) / r.width * GW);
            var y = Math.floor((t.clientY - r.top) / r.height * GH);
            if (x < 0 || y < 0 || x >= GW || y >= GH) return -1;
            return y * GW + x;
        }
        el.map.addEventListener('mousemove', function (ev) {
            var i = patchAt(ev);
            if (i !== hover) { hover = i; redraw(); }
        });
        el.map.addEventListener('mouseleave', function () { hover = -1; redraw(); });
        el.map.addEventListener('click', function (ev) {
            var i = patchAt(ev);
            pinned = (pinned === i) ? -1 : i;
            redraw();
        });
        el.map.addEventListener('touchstart', function (ev) {
            var i = patchAt(ev);
            if (i >= 0) { ev.preventDefault(); pinned = i; hover = i; redraw(); }
        }, { passive: false });

        var ro = new ResizeObserver(function () { drawWires(dia); drawScatter(el.scatter, p(), d()); });
        ro.observe(host);
        new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        selectPair(0);
        if (reduceMotion) { setStage(STAGES.length - 1); pause(); } else { play(); }
        // pause the loop while the widget is off-screen
        new IntersectionObserver(function (es) {
            es.forEach(function (e) {
                if (!e.isIntersecting) { clearInterval(timer); }
                else if (playing) { clearInterval(timer); timer = setInterval(tick, STAGE_MS); }
            });
        }, { threshold: 0.05 }).observe(host);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
