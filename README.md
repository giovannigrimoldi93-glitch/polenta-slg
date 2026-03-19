# 🍲 Pranzo in Parrocchia – Sistema di Prenotazione

Sistema web per gestire le prenotazioni del pranzo parrocchiale con pagamento online (PayPal, Satispay) e in segreteria.

---

## 📁 Struttura del progetto

```
pranzo-parrocchia/
├── index.html                        ← Pagina pubblica di prenotazione
├── grazie.html                       ← Conferma dopo prenotazione
├── carta_intestata.jpeg              ← Logo/intestazione per ricevute
├── .well-known/
│   └── apple-developer-merchantid-domain-association  ← Verifica Apple Pay
├── admin/
│   ├── index.html                    ← Dashboard prenotazioni (protetta)
│   ├── impostazioni.html             ← Gestione menù, prezzi, posti (protetta)
│   └── satispay-setup.html          ← Setup chiavi API Satispay (una tantum)
├── css/style.css                     ← Stili condivisi
├── netlify/functions/                ← Backend serverless
│   ├── admin-login.js                ← Autenticazione admin
│   ├── get-config.js                 ← Legge configurazione evento
│   ├── save-config.js                ← Salva configurazione evento
│   ├── prenota.js                    ← Crea prenotazione
│   ├── get-prenotazioni.js           ← Lista prenotazioni (admin)
│   ├── update-booking.js             ← Aggiorna prenotazione
│   ├── delete-booking.js             ← Elimina prenotazione
│   ├── satispay-setup.js             ← Genera e registra chiavi RSA Satispay
│   ├── satispay-auth-helper.js       ← Firma richieste Satispay (modulo condiviso)
│   ├── create-satispay-payment.js    ← Crea transazione Satispay
│   └── satispay-callback.js          ← Webhook pagamento Satispay completato
├── netlify.toml                      ← Configurazione Netlify
└── package.json
```

---

## 🚀 Deploy su Netlify (passo per passo)

### 1. Carica il progetto su GitHub

```bash
git init
git add .
git commit -m "primo commit"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/pranzo-parrocchia.git
git push -u origin main
```

### 2. Crea il sito su Netlify

