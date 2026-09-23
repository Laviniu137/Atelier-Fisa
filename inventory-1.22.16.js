(() => {
  'use strict';
  const dbName='atelier-inventory-v1',storeName='items';
  const nav=document.getElementById('workspaceInventoryNav'),panel=document.getElementById('workspaceInventory');
  const projectPanel=document.querySelector('#projectManagerView > .project-manager-content'),notesPanel=document.getElementById('workspaceNotes');
  const list=document.getElementById('workspaceInventoryList'),search=document.getElementById('workspaceInventorySearch'),status=document.getElementById('workspaceInventoryStatus');
  const addButton=document.getElementById('workspaceInventoryAdd');
  if(!nav||!panel||!list)return;
  let db=null,items=[],query='',objectUrls=[];
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const announce=(message,error=false)=>{status.textContent=message;status.classList.toggle('is-error',error);};
  const openDb=()=>new Promise((resolve,reject)=>{const request=indexedDB.open(dbName,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(storeName))request.result.createObjectStore(storeName,{keyPath:'id'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('Inventarul nu poate fi deschis.'));});
  const transact=(mode,action)=>new Promise((resolve,reject)=>{const tx=db.transaction(storeName,mode),request=action(tx.objectStore(storeName));request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('Datele inventarului nu au putut fi salvate.'));tx.onabort=()=>reject(tx.error||Error('Operația nu a putut fi finalizată.'));});
  const all=async()=>((await transact('readonly',store=>store.getAll()))||[]).sort((a,b)=>b.updatedAt-a.updatedAt);
  const save=item=>transact('readwrite',store=>store.put(item));
  const remove=id=>transact('readwrite',store=>store.delete(id));
  const showSection=()=>{
    projectPanel.hidden=true;notesPanel.hidden=true;panel.hidden=false;
    for(const id of ['workspaceProjectsNav','workspaceNotesNav'])document.getElementById(id)?.removeAttribute('aria-current');
    nav.setAttribute('aria-current','page');document.title='Inventar | La-Tâmplar';render();
  };
  const leaveInventory=()=>{panel.hidden=true;nav.removeAttribute('aria-current');};
  document.getElementById('workspaceProjectsNav')?.addEventListener('click',leaveInventory,{capture:true});
  document.getElementById('workspaceNotesNav')?.addEventListener('click',leaveInventory,{capture:true});
  nav.addEventListener('click',showSection);
  search.addEventListener('input',()=>{query=search.value.trim().toLocaleLowerCase('ro-RO');render();});
  const formatDimension=value=>value?`${value} mm`:'';
  function render(){
    objectUrls.forEach(url=>URL.revokeObjectURL(url));objectUrls=[];list.replaceChildren();
    const visible=items.filter(item=>(item.name+' '+item.width+' '+item.height+' '+item.depth).toLocaleLowerCase('ro-RO').includes(query));
    if(!visible.length){const empty=el('div','inventory-empty',items.length?'Nu am găsit obiecte care să corespundă căutării.':'Adaugă primul obiect în inventar. Încarcă o imagine, scrie un nume și completează dimensiunile cunoscute.');list.append(empty);return;}
    for(const item of visible){
      const card=el('article','inventory-card'),image=el('img','inventory-card-image');image.alt=item.name;image.loading='lazy';image.src=URL.createObjectURL(item.image);objectUrls.push(image.src);
      const content=el('div','inventory-card-content'),title=el('h3','inventory-card-title',item.name),dimensions=el('div','inventory-card-dimensions');
      for(const [label,value] of [['Lățime',item.width],['Înălțime',item.height],['Adâncime',item.depth]])if(value)dimensions.append(el('span','',`${label}: ${formatDimension(value)}`));
      if(!dimensions.childElementCount)dimensions.append(el('span','','Dimensiuni necompletate'));
      const actions=el('div','inventory-card-actions'),edit=el('button','','Editează'),del=el('button','inventory-delete','Șterge');edit.type=del.type='button';edit.addEventListener('click',()=>openForm(item));del.addEventListener('click',async()=>{if(!confirm(`Ștergi „${item.name}” din inventar?`))return;try{await remove(item.id);items=await all();render();announce('Obiectul a fost șters.');}catch(error){announce(error.message,true);}});
      actions.append(edit,del);content.append(title,dimensions,actions);card.append(image,content);list.append(card);
    }
  }
  function resizeImage(file){return new Promise((resolve,reject)=>{
    if(!file||!file.type.startsWith('image/')){reject(Error('Alege un fișier imagine.'));return;}
    if(file.size>30*1024*1024){reject(Error('Imaginea depășește 30 MB. Alege o fotografie mai mică.'));return;}
    const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{try{const scale=Math.min(1,1800/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{URL.revokeObjectURL(url);canvas.width=canvas.height=1;blob?resolve(blob):reject(Error('Imaginea nu a putut fi pregătită.'));},'image/jpeg',.86);}catch(error){URL.revokeObjectURL(url);reject(error);}};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Fișierul imagine nu poate fi deschis.'));};img.src=url;
  });}
  function openForm(item){
    const dialog=document.createElement('dialog');dialog.className='inventory-dialog';dialog.setAttribute('aria-labelledby','inventoryDialogTitle');
    const form=el('form','inventory-dialog-form');form.method='dialog';const head=el('div','inventory-dialog-heading'),copy=el('div'),title=el('h3','',item?'Editează obiectul':'Adaugă în inventar'),desc=el('p','',item?'Actualizează imaginea și dimensiunile obiectului.':'Adaugă o fotografie și completează detaliile pe care vrei să le păstrezi.');title.id='inventoryDialogTitle';copy.append(title,desc);const close=el('button','inventory-dialog-close','×');close.type='button';close.setAttribute('aria-label','Închide');close.addEventListener('click',()=>dialog.close());head.append(copy,close);
    const name=document.createElement('input');name.type='text';name.maxLength=120;name.required=true;name.placeholder='De exemplu: Balama cu amortizare';name.value=item?.name||'';
    const nameField=el('label','inventory-field','Nume');nameField.append(name);
    const dims=el('div','inventory-dimensions');const dimensionInputs={};for(const [key,label] of [['width','Lățime (mm)'],['height','Înălțime (mm)'],['depth','Adâncime (mm)']]){const input=document.createElement('input');input.type='number';input.min='0';input.max='99999';input.step='1';input.inputMode='numeric';input.placeholder='—';input.value=item?.[key]||'';input.setAttribute('aria-label',label);dimensionInputs[key]=input;const field=el('label','inventory-field',label);field.append(input);dims.append(field);}
    const file=document.createElement('input');file.type='file';file.accept='image/*';file.className='inventory-file-input';file.setAttribute('aria-label','Alege imaginea obiectului');const upload=el('label','inventory-field','Imagine');const uploadBox=el('span','inventory-upload'),preview=el('img','inventory-upload-preview'),uploadCopy=el('span','inventory-upload-copy');preview.alt='Previzualizare imagine';let selectedFile=null;let previewUrl='';const updatePreview=blob=>{if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=blob?URL.createObjectURL(blob):'';preview.src=previewUrl||'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2282%22 height=%2258%22 viewBox=%220 0 82 58%22%3E%3Crect width=%2282%22 height=%2258%22 rx=%228%22 fill=%22%23e5ebf1%22/%3E%3Cpath d=%22M17 43l13-15 9 10 9-12 17 17H17z%22 fill=%22%23b8c7d5%22/%3E%3Ccircle cx=%2254%22 cy=%2218%22 r=%226%22 fill=%22%23b8c7d5%22/%3E%3C/svg%3E';};updatePreview(item?.image);const uploadStrong=el('strong','',item?'Schimbă imaginea':'Alege o imagine'),uploadInfo=el('span','',item?'Poți păstra imaginea actuală.':'JPG, PNG sau alt format de imagine');uploadCopy.append(uploadStrong,uploadInfo);uploadBox.append(preview,uploadCopy,file);upload.append(uploadBox);file.addEventListener('change',()=>{selectedFile=file.files?.[0]||null;if(selectedFile){updatePreview(selectedFile);uploadInfo.textContent=selectedFile.name;}});uploadBox.addEventListener('click',event=>{if(event.target!==file){event.preventDefault();file.click();}});
    const actions=el('div','inventory-dialog-actions'),cancel=el('button','','Anulează'),saveButton=el('button','inventory-save',item?'Salvează modificările':'Adaugă obiectul');cancel.type='button';saveButton.type='submit';cancel.addEventListener('click',()=>dialog.close());actions.append(cancel,saveButton);form.append(head,nameField,dims,upload,actions);dialog.append(form);document.body.append(dialog);dialog.addEventListener('close',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);dialog.remove();});dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});form.addEventListener('submit',async event=>{event.preventDefault();const cleanName=name.value.trim();if(!cleanName){name.focus();return;}saveButton.disabled=true;try{const image=selectedFile?await resizeImage(selectedFile):item?.image;if(!image)throw Error('Alege o imagine pentru acest obiect.');const numeric=key=>{const n=Number(dimensionInputs[key].value);return Number.isFinite(n)&&n>0?String(Math.round(n)):'';};const id=item?.id||(crypto.randomUUID?crypto.randomUUID():`item-${Date.now()}-${Math.random().toString(36).slice(2)}`);const next={id,name:cleanName,width:numeric('width'),height:numeric('height'),depth:numeric('depth'),image,updatedAt:Date.now()};await save(next);items=await all();render();announce('Obiectul a fost salvat în inventar.');dialog.close();}catch(error){announce(error.message,true);saveButton.disabled=false;}});dialog.showModal();name.focus();
  }
  addButton.addEventListener('click',()=>openForm(null));
  (async()=>{try{db=await openDb();items=await all();render();}catch(error){announce(`${error.message} Verifică dacă browserul permite stocarea locală.`,true);addButton.disabled=true;}})();
})();
