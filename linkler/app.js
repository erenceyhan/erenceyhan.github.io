'use strict';
(() => {
const api=window.AccountApi,$=s=>document.querySelector(s),content=$('#content'),dialog=$('#dialog'),notice=$('#notice');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>',copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',dots:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'};
const svg=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const btn=(text,action,primary=false,extra='')=>`<button class="button${primary?' primary':''}" data-action="${action}" ${extra}>${text}</button>`;
const iconButton=(icon,action,label,extra='')=>`<button class="icon-button ${icon==='star'?'favorite':''}" data-action="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${svg(icon)}</button>`;
const date=value=>new Date(value).toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'});
let user=null,categories=[],items=[],total=0,nextOffset=null,categoryId=null,search='',sort='newest',sequence=0,navigationSequence=0,busy=false,editing=null,dialogKind='',metadataSequence=0,metadataTimer,searchTimer,titleDirty=false,meta={siteName:'',favicon:''};
function message(text,error=false){notice.hidden=!text;notice.classList.toggle('error',error);notice.textContent=text??'';}
function account(){const node=$('#account');node.innerHTML=user?`<a href="/hesap/">${esc(user.name||user.username)} ↗</a>`:'<a href="/hesap/">Hesap</a>';}
function login(error=''){
 user=null;categories=[];items=[];sequence++;navigationSequence++;account();content.innerHTML=`<section class="login"><h1>Arşivin seni bekliyor.</h1><p>Bağlantılarına ulaşmak için portal hesabınla giriş yap.</p><form id="login-form"><label>Kullanıcı adı<input name="username" autocomplete="username" required minlength="3" maxlength="32"></label><label>Şifre<input name="password" type="password" autocomplete="current-password" required minlength="6" maxlength="128"></label><div class="form-error" role="alert" ${error?'':'hidden'}>${esc(error)}</div><button class="button primary" type="submit">Giriş yap</button></form><p class="hint">Hesap ve erişim ayarların için <a href="/hesap/"><u>Hesap sayfasına git ↗</u></a></p></section>`;
}
function fail(error){if(error.status===401||error.status===428){if(dialog.open)dialog.close();login(error.message);}else message(error.message,true);}
function categoryCards(){return categories.map(c=>`<article class="category"><a class="category-open" href="#category/${c.id}"><span class="category-emoji tone-${esc(c.color)}" aria-hidden="true">${esc(c.icon)}</span><span><span class="category-name">${esc(c.name)}</span><span class="category-count">${c.count} kayıt</span></span></a><div class="category-menu">${iconButton('dots','edit-category',c.name+' kategorisini düzenle',`data-id="${c.id}"`)}</div></article>`).join('');}
function linkRow(l){let domain='';if(l.url)try{domain=new URL(l.url).hostname;}catch{}return `<article class="link-row" data-link-id="${l.id}"><div class="link-top"><span class="site-icon" aria-hidden="true">${l.url&&l.favicon?`<img src="${esc(l.favicon)}" alt="" loading="lazy">`:esc(domain?domain.replace(/^www\./,'')[0]?.toUpperCase():l.categoryIcon||'📝')}</span><div class="link-copy"><button class="link-title record-title" data-action="detail" data-id="${l.id}">${esc(l.title)}</button>${domain?`<span class="domain">${esc(l.siteName&&l.siteName!==domain?l.siteName+' · ':'')}${esc(domain)}</span>`:''}</div>${iconButton('star','favorite',l.favorite?'Favoriden çıkar':'Favorilere ekle',`data-id="${l.id}" aria-pressed="${l.favorite}"`)}</div>${l.description?`<p class="description description-preview">${esc(l.description.slice(0,300))}${l.description.length>300?'…':''}</p>${l.description.length>300?`<button class="text-action read-more" data-action="detail" data-id="${l.id}">Devamını oku</button>`:''}`:''}${l.tags.length?`<div class="actions">${l.tags.map(t=>`<span class="tag">#${esc(t)}</span>`).join('')}</div>`:''}<div class="link-bottom"><div class="link-meta"><time datetime="${esc(l.createdAt)}">${date(l.createdAt)}</time></div><div class="link-controls">${l.url?`<a class="text-action" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" aria-label="Bağlantıyı aç">Aç ↗</a>${iconButton('copy','copy','URL’yi kopyala',`data-id="${l.id}"`)}`:''}${iconButton('edit','edit-link','Kaydı düzenle veya taşı',`data-id="${l.id}"`)}<button class="text-action" data-action="delete-link" data-id="${l.id}" aria-label="Kaydı sil">Sil</button></div></div></article>`;}
function empty(title,body,action='',label=''){return `<section class="empty"><span class="empty-mark" aria-hidden="true">↗</span><h2>${title}</h2><p>${body}</p>${action?btn(label,action,true):''}</section>`;}
function shell(){
 if(!categoryId){items=[];total=0;nextOffset=null;content.innerHTML=`<h1 class="visually-hidden">Linkler</h1><div class="home-actions">${btn('+ Yeni Kategori Ekle','new-category',true)}</div><section aria-label="Kategorilerin">${categories.length?`<div class="categories">${categoryCards()}</div>`:empty('İlk kategorini oluştur.','Bağlantılarını ve notlarını saklamak için yukarıdan bir kategori ekle.')}</section>`;return false;}
 const c=categories.find(c=>c.id===categoryId);
 if(!c){content.innerHTML=empty('Kategori bulunamadı.','Kategori silinmiş veya bu hesaba ait olmayabilir.','home','Arşive dön');return false;}
 content.innerHTML=`<div class="breadcrumbs"><a href="#home">Arşivim</a><span aria-hidden="true">/</span><span>${esc(c.name)}</span></div><header class="intro"><div><h1>${esc(c.icon)} ${esc(c.name)}</h1><p>Bu kategoriye kaydettiğin bağlantılar ve notlar.</p></div><div class="actions">${btn('+ Yeni Kayıt Ekle','new-link',true)}</div></header><div class="toolbar"><label class="search-wrap">${svg('search')}<input id="search" type="search" aria-label="Bu kategoride ara" placeholder="Bu kategoride ara…" maxlength="200" value="${esc(search)}"></label><select id="sort" aria-label="Kayıtları sırala"><option value="newest">En yeni</option><option value="oldest">En eski</option><option value="title">Başlığa göre</option><option value="updated">Son güncellenen</option></select></div><section aria-label="Kayıtların"><div class="section-label"><h2 id="results-title">${search?'Arama sonuçları':'Kayıtlar'}</h2><p id="result-count" role="status"></p></div><div id="results" class="results" aria-busy="true"><p class="loading" role="status">Kayıtlar yükleniyor…</p></div><button id="more" class="button more" data-action="more" hidden>Daha fazla göster</button></section>`;
 $('#sort').value=sort;return true;
}
function updateResults(){
 $('#results')?.setAttribute('aria-busy','false');$('#result-count').textContent=total+' kayıt';
 $('#results').innerHTML=items.length?items.map(linkRow).join(''):empty(search?'Aradığın kayıt bulunamadı.':'Henüz kayıt yok.',search?'Farklı bir kelime deneyebilir veya aramayı temizleyebilirsin.':'Bir bağlantı, not veya tarif ekleyerek başlayabilirsin.',search?'clear-search':'new-link',search?'Aramayı temizle':'+ Yeni Kayıt Ekle');
 $('#more').hidden=nextOffset===null;
}
async function loadLinks(append=false){
 if(!categoryId||!$('#results'))return;const seq=++sequence,offset=append?nextOffset:0;if(offset===null)return;
 $('#results')?.setAttribute('aria-busy','true');if($('#more'))$('#more').disabled=true;
 const params=new URLSearchParams({q:search,sort,offset:String(offset),category:categoryId});
 try{const result=await api('/api/linkler/links?'+params);if(seq!==sequence||!user)return;items=append?[...items,...result.items]:result.items;total=result.total;nextOffset=result.nextOffset;updateResults();}
 catch(e){if(seq!==sequence)return;fail(e);if(user&&$('#results')){$('#results').innerHTML=empty('Kayıtlar yüklenemedi.',esc(e.message),'retry','Tekrar dene');$('#results').setAttribute('aria-busy','false');}}
 finally{if(seq===sequence&&$('#more'))$('#more').disabled=false;}
}
async function navigate({preserveSearch=false}={}){
 if(!user)return;if(busy)return;
 if(dialog.open)dialog.close();if(!preserveSearch){search='';message('');}clearTimeout(searchTimer);sequence++;const nav=++navigationSequence;
 const hash=location.hash.slice(1);categoryId=hash.startsWith('category/')?hash.slice(9):null;
 try{const result=await api('/api/linkler/categories');if(nav!==navigationSequence||!user)return;categories=result;if(shell())await loadLinks();}catch(e){if(nav!==navigationSequence)return;fail(e);if(user)content.innerHTML=empty('Arşiv açılamadı.',esc(e.message),'retry','Tekrar dene');}
}
function openDialog(title,body,kind,record=null,submit='Kaydet'){
 editing=record;dialogKind=kind;metadataSequence++;clearTimeout(metadataTimer);titleDirty=false;meta={siteName:record?.siteName??'',favicon:record?.favicon??''};
 $('#dialog-content').innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${title}</h2>${iconButton('close','close','Pencereyi kapat')}</div><form id="editor-form">${body}<div class="form-error" role="alert" hidden></div><div class="dialog-actions">${btn(kind==='detail'?'Kapat':'Vazgeç','close',false,'type="button"')}${kind==='detail'?'':`<button class="button ${kind.startsWith('delete')?'danger':'primary'}" type="submit">${submit}</button>`}</div></form>`;
 dialog.showModal();
}
function categoryForm(c=null){openDialog(c?'Kategoriyi düzenle':'Yeni kategori',`<div class="form-fields"><label>Kategori adı<input name="name" required maxlength="80" placeholder="Örn. Path of Exile" value="${esc(c?.name)}"></label><div class="inline-fields"><label>İkon / emoji<input name="icon" required maxlength="16" value="${esc(c?.icon??'🔖')}"></label><label>Renk<select name="color">${[['violet','Mor'],['blue','Mavi'],['green','Yeşil'],['amber','Altın'],['rose','Pembe'],['slate','Gri']].map(([value,label])=>`<option value="${value}" ${value===c?.color?'selected':''}>${label}</option>`).join('')}</select></label></div>${c?`<div><button class="text-action" type="button" data-action="delete-category" data-id="${c.id}">Kategoriyi sil…</button></div>`:''}</div>`,'category',c);}
function linkForm(l=null){
 if(!categoryId&&!l)return;
 openDialog(l?'Kaydı Düzenle':'Yeni Kayıt Ekle',`<div class="form-fields"><label>URL <small>İsteğe bağlı</small><input type="url" name="url" maxlength="16384" placeholder="https://…" value="${esc(l?.url)}" autocomplete="off" spellcheck="false"><span id="metadata-state" class="metadata-state" role="status">URL eklersen başlık ve site simgesi önerilir. Not ve tarif için boş bırakabilirsin.</span></label><label>Başlık <small>Zorunlu</small><input name="title" required maxlength="240" placeholder="Kaydına bir başlık ver" value="${esc(l?.title)}"></label><label>Açıklama <small>İsteğe bağlı · En fazla 50.000 karakter</small><textarea name="description" maxlength="50000" rows="8" placeholder="Notunu, tarifini veya açıklamanı yaz…">${esc(l?.description)}</textarea></label><label>Etiketler <small>Virgülle ayır · En fazla 20 etiket</small><input name="tags" maxlength="820" placeholder="tarif, not, trade" value="${esc(l?.tags.join(', '))}"></label><label>Kategori<select name="categoryId" required>${categories.map(c=>`<option value="${c.id}" ${c.id===(l?.categoryId??categoryId)?'selected':''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</select><small>Başka kategori seçerek kaydı taşıyabilirsin.</small></label><label class="form-check"><input type="checkbox" name="favorite" ${l?.favorite?'checked':''}>Favorilere ekle</label></div>`,'link',l);
 titleDirty=!!l?.title;
}
function recordDetail(l){openDialog(esc(l.title),`<p class="detail-meta">${esc(l.categoryIcon)} ${esc(l.categoryName)} · ${date(l.createdAt)}</p>${l.url?`<p class="detail-link"><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">Bağlantıyı aç ↗</a></p>`:''}<div class="record-description">${esc(l.description)||'<span class="hint">Açıklama eklenmemiş.</span>'}</div>${l.tags.length?`<div class="actions">${l.tags.map(t=>`<span class="tag">#${esc(t)}</span>`).join('')}</div>`:''}<div class="detail-controls">${btn('Kaydı Düzenle','edit-link',false,`type="button" data-id="${l.id}"`)}${l.url?btn('URL’yi kopyala','copy',false,`type="button" data-id="${l.id}"`):''}</div>`,'detail',l);}
async function suggest(){
 const input=dialog.querySelector('[name=url]');if(!input||!dialog.open)return;const url=input.value;if(!/^https?:\/\//.test(url)||!input.checkValidity())return;
 const seq=++metadataSequence,status=$('#metadata-state');status.textContent='Başlık aranıyor… İstersen başlığı kendin yazabilirsin.';
 try{const found=await api('/api/linkler/metadata',{method:'POST',body:{url},timeoutMs:10000});if(seq!==metadataSequence||!dialog.open||input.value!==url)return;
  const title=dialog.querySelector('[name=title]');if(!titleDirty)title.value=found.title;meta={siteName:found.siteName,favicon:found.favicon};status.textContent=found.status==='found'?'Sayfa bilgileri alındı. Başlığı dilediğin gibi değiştirebilirsin.':'Sayfa başlığı alınamadı; alan adını kullanabilir veya kendi başlığını yazabilirsin.';
 }catch(e){if(seq===metadataSequence&&status.isConnected)status.textContent='Sayfa bilgileri alınamadı. Başlığı kendin yazarak kaydedebilirsin.';}
}
function confirmDelete(kind,record){const category=kind==='category';openDialog(category?'Kategori silinsin mi?':'Kayıt silinsin mi?',`<p class="confirm-copy">${category?`“${esc(record.name)}” kategorisi ve içindeki <strong>${record.count} kayıt</strong> kalıcı olarak silinecek.`:`“${esc(record.title)}” arşivinden kalıcı olarak silinecek.`}<br>Bu işlem geri alınamaz.</p>`,'delete-'+kind,record,category?'Evet, kategoriyi ve kayıtları sil':'Evet, kaydı sil');}
async function refresh(){await navigate({preserveSearch:true});}
document.addEventListener('click',async e=>{
 const target=e.target.closest('[data-action]');if(!target)return;e.preventDefault();if(busy)return;const action=target.dataset.action,id=target.dataset.id,l=items.find(x=>x.id===id),c=categories.find(x=>x.id===id);
 try{
  if(action==='close'){dialog.close();return;}
  if(action==='new-category')categoryForm();
  if(action==='edit-category'&&c)categoryForm(c);
  if(action==='new-link')linkForm();
  if(action==='edit-link'&&l)linkForm(l);
  if(action==='detail'&&l){target.disabled=true;const nav=navigationSequence,record=await api('/api/linkler/links/'+l.id);if(nav===navigationSequence&&user&&!dialog.open){items=items.map(x=>x.id===record.id?record:x);recordDetail(record);}}
  if(action==='delete-link'&&l)confirmDelete('link',l);
  if(action==='delete-category'&&c)confirmDelete('category',c);
  if(action==='retry')await start();
  if(action==='home'){if(location.hash==='#home')await refresh();else location.hash='home';}
  if(action==='clear-search'){search='';$('#search').value='';await loadLinks();}
  if(action==='more')await loadLinks(true);
  if(action==='favorite'&&l){target.disabled=true;const updated=await api('/api/linkler/links/'+id,{method:'PATCH',body:{version:l.version,favorite:!l.favorite}});items=items.map(x=>x.id===id?updated:x);updateResults();message(updated.favorite?'Favorilere eklendi.':'Favorilerden çıkarıldı.');}
  if(action==='copy'&&l?.url){try{await navigator.clipboard.writeText(l.url);message('URL kopyalandı.');}catch{openDialog('URL’yi kopyala',`<label>Bağlantı<input name="copy-url" readonly value="${esc(l.url)}"><small>Metni seçip Ctrl+C / ⌘C ile kopyalayabilirsin.</small></label>`,'copy');const field=dialog.querySelector('input');field.focus();field.select();}}
 }catch(error){fail(error);}finally{if(target.isConnected)target.disabled=false;}
});
document.addEventListener('input',e=>{
 if(e.target.id==='search'){search=e.target.value;sequence++;clearTimeout(searchTimer);$('#results-title').textContent=search?'Arama sonuçları':'Kayıtlar';searchTimer=setTimeout(()=>loadLinks(),220);}
 if(e.target.name==='title')titleDirty=true;
 if(e.target.name==='url'&&dialogKind==='link'){metadataSequence++;clearTimeout(metadataTimer);meta={siteName:'',favicon:''};if(!titleDirty)dialog.querySelector('[name=title]').value='';$('#metadata-state').textContent=e.target.value?'URL eklendi; sayfa bilgileri kontrol edilecek.':'URL olmadan not veya tarif kaydedebilirsin.';if(e.target.value)metadataTimer=setTimeout(suggest,450);}
});
document.addEventListener('change',e=>{if(e.target.id==='sort'){sort=e.target.value;loadLinks();}});
document.addEventListener('submit',async e=>{
 const form=e.target;if(!['editor-form','login-form'].includes(form.id))return;e.preventDefault();if(busy)return;
 if(['copy','detail'].includes(dialogKind)&&form.id==='editor-form'){dialog.close();return;}
 const fields=Object.fromEntries(new FormData(form)),error=form.querySelector('.form-error'),submit=form.querySelector('[type=submit]');busy=true;submit.disabled=true;error.hidden=true;
 try{
  if(form.id==='login-form'){const response=await api('/api/auth/sign-in/username',{method:'POST',body:fields});if(response.twoFactorRedirect){location.href='/hesap/';return;}busy=false;await start();return;}
  const record=editing;let success='';
  if(dialogKind==='category'){await api('/api/linkler/categories'+(record?'/'+record.id:''),{method:record?'PATCH':'POST',body:{...fields,...(record?{version:record.version}:{})}});success=record?'Kategori güncellendi.':'Kategori oluşturuldu. İçine girerek ilk kaydını ekleyebilirsin.';}
  if(dialogKind==='link'){if(!fields.title.trim())throw new Error('Başlık gerekli. Lütfen kayda bir başlık yazın.');await api('/api/linkler/links'+(record?'/'+record.id:''),{method:record?'PATCH':'POST',body:{...fields,...meta,favorite:fields.favorite==='on',tags:fields.tags.split(',').map(x=>x.trim()).filter(Boolean),...(record?{version:record.version}:{})}});success=record?'Kayıt güncellendi.':'Kayıt arşivine kaydedildi.';}
  if(dialogKind.startsWith('delete-')){const category=dialogKind==='delete-category';await api('/api/linkler/'+(category?'categories/':'links/')+record.id,{method:'DELETE',body:{version:record.version,confirm:true,...(category?{linkCount:record.count}:{})}});success=category?'Kategori ve içindeki kayıtlar silindi.':'Kayıt silindi.';if(category&&categoryId===record.id){history.replaceState(null,'','#home');categoryId=null;}}
  metadataSequence++;dialog.close();busy=false;await refresh();message(success);
 }catch(err){error.hidden=false;error.textContent=err.message;
  if(err.status===401||err.status===428){dialog.close();fail(err);}
  if(err.status===409){const b=document.createElement('button');b.type='button';b.className='button quiet';b.textContent='Güncel kaydı göster';b.addEventListener('click',async()=>{dialog.close();busy=false;await refresh();message('Güncel kayıtlar yüklendi. Değişikliği kontrol edip yeniden düzenle.');});error.append(document.createElement('br'),b);}
 }finally{busy=false;if(submit.isConnected)submit.disabled=false;}
});
dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});dialog.addEventListener('close',()=>{metadataSequence++;clearTimeout(metadataTimer);});
document.addEventListener('click',e=>{if(busy){const el=e.target.closest('button,a');if(el&&!el.matches('[type=submit]'))e.preventDefault();}},true);
window.addEventListener('hashchange',()=>{if(!busy)navigate();});
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
async function start(){
 try{const me=await api('/api/me');if(me.mustChangePassword){login('Hesap sayfasından geçici şifreni değiştir.');return;}await api('/api/access/linkler');user=me.user;account();await navigate({preserveSearch:true});}
 catch(e){if(e.status===401||e.status===428)login();else{user=null;categories=[];items=[];account();content.innerHTML=empty(e.status===403?'Linkler erişimi gerekli.':'Arşiv açılamadı.',esc(e.message),'retry','Tekrar dene')+'<p class="hint"><a href="/hesap/">Hesap sayfasına git ↗</a></p>';}}
}
start();
})();
