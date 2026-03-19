// ==UserScript==
// @name YouTube Mobile URL Shield AB+
// @version 3.0.4
// @match https://*.youtube.com/*
// @run-at document-start
// ==/UserScript==

(function() {
    'use strict';
    let unmute = false, lock = false;

    const s = document.createElement('style');
    s.textContent = `
        :root { --b: rgba(255,255,255,0.9); --t: #0f0f0f; --g: rgba(0,0,0,0.1); }
        @media (prefers-color-scheme: dark) { :root { --b: rgba(15,15,15,0.9); --t: #fff; --g: rgba(255,255,255,0.1); } }
        .shd-bar, .shd-tab { backdrop-filter: blur(8px)!important; -webkit-backdrop-filter: blur(8px)!important; }
        .shd-bar { background: var(--b)!important; color: var(--t)!important; border-top: 1px solid var(--g)!important; }
        .shd-btn { background: var(--t)!important; color: var(--b)!important; }
        .shd-tab { background: var(--b)!important; border: 1px solid var(--g)!important; opacity: 0.8; }
    `;
    document.head.appendChild(s);

    const ob = new MutationObserver(() => {
        if (document.querySelector('.ad-showing')) location.replace(location.href + (location.href.includes('?') ? '&' : '?') + 'r=' + Date.now());
    });
    ob.observe(document.documentElement, { childList: true, subtree: true });

    const sh = document.createElement('div'), br = document.createElement('div'), hi = document.createElement('div'), tb = document.createElement('div');
    br.innerText = 'TAP TO UNMUTE'; br.className = 'shd-bar';
    hi.innerText = 'HIDE'; hi.className = 'shd-btn';
    tb.className = 'shd-tab';

    Object.assign(sh.style, { position: 'fixed', inset: '0', zIndex: '2147483647', display: 'none', pointerEvents: 'none' });
    Object.assign(br.style, { position: 'absolute', bottom: '0', width: '100%', height: '100px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', pointerEvents: 'auto' });
    Object.assign(hi.style, { position: 'fixed', bottom: '100px', left: '15px', width: '60px', height: '40px', textAlign: 'center', lineHeight: '40px', fontSize: '14px', borderRadius: '10px 10px 0 0', zIndex: '2147483647', display: 'none', pointerEvents: 'auto' });
    Object.assign(tb.style, { position: 'fixed', bottom: '40px', right: '20px', width: '70px', height: '45px', borderRadius: '12px', zIndex: '0', display: 'none', pointerEvents: 'auto' });

    sh.appendChild(br);
    hi.ontouchstart = e => { e.preventDefault(); lock = true; };
    tb.ontouchstart = e => { e.preventDefault(); lock = false; };
    sh.ontouchstart = () => { if(!lock) unmute = true; };

    setInterval(() => {
        const srch = location.pathname.startsWith('/results'), act = document.activeElement;
        if (!srch && lock) lock = false;
        if ((act && /INPUT|TEXTAREA/.test(act.tagName)) || document.querySelector('ytm-browse-sidebar-renderer[opened], .ytm-sidebar-open')) {
            sh.style.display = hi.style.display = tb.style.display = 'none'; return;
        }
        if (lock && srch) {
            sh.style.display = hi.style.display = 'none'; if (!tb.parentNode) document.body.appendChild(tb); tb.style.display = 'block';
        } else {
            tb.style.display = 'none';
            let v = document.getElementsByTagName('video'), need = false;
            for (let i=0; i<v.length; i++) if (v[i].src && !v[i].paused && v[i].muted) { need = true; break; }
            if (need || unmute) {
                if (!sh.parentNode) document.body.appendChild(sh); sh.style.display = 'block';
                if (srch && !lock) { if (!hi.parentNode) document.body.appendChild(hi); hi.style.display = 'block'; } else hi.style.display = 'none';
            } else sh.style.display = hi.style.display = 'none';
        }
        if (unmute && !lock) {
            let v = document.getElementsByTagName('video');
            for (let i=0; i<v.length; i++) if (v[i].readyState >= 1) { v[i].muted = false; v[i].volume = 1; if (v[i].paused) v[i].play(); }
            unmute = false;
        }
    }, 40);
})();
