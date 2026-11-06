// Impostazioni del prototipo della vetrina.
// Nessuna di queste informazioni è segreta: la "App key" di Dropbox è pubblica per
// costruzione (con PKCE non esiste alcun segreto nel codice).

export const CONFIG = {
  /** App key dell'app registrata su https://www.dropbox.com/developers/apps (scheda Settings). */
  dropboxAppKey: 'ofhicfd48thcd2c',

  /** Nome della cartella condivisa. Se un gestore l'ha spostata, l'app la ritrova da sola. */
  nomeCartellaCondivisa: 'Gestione Immobili',

  /** File di dati letto dalla vetrina, relativo alla cartella condivisa. */
  fileDati: '_app/vetrina.json',

  /** Cartella dei contratti, relativa alla cartella condivisa (aperta dal riquadro Contratti). */
  cartellaContratti: '01 Contratti',

  /** Permessi minimi richiesti a Dropbox: solo lettura. */
  scopes: ['files.metadata.read', 'files.content.read', 'sharing.read'],
} as const;