1. Vai su [netlify.com](https://netlify.com) e accedi
2. Click **"Add new site" → "Import an existing project"**
3. Collega GitHub e seleziona il repository
4. Impostazioni build: lascia tutto vuoto tranne **Publish directory** → `.`
5. Click **"Deploy site"**

### 3. Variabili d'ambiente obbligatorie

Vai su **Project configuration → Environment variables** e aggiungi:

| Variabile | Valore | Note |
|---|---|---|
| `ADMIN_PASSWORD` | `PolentataSLG` | Password accesso admin |
| `JSONBIN_API_KEY` | `...` | Master Key da jsonbin.io |
| `JSONBIN_CONFIG_BIN_ID` | `...` | Bin ID del bin `pranzo-config` |
| `JSONBIN_BOOKINGS_BIN_ID` | `...` | Bin ID del bin `pranzo-bookings` |
| `JSONBIN_SATISPAY_BIN_ID` | `...` | Bin ID del bin `pranzo-satispay` |
| `SATISPAY_ACTIVATION_CODE` | `...` | Codice attivazione Satispay (monouso) |
| `SITE_URL` | `https://polentata-slg.netlify.app` | URL del sito (per redirect Satispay) |

Dopo averle aggiunte: **Deploys → Trigger deploy**.

---

## ⚙️ Configurazione iniziale

Vai su `/admin/impostazioni.html` e inserisci:

- **Data del pranzo** e **scadenza prenotazioni**
- **Posti massimi** (es. 320)
- **Messaggio prenotazioni chiuse** (personalizzabile)
- **Voci di menù** con prezzi (già precaricate: Polenta adulto €12, bambino €10, dolce €2)
- **PayPal Client ID** (vedi sezione sotto)

---

## 💳 Configurare PayPal

1. Vai su [developer.paypal.com](https://developer.paypal.com)
2. Accedi con il tuo account PayPal Business
3. **Apps & Credentials** → assicurati di essere su **Live** (non Sandbox)
4. Apri la tua app → copia il **Client ID Live**
5. Incollalo nelle impostazioni della webapp

> **Apple Pay / Google Pay**: sono già attivi se abilitati nel pannello PayPal Developer → Features. Apple Pay richiede la verifica del dominio (file `.well-known` già incluso nel progetto).

---

## 📱 Configurare Satispay API (Web-redirect)

Il sistema usa l'integrazione API completa: crea transazioni al volo, reindirizza l'utente alla pagina Satispay e aggiorna automaticamente lo stato a "pagato" tramite webhook.

### Setup (una sola volta)

1. Su **jsonbin.io** crea un bin `pranzo-satispay` con contenuto `{"init": true}` e copia il Bin ID
2. Su Netlify aggiungi `JSONBIN_SATISPAY_BIN_ID` con il Bin ID appena creato
3. Dal pannello **Satispay Business → negozio e-commerce** → genera un **codice di attivazione**
4. Su Netlify aggiungi `SATISPAY_ACTIVATION_CODE` = il codice (è monouso!)
5. Fai un deploy
6. Vai su `/admin/satispay-setup.html`
7. Clicca **"Genera e registra chiavi"** — salva tutto automaticamente nel bin dedicato
8. Clicca **"Verifica credenziali"** per confermare che tutto funzioni

> ⚠️ Il codice di attivazione è **monouso** — se il setup fallisce, genera un nuovo codice su Satispay Business prima di riprovare.

---

## 🔐 Accesso admin

| Pagina | URL |
|---|---|
| Dashboard prenotazioni | `/admin/` |
| Impostazioni evento | `/admin/impostazioni.html` |
| Setup Satispay | `/admin/satispay-setup.html` |

Password: quella impostata in `ADMIN_PASSWORD` su Netlify.

---

## 📊 Funzionalità

### Pagina pubblica (`/`)
- Menù dinamico con selezione quantità e totale in tempo reale
- Countdown alla chiusura prenotazioni
- Barra disponibilità posti in tempo reale
- Lista d'attesa automatica a posti esauriti
- Pagamento con **PayPal** (integrato, con Apple Pay/Google Pay/MyBank/carte), **Satispay** (API completa) o **in segreteria**
- Messaggio personalizzabile quando le prenotazioni sono chiuse

### Dashboard admin (`/admin/`)
- Lista prenotazioni con filtri (pagati, segreteria, Satispay, lista attesa, annullati)
- Statistiche: prenotazioni, persone, incasso confermato, posti rimasti, in attesa, lista attesa
- **✏️ Modifica** prenotazione completa (dati, ordine, stato, metodo, nota interna)
- **✅ Segna come pagato** con un click
- **🖨️ Ricevuta** stampabile con carta intestata parrocchiale
- **👨‍🍳 Riepilogo cucina** con contatori per voce di menù
- **📱 QR Code** della pagina pubblica (scaricabile e stampabile)
- **⬇️ Export XLSX** con due fogli: prenotazioni complete + riepilogo cucina
- **🗑️ Elimina** singola prenotazione o tutte

### Impostazioni (`/admin/impostazioni.html`)
- Gestione voci di menù (aggiungi, modifica, elimina, prezzi)
- Apertura/chiusura prenotazioni con toggle
- Data evento e scadenza prenotazioni
- Posti massimi
- Messaggio personalizzabile prenotazioni chiuse
- Configurazione PayPal Client ID e link Satispay (fallback)

---

## 🗄️ Database (JSONBin.io)

Il sistema usa [JSONBin.io](https://jsonbin.io) come database (piano gratuito).

Crea tre bin su jsonbin.io:
- `pranzo-config` con contenuto iniziale `{"init": true}`
- `pranzo-bookings` con contenuto iniziale `{"bookings": []}`
- `pranzo-satispay` con contenuto iniziale `{"init": true}` (per le chiavi API Satispay)

Copia i **Bin ID** e la **Master Key** nelle variabili d'ambiente Netlify.

> ⚠️ Le chiavi Satispay vengono salvate nel bin `pranzo-satispay` separato per evitare problemi di troncamento della risposta con bin troppo grandi.

---

## 🆘 Problemi comuni

**Le funzioni restituiscono 401**: verifica che `ADMIN_PASSWORD` sia impostata e fai un nuovo deploy.

**Errore 500 su get-config o save-config**: verifica che `JSONBIN_API_KEY`, `JSONBIN_CONFIG_BIN_ID` e `JSONBIN_BOOKINGS_BIN_ID` siano corretti.

**PayPal non appare**: assicurati di usare il Client ID **Live** (non Sandbox).

**Satispay dà errore**: verifica che `SATISPAY_KEY_ID` e `SATISPAY_PRIVATE_KEY` siano impostati. Se non hai ancora fatto il setup, vai su `/admin/satispay-setup.html`.

**Apple Pay non compare**: verifica che il dominio sia registrato su PayPal Business → Metodi di pagamento → Apple Pay, e che il file `.well-known/apple-developer-merchantid-domain-association` sia accessibile via browser.
