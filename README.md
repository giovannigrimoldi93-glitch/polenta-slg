# 🍲 Pranzo in Parrocchia – Sistema di Prenotazione

Sistema web per gestire le prenotazioni del pranzo parrocchiale con pagamento online (PayPal, Satispay) e in segreteria.

---

## 📁 Struttura del progetto

```
pranzo-parrocchia/
├── index.html                    ← Pagina pubblica di prenotazione
├── grazie.html                   ← Conferma dopo prenotazione
├── admin/
│   ├── index.html                ← Dashboard prenotazioni (protetta)
│   └── impostazioni.html         ← Gestione menù, prezzi, posti (protetta)
├── css/style.css                 ← Stili condivisi
├── netlify/functions/            ← Backend serverless
│   ├── admin-login.js
│   ├── get-config.js
│   ├── save-config.js
│   ├── prenota.js
│   ├── get-prenotazioni.js
│   └── update-booking.js
├── netlify.toml                  ← Configurazione Netlify
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
3. Collega GitHub e seleziona il repository `pranzo-parrocchia`
4. Impostazioni build:
   - **Base directory**: (vuoto)
   - **Build command**: (vuoto)
   - **Publish directory**: `.`
5. Click **"Deploy site"**

### 3. Imposta la variabile d'ambiente (password admin)

1. Nel pannello Netlify → **Site configuration → Environment variables**
2. Click **"Add a variable"**
3. Key: `ADMIN_PASSWORD`
4. Value: `PolentataSLG`
5. Salva e fai un nuovo deploy (**Deploys → Trigger deploy**)

### 4. Abilita Netlify Blobs

Netlify Blobs si attiva automaticamente quando il sito è live. Non serve configurazione aggiuntiva.

---

## ⚙️ Configurazione iniziale

Vai su `https://TUO-SITO.netlify.app/admin/impostazioni.html` e inserisci:

- **Data del pranzo**: 15/03/2026
- **Scadenza prenotazioni**: 13/03/2026
- **Posti massimi**: 320
- **Voci di menù**: già precaricate (Polenta adulto €12, bambino €10, dolce €2)
- **PayPal Client ID**: dal tuo account [PayPal Developer](https://developer.paypal.com)
- **Link Satispay**: dal pannello Satispay Business
- **EmailJS**: vedi sezione sotto

---

## 📧 Configurare EmailJS (email di conferma gratuite)

1. Crea account su [emailjs.com](https://emailjs.com) (piano gratuito: 200 email/mese)
2. **Add New Service** → Gmail o altro provider
3. **Email Templates** → Create New Template con queste variabili:
   ```
   A: {{to_email}}
   Oggetto: Prenotazione confermata – Pranzo in Parrocchia
   
   Ciao {{nome}} {{cognome}},
   la tua prenotazione #{{booking_id}} è stata ricevuta.
   
   Ordine:
   {{items}}
   
   Totale: {{totale}}
   Pagamento: {{metodo}}
   Stato: {{stato}}
   Note: {{note}}
   
   Grazie e a presto!
   Parrocchia San Luigi Gonzaga – Milano
   ```
4. Copia **Service ID**, **Template ID** e **Public Key** nelle impostazioni della webapp

---

## 💳 Configurare PayPal

1. Vai su [developer.paypal.com](https://developer.paypal.com)
2. Accedi con il tuo account PayPal Business
3. **Apps & Credentials** → Create App
4. Copia il **Client ID** (usa quello Live, non Sandbox, per la produzione)
5. Incollalo nelle impostazioni della webapp

---

## 📱 Configurare Satispay

1. Dal pannello Satispay Business → genera un link di pagamento
2. Il link deve supportare importo variabile (o imposta un link generico)
3. Incollalo nelle impostazioni della webapp

---

## 🔐 Accesso admin

- **Dashboard prenotazioni**: `/admin/`
- **Impostazioni**: `/admin/impostazioni.html`
- **Password**: quella impostata in `ADMIN_PASSWORD` su Netlify

---

## 📊 Funzionalità

### Pagina pubblica (`/`)
- Menù dinamico caricato dalle impostazioni
- Selezione quantità per ogni voce
- Totale in tempo reale
- Pagamento con PayPal (integrato), Satispay (redirect) o in segreteria
- Barra disponibilità posti in tempo reale
- Email di conferma automatica

### Dashboard admin (`/admin/`)
- Lista prenotazioni con filtri per stato
- Statistiche: totale prenotazioni, persone, incasso, posti rimasti
- Cambio stato (segna come pagato, annulla)
- Export CSV per la lista del pranzo

### Impostazioni (`/admin/impostazioni.html`)
- Gestione voci di menù (aggiungi, modifica, elimina)
- Apertura/chiusura prenotazioni
- Configurazione pagamenti e email
- Posti massimi e date

---

## 🆘 Problemi comuni

**Le funzioni non rispondono**: verifica che il deploy sia andato a buon fine e che la variabile `ADMIN_PASSWORD` sia impostata.

**Il database è vuoto**: Netlify Blobs si inizializza al primo utilizzo. Salva le impostazioni una volta per creare il database.

**PayPal non appare**: inserisci un Client ID valido nelle impostazioni.

**Email non inviate**: verifica le credenziali EmailJS. Il piano gratuito ha un limite di 200 email/mese.
