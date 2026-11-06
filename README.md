# 🌱 Piccolo Giardino — un compagno d'acqua

Una piccola web app privata e offline che aiuta chi affronta la chemioterapia a
bere abbastanza acqua, trasformando l'idratazione in un'abitudine fatta di cura
per una piccola pianta.

Ogni mattina viene piantato un nuovo seme. Ogni bicchiere d'acqua che registri
lo annaffia e lui cresce. Se passa troppo tempo senza bere, ha prima sete e poi
si ammala; se la giornata finisce prima del tuo obiettivo, appassisce. Raggiungi
l'obiettivo e **fiorisce** — e in quel preciso momento vola nel giardino dietro
di te con un piccolo scintillio, così giorno dopo giorno nasce un prato rigoglioso.
Nulla viene mai inviato da nessuna parte.

## Come si avvia

È un sito completamente statico — nessuna build, nessun backend, nessuna
dipendenza.

- **Fai doppio clic su `index.html`** (funziona anche direttamente dal file system), oppure
- avvia un server nella cartella per avere la PWA installabile + l'uso offline:

```bash
python -m http.server 8080
# poi apri http://localhost:8080 sul telefono (stessa rete Wi‑Fi)
```

Sul telefono puoi usare *Aggiungi alla schermata Home* per installarla come
un'app nativa. Il service worker e l'installabilità richiedono `http(s)`, non
`file://`.

## Come funziona

| Meccanica | Dettaglio |
|---|---|
| **Pianta del giorno** | Ogni mattina viene piantata una pianta nuova, generata proceduralmente (il seme deriva dalla data, quindi resta stabile per tutta la giornata). Ogni giorno è **una specie diversa** (margherita, papavero, tulipano, campanula, spiga, rosa o cespuglio) con forma, foglie e colori propri. |
| **Un bicchiere = un'annaffiatura** | Il pulsante grande registra un bicchiere; la pianta cresce un po'. |
| **Crescita** | Altezza, foglie e fiore sono una funzione morbida dei tuoi progressi. |
| **Sete e malattia** | Se passa più tempo dell'intervallo del promemoria, la pianta si piega, le foglie si arricciano e ingialliscono, compaiono delle macchie e la faccia del vaso diventa triste. |
| **Fioritura** | Raggiungere l'obiettivo giornaliero (N litri) apre il fiore, fa partire una festa e il vaso sorride. La fioritura poi **si stacca e vola nel giardino**, tracciando un arco dorato e rosa nel cielo, prima di attecchire con un'esplosione di scintille e petali. |
| **Il giardino** | Ogni compagno fiorito diventa una pianta del giardino, in una tra le varie specie (margherita, papavero, tulipano, campanula, spiga di lavanda, rosa, cespuglio). Il prato si trova **sull'erba ai lati del vaso**, ogni pianta con la sua ombra a terra per apparire ben radicata, ordinata per profondità e animata da farfalle e api. |
| **Giorno / notte** | Cielo, sole, luna, stelle, colline e terreno seguono la tua ora locale. Di notte compaiono le lucciole, gli occhi del vaso sbattono le palpebre e l'umore cambia. |
| **Promemoria** | Un promemoria nell'app, più notifiche di sistema opzionali, quando passa troppo tempo. Le ore di silenzio vengono rispettate, così nessuno viene svegliato. |

## Impostazioni

- **Obiettivo giornaliero (N)** — i litri necessari per fiorire (0,5 – 4 L).
- **Dimensione del bicchiere** — quanto bevi per bicchiere (100 – 500 ml).
- **Promemoria gentile** — minuti tra un promemoria e l'altro (15 – 120).
- **Notifiche** — notifiche di sistema opzionali.
- **Suoni delicati** — rintocchi morbidi sintetizzati (nessun file audio).
- **Inizia un giardino nuovo** — cancella i dati locali.

## Arte e atmosfera

I disegni sono generati interamente dal codice — nessuna immagine — e sono
pensati per ricompensarti più a lungo guardi:

