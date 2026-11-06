// Accesso a Dropbox direttamente dal browser, senza server.
// - Login con OAuth 2 + PKCE (nessun segreto nel codice).
// - Solo chiamate di lettura.
// Documentazione: https://docs.dropboxapi.com/dropbox-api/docs/oauth

import { CONFIG } from './config';

const API = 'https://api.dropboxapi.com';
const CONTENT = 'https://content.dropboxapi.com';
const K_TOKEN = 'gi.token';
const K_VERIFIER = 'gi.pkce';
const K_ROOT = 'gi.root';

interface Token {
  access_token: string;
  refresh_token?: string;
  /** Istante (ms) in cui il token scade. */
  scade: number;
}

// ---------- utilità ----------

function leggi<T>(k: string): T | null {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function scrivi(k: string, v: unknown): void {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* memoria non disponibile (navigazione privata): si va avanti lo stesso */
  }
}
function cancella(k: string): void {
  try {
    localStorage.removeItem(k);
  } catch {
    /* ignora */
  }
}

function base64url(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Indirizzo a cui Dropbox rimanda dopo il login: la pagina stessa, senza parametri. */
export function redirectUri(): string {
  return location.origin + location.pathname.replace(/index\.html$/, '');
}

/** L'header Dropbox-API-Arg accetta solo ASCII: i caratteri accentati vanno scritti come \uXXXX. */
function argHeader(obj: unknown): string {
  return JSON.stringify(obj).replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

// ---------- login ----------

export async function avviaLogin(): Promise<void> {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64url(new Uint8Array(hash));
  scrivi(K_VERIFIER, verifier);

  const p = new URLSearchParams({
    client_id: CONFIG.dropboxAppKey,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: redirectUri(),
    // "offline" = Dropbox rilascia un refresh token, così non serve rifare il login ogni poche ore.
    token_access_type: 'offline',
    scope: CONFIG.scopes.join(' '),
  });
  location.assign('https://www.dropbox.com/oauth2/authorize?' + p.toString());
}

/** Se l'URL contiene ?code=..., completa il login. Restituisce un messaggio d'errore o null. */
export async function completaLoginSePresente(): Promise<string | null> {
  const q = new URLSearchParams(location.search);
  const errore = q.get('error_description') || q.get('error');
  const code = q.get('code');
  if (!code && !errore) return null;
  history.replaceState(null, '', redirectUri());
  if (errore || !code) return 'Accesso a Dropbox non completato: ' + errore;

  const verifier = leggi<string>(K_VERIFIER);
  cancella(K_VERIFIER);
  if (!verifier) return 'Il login è iniziato in un\'altra finestra. Riprova da qui.';

  const r = await fetch(API + '/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      code_verifier: verifier,
      client_id: CONFIG.dropboxAppKey,
      redirect_uri: redirectUri(),
    }),
  });
  if (!r.ok) return 'Dropbox ha rifiutato il login (' + r.status + '): ' + (await r.text());
  salvaToken(await r.json());
  return null;
}

function salvaToken(j: { access_token: string; refresh_token?: string; expires_in: number }): void {
  const vecchio = leggi<Token>(K_TOKEN);
  scrivi(K_TOKEN, {
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? vecchio?.refresh_token,
    scade: Date.now() + (j.expires_in - 60) * 1000,
  } satisfies Token);
}

/** Dimentica dove si trova la cartella condivisa (es. se è stata spostata): verrà ricercata. */
export function dimenticaCartella(): void {
  cancella(K_ROOT);
}

export function collegato(): boolean {
  return leggi<Token>(K_TOKEN) !== null;
}

export function esci(): void {
  cancella(K_TOKEN);
  cancella(K_ROOT);
}

async function accessToken(): Promise<string> {
  const t = leggi<Token>(K_TOKEN);
  if (!t) throw new ErroreDropbox('non_collegato', 'Non sei collegato a Dropbox.');
  if (Date.now() < t.scade) return t.access_token;
  if (!t.refresh_token) throw new ErroreDropbox('non_collegato', 'Sessione scaduta: accedi di nuovo.');
  const r = await fetch(API + '/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: t.refresh_token,
      client_id: CONFIG.dropboxAppKey,
    }),
  });
  if (r.status === 400 || r.status === 401) {
    esci();
    throw new ErroreDropbox('non_collegato', 'Accesso revocato o scaduto: accedi di nuovo.');
  }
  if (!r.ok) throw new ErroreDropbox('rete', 'Rinnovo dell\'accesso non riuscito (' + r.status + ').');
  salvaToken(await r.json());
  return leggi<Token>(K_TOKEN)!.access_token;
}

// ---------- chiamate API ----------

export class ErroreDropbox extends Error {
  constructor(public tipo: 'non_collegato' | 'non_trovato' | 'rete' | 'altro', msg: string) {
    super(msg);
  }
}

