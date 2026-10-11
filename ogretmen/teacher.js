'use strict';
const $=id=>document.getElementById(id),form=$('plan-form');
let week=monday(new Date()),plans=[],editing=null,loadId=0;
function dateKey(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function monday(d){const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
function plus(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
const display=d=>d.toLocaleDateString('tr-TR',{day:'numeric',month:'long'});
function msg(text,error=false){$('message').textContent=text;$('message').dataset.error=String(error)}
function clearWorkspace(){plans=[];$('days').replaceChildren();$('workspace').hidden=true;$('logout').hidden=true;form.reset();$('editor').close()}
function gate(status,text){clearWorkspace();$('gate').hidden=false;$('gate-title').textContent=status===403?'Erişim yetkisi gerekli.':status===428?'Önce şifreni güncelle.':'Planların sana özel.';$('gate-text').textContent=text}
async function api(path,options){try{return await window.AccountApi(path,options)}catch(e){if([401,403,428].includes(e.status))gate(e.status,e.message);throw e}}
$('teacher-login').addEventListener('click',()=>{try{sessionStorage.setItem('eren-account-return','/ogretmen/')}catch{}});
function node(tag,text,className){const el=document.createElement(tag);if(text!=null)el.textContent=text;if(className)el.className=className;return el}
function action(text,fn){const b=node('button',text);b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await fn()}catch(e){msg(e.message,true)}finally{b.disabled=false}});return b}
function render(){
 $('week-title').textContent=display(week)+' – '+display(plus(week,6));
 $('summary').textContent=plans.length+' plan · '+plans.filter(p=>p.state==='done').length+' tamamlandı';
 $('days').replaceChildren();const today=dateKey(new Date());
 for(let n=0;n<7;n++){
   const d=plus(week,n),key=dateKey(d),section=node('section',null,'day'+(key===today?' today':'')),heading=node('h3',null,'day-heading');
   heading.append(node('span',d.toLocaleDateString('tr-TR',{weekday:'long'})));const time=node('time',display(d));time.dateTime=key;heading.append(time);section.append(heading);
   const rows=plans.filter(p=>p.date===key);if(!rows.length)section.append(node('p','Henüz plan eklenmedi.','empty-day'));
   for(const p of rows){const item=node('article',null,'plan'+(p.state==='done'?' done':''));item.append(node('h4',p.title,'plan-title'),node('p',[p.kind==='lesson'?'Ders':'Çalışma',p.subject,p.minutes+' dk'].filter(Boolean).join(' · '),'plan-meta'));if(p.notes)item.append(node('p',p.notes,'plan-notes'));
     const controls=node('div',null,'plan-actions');controls.append(action(p.state==='done'?'Geri al':'Tamamla',async()=>{await api('/api/teacher/plans/'+p.id,{method:'PATCH',body:{...p,state:p.state==='done'?'open':'done'}});await loadWeek()}),action('Düzenle',()=>openEditor(p)),action('Sil',async()=>{if(!confirm('“'+p.title+'” planı silinsin mi?'))return;await api('/api/teacher/plans/'+p.id,{method:'DELETE',body:{version:p.version}});await loadWeek()}));item.append(controls);section.append(item);
   }
   $('days').append(section);
 }
}
async function loadWeek(){
 const requestId=++loadId;$('days').setAttribute('aria-busy','true');$('days').replaceChildren(node('p','Planların yükleniyor…'));$('week-title').textContent=display(week)+' – '+display(plus(week,6));$('summary').textContent='';
 try{const data=await api('/api/teacher/plans?from='+dateKey(week));if(requestId!==loadId)return;plans=data;render();msg('')}
 catch(e){if(requestId===loadId){plans=[];$('days').replaceChildren();msg(e.message,true)}}finally{if(requestId===loadId)$('days').setAttribute('aria-busy','false')}
}
function openEditor(plan=null){
 editing=plan;form.reset();$('form-error').textContent='';$('editor-title').textContent=plan?'Planı düzenle':'Yeni plan';
 for(const key of ['title','kind','subject','date','minutes','notes'])form.elements.namedItem(key).value=plan?.[key]??({date:dateKey(week),kind:'lesson',minutes:40}[key]??'');
 form.elements.done.checked=plan?.state==='done';$('editor').showModal();form.elements.title.focus();
}
$('new-plan').addEventListener('click',()=>openEditor());for(const id of ['close-editor','cancel-editor'])$(id).addEventListener('click',()=>$('editor').close());
form.addEventListener('submit',async e=>{e.preventDefault();$('save-plan').disabled=true;$('form-error').textContent='';
 const data=Object.fromEntries(new FormData(form));data.minutes=Number(data.minutes);data.state=form.elements.done.checked?'done':'open';delete data.done;if(editing)data.version=editing.version;
 try{await api('/api/teacher/plans'+(editing?'/'+editing.id:''),{method:editing?'PATCH':'POST',body:data});week=monday(new Date(data.date+'T12:00:00'));$('editor').close();await loadWeek()}
 catch(e){$('form-error').textContent=e.message}finally{$('save-plan').disabled=false}
});
for(const [id,delta]of [['prev',-7],['next',7]])$(id).addEventListener('click',()=>{const candidate=plus(week,delta);if(candidate.getFullYear()<2000||candidate.getFullYear()>2099)return;week=candidate;loadWeek()});
$('today').addEventListener('click',()=>{week=monday(new Date());loadWeek()});
$('logout').addEventListener('click',async()=>{try{await api('/api/auth/sign-out',{method:'POST',body:{}});++loadId;gate(401,'Oturumun kapatıldı. Yeniden giriş yaparak devam edebilirsin.');msg('')}catch(e){msg(e.message,true)}});
(async()=>{try{const me=await api('/api/teacher/me');$('welcome').textContent='Merhaba, '+me.name;$('gate').hidden=true;$('workspace').hidden=false;$('logout').hidden=false;await loadWeek()}catch(e){if(![401,403,428].includes(e.status))msg(e.message,true)}})();

