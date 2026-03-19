// ==UserScript==
// @name YouTube Mobile URL Shield AB+
// @version 3.0.4
// @match https://*.youtube.com/*
// @run-at document-start
// ==/UserScript==

(function() {
    'use strict';
    let u = false, l = false, gC = 0, hS = false;
    const d = document, w = window, 
          sh = d.createElement('div'), br = d.createElement('div'), 
          hi = d.createElement('div'), tb = d.createElement('div');

    const css = (el, s) => Object.assign(el.style, s);
    css(sh, { position: 'fixed', inset: '0', zIndex: '2147483647', display: 'none' });
    css(br, { position: 'absolute', bottom: '0', width: '100%', height: '100px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', backdropFilter: 'blur(8px)', webkitBackdropFilter: 'blur(8px)' });
    css(hi, { position: 'fixed', bottom: '100px', left: '15px', width: '70px', height: '45px', textAlign: 'center', lineHeight: '45px', borderRadius: '12px 12px 0 0', zIndex: '2147483647', display: 'none', fontWeight: '900', fontSize: '14px' });
    css(tb, { position: 'fixed', bottom: '40px', right: '20px', width: '70px', height: '45px', borderRadius: '12px', zIndex: '1', display: 'none', backdropFilter: 'blur(8px)', webkitBackdropFilter: 'blur(8px)' });

    br.innerText = 'TAP TO UNMUTE'; hi.innerText = 'HIDE';
    sh.appendChild(br);

    const update = () => {
        // Optimized Theme Detection: Prioritize System Media Query + YT Attributes
        const isD = w.matchMedia('(prefers-color-scheme: dark)').matches || d.documentElement.hasAttribute('dark') || (d.body && d.body.classList.contains('ytm-dark-mode'));
        const c = isD ? ['#fff', '#111', '#333', 'rgba(15,15,15,0.9)'] : ['#0f0f0f', '#fff', '#e5e5e5', 'rgba(255,255,255,0.9)'];
        
        br.style.background = c[3];
        br.style.color = c[0]; 
        br.style.borderTop = `1px solid ${c[2]}`;
        hi.style.background = c[0]; 
        hi.style.color = c[1]; 
        hi.style.border = `1px solid ${c[2]}`;
        tb.style.background = isD ? 'rgba(28,28,28,0.75)' : 'rgba(240,240,240,0.75)';
        tb.style.border = `1px solid rgba(${isD?'255,255,255':'0,0,0'},0.1)`;
    };

    new MutationObserver(() => {
        if (d.querySelector('.ad-showing')) location.replace(location.href.split('&r=')[0] + (location.href.includes('?') ? '&' : '?') + 'r=' + Date.now());
    }).observe(d.documentElement, { childList: true, subtree: true });

    hi.ontouchstart = e => { e.preventDefault(); l = hS = true; };
    tb.ontouchstart = e => { e.preventDefault(); l = hS = false; };
    sh.ontouchstart = () => { if(!l) u = true; };

    setInterval(() => {
        const p = location.pathname, isW = p.startsWith('/watch'), isS = p.startsWith('/results'), act = d.activeElement;
        
        if (isS && !d.querySelector('ytm-search')) return (sh.style.display = hi.style.display = tb.style.display = 'none');

        let v = d.querySelector('video');
        if (isW && v && v.readyState === 0) {
            if (++gC > 40) { w.history.replaceState(null, '', location.href); w.dispatchEvent(new PopStateEvent('popstate')); gC = 0; }
        } else gC = 0;

        if (!isS && !isW && l) l = false;
        if (isS && hS) l = true;

        if ((act && /INPUT|TEXTAREA/.test(act.tagName)) || d.querySelector('.ytm-sidebar-open')) {
            sh.style.display = hi.style.display = tb.style.display = 'none'; return;
        }

        update();
        sh.style.pointerEvents = isW ? 'auto' : 'none';
        br.style.pointerEvents = isW ? 'none' : 'auto';

        if (l && isS) {
            sh.style.display = hi.style.display = 'none'; 
            if (!tb.parentNode) d.body.appendChild(tb); 
            tb.style.display = 'block';
        } else {
            tb.style.display = 'none';
            let n = false, vs = d.getElementsByTagName('video');
            for (let i=0; i<vs.length; i++) if (vs[i].src && !vs[i].paused && vs[i].muted) { n = true; break; }
            
            if (n || u) {
                if (!sh.parentNode) d.body.appendChild(sh); sh.style.display = 'block';
                if (isS && !l) { if (!hi.parentNode) d.body.appendChild(hi); hi.style.display = 'block'; } else hi.style.display = 'none';
            } else sh.style.display = hi.style.display = 'none';
        }

        if (u && !l) {
            let vs = d.getElementsByTagName('video');
            for (let i=0; i<vs.length; i++) if (vs[i].readyState >= 1) { vs[i].muted = false; vs[i].volume = 1; vs[i].play(); }
            u = false;
        }
    }, 40);
})();
