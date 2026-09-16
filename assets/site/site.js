// Native disclosure remains functional without JavaScript. Escape restores focus.
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const menu=document.querySelector('.avs-menu[open]');if(menu){menu.open=false;menu.querySelector('summary').focus();}});
document.addEventListener('click',event=>{const menu=document.querySelector('.avs-menu[open]');if(menu&&(!menu.contains(event.target)||event.target.closest('a')))menu.open=false;});
