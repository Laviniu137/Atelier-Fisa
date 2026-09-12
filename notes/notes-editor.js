/* Atelier Notes — editable A4 documents. No network dependency. */
(() => {
  'use strict';
  const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const copy = v => JSON.parse(JSON.stringify(v));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => new Date().toISOString();
  const date = value => new Date(value).toLocaleString('ro-RO', {dateStyle:'medium', timeStyle:'short'});
  const size = page => page.orientation === 'landscape' ? [1123, 794] : [794, 1123];
  const pageData = (orientation = 'portrait', paper = 'blank') => ({id:uid(), orientation, paper, objects:[]});
  const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };
  const icons = {
    select:'M4 3v17l5-5 4 7 3-2-4-7h8Z', text:'M4 5h16M12 5v15M8 20h8', pencil:'m4 20 4-1L20 7l-4-4L4 15Z M13 6l5 5',
    marker:'m5 14 9-11 6 5-9 11Z M5 14l6 5-6 2-3-3Z', shape:'M4 4h16v16H4Z', image:'M3 3h18v18H3Z M3 17l6-6 4 4 3-3 5 5 M15 7h.01',
    undo:'M9 5 4 10l5 5 M4 10h10a6 6 0 0 1 6 6', redo:'m15 5 5 5-5 5 M20 10H10a6 6 0 0 0-6 6',
    plus:'M12 4v16M4 12h16', back:'m12 4-8 8 8 8M4 12h16', trash:'M4 7h16M9 7V3h6v4M6 7l1 14h10l1-14M10 11v6M14 11v6',
    copy:'M8 8h13v13H8ZM3 16V3h13', pen:'m5 19 3-7L17 3l4 4-9 9Z M5 19l4-4', eraser:'m3 14 9-11 9 8-9 10H9Z', more:'M5 12h.01M12 12h.01M19 12h.01', pages:'M5 3h14v18H5ZM8 7h8M8 11h8M8 15h5', focus:'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
    pan:'M5 12V8a2 2 0 0 1 4 0v4-8a2 2 0 0 1 4 0v8-6a2 2 0 0 1 4 0v6-3a2 2 0 0 1 4 0v8l-4 5H9l-6-7a2 2 0 0 1 2-3Z',
    line:'M4 20 20 4', dashed:'m4 20 3-3m3-3 4-4m3-3 3-3', highlighter:'m4 16 9-13 8 7-12 10Z M4 16l5 4-6 1Z',
    ellipse:'M12 4C7.1 4 4 7.6 4 12s3.1 8 8 8 8-3.6 8-8-3.1-8-8-8Z', arrow:'M4 12h15M12 5l7 7-7 7',
    close:'m5 5 14 14M5 19 19 5', export:'M12 15V3m-5 5 5-5 5 5M4 14v7h16v-7', edit:'m4 20 4-1L20 7l-4-4L4 15Z',
    lock:'M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4', up:'m5 14 7-7 7 7', down:'m5 10 7 7 7-7', minus:'M5 12h14',
    alignLeft:'M4 6h16M4 10h10M4 14h16M4 18h10', alignCenter:'M4 6h16M7 10h10M4 14h16M7 18h10', alignRight:'M4 6h16M10 10h10M4 14h16M10 18h10', alignJustify:'M4 6h16M4 10h16M4 14h16M4 18h16', listBullet:'M5 7h.01M9 7h10M5 12h.01M9 12h10M5 17h.01M9 17h10', listNumber:'M4 7h2M4 12h2M4 17h2M9 7h10M9 12h10M9 17h10'
  };
  function button(label, action, icon, cls = '') {
    const b = el('button', `an-button ${cls}`); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label);
    if (icon && icons[icon]) { const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true'); const p = document.createElementNS(svg.namespaceURI,'path'); p.setAttribute('d',icons[icon]); svg.append(p); b.append(svg); }
    b.append(el('span','',label)); if (action) b.addEventListener('click',action); return b;
  }
  function field(label, control) { const l = el('label','an-field'); control.setAttribute('aria-label',label); l.append(el('span','',label),control); return l; }
  function input(value = '', type = 'text') { const i=el('input'); i.type=type; i.value=value; return i; }
  function select(values, value, change) { const s=el('select'); for (const [id,label] of values) { const o=el('option','',label); o.value=id; s.append(o); } s.value=value; if(change)s.addEventListener('change',()=>change(s.value)); return s; }
  function download(blob, name) { const url=URL.createObjectURL(blob), a=el('a'); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000); }
  const filename = name => (name || 'Notita').replace(/[<>:"/\\|?*\x00-\x1f]/g,'-');
  function dialog(title, content, submit, label='Salvează') {
    const d=el('dialog','an-dialog'), form=el('form'); form.method='dialog';
    const actions=el('div','an-dialog-actions'); const cancel=button('Anulează',()=>d.close());
    const ok=button(label); ok.type='submit'; ok.classList.add('an-primary'); actions.append(cancel,ok);
    form.append(el('h2','',title),content,actions); d.append(form); document.body.append(d);
    form.addEventListener('submit',async event=>{event.preventDefault(); ok.disabled=true; try { await submit(); d.close(); } catch(error){ok.disabled=false; const msg=el('p','an-error',error.message); form.append(msg);} });
    d.addEventListener('close',()=>d.remove()); d.showModal(); return d;
  }
  const confirmAction = (title, action) => dialog(title,el('p','','Această acțiune poate fi anulată în editor cu Undo.'),action,'Șterge');

  class NotesStore {
    async open() {
      this.db = await new Promise((resolve,reject)=>{ const r=indexedDB.open('atelier-a4-notes',1); r.onupgradeneeded=()=>{r.result.createObjectStore('notes',{keyPath:'id'}); r.result.createObjectStore('meta');}; r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
      this.db.onversionchange=()=>this.db.close();
      if (!await this.get('meta','legacyImported')) {
        const raw=localStorage.getItem('atelier-fisa-general-notes-v1');
        const legacy=raw ? JSON.parse(raw) : [];
        if (!Array.isArray(legacy) || legacy.some(n=>typeof n?.title!=='string'||typeof n?.content!=='string')) throw Error('Notițele vechi nu pot fi importate. Originalele au fost păstrate.');
        const tx=this.db.transaction(['notes','meta'],'readwrite');
        for (let i=0;i<legacy.length;i++) {
          const n=legacy[i], pages=[];
          // Preserve every character of long legacy notes across editable A4 pages.
          const chunks=n.content.match(/[\s\S]{1,1800}/g)||[''];
          for (const chunk of chunks) { const p=pageData(); p.objects.push(TextObject.create(55,65,chunk,684,950)); pages.push(p); }
          tx.objectStore('notes').put({id:`legacy-${i}`,schema:1,title:n.title||'Notiță importată',description:'',projectId:'',projectName:'',createdAt:now(),updatedAt:now(),pages});
        }
        tx.objectStore('meta').put(true,'legacyImported'); await this.done(tx);
      }
      return this;
    }
    done(tx) { return new Promise((resolve,reject)=>{ tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error||Error('Salvare întreruptă')); }); }
    get(store,key) { return new Promise((resolve,reject)=>{const r=this.db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}); }
    all() { return new Promise((resolve,reject)=>{const r=this.db.transaction('notes').objectStore('notes').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}); }
    async setMeta(key,value) {const tx=this.db.transaction('meta','readwrite');tx.objectStore('meta').put(copy(value),key);await this.done(tx);}
    async pending() {return {notes:await this.get('meta','syncPending')||{},deletes:await this.get('meta','syncDeletes')||{}};}
    async queueNote(note) {const pending=await this.get('meta','syncPending')||{},deletes=await this.get('meta','syncDeletes')||{};pending[note.id]=copy(note);delete deletes[note.id];await this.setMeta('syncPending',pending);await this.setMeta('syncDeletes',deletes);}
    async queueDelete(id,deletedAt) {const pending=await this.get('meta','syncPending')||{},deletes=await this.get('meta','syncDeletes')||{};delete pending[id];deletes[id]=deletedAt;await this.setMeta('syncPending',pending);await this.setMeta('syncDeletes',deletes);}
    async clearPendingNote(id,updatedAt) {const pending=await this.get('meta','syncPending')||{};if(!pending[id]||pending[id].updatedAt!==updatedAt)return;delete pending[id];await this.setMeta('syncPending',pending);}
    async clearPendingDelete(id,deletedAt) {const deletes=await this.get('meta','syncDeletes')||{};if(deletes[id]!==deletedAt)return;delete deletes[id];await this.setMeta('syncDeletes',deletes);}
    async put(note,{sync=true}={}) {const tx=this.db.transaction('notes','readwrite');tx.objectStore('notes').put(copy(note));await this.done(tx);if(sync){await this.queueNote(note);window.dispatchEvent(new CustomEvent('atelier-notes-local-change'));}}
    async remove(id,{sync=true,deletedAt=now()}={}) {const tx=this.db.transaction('notes','readwrite');tx.objectStore('notes').delete(id);await this.done(tx);if(sync){await this.queueDelete(id,deletedAt);window.dispatchEvent(new CustomEvent('atelier-notes-local-change'));}}
  }

  class TextObject {
    static create(x,y,text='',w=48,h=40) {return {id:uid(),type:'text',x,y,w,h,rotation:0,opacity:1,locked:false,text,font:'Arial',fontSize:22,bold:false,italic:false,underline:false,color:'#25384b',align:'left',list:'none'};}
    static lines(o) {return o.text.split('\n').map((line,i)=>o.list==='bullet'?`• ${line}`:o.list==='number'?`${i+1}. ${line}`:line);}
    static rows(ctx,o,width=o.w) {const rows=[];for(const line of this.lines(o)){let row='';for(const word of line.split(/(?<=\s)/)){if(ctx.measureText(row+word).width>width-12&&row){rows.push(row);row='';}if(ctx.measureText(word).width>width-12){for(const c of word){if(ctx.measureText(row+c).width>width-12&&row){rows.push(row);row='';}row+=c;}}else row+=word;}rows.push(row);}return rows;}
    static fit(o,maxWidth=Infinity) {const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=`${o.italic?'italic ':''}${o.bold?'700':'400'} ${o.fontSize}px ${o.font}`;const naturalWidth=Math.max(42,Math.ceil(Math.max(0,...this.lines(o).map(line=>ctx.measureText(line).width))+10));o.w=Math.max(42,Math.min(naturalWidth,maxWidth));const rows=this.rows(ctx,o,o.w);o.h=Math.max(Math.ceil(o.fontSize*1.35+6),Math.ceil(rows.length*o.fontSize*1.35+6));return o;}
    static paint(ctx,o) {
      ctx.font=`${o.italic?'italic ':''}${o.bold?'700':'400'} ${o.fontSize}px ${o.font}`; ctx.fillStyle=o.color; ctx.textBaseline='top';
      const rows=this.rows(ctx,o,o.w);
      const step=o.fontSize*1.35;
      rows.forEach((row,i)=>{ const trimmed=row.trimEnd(),width=ctx.measureText(trimmed).width, x=o.align==='center'?(o.w-width)/2:o.align==='right'?o.w-width-6:6, y=6+i*step, justified=o.align==='justify'&&i<rows.length-1&&trimmed.trim().includes(' '); if(justified){const words=trimmed.trim().split(/\s+/),letters=words.reduce((sum,word)=>sum+ctx.measureText(word).width,0),gap=(o.w-12-letters)/Math.max(1,words.length-1);let cursor=6;for(const word of words){ctx.fillText(word,cursor,y);cursor+=ctx.measureText(word).width+gap;}if(o.underline)ctx.fillRect(6,y+o.fontSize+2,o.w-12,Math.max(1,o.fontSize/18));}else{ctx.fillText(row,x,y);if(o.underline){ctx.fillRect(x,y+o.fontSize+2,width,Math.max(1,o.fontSize/18));}} });
    }
  }
  class ImageObject {
    static cache = new Map();
    static async load(src) {if(this.cache.has(src))return this.cache.get(src); const image=new Image(); const promise=new Promise((resolve,reject)=>{image.onload=()=>resolve(image);image.onerror=()=>{this.cache.delete(src);reject(Error('Imaginea nu poate fi încărcată.'));};}); image.src=src;this.cache.set(src,promise);return promise;}
    static async fromFile(file) {if(!file?.type.startsWith('image/'))throw Error('Alege un fișier imagine.'); const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file);}); const img=await this.load(src); const scale=Math.min(1,2200/Math.max(img.width,img.height)); const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);const data=c.toDataURL('image/png');return {id:uid(),type:'image',x:70,y:80,w:Math.min(430,c.width),h:Math.min(430,c.width)*c.height/c.width,rotation:0,opacity:1,locked:false,src:data,crop:{x:0,y:0,w:1,h:1}};}
    static paint(ctx,o,image) {const c=o.crop;ctx.drawImage(image,c.x*image.width,c.y*image.height,c.w*image.width,c.h*image.height,0,0,o.w,o.h);}
  }
  class DrawingLayer {
    static paint(ctx,o) {
      ctx.strokeStyle=o.color;ctx.fillStyle=o.color;ctx.lineCap='round';ctx.lineJoin='round';
      const points=o.points, sx=o.w/(o.baseW||o.w||1), sy=o.h/(o.baseH||o.h||1);
      if(o.kind==='highlighter'&&points.length>1){ctx.lineWidth=o.width;ctx.beginPath();ctx.moveTo(points[0].x*sx,points[0].y*sy);for(const p of points.slice(1))ctx.lineTo(p.x*sx,p.y*sy);ctx.stroke();return;}
      if(o.kind==='line'||o.kind==='dashed'){ctx.lineWidth=o.width;ctx.setLineDash(o.kind==='dashed'?[o.width*2,o.width*2.5]:[]);ctx.beginPath();ctx.moveTo(points[0].x*sx,points[0].y*sy);ctx.lineTo(points.at(-1).x*sx,points.at(-1).y*sy);ctx.stroke();ctx.setLineDash([]);return;}
      if(points.length===1){ctx.beginPath();ctx.arc(points[0].x*sx,points[0].y*sy,o.width/2,0,Math.PI*2);ctx.fill();return;}
      for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];ctx.lineWidth=o.width*(o.pressure?(.35+.65*((a.p+b.p)/2)):1);ctx.beginPath();ctx.moveTo(a.x*sx,a.y*sy);ctx.lineTo(b.x*sx,b.y*sy);ctx.stroke();}
    }
    static normalize(o) {const xs=o.points.map(p=>p.x),ys=o.points.map(p=>p.y),x=Math.min(...xs)-o.width,y=Math.min(...ys)-o.width; o.w=Math.max(...xs)-x+o.width; o.h=Math.max(...ys)-y+o.width;o.baseW=o.w;o.baseH=o.h;o.x=x;o.y=y;o.points=o.points.map(p=>({...p,x:p.x-x,y:p.y-y}));return o;}
  }
  class A4Canvas {
    static paper(ctx,page) {const [w,h]=size(page);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.lineWidth=.6;ctx.strokeStyle='#dce7ee';ctx.beginPath();if(page.paper==='grid'){for(let x=0;x<w;x+=20){ctx.moveTo(x,0);ctx.lineTo(x,h);}for(let y=0;y<h;y+=20){ctx.moveTo(0,y);ctx.lineTo(w,y);}}else if(page.paper==='ruled'){for(let y=65;y<h-35;y+=28){ctx.moveTo(40,y);ctx.lineTo(w-40,y);}}ctx.stroke();}
    static paint(ctx,page,images,except) {
      this.paper(ctx,page);
      for(const o of page.objects){if(o.id!==except)this.object(ctx,o,images);}
    }
    static object(ctx,o,images) {ctx.save();ctx.translate(o.x+o.w/2,o.y+o.h/2);ctx.rotate(o.rotation*Math.PI/180);ctx.translate(-o.w/2,-o.h/2);ctx.globalAlpha=o.opacity??1;
      if(o.type==='text'){ctx.beginPath();ctx.rect(0,0,o.w,o.h);ctx.clip();TextObject.paint(ctx,o);}
      else if(o.type==='image'&&images.get(o.src))ImageObject.paint(ctx,o,images.get(o.src));
      else if(o.type==='drawing')DrawingLayer.paint(ctx,o);
      else if(o.type==='shape'){ctx.strokeStyle=o.color;ctx.fillStyle=o.fill||'transparent';ctx.lineWidth=o.width;ctx.beginPath();if(o.shape==='ellipse')ctx.ellipse(o.w/2,o.h/2,Math.max(1,o.w/2-2),Math.max(1,o.h/2-2),0,0,Math.PI*2);else if(o.shape==='arrow'){ctx.moveTo(0,o.h/2);ctx.lineTo(o.w,o.h/2);ctx.moveTo(o.w-o.w*.25,0);ctx.lineTo(o.w,o.h/2);ctx.lineTo(o.w-o.w*.25,o.h);}else ctx.rect(1,1,o.w-2,o.h-2);ctx.fill();ctx.stroke();}ctx.restore();}
    static async render(page,scale=1) {const images=new Map(); await Promise.all(page.objects.filter(o=>o.type==='image').map(async o=>images.set(o.src,await ImageObject.load(o.src))));const [w,h]=size(page),c=el('canvas');c.width=Math.round(w*scale);c.height=Math.round(h*scale);const ctx=c.getContext('2d');ctx.scale(scale,scale);this.paint(ctx,page,images);return c;}
  }
  class Export {
    static async pdf(note) {if(!window.PDFLib)throw Error('Biblioteca PDF lipsește. Încarcă și folderul notes pe site.');const pdf=await PDFLib.PDFDocument.create();for(const p of note.pages){const c=await A4Canvas.render(p,2),bytes=await (await fetch(c.toDataURL('image/png'))).arrayBuffer(),img=await pdf.embedPng(bytes);const dims=p.orientation==='landscape'?[841.89,595.28]:[595.28,841.89];pdf.addPage(dims).drawImage(img,{x:0,y:0,width:dims[0],height:dims[1]});}pdf.setTitle(note.title);return new Blob([await pdf.save()],{type:'application/pdf'});}
    static async png(page) {return new Promise(async(resolve,reject)=>{try{const c=await A4Canvas.render(page,2);c.toBlob(b=>b?resolve(b):reject(Error('Exportul imaginii a eșuat.')),'image/png');}catch(e){reject(e);}});}
    static async zip(note) {
      // ZIP STORE, with CRC32; each page is an independently usable PNG.
      const chunks=[],entries=[];let offset=0;
      const u16=(v,n)=>new DataView(v.buffer).setUint16(n[0],n[1],true),u32=(v,n)=>new DataView(v.buffer).setUint32(n[0],n[1]>>>0,true);
      for(let i=0;i<note.pages.length;i++){const bytes=new Uint8Array(await (await this.png(note.pages[i])).arrayBuffer()),name=new TextEncoder().encode(`pagina-${i+1}.png`);let crc=0xffffffff;for(const b of bytes){crc^=b;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
        const h=new Uint8Array(30);[[0,0x04034b50],[14,crc],[18,bytes.length],[22,bytes.length]].forEach(n=>u32(h,n));[[4,20],[26,name.length]].forEach(n=>u16(h,n));chunks.push(h,name,bytes);entries.push({name,crc,length:bytes.length,offset});offset+=30+name.length+bytes.length;}
      const start=offset;for(const e of entries){const h=new Uint8Array(46);[[0,0x02014b50],[16,e.crc],[20,e.length],[24,e.length],[42,e.offset]].forEach(n=>u32(h,n));[[4,20],[6,20],[28,e.name.length]].forEach(n=>u16(h,n));chunks.push(h,e.name);offset+=46+e.name.length;}
      const end=new Uint8Array(22);[[0,0x06054b50],[12,offset-start],[16,start]].forEach(n=>u32(end,n));[[8,entries.length],[10,entries.length]].forEach(n=>u16(end,n));chunks.push(end);return new Blob(chunks,{type:'application/zip'});
    }
    static async print(note) {const frame=el('iframe','an-print-frame');frame.title='Tipărire notiță A4';document.body.append(frame);const doc=frame.contentDocument;doc.open();doc.write('<!doctype html><html><head><title>Notiță A4</title><style>@page portrait{size:A4 portrait;margin:0}@page landscape{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0}section{break-after:page}section:last-child{break-after:auto}img{display:block;width:100%;height:100%}</style></head><body></body></html>');doc.close();for(const p of note.pages){const section=doc.createElement('section'),img=doc.createElement('img');section.style.cssText=`page:${p.orientation};width:${p.orientation==='landscape'?297:210}mm;height:${p.orientation==='landscape'?210:297}mm`;img.src=(await A4Canvas.render(p,1.5)).toDataURL('image/png');section.append(img);doc.body.append(section);await img.decode();}frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true});frame.contentWindow.focus();frame.contentWindow.print();setTimeout(()=>frame.remove(),120000);}
  }

  class SelectionLayer {
    constructor(editor) {this.e=editor;this.node=el('div','an-selection');this.node.hidden=true;editor.sheet.append(this.node);}
    render() {
      const o=this.e.object;this.node.hidden=!o||!!this.e.textEditor;if(!o){this.node.replaceChildren();this.objectId=null;return;}
      Object.assign(this.node.style,{left:`${o.x}px`,top:`${o.y}px`,width:`${o.w}px`,height:`${o.h}px`,transform:`rotate(${o.rotation}deg)`});
      this.node.classList.toggle('is-locked',!!o.locked);this.node.classList.toggle('is-text',o.type==='text');
      if(this.objectId===o.id&&this.locked===o.locked)return;
      this.objectId=o.id;this.locked=o.locked;this.node.replaceChildren();if(o.locked)return;
      for(const name of ['nw','ne','sw','se','rotate']){const h=el('button',`an-handle an-${name}`);h.type='button';h.setAttribute('aria-label',name==='rotate'?'Rotește obiectul':`Redimensionează ${name}`);h.dataset.handle=name;h.addEventListener('pointerdown',event=>this.e.beginTransform(event,name));this.node.append(h);}
    }
  }
  class PageManager {
    constructor(editor) {this.e=editor;this.node=el('aside','an-pages');this.node.setAttribute('aria-label','Paginile notiței');}
    render() {
      this.node.replaceChildren();const e=this.e,head=el('div','an-pages-head');head.append(el('strong','',`${e.note.pages.length} pagini`),button('Adaugă pagină',()=>this.add(),'plus','an-icon'));this.node.append(head);
      e.note.pages.forEach((p,i)=>{const card=button(`Pagina ${i+1}`,()=>e.switchPage(i));card.classList.add('an-page-thumb');card.setAttribute('aria-current',String(i===e.pageIndex));const c=el('canvas');c.width=120;c.height=Math.round(120*size(p)[1]/size(p)[0]);card.prepend(c);this.node.append(card);A4Canvas.render(p,.18).then(render=>{if(card.isConnected)c.getContext('2d').drawImage(render,0,0,c.width,c.height);}).catch(error=>e.status(error.message,true));});
    }
    add() {const e=this.e,template=e.manager.pageTemplates('Pagina nouă');dialog('Adaugă pagină A4',template.node,()=>{const {orientation,paper}=template.value;e.edit(()=>{e.note.pages.splice(e.pageIndex+1,0,pageData(orientation,paper));e.pageIndex++;});e.fit();},'Adaugă');}
    duplicate() {const e=this.e;e.edit(()=>{const p=copy(e.page);p.id=uid();p.objects.forEach(o=>o.id=uid());e.note.pages.splice(e.pageIndex+1,0,p);e.pageIndex++;});}
    remove() {const e=this.e;if(e.note.pages.length===1){e.status('Păstrează cel puțin o pagină.');return;}confirmAction('Ștergi pagina?',()=>e.edit(()=>{e.note.pages.splice(e.pageIndex,1);e.pageIndex=Math.max(0,e.pageIndex-1);}));}
    move(delta) {const e=this.e,index=e.pageIndex+delta;if(index<0||index>=e.note.pages.length)return;e.edit(()=>{const [p]=e.note.pages.splice(e.pageIndex,1);e.note.pages.splice(index,0,p);e.pageIndex=index;});}
  }

  class Toolbar {
    constructor(editor) {this.e=editor;this.node=el('div','an-toolbar');this.modes=el('div','an-modes');this.contextToggle=button('Opțiuni instrument',()=>this.toggleContext(),'more','an-context-toggle an-icon');this.contextToggle.setAttribute('aria-expanded','false');this.context=el('div','an-context');this.top=el('div','an-tools-row');this.objectActions=el('div','an-object-actions');this.top.append(this.modes,this.objectActions,this.contextToggle);this.node.append(this.top,this.context);this.render();}
    toggleContext() {if(this.context.hidden)return;const expanded=this.context.classList.toggle('is-expanded');this.contextToggle.setAttribute('aria-expanded',String(expanded));}
    closePopover(){if(!this.activePopover)return;this.activePopover.trigger.setAttribute('aria-expanded','false');const {content,parent,next,placeholder}=this.activePopover;placeholder?.remove();if(parent?.isConnected)parent.insertBefore(content,next?.parentNode===parent?next:null);this.activePopover.node.remove();document.removeEventListener('pointerdown',this.popoverDismiss,true);this.activePopover=null;}
    openPopover(trigger,title,content){this.closePopover();const parent=content.parentNode,next=content.nextSibling;let placeholder=null;if(parent?.isConnected){const rect=content.getBoundingClientRect();placeholder=el('span','an-popover-placeholder');placeholder.style.cssText=`width:${rect.width}px;height:${rect.height}px;flex:0 0 ${rect.width}px`;parent.insertBefore(placeholder,content);}const node=el('section','an-toolbar-popover');node.setAttribute('role','dialog');node.setAttribute('aria-label',title);node.append(el('strong','an-toolbar-popover-title',title),content);this.node.append(node);const host=this.node.getBoundingClientRect(),rect=trigger.getBoundingClientRect(),left=clamp(rect.left-host.left,8,Math.max(8,this.node.clientWidth-300));node.style.left=`${left}px`;node.style.top=`${rect.bottom-host.top+8}px`;if(this.node.classList.contains('an-text-toolbar')){node.style.setProperty('left',`${left}px`,'important');node.style.setProperty('top',`${rect.bottom-host.top+8}px`,'important');}trigger.setAttribute('aria-expanded','true');this.activePopover={node,trigger,content,parent,next,placeholder};this.popoverDismiss=event=>{if(this.activePopover&&!node.contains(event.target)&&!trigger.contains(event.target))this.closePopover();};requestAnimationFrame(()=>document.addEventListener('pointerdown',this.popoverDismiss,true));}
    togglePopover(trigger,title,content){if(this.activePopover?.trigger===trigger){this.closePopover();return;}this.openPopover(trigger,title,content());}
    destroy(){this.closePopover();}
    render() {
      const e=this.e;this.modes.replaceChildren();
      for(const [id,name,icon] of [['select','Selectare','select'],['text','Text','text'],['pencil','Desen','pencil'],['shape','Forme','shape'],['image','Imagine','image'],['pan','Deplasare','pan']]){const b=button(name,()=>id==='image'?e.chooseImage():e.setTool(id),icon);b.dataset.mode=id;b.setAttribute('aria-pressed',String(e.tool===id));this.modes.append(b);}
      this.renderContext();
    }
    historyControls(){const e=this.e,history=el('div','an-history an-context-history');history.setAttribute('aria-label','Istoric modificări');const undo=button('Undo',()=>e.undo(),'undo','an-icon'),redo=button('Redo',()=>e.redo(),'redo','an-icon');undo.disabled=!e.past.length;redo.disabled=!e.future.length;history.append(undo,redo);return history;}
    renderContext() {
      this.closePopover();this.objectActions.replaceChildren();const e=this.e,o=e.object;this.node.classList.toggle('an-text-toolbar',o?.type==='text'||e.tool==='text');this.context.hidden=false;this.context.classList.remove('is-expanded');this.contextToggle.hidden=false;this.contextToggle.setAttribute('aria-expanded','false');this.context.replaceChildren();
      this.context.dataset.mode=o&&e.tool==='select'?o.type:e.tool;
      const add=(label,control,target=this.context)=>target.append(field(label,control));
      const addChoices=(label,choices,value,change)=>{
        const wrap=el('div','an-choice-field');wrap.setAttribute('role','group');wrap.setAttribute('aria-label',label);
        wrap.append(el('span','an-choice-heading',label));
        const buttons=el('div','an-choice-buttons');
        for(const [id,name,icon] of choices){const b=button(name,()=>change(id),icon,'an-choice-button');b.setAttribute('aria-pressed',String(id===value));buttons.append(b);}
        wrap.append(buttons);this.context.append(wrap);
      };
      const addRange=(label,value,min,max,change,suffix='px',changeEvent='input',target=this.context)=>{const wrap=el('label','an-field an-range-field'),top=el('span','an-field-heading'),name=el('span','',label),out=el('output','an-range-value',`${value} ${suffix}`),range=input(value,'range');range.min=min;range.max=max;range.setAttribute('aria-label',label);range.addEventListener('input',()=>out.textContent=`${range.value} ${suffix}`);range.addEventListener(changeEvent,()=>change(Number(range.value)));top.append(name,out);wrap.append(top,range);target.append(wrap);return range;};
      const addPalette=(label,value,change,target=this.context)=>{const wrap=el('div','an-color-field');wrap.setAttribute('role','group');wrap.setAttribute('aria-label',label);wrap.append(el('span','an-choice-heading',label));const colors=['#111827','#d94a4a','#e88b24','#f2c94c','#3c9b68','#287dc4','#7654b8'];const swatches=el('div','an-color-swatches');for(const color of colors){const swatch=button(color,()=>change(color),null,'an-color-swatch');swatch.style.setProperty('--an-swatch',color);swatch.style.backgroundColor=color;swatch.setAttribute('aria-pressed',String(color.toLowerCase()===String(value).toLowerCase()));swatches.append(swatch);}const custom=input(value,'color');custom.className='an-color-custom';custom.setAttribute('aria-label',`${label} personalizată`);custom.addEventListener('input',()=>change(custom.value));const customWrap=el('span','an-custom-color');customWrap.append(custom);wrap.append(swatches,customWrap);target.append(wrap);};
      const group=className=>el('div',`an-toolbar-group ${className}`);
      const addPopover=(label,summary,icon,build,target=this.context)=>{let trigger;trigger=button(label,()=>this.togglePopover(trigger,label,build),icon,'an-popover-trigger');trigger.setAttribute('aria-expanded','false');trigger.lastElementChild.textContent=summary||'';if(!summary)trigger.classList.add('an-popover-icon-trigger');if(label==='Aliniere'||label==='Listă'){const options=build();options.className='an-inline-options';for(const option of options.children){option.classList.add('an-icon');option.setAttribute('aria-pressed',String(option.classList.contains('is-selected')));}target.append(field(label,options));}else target.append(field(label,trigger));return trigger;};
      const popoverOption=(label,action,icon,cls='')=>button(label,()=>{action();this.closePopover();},icon,`an-popover-option ${cls}`);
      let textFormatGroup=null,textAppearanceGroup=null,contextHistoryPlaced=false;
      if(o&&e.tool==='select') {
        if(o.type==='text'){
          const objectGroup=group('an-text-zone an-text-object-group'),state=group('an-text-state-group'),properties=group('an-text-zone an-text-properties-group'),transform=group('an-text-transform-group'),actions=group('an-text-actions-group');
          state.append(el('span','an-context-title','Text'),button('Editează',()=>e.editText(o),'edit','an-toolbar-icon-button'));
          const rotation=input(o.rotation,'number');rotation.min=-360;rotation.max=360;rotation.step=1;rotation.addEventListener('change',()=>e.changeObject({rotation:clamp(Number(rotation.value)||0,-360,360)}));rotation.disabled=!!o.locked;add('Rotație °',rotation,transform);
          const opacity=addRange('Opacitate',Math.round(o.opacity*100),5,100,value=>e.changeObject({opacity:value/100}),'%','change',transform);opacity.disabled=!!o.locked;
          let arrangeTrigger;arrangeTrigger=button('Aranjare',()=>this.togglePopover(arrangeTrigger,'Aranjare',()=>{const content=el('div','an-popover-options');content.append(popoverOption('În față',()=>e.order(1),'up'),popoverOption('În spate',()=>e.order(-1),'down'));return content;}),'more','an-icon an-toolbar-icon-button an-arrange-trigger');arrangeTrigger.setAttribute('aria-expanded','false');
          actions.append(button('Duplică',()=>e.duplicate(),'copy','an-icon an-toolbar-icon-button'),button(o.locked?'Deblochează':'Blochează',()=>e.changeObject({locked:!o.locked},true),'lock','an-toolbar-icon-button'),arrangeTrigger,button('Șterge',()=>e.removeObject(),'trash','an-danger an-icon an-toolbar-icon-button'));
          objectGroup.append(state,actions);properties.append(transform);this.context.append(objectGroup,properties);textFormatGroup=group('an-text-zone an-text-format-group');textAppearanceGroup=group('an-text-zone an-text-appearance-group');this.context.append(textFormatGroup,textAppearanceGroup);
        }else{
          this.context.append(el('span','an-context-title',({image:'Imagine',drawing:'Desen',shape:'Formă'})[o.type]));
          if(o.type==='image'&&!o.locked){this.context.append(button('Decupează',()=>e.cropImage(o)),button('Înlocuiește',()=>e.chooseImage(o.id),'image'));}
          const rotation=input(o.rotation,'number');rotation.min=-360;rotation.max=360;rotation.step=1;rotation.addEventListener('change',()=>e.changeObject({rotation:clamp(Number(rotation.value)||0,-360,360)}));rotation.disabled=!!o.locked;add('Rotație °',rotation);
          const opacity=addRange('Opacitate',Math.round(o.opacity*100),5,100,value=>e.changeObject({opacity:value/100}),'%','change');opacity.disabled=!!o.locked;
          this.context.append(button('Duplică',()=>e.duplicate(),'copy','an-icon'),button(o.locked?'Deblochează':'Blochează',()=>e.changeObject({locked:!o.locked},true),'lock'),button('În față',()=>e.order(1),'up','an-icon'),button('În spate',()=>e.order(-1),'down','an-icon'),button('Șterge',()=>e.removeObject(),'trash','an-danger an-icon'));
        }
      }
      if((o?.type==='text'&&!o.locked)||e.tool==='text') {
        if(!textFormatGroup){const objectGroup=group('an-text-zone an-text-object-group'),state=group('an-text-state-group');state.append(el('span','an-context-title','Text nou'));objectGroup.append(state);textFormatGroup=group('an-text-zone an-text-format-group');textAppearanceGroup=group('an-text-zone an-text-appearance-group');this.context.append(objectGroup,textFormatGroup,textAppearanceGroup);}
        const style=o?.type==='text'?o:e.textStyle,target=textFormatGroup,update=patch=>{if(o?.type==='text')e.changeObject(patch);else{Object.assign(e.textStyle,patch);this.renderContext();}};
        const fonts=[['Arial','Arial'],['Georgia','Georgia'],['Verdana','Verdana'],['Courier New','Monospace']];
        addPopover('Font',style.font,null,()=>{const content=el('div','an-font-popover'),search=input('','search');search.placeholder='Caută un font';search.setAttribute('aria-label','Caută un font');const options=el('div','an-popover-options');for(const [value,label] of fonts){const option=popoverOption(label,()=>update({font:value}),'',`an-font-option${value===style.font?' is-selected':''}`);option.style.fontFamily=value;options.append(option);}search.addEventListener('input',()=>{const query=search.value.trim().toLocaleLowerCase('ro-RO');for(const option of options.children)option.hidden=!option.textContent.toLocaleLowerCase('ro-RO').includes(query);});content.append(search,options);return content;},target).style.fontFamily=style.font;
        addPopover('Mărime',`${style.fontSize}px`,null,()=>{const content=el('div','an-size-popover'),stepper=el('div','an-size-stepper'),manual=input(style.fontSize,'number');manual.min=8;manual.max=144;manual.setAttribute('aria-label','Valoare mărime');const set=value=>update({fontSize:clamp(Number(value)||22,8,144)});stepper.append(button('Micșorează',()=>set(style.fontSize-1),'minus','an-stepper-button'),manual,button('Mărește',()=>set(style.fontSize+1),'plus','an-stepper-button'));manual.addEventListener('change',()=>set(manual.value));const presets=el('div','an-size-presets');for(const value of [12,14,16,18,24,32])presets.append(popoverOption(`${value}`,()=>set(value),'',`an-size-preset${value===style.fontSize?' is-selected':''}`));content.append(stepper,presets);return content;},target);
        const textStyles=group('an-text-style-group');for(const [key,name] of [['bold','Bold'],['italic','Italic'],['underline','Subliniat']]){const b=button(name,()=>update({[key]:!style[key]}));b.classList.add('an-text-style-button',`an-text-style-${key}`);b.setAttribute('aria-pressed',String(!!style[key]));textStyles.append(b);}target.append(field('Stil',textStyles));
        const aligns=[['left','Stânga','alignLeft'],['center','Centru','alignCenter'],['right','Dreapta','alignRight'],['justify','Justify','alignJustify']],alignIcon=aligns.find(item=>item[0]===style.align)?.[2]||'alignLeft';
        addPopover('Aliniere','',alignIcon,()=>{const content=el('div','an-icon-popover-grid');for(const [value,label,icon] of aligns){const option=popoverOption(label,()=>update({align:value}),icon,`an-icon-popover-option${value===style.align?' is-selected':''}`);content.append(option);}return content;},target);
        const lists=[['none','Fără listă','close'],['bullet','Cu puncte','listBullet'],['number','Numerotată','listNumber']],listIcon=lists.find(item=>item[0]===style.list)?.[2]||'close';
        addPopover('Listă','',listIcon,()=>{const content=el('div','an-icon-popover-grid an-list-popover');for(const [value,label,icon] of lists)content.append(popoverOption(label,()=>update({list:value}),icon,`an-icon-popover-option${value===style.list?' is-selected':''}`));return content;},target);
        const presets=[['body','Corp de text',22,false],['subtitle','Subtitlu',28,true],['title','Titlu',36,true],['heading','Heading',44,true]],currentPreset=presets.find(item=>item[2]===style.fontSize&&item[3]===style.bold)?.[0]||'body';
        addPopover('Stil text',presets.find(item=>item[0]===currentPreset)[1],null,()=>{const content=el('div','an-style-popover');for(const [id,label,fontSize,bold] of presets){const option=popoverOption(label,()=>update({fontSize,bold}),'',`an-style-preview${id===currentPreset?' is-selected':''}`);option.style.fontSize=`${Math.min(fontSize,24)}px`;option.style.fontWeight=bold?'700':'400';content.append(option);}return content;},target);
        addPalette('Culoare text',style.color,color=>update({color}),textAppearanceGroup);textAppearanceGroup.append(this.historyControls());contextHistoryPlaced=true;
      } else if(e.tool==='pencil') {
        const choices=[['pencil','Creion','pencil'],['highlighter','Evidențiator','highlighter'],['line','Linie','line'],['dashed','Linie punctată','dashed'],['eraser','Gumă','eraser']];
        addChoices('Instrument',choices,e.drawKind,v=>{e.drawKind=v;this.renderContext();});
        const widthKey=e.drawKind==='highlighter'?'highlighterWidth':e.drawKind==='eraser'?'eraserWidth':'drawWidth';addRange(e.drawKind==='eraser'?'Mărime gumă':'Grosime',e[widthKey],1,e.drawKind==='eraser'?80:40,value=>e[widthKey]=value);
        addPalette('Culoare',e.drawColor,color=>{e.drawColor=color;this.renderContext();});
        this.context.append(button('Șterge',()=>confirmAction('Ștergi toate trasările de pe pagină?',()=>e.edit(()=>{e.page.objects=e.page.objects.filter(o=>o.type!=='drawing');})),'trash','an-danger an-clear-drawing'));
      } else if(e.tool==='shape') {
        addChoices('Formă',[['rect','Dreptunghi','shape'],['ellipse','Elipsă','ellipse'],['arrow','Săgeată','arrow']],e.shapeKind,v=>{e.shapeKind=v;this.renderContext();});addRange('Grosime contur',e.drawWidth,1,24,value=>e.drawWidth=value);addPalette('Culoare contur',e.drawColor,color=>{e.drawColor=color;this.renderContext();});
      } else if(!o) {if(e.tool==='select'){this.context.hidden=true;this.contextToggle.hidden=true;return;}this.context.append(el('span','an-hint',e.tool==='pan'?'Trage pentru deplasare. Două degete pentru zoom.':'Alege instrumentul și lucrează direct pe foaia A4.'));}
      if(!contextHistoryPlaced){const history=this.historyControls();if(textAppearanceGroup){textAppearanceGroup.append(history);contextHistoryPlaced=true;}else this.context.append(history);}
      if(this.node.classList.contains('an-text-toolbar')){
        // Reparent existing controls; their handlers and editor commands remain intact.
        const objectGroup=this.context.querySelector('.an-text-object-group'),properties=this.context.querySelector('.an-text-properties-group');
        if(objectGroup&&o){const actions=objectGroup.querySelector('.an-text-actions-group');
          if(actions){for(const action of [...actions.children]){if(action.classList.contains('an-arrange-trigger'))continue;action.classList.add('an-icon');this.objectActions.append(action);}}
          const secondary=el('div','an-object-properties');const edit=objectGroup.querySelector('.an-text-state-group .an-button'),arrange=objectGroup.querySelector('.an-arrange-trigger');
          if(edit)secondary.append(edit);if(properties)secondary.append(properties);if(arrange)secondary.append(arrange);
          const more=button('Proprietăți obiect',()=>this.togglePopover(more,'Proprietăți obiect',()=>secondary),'more','an-icon');more.setAttribute('aria-expanded','false');this.objectActions.prepend(more);
        }
        objectGroup?.remove();
        if(textFormatGroup){const controls=[...textFormatGroup.children];this.context.append(...controls);textFormatGroup.remove();}
        if(textAppearanceGroup){this.context.append(...textAppearanceGroup.children);textAppearanceGroup.remove();}
        const secondary=el('div','an-secondary-controls');const advanced=el('div','an-advanced-text');for(const options of this.context.querySelectorAll('.an-inline-options')){const label=options.parentElement.firstElementChild.textContent;const control=label==='Aliniere'?options.lastElementChild:options.firstElementChild;control.classList.remove('an-icon');advanced.append(control);}secondary.append(advanced);
        for(const control of [...this.context.children]){if(control.classList.contains('an-color-field')||control.matches('.an-field')&&control.firstElementChild?.textContent==='Stil text')secondary.append(control);}
        const extra=el('div','an-text-extra');const more=button('Mai multe opțiuni text',()=>this.togglePopover(more,'Stil și culoare',()=>secondary),'more','an-icon');more.setAttribute('aria-expanded','false');extra.append(more);this.context.insertBefore(secondary,this.context.querySelector('.an-history'));this.context.insertBefore(extra,this.context.querySelector('.an-history'));
        this.contextToggle.hidden=true;
      }

    }
  }

  class NoteEditor {
    constructor(manager,note) {
      this.manager=manager;this.note=copy(note);this.pageIndex=clamp(note.activePage||0,0,note.pages.length-1);this.selected=null;this.tool='select';this.drawKind='pencil';this.drawColor='#25384b';this.drawWidth=3;this.highlighterWidth=20;this.eraserWidth=24;this.shapeKind='rect';this.textStyle=TextObject.create(0,0);this.past=[];this.future=[];this.images=new Map();this.pointers=new Map();this.zoom=1;this.saveChain=Promise.resolve();this.dirty=false;this.revision=0;this.suppressClickUntil=0;this.pagesCollapsed=false;this.focusMode=false;
      this.root=el('section','an-editor');this.root.setAttribute('aria-label','Editor de notițe A4');this.root.id='atelierNoteEditor';
      const header=el('header','an-editor-header');const titleBlock=el('div','an-document-name');this.title=el('strong','',this.note.title);this.saveStatus=el('span','an-save-status','Salvat pe acest dispozitiv');this.saveStatus.setAttribute('role','status');titleBlock.append(this.title,this.saveStatus);
      this.pagesToggle=button('Ascunde paginile',()=>this.togglePages(),'pages','an-icon an-pages-toggle');this.pagesToggle.setAttribute('aria-pressed','false');this.focusToggle=button('Mod focus',()=>this.toggleFocus(),'focus','an-icon an-focus-toggle');this.focusToggle.setAttribute('aria-pressed','false');header.append(button('Notițe',()=>this.close(),'back'),titleBlock,this.pagesToggle,button('Detalii',()=>manager.details(this.note,updated=>{this.edit(()=>Object.assign(this.note,updated));this.title.textContent=this.note.title;}),'edit'),this.focusToggle,button('Export',()=>this.exportMenu(),'export'));
      this.sheet=el('div','an-sheet');this.canvas=el('canvas','an-canvas');this.canvas.setAttribute('aria-label','Pagina A4. Alege un instrument pentru a edita.');this.sheet.append(this.canvas);this.canvas.tabIndex=0;
      this.board=el('div','an-board');this.space=el('div','an-sheet-space');this.space.append(this.sheet);this.board.append(this.space);
      this.pages=new PageManager(this);this.selection=new SelectionLayer(this);this.toolbar=new Toolbar(this);
      const body=el('div','an-editor-body');body.append(this.pages.node,this.board);
      this.footer=el('footer','an-editor-footer');this.pageLabel=el('span');this.zoomLabel=el('span');
      this.footer.append(this.pageLabel,button('−',()=>this.setZoom(this.zoom/1.2)),this.zoomLabel,button('+',()=>this.setZoom(this.zoom*1.2)),button('Încadrează',()=>this.fit()),button('Duplică pagina',()=>this.pages.duplicate(),'copy','an-icon'),button('Pagina înainte',()=>this.pages.move(-1),'up','an-icon'),button('Pagina înapoi',()=>this.pages.move(1),'down','an-icon'),button('Șterge pagina',()=>this.pages.remove(),'trash','an-icon'));
      this.root.append(header,this.toolbar.node,body,this.footer);document.body.append(this.root);this.oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
      this.abort=new AbortController();const signal=this.abort.signal;
      this.canvas.addEventListener('pointerdown',event=>this.down(event),{signal});this.board.addEventListener('pointermove',event=>this.move(event),{signal});this.board.addEventListener('pointerup',event=>this.up(event),{signal});this.board.addEventListener('pointercancel',event=>this.up(event,true),{signal});
      this.root.addEventListener('click',event=>{if(event.target===this.canvas&&performance.now()<this.suppressClickUntil){event.preventDefault();event.stopPropagation();}},{capture:true,signal});
      this.board.addEventListener('pointerdown',event=>{if(event.target===this.board||event.target===this.space)this.down(event,true);},{signal});
      this.board.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey){event.preventDefault();this.zoomAt(this.zoom*Math.exp(-event.deltaY*.008),event.clientX,event.clientY);}},{passive:false,signal});
      this.board.addEventListener('contextmenu',event=>{if(event.target!==this.textEditor)event.preventDefault();},{signal});
      this.root.addEventListener('keydown',event=>this.key(event),{signal});
      window.addEventListener('beforeunload',event=>{if(this.dirty){this.flush().catch(()=>{});event.preventDefault();event.returnValue='';}},{signal});
      document.addEventListener('visibilitychange',()=>{if(document.hidden)this.flush().catch(()=>{});},{signal});
      this.resize=new ResizeObserver(()=>{if(!this.textEditor&&this.autoFit)this.fit();});this.resize.observe(this.board);
      this.refresh();requestAnimationFrame(()=>this.fit());this.canvas.focus({preventScroll:true});
    }
    get page(){return this.note.pages[this.pageIndex];}
    get object(){return this.page.objects.find(o=>o.id===this.selected);}
    togglePages(){this.pagesCollapsed=!this.pagesCollapsed;this.root.classList.toggle('an-pages-collapsed',this.pagesCollapsed);this.pagesToggle.setAttribute('aria-pressed',String(this.pagesCollapsed));this.pagesToggle.setAttribute('aria-label',this.pagesCollapsed?'Arată paginile':'Ascunde paginile');this.pagesToggle.title=this.pagesCollapsed?'Arată paginile':'Ascunde paginile';requestAnimationFrame(()=>this.fit());}
    toggleFocus(){this.focusMode=!this.focusMode;this.root.classList.toggle('an-focus-mode',this.focusMode);this.focusToggle.setAttribute('aria-pressed',String(this.focusMode));this.focusToggle.setAttribute('aria-label',this.focusMode?'Ieși din modul focus':'Mod focus');this.focusToggle.title=this.focusMode?'Ieși din modul focus':'Mod focus';this.toolbar.context.classList.remove('is-expanded');this.toolbar.contextToggle.setAttribute('aria-expanded','false');requestAnimationFrame(()=>this.fit());}
    status(text,error=false){this.saveStatus.textContent=text;this.saveStatus.classList.toggle('an-error',error);}
    snapshot(){this.past.push(copy(this.note));if(this.past.length>30)this.past.shift();this.future=[];}
    edit(action){this.endText();this.snapshot();action();this.selected=null;this.changed();this.refresh();}
    changed(delay=420){this.note.updatedAt=now();this.note.activePage=this.pageIndex;this.revision++;this.dirty=true;this.status('Se salvează…');clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush().catch(()=>{}),delay);this.requestPaint();}
    schedulePagesRender(delay=900){clearTimeout(this.pagesTimer);this.pagesTimer=setTimeout(()=>{this.pagesTimer=null;if(this.root.isConnected)this.pages.render();},delay);}
    async flush(){clearTimeout(this.timer);if(!this.dirty)return this.saveChain;const revision=this.revision,data=copy(this.note);this.saveChain=this.saveChain.catch(()=>{}).then(()=>this.manager.store.put(data)).then(()=>{if(revision===this.revision){this.dirty=false;this.status('Salvat pe acest dispozitiv');}}).catch(error=>{this.status('Salvarea a eșuat. Păstrează editorul deschis și exportă o copie editabilă.',true);throw error;});return this.saveChain;}
    async close(){this.endText();clearTimeout(this.pagesTimer);try{await this.flush();}catch{return;}this.toolbar.destroy();this.abort.abort();this.resize.disconnect();cancelAnimationFrame(this.frame);this.root.remove();document.body.style.overflow=this.oldOverflow;this.manager.editor=null;await this.manager.render();document.getElementById('workspaceAddNote').focus();}
    undo(){this.endText();if(!this.past.length)return;this.future.push(copy(this.note));this.note=this.past.pop();this.pageIndex=clamp(this.note.activePage??this.pageIndex,0,this.note.pages.length-1);this.selected=null;this.changed();this.refresh();}
    redo(){this.endText();if(!this.future.length)return;this.past.push(copy(this.note));this.note=this.future.pop();this.pageIndex=clamp(this.note.activePage??this.pageIndex,0,this.note.pages.length-1);this.selected=null;this.changed();this.refresh();}
    setTool(tool){this.endText();this.tool=tool==='marker'?'pencil':tool;this.drawKind=this.tool==='pencil'?'pencil':this.drawKind;this.selected=null;this.refresh(false);}
    switchPage(i){this.endText();this.pageIndex=i;this.selected=null;this.changed();this.refresh();this.fit();}
    refresh(pages=true){this.title.textContent=this.note.title;this.pageLabel.textContent=`${this.pageIndex+1} / ${this.note.pages.length} · A4 ${this.page.orientation==='portrait'?'vertical':'orizontal'}`;const [w,h]=size(this.page);this.sheet.style.width=`${w}px`;this.sheet.style.height=`${h}px`;this.canvas.width=w*2;this.canvas.height=h*2;this.canvas.style.width=`${w}px`;this.canvas.style.height=`${h}px`;this.applyZoom();this.toolbar.render();this.selection.render();if(pages)this.pages.render();this.requestPaint();}
    requestPaint(){if(this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=null;if(!this.root.isConnected)return;const ctx=this.canvas.getContext('2d');ctx.setTransform(2,0,0,2,0,0);A4Canvas.paint(ctx,this.page,this.images,this.textEditor?this.selected:null);if(this.preview){if(this.preview.type==='drawing'){ctx.save();ctx.globalAlpha=this.preview.opacity;DrawingLayer.paint(ctx,this.preview);ctx.restore();}else A4Canvas.object(ctx,this.preview,this.images);}for(const o of this.page.objects){if(o.type==='image'&&!this.images.has(o.src)){this.images.set(o.src,null);ImageObject.load(o.src).then(img=>{this.images.set(o.src,img);this.requestPaint();}).catch(error=>this.status(error.message,true));}}});}
    paintLiveSegment(a,b,drawing){const ctx=this.canvas.getContext('2d');ctx.save();ctx.setTransform(2,0,0,2,0,0);ctx.globalAlpha=drawing.opacity;ctx.strokeStyle=drawing.color;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=drawing.width*(drawing.pressure?(.35+.65*((a.p+b.p)/2)):1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();}
    applyZoom(){const [w,h]=size(this.page);this.sheet.style.transform=`scale(${this.zoom})`;this.sheet.style.setProperty('--an-handle',`${20/this.zoom}px`);this.sheet.style.setProperty('--an-zoom',String(this.zoom));this.space.style.width=`${w*this.zoom}px`;this.space.style.height=`${h*this.zoom}px`;this.zoomLabel.textContent=`${Math.round(this.zoom*100)}%`;}
    fit(){if(this.board.clientWidth<20)return;this.autoFit=true;const [w,h]=size(this.page);this.zoom=clamp(Math.min((this.board.clientWidth-48)/w,(this.board.clientHeight-48)/h),.15,2);this.applyZoom();}
    setZoom(z){this.autoFit=false;this.zoom=clamp(z,.15,4);this.applyZoom();}
    zoomAt(z,x,y){const rect=this.sheet.getBoundingClientRect(),old=this.zoom,px=(x-rect.left)/old,py=(y-rect.top)/old;this.setZoom(z);const next=this.sheet.getBoundingClientRect();this.board.scrollLeft+=next.left+px*this.zoom-x;this.board.scrollTop+=next.top+py*this.zoom-y;}
    point(event){const rect=this.sheet.getBoundingClientRect();return {x:(event.clientX-rect.left)/this.zoom,y:(event.clientY-rect.top)/this.zoom,p:event.pointerType==='pen'?clamp(event.pressure||.5,.05,1):.7};}
    local(o,p){const a=-o.rotation*Math.PI/180,dx=p.x-o.x-o.w/2,dy=p.y-o.y-o.h/2;return {x:dx*Math.cos(a)-dy*Math.sin(a)+o.w/2,y:dx*Math.sin(a)+dy*Math.cos(a)+o.h/2};}
    hit(p){return [...this.page.objects].reverse().find(o=>{const q=this.local(o,p);return q.x>=-4&&q.y>=-4&&q.x<=o.w+4&&q.y<=o.h+4;});}
    down(event,pan=false){
      if(event.button>0||event.isPrimary===false&&event.pointerType!=='touch')return;
      if(this.gesture?.pen&&event.pointerType==='touch')return;
      event.preventDefault();this.endText();this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});event.target.setPointerCapture(event.pointerId);
      if(this.pointers.size===2){this.preview=null;if(this.gesture?.before&&this.gesture?.o)Object.assign(this.gesture.o,this.gesture.before);const a=[...this.pointers.values()];this.gesture={kind:'pinch',distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),zoom:this.zoom,cx:(a[0].x+a[1].x)/2,cy:(a[0].y+a[1].y)/2};this.requestPaint();return;}
      const p=this.point(event);this.gesture={kind:'tap',start:p,clientX:event.clientX,clientY:event.clientY,id:event.pointerId,pen:event.pointerType==='pen',moved:false};
      if(pan||this.tool==='pan'){Object.assign(this.gesture,{kind:'pan',scrollX:this.board.scrollLeft,scrollY:this.board.scrollTop});return;}
      if(this.tool==='select'){const o=this.hit(p);this.selected=o?.id||null;this.toolbar.renderContext();this.selection.render();if(o&&!o.locked)Object.assign(this.gesture,{kind:'move',o,before:copy(o)});return;}
      if(this.tool==='text'){this.gesture.kind='text';return;}
      if(this.tool==='shape'){this.gesture.kind='shape';this.preview={id:uid(),type:'shape',shape:this.shapeKind,x:p.x,y:p.y,w:1,h:1,rotation:0,opacity:.86,locked:false,color:this.drawColor,fill:'transparent',width:this.drawWidth};this.requestPaint();return;}
      if(this.tool==='pencil'){clearTimeout(this.timer);if(this.drawKind==='eraser'){this.snapshot();this.gesture.kind='erase';this.erase(p);return;}this.gesture.kind='draw';this.preview={id:uid(),type:'drawing',kind:this.drawKind,x:0,y:0,w:1,h:1,rotation:0,locked:false,opacity:this.drawKind==='highlighter'?.25:this.drawKind==='marker'?.65:1,color:this.drawColor,width:this.drawKind==='highlighter'?this.highlighterWidth:this.drawWidth,pressure:this.drawKind==='pencil',points:[p]};this.requestPaint();}
    }
    beginTransform(event,handle){const o=this.object;if(!o||o.locked)return;event.preventDefault();event.stopPropagation();event.target.setPointerCapture(event.pointerId);this.gesture={kind:handle==='rotate'?'rotate':'resize',handle,id:event.pointerId,start:this.point(event),before:copy(o),o,moved:false};}
    move(event){
      if(this.pointers.has(event.pointerId))this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const g=this.gesture;if(!g)return;
      if(g.kind==='pinch'){if(this.pointers.size<2)return;event.preventDefault();const a=[...this.pointers.values()],cx=(a[0].x+a[1].x)/2,cy=(a[0].y+a[1].y)/2;this.zoomAt(g.zoom*Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/Math.max(1,g.distance),g.cx,g.cy);this.board.scrollLeft-=cx-g.cx;this.board.scrollTop-=cy-g.cy;g.cx=cx;g.cy=cy;return;}
      if(g.id!==event.pointerId)return;event.preventDefault();const p=this.point(event),dx=p.x-g.start.x,dy=p.y-g.start.y;
      if(!g.moved&&Math.hypot(dx,dy)*this.zoom>4){g.moved=true;if(['move','resize','rotate'].includes(g.kind))this.snapshot();}
      if(g.kind==='pan'){this.board.scrollLeft=g.scrollX-(event.clientX-g.clientX);this.board.scrollTop=g.scrollY-(event.clientY-g.clientY);return;}
      if(g.kind==='erase'){this.erase(p);return;}
      if(g.kind==='draw'){const batch=event.getCoalescedEvents?.()||[event],minimum=this.preview.pressure ? .9 : 1.2;let changed=false;for(const item of batch.length?batch:[event]){const q=this.point(item),last=this.preview.points.at(-1);if(Math.hypot(q.x-last.x,q.y-last.y)>minimum){changed=true;if(['line','dashed'].includes(this.preview.kind))this.preview.points=[this.preview.points[0],q];else {this.preview.points.push(q);if(this.preview.kind==='highlighter')this.requestPaint();else this.paintLiveSegment(last,q,this.preview);}}}if(changed&&['line','dashed'].includes(this.preview.kind))this.requestPaint();return;}
      if(g.kind==='shape'&&this.preview){this.preview.x=Math.min(g.start.x,p.x);this.preview.y=Math.min(g.start.y,p.y);this.preview.w=Math.max(2,Math.abs(p.x-g.start.x));this.preview.h=Math.max(2,Math.abs(p.y-g.start.y));this.requestPaint();return;}
      if(g.moved&&g.o){const o=g.o,b=g.before,[w,h]=size(this.page);if(g.kind==='move'){o.x=clamp(b.x+dx,-o.w+20,w-20);o.y=clamp(b.y+dy,-o.h+20,h-20);}else if(g.kind==='rotate'){const cx=b.x+b.w/2,cy=b.y+b.h/2;o.rotation=b.rotation+(Math.atan2(p.y-cy,p.x-cx)-Math.atan2(g.start.y-cy,g.start.x-cx))*180/Math.PI;}else if(g.kind==='resize'){const a=b.rotation*Math.PI/180,lx=dx*Math.cos(a)+dy*Math.sin(a),ly=-dx*Math.sin(a)+dy*Math.cos(a),left=g.handle.includes('w'),top=g.handle.includes('n');let nw=Math.max(24,b.w+(left?-lx:lx)),nh=Math.max(24,b.h+(top?-ly:ly));if(o.type==='image'){const scale=Math.max(nw/b.w,nh/b.h);nw=b.w*scale;nh=b.h*scale;}const cx=(left?-1:1)*(nw-b.w)/2,cy=(top?-1:1)*(nh-b.h)/2;o.x=b.x+(b.w-nw)/2+cx*Math.cos(a)-cy*Math.sin(a);o.y=b.y+(b.h-nh)/2+cx*Math.sin(a)+cy*Math.cos(a);o.w=nw;o.h=nh;}this.selection.render();this.requestPaint();}
    }
    up(event,cancel=false){
      this.pointers.delete(event.pointerId);const g=this.gesture;if(!g)return;if(g.kind==='pinch'){if(!this.pointers.size)this.gesture=null;return;}if(g.id!==event.pointerId)return;this.gesture=null;
      if(cancel){if(g.before&&g.o)Object.assign(g.o,g.before);this.preview=null;this.requestPaint();this.selection.render();return;}
      if(g.kind==='draw'&&this.preview){event.preventDefault();this.suppressClickUntil=performance.now()+450;this.snapshot();this.page.objects.push(DrawingLayer.normalize(this.preview));this.preview=null;this.changed(800);this.schedulePagesRender();}
      else if(g.kind==='text'){this.snapshot();const [w,h]=size(this.page),o=Object.assign(TextObject.create(clamp(g.start.x,0,w-200),clamp(g.start.y,0,h-100)),copy(this.textStyle),{id:uid(),x:clamp(g.start.x,0,w-200),y:clamp(g.start.y,0,h-100),text:''});this.page.objects.push(o);this.selected=o.id;this.tool='select';this.changed();this.editText(o,false);}
      else if(g.kind==='shape'&&this.preview){this.snapshot();const o={...this.preview,id:uid(),w:Math.max(30,this.preview.w),h:Math.max(30,this.preview.h),opacity:1};this.preview=null;this.page.objects.push(o);this.selected=o.id;this.changed();this.pages.render();}
      else if(g.o&&g.moved||g.kind==='erase'){this.changed();this.pages.render();}
      else if(g.o?.type==='text'&&!g.o.locked){this.editText(g.o);return;}
      this.toolbar.render();this.selection.render();this.requestPaint();
    }
    erase(p){
      const previous=this.gesture.lastErase||p;this.gesture.lastErase=p;
      this.page.objects=this.page.objects.flatMap(o=>{
        if(o.type!=='drawing'||o.locked)return [o];
        const a=this.local(o,previous),b=this.local(o,p),radius=this.eraserWidth/2+o.width/2;
        const sx=o.w/(o.baseW||o.w||1),sy=o.h/(o.baseH||o.h||1),dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
        const hit=q=>{const x=q.x*sx,y=q.y*sy,t=length?clamp(((x-a.x)*dx+(y-a.y)*dy)/length,0,1):0;return Math.hypot(x-a.x-t*dx,y-a.y-t*dy)<=radius;};
        const runs=[];let run=[],removed=false;
        const visit=q=>{if(hit(q)){removed=true;if(run.length)runs.push(run);run=[];}else run.push(q);};
        visit(o.points[0]);
        for(let i=1;i<o.points.length;i++){const u=o.points[i-1],v=o.points[i],steps=Math.max(1,Math.ceil(Math.hypot((v.x-u.x)*sx,(v.y-u.y)*sy)/2));for(let j=1;j<=steps;j++){const t=j/steps;visit({x:u.x+(v.x-u.x)*t,y:u.y+(v.y-u.y)*t,p:(u.p??.7)+((v.p??.7)-(u.p??.7))*t});}}
        if(!removed)return [o];if(run.length)runs.push(run);
        return runs.map(points=>({...o,id:uid(),points}));
      });this.requestPaint();
    }
    editText(o,checkpoint=true){if(o.locked)return;this.endText();if(checkpoint)this.snapshot();this.selected=o.id;this.tool='select';const t=el('textarea','an-text-editor');t.value=o.text;t.setAttribute('aria-label','Textul casetei');Object.assign(t.style,{left:`${o.x}px`,top:`${o.y}px`,width:`${o.w}px`,height:`${o.h}px`,transform:`rotate(${o.rotation}deg)`,fontFamily:o.font,fontSize:`${o.fontSize}px`,fontWeight:o.bold?'700':'400',fontStyle:o.italic?'italic':'normal',textDecoration:o.underline?'underline':'none',color:o.color,textAlign:o.align,lineHeight:'1.35'});const fit=()=>{const [pageWidth]=size(this.page);TextObject.fit(o,Math.max(42,pageWidth-o.x-8));t.style.width=`${o.w}px`;t.style.height=`${o.h}px`;};t.addEventListener('pointerdown',event=>event.stopPropagation());t.addEventListener('input',()=>{o.text=t.value;fit();this.changed();});t.addEventListener('blur',()=>this.endText());this.textEditor=t;this.sheet.append(t);fit();this.selection.render();this.toolbar.render();this.requestPaint();t.focus({preventScroll:true});}
    endText(){if(!this.textEditor)return;const t=this.textEditor;this.textEditor=null;t.remove();this.selection.render();this.requestPaint();this.pages.render();}
    changeObject(patch,allowLocked=false){const o=this.object;if(!o||o.locked&&!allowLocked)return;this.endText();this.snapshot();Object.assign(o,patch);this.changed();this.toolbar.render();this.selection.render();this.pages.render();}
    duplicate(){const o=this.object;if(!o)return;this.endText();this.snapshot();const n=copy(o);n.id=uid();n.x+=18;n.y+=18;n.locked=false;this.page.objects.push(n);this.selected=n.id;this.changed();this.toolbar.render();this.selection.render();this.pages.render();}
    removeObject(){const o=this.object;if(!o||o.locked)return;this.edit(()=>{this.page.objects=this.page.objects.filter(n=>n.id!==o.id);});}
    order(direction){const o=this.object;if(!o||o.locked)return;this.snapshot();this.page.objects=this.page.objects.filter(n=>n!==o);if(direction>0)this.page.objects.push(o);else this.page.objects.unshift(o);this.changed();this.pages.render();}
    chooseImage(replaceId){const picker=input('','file');picker.accept='image/*';picker.className='an-file-input';picker.tabIndex=-1;document.body.append(picker);const cleanup=()=>picker.remove();picker.addEventListener('cancel',cleanup,{once:true});picker.addEventListener('change',async()=>{try{if(!picker.files[0])return;this.status('Se pregătește imaginea…');const o=await ImageObject.fromFile(picker.files[0]);this.endText();this.snapshot();const previous=this.page.objects.find(n=>n.id===replaceId);if(previous){previous.src=o.src;previous.crop=o.crop;previous.h=previous.w*o.h/o.w;this.selected=previous.id;}else{const [w,h]=size(this.page);if(o.h>h-120){o.w*= (h-120)/o.h;o.h=h-120;}o.x=(w-o.w)/2;o.y=60;this.page.objects.push(o);this.selected=o.id;}this.tool='select';this.changed();this.refresh();}catch(error){this.status(error.message,true);}finally{cleanup();}},{once:true});picker.click();}
    cropImage(o){const content=el('div','an-crop'),preview=el('img');preview.src=o.src;preview.alt='Previzualizare decupare';content.append(preview);const c=o.crop,controls={};for(const [key,name,value] of [['left','Stânga',c.x*100],['top','Sus',c.y*100],['right','Dreapta',(1-c.x-c.w)*100],['bottom','Jos',(1-c.y-c.h)*100]]){const range=input(Math.round(value),'range');range.min=0;range.max=90;controls[key]=range;content.append(field(name,range));range.addEventListener('input',()=>{preview.style.clipPath=`inset(${controls.top.value}% ${controls.right.value}% ${controls.bottom.value}% ${controls.left.value}%)`;});}dialog('Decupează imaginea',content,()=>{const left=Number(controls.left.value)/100,right=Number(controls.right.value)/100,top=Number(controls.top.value)/100,bottom=Number(controls.bottom.value)/100;if(left+right>.95||top+bottom>.95)throw Error('Păstrează cel puțin 5% din lățime și înălțime.');this.changeObject({crop:{x:left,y:top,w:1-left-right,h:1-top-bottom},h:o.h*((1-top-bottom)/c.h)/((1-left-right)/c.w)});},'Aplică decuparea');}
    key(event){if(event.target.closest('input,textarea,select,[contenteditable]'))return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?this.redo():this.undo();}else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();this.redo();}else if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();this.removeObject();}else if(event.key==='Escape'){this.selected=null;this.toolbar.renderContext();this.selection.render();}}
    exportMenu(){this.endText();const content=el('div','an-export-options');const d=el('dialog','an-dialog');d.append(el('h2','','Exportă notița'),content,button('Închide',()=>d.close(),'close'));d.addEventListener('close',()=>d.remove());document.body.append(d);for(const [name,action] of [
      ['PDF · toate paginile',async()=>download(await Export.pdf(this.note),filename(this.note.title)+'.pdf')],
      ['PNG · pagina curentă',async()=>download(await Export.png(this.page),filename(this.note.title)+`-${this.pageIndex+1}.png`)],
      ['PNG · toate paginile (ZIP)',async()=>download(await Export.zip(this.note),filename(this.note.title)+'.zip')],
      ['Copie editabilă',async()=>download(new Blob([JSON.stringify(this.note)],{type:'application/json'}),filename(this.note.title)+'.anote.json')],
      ['Print A4',async()=>Export.print(this.note)]]){const b=button(name,async()=>{b.disabled=true;this.status('Se pregătește exportul…');try{let saved=true;try{await this.flush();}catch{saved=false;}await action();this.status(saved?'Export pregătit.':'Export pregătit. Salvarea locală trebuie reîncercată.',!saved);}catch(error){this.status(error.message,true);}finally{b.disabled=false;}},'export');content.append(b);}d.showModal();}
  }

  class NotesManager {
    constructor(){this.store=new NotesStore();this.panel=document.getElementById('workspaceNotes');this.list=document.getElementById('workspaceNotesList');this.status=document.getElementById('workspaceNotesStatus');this.add=document.getElementById('workspaceAddNote');this.query='';this.syncing=false;this.syncError='';this.ready=this.init();}
    async init(){
      this.add.disabled=true;
      const search=el('div','an-search-row'),q=input();q.type='search';q.placeholder='Caută în titlu, descriere sau conținut';q.setAttribute('aria-label','Caută notițe');q.addEventListener('input',()=>{this.query=q.value.toLocaleLowerCase('ro-RO');this.render();});search.append(q,button('Importă copie',()=>this.import(),'export'));this.panel.insertBefore(search,this.list);
      const show=visible=>{document.querySelector('#projectManagerView > .project-manager-content').hidden=visible;this.panel.hidden=!visible;document.getElementById(visible?'workspaceNotesNav':'workspaceProjectsNav').setAttribute('aria-current','page');document.getElementById(visible?'workspaceProjectsNav':'workspaceNotesNav').removeAttribute('aria-current');document.title=(visible?'Notițe':'Proiectele mele')+' | La-Tâmplar';if(visible)this.render();else window.dispatchEvent(new CustomEvent('atelier-notes-inactive'));};
      document.getElementById('workspaceNotesNav').addEventListener('click',()=>show(true));document.getElementById('workspaceProjectsNav').addEventListener('click',()=>show(false));for(const id of ['pmNewProject','pmImportProject','backToProjects'])document.getElementById(id).addEventListener('click',()=>show(false));
      this.add.addEventListener('click',()=>this.details(null,async note=>{await this.store.put(note);await this.render();this.open(note);}));
      window.addEventListener('atelier-notes-local-change',()=>this.syncSoon());window.addEventListener('atelier-notes-cloud-change',()=>this.syncSoon(80));window.addEventListener('online',()=>this.syncSoon(80));document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.syncSoon(80);});
      try{await this.store.open();this.add.disabled=false;await this.render();this.syncSoon(120);}catch(error){this.status.textContent=`${error.message} Originalele nu au fost șterse.`;this.status.classList.add('an-error');}
    }
    cloud(){return window.atelierNotesCloud;}
    connected(){return Boolean(this.cloud()?.connected?.());}
    syncSoon(delay=650){clearTimeout(this.syncTimer);const idleDelay=this.editor?.root?.isConnected?Math.max(delay,3200):delay;this.syncTimer=setTimeout(()=>this.sync().catch(()=>{}),idleDelay);}
    async sync(){
      if(this.editor?.gesture?.kind==='draw'){this.syncSoon(3200);return false;}if(this.syncing||!this.store.db||!this.connected())return false;this.syncing=true;if(!this.editor)this.status.textContent='Notițele se sincronizează…';
      try{
        const cloud=this.cloud(),pending=await this.store.pending();
        for(const [id,deletedAt] of Object.entries(pending.deletes)){await cloud.remove(id,deletedAt);await this.store.clearPendingDelete(id,deletedAt);}
        for(const note of Object.values(pending.notes)){await cloud.save(note);await this.store.clearPendingNote(note.id,note.updatedAt);}
        const remote=await cloud.pull(),local=await this.store.all(),localMap=new Map(local.map(note=>[note.id,note]));
        for(const [id,deletedAt] of Object.entries(remote.tombstones||{})){const note=localMap.get(id);if(note&&(Date.parse(deletedAt)||0)>=(Date.parse(note.updatedAt)||0)){await this.store.remove(id,{sync:false});localMap.delete(id);}}
        for(const note of remote.notes||[]){const localNote=localMap.get(note.id);if(!localNote||(Date.parse(note.updatedAt)||0)>(Date.parse(localNote.updatedAt)||0)){await this.store.put(note,{sync:false});localMap.set(note.id,note);if(this.editor?.note.id===note.id&&!this.editor.dirty){this.editor.note=copy(note);this.editor.pageIndex=clamp(note.activePage||0,0,note.pages.length-1);this.editor.refresh();}}}
        for(const note of localMap.values()){const remoteNote=(remote.notes||[]).find(item=>item.id===note.id),deletedAt=Date.parse(remote.tombstones?.[note.id]||'')||0;if(deletedAt>(Date.parse(note.updatedAt)||0))continue;if(!remoteNote||(Date.parse(note.updatedAt)||0)>(Date.parse(remoteNote.updatedAt)||0))await cloud.save(note);}
        this.syncError='';if(this.editor&&!this.editor.dirty)this.editor.status('Salvat și sincronizat');
        return true;
      }catch(error){this.syncError='Notițele sunt salvate local. Sincronizarea va reîncerca automat.';if(this.editor)this.editor.status('Salvat local · sincronizarea va reîncerca.',true);throw error;}
      finally{this.syncing=false;if(!this.editor)await this.render();}
    }
    async projects(){return new Promise(resolve=>{let request;try{request=indexedDB.open('fisa-atelier-offline');}catch{resolve([]);return;}request.onerror=()=>resolve([]);request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains('projects')){db.close();resolve([]);return;}const transaction=db.transaction('projects','readonly'),read=transaction.objectStore('projects').getAll();read.onerror=()=>{db.close();resolve([]);};read.onsuccess=()=>{const projects=(read.result||[]).map(project=>({id:project.id,name:project.name||project.payload?.projectName||'Proiect fără nume'})).filter(project=>project.id).sort((a,b)=>a.name.localeCompare(b.name,'ro'));db.close();resolve(projects);};};});}
    async details(note,save,linkedProject=null){const projects=await this.projects(),content=el('div','an-form-grid'),title=input(note?.title||'');title.required=true;title.maxLength=160;title.placeholder='De exemplu: Măsurători bucătărie';const projectChoices=[['','Fără proiect asociat'],...projects.map(project=>[project.id,project.name])],project=select(projectChoices,note?.projectId||'');content.append(field('Titlu notiță',title));if(!linkedProject)content.append(field('Proiect asociat (opțional)',project));let template;if(!note){template=this.pageTemplates();content.append(template.node);}else content.append(el('p','an-hint',`Creată ${date(note.createdAt)} · Modificată ${date(note.updatedAt)}`));dialog(note?'Detaliile notiței':'Notiță nouă',content,async()=>{if(!title.value.trim())throw Error('Introdu un titlu.');const selectedProject=linkedProject||projects.find(item=>item.id===project.value);const relation={projectId:selectedProject?.id||'',projectName:selectedProject?.name||''};const next=note?{title:title.value.trim(),...relation}:{id:uid(),schema:1,title:title.value.trim(),description:'',...relation,createdAt:now(),updatedAt:now(),pages:[pageData(template.value.orientation,template.value.paper)]};await save(next);},note?'Salvează':'Creează');}
    async createForProject(project){if(!project?.id)return;await this.ready;const linkedProject={id:project.id,name:project.name||'Proiect fără nume'};await this.details(null,async note=>{await this.store.put(note);await this.render();this.open(note);},linkedProject);}
    pageTemplates(headingText='Prima foaie'){const node=el('section','an-template-picker'),heading=el('span','an-template-heading',headingText),choices=el('div','an-template-choices');let value={orientation:'portrait',paper:'blank'};const templates=[['portrait','blank','A4 vertical','Albă'],['portrait','grid','A4 vertical','Cu pătrățele'],['portrait','ruled','A4 vertical','Cu linii'],['landscape','blank','A4 orizontal','Albă'],['landscape','grid','A4 orizontal','Cu pătrățele'],['landscape','ruled','A4 orizontal','Cu linii']];for(const [orientation,paper,format,label] of templates){const item=button(`${format} · ${label}`,()=>{value={orientation,paper};for(const choice of choices.children)choice.setAttribute('aria-pressed','false');item.setAttribute('aria-pressed','true');},paper==='grid'?'shape':paper==='ruled'?'text':'image','an-template-choice');item.dataset.orientation=orientation;item.dataset.paper=paper;item.setAttribute('aria-pressed',String(orientation==='portrait'&&paper==='blank'));const sheet=el('span',`an-template-sheet an-${orientation} an-${paper}`);const copy=el('span','an-template-copy');copy.append(el('strong','',format),el('small','',label));item.replaceChildren(sheet,copy);choices.append(item);}node.append(heading,choices);return {node,get value(){return value;}};}
    async render(){if(!this.store.db)return;const token=this.renderToken=uid();const notes=await this.store.all();if(token!==this.renderToken)return;this.list.replaceChildren();this.list.className='an-note-grid';notes.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));const filtered=notes.filter(n=>(n.title+' '+n.projectName+' '+n.pages.flatMap(p=>p.objects.map(o=>o.text||'')).join(' ')).toLocaleLowerCase('ro-RO').includes(this.query));this.status.classList.toggle('an-error',Boolean(this.syncError));this.status.textContent=this.syncError||`${notes.length} notițe · ${this.syncing?'Se sincronizează…':this.connected()?'Sincronizare activă între dispozitive':'Salvare locală · conectează același cont pe PC și tabletă'}`;
      if(!filtered.length)this.list.append(el('p','an-empty',notes.length?'Nu există rezultate pentru această căutare.':'Prima ta notiță începe cu o foaie A4. Adaugă text, schițe și fotografii.'));
      for(const note of filtered){const card=el('article','an-note-card'),open=button(note.title,()=>this.open(note));open.classList.add('an-note-open');open.removeAttribute('title');const preview=el('canvas');preview.width=250;preview.height=160;open.prepend(preview);const pageCount=`${note.pages.length} ${note.pages.length===1?'pagină':'pagini'}`,relation=note.projectName?el('span','an-note-project',note.projectName):null,dateLine=el('p','an-note-date',`Ultima modificare: ${date(note.updatedAt)}`),stats=el('div','an-note-card-stats'),pageStat=el('span','',pageCount),projectStat=el('span','',note.projectName?'Proiect asociat':'Fără proiect asociat');stats.append(pageStat,projectStat);const actions=el('details','an-note-card-menu'),summary=el('summary','','⋯'),menu=el('div','an-note-card-menu-items');summary.setAttribute('aria-label','Acțiuni notiță');menu.append(button('Editează',()=>this.details(note,async patch=>{Object.assign(note,patch,{updatedAt:now()});await this.store.put(note);await this.render();}),'edit'),button('Duplică',async()=>{try{const n=copy(note);n.id=uid();n.title+=' — copie';n.createdAt=n.updatedAt=now();n.pages.forEach(p=>{p.id=uid();p.objects.forEach(o=>o.id=uid());});await this.store.put(n);await this.render();}catch(error){this.status.textContent=error.message;}},'copy'),button('Șterge',()=>dialog('Ștergi această notiță?',el('p','',`„${note.title}” va fi ștearsă de pe acest dispozitiv. Exportă înainte o copie dacă vrei să o păstrezi.`),async()=>{await this.store.remove(note.id);await this.render();},'Șterge'),'trash','an-danger'));actions.append(summary,menu);
        card.append(open,dateLine,...(relation?[relation]:[]),stats,actions);this.list.append(card);
        A4Canvas.render(note.pages[0],.35).then(c=>{if(!card.isConnected)return;const ctx=preview.getContext('2d');ctx.fillStyle='#edf1f4';ctx.fillRect(0,0,250,160);const scale=Math.min(230/c.width,145/c.height);ctx.drawImage(c,(250-c.width*scale)/2,8,c.width*scale,c.height*scale);}).catch(()=>{});
      }
    }
    open(note){if(this.editor)return;this.editor=new NoteEditor(this,note);}
    import(){const picker=input('','file');picker.accept='.json,.anote.json';picker.className='an-file-input';picker.tabIndex=-1;document.body.append(picker);const cleanup=()=>picker.remove();picker.addEventListener('cancel',cleanup,{once:true});picker.addEventListener('change',async()=>{try{if(!picker.files[0])return;const n=JSON.parse(await picker.files[0].text());if(n.schema!==1||typeof n.title!=='string'||!Array.isArray(n.pages)||!n.pages.length||n.pages.length>200)throw Error('Copia nu are un format de notiță A4 valid.');for(const p of n.pages){if(!['portrait','landscape'].includes(p.orientation)||!['blank','ruled','grid'].includes(p.paper)||!Array.isArray(p.objects))throw Error('Pagină invalidă.');p.id=uid();for(const o of p.objects){if(!['text','image','drawing','shape'].includes(o.type)||!['x','y','w','h','rotation','opacity'].every(k=>Number.isFinite(o[k]))||o.w<=0||o.h<=0)throw Error('Obiect invalid.');if(o.type==='image'&&(!/^data:image\/(png|jpeg|webp);base64,/.test(o.src)||!o.crop))throw Error('Imagine invalidă.');if(o.type==='text'&&(typeof o.text!=='string'||!Number.isFinite(o.fontSize)))throw Error('Text invalid.');if(o.type==='drawing'&&(!Array.isArray(o.points)||!o.points.length||o.points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))))throw Error('Desen invalid.');o.id=uid();}}n.id=uid();n.description=typeof n.description==='string'?n.description:'';n.projectId=typeof n.projectId==='string'?n.projectId:'';n.projectName=typeof n.projectName==='string'?n.projectName:'';n.createdAt=n.updatedAt=now();await this.store.put(n);await this.render();}catch(error){this.status.textContent=`Import nereușit: ${error.message}`;}finally{cleanup();}},{once:true});picker.click();}
  }
  const manager=new NotesManager();
  window.atelierNotes={ready:manager.ready,flush:()=>manager.editor?.flush()||Promise.resolve(),sync:()=>manager.ready.then(()=>manager.sync()),manager,Export,A4Canvas};
})();
