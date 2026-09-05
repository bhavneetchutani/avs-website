/* Small, independent SVG renderer: the brand mark appears before Three loads.
   Geometry follows AVS's authored Diamond Spin / Transition B specimen. */
(() => {
  const loader = document.getElementById('freight-loader');
  const mark = document.getElementById('loader-mark');
  const progress = document.getElementById('loader-progress');
  const message = document.getElementById('loader-message');
  const percent = document.getElementById('loader-percent');
  const fill = document.getElementById('loader-fill-level');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const layers = ['loader-facets-base', 'loader-facets-fill'].map(id => document.getElementById(id));
  const vertices = [[0,-391,0],[0,391,0],[226,0,0],[0,0,226],[-226,0,0],[0,0,-226]];
  const faces = [[0,2,3],[0,3,4],[0,4,5],[0,5,2],[1,3,2],[1,4,3],[1,5,4],[1,2,5]];
  const palettes = ['#2196E8','#6FC2F2','#0E3454','#1272B8','#1272B8','#2196E8','#0E3454','#2196E8'];
  const polygons = layers.map(layer => faces.map(() => {
    const polygon = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    layer.append(polygon);return polygon;
  }));
  const blocked = [...document.querySelectorAll('body > .skip, body > header, body > main, body > footer')];
  const previousFocus = document.activeElement;
  let running = true, frame = 0, deadline = 0, value = 0, received = 0, angle = -.22;
  const started = performance.now();

  function draw(rotation) {
    const c=Math.cos(rotation),s=Math.sin(rotation);
    const points=vertices.map(([x,y,z])=>[x*c+z*s,y,-x*s+z*c]);
    faces.forEach((face,i)=>{
      const [a,b,d]=face.map(index=>points[index]);
      const nz=(b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]);
      const colour=palettes[i];
      for(const layer of polygons) {
        const polygon=layer[i];polygon.style.display=nz>0?'':'none';
        polygon.setAttribute('points',face.map(index=>points[index].slice(0,2).join(',')).join(' '));
        polygon.setAttribute('fill',colour);polygon.setAttribute('stroke',colour);
      }
    });
  }
  function tick(time) {
    if(!running || document.hidden || reduced.matches) { frame=0;return; }
    angle=-.22+(time-started)*Math.PI*2/14000;
    draw(angle);frame=requestAnimationFrame(tick);
  }
  function armDeadline() {
    clearTimeout(deadline);
    // A stalled import or transfer must leave the freight page readable.
    deadline=setTimeout(unavailable,20000);
  }
  function update(loaded,total) {
    if(!running) return;
    // Chunked responses may deliver bytes without a Content-Length header.
    if(loaded>received) { received=loaded;armDeadline(); }
    if(!total) return;
    value=Math.max(value,Math.min(1,loaded/total));
    const amount=Math.round(value*100);
    percent.textContent=amount+'%';progress.setAttribute('aria-valuenow',amount);
    progress.style.setProperty('--loaded',value);
    fill.setAttribute('y',391-782*value);fill.setAttribute('height',782*value);
    if(value===1) message.textContent='Preparing your view';
  }
  function remove() {
    loader.hidden=true;loader.setAttribute('aria-hidden','true');
    document.body.classList.remove('is-loading');
    blocked.forEach(element=>{element.inert=false;});
    if(loader.contains(document.activeElement)) {
      if(previousFocus && previousFocus!==document.body) previousFocus.focus({preventScroll:true});
      else {
        const heading=document.querySelector('.chapter.is-active h1,.chapter.is-active h2');
        heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});
        heading?.addEventListener('blur',()=>heading.removeAttribute('tabindex'),{once:true});
      }
    }
  }
  function finish(success=true) {
    if(!running) return;
    running=false;clearTimeout(deadline);cancelAnimationFrame(frame);frame=0;
    if(!success || reduced.matches) { loader.classList.add('is-dismissing');setTimeout(remove,reduced.matches?0:200);return; }
    message.textContent='Ready to move';percent.textContent='100%';
    progress.setAttribute('aria-valuenow','100');progress.style.setProperty('--loaded',1);
    fill.setAttribute('y','-391');fill.setAttribute('height','782');
    // The first truck frame is already drawn. Open a true 60° diamond onto it.
    const opening=document.getElementById('loader-opening');
    const curtain=document.getElementById('loader-curtain');
    const mask=document.getElementById('loader-aperture');
    const box=mark.getBoundingClientRect(),cx=box.x+box.width/2,cy=box.y+box.height/2;
    const width=innerWidth,height=innerHeight;
    curtain.setAttribute('viewBox',`0 0 ${width} ${height}`);
    mask.setAttribute('x','0');mask.setAttribute('y','0');mask.setAttribute('width',width);mask.setAttribute('height',height);
    const radius=Math.max(cx,width-cx)+(Math.max(cy,height-cy)/Math.sqrt(3));
    const begin=performance.now(),duration=850;
    loader.classList.add('is-revealing');
    const reveal=time=>{
      if(reduced.matches) { remove();return; }
      const t=Math.min(1,(time-begin)/duration);
      // Same (.2,.7,.3,1) brand curve, sampled by the browser's animation engine.
      const eased=Number(revealClock.effect.getComputedTiming().progress)||t;
      const x=radius*eased,y=x*Math.sqrt(3);
      opening.setAttribute('points',`${cx},${cy-y} ${cx+x},${cy} ${cx},${cy+y} ${cx-x},${cy}`);
      if(t<1) requestAnimationFrame(reveal);else {revealClock.cancel();remove();}
    };
    const revealClock=curtain.animate([{opacity:1},{opacity:1}],{duration,easing:'cubic-bezier(.2,.7,.3,1)',fill:'both'});
    requestAnimationFrame(reveal);
  }
  function unavailable() {
    if(!running) return;
    window.freightLoader.cancelled=true;
    finish(false);window.dispatchEvent(new Event('freight:skip'));
  }
  window.freightLoader={update,finish,unavailable,cancelled:false};
  loader.hidden=false;document.body.classList.add('is-loading');
  blocked.forEach(element=>{element.inert=true;});
  document.getElementById('loader-skip').addEventListener('click',unavailable);
  document.addEventListener('visibilitychange',()=>{if(running && !document.hidden && !frame && !reduced.matches) frame=requestAnimationFrame(tick);});
  reduced.addEventListener('change',()=>{cancelAnimationFrame(frame);frame=0;draw(0);if(running && !reduced.matches) frame=requestAnimationFrame(tick);});
  draw(reduced.matches?0:angle);armDeadline();
  if(!reduced.matches) frame=requestAnimationFrame(tick);
})();
