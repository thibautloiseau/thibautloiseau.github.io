/* The two "Beyond ScanNet" read-outs, on datasets outside the pre-training mix.
 *
 * The paper and the poster carry these as flat matplotlib grids. Four datasets wide,
 * inside a text column, every panel ends up a couple of centimetres across and the
 * figure is unreadable, so the page composes the same panels itself, one dataset at a
 * time, from assets/beyond/ + assets/beyond/data.js:
 *
 *   1. the predicted co-visibility channel Ĉ, next to CroCo's reconstruction error
 *      read as the same kind of detector, on four unseen pairs,
 *   2. encoder features projected on three principal components, flipping in place
 *      between the two released Large backbones.
 *
 * Everything shown is exported by scripts/make_beyond_panels.py. The per-patch numbers
 * travel in data.js rather than being read back out of the drawn canvases, which would
 * be blocked under file:// — same reason the method explorer ships its own arrays.
 */
(function () {
    'use strict';

    var DATA = window.GEKKO_BEYOND_DATA;
    var host = document.getElementById('gekko-beyond');
    if (!DATA || !host) return;

    var GH = DATA.grid[0], GW = DATA.grid[1], N = GH * GW;
    var CW = 768, CH = 576, PX = CW / GW;   // canvas size, and one patch in canvas pixels
    var COVIS = '#10b981';

    // Same plasma ramp the figures use. Each widget on this page is a standalone IIFE,
    // so the method explorer keeps its own copy.
    var PLASMA = [
        [13, 8, 135], [75, 3, 161], [125, 3, 168], [168, 34, 150], [203, 70, 121],
        [229, 107, 93], [248, 148, 65], [253, 195, 40], [240, 249, 33]
    ];

    function plasma(t) {
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        var x = t * (PLASMA.length - 1), i = Math.min(Math.floor(x), PLASMA.length - 2), f = x - i;
        var a = PLASMA[i], b = PLASMA[i + 1];
        return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' +
            Math.round(a[1] + (b[1] - a[1]) * f) + ',' +
            Math.round(a[2] + (b[2] - a[2]) * f) + ')';
    }

    var plasmaGradient = PLASMA.map(function (c, i) {
        return 'rgb(' + c.join(',') + ') ' + (i / (PLASMA.length - 1) * 100) + '%';
    }).join(',');

    function decode(s) {
        var bin = atob(s), a = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
        return a;
    }

    function css(name, fallback) {
        var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    }

    /** Patch index under a pointer event, or -1 outside the canvas. */
    function patchAt(canvas, ev) {
        var r = canvas.getBoundingClientRect();
        var c = Math.floor((ev.clientX - r.left) / r.width * GW);
        var y = Math.floor((ev.clientY - r.top) / r.height * GH);
        if (c < 0 || c >= GW || y < 0 || y >= GH) return -1;
        return y * GW + c;
    }

    /** Mark one patch. Two passes, dark under light, so it reads on any panel. */
    function outline(ctx, i, guides) {
        var x = (i % GW) * PX, y = Math.floor(i / GW) * PX;
        if (guides) {
            // Full-width guides: at a quarter of the page's width a single patch is a
            // few pixels across, and these are what actually carry the eye from one
            // panel to the next.
            ctx.save();
            ctx.setLineDash([7, 7]);
            [['rgba(0,0,0,0.45)', 3], ['rgba(255,255,255,0.9)', 1.4]].forEach(function (pass) {
                ctx.strokeStyle = pass[0]; ctx.lineWidth = pass[1];
                ctx.beginPath();
                ctx.moveTo(0, y + PX / 2); ctx.lineTo(CW, y + PX / 2);
                ctx.moveTo(x + PX / 2, 0); ctx.lineTo(x + PX / 2, CH);
                ctx.stroke();
            });
            ctx.restore();
        }
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeRect(x, y, PX, PX);
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.strokeRect(x, y, PX, PX);
    }

    function tabs(items, onPick) {
        var wrap = document.createElement('div');
        wrap.className = 'gk-tabs';
        items.forEach(function (it, i) {
            var b = document.createElement('button');
            b.className = 'gk-tab' + (i === 0 ? ' on' : '');
            b.textContent = it.label;
            b.addEventListener('click', function () {
                wrap.querySelectorAll('.gk-tab').forEach(function (o) { o.classList.remove('on'); });
                b.classList.add('on');
                onPick(i);
            });
            wrap.appendChild(b);
        });
        return wrap;
    }

    function segment(root, attr, onPick) {
        root.querySelectorAll('.gk-seg button[data-' + attr + ']').forEach(function (b) {
            b.addEventListener('click', function () {
                b.parentNode.querySelectorAll('button').forEach(function (o) { o.classList.remove('on'); });
                b.classList.add('on');
                onPick(b.getAttribute('data-' + attr));
            });
        });
    }


    // Captions. Written against the exported panels; they live here rather than in the
    // export so that wording can change without re-running the models.
    var COVIS_NOTE = {
        greatcourt: 'The reference steps right, onto the fountain. Ĉ averages <b>0.32</b> over the ranges and <b>0.07</b> over the lawn — which both cameras do see: a uniform surface the target’s own context already reconstructs leaves the second view nothing to add, and the loss down-weights exactly those pixels. ℓ<sub>CroCo</sub> draws no such distinction, 0.54 against 0.49.',
        kings: 'Ĉ averages <b>0.39</b> over the chapel front and <b>0.05</b> over the road in the foreground. ℓ<sub>CroCo</sub> runs the other way — 0.41 on the facade against <b>0.64</b> on the road — because a smooth road is the easiest thing in the frame to reconstruct, with or without a second view.',
        pumpkin: 'The reference looks across the room from the other side, so the target’s right-hand third — the vending machine and the units beside it — is not in the pair. Ĉ averages <b>0.53</b> over the shared counter and <b>0.01</b> there. 7-Scenes ships depth and poses, so this pair can be scored properly: against ground-truth co-visibility Ĉ reaches <b>AP 0.80</b> and ℓ<sub>CroCo</sub> <b>0.35</b>, on a base rate of 0.28 — barely better than guessing.',
        delivery: 'The rig steps sideways across the loading bay. Ĉ averages <b>0.53</b> over the van and the racking behind it and <b>0.10</b> over the bare floor: flat concrete, seen by both cameras, where the reference has nothing to add. ℓ<sub>CroCo</sub> is if anything brighter on the floor than on the van, 0.56 against 0.52.'
    };
    var COVIS_META = 'Both models are Base, 200k steps on the same 12-source mix — the matched pair the paper reports. ℓ<sub>CroCo</sub> is shown by rank: average precision depends only on the ranking, so this is CroCo\u2019s error read at its most favourable, and it still tracks edges and texture rather than the overlap. The four pairs come from a 543-pair sweep, ranked on how much structure Ĉ has, how much of one region its top-40% selection is, and how far ℓ<sub>CroCo</sub> is from reproducing it. The averages quoted are means over boxes drawn by hand; the AP is over every labelled patch.';

    var PCA_NOTE = {
        scannet: 'Inside the pre-training mix — the one pair of the four that is, and the easiest case for both models. Gekko gives each armchair one colour and the floor another, and <b>85%</b> of patches survive the round trip against CroCo v2’s <b>68%</b>: the widest margin of the four, on the data it was trained on.',
        redkitchen: 'Outside the mix. Match a patch into the other view and back again: it returns to within two patches for <b>81%</b> of the image under Gekko, <b>71%</b> under CroCo v2.',
        playground: 'Outside the mix, outdoors and grey-scale. <b>80%</b> of patches survive the round trip against <b>71%</b>, and the PCA image is close to half as busy, <b>0.070</b> against <b>0.120</b>.',
        oldhospital: 'Outside the mix, and the hardest of the four for both models — a facade of near-identical bays is exactly where a feature can confuse one place with another. Gekko still leads, <b>63%</b> of patches surviving the round trip against <b>58%</b>.'
    };
    var PCA_META = 'The PCA is fitted on both views at once and scaled over the two together, so a colour means the same thing in each: matching colours across the viewpoint change mean corresponding surfaces get corresponding features. These pairs come from the same sweep, ranked here on what this card claims — how many patches survive a round trip through the other view, and how far the features settle into regions rather than tracking texture. Gekko led CroCo v2 on both measures for 783 of the 939 candidates swept — on the smoothness alone for 894 of them. The two are <em>released</em> backbones and do not share a pre-training corpus, so the comparison is qualitative rather than controlled.';

    // =============================================== 1 · the co-visibility channel

    var covis = DATA.covis.map(function (p) {
        var o = {
            id: p.id, label: p.label, note: COVIS_NOTE[p.id],
            chat: decode(p.chat), croco: decode(p.croco), img: null
        };
        // Sorted copies, so the top-X% cut is a lookup rather than a sort per frame.
        o.sorted = {
            chat: Array.prototype.slice.call(o.chat).sort(function (a, b) { return a - b; }),
            croco: Array.prototype.slice.call(o.croco).sort(function (a, b) { return a - b; })
        };
        return o;
    });

    var COVIS_IMGS = ['target', 'reference', 'croco', 'chat'];

    function loadCovis(p, done) {
        if (p.img) { done(); return; }
        var set = {}, left = COVIS_IMGS.length;
        COVIS_IMGS.forEach(function (n) {
            var im = new Image();
            im.onload = im.onerror = function () { if (--left === 0) { p.img = set; done(); } };
            im.src = 'assets/beyond/covis/' + p.id + '/' + n + '.jpg';
            set[n] = im;
        });
    }

    var repaint = [];   // re-render hooks, for a theme flip under the widgets

    function buildCovis(root) {
        var cur = 0, mode = 'heat', keep = 0.4, hover = -1, pinned = -1;

        root.appendChild(tabs(covis, function (i) {
            cur = i; hover = pinned = -1;
            loadCovis(covis[cur], render);
        }));

        var card = document.createElement('div');
        card.className = 'gk-card';
        card.innerHTML =
            '<div class="gk-card-head">' +
            '  <h3>1 &middot; The co-visibility channel, off its training distribution</h3>' +
            '  <div class="gk-seg">' +
            '    <button data-mode="heat" class="on">heat maps</button>' +
            '    <button data-mode="select">top-X% selection</button>' +
            '  </div>' +
            '</div>' +
            '<div class="gb-row">' +
            '  <figure class="gb-pan" data-pan="target" data-link="1"><canvas width="' + CW + '" height="' + CH + '"></canvas>' +
            '    <figcaption><b>Target</b><span>the view being reconstructed</span></figcaption></figure>' +
            '  <figure class="gb-pan" data-pan="reference"><canvas width="' + CW + '" height="' + CH + '"></canvas>' +
            '    <figcaption><b>Reference</b><span>the second view, never masked</span></figcaption></figure>' +
            '  <figure class="gb-pan" data-pan="croco" data-link="1"><canvas width="' + CW + '" height="' + CH + '"></canvas>' +
            '    <figcaption><b class="gb-cap-croco"></b><span class="gb-sub-croco"></span></figcaption></figure>' +
            '  <figure class="gb-pan" data-pan="chat" data-link="1"><canvas width="' + CW + '" height="' + CH + '"></canvas>' +
            '    <figcaption><b class="gb-cap-chat"></b><span class="gb-sub-chat"></span></figcaption></figure>' +
            '</div>' +
            '<div class="gb-hint">hover the target or either map &mdash; the three share the target&rsquo;s geometry, the reference does not</div>' +
            '<div class="gb-controls">' +
            '  <div class="gb-left">' +
            '    <div class="gb-slider gb-keep" hidden><label>keep the top</label>' +
            '      <input type="range" min="5" max="80" step="5" value="40" aria-label="fraction of the image selected">' +
            '      <b class="gb-keep-v">40%</b></div>' +
            '    <div class="gk-scale gb-legend"><span class="gb-lo"></span><div class="gk-scale-bar"></div><span class="gb-hi"></span></div>' +
            '  </div>' +
            '  <div class="gb-read">' +
            '    <div class="gk-bars">' +
            '      <div class="gk-bar"><i class="gb-bar-chat"></i><span>&#264;</span><b class="gb-val-chat"></b></div>' +
            '      <div class="gk-bar"><i class="gb-bar-croco"></i><span>&#8467;<sub>CroCo</sub></span><b class="gb-val-croco"></b></div>' +
            '    </div>' +
            '    <div class="gb-verdict"></div>' +
            '  </div>' +
            '</div>' +
            '<div class="gb-note"></div><div class="gb-meta">' + COVIS_META + '</div>';
        root.appendChild(card);

        var q = card.querySelector.bind(card);
        var canvases = {};
        COVIS_IMGS.forEach(function (k) { canvases[k] = q('[data-pan="' + k + '"] canvas'); });

        function threshold(which) {
            var s = covis[cur].sorted[which];
            return s[Math.min(N - 1, Math.max(0, Math.floor((1 - keep) * N)))];
        }

        function paintMap(which) {
            var p = covis[cur], ctx = canvases[which].getContext('2d');
            ctx.clearRect(0, 0, CW, CH);
            if (mode === 'heat') {
                ctx.drawImage(p.img[which], 0, 0, CW, CH);
            } else {
                // The selection is shown over the target itself, so the two scores are
                // read against the scene rather than against each other's colour scale.
                if ('filter' in ctx) ctx.filter = 'grayscale(1)';
                ctx.drawImage(p.img.target, 0, 0, CW, CH);
                if ('filter' in ctx) ctx.filter = 'none';
                var thr = threshold(which), v = p[which];
                ctx.fillStyle = COVIS; ctx.globalAlpha = 0.5;
                for (var i = 0; i < N; i++) {
                    if (v[i] >= thr) ctx.fillRect((i % GW) * PX, Math.floor(i / GW) * PX, PX, PX);
                }
                ctx.globalAlpha = 1;
            }
            if (marker() >= 0) outline(ctx, marker(), true);
        }

        function marker() { return pinned >= 0 ? pinned : hover; }

        function render() {
            var p = covis[cur];
            if (!p.img) { loadCovis(p, render); return; }

            var ctx = canvases.target.getContext('2d');
            ctx.drawImage(p.img.target, 0, 0, CW, CH);
            if (marker() >= 0) outline(ctx, marker(), true);
            canvases.reference.getContext('2d').drawImage(p.img.reference, 0, 0, CW, CH);
            paintMap('croco');
            paintMap('chat');

            var pct = Math.round(keep * 100) + '%';
            q('.gb-cap-chat').innerHTML = mode === 'heat' ? 'Predicted &#264;' : '&#264; &middot; top ' + pct;
            q('.gb-sub-chat').textContent = mode === 'heat' ? 'Gekko, bright where the reference helps'
                : 'what Gekko calls co-visible';
            q('.gb-cap-croco').innerHTML = mode === 'heat' ? '&#8467;<sub>CroCo</sub> (rank)' : '&#8467;<sub>CroCo</sub> &middot; top ' + pct;
            q('.gb-sub-croco').textContent = mode === 'heat' ? 'CroCo, bright where its error is low'
                : 'what CroCo’s error calls co-visible';

            q('.gb-keep').hidden = mode !== 'select';
            q('.gb-legend').hidden = mode !== 'heat';
            q('.gb-lo').textContent = '0 · the reference adds nothing';
            q('.gb-hi').textContent = 'the reference resolved it · 1';
            q('.gk-scale-bar').style.background = 'linear-gradient(90deg,' + plasmaGradient + ')';
            q('.gb-note').innerHTML = p.note;
            renderReadout();
        }

        function renderReadout() {
            var p = covis[cur], i = marker();
            var bars = q('.gb-read');
            if (i < 0) {
                bars.classList.add('gb-idle');
                q('.gb-verdict').textContent = mode === 'select'
                    ? 'Both maps keep the same share of the image, so the two selections are directly comparable.'
                    : 'Pick a patch to read both scores.';
                q('.gb-bar-chat').style.width = q('.gb-bar-croco').style.width = '0%';
                return;
            }
            bars.classList.remove('gb-idle');
            var c = p.chat[i] / 255, e = p.croco[i] / 255;
            q('.gb-bar-chat').style.width = (c * 100).toFixed(0) + '%';
            q('.gb-bar-chat').style.background = plasma(c);
            q('.gb-bar-croco').style.width = (e * 100).toFixed(0) + '%';
            q('.gb-bar-croco').style.background = plasma(e);
            q('.gb-val-chat').textContent = c.toFixed(2);
            q('.gb-val-croco').textContent = e.toFixed(2);
            q('.gb-verdict').innerHTML = 'Patch ' + (Math.floor(i / GW) + 1) + ',' + (i % GW + 1) + ' &mdash; ' +
                (c > 0.5 ? 'Gekko reads this as <b>co-visible</b>.'
                    : c < 0.2 ? 'Gekko reads this as <b>not co-visible</b>.'
                        : 'Gekko is <b>undecided</b> here.');
        }

        COVIS_IMGS.forEach(function (k) {
            var fig = q('[data-pan="' + k + '"]');
            if (!fig.hasAttribute('data-link')) return;
            var cv = canvases[k];
            cv.addEventListener('mousemove', function (ev) {
                var i = patchAt(cv, ev);
                if (i !== hover) { hover = i; if (pinned < 0) render(); }
            });
            cv.addEventListener('mouseleave', function () {
                if (hover !== -1) { hover = -1; if (pinned < 0) render(); }
            });
            cv.addEventListener('click', function (ev) {
                var i = patchAt(cv, ev);
                pinned = (pinned === i) ? -1 : i;
                render();
            });
        });

        segment(card, 'mode', function (m) { mode = m; render(); });
        q('.gb-keep input').addEventListener('input', function () {
            keep = Number(this.value) / 100;
            q('.gb-keep-v').textContent = this.value + '%';
            render();
        });

        repaint.push(render);
        loadCovis(covis[cur], render);
    }

    // ====================================================== 2 · the encoder features

    var pca = DATA.pca.map(function (p) {
        return {
            id: p.id, label: p.label, note: PCA_NOTE[p.id],
            croco: p.croco.map(decode), gekko: p.gekko.map(decode), img: null
        };
    });

    function loadPca(p, done) {
        if (p.img) { done(); return; }
        var set = {}, left = 2;
        ['view1', 'view2'].forEach(function (n) {
            var im = new Image();
            im.onload = im.onerror = function () { if (--left === 0) { p.img = set; done(); } };
            im.src = 'assets/beyond/pca/' + p.id + '/' + n + '.jpg';
            set[n] = im;
        });
    }

    function buildPca(root) {
        var cur = 0, model = 'gekko', tol = 0.13;
        var probe = -1, probeView = 0, pinned = false;

        root.appendChild(tabs(pca, function (i) {
            cur = i; probe = -1; pinned = false;
            loadPca(pca[cur], render);
        }));

        var card = document.createElement('div');
        card.className = 'gk-card';
        card.innerHTML =
            '<div class="gk-card-head">' +
            '  <h3>2 &middot; Encoder features, on three principal components</h3>' +
            '  <div class="gk-seg">' +
            '    <button data-model="croco">CroCo v2-L</button>' +
            '    <button data-model="gekko" class="on">Gekko-L</button>' +
            '  </div>' +
            '</div>' +
            '<div class="gb-pair"><span>the pair the features come from</span>' +
            '  <img data-view="0" alt="First view of the pair">' +
            '  <img data-view="1" alt="Second view of the pair"></div>' +
            '<div class="gb-pca">' +
            '  <figure class="gb-pan"><canvas data-view="0" width="' + CW + '" height="' + CH + '"></canvas>' +
            '    <figcaption><b>View 1</b><span>features, three leading components as RGB</span></figcaption></figure>' +
            '  <figure class="gb-pan"><canvas data-view="1" width="' + CW + '" height="' + CH + '"></canvas>' +
            '    <figcaption><b>View 2</b><span>same PCA basis, same colour scale</span></figcaption></figure>' +
            '</div>' +
            '<div class="gb-hint">hover a patch to light up every patch of <em>both</em> views with a similar feature &mdash; then flip the model above, with the pointer where it is</div>' +
            '<div class="gb-controls">' +
            '  <div class="gb-slider"><label>colour tolerance</label>' +
            '    <input type="range" min="4" max="35" step="1" value="13" aria-label="feature matching tolerance">' +
            '    <b class="gb-tol-v">0.13</b></div>' +
            '  <div class="gb-read gb-idle">' +
            '    <div class="gb-probe"><i class="gb-swatch"></i><div class="gb-probe-txt"></div></div>' +
            '  </div>' +
            '</div>' +
            '<div class="gb-note"></div><div class="gb-meta">' + PCA_META + '</div>';
        root.appendChild(card);

        var q = card.querySelector.bind(card);
        var canvases = [q('canvas[data-view="0"]'), q('canvas[data-view="1"]')];
        var small = document.createElement('canvas');
        small.width = GW; small.height = GH;

        function maps() { return pca[cur][model]; }

        /** Patches whose PCA colour is within `tol` of the probe, in normalised RGB. */
        function matches(arr, rgb) {
            var out = [], lim = tol * tol * 3;
            for (var i = 0; i < N; i++) {
                var dr = (arr[i * 3] - rgb[0]) / 255, dg = (arr[i * 3 + 1] - rgb[1]) / 255,
                    db = (arr[i * 3 + 2] - rgb[2]) / 255;
                out.push(dr * dr + dg * dg + db * db <= lim);
            }
            return out;
        }

        function drawView(v, hit) {
            var arr = maps()[v], ctx = canvases[v].getContext('2d');
            var sctx = small.getContext('2d');
            var img = sctx.createImageData(GW, GH);
            for (var i = 0; i < N; i++) {
                img.data[i * 4] = arr[i * 3];
                img.data[i * 4 + 1] = arr[i * 3 + 1];
                img.data[i * 4 + 2] = arr[i * 3 + 2];
                img.data[i * 4 + 3] = 255;
            }
            sctx.putImageData(img, 0, 0);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(small, 0, 0, CW, CH);

            if (hit) {   // everything unlike the probe recedes
                ctx.fillStyle = css('--bg-surface', '#ffffff');
                ctx.globalAlpha = 0.72;
                for (var k = 0; k < N; k++) {
                    if (!hit[k]) ctx.fillRect((k % GW) * PX, Math.floor(k / GW) * PX, PX, PX);
                }
                ctx.globalAlpha = 1;
            }
            if (probe >= 0 && probeView === v) outline(ctx, probe, false);
        }

        function render() {
            var p = pca[cur];
            if (!p.img) { loadPca(p, render); return; }
            card.querySelectorAll('.gb-pair img').forEach(function (im) {
                im.src = p.img['view' + (Number(im.getAttribute('data-view')) + 1)].src;
            });

            var hits = null;
            if (probe >= 0) {
                var a = maps()[probeView];
                var rgb = [a[probe * 3], a[probe * 3 + 1], a[probe * 3 + 2]];
                hits = [matches(maps()[0], rgb), matches(maps()[1], rgb)];
                var n0 = hits[0].filter(Boolean).length, n1 = hits[1].filter(Boolean).length;
                q('.gb-read').classList.remove('gb-idle');
                q('.gb-swatch').style.background = 'rgb(' + rgb.join(',') + ')';
                q('.gb-probe-txt').innerHTML =
                    '<b>' + n0 + '</b> matching patches in view 1, <b>' + n1 + '</b> in view 2' +
                    '<span>out of ' + N + ' per view &middot; ' + (model === 'gekko' ? 'Gekko-L' : 'CroCo v2-L') + '</span>';
            } else {
                q('.gb-read').classList.add('gb-idle');
                q('.gb-swatch').style.background = 'transparent';
                q('.gb-probe-txt').innerHTML = 'Pick a patch in either view.' +
                    '<span>The PCA is fitted on both views at once, so a colour means the same thing in each.</span>';
            }
            drawView(0, hits && hits[0]);
            drawView(1, hits && hits[1]);
            q('.gb-note').innerHTML = p.note;
        }

        canvases.forEach(function (cv, v) {
            cv.addEventListener('mousemove', function (ev) {
                if (pinned) return;
                var i = patchAt(cv, ev);
                if (i !== probe || v !== probeView) { probe = i; probeView = v; render(); }
            });
            cv.addEventListener('mouseleave', function () {
                if (!pinned && probe !== -1) { probe = -1; render(); }
            });
            cv.addEventListener('click', function (ev) {
                var i = patchAt(cv, ev);
                pinned = !(pinned && probe === i && probeView === v);
                probe = pinned ? i : -1; probeView = v;
                render();
            });
        });

        segment(card, 'model', function (m) { model = m; render(); });
        q('.gb-slider input').addEventListener('input', function () {
            tol = Number(this.value) / 100;
            q('.gb-tol-v').textContent = tol.toFixed(2);
            render();
        });

        repaint.push(render);
        loadPca(pca[cur], render);
    }

    // ------------------------------------------------------------------- mount

    var one = document.createElement('div');
    var two = document.createElement('div');
    host.appendChild(one);
    host.appendChild(two);
    buildCovis(one);
    buildPca(two);

    // The dimming veil is painted in the card's own background colour, so the canvases
    // have to be redrawn when the theme changes under them.
    new MutationObserver(function () {
        repaint.forEach(function (f) { f(); });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
