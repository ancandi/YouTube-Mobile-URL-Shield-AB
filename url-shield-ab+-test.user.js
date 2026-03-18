// ==UserScript==
// @name YouTube Mobile URL Shield - Final Stable
// @namespace http://tampermonkey.com/
// @version 4.9.2
// @description Optimized for Search Results + Direct User Activation
// @author ancandi
// @run-at document-start
// @match https://*.youtube.com/*
// @grant none
// ==/UserScript==

(function() {
    'use strict';

    let lastTapTime = 0;
    let isNavigating = false;

    // --- 1. NAVIGATION STABILIZER ---
    window.addEventListener('popstate', () => {
        isNavigating = true;
        setTimeout(() => { isNavigating = false; }, 1200);
    });

    // --- 2. NUCLEAR RELOAD (Ad Purge) ---
    const nuclearReload = () => {
        if (isNavigating) return;
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('reload_ts', Date.now());
        try { sessionStorage.setItem('yt-ad-reload-active', 'true'); } catch(e) {}
        window.location.replace(currentUrl.toString());
    };

    // --- 3. DATA PREDATOR ---
    const predator = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            const nodes = mutations[i].addedNodes;
            for (let j = 0; j < nodes.length; j++) {
                const node = nodes[j];
                if (node.nodeType !== 1) continue;
                const isAd = node.classList?.contains('ad-showing') || node.closest?.('.ad-showing') || node.querySelector?.('.ytd-ad-slot-renderer');
                if (isAd && !isNavigating) { nuclearReload(); return; }
                
                if (sessionStorage.getItem('yt-ad-reload-active') === 'true' && ['VIDEO', 'IMG', 'IMAGE'].includes(node.tagName)) {
                    if (!window.location.pathname.startsWith('/results')) {
                        node.src = ''; node.remove(); 
                    }
                }
            }
        }
    });
    predator.observe(document.documentElement, { childList: true, subtree: true });

    // --- 4. THE UI SHIELD ---
    const shield = document.createElement('div');
    Object.assign(shield.style, {
        position: 'fixed', left: '0', bottom: '0', width: '100vw', height: '100px',
        zIndex: '2147483647', display: 'none', cursor: 'pointer', touchAction: 'manipulation'
    });

    const visualBar = document.createElement('div');
    Object.assign(visualBar.style, {
        position: 'absolute', inset: '0', backgroundColor: '#0f0f0f', color: '#ffffff',
        textAlign: 'center', lineHeight: '100px', fontSize: '18px', fontWeight: 'bold',
        fontFamily: 'sans-serif', borderTop: '1px solid #333'
    });
    visualBar.innerText = 'TAP TO UNMUTE SEARCH';
    shield.appendChild(visualBar);
    document.body.appendChild(shield);

    // --- 5. DIRECT ACTIVATION (Bypasses Browser Block) ---
    shield.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const videos = document.querySelectorAll('video');
        videos.forEach(v => {
            v.muted = false;
            v.volume = 1.0;
            v.play().catch(() => {});
        });
        
        lastTapTime = Date.now(); // Set cooldown
        shield.style.display = 'none';
    }, { capture: true, passive: false });

    // --- 6. MAINTENANCE LOOP ---
    setInterval(() => {
        const isSearch = window.location.pathname.startsWith('/results');
        const videos = document.querySelectorAll('video');
        const adShowing = !!document.querySelector('.ad-showing');

        if (adShowing && !isNavigating) { nuclearReload(); return; }

        // Logic: Show bar only on search, if muted videos exist, and NOT during the 3s cooldown
        const cooldownActive = (Date.now() - lastTapTime) < 3000;
        
        if (isSearch && videos.length > 0 && !cooldownActive) {
            let needsUnmute = false;
            videos.forEach(v => { if (v.muted && v.src) needsUnmute = true; });
            shield.style.display = needsUnmute ? 'block' : 'none';
        } else {
            shield.style.display = 'none';
        }

        // Session Cleanup
        if (videos[0] && !videos[0].muted && Date.now() - lastTapTime > 5000) {
            sessionStorage.removeItem('yt-ad-reload-active');
        }
    }, 50);
})();
