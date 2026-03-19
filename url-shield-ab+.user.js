// ==UserScript==
// @name YouTube Mobile URL Shield AB+ Theme-Locked
// @namespace http://tampermonkey.com/
// @version 3.0.2
// @description UI Recovery + Independent Unmute Enforcer
// @author ancandi
// @run-at document-start
// @match https://*.youtube.com/*
// @grant none
// ==/UserScript==

(function() {
    'use strict';

    let userWantsUnmute = false, activeSrc = "", sessionLocked = false;

    // --- 1. CORE ENGINE (v4.8.9) ---
    const predator = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            const nodes = mutations[i].addedNodes;
            for (let j = 0; j < nodes.length; j++) {
                const node = nodes[j];
                if (node.nodeType === 1 && (node.classList?.contains('ad-showing') || node.closest?.('.ad-showing'))) {
                    window.location.replace(window.location.href + (window.location.href.includes('?') ? '&' : '?') + 'reload_ts=' + Date.now());
                    return;
                }
            }
        }
    });
    predator.observe(document.documentElement, { childList: true, subtree: true });

    // --- 2. UI STACK ---
    const shield = document.createElement('div'),
          visualBar = document.createElement('div'),
          dismissBtn = document.createElement('div'),
          resurrectTab = document.createElement('div');

    visualBar.innerText = 'TAP TO UNMUTE';
    dismissBtn.innerText = 'HIDE';

    Object.assign(shield.style, { position: 'fixed', left: '0', width: '100vw', zIndex: '2147483647', display: 'none', cursor: 'pointer' });

    Object.assign(visualBar.style, {
        position: 'absolute', bottom: '0', left: '0', width: '100%', height: '100px',
        backdropFilter: 'blur(4px)', webkitBackdropFilter: 'blur(4px)',
        fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        fontSize: '20px', zIndex: '2147483647'
    });

    Object.assign(dismissBtn.style, {
        position: 'fixed', bottom: '100px', left: '15px', width: '60px', height: '40px',
        textAlign: 'center', lineHeight: '40px', fontSize: '14px', fontWeight: 'bold', 
        borderRadius: '10px 10px 0 0', zIndex: '2147483647', display: 'none'
    });

    Object.assign(resurrectTab.style, {
        position: 'fixed', bottom: '40px', right: '20px', width: '70px', height: '45px',
        backdropFilter: 'blur(4px)', webkitBackdropFilter: 'blur(4px)',
        borderRadius: '12px', zIndex: '2147483640', display: 'none'
    });

    shield.appendChild(visualBar);

    // --- 3. ROBUST THEME DETECTION ---
    const updateTheme = () => {
        // Check HTML attribute, Body class, or System Pref
        const isDark = document.documentElement.hasAttribute('dark') || 
                       document.body.classList.contains('dark-mode') || 
                       document.body.classList.contains('ytm-dark-mode') ||
                       window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (isDark) {
            // Dark Mode (v6.1.5 Specs)
            visualBar.style.backgroundColor = 'rgba(15, 15, 15, 0.98)';
            visualBar.style.color = '#ffffff';
            visualBar.style.borderTop = '1px solid #333';
            dismissBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
            dismissBtn.style.color = '#000000';
            resurrectTab.style.backgroundColor = 'rgba(28, 28, 28, 0.75)';
            resurrectTab.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        } else {
            // Light Mode
            visualBar.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
            visualBar.style.color = '#0f0f0f';
            visualBar.style.borderTop = '1px solid #e5e5e5';
            dismissBtn.style.backgroundColor = 'rgba(15, 15, 15, 0.98)';
            dismissBtn.style.color = '#ffffff';
            resurrectTab.style.backgroundColor = 'rgba(240, 240, 240, 0.75)';
            resurrectTab.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        }
    };

    // --- 4. MAINTENANCE ---
    const handleTouch = (e, lock) => { e.preventDefault(); e.stopPropagation(); sessionLocked = lock; };
    dismissBtn.addEventListener('touchstart', (e) => handleTouch(e, true));
    resurrectTab.addEventListener('touchstart', (e) => handleTouch(e, false));
    shield.addEventListener('touchstart', () => { if(!sessionLocked) userWantsUnmute = true; });

    setInterval(() => {
        updateTheme(); 
        const path = window.location.pathname;
        const isSearch = path.startsWith('/results');
        const isWatch = path.startsWith('/watch');

        // Isolation Check
        const active = document.activeElement;
        const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
        const sidebarOpen = !!document.querySelector('ytm-browse-sidebar-renderer[opened], .ytm-sidebar-open');
        
        if (isSearch || isTyping || sidebarOpen) {
            shield.style.display = dismissBtn.style.display = resurrectTab.style.display = 'none';
            return; 
        }

        const vids = document.querySelectorAll('video');
        let anyUnmuted = false;
        vids.forEach(v => { if (v.src && !v.muted) anyUnmuted = true; });

        let needsShield = isWatch ? !anyUnmuted : false;
        if (!isWatch) {
            vids.forEach(v => { if (v.muted && v.src && v.src !== activeSrc) needsShield = true; });
        }

        if (needsShield || userWantsUnmute) {
            if (!shield.parentElement) document.body.appendChild(shield);
            shield.style.display = 'block';
            shield.style.bottom = '0';
            shield.style.top = 'auto';
            shield.style.height = '100px';
        } else {
            shield.style.display = 'none';
        }

        if (userWantsUnmute) {
            document.querySelectorAll('video').forEach(v => {
                if (v.src && v.readyState >= 1) {
                    v.muted = false; v.volume = 1.0;
                    if (v.paused) v.play();
                    if (!v.muted) { activeSrc = v.src; userWantsUnmute = false; }
                }
            });
        }
    }, 40);
})();
