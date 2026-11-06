# Gestione immobili — vetrina

Web app in **sola lettura** per consultare l'andamento degli immobili e i documenti.

- I dati e i documenti stanno **solo su Dropbox**: questo repository contiene esclusivamente il codice dell'app.
- Accesso con l'account Dropbox di ciascuno (OAuth 2 + PKCE, nessun segreto nel codice).
- Permessi richiesti a Dropbox: solo lettura (`files.metadata.read`, `files.content.read`, `sharing.read`).
- Nessun server, nessuna statistica, nessun tracciamento.
- Funziona anche senza connessione, mostrando gli ultimi dati scaricati.

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # crea la cartella dist/
```

La pubblicazione su GitHub Pages è automatica a ogni aggiornamento del ramo `main`
(vedi `.github/workflows/pubblica.yml`).
