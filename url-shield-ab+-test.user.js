// ==UserScript==
// @name YouTube Mobile URL Shield - Stable Core
// @namespace http://tampermonkey.com/
// @version 5.0.0
// @description Stable Ad-Busting + Nuclear Reload + Resume Hammer (No Search Bar)
// @author ancandi
// @run-at document-start
// @match https://*.youtube.com/*
// @grant none
// ==/UserScript==

(function() {
    'use strict';

    let forceResumeTimer = null;
    let isNavigating = false;

    // --- 1. NAVIGATION STABILIZER ---
    // Prevents the script from triggering reloads during Back/Forward navigation
    window.addEventListener('popstate', () => {
        isNavigating = true;
        setTimeout(() => { isNavigating = false; }, 1200);
    });

    // --- 2. NUCLEAR RELOAD ENGINE ---
    // Forces a hard refresh with a cache-buster when an ad is detected
    const nuclearReload = () => {
        if (isNavigating) return;
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('reload_ts', Date.now());
        try { sessionStorage.setItem('yt-ad-reload-active', 'true'); } catch(e) {}
        window.location.replace(currentUrl.toString());
    };

    // --- 3. DATA PREDATOR ---
    // Strips ad elements and prevents them from loading data
    const predator = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            const nodes = mutations[i].addedNodes;
            for (let j = 0; j < nodes.length; j++) {
                const node = nodes[j];
                if (node.nodeType !== 1) continue;

                const isAd = node.classList?.contains('ad-showing') || 
                             node.closest?.('.ad-showing') || 
                             node.querySelector?.('.ytd-ad-slot-renderer') ||
                             node.closest?.('ytm-promoted-video-renderer');

                if (isAd && !isNavigating) { 
                    nuclearReload(); 
                    return; 
                }
                
                // General data stripping during active reload sessions
                if (sessionStorage.getItem('yt-ad-reload-active') === 'true' && ['VIDEO', 'IMG', 'IMAGE'].includes(node.tagName)) {
                    // We allow search results to keep images so you can still browse
                    if (!window.location.pathname.startsWith('/results')) {
                        node.src = ''; node.remove(); 
                    }
                }
            }
        }
    });
    predator.observe(document.documentElement, { childList: true, subtree: true });

    // --- 4. THE RESUME HAMMER ---
    // Forces the video to play after a user interacts with the page
    const startForceResume = (videos) => {
        if (forceResumeTimer) clearInterval(forceResumeTimer);
        let attempts = 0;
        forceResumeTimer = setInterval(() => {
            videos.forEach(v => {
                if (v.paused && v.readyState >= 1 && !v.closest('.ad-showing')) {
                    v.play().catch(() => {});
                }
            });
            if (++attempts > 50) clearInterval(forceResumeTimer);
        }, 10); 
    };

    // Listen for any tap on the document to trigger the Resume Hammer
    document.addEventListener('touchstart', () => {
        const videos = document.querySelectorAll('video');
        startForceResume(videos);
    }, { passive: true });

    // --- 5. MAINTENANCE LOOP ---
    setInterval(() => {
        const adShowing = !!document.querySelector('.ad-showing') || !!document.querySelector('ytm-promoted-video-renderer');
        
        if (adShowing && !isNavigating) { 
            nuclearReload(); 
        }

        // Cleanup the reload flag once a video is successfully playing
        const mainVideo = document.querySelector('video');
        if (mainVideo && !mainVideo.paused && !adShowing) {
            sessionStorage.removeItem('yt-ad-reload-active');
        }
    }, 100);
})();
