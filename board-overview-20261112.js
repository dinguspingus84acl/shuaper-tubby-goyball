/* Keep the Big Board presentation compact without removing draft options. */
(()=>{
  'use strict';
  const head=document.querySelector('main>.head');
  const options=document.getElementById('shuaBoardOptions');
  const teams=document.getElementById('teamControls');
  const modes=document.getElementById('overallToggle');
  if(!head||!options||!teams||!modes||document.getElementById('shuaBoardSettingsPanel'))return;

  const panel=document.createElement('div');
  panel.id='shuaBoardSettingsPanel';
  panel.className='shua-board-settings-panel';
  panel.setAttribute('role','group');
  panel.setAttribute('aria-label','Big Board settings');

  const group=(label,controls)=>{
    const wrapper=document.createElement('div');
    wrapper.className='shua-board-setting-group';
    const heading=document.createElement('span');
    heading.className='shua-board-setting-label';
    heading.textContent=label;
    wrapper.append(heading,controls);
    return wrapper;
  };
  panel.append(group('League size',teams),group('Display',modes));
  head.append(panel);
  options.setAttribute('aria-controls',panel.id);
  options.setAttribute('aria-label','Toggle Big Board settings');

  options.remove();
  document.body.classList.add('shua-board-options-open');
})();
