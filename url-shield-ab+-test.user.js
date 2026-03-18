// ==UserScript==
// @name YouTube Mobile URL Shield AB+
// @namespace http://tampermonkey.com/
// @version 4.8.5
// @description v4.8.5 + Search Result Image Recovery
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
    let amnestyGranted = false; 

    window.addEventListener('popstate', () => {
        isNavigating = true;
        setTimeout(() => { isNavigating = false; }, 1200);
    });

    const nuclearReload = () => {
        if (isNavigating) return;
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('reload_ts', Date.now());
        try { sessionStorage.setItem('yt-ad-reload-active', 'true'); } catch(e) {}
        window.location.replace(currentUrl.toString());
    };

    // --- 1. DATA PREDATOR (Refined for Search) ---
    const predator = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            const nodes = mutations[i].addedNodes;
            for (let j = 0; j < nodes.length; j++) {
                const node = nodes[j];
                if (node.nodeType !== 1) continue;

                const isExplicitAd = node.classList?.contains('ad-showing') || 
                                     node.closest?.('.ad-showing') || 
                                     node.querySelector?.('.ytd-ad-slot-renderer') ||
                                     node.closest?.('ytm-promoted-video-renderer');

                if (isExplicitAd && !isNavigating) { nuclearReload(); return; }

                // LOGIC: Handle Reload Recovery
                if (sessionStorage.getItem('yt-ad-reload-active') === 'true') {
                    const isSearchResult = window.location.pathname.startsWith('/results');
                    
                    // If we are on search, let thumbnails live; if on watch, only let the main video live
                    if (node.tagName === 'VIDEO' && !isExplicitAd && !amnestyGranted) {
                        amnestyGranted = true; 
                        continue; 
                    }
                    
                    // Allow images ONLY if we are on the search page and they aren't ads
                    if (isSearchResult && ['IMG', 'IMAGE'].includes(node.tagName) && !isExplicitAd) {
                        continue; 
                    }

                    // Kill everything else (Ads, tracking pixels, watch-page clutter)
                    if (['IMG', 'IMAGE'].includes(node.tagName) || (node.tagName === 'VIDEO' && isExplicitAd)) {
                        node.src = ''; node.remove(); 
                    }
                }
            }
        }
    });
    predator.observe(document.documentElement, { childList: true, subtree: true });

    // --- 2. UI STACK (Shield & Visual Bar) ---
    const shield = document.createElement('div');
    shield.id = 'reloader-unmute-shield';
    Object.assign(shield.style, {
        position: 'fixed', left: '0', width: '100vw', zIndex: '2147483647', 
        display: 'none', cursor: 'pointer', touchAction: 'manipulation', backgroundColor: 'transparent',
        pointerEvents: 'auto'
    });

    const visualBar = document.createElement('div');
    Object.assign(visualBar.style, {
        position: 'absolute', bottom: '0', left: '0', width: '100%', height: '100px',
        backgroundColor: '#0f0f0f', color: '#ffffff', textAlign: 'center',
        lineHeight: '100px', fontSize: '18px', fontWeight: 'bold', fontFamily: 'sans-serif', 
        borderTop: '1px solid #333', zIndex: '2001', pointerEvents: 'none'
    });
    visualBar.innerText = 'TAP TO UNMUTE';
    shield.appendChild(visualBar);

    // --- 3. THE RESUME HAMMER ---
    const startForceResume = (videos) => {
        if (forceResumeTimer) clearInterval(forceResumeTimer);
        let attempts = 0;
        forceResumeTimer = setInterval(() => {
            videos.forEach(v => {
                if (v.paused && v.readyState >= 1) v.play().catch(() => {});
            });
            if (++attempts > 50) clearInterval(forceResumeTimer);
        }, 10); 
    };

    const handleInteraction = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
        userWantsUnmute = true; 
        return false;
    };
    ['touchstart', 'click'].forEach(evt => shield.addEventListener(evt, handleInteraction, { capture: true, passive: false }));

    // --- 4. MAINTENANCE LOOP ---
    setInterval(() => {
        const path = window.location.pathname;
        const isSearch = path.startsWith('/results');
        const isInteractive = path.startsWith('/watch') || path.startsWith('/shorts') || isSearch;
        const videos = document.querySelectorAll('video');
        const adShowing = !!document.querySelector('.ad-showing') || !!document.querySelector('ytm-promoted-video-renderer');

        if (adShowing && !isNavigating) { nuclearReload(); return; }

        // Layout: Search page keeps the bar at the bottom to avoid blocking results
        if (isInteractive && !isSearch) {
            shield.style.top = '0'; shield.style.height = '100vh';
        } else {
            shield.style.top = 'auto'; shield.style.bottom = '0'; shield.style.height = '100px';
        }

        if (userWantsUnmute) {
            let success = false;
            videos.forEach(v => {
                if (v.src && v.readyState >= 1) {
                    v.muted = false; v.volume = 1.0;
                    if (!v.muted) { success = true; activeSrc = v.src; }
                }
            });
            if (success) {
                userWantsUnmute = false; shield.style.display = 'none';
                startForceResume(videos);
                playStartTime = Date.now();
            }
        }

        // Cleanup: Reset "Active Reload" state once we are stable
        if ( (videos[0] && !videos[0].paused && !videos[0].muted && !adShowing && playStartTime > 0) || (isSearch && Date.now() - playStartTime > 3000) ) {
            if (Date.now() - playStartTime > 2000) {
                sessionStorage.removeItem('yt-ad-reload-active');
                amnestyGranted = false; 
                playStartTime = 0;
            }
        }

        let needsShield = false;
        videos.forEach(v => { if (v.muted && v.src && !adShowing && v.src !== activeSrc) needsShield = true; });

        if (needsShield || userWantsUnmute) {
            if (!shield.parentElement) document.body.appendChild(shield);
            shield.style.display = 'block';
        } else {
            shield.style.display = 'none';
        }
    }, 10);
})();
