// ==UserScript==
// @name YouTube Mobile URL Shield - Search Stable
// @namespace http://tampermonkey.com/
// @version 4.9.1
// @description v4.8.2 Stability + Search Result Isolation
// @author ancandi
// @run-at document-start
// @match https://*.youtube.com/*
// @grant none
// ==/UserScript==

(function() {
    'use strict';

    let userWantsUnmute = false; 
    let activeSrc = ""; 
    let forceResumeTimer = null;
    let playStartTime = 0;
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

    // --- 4. THE SEARCH-ONLY HITBOX ---
    const shield = document.createElement('div');
    Object.assign(shield.style, {
        position: 'fixed', left: '0', bottom: '0', width: '100vw', height: '100px',
        zIndex: '2147483647', display: 'none', cursor: 'pointer', touchAction: 'manipulation'
    });

    const visualBar = document.createElement('div');
    Object.assign(visualBar.style, {
        position: 'absolute', inset: '0', backgroundColor: '#0f0f0f', color: '#ffffff',
        textAlign: 'center', lineHeight: '100px', fontSize: '18px', fontWeight: 'bold',
        fontFamily: 'sans-serif', borderTop: '1px solid #333', pointerEvents: 'none'
    });
    visualBar.innerText = 'TAP TO UNMUTE SEARCH RESULT';
    shield.appendChild(visualBar);
    document.body.appendChild(shield);

    // --- 5. THE RESUME HAMMER (The "Sticky" Unmute) ---
    const startForceUnmute = (videos) => {
        if (forceResumeTimer) clearInterval(forceResumeTimer);
        let attempts = 0;
        forceResumeTimer = setInterval(() => {
            videos.forEach(v => {
                if (v.src) {
                    v.muted = false;
                    v.volume = 1.0;
                    if (v.paused) v.play().catch(() => {});
                }
            });
            // Hammer for 2 seconds to beat YouTube's auto-mute logic
            if (++attempts > 200) clearInterval(forceResumeTimer);
        }, 10); 
    };

    shield.addEventListener('click', (e) => {
        e.preventDefault();
        userWantsUnmute = true;
    }, { capture: true });

    // --- 6. ISOLATED SEARCH LOOP ---
    setInterval(() => {
        const isSearch = window.location.pathname.startsWith('/results');
        const videos = document.querySelectorAll('video');
        const adShowing = !!document.querySelector('.ad-showing');

        if (adShowing && !isNavigating) { nuclearReload(); return; }

        // Only show the bar if we are on the results page and a video exists
        if (isSearch && videos.length > 0 && !userWantsUnmute) {
            let hasMuted = false;
            videos.forEach(v => { if (v.muted && v.src) hasMuted = true; });
            shield.style.display = hasMuted ? 'block' : 'none';
        } else {
            shield.style.display = 'none';
        }

        if (userWantsUnmute) {
            startForceUnmute(videos);
            userWantsUnmute = false;
            activeSrc = videos[0]?.src || "";
            playStartTime = Date.now();
        }

        // Reset if source changes or 5 seconds pass
        if (playStartTime > 0 && Date.now() - playStartTime > 5000) {
            playStartTime = 0;
            sessionStorage.removeItem('yt-ad-reload-active');
        }
    }, 50);
})();
