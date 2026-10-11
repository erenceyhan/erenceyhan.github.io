'use strict';
(() => {
  let selected='dark';
  try{if(localStorage.getItem('eren-theme-version')==='3')selected=localStorage.getItem('eren-portal-theme')==='light'?'light':'dark';localStorage.setItem('eren-theme-version','3');localStorage.setItem('eren-portal-theme',selected)}catch{}
  function apply(value){document.documentElement.dataset.theme=value;document.querySelectorAll('.theme-button').forEach(b=>{b.hidden=false;b.setAttribute('aria-label',value==='dark'?'Açık temaya geç':'Koyu temaya geç');b.setAttribute('aria-pressed',String(value==='dark'))})}
  apply(selected);
  document.querySelectorAll('.theme-button').forEach(b=>b.addEventListener('click',()=>{selected=document.documentElement.dataset.theme==='dark'?'light':'dark';apply(selected);try{localStorage.setItem('eren-portal-theme',selected)}catch{}}));
})();
