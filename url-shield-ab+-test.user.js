// ==UserScript==
// @name YouTube Mobile URL Shield AB+
// @namespace http://tampermonkey.com/
// @version 4.4
// @description Persistent Resume Fix + Multi-Video Unmute
// @author ancandi
// @run-at document-start
// @match https://*.youtube.com/*
// @grant none
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. THE REDIRECT ENGINE (No-Cache Core) ---
    const checkHistoryHole = () => {
        if (sessionStorage.getItem('yt-ad-reload-active') === 'true' && window.location.pathname.startsWith('/watch')) {
            const url = new URL(window.location.href);
            url.searchParams.set('nc', Date.now()); 
            window.location.replace(url.toString());
        }
    };
    checkHistoryHole();

    // --- 2. MAX DATA LOCKDOWN ---
    const injectStyles = () => {
        if (document.getElementById('yt-hard-blocker')) return;
        const style = document.createElement('style');
        style.id = 'yt-hard-blocker';
        style.innerHTML = `
            img, svg, image, [style*="background-image"], .yt-core-image, 
            .ytm-thumb, .ytp-cued-thumbnail-overlay, .ytp-videowall-still-image { 
                display: none !important; visibility: hidden !important; 
            }
            #masthead-container, .ytm-header-bar, #related, #comments, .ytm-footer { 
                display: none !important; 
            }
            html, body { background: #000 !important; }
            video { opacity: 0 !important; }
        `;
        (document.head || document.documentElement).appendChild(style);
    };

    if (sessionStorage.getItem('yt-ad-reload-active') === 'true') {
        injectStyles();
        new MutationObserver(() => {
            document.querySelectorAll('img, image').forEach(img => img.remove());
        }).observe(document.documentElement, { childList: true, subtree: true });
    }

    // --- 3. THE REINFORCED SHIELD ---
    const shield = document.createElement('div');
    shield.id = 'reloader-unmute-shield';
    
    Object.assign(shield.style, {
        position: 'fixed', left: '0', width: '100vw', zIndex: '2147483647', 
        display: 'none', cursor: 'pointer', touchAction: 'manipulation',
        backgroundColor: 'transparent'
    });

    const visualBar = document.createElement('div');
    Object.assign(visualBar.style, {
        position: 'absolute', bottom: '0', left: '0', width: '100%', height: '100px',
        backgroundColor: '#ffffff', color: '#000000', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '18px',
        fontWeight: 'bold', fontFamily: 'sans-serif', boxShadow: '0 -10px 20px rgba(0,0,0,0.3)',
        pointerEvents: 'none' 
    });
    visualBar.innerText = 'TAP TO UNMUTE';
    shield.appendChild(visualBar);

    let activeSrc = ""; 

    const handleInteraction = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }

        const videos = document.querySelectorAll('video');
        videos.forEach(v => {
            activeSrc = v.src; 
            v.muted = false;
            v.volume = 1.0;
            
            // --- RESUME CHECK LOGIC ---
            const forcePlay = () => {
                if (v.paused) {
                    v.play().catch(() => {
                        // If browser blocks, try again on next frame
                        requestAnimationFrame(() => v.play().catch(()=>{}));
                    });
                }
            };

            forcePlay();

            // Check repeatedly for 200ms to ensure the "first video" doesn't stay paused
            let checks = 0;
            const checkInterval = setInterval(() => {
                if (!v.paused || checks > 10) {
                    clearInterval(checkInterval);
                } else {
                    forcePlay();
                    checks++;
                }
            }, 20); 
        });
        
        shield.style.display = 'none';
        return false;
    };

    ['touchstart', 'click'].forEach(evt => {
        shield.addEventListener(evt, handleInteraction, { capture: true, passive: false });
    });

    // --- 4. MONETIZATION-KILL ---
    let reloadTriggered = false;
    const strictMonKill = () => {
        if (!window.location.pathname.startsWith('/watch') || reloadTriggered) return;
        const ad = document.querySelector('.ad-showing, .ad-interrupting');
        const video = document.querySelector('video');

        if (ad && video && !isNaN(video.duration) && video.duration > 0) {
            reloadTriggered = true;
            sessionStorage.setItem('yt-ad-reload-active', 'true');
            window.location.replace(window.location.href); 
        }
    };

    // --- 5. MAINTENANCE LOOP (5ms Polling) ---
    setInterval(() => {
        const isWatch = window.location.pathname.startsWith('/watch');
        const videos = document.querySelectorAll('video');
        let mutedFound = false;

        if (isWatch) {
            shield.style.top = '0'; 
            shield.style.height = '100vh';
            strictMonKill();
        } else {
            shield.style.top = 'auto'; 
            shield.style.bottom = '0'; 
            shield.style.height = '100px';
            sessionStorage.removeItem('yt-ad-reload-active');
        }

        videos.forEach(v => {
            if (v.muted && v.src !== activeSrc && !document.querySelector('.ad-showing')) {
                mutedFound = true;
            }
            if (v.src !== activeSrc && activeSrc !== "") {
                activeSrc = ""; 
            }
        });

        if (reloadTriggered || videos.length === 0) {
            shield.style.display = 'none';
            return;
        }

        if (!document.querySelector('.ad-showing') && sessionStorage.getItem('yt-ad-reload-active') === 'true') {
            sessionStorage.removeItem('yt-ad-reload-active');
            const saver = document.getElementById('yt-hard-blocker');
            if (saver) saver.remove();
        }

        if (mutedFound) {
            if (!shield.parentElement) document.body.appendChild(shield);
            shield.style.display = 'block';
        } else {
            shield.style.display = 'none';
        }
    }, 5);

    window.addEventListener('popstate', () => {
        reloadTriggered = false;
        activeSrc = "";
    });

})();
