# Notițe A4 — 1.17.4

## Publicare

Înlocuiește `index.html` și `sw.js` în rădăcina site-ului și adaugă folderul
`notes` lângă ele, cu toate fișierele sale. Păstrează celelalte fișiere existente
ale site-ului (manifest, iconuri etc.). Nu încărca folderul `audit`.

Versiunile viitoare folosesc maximum `.15`; după `1.17.15` urmează `1.18.0`.

## Arhitectură

`notes-editor.js` este un modul izolat, fără importuri de rețea, împărțit în:

- NotesStore: IndexedDB, salvare tranzacțională, migrare fără ștergerea originalelor.
- NotesManager: listă, căutare, creare, detalii, duplicare, ștergere, import.
- NoteEditor: sesiune, istoric, autosave, gesturi, obiecte și coordonate.
- PageManager: pagini A4, orientare, tip de foaie, ordine și miniaturi.
- A4Canvas: randare comună pentru editor, miniaturi și export.
- TextObject / ImageObject: reprezentare și randare independentă.
- DrawingLayer: trasări cu presiune, linii, marker și highlighter.
- SelectionLayer: handles, deplasare, redimensionare și rotație.
- Toolbar: moduri principale și comenzi contextuale.
- Export: PDF A4, PNG, ZIP cu toate PNG-urile, Print și copie editabilă JSON.

PDF-ul conține pagini randate la rezoluție dublă și dimensiuni fizice A4
(595.28 × 841.89 puncte, inversate pentru orizontal). Copia `.anote.json`
păstrează toate obiectele editabile și poate fi importată în manager.

## Date și compatibilitate

Baza `atelier-a4-notes` conține câte un document per notiță. Schema 1:
`id`, `title`, `description`, `createdAt`, `updatedAt`, `activePage`, `pages`.
Fiecare pagină conține `id`, `orientation`, `paper`, `objects`.
Coordonatele sunt în spațiul A4 de 794 × 1123 (sau invers), independente de zoom.
Obiectele conțin `type`, `x`, `y`, `w`, `h`, `rotation`, `opacity`, `locked`
și date specifice: text/stil, imagine/crop, traseu/presiune sau formă.

Salvarea este locală acestui browser/dispozitiv; nu adaugă sincronizare în cloud.
Notițele generale vechi sunt importate o singură dată, iar cheia lor localStorage
originală este păstrată. Notițele interactive din proiectele cu imagini rămân separate.
Guma elimină trasări întregi; nu modifică textul sau imaginile.

Touch: un deget pentru instrumentul activ, două pentru zoom/deplasare.
În timpul unei trasări cu pen, contactele touch suplimentare sunt ignorate.
Mouse: tragere pe obiect sau handles; Ctrl/Cmd+Z și Shift+Ctrl/Cmd+Z pentru istoric.

`pdf-lib.min.js` este distribuit local sub licența MIT alăturată.

## Verificare

`node work/layout/audit/notes-a4.cjs`: test integrat în Edge cu date izolate,
inclusiv migrare, editare, presiune pen simulată, pinch touch, manipulare obiecte,
salvare/reîncărcare, PDF A4 mixt, PNG, ZIP, print, import și căutare.
`node work/layout/verify.cjs`: verificări pentru aplicația existentă.

Gesturile sunt testate prin simulare de browser; tastatura iPadOS, Apple Pencil
fizic și tipărirea pe hardware necesită verificare pe dispozitiv.
