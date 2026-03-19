// ==UserScript==
// @name YouTube Mobile URL Shield AB+ CSS-Emulation
// @namespace http://tampermonkey.com/
// @version 3.0.3
// @description UI Detection Dark/Light Detection
// @author ancandi
// @run-at document-start
// @match https://*.youtube.com/*
// @grant none
// ==/UserScript==

(function() {
    'use strict';

    let userWantsUnmute = false, sessionLocked = false;

    // --- 1. CSS EMULATION (1-to-1 Color Mapping) ---
    const style = document.createElement('style');
    style.textContent = `
        /* LIGHT MODE DEFAULT */
        .shield-bar { 
            background-color: rgba(255, 255, 255, 0.98) !important; 
            color: #0f0f0f !important; 
            border-top: 1px solid #e5e5e5 !important; 
        }
        .shield-btn { 
            background-color: rgba(15, 15, 15, 0.98) !important; 
            color: #ffffff !important; 
        }
        .shield-tab { 
            background-color: rgba(240, 240, 240, 0.75) !important; 
            border: 1px solid rgba(0, 0, 0, 0.1) !important; 
        }

        /* DARK MODE OVERRIDE (System/Android Triggered) */
        @media (prefers-color-scheme: dark) {
            .shield-bar { 
                background-color: rgba(15, 15, 15, 0.98) !important; 
                color: #ffffff !important; 
                border-top: 1px solid #333 !important; 
            }
            .shield-btn { 
                background-color: rgba(255, 255, 255, 0.98) !important; 
                color: #000000 !important; 
            }
            .shield-tab { 
                background-color: rgba(28, 28, 28, 0.75) !important; 
                border: 1px solid rgba(255, 255, 255, 0.1) !important; 
            }
        }
    `;
    document.head.appendChild(style);

    // --- 2. CORE ENGINE (Ad Nuclear) ---
    const predator = new MutationObserver(() => {
        if (document.querySelector('.ad-showing')) {
            window.location.replace(window.location.href + (window.location.href.includes('?') ? '&' : '?') + 'reload_ts=' + Date.now());
        }
    });
    predator.observe(document.documentElement, { childList: true, subtree: true });

    // --- 3. UI STACK ---
    const shield = document.createElement('div'),
          visualBar = document.createElement('div'),
          dismissBtn = document.createElement('div'),
          resurrectTab = document.createElement('div');

    visualBar.innerText = 'TAP TO UNMUTE'; visualBar.className = 'shield-bar';
    dismissBtn.innerText = 'HIDE'; dismissBtn.className = 'shield-btn';
    resurrectTab.className = 'shield-tab';

    Object.assign(shield.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh', zIndex: '2147483647', display: 'none', pointerEvents: 'none' });
    Object.assign(visualBar.style, { position: 'absolute', bottom: '0', left: '0', width: '100%', height: '100px', backdropFilter: 'blur(4px)', webkitBackdropFilter: 'blur(4px)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', zIndex: '2147483647', pointerEvents: 'auto' });
    Object.assign(dismissBtn.style, { position: 'fixed', bottom: '100px', left: '15px', width: '60px', height: '40px', textAlign: 'center', lineHeight: '40px', fontSize: '14px', fontWeight: 'bold', borderRadius: '10px 10px 0 0', zIndex: '2147483647', display: 'none', pointerEvents: 'auto' });
    Object.assign(resurrectTab.style, { position: 'fixed', bottom: '40px', right: '20px', width: '70px', height: '45px', backdropFilter: 'blur(4px)', webkitBackdropFilter: 'blur(4px)', borderRadius: '12px', zIndex: '0', display: 'none', pointerEvents: 'auto' });

    shield.appendChild(visualBar);

    // --- 4. INTERACTION ---
    const handleTouch = (e, lock) => { e.preventDefault(); e.stopPropagation(); sessionLocked = lock; };
    dismissBtn.addEventListener('touchstart', (e) => handleTouch(e, true));
    resurrectTab.addEventListener('touchstart', (e) => handleTouch(e, false));
    shield.addEventListener('touchstart', () => { if(!sessionLocked) userWantsUnmute = true; });

    // --- 5. MAINTENANCE LOOP (Standard Logic) ---
    setInterval(() => {
        const path = window.location.pathname;
        const isSearch = path.startsWith('/results');

        if (!isSearch && sessionLocked) sessionLocked = false;

        const active = document.activeElement;
        const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
        const sidebar = document.querySelector('ytm-browse-sidebar-renderer[opened], .ytm-sidebar-open');
        
        if (isTyping || sidebar) {
            shield.style.display = dismissBtn.style.display = resurrectTab.style.display = 'none';
            return; 
        }

        if (sessionLocked && isSearch) {
            shield.style.display = dismissBtn.style.display = 'none';
            if (!resurrectTab.parentNode) document.body.appendChild(resurrectTab);
            resurrectTab.style.display = 'block';
        } else {
            resurrectTab.style.display = 'none';
            const vids = document.getElementsByTagName('video');
            let videoNeedsUnmute = false;
            for (let i = 0; i < vids.length; i++) {
                if (vids[i].src && !vids[i].paused && vids[i].muted) { videoNeedsUnmute = true; break; }
            }

            if (videoNeedsUnmute || userWantsUnmute) {
                if (!shield.parentNode) document.body.appendChild(shield);
                shield.style.display = 'block';
                if (isSearch && !sessionLocked) {
                    if (!dismissBtn.parentNode) document.body.appendChild(dismissBtn);
                    dismissBtn.style.display = 'block';
                } else { dismissBtn.style.display = 'none'; }
            } else { shield.style.display = dismissBtn.style.display = 'none'; }
        }

        if (userWantsUnmute && !sessionLocked) {
            const vids = document.getElementsByTagName('video');
            for (let i = 0; i < vids.length; i++) {
                if (vids[i].src && vids[i].readyState >= 1) {
                    vids[i].muted = false; vids[i].volume = 1.0;
                    if (vids[i].paused) vids[i].play();
                }
            }
            userWantsUnmute = false;
        }
    }, 40);
})();
