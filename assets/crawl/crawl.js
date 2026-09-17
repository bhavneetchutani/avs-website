/* Native scroll is the timeline. No wheel interception, autoplay, or third-party runtime. */
(() => {
  const clamp = n => Math.max(0, Math.min(1, n));
  const ramp = (n, a, b) => clamp((n-a)/(b-a));
  const ease = n => n*n*(3-2*n);
  const mix = (a,b,t) => '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)+(parseInt(b.slice(i,i+2),16)-parseInt(a.slice(i,i+2),16))*t).toString(16).padStart(2,'0')).join('');
  const SKY = [
    [0,'#0A1A2E','#123A5C','#73827C'],
    [.26,'#102A44','#28648A','#B5BCAD'],
    [.48,'#123454','#426D88','#B5B8A6'],
    [.65,'#0D2138','#485166','#B77D5E'],
    [.82,'#071423','#1C2A40','#634B4A'],
    [1,'#050A12','#0A1523','#0E3454']
  ];
  function skyAt(p){for(let i=0;i<SKY.length-1;i++){const a=SKY[i],b=SKY[i+1];if(p<=b[0]){const t=ease(ramp(p,a[0],b[0]));return a.slice(1).map((c,j)=>mix(c,b[j+1],t));}}return SKY.at(-1).slice(1);}
  const CHAPTERS = [
    {at:0,start:0,end:.108,name:'Welcome'},
    {at:.22,start:.108,end:.355,name:'The materials'},
    {at:.45,start:.355,end:.555,name:'The right fit'},
    {at:.64,start:.555,end:.765,name:'The distance'},
    {at:.845,start:.765,end:1,name:'On arrival'}
  ];
  // Phones hold the landed lockup with the truck, then run the same exit over less scroll.
  const late=(raw,vw)=>vw<761?.912+.082*ramp(raw,.93,.995):raw;
  class AVSCrawl {
    constructor(rig){
      this.rig=rig;
      this.geometryDirty=true;
      this.header=document.querySelector('[data-hdr]');
      const q=s=>rig.querySelector(s),qa=s=>Array.from(rig.querySelectorAll(s));
      this.el={stage:q('[data-stage]'),sky:q('[data-sky]'),sun:q('[data-sun]'),stars:q('[data-stars]'),haze:q('[data-haze]'),layers:qa('[data-layer]'),plates:qa('[data-plate]'),cue:q('[data-cue]'),truck:q('[data-truck]'),wheels:qa('[data-wheel]'),beam:q('[data-beam]'),lamps:q('[data-lamps]'),windows:q('[data-windows]'),night:qa('[data-nightlight]'),dash:q('[data-dashes]'),dash2:q('[data-dashes2]'),finale:q('[data-finale]'),arrival:q('[data-crawl-arrival]'),wipe:q('[data-wipe]'),blackout:q('[data-blackout]'),hud:q('[data-crawl-hud]'),name:q('[data-crawl-name]'),index:q('[data-crawl-index]'),chapters:qa('[data-crawl-chapter]'),horizon:q('[data-crawl-horizon]'),after:document.querySelector('[data-after]'),motion:q('[data-crawl-motion]')};
      rig.querySelectorAll('svg').forEach(svg=>svg.setAttribute('aria-hidden','true'));
      this.el.finale.setAttribute('aria-hidden','true');
      this.el.after.tabIndex=-1;
      this.wheels=this.el.wheels.map(el=>({el,center:el.getAttribute('transform').match(/rotate\([-\d.]+ ([\d.]+) ([\d.]+)\)/)?.slice(1)}));
      this.media=window.matchMedia('(prefers-reduced-motion: reduce)');
      this.quiet=this.media.matches;
      this.mediaChange=e=>this.setQuiet(e.matches,false);
      this.media.addEventListener('change',this.mediaChange);
      this.click=e=>{
        const target=e.target.closest('[data-crawl-to]');
        if(target){e.preventDefault();this.go(+target.dataset.crawlTo);}
        if(e.target.closest('[data-crawl-motion]')) this.setQuiet(!this.quiet,true);
      };
      rig.addEventListener('click',this.click);
      this.scroll=()=>{if(this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=0;this.draw();});};
      this.geometryChange=()=>{this.geometryDirty=true;this.scroll();};
      document.addEventListener('scroll',this.scroll,{passive:true,capture:true});
      window.addEventListener('resize',this.geometryChange);
      document.fonts.addEventListener('loadingdone',this.geometryChange);
      this.contentClick=event=>{
        if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
        const link=event.target.closest('a[href^="#"],a[href^="/#"]');
        if(!link)return;
        const hash=link.getAttribute('href').replace(/^\//,'');
        if(this.contentTarget(hash)){
          event.preventDefault();
          history.pushState(null,'',hash);
          this.goContent(hash,true);
        }
      };
      this.contentHash=()=>this.goContent(location.hash,false);
      document.addEventListener('click',this.contentClick);
      window.addEventListener('hashchange',this.contentHash);
      this.setQuiet(this.quiet,false);
      document.fonts.ready.then(()=>{if(!this.destroyed){this.geometryChange();this.goContent(location.hash,false);}});
    }
    contentTarget(hash){
      if(!hash||hash==='#')return null;
      let id;try{id=decodeURIComponent(hash.slice(1));}catch{return null;}
      const target=document.getElementById(id);
      return target&&this.el.after.contains(target)?target:null;
    }
    goContent(hash,fromClick){
      const target=this.contentTarget(hash);
      if(!target)return;
      // Resolve against the settled layout, independent of the moving handoff surface.
      const rigTop=window.scrollY+this.rig.getBoundingClientRect().top;
      const start=rigTop+this.rig.offsetHeight-(this.quiet?0:this.stageHeight());
      const offset=target.getBoundingClientRect().top-this.el.after.getBoundingClientRect().top;
      const headerOffset=(this.header?.offsetHeight||64)+20;
      let top=start+offset-headerOffset;
      if(!this.quiet && offset<headerOffset){
        // On short screens the moving handoff can still be ahead of its settled
        // surface. Clear both positions so skipping lands just below the header.
        const vh=this.stageHeight(),span=this.rig.offsetHeight-vh;
        const r=.982-(.982-.912)*(headerOffset-offset)/vh;
        const release=rigTop+span*(window.innerWidth<761?.93+.065*ramp(r,.912,.994):r);
        top=Math.max(top,release);
      }
      if(fromClick){target.tabIndex=-1;target.focus({preventScroll:true});}
      window.scrollTo({top:Math.max(0,top),behavior:fromClick&&!this.quiet&&!this.media.matches?'smooth':'instant'});
    }
    setQuiet(quiet,fromButton){
      this.quiet=quiet;
      this.geometryDirty=true;
      document.documentElement.toggleAttribute('data-avs-quiet',quiet);
      document.dispatchEvent(new CustomEvent('avs:motion-change',{detail:{reduced:quiet}}));
      this.rig.classList.toggle('crawl-still',quiet);
      this.el.motion.textContent=quiet?'Enable motion':'Reduce motion';
      this.el.motion.setAttribute('aria-pressed',String(quiet));
      // The reduced-motion layout is one complete, static welcome; the rest of the site
      // contains the same service information without an empty pinned scroll track.
      this.el.after.style.marginTop=quiet?'0':'-100vh';
      if(fromButton){const top=window.scrollY+this.rig.getBoundingClientRect().top;window.scrollTo({top,behavior:'instant'});}
      this.draw();
    }
    go(index){
      const at=CHAPTERS[index]?.at??0;
      if(this.el.cue.contains(document.activeElement))this.el.chapters[index]?.focus({preventScroll:true});
      const top=window.scrollY+this.rig.getBoundingClientRect().top;
      window.scrollTo({top:top+at*.908*(this.rig.offsetHeight-this.stageHeight()),behavior:this.media.matches?'instant':'smooth'});
    }
    // The pinned stage is 100vh, which phone toolbars never shrink; window.innerHeight is only
    // the area they leave visible. Scroll span, handoff and landing are laid out in the former.
    stageHeight(){return (!this.quiet&&this.el.stage.offsetHeight)||window.innerHeight;}
    show(el,opacity,transform){
      if(!el)return;
      el.style.opacity=opacity.toFixed(3);
      if(transform!==undefined)el.style.transform=transform;
      const hidden=opacity<.025;
      if(el.getAttribute('aria-hidden')!==String(hidden)){
        if(hidden && el.contains(document.activeElement)){
          const target=el===this.el.hud?this.el.after:this.el.chapters[this.current||0];
          target?.focus({preventScroll:true});
        }
        el.setAttribute('aria-hidden',String(hidden));
        el.inert=hidden;
      }
    }
    draw(){
      const e=this.el,vh=this.stageHeight(),vw=window.innerWidth;
      const rect=this.rig.getBoundingClientRect(),span=this.rig.offsetHeight-vh;
      const raw=this.quiet?0:(span>0?clamp(-rect.top/span):0);
      const previous=this.geometry;
      const geometryChanged=this.geometryDirty||!previous||previous.vh!==vh||previous.vw!==vw||previous.span!==span;
      // Terminal and quiet frames are constant. Apply them once, then leave ordinary
      // page scrolling alone; a return to the journey or changed geometry redraws.
      if(!geometryChanged&&raw===this.lastRaw&&(this.quiet||raw===0||raw===1))return;
      if(geometryChanged)this.geometry={vh,vw,span,headerHeight:this.header?.offsetHeight||80,finaleHeight:e.finale.offsetHeight||80};
      this.geometryDirty=false;
      this.lastRaw=raw;
      const {headerHeight,finaleHeight}=this.geometry;
      // Preserve the original drive/crane/release coupling through the shorter five-chapter journey.
      const p=Math.min(1,raw/.908),t=late(raw,vw),phone=vw<761;
      const colors=skyAt(p);
      e.sky.style.setProperty('--sky',`linear-gradient(${colors[0]} 0%,${colors[1]} 62%,${colors[2]} 100%)`);
      const night=ramp(p,.53,.85);
      const crane=this.quiet?0:82*ramp(t,.914,.988);
      const sunEndpoint=vw<761?22:37;
      const sunClearance=(headerHeight+(vw<761?43:68))/vh*100;
      const descentStart=Math.max(sunEndpoint,sunClearance);
      // Join the descent to the actual arc endpoint, including header clearance.
      const sunY=p<=.55?Math.max(sunEndpoint-(vw<761?4:15)*Math.sin(Math.PI*p/.55),sunClearance):descentStart+(96-descentStart)*ramp(p,.55,.77);
      const sunScale=1+.18*Math.max(0,(sunY-30)/40);
      const sunColor=p<.34?mix('#F2A93B','#EEF4FA',ramp(p,.07,.34)):mix('#EEF4FA','#F58A63',ramp(p,.42,.70));
      e.sun.style.left=((vw<761?88:72)+p*(vw<761?3:13))+'%';
      e.sun.style.top=sunY+'%';
      e.sun.style.background=sunColor;
      e.sun.style.boxShadow='none';
      // Keep diamond centering and scale while holding the infinite-distance sky in the crane.
      e.sun.style.transform=`translateY(${crane.toFixed(2)}vh) translate(-50%,-50%) scale(${sunScale.toFixed(3)})`;
      for(const el of [e.sky,e.stars,e.haze])el.style.transform=`translateY(${crane.toFixed(2)}vh)`;
      e.stars.style.opacity=ramp(p,.69,.94).toFixed(3);
      e.haze.style.background=`linear-gradient(transparent,${colors[2]}${Math.round(35-20*night).toString(16).padStart(2,'0')})`;
      for(const layer of e.layers){
        const travel=+layer.dataset.travel||0;
        const back=crane*(1-Math.min(1,travel/16600));
        layer.style.transform=`translate3d(${((+layer.dataset.offset||0)-p*travel).toFixed(1)}px,${back.toFixed(2)}vh,0)`;
      }
      e.stage.style.transform=`translateY(${-crane.toFixed(2)}vh)`;
      // A still reading interval lets typography lead while the landscape keeps moving.
      const introOpacity=1-ease(ramp(p,.062,.102));
      this.show(e.cue,introOpacity,`translate3d(0,${(-ease(ramp(p,.062,.11))*24).toFixed(1)}px,0)`);
      e.plates.forEach((plate,i)=>{
        const c=CHAPTERS[i+1];
        const fadeIn=ease(ramp(p,c.start-.012,c.start+.021));
        const end=i===e.plates.length-1?.935:c.end-.008;
        const fadeOut=1-ease(ramp(p,end-.035,end));
        const shift=(1-fadeIn)*22-(1-fadeOut)*20;
        this.show(plate,fadeIn*fadeOut,`translate3d(0,${shift.toFixed(1)}px,0)`);
      });
      e.horizon.style.opacity=((1-ramp(p,.86,.92))*.8).toFixed(3);
      const deg=this.quiet?0:p*4200;
      this.wheels.forEach(({el,center})=>{if(center)el.setAttribute('transform',`rotate(${deg.toFixed(1)} ${center[0]} ${center[1]})`);});
      const bob=this.quiet?0:Math.sin(p*58)*1.2+Math.sin(p*131)*.6;
      e.truck.style.transform=`translate3d(${(Math.sin(p*Math.PI)*Math.min(vw*.04,55)*(vw>760?-1:1)).toFixed(1)}px,${bob.toFixed(2)}px,0)`;
      e.beam?.setAttribute('opacity',night.toFixed(3));
      e.lamps?.setAttribute('opacity',night.toFixed(3));
      e.windows?.setAttribute('opacity',(night*.95).toFixed(3));
      e.night.forEach(el=>el.setAttribute('opacity',night.toFixed(3)));
      e.dash.style.backgroundPosition=(-p*26000)+'px 0';
      e.dash2.style.backgroundPosition=(-p*9600)+'px 0';
      // The exact original lockup rises, settles, then leaves with the road.
      const rise=ease(phone?ramp(raw,.849,.89):ramp(p,.935,1)),h=finaleHeight;
      const horizon=vh-(vh<=560&&vw>600?120:288);
      // Phones land in the sky above the skyline and dissolve before the lift reaches the header.
      const land=phone?Math.max(headerHeight+vh*.12,Math.min(vh*.3,horizon-h-230)):Math.max(vh*.30,Math.min(vh*.38,horizon-h-110));
      const from=phone?land+vh*.2:horizon+100,y=from+(land-from)*rise,room=land-headerHeight-8,lift=crane*vh/100;
      e.finale.style.transform=`translateY(${y.toFixed(1)}px)`;
      e.finale.style.opacity=(rise*(1-(phone?ramp(lift,room*.25,room):ramp(raw,.935,.971)))).toFixed(3);
      const arrivalOpacity=ease(phone?ramp(raw,.88,.9):ramp(p,.974,1))*(1-ease(phone?ramp(lift,room*.2,room*.8):ramp(raw,.935,.963)));
      this.show(e.arrival,arrivalOpacity,`translateY(${((1-rise)*25).toFixed(1)}px)`);
      e.arrival.style.top=(land+h+30-crane*vh/100)+'px';
      const chapter=Math.max(0,CHAPTERS.findLastIndex(c=>p>=c.start));
      if(this.current!==chapter){this.current=chapter;e.name.textContent=CHAPTERS[chapter].name;e.index.textContent=String(chapter+1).padStart(2,'0');}
      e.chapters.forEach((el,i)=>{
        const c=CHAPTERS[i];
        el.style.setProperty('--chapter-progress',ramp(p,c.start,c.end).toFixed(3));
        if(i===chapter)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
      });
      const hudOpacity=this.quiet?1:1-ease(ramp(raw,.87,.9));
      this.show(e.hud,hudOpacity);
      e.wipe.style.transform=`translate3d(${(26000*(1-p)).toFixed(1)}px,${(84-150*ramp(t,.914,.98)).toFixed(2)}%,0)`;
      e.blackout.style.opacity=ramp(t,.962,.994).toFixed(3);
      if(this.quiet)e.after.style.transform='none';
      else{
        const base=span*(1-raw);
        const y=Math.max(0,vh*(1-ramp(t,.912,.982))-base);
        e.after.style.transform=y>.5?`translateY(${Math.round(y)-1}px)`:'none';
      }
    }
    destroy(){this.destroyed=true;cancelAnimationFrame(this.frame);document.removeEventListener('scroll',this.scroll,{capture:true});document.removeEventListener('click',this.contentClick);window.removeEventListener('hashchange',this.contentHash);window.removeEventListener('resize',this.geometryChange);document.fonts.removeEventListener('loadingdone',this.geometryChange);this.rig.removeEventListener('click',this.click);this.media.removeEventListener('change',this.mediaChange);}
  }
  window.AVSCrawl=AVSCrawl;
})();
