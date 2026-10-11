'use strict';
(() => {
  const configured=document.currentScript?.dataset.apiOrigin;
  const candidate=configured&&configured!=='__API_ORIGIN__'?configured:location.origin;
  const target=new URL(candidate);
  if(target.origin!==candidate||(!['localhost','127.0.0.1'].includes(target.hostname)&&target.protocol!=='https:'))throw new Error('Hesap bağlantısı geçersiz.');
  window.AccountApi=async(path,{method='GET',body,timeoutMs=30000}={})=>{
    if(!path.startsWith('/api/')||path.includes('\\')||path.startsWith('//'))throw new Error('İstek adresi geçersiz.');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    let response,data;
    try{
      response=await fetch(target.origin+path,{method,credentials:'include',signal:controller.signal,headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
      data=await response.json().catch(error=>{if(controller.signal.aborted)throw error;return {error:'İşlem tamamlanamadı.'}});
    }
    catch{throw new Error(controller.signal.aborted?'Sunucu zamanında yanıt vermedi. Bağlantınızı kontrol edip tekrar deneyin.':'Bağlantı kurulamadı. Lütfen tekrar deneyin.')}
    finally{clearTimeout(timer)}
    if(!response.ok){const error=new Error(data.error??data.message??'İşlem tamamlanamadı.');error.status=response.status;if(Number.isInteger(data.retryAfterSeconds)&&data.retryAfterSeconds>0)error.retryAfterSeconds=data.retryAfterSeconds;throw error}
    return data;
  };
})();
