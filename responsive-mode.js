/* Choose the layout from the device viewport, including orientation changes. */
(()=>{
  'use strict';
  const phoneScreen=window.matchMedia('(max-width:700px)');
  const apply=()=>document.body.classList.toggle('phone-mode',phoneScreen.matches);
  apply();
  if(phoneScreen.addEventListener)phoneScreen.addEventListener('change',apply);
  else phoneScreen.addListener(apply);
})();
