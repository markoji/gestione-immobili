// Formato del file "_app/vetrina.json" scritto dall'app del gestore e letto dalla vetrina.
// Contiene SOLO ciò che gli altri gestori possono vedere: niente codici fiscali, telefoni, IBAN.

export type Livello = 'ok' | 'attenzione' | 'urgente';

export interface Avviso {
  livello: Livello;
  testo: string;
  /** Data in formato ISO (aaaa-mm-gg), facoltativa. */
  data?: string;
}

export interface Azione {
  /** "cartella" apre una cartella su dropbox.com; "documento" apre un file. */
  tipo: 'cartella' | 'documento';
  /** Percorso relativo alla cartella condivisa, es. "01 Contratti". */
  percorso: string;
}

export interface Riquadro {
  id: string;
  titolo: string;
  icona: string;
  valore: string;
  righe: string[];
  etichetta?: { testo: string; livello: Livello };
  azione?: Azione;
}

export interface DatiVetrina {
  versione: number;
  /** Istante dell'ultimo aggiornamento fatto dal gestore (ISO). */
  aggiornatoIl: string;
  avvisi: Avviso[];
  riquadri: Riquadro[];
  /** Solo per il prototipo: documento da aprire per la prova. */
  documentoProva?: string;
}

export function datiValidi(x: unknown): x is DatiVetrina {
  const d = x as DatiVetrina;
  return !!d && typeof d.versione === 'number' && Array.isArray(d.riquadri) && Array.isArray(d.avvisi);
}
