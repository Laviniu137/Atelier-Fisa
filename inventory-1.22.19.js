(() => {
  'use strict';
  const dbName='atelier-inventory-v1',storeName='items',tombstoneStore='tombstones';
  const categories=[
    {id:'pal',name:'PAL',description:'Plăci PAL și decoruri',icon:'▤'},
    {id:'mdf',name:'MDF',description:'Plăci MDF și fronturi',icon:'▥'},
    {id:'blaturi',name:'Blaturi',description:'Blaturi și panouri',icon:'▰'}
  ];
  const nav=document.getElementById('workspaceInventoryNav'),panel=document.getElementById('workspaceInventory');
  const projectPanel=document.querySelector('#projectManagerView > .project-manager-content'),notesPanel=document.getElementById('workspaceNotes');
  const list=document.getElementById('workspaceInventoryList'),search=document.getElementById('workspaceInventorySearch'),status=document.getElementById('workspaceInventoryStatus');
  const addButton=document.getElementById('workspaceInventoryAdd'),breadcrumb=document.getElementById('workspaceInventoryBreadcrumb');
  const breadcrumbBack=document.getElementById('workspaceInventoryBack'),breadcrumbTitle=document.getElementById('workspaceInventoryFolderTitle');
  if(!nav||!panel||!list)return;
  let db=null,items=[],query='',activeCategory=null,objectUrls=[],cloudSyncPromise=null,cloudSyncTimer=null,cloudSyncRequested=0;
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const category=id=>categories.find(item=>item.id===id)||categories[0];
  const announce=(message,error=false)=>{status.textContent=message;status.classList.toggle('is-error',error);};
  const timestamp=value=>typeof value==='number'&&Number.isFinite(value)?value:(Date.parse(value||'')||0);
  const toIso=value=>new Date(timestamp(value)||Date.now()).toISOString();
  const scope=()=>window.atelierInventoryCloud?.connected()?' · sincronizat în contul Google':' · salvat pe acest dispozitiv';
  const openDb=()=>new Promise((resolve,reject)=>{const request=indexedDB.open(dbName,2);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(storeName))request.result.createObjectStore(storeName,{keyPath:'id'});if(!request.result.objectStoreNames.contains(tombstoneStore))request.result.createObjectStore(tombstoneStore,{keyPath:'id'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('Inventarul nu poate fi deschis.'));});
  const transact=(mode,action,storeId=storeName)=>new Promise((resolve,reject)=>{const tx=db.transaction(storeId,mode),request=action(tx.objectStore(storeId));request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('Datele inventarului nu au putut fi salvate.'));tx.onabort=()=>reject(tx.error||Error('Operația nu a putut fi finalizată.'));});
  const all=async()=>((await transact('readonly',store=>store.getAll()))||[]).map(item=>({...item,category:item.category||'pal'})).sort((a,b)=>timestamp(b.updatedAt)-timestamp(a.updatedAt));
  const allTombstones=async()=>((await transact('readonly',store=>store.getAll(),tombstoneStore))||[]);
  const writeLocalItem=item=>new Promise((resolve,reject)=>{const tx=db.transaction([storeName,tombstoneStore],'readwrite');tx.objectStore(storeName).put(item);tx.objectStore(tombstoneStore).delete(item.id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Materialul nu a putut fi salvat.'));tx.onabort=()=>reject(tx.error||Error('Operația nu a putut fi finalizată.'));});
  const writeLocalTombstone=(id,deletedAt)=>new Promise((resolve,reject)=>{const tx=db.transaction([storeName,tombstoneStore],'readwrite');tx.objectStore(storeName).delete(id);tx.objectStore(tombstoneStore).put({id,deletedAt:toIso(deletedAt)});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Ștergerea nu a putut fi salvată.'));tx.onabort=()=>reject(tx.error||Error('Operația nu a putut fi finalizată.'));});
  const save=async item=>{await writeLocalItem(item);scheduleCloudSync();};
  const remove=async id=>{const deletedAt=new Date().toISOString();await writeLocalTombstone(id,deletedAt);scheduleCloudSync();};
  function blobToDataUrl(blob){return new Promise((resolve,reject)=>{if(typeof blob==='string'){resolve(blob);return;}const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(Error('Imaginea materialului nu a putut fi pregătită pentru sincronizare.'));reader.readAsDataURL(blob);});}
  function dataUrlToBlob(value){if(typeof value!=='string'||!value.startsWith('data:'))return value;const [header,data]=value.split(',',2),mime=header.match(/^data:([^;]+)/)?.[1]||'image/jpeg',binary=atob(data||''),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new Blob([bytes],{type:mime});}
  async function cloudItem(item){return {...item,image:await blobToDataUrl(item.image),updatedAt:toIso(item.updatedAt)};}
  async function syncInventory(){
    const cloud=window.atelierInventoryCloud;
    if(!db||!cloud?.connected())return false;
    if(cloudSyncPromise)return cloudSyncPromise;
    const requestAtStart=cloudSyncRequested;
    cloudSyncPromise=(async()=>{
      const localItems=await all(),localDeletes=await allTombstones(),localById=new Map(localItems.map(item=>[item.id,item])),localDeleteById=new Map(localDeletes.map(item=>[item.id,item.deletedAt]));
      const localVersions=Object.fromEntries(localItems.map(item=>[item.id,toIso(item.updatedAt)]));
      const remote=await cloud.pull(localVersions),remoteById=new Map((remote.items||[]).map(item=>[item.id,item])),remoteMetaById=new Map(Object.entries(remote.metas||{})),remoteDeleteById=new Map(Object.entries(remote.tombstones||{}));
      const ids=new Set([...localById.keys(),...remoteMetaById.keys(),...localDeleteById.keys(),...remoteDeleteById.keys()]);
      for(const id of ids){
        const local=localById.get(id),remoteItem=remoteById.get(id),remoteMeta=remoteMetaById.get(id),localDeleted=localDeleteById.get(id),remoteDeleted=remoteDeleteById.get(id);
        const localAt=timestamp(local?.updatedAt),remoteAt=timestamp(remoteMeta?.updatedAt||remoteItem?.updatedAt),localDeleteAt=timestamp(localDeleted),remoteDeleteAt=timestamp(remoteDeleted);
        const localWinsDelete=Boolean(localDeleted)&&localDeleteAt>=Math.max(remoteAt,remoteDeleteAt);
        const remoteWinsDelete=Boolean(remoteDeleted)&&remoteDeleteAt>=Math.max(localAt,localDeleteAt);
        if(localWinsDelete){if(local)await writeLocalTombstone(id,localDeleted);if(localDeleteAt>remoteDeleteAt)await cloud.remove(id,toIso(localDeleted));continue;}
        if(remoteWinsDelete){if(local||!localDeleted||localDeleteAt<remoteDeleteAt)await writeLocalTombstone(id,remoteDeleted);continue;}
        if(local&&(!remoteMeta||localAt>remoteAt)){await cloud.save(await cloudItem(local));continue;}
        if(remoteMeta&&(!local||remoteAt>localAt)&&remoteItem){await writeLocalItem({...remoteItem,image:dataUrlToBlob(remoteItem.image),updatedAt:toIso(remoteItem.updatedAt)});continue;}
        if(remoteDeleted&&localDeleteAt<=remoteDeleteAt&&!local){await writeLocalTombstone(id,remoteDeleted);}
      }
      items=await all();render();
      announce(window.atelierInventoryCloud?.connected()?'Inventarul este sincronizat între dispozitive.':'Inventarul este salvat local.');
      return true;
    })().catch(error=>{console.warn('Sincronizarea inventarului va reîncerca.',error);announce('Inventarul rămâne salvat pe acest dispozitiv. Sincronizarea va reîncerca automat.',true);return false;}).finally(()=>{cloudSyncPromise=null;if(cloudSyncRequested>requestAtStart)scheduleCloudSync();});
    return cloudSyncPromise;
  }
  function scheduleCloudSync(){cloudSyncRequested+=1;window.clearTimeout(cloudSyncTimer);if(window.atelierInventoryCloud?.connected())cloudSyncTimer=window.setTimeout(()=>syncInventory(),180);}
  document.addEventListener('atelier-inventory-cloud-change',scheduleCloudSync);
  window.addEventListener('online',scheduleCloudSync);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleCloudSync();});
  window.atelierInventory={all:()=>all(),sync:()=>syncInventory()};
  const showSection=()=>{projectPanel.hidden=true;notesPanel.hidden=true;panel.hidden=false;for(const id of ['workspaceProjectsNav','workspaceNotesNav'])document.getElementById(id)?.removeAttribute('aria-current');nav.setAttribute('aria-current','page');document.title='Inventar | La-Tâmplar';render();};
  const leaveInventory=()=>{panel.hidden=true;nav.removeAttribute('aria-current');};
  document.getElementById('workspaceProjectsNav')?.addEventListener('click',leaveInventory,{capture:true});
  document.getElementById('workspaceNotesNav')?.addEventListener('click',leaveInventory,{capture:true});
  nav.addEventListener('click',showSection);
  search.addEventListener('input',()=>{query=search.value.trim().toLocaleLowerCase('ro-RO');render();});
  const formatDimension=value=>value?`${value} mm`:'';
  const match=item=>(`${item.name} ${item.supplier||''} ${item.width||''} ${item.height||''} ${item.depth||''}`).toLocaleLowerCase('ro-RO').includes(query);
  function revokeCards(){objectUrls.forEach(url=>URL.revokeObjectURL(url));objectUrls=[];list.replaceChildren();}
  function render(){
    revokeCards();
    if(breadcrumb){breadcrumb.hidden=!activeCategory;if(activeCategory){breadcrumbTitle.textContent=category(activeCategory).name;search.placeholder=`Caută în ${category(activeCategory).name}...`;search.setAttribute('aria-label',`Caută în ${category(activeCategory).name}`);}else{search.placeholder='Caută materiale...';search.setAttribute('aria-label','Caută materiale');}}
    if(activeCategory){
      const rows=items.filter(item=>item.category===activeCategory&&match(item));
      announce(`${rows.length} ${rows.length===1?'material':'materiale'} în ${category(activeCategory).name}${scope()}`);
      if(!rows.length){const empty=el('div','inventory-empty'),message=el('p','',query?'Nu am găsit materiale care să corespundă căutării.':'Dosarul este pregătit pentru primul material.');empty.append(message);if(!query){const button=el('button','inventory-empty-add','Adaugă un material');button.type='button';button.addEventListener('click',()=>openForm(null,activeCategory));empty.append(button);}list.append(empty);return;}
      rows.forEach(item=>list.append(makeItemCard(item)));
      return;
    }
    if(query){
      const rows=items.filter(match);announce(`${rows.length} rezultate${scope()}`);
      if(!rows.length){list.append(el('div','inventory-empty','Nu am găsit materiale care să corespundă căutării.'));return;}
      rows.forEach(item=>list.append(makeItemCard(item,true)));
      return;
    }
    announce(`Alege un dosar pentru a vedea materialele salvate${scope()}.`);
    categories.forEach(group=>{
      const count=items.filter(item=>item.category===group.id).length,card=el('button','inventory-folder-card');card.type='button';card.setAttribute('aria-label',`${group.name}, ${count} ${count===1?'material':'materiale'}`);
      const visual=el('span','inventory-folder-icon',group.icon),copy=el('span','inventory-folder-copy'),name=el('strong','',group.name),description=el('small','',group.description),meta=el('span','inventory-folder-meta'),number=el('strong','',String(count)),noun=el('small','',count===1?'material':'materiale'),arrow=el('span','inventory-folder-arrow','›');copy.append(name,description);meta.append(number,noun);card.append(visual,copy,meta,arrow);card.addEventListener('click',()=>{activeCategory=group.id;search.value='';query='';render();});list.append(card);
    });
  }
  function makeItemCard(item,showCategory=false){
    const card=el('article','inventory-card'),image=el('img','inventory-card-image');image.alt=item.name;image.loading='lazy';image.src=URL.createObjectURL(item.image);objectUrls.push(image.src);
    const content=el('div','inventory-card-content'),top=el('div','inventory-card-top'),title=el('h3','inventory-card-title',item.name),dimensions=el('div','inventory-card-dimensions');
    if(showCategory)top.append(el('span','inventory-item-category',category(item.category).name));top.append(title);if(item?.supplier)top.append(el('span','inventory-item-supplier',`Furnizor · ${item.supplier}`));
    for(const [label,value] of [['Lățime',item.width],['Lungime',item.height],['Grosime',item.depth]])if(value)dimensions.append(el('span','',`${label}: ${formatDimension(value)}`));
    if(!dimensions.childElementCount)dimensions.append(el('span','','Dimensiuni necompletate'));
    const actions=el('div','inventory-card-actions'),edit=el('button','','Editează'),del=el('button','inventory-delete','Șterge');edit.type=del.type='button';edit.addEventListener('click',()=>openForm(item,item.category));del.addEventListener('click',async()=>{if(!confirm(`Ștergi „${item.name}” din inventar?`))return;try{await remove(item.id);items=await all();render();announce(`Materialul a fost șters${scope()}.`);}catch(error){announce(error.message,true);}});
    actions.append(edit,del);content.append(top,dimensions,actions);card.append(image,content);return card;
  }
  function resizeImage(file){return new Promise((resolve,reject)=>{
    if(!file||!file.type.startsWith('image/')){reject(Error('Alege un fișier imagine.'));return;}
    if(file.size>30*1024*1024){reject(Error('Imaginea depășește 30 MB. Alege o fotografie mai mică.'));return;}
    const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{try{const scale=Math.min(1,1800/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{URL.revokeObjectURL(url);canvas.width=canvas.height=1;blob?resolve(blob):reject(Error('Imaginea nu a putut fi pregătită.'));},'image/jpeg',.86);}catch(error){URL.revokeObjectURL(url);reject(error);}};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Fișierul imagine nu poate fi deschis.'));};img.src=url;
  });}
  function openForm(item,initialCategory){
    const dialog=document.createElement('dialog');dialog.className='inventory-dialog';dialog.setAttribute('aria-labelledby','inventoryDialogTitle');
    const form=el('form','inventory-dialog-form');form.method='dialog';const head=el('div','inventory-dialog-heading'),copy=el('div'),title=el('h3','',item?'Editează materialul':'Adaugă un material'),desc=el('p','',item?'Actualizează dosarul, imaginea sau dimensiunile.':'Alege un dosar și completează detaliile materialului.');title.id='inventoryDialogTitle';copy.append(title,desc);const close=el('button','inventory-dialog-close','×');close.type='button';close.setAttribute('aria-label','Închide');close.addEventListener('click',()=>dialog.close());head.append(copy,close);
    const categorySelect=document.createElement('select');for(const group of categories){const option=document.createElement('option');option.value=group.id;option.textContent=group.name;categorySelect.append(option);}categorySelect.value=item?.category||initialCategory||'pal';const categoryField=el('label','inventory-field','Dosar');categoryField.append(categorySelect);
    const name=document.createElement('input');name.type='text';name.maxLength=120;name.required=true;name.placeholder='De exemplu: Stejar Halifax natur';name.value=item?.name||'';const nameField=el('label','inventory-field','Nume material');nameField.append(name);const supplier=document.createElement('input');supplier.type='text';supplier.maxLength=100;supplier.autocomplete='organization';supplier.placeholder='De exemplu: Egger, Kastamon';supplier.value=item?.supplier||'';const supplierField=el('label','inventory-field','Furnizor (opțional)');supplierField.append(supplier);
    const dims=el('div','inventory-dimensions');const dimensionInputs={};for(const [key,label] of [['width','Lățime (mm)'],['height','Lungime (mm)'],['depth','Grosime (mm)']]){const input=document.createElement('input');input.type='number';input.min='0';input.max='99999';input.step='1';input.inputMode='numeric';input.placeholder='—';input.value=item?.[key]||'';input.setAttribute('aria-label',label);dimensionInputs[key]=input;const field=el('label','inventory-field',label);field.append(input);dims.append(field);}
    const file=document.createElement('input');file.type='file';file.accept='image/*';file.className='inventory-file-input';file.setAttribute('aria-label','Alege imaginea materialului');const upload=el('label','inventory-field','Imagine');const uploadBox=el('span','inventory-upload'),preview=el('img','inventory-upload-preview'),uploadCopy=el('span','inventory-upload-copy');preview.alt='Previzualizare imagine';let selectedFile=null,previewUrl='';const updatePreview=blob=>{if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=blob?URL.createObjectURL(blob):'';preview.src=previewUrl||'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2282%22 height=%2258%22 viewBox=%220 0 82 58%22%3E%3Crect width=%2282%22 height=%2258%22 rx=%228%22 fill=%22%23e5ebf1%22/%3E%3Cpath d=%22M17 43l13-15 9 10 9-12 17 17H17z%22 fill=%22%23b8c7d5%22/%3E%3Ccircle cx=%2254%22 cy=%2218%22 r=%226%22 fill=%22%23b8c7d5%22/%3E%3C/svg%3E';};updatePreview(item?.image);const uploadStrong=el('strong','',item?'Schimbă imaginea':'Alege o imagine'),uploadInfo=el('span','',item?'Poți păstra imaginea actuală.':'JPG, PNG sau alt format de imagine');uploadCopy.append(uploadStrong,uploadInfo);uploadBox.append(preview,uploadCopy,file);upload.append(uploadBox);file.addEventListener('change',()=>{selectedFile=file.files?.[0]||null;if(selectedFile){updatePreview(selectedFile);uploadInfo.textContent=selectedFile.name;}});uploadBox.addEventListener('click',event=>{if(event.target!==file){event.preventDefault();file.click();}});
    const actions=el('div','inventory-dialog-actions'),cancel=el('button','','Anulează'),saveButton=el('button','inventory-save',item?'Salvează modificările':'Adaugă materialul');cancel.type='button';saveButton.type='submit';cancel.addEventListener('click',()=>dialog.close());actions.append(cancel,saveButton);form.append(head,categoryField,nameField,supplierField,dims,upload,actions);dialog.append(form);document.body.append(dialog);dialog.addEventListener('close',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);dialog.remove();});dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});form.addEventListener('submit',async event=>{event.preventDefault();const cleanName=name.value.trim();if(!cleanName){name.focus();return;}saveButton.disabled=true;try{const image=selectedFile?await resizeImage(selectedFile):item?.image;if(!image)throw Error('Alege o imagine pentru acest material.');const numeric=key=>{const n=Number(dimensionInputs[key].value);return Number.isFinite(n)&&n>0?String(Math.round(n)):'';};const id=item?.id||(crypto.randomUUID?crypto.randomUUID():`item-${Date.now()}-${Math.random().toString(36).slice(2)}`);const next={id,category:categorySelect.value,name:cleanName,supplier:supplier.value.trim(),width:numeric('width'),height:numeric('height'),depth:numeric('depth'),image,updatedAt:new Date().toISOString()};await save(next);items=await all();if(!activeCategory)activeCategory=next.category;render();announce(`Materialul a fost salvat în ${category(next.category).name}${scope()}.`);dialog.close();}catch(error){announce(error.message,true);saveButton.disabled=false;}});dialog.showModal();name.focus();
  }
  addButton.addEventListener('click',()=>openForm(null,activeCategory));
  breadcrumbBack?.addEventListener('click',()=>{activeCategory=null;search.value='';query='';render();});
  (async()=>{try{db=await openDb();items=await all();render();await syncInventory();}catch(error){announce(`${error.message} Verifică dacă browserul permite stocarea locală.`,true);addButton.disabled=true;}})();
})();

