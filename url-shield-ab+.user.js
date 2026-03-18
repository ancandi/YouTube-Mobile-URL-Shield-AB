// ==UserScript==
// @name YouTube Mobile URL Shield AB+
// @namespace http://tampermonkey.com/
// @version 3.0.1
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

    // --- 1. DATA PREDATOR ---
    const predator = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            const nodes = mutations[i].addedNodes;
            for (let j = 0; j < nodes.length; j++) {
                const node = nodes[j];
                if (node.nodeType !== 1) continue;
                const isAd = node.classList?.contains('ad-showing') || node.closest?.('.ad-showing');
                if (isAd || (sessionStorage.getItem('yt-ad-reload-active') === 'true' && ['VIDEO', 'IMG', 'IMAGE'].includes(node.tagName))) {
                    node.src = ''; 
                    node.setAttribute('preload', 'none');
                    node.remove(); 
                }
            }
        }
    });
    predator.observe(document.documentElement, { childList: true, subtree: true });

    // --- 2. THE REINFORCED SHIELD ---
    const shield = document.createElement('div');
    shield.id = 'reloader-unmute-shield';
    Object.assign(shield.style, {
        position: 'fixed', 
        left: '0', 
        width: '100vw', 
        zIndex: '2147483647', 
        display: 'none', 
        cursor: 'pointer', 
        touchAction: 'manipulation', 
        backgroundColor: 'transparent'
    });

    const visualBar = document.createElement('div');
    Object.assign(visualBar.style, {
        position: 'absolute', 
        bottom: '0', 
        left: '0', 
        width: '100%', 
        height: '100px',
        backgroundColor: '#0f0f0f', // YouTube Dark Mode Black
        color: '#ffffff', 
        textAlign: 'center',
        lineHeight: '100px', // Centers text vertically in a static box
        fontSize: '18px', 
        fontWeight: 'bold', 
        fontFamily: 'sans-serif', 
        borderTop: '1px solid #333',
        boxShadow: '0 -10px 20px rgba(0,0,0,0.5)',
        pointerEvents: 'none' 
    });
    visualBar.innerText = 'TAP TO UNMUTE';
    shield.appendChild(visualBar);

    // --- 3. THE RESUME ENGINE ---
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

    // --- 4. THE MAINTENANCE LOOP (5ms Polling) ---
    setInterval(() => {
        const isWatch = window.location.pathname.startsWith('/watch');
        const videos = document.querySelectorAll('video');
        const adShowing = !!document.querySelector('.ad-showing');

        // Layout Sync
        if (isWatch) {
            shield.style.top = '0'; 
            shield.style.height = '100vh';
            if (adShowing && videos[0]?.duration > 0) {
                sessionStorage.setItem('yt-ad-reload-active', 'true');
                window.location.replace(window.location.href);
            }
        } else {
            shield.style.top = 'auto'; 
            shield.style.bottom = '0'; 
            shield.style.height = '100px';
        }

        // UNMUTE ENFORCER
        if (userWantsUnmute) {
            let success = false;
            videos.forEach(v => {
                if (v.src && v.readyState >= 1) {
                    v.muted = false;
                    v.volume = 1.0;
                    activeSrc = v.src;
                    if (!v.muted) success = true;
                }
            });

            if (success) {
                userWantsUnmute = false;
                shield.style.display = 'none';
                startForceResume(videos);
                playStartTime = Date.now();
            }
        }

        // --- UI RECOVERY CHECK ---
        if (videos[0] && !videos[0].paused && !videos[0].muted && !adShowing && playStartTime > 0) {
            if (Date.now() - playStartTime > 1000) {
                sessionStorage.removeItem('yt-ad-reload-active');
                const blocker = document.getElementById('yt-hard-blocker');
                if (blocker) blocker.remove();
                playStartTime = 0;
            }
        }

        // Shield Appearance Condition
        let needsShield = false;
        videos.forEach(v => {
            if (v.muted && v.src !== activeSrc && !adShowing) needsShield = true;
            if (v.src !== activeSrc && activeSrc !== "") {
                activeSrc = ""; userWantsUnmute = false;
            }
        });

        if (needsShield || userWantsUnmute) {
            if (!shield.parentElement) document.body.appendChild(shield);
            shield.style.display = 'block';
        } else {
            shield.style.display = 'none';
        }

        // Standard Cleanup
        if (!adShowing && sessionStorage.getItem('yt-ad-reload-active') === 'true') {
            sessionStorage.removeItem('yt-ad-reload-active');
            const saver = document.getElementById('yt-hard-blocker');
            if (saver) saver.remove();
        }
    }, 5);
})();
