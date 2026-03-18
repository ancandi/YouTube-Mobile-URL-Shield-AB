// ==UserScript==
// @name YouTube Mobile URL Shield AB+
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

    let userWantsUnmute = false; 
    let activeSrc = ""; 
    let forceResumeTimer = null;
    let playStartTime = 0;

    // --- 1. THE NUCLEAR RELOAD ENGINE ---
    const nuclearReload = () => {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('reload_ts', Date.now()); // Cache-buster
        sessionStorage.setItem('yt-ad-reload-active', 'true');
        window.location.replace(currentUrl.toString());
        setTimeout(() => { window.location.href = currentUrl.toString(); }, 50);
    };

    // --- 2. DATA PREDATOR (Ad & Thumbnail Stripping) ---
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

                if (isAd) { nuclearReload(); return; }

                if (sessionStorage.getItem('yt-ad-reload-active') === 'true' && ['VIDEO', 'IMG', 'IMAGE'].includes(node.tagName)) {
                    node.src = ''; node.remove(); 
                }
            }
        }
    });
    predator.observe(document.documentElement, { childList: true, subtree: true });

    // --- 3. THE REINFORCED UI (Hitbox + Visual Bar) ---
    const shield = document.createElement('div');
    shield.id = 'reloader-unmute-shield';
    Object.assign(shield.style, {
        position: 'fixed', left: '0', width: '100vw', zIndex: '2147483647', 
        display: 'none', cursor: 'pointer', touchAction: 'manipulation', backgroundColor: 'transparent'
    });

    const visualBar = document.createElement('div');
    Object.assign(visualBar.style, {
        position: 'absolute', bottom: '0', left: '0', width: '100%', height: '100px',
        backgroundColor: '#0f0f0f', color: '#ffffff', textAlign: 'center',
        lineHeight: '100px', fontSize: '18px', fontWeight: 'bold', fontFamily: 'sans-serif', 
        borderTop: '1px solid #333', boxShadow: '0 -10px 20px rgba(0,0,0,0.5)',
        pointerEvents: 'none', zIndex: '2001' 
    });
    visualBar.innerText = 'TAP TO UNMUTE';
    shield.appendChild(visualBar);

    // --- 4. THE RESUME HAMMER (RE-ADDED) ---
    const startForceResume = (videos) => {
        if (forceResumeTimer) clearInterval(forceResumeTimer);
        let attempts = 0;
        forceResumeTimer = setInterval(() => {
            videos.forEach(v => {
                if (v.paused && v.readyState >= 1) {
                    v.play().catch(() => {});
                }
            });
            // Stop hammering after 50 attempts (approx 500ms) to save CPU
            if (++attempts > 50) clearInterval(forceResumeTimer);
        }, 10); 
    };

    const handleInteraction = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
        userWantsUnmute = true; 
        return false;
    };
    ['touchstart', 'click'].forEach(evt => shield.addEventListener(evt, handleInteraction, { capture: true, passive: false }));

    // --- 5. MAINTENANCE LOOP (The Logic Sandwich) ---
    setInterval(() => {
        const path = window.location.pathname;
        const isInteractive = path.startsWith('/watch') || path.startsWith('/shorts') || path.startsWith('/results');
        const videos = document.querySelectorAll('video');
        const adShowing = !!document.querySelector('.ad-showing') || !!document.querySelector('ytm-promoted-video-renderer');

        // Nuclear Fail-safe
        if (adShowing) { nuclearReload(); return; }

        // Layout Sync
        if (isInteractive && !path.startsWith('/results')) {
            shield.style.top = '0'; shield.style.height = '100vh';
        } else {
            shield.style.top = 'auto'; shield.style.bottom = '0'; shield.style.height = '100px';
        }

        // Unmute + Resume Enforcer
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
                startForceResume(videos); // Trigger the Resume Hammer
                playStartTime = Date.now();
            }
        }

        // State Cleanup
        if (videos[0] && !videos[0].paused && !videos[0].muted && !adShowing && playStartTime > 0) {
            if (Date.now() - playStartTime > 1500) {
                sessionStorage.removeItem('yt-ad-reload-active');
                playStartTime = 0;
            }
        }

        // Visual Visibility Logic
        let needsShield = false;
        videos.forEach(v => { if (v.muted && v.src && !adShowing && v.src !== activeSrc) needsShield = true; });

        if (needsShield || userWantsUnmute) {
            if (!shield.parentElement) document.body.appendChild(shield);
            shield.style.display = 'block';
            shield.style.setProperty('z-index', '2147483647', 'important');
        } else {
            shield.style.display = 'none';
        }
    }, 10);
})();
