// ==UserScript==
// @name YouTube Mobile URL Shield AB+
// @namespace http://tampermonkey.com/
// @version 3.0.7-S
// @match https://*.youtube.com/*
// @run-at document-start
// ==/UserScript==

(function(d, w) {
    'use strict';
    let l=0, g=0, u=0, c=location.pathname;
    const e=(t,s)=>Object.assign(d.createElement(t),{style:s}),
    h=e('div','position:fixed;bottom:120px;left:15px;width:90px;height:45px;text-align:center;line-height:45px;border-radius:12px 12px 0 0;z-index:2147483647;display:none;font:900 14px arial;pointer-events:auto'),
    b=e('div','position:absolute;bottom:0;width:100%;height:120px;font:900 20px arial;display:flex;align-items:center;justify-content:center;-webkit-backdrop-filter:blur(10px);pointer-events:auto'),
    s=e('div','position:fixed;inset:0;z-index:2147483647;display:none;-webkit-tap-highlight-color:transparent');
    s.append(b); b.innerText='TAP TO UNMUTE'; h.innerText='HIDE';
    const f=()=>d.querySelectorAll('video').forEach(v=>{v.muted=!1;v.volume=1;v.paused&&v.play().catch(()=>{})});
    w.addEventListener('touchstart',x=>{
        if(s.style.display=='none'||l||x.target.closest('button,a,svg'))return;
        if(b.contains(x.target)||(location.pathname.startsWith('/watch')&&s.style.pointerEvents!='none')){
            x.preventDefault();u=1;s.style.display='none';
            let t=Date.now(),k=()=>{f();(Date.now()-t<400)&&requestAnimationFrame(k)};k();
        }
    },{capture:!0,passive:!1});
    h.ontouchstart=x=>{x.preventDefault();l=1};
    (function o(){
        const p=location.pathname, wP=p.startsWith('/watch'), sP=p.startsWith('/results'), fS=d.webkitIsFullScreen||d.fullscreenElement, a=d.activeElement;
        (p!=c)&&(!sP&&(l=0),c=p);
        d.querySelectorAll('ytm-ad-slot-renderer,.ad-showing').forEach(r=>r.remove());
        let v=d.querySelector('video'), dk=w.matchMedia('(prefers-color-scheme:dark)').matches||d.documentElement.hasAttribute('dark');
        const cl=dk?['#fff','#111','#333','rgba(15,15,15,0.9)']:['#0f0f0f','#fff','#e5e5e5','rgba(255,255,255,0.9)'];
        b.style.cssText+=`background:${cl[3]};color:${cl[0]};border-top:1px solid ${cl[2]}`;
        h.style.cssText+=`background:${cl[0]};color:${cl[1]};border:1px solid ${cl[2]};border-bottom:none`;
        s.style.pointerEvents=wP?'auto':'none';
        if([...d.getElementsByTagName('video')].some(x=>x.src&&!x.paused&&x.muted)){
            !s.parentNode&&d.body.append(s,h); s.style.display='block';
            b.style.opacity=(wP&&fS)?'0':'1'; b.style.pointerEvents=(wP&&fS)?'none':'auto';
            h.style.display=(sP&&!l&&!(wP&&fS))?'block':'none';
        }else if(!u)s.style.display=h.style.display='none';
        u=0;requestAnimationFrame(o);
    })();
})(document, window);
