// Prototipo della vetrina (sola lettura).
// Flusso: login Dropbox -> trova la cartella condivisa -> legge _app/vetrina.json -> mostra i riquadri.
// Senza connessione mostra l'ultima copia dei dati salvata sul dispositivo.

import './style.css';
import { CONFIG } from './config';
import { datiValidi, type Azione, type DatiVetrina, type Livello } from './dati';
import { icona } from './icone';
import * as dbx from './dropbox';

const K_CACHE = 'gi.cache';
const app = document.getElementById('app')!;
const DEMO = new URLSearchParams(location.search).has('demo');

// ---------- utilità ----------

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const fmtDataOra = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const fmtData = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

function leggiCache(): DatiVetrina | null {
  try {
    const d = JSON.parse(localStorage.getItem(K_CACHE) || 'null');
    return datiValidi(d) ? d : null;
  } catch {
    return null;
  }
}
function salvaCache(d: DatiVetrina) {
  try {
    localStorage.setItem(K_CACHE, JSON.stringify(d));
  } catch {
    /* ignora */
  }
}

// ---------- schermate ----------

function schermataLogin(errore?: string) {
  const configurata = !CONFIG.dropboxAppKey.startsWith('INSERISCI');
  app.innerHTML = `
    <main class="login">
      <div class="logo">${icona('edificio')}</div>
      <h1>Gestione immobili</h1>
      <p class="sub">Accedi con il tuo account Dropbox per vedere l'andamento e i documenti.</p>
      ${errore ? `<p class="errore">${esc(errore)}</p>` : ''}
      ${
        configurata
          ? `<button class="primario" id="accedi">Accedi con Dropbox</button>`
          : `<p class="errore">Manca la App key di Dropbox in <code>src/config.ts</code>.</p>`
      }
      <a class="demo" href="?demo=1">Guarda una dimostrazione con dati di esempio</a>
      <p class="nota">L'app può solo leggere. La password la inserisci sul sito di Dropbox, non qui.</p>
    </main>`;
  document.getElementById('accedi')?.addEventListener('click', () => void dbx.avviaLogin());
}

type Stato = { tipo: 'online' } | { tipo: 'offline' } | { tipo: 'caricamento' } | { tipo: 'errore'; msg: string };

function barraStato(d: DatiVetrina | null, s: Stato): string {
  const quando = d ? fmtDataOra(d.aggiornatoIl) : '';
  switch (s.tipo) {
    case 'online':
      return `<div class="stato ok">${icona('nuvolaOk')}<span>Dati aggiornati al ${quando}</span></div>`;
    case 'caricamento':
      return `<div class="stato">${icona('nuvolaOk')}<span>Aggiornamento in corso…</span></div>`;
    case 'offline':
      return `<div class="stato off">${icona('nuvolaNo')}<span>Senza connessione: stai vedendo i dati del ${quando}</span><small>i documenti si aprono quando torna la rete</small></div>`;
    case 'errore':
      return `<div class="stato off">${icona('nuvolaNo')}<span>${esc(s.msg)}</span>${quando ? `<small>dati del ${quando}</small>` : ''}</div>`;
  }
}

const classeLivello = (l: Livello) => ({ ok: 'v', attenzione: 'g', urgente: 'r' })[l];

