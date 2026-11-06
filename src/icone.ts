// Icone disegnate in linea (SVG), così l'app funziona anche senza connessione.
// Tratto in stile "outline", 24x24.

const svg = (path: string) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

export const ICONE: Record<string, string> = {
  contratti: svg('<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M9 13h6M9 17h6"/>'),
  scadenze: svg('<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4M8 3v4M4 11h16"/>'),
  pagamenti: svg('<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>'),
  solare: svg('<path d="M4 16 6.5 8h11L20 16z"/><path d="M5.3 12h13.4M10 8l-1 8M14 8l1 8M12 16v4M8 20h8"/>'),
  bilancio: svg('<path d="M4 20h16"/><rect x="5" y="11" width="3" height="7"/><rect x="10.5" y="7" width="3" height="11"/><rect x="16" y="13" width="3" height="5"/>'),
  manutenzioni: svg('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>'),
  documenti: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  campanella: svg('<path d="M10 5a2 2 0 1 1 4 0 7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/>'),
  esterno: svg('<path d="M12 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/><path d="M11 13l9-9M15 4h5v5"/>'),
  nuvolaOk: svg('<path d="M7 18a4.6 4.4 0 0 1 0-9 5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7z"/><path d="m9.5 14 2 2 3.5-3.5"/>'),
  nuvolaNo: svg('<path d="M3 3l18 18"/><path d="M18 18H7a4.6 4.4 0 0 1-1.4-8.8M9 6.3A5 4.5 0 0 1 18 11h1a3.5 3.5 0 0 1 1.9 6.4"/>'),
  edificio: svg('<path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/>'),
};

export const icona = (nome: string) => ICONE[nome] ?? ICONE.documenti;