async function rpc<T>(endpoint: string, body: unknown): Promise<T> {
  const r = await fetch(API + '/2/' + endpoint, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + (await accessToken()), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (r.status === 409) {
    const t = await r.text();
    throw new ErroreDropbox(t.includes('not_found') ? 'non_trovato' : 'altro', t);
  }
  if (r.status === 401) {
    esci();
    throw new ErroreDropbox('non_collegato', 'Accesso scaduto: accedi di nuovo.');
  }
  if (!r.ok) throw new ErroreDropbox('altro', endpoint + ': ' + r.status + ' ' + (await r.text()));
  return r.json() as Promise<T>;
}

/**
 * Trova la cartella condivisa nel Dropbox di chi sta usando l'app.
 * Di solito è "/Gestione Immobili", ma un gestore potrebbe averla spostata o non averla
 * ancora aggiunta al suo Dropbox: in quel caso lo diciamo chiaramente.
 */
export async function trovaCartellaCondivisa(): Promise<string> {
  const salvata = leggi<string>(K_ROOT);
  if (salvata) return salvata;

  // Possono esistere più cartelle con lo stesso nome (es. "Gestione Immobili" dentro un'altra
  // "Gestione Immobili"): scegliamo quella che contiene davvero il file dei dati.
  const nome = CONFIG.nomeCartellaCondivisa.toLowerCase();
  const candidate: string[] = ['/' + CONFIG.nomeCartellaCondivisa];
  let condivisaNonAggiunta: string | null = null;

  // 1) Cartelle condivise con questo utente (o condivise da lui).
  type Voce = { name: string; path_lower?: string };
  const r = await rpc<{ entries: Voce[] }>('sharing/list_folders', { limit: 100 });
  for (const v of r.entries.filter((x) => x.name.toLowerCase() === nome)) {
    if (v.path_lower) candidate.push(v.path_lower);
    else condivisaNonAggiunta = v.name;
  }

  // 2) Ricerca per nome (cartella non ancora condivisa, ovunque si trovi).
  type Trovato = { metadata: { metadata: { '.tag': string; name: string; path_display: string } } };
  const s = await rpc<{ matches: Trovato[] }>('files/search_v2', {
    query: CONFIG.nomeCartellaCondivisa,
    options: { filename_only: true, max_results: 20 },
  });
  for (const m of s.matches.map((x) => x.metadata.metadata)) {
    if (m['.tag'] === 'folder' && m.name.toLowerCase() === nome) candidate.push(m.path_display);
  }

  const visti = new Set<string>();
  for (const c of candidate) {
    if (visti.has(c.toLowerCase())) continue;
    visti.add(c.toLowerCase());
    if (await esiste(c + '/' + CONFIG.fileDati)) {
      scrivi(K_ROOT, c);
      return c;
    }
  }

  if (condivisaNonAggiunta) {
    throw new ErroreDropbox('non_trovato', `La cartella "${condivisaNonAggiunta}" è condivisa con te ma non è ancora nel tuo Dropbox. Aprila su dropbox.com e scegli "Aggiungi al mio Dropbox".`);
  }
  throw new ErroreDropbox('non_trovato', `Non trovo la cartella "${CONFIG.nomeCartellaCondivisa}" con i dati dell'app. Chiedi a chi la gestisce di condividerla con te.`);
}

async function esiste(percorso: string): Promise<boolean> {
  try {
    await rpc('files/get_metadata', { path: percorso });
    return true;
  } catch (e) {
    if (e instanceof ErroreDropbox && e.tipo === 'non_trovato') return false;
    throw e;
  }
}

/** Scarica e interpreta un file JSON. */
export async function scaricaJson<T>(percorso: string): Promise<T> {
  const r = await fetch(CONTENT + '/2/files/download', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + (await accessToken()), 'Dropbox-API-Arg': argHeader({ path: percorso }) },
  });
  if (r.status === 409) throw new ErroreDropbox('non_trovato', 'File non trovato: ' + percorso);
  if (r.status === 401) {
    esci();
    throw new ErroreDropbox('non_collegato', 'Accesso scaduto: accedi di nuovo.');
  }
  if (!r.ok) throw new ErroreDropbox('altro', 'Download non riuscito (' + r.status + ').');
  return JSON.parse(await r.text()) as T;
}

/** Link temporaneo (4 ore) per aprire un documento. Il file resta su Dropbox. */
export async function linkTemporaneo(percorso: string): Promise<string> {
  const r = await rpc<{ link: string }>('files/get_temporary_link', { path: percorso });
  return r.link;
}

/** Indirizzo della cartella sul sito di Dropbox, da cui si possono vedere e scaricare i file. */
export function urlCartellaWeb(percorso: string): string {
  return 'https://www.dropbox.com/home' + percorso.split('/').map(encodeURIComponent).join('/');
}

/**
 * Anteprima di un file sul sito di Dropbox: si legge nel browser senza scaricarlo,
 * e da lì si può comunque scaricare o stampare.
 */
export function urlAnteprimaWeb(percorso: string): string {
  const i = percorso.lastIndexOf('/');
  return urlCartellaWeb(percorso.slice(0, i)) + '?preview=' + encodeURIComponent(percorso.slice(i + 1));
}