function dashboard(d: DatiVetrina | null, s: Stato) {
  const avvisi = d?.avvisi ?? [];
  const urgenti = avvisi.filter((a) => a.livello === 'urgente').length;

  app.innerHTML = `
    <header>
      <span class="logo-s">${icona('edificio')}</span>
      <h1>Gestione immobili</h1>
      <span class="badge">Sola lettura</span>
    </header>
    ${barraStato(d, s)}
    ${
      !d
        ? `<p class="vuoto">${s.tipo === 'caricamento' ? 'Sto leggendo i dati da Dropbox…' : 'Nessun dato disponibile.'}</p>`
        : `
    ${
      avvisi.length
        ? `<section class="avvisi">
            <h2>${icona('campanella')} Da tenere d'occhio ${urgenti ? `<span class="pill r">${urgenti} ${urgenti === 1 ? 'urgente' : 'urgenti'}</span>` : ''}</h2>
            ${avvisi
              .map(
                (a) => `<div class="avviso"><span class="punto ${classeLivello(a.livello)}"></span><span>${esc(a.testo)}</span>${
                  a.data ? `<time>${fmtData(a.data)}</time>` : ''
                }</div>`,
              )
              .join('')}
          </section>`
        : ''
    }
    <section class="griglia">
      ${d.riquadri
        .map(
          (r, i) => `
        <button class="card${r.azione ? ' link' : ''}" data-i="${i}" ${r.azione ? '' : 'aria-disabled="true"'}>
          <div class="hd">${icona(r.icona)}<span>${esc(r.titolo)}</span>${
            r.etichetta ? `<span class="pill ${classeLivello(r.etichetta.livello)}">${esc(r.etichetta.testo)}</span>` : ''
          }${r.azione ? `<span class="freccia">${icona('esterno')}</span>` : ''}</div>
          <div class="big">${esc(r.valore)}</div>
          <div class="sm">${r.righe.map(esc).join('<br>')}</div>
        </button>`,
        )
        .join('')}
    </section>
    ${d.documentoProva ? `<button class="secondario" id="doc">${icona('contratti')} Apri il documento di prova</button>` : ''}
    `
    }
    <footer>
      <span id="msg" role="status"></span>
      ${DEMO ? '<a href="./">Esci dalla dimostrazione</a>' : '<button class="link-btn" id="esci">Esci da Dropbox</button>'}
    </footer>`;

  app.querySelectorAll<HTMLButtonElement>('.card').forEach((b) =>
    b.addEventListener('click', () => {
      const r = d!.riquadri[Number(b.dataset.i)];
      if (r.azione) void apri(r.azione);
      else messaggio(`"${r.titolo}": il dettaglio arriverà nelle prossime versioni.`);
    }),
  );
  document.getElementById('doc')?.addEventListener('click', () => void apri({ tipo: 'documento', percorso: d!.documentoProva! }));
  document.getElementById('esci')?.addEventListener('click', () => {
    dbx.esci();
    schermataLogin();
  });
}

function messaggio(t: string) {
  const m = document.getElementById('msg');
  if (m) m.textContent = t;
}

/** Apre una cartella o un documento su Dropbox. I file non vengono copiati: si aprono da lì. */
async function apri(a: Azione) {
  if (DEMO) {
    messaggio(a.tipo === 'cartella' ? `Qui si aprirebbe Dropbox sulla cartella "${a.percorso}".` : `Qui si aprirebbe il documento "${a.percorso}".`);
    return;
  }
  if (!navigator.onLine) {
    messaggio('Serve la connessione per aprire i documenti.');
    return;
  }
  // Safari blocca le finestre aperte dopo un'attesa: la apriamo subito e la riempiamo dopo.
  const w = window.open('', '_blank');
  try {
    const root = await dbx.trovaCartellaCondivisa();
    const percorso = root + '/' + a.percorso;
    // I documenti si aprono nell'anteprima di Dropbox (il link "temporaneo" farebbe invece scaricare il file).
    const url = a.tipo === 'cartella' ? dbx.urlCartellaWeb(percorso) : dbx.urlAnteprimaWeb(percorso);
    if (w) w.location.href = url;
    else location.href = url;
  } catch (e) {
    w?.close();
    messaggio(e instanceof Error ? e.message : 'Impossibile aprire il documento.');
  }
}

// ---------- avvio ----------

async function aggiorna(riprova = true): Promise<void> {
  let d = leggiCache();
  dashboard(d, { tipo: 'caricamento' });
  if (!navigator.onLine) return dashboard(d, { tipo: 'offline' });
  try {
    const root = await dbx.trovaCartellaCondivisa();
    const nuovi = await dbx.scaricaJson<unknown>(root + '/' + CONFIG.fileDati);
    if (!datiValidi(nuovi)) throw new Error('Il file dei dati non è nel formato atteso.');
    d = nuovi;
    salvaCache(d);
    dashboard(d, { tipo: 'online' });
  } catch (e) {
    if (e instanceof dbx.ErroreDropbox && e.tipo === 'non_collegato') return schermataLogin(e.message);
    if (e instanceof dbx.ErroreDropbox && e.tipo === 'non_trovato' && riprova) {
      // La cartella potrebbe essere stata spostata: la ricerchiamo una volta.
      dbx.dimenticaCartella();
      return aggiorna(false);
    }
    const offline = e instanceof TypeError || !navigator.onLine; // TypeError = rete assente
    dashboard(d, offline ? { tipo: 'offline' } : { tipo: 'errore', msg: e instanceof Error ? e.message : String(e) });
  }
}

async function avvio() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  if (DEMO) {
    const r = await fetch('./demo.json');
    return dashboard(await r.json(), { tipo: 'online' });
  }
  try {
    const errore = await dbx.completaLoginSePresente();
    if (errore) return schermataLogin(errore);
  } catch {
    return schermataLogin('Login non completato: controlla la connessione e riprova.');
  }
  if (!dbx.collegato()) return schermataLogin();
  await aggiorna();
  window.addEventListener('online', () => void aggiorna());
  window.addEventListener('offline', () => dashboard(leggiCache(), { tipo: 'offline' }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void aggiorna();
  });
}

void avvio();