- **Il compagno**: uno stelo affusolato e illuminato da gradienti, disegnato da
  una spina dorsale che si piega; nove foglie costruite a mano in quattro
  silhouette, ognuna con riempimento a gradiente, nervatura centrale e laterali,
  un riflesso lucido e talvolta una goccia di rugiada. Il fiore ha la **forma
  della specie del giorno** — corolla a strati, papavero, tulipano, campanula
  pendente, spiga, rosa — con petali, centro a gradiente e stami, più un bagliore
  morbido che si intensifica di notte. |
- **La faccia** reagisce di continuo: occhi rotondi che sbattono le palpebre e si
  guardano intorno, veri occhi felici ad arco ^ ^ e un vaso che rimbalza quando lo
  annaffi, un broncio quando annulli, uno sguardo assetato quando aspetta troppo
  e un grande sorriso quando fiorisce. Il vaso e tutto il compagno si adattano
  alle dimensioni dello schermo.
- **Il vaso**: gradienti di terracotta a strati, una fascia decorativa incisa, un
  sottovaso, terra con sassolini e un piccolo germoglio, e una faccia con occhi a
  gradiente, riflessi, palpebre, guance rosse, sopracciglia e una goccia di sudore.
- **Il cielo**: gradienti giorno/crepuscolo/notte a più stop, sole e luna che
  percorrono un arco, nuvole che si spostano, stelle scintillanti, un'aurora di
  notte, stelle cadenti occasionali, polline che fluttua di giorno e lucciole di
  notte.
- **Il giardino**: il trapianto disegna un **nastro luminoso ad arco** e un seme
  fiorito che gira nel cielo, poi atterra con un'onda circolare e un bagliore
  elastico. La nuova pianta è ordinata per profondità e oscilla piano.
- **Il finale**: una morbida vignettatura e una fine grana pellicola per un'aria
  da libro illustrato.

> **Lo apri da `index.html` (file://)?** Tutto funziona offline. Il manifest
> dell'app viene collegato solo quando il sito è servito su http(s), perché i
> browser lo bloccano su `file://` — è da lì che arrivava il messaggio CORS
> innocuo in console. Usa `python -m http.server` per l'installabilità e la cache
> offline.

## Accessibilità e comfort

- Bersagli grandi da toccare e un carattere arrotondato e leggibile.
- Funziona con `prefers-reduced-motion` (oscillazioni e animazioni lunghe vengono calmate).
- La scena è volutamente **ferma** — nessun movimento continuo. La pianta si
  piega solo quando la annaffi, e l'interfaccia si ricalcola da sola così il
  compagno entra sempre bene tra il contatore dei litri e i comandi su qualsiasi
  schermo, con il giardino piantato sull'erba ai lati del vaso.
- Tutto vive solo nel `localStorage` del dispositivo.
- Testo ad alto contrasto sopra la scena animata.

## Struttura del progetto

```
index.html            markup + SVG di vaso, cielo e colline
manifest.webmanifest  metadati della PWA installabile
sw.js                 cache offline dell'app
css/
  base.css            reset, token di design, layout
  scene.css           cielo, giorno/notte, sole/luna/stelle, colline, terreno
  plant.css           pianta compagno, faccia del vaso, fumetto, annaffiatura
  garden.css          giardino sullo sfondo, insetti, lucciole, coriandoli
  ui.css              HUD, contatore, comandi, pannelli, benvenuto, avvisi
js/
  util.js             matematica, RNG con seme, tempo e colori
  storage.js          stato in localStorage
  audio.js            piccoli toni WebAudio
  sky.js              ciclo giorno/notte in tempo reale
  plant.js            pianta SVG procedurale (cresce / oscilla / appassisce / fiorisce)
  garden.js           renderer del giardino sullo sfondo
  effects.js          annaffiatura, scintille, farfalle, api, coriandoli
  notify.js           avvisi nell'app + notifiche di sistema
  app.js              regole di gioco, cambio giorno, collegamento UI
```

La pianta e il giardino sono animati con un mix di **CSS** (oscillazione,
fioritura, insetti, particelle) e **JavaScript** (piegatura scheletrica per
frame, easing della crescita e appassimento), come richiesto.

Fatto con cura. Un piccolo sorso alla volta è abbastanza. 💛
