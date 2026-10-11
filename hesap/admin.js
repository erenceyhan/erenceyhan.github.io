'use strict';
const $=id=>document.getElementById(id);
const sections=['login','otp','invite','password','twofa','account','dashboard'];
let selectedUser=null,projects=[],permissions=[],invitationToken=null;
let loginRetryUntil=0,loginRetryTimer=null,limitedUsername='';
function updateLoginRetry(){
  const remaining=Math.max(0,Math.ceil((loginRetryUntil-Date.now())/1000)),button=$('login-form').querySelector('button');
  button.disabled=remaining>0;button.textContent=remaining?`Tekrar dene · ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`:'Giriş yap';
  if(!remaining){clearInterval(loginRetryTimer);loginRetryTimer=null;}
}
function startLoginRetry(seconds){
  clearInterval(loginRetryTimer);limitedUsername=$('login-form').elements.username.value.trim().toLowerCase();loginRetryUntil=Date.now()+seconds*1000;
  updateLoginRetry();loginRetryTimer=setInterval(updateLoginRetry,1000);
}
$('login-form').elements.username.addEventListener('input',()=>{if(loginRetryUntil>Date.now()&&$('login-form').elements.username.value.trim().toLowerCase()!==limitedUsername){loginRetryUntil=0;updateLoginRetry();}});
function show(id){sections.forEach(name=>$(name).hidden=name!==id);}
function message(value,error=false){$('message').textContent=value;$('message').dataset.error=String(error);}
const api=(path,options)=>window.AccountApi(path,options);
function formValues(form){return Object.fromEntries(new FormData(form));}
function bindForm(id,callback){$(id).addEventListener('submit',async event=>{event.preventDefault();if(id==='login-form'&&loginRetryUntil>Date.now())return;const form=event.currentTarget,buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);message('');try{await callback(formValues(form),form);}catch(error){message(error.message,true);if(id==='login-form'&&error.status===429&&error.retryAfterSeconds)startLoginRetry(error.retryAfterSeconds);}finally{buttons.forEach(b=>b.disabled=false);if(id==='login-form')updateLoginRetry();}});}
function element(tag,value){const node=document.createElement(tag);if(value!=null)node.textContent=value;return node;}
function button(label,callback){const b=element('button',label);b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await callback();}catch(error){message(error.message,true);}finally{b.disabled=false;}});return b;}
function date(value){return value?new Date(value).toLocaleString('tr-TR'):'—';}
function row(body,values){const tr=element('tr');for(const value of values){const td=element('td');value instanceof Node?td.append(value):td.textContent=String(value);tr.append(td);}body.append(tr);}
async function refreshSession({afterSignIn=false}={}){
  try{
    const me=await api('/api/me');$('logout').hidden=false;
    $('setup-twofa').hidden=Boolean(me.user.twoFactorEnabled);
    if(me.mustChangePassword){show('password');return;}
    let returnTo=null;try{returnTo=sessionStorage.getItem('eren-account-return')}catch{}
    if(returnTo==='/ogretmen/'||new URLSearchParams(location.search).get('next')==='/ogretmen/'){
      try{await api('/api/access/ogretmen');try{sessionStorage.removeItem('eren-account-return')}catch{}location.assign('/ogretmen/');return;}
      catch(error){try{sessionStorage.removeItem('eren-account-return')}catch{}message(error.message,true);}
    }
    if(location.pathname==='/hesap/'||me.user.role!=='admin'){
      $('account-identity').textContent=me.user.name+' · '+me.user.username;$('open-management').hidden=me.user.role!=='admin';
      try{await api('/api/access/ogretmen');$('teacher-account-link').hidden=false;$('access-note').textContent=''}catch{$('teacher-account-link').hidden=true;$('access-note').textContent='Öğretmen erişimi için yöneticinizden yetki isteyin.'}
      show('account');return;
    }
    await api('/api/admin/projects');show('dashboard');await loadDashboard();
  }catch(error){$('logout').hidden=true;show('login');if(error.status!==401)message(error.message,true);else if(afterSignIn)message('Oturum açılamadı. Tarayıcınızı güncelleyip tekrar deneyin.',true);}
}
$('open-management').addEventListener('click',async()=>{try{await api('/api/admin/projects');show('dashboard');await loadDashboard()}catch(error){message(error.message,true)}});
bindForm('login-form',async(values,form)=>{const result=await api('/api/auth/sign-in/username',{method:'POST',body:values});form.reset();if(result.twoFactorRedirect){show('otp');return;}await refreshSession({afterSignIn:true});});
bindForm('otp-form',async(values,form)=>{await api('/api/auth/two-factor/verify-totp',{method:'POST',body:{...values,trustDevice:false}});form.reset();await refreshSession({afterSignIn:true});});
bindForm('backup-form',async(values,form)=>{await api('/api/auth/two-factor/verify-backup-code',{method:'POST',body:{...values,trustDevice:false}});form.reset();await refreshSession({afterSignIn:true});});
bindForm('accept-form',async(values,form)=>{
  if(values.password!==values.repeat)throw new Error('Şifreler eşleşmiyor.');
  await api('/api/invitations/accept',{method:'POST',body:{token:invitationToken,name:values.name,username:values.username,password:values.password}});
  invitationToken=null;form.reset();message('Hesabınız oluşturuldu. Kullanıcı adınız ve şifrenizle giriş yapın.');show('login');
});
bindForm('password-form',async(_,form)=>{
  const currentPassword=form.elements.namedItem('currentPassword').value,newPassword=form.elements.namedItem('newPassword').value;
  if(!currentPassword||!newPassword)throw new Error('Mevcut ve yeni şifre alanlarını doldurun.');
  if(currentPassword===newPassword)throw new Error('Yeni şifre mevcut şifrenizden farklı olmalı.');
  await api('/api/me/password',{method:'POST',body:{currentPassword,newPassword}});form.reset();
  for(const name of ['currentPassword','newPassword'])form.elements.namedItem(name).type='password';
  message('Şifreniz değiştirildi. Yeni şifrenizle giriş yapın.');await refreshSession();
});
$('show-passwords').addEventListener('change',event=>{
  for(const name of ['currentPassword','newPassword'])$('password-form').elements.namedItem(name).type=event.target.checked?'text':'password';
});
bindForm('enable-form',async(values,form)=>{
  const data=await api('/api/auth/two-factor/enable',{method:'POST',body:values});form.reset();
  const uri=new URL(data.totpURI);$('totp-link').href=data.totpURI;$('totp-secret').textContent=uri.searchParams.get('secret');$('backup-codes').textContent=data.backupCodes.join('\n');$('twofa-details').hidden=false;
});
bindForm('verify-form',async(values,form)=>{await api('/api/auth/two-factor/verify-totp',{method:'POST',body:values});form.reset();$('totp-secret').textContent='';$('backup-codes').textContent='';$('twofa-details').hidden=true;await refreshSession();});
$('setup-twofa').addEventListener('click',()=>show('twofa'));
$('twofa-back').addEventListener('click',()=>refreshSession());
$('logout').addEventListener('click',async()=>{try{await api('/api/auth/sign-out',{method:'POST',body:{}});selectedUser=null;$('invite-url').value='';$('share').hidden=true;await refreshSession();}catch(error){message(error.message,true);}});
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(other=>{other.setAttribute('aria-pressed',String(other===b));$('tab-'+other.dataset.tab).hidden=other!==b;});}));
bindForm('search-form',async values=>loadUsers(values.search));
async function loadUsers(search=''){
  const users=await api('/api/admin/users?search='+encodeURIComponent(search));$('users-body').replaceChildren();
  for(const user of users)row($('users-body'),[`${user.name} / ${user.username}`,`${user.active?'Aktif':'Pasif'}${user.mustChangePassword?' · Geçici şifre':''}`,user.sessions,button('Yönet',()=>selectUser(user))]);
}
function permissionChoices(target,current,onChange){
  target.replaceChildren(element('legend','Proje yetkileri'));
  for(const p of projects.filter(p=>p.auth_type==='neon'&&p.id!=='admin')){
    const label=element('label'),check=document.createElement('input');check.type='checkbox';check.value=p.id;check.checked=current.includes(p.id);
    if(onChange)check.addEventListener('change',async()=>{check.disabled=true;try{await onChange(p.id,check.checked);}catch(error){check.checked=!check.checked;message(error.message,true);}finally{check.disabled=false;}});
    label.append(check,document.createTextNode(p.name));target.append(label);
  }
  if(target.childElementCount===1)target.append(element('p','Henüz kullanıcı yetkisi gerektiren başka bir Neon projesi yok.'));
}
async function selectUser(user){
  selectedUser=user;$('user-detail').hidden=false;$('user-title').textContent=`${user.name} / ${user.username}`;$('toggle-active').textContent=user.active?'Hesabı pasifleştir':'Hesabı etkinleştir';
  permissions=await api('/api/admin/permissions');permissionChoices($('permission-list'),permissions.filter(p=>p.user_id===user.id).map(p=>p.project_id),async(projectId,allowed)=>{await api('/api/admin/permissions',{method:'POST',body:{userId:user.id,projectId,allowed}});message('Proje yetkisi güncellendi.');});
}
$('toggle-active').addEventListener('click',async()=>{if(!selectedUser)return;try{await api(`/api/admin/users/${selectedUser.id}/active`,{method:'POST',body:{active:!selectedUser.active}});selectedUser.active=!selectedUser.active;await selectUser(selectedUser);await loadUsers();message('Hesap durumu güncellendi.');}catch(error){message(error.message,true);}});
$('revoke-sessions').addEventListener('click',async()=>{if(!selectedUser)return;try{await api(`/api/admin/users/${selectedUser.id}/sessions`,{method:'POST',body:{}});await loadUsers();message('Oturumlar sonlandırıldı.');}catch(error){message(error.message,true);}});
bindForm('reset-form',async(values,form)=>{if(!selectedUser)return;await api(`/api/admin/users/${selectedUser.id}/password`,{method:'POST',body:values});form.reset();await loadUsers();message('Geçici şifre belirlendi; eski oturumlar kapatıldı. Şifreyi kullanıcıya güvenli bir kanaldan iletin.');});
function field(form,label,name,value,type='text'){
  const wrap=element('label',label),input=document.createElement('input');input.name=name;input.type=type;
  if(type==='checkbox')input.checked=value;else input.value=value??'';
  if(type==='text')input.maxLength=name==='description'?240:80;
  wrap.append(input);form.append(wrap);return input;
}
function select(form,label,name,values,value){const wrap=element('label',label),input=element('select');input.name=name;for(const item of values){const option=element('option',item);option.value=item;input.append(option);}input.value=value;wrap.append(input);form.append(wrap);}
function renderProjects(){
  $('project-list').replaceChildren();
  for(const p of projects){
    const form=element('form');form.className='project-editor';form.append(element('h3',p.id));
    field(form,'Ad','name',p.name);field(form,'Açıklama','description',p.description);field(form,'Sıra','order',p.display_order,'number');field(form,'Kart görünsün','visible',p.visible,'checkbox');
    select(form,'İkon','icon',['wallet','spark','book','profile','code','volleyball','vote','window','archive','lock'],p.icon);
    select(form,'Giriş tipi (değişirse teknik inceleme)','authType',['none','neon','external'],p.requested_auth_type??p.auth_type);
    select(form,'Yayın durumu (değişirse teknik inceleme)','status',['ready','planned','setup-required'],p.requested_status??p.status);
    const save=element('button','Kaydet');form.append(save);
    form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;const values=formValues(form);try{await api('/api/admin/projects/'+p.id,{method:'PATCH',body:{...values,order:Number(values.order),visible:form.elements.visible.checked}});message('Kart bilgileri kaydedildi. Giriş tipi veya yayın durumu değişiklikleri entegrasyon incelemesini bekler.');}catch(error){message(error.message,true);}finally{save.disabled=false;}});
    $('project-list').append(form);
  }
}
bindForm('new-project-form',async(values,form)=>{await api('/api/admin/projects',{method:'POST',body:values});form.reset();projects=await api('/api/admin/projects');renderProjects();permissionChoices($('invitation-projects'),[]);message('Planlanan proje kaydı oluşturuldu. Uygulama geliştirmesi ve yayını ayrıca yapılmalıdır.');});
bindForm('invitation-form',async(values)=>{
  const invite=await api('/api/admin/invitations',{method:'POST',body:{...values,hours:Number(values.hours),projectIds:[...$('invitation-projects').querySelectorAll('input:checked')].map(i=>i.value)}});
  $('invite-url').value=invite.url;$('whatsapp').href='https://wa.me/?text='+encodeURIComponent('Size özel hesap davetiniz: '+invite.url);$('share').hidden=false;message(values.channel==='email'?'Davet e-postası gönderildi.':'Davet hazır. Bağlantıyı doğru kişiye özel olarak gönderin.');await loadInvitations();
});
$('copy-invite').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('invite-url').value);message('Davet bağlantısı kopyalandı.');}catch{$('invite-url').select();message('Bağlantıyı seçtik; kopyalama menüsünü kullanın.');}});
async function loadInvitations(){
  const invites=await api('/api/admin/invitations');$('invitations-body').replaceChildren();
  for(const invite of invites){const state=invite.used_at?'Kullanıldı':invite.revoked_at?'İptal':new Date(invite.expires_at)<new Date()?'Süresi doldu':'Açık';row($('invitations-body'),[`${invite.channel} / ${invite.email??'Özel bağlantı'}`,date(invite.expires_at),state,state==='Açık'?button('İptal et',async()=>{await api(`/api/admin/invitations/${invite.id}/revoke`,{method:'POST',body:{}});await loadInvitations();}):'—']);}
}
async function loadDashboard(){
  projects=await api('/api/admin/projects');await loadUsers();renderProjects();permissionChoices($('invitation-projects'),[]);await loadInvitations();
  const logs=await api('/api/admin/audit');$('audit-body').replaceChildren();for(const log of logs)row($('audit-body'),[date(log.created_at),log.actor??'Sistem',log.action,log.target_id??'—']);
}
function readInvitation(){
  const hash=new URLSearchParams(location.hash.slice(1));
  if(!hash.has('invite'))return false;
  invitationToken=hash.get('invite');history.replaceState(null,'',location.pathname);message('');show('invite');return true;
}
window.addEventListener('hashchange',readInvitation);
if(!readInvitation())refreshSession();
