'use strict';
// Runs before the application download, so a failed or unsupported bundle has a way back.
(function () {
  var timer = setTimeout(function () {
    var root = document.getElementById('root');
    if (!root || !root.querySelector('.boot')) return;
    var box = document.createElement('main');
    box.className = 'boot boot-recovery';
    box.setAttribute('role', 'alert');
    var heading = document.createElement('h1');
    heading.textContent = 'Öğretmen Portalı açılamadı';
    var message = document.createElement('p');
    message.textContent = 'Bağlantınızı kontrol edip tekrar deneyin. Sorun sürerse Safari veya telefonunuzun sistem güncellemesini kontrol edin.';
    var retry = document.createElement('button');
    retry.className = 'primary';
    retry.textContent = 'Tekrar dene';
    retry.onclick = function () { location.reload(); };
    box.appendChild(heading); box.appendChild(message); box.appendChild(retry);
    while(root.firstChild)root.removeChild(root.firstChild);
    root.appendChild(box);
  }, 20000);
  window.TeacherBootReady = function () { clearTimeout(timer); };
}());
