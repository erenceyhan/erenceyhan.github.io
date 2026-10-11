(() => {
  const params=new URLSearchParams(location.search),route=params.get('__route');
  if(route&&route.startsWith(location.pathname)&&!route.includes('\\')&&!route.startsWith('//')){
    const restored=new URL(route,location.origin);if(restored.origin===location.origin)history.replaceState(null,'',restored.pathname+restored.search+restored.hash);
  }
  async function refreshMetadata(){
    const registry=await fetch('/registry.json').then(r=>{if(!r.ok)throw new Error();return r.json()});
    if(!registry.platform.backendOrigin)return;
    const response=await fetch(registry.platform.backendOrigin+'/api/projects',{credentials:'omit'});
    if(!response.ok)return;const metadata=await response.json();if(!Array.isArray(metadata)||metadata.length>500)return;
    const known=new Map(registry.projects.map(p=>[p.id,p])),grid=document.querySelector('.project-grid');
    for(const data of metadata){
      const technical=known.get(data.id);
      if(!technical||technical.status!=='ready'||!['public','external'].includes(technical.accessType))continue;
      if(typeof data.name!=='string'||!data.name.trim()||data.name.length>80||!Number.isFinite(data.order))continue;
      const card=[...grid.children].find(c=>c.dataset.projectId===data.id);if(!card)continue;
      card.hidden=data.visible===false;
      card.querySelector('.project-name').textContent=data.name;
      if(typeof data.description==='string'&&data.description.length<=240)card.querySelector('.project-description').textContent=data.description;
      const template=[...document.querySelectorAll('template[data-icon]')].find(t=>t.dataset.icon===data.icon);
      if(template){const wrap=card.querySelector('.icon-wrap');wrap.replaceChildren(template.content.cloneNode(true));wrap.className='icon-wrap icon-'+data.icon}
      card.dataset.order=String(data.order);
    }
    [...grid.children].sort((a,b)=>Number(a.dataset.order)-Number(b.dataset.order)).forEach(c=>grid.append(c));
  }
  refreshMetadata().catch(()=>{});
})();
