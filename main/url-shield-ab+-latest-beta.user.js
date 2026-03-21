// ==UserScript==
// @name YouTube Mobile URL Shield AB+
// @namespace http://tampermonkey.com/
// @version 3.0.7
// @match https://*.youtube.com/*
// @run-at document-start
// ==/UserScript==

(function(d, w) {
    'use strict';
    let l = 0, g = 0, u = 0, cur = location.pathname;
    const el = (t, s) => Object.assign(d.createElement(t), { style: s }),
          sh = el('div', 'position:fixed;inset:0;z-index:2147483647;display:none'),
          br = el('div', 'position:absolute;bottom:0;width:100%;height:120px;font:900 20px arial;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);pointer-events:auto'),
          hi = el('div', 'position:fixed;bottom:120px;left:15px;width:90px;height:45px;text-align:center;line-height:45px;border-radius:12px 12px 0 0;z-index:2147483647;display:none;font-weight:900;font-size:14px;pointer-events:auto'),
          tb = el('div', 'position:fixed;bottom:40px;right:20px;width:70px;height:45px;border-radius:12px;display:none;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);pointer-events:none'),
          th = el('div', 'position:fixed;bottom:40px;right:20px;width:70px;height:45px;z-index:2147483647;display:none;pointer-events:auto');

    br.innerText = 'TAP TO UNMUTE'; hi.innerText = 'HIDE'; sh.append(br);
    const f = () => d.querySelectorAll('video').forEach(v => { v.muted = !1; v.volume = 1; v.paused && v.play().catch(()=>{}) });

    w.addEventListener('touchstart', e => {
        if (sh.style.display == 'none' || l || e.target.closest('button, a, svg')) return;
        if (br.contains(e.target) || (location.pathname.startsWith('/watch') && sh.style.pointerEvents != 'none')) {
            e.preventDefault(); e.stopImmediatePropagation(); u = 1; sh.style.display = 'none';
            let s = Date.now(), h = () => { f(); (Date.now() - s < 400) && requestAnimationFrame(h) }; h();
        }
    }, { capture: !0, passive: !1 });

    hi.ontouchstart = e => { e.preventDefault(); e.stopPropagation(); l = 1 };
    th.ontouchstart = e => { e.preventDefault(); e.stopPropagation(); l = 0 };

    (function loop() {
        const p = location.pathname, isW = p.startsWith('/watch'), isS = p.startsWith('/results'), 
              isFS = d.fullscreenElement || d.webkitIsFullScreen, act = d.activeElement;
        
        (p != cur) && (!isS && (l = 0), cur = p); // Nav Reset Logic
        d.querySelectorAll('ytd-ad-slot-renderer, ytm-ad-slot-renderer, .ad-showing, .ad-interrupting').forEach(t => t.remove());

        if (isW && d.querySelector('.ad-showing')) return location.replace(location.href.split('&ts=')[0] + (location.href.includes('?') ? '&' : '?') + 'ts=' + Date.now());

        let v = d.querySelector('video'), dk = w.matchMedia('(prefers-color-scheme: dark)').matches || d.documentElement.hasAttribute('dark');
        (isW && v?.readyState == 0 && ++g > 60) ? (w.dispatchEvent(new PopStateEvent('popstate')), g = 0) : (!isW && (g = 0));

        if ((act && /INPUT|TEXTAREA/.test(act.tagName)) || d.querySelector('.ytm-sidebar-open')) {
            sh.style.display = hi.style.display = tb.style.display = th.style.display = 'none';
        } else {
            const c = dk ? ['#fff', '#111', '#333', 'rgba(15,15,15,0.9)'] : ['#0f0f0f', '#fff', '#e5e5e5', 'rgba(255,255,255,0.9)'];
            br.style.cssText += `background:${c[3]};color:${c[0]};border-top:1px solid ${c[2]}`;
            hi.style.cssText += `background:${c[0]};color:${c[1]};border:1px solid ${c[2]};border-bottom:none`;
            tb.style.cssText += `background:${dk ? 'rgba(28,28,28,0.7)' : 'rgba(240,240,240,0.7)'};border:1px solid ${c[2]}`;

            sh.style.pointerEvents = isW ? 'auto' : 'none';
            const hideVisuals = (isW && isFS);

            if (l && isS) {
                sh.style.display = hi.style.display = 'none'; !tb.parentNode && d.body.append(sh, tb, th);
                tb.style.display = th.style.display = 'block';
            } else {
                tb.style.display = th.style.display = 'none';
                let n = [...d.getElementsByTagName('video')].some(v => v.src && !v.paused && v.muted);
                if (n) {
                    !sh.parentNode && d.body.append(sh, hi);
                    sh.style.display = 'block';
                    br.style.display = hideVisuals ? 'none' : 'flex';
                    hi.style.display = (isS && !l && !hideVisuals) ? 'block' : 'none';
                } else if (!u) sh.style.display = hi.style.display = 'none';
            }
        }
        u = 0; requestAnimationFrame(loop);
    })();
})(document, window);
