const fs = require('fs').promises;

// pomocna funkcija koja pauzira izvodjenje funkcije na odredjeni broj ms i vraca Promise
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function gameFlow(sockets) {
    const rounds = 5; // ukupan broj rundi igre
    let words = []; // polje rijeci koje se koriste u igri

    /* citanje rijeci iz word.txt i spremanje u polje words */
    const data = await fs.readFile('./public/words.txt', 'utf8');
    words = data.split('\t');

    /* dojava igracima da igra pocinje za 5 sekundi */
    sockets[0].emit('start-message', { message: `Igra zapocinje za 5` });
    sockets[1].emit('start-message', { message: `Igra zapocinje za 5` });

    /* petlja se izvodi onoliko puta koliko ima rundi igre (zapisano u rounds) */
    for (let i = 1; i <= rounds; ++i) {
        /* generiranje random rijeci i njezino izbacivanje iz polja (da se vise ne ponavlja) */
        do {
            // generiranje random broja iz skupa {0, 1, ... , words.length - 1}
            let randNumber = Math.floor(Math.random() * words.length);
            var randWord = words[randNumber];
            words = words.filter(word => word != randWord);
        } while (!randWord);

        /* izmedju svake runde (i na pocetku) je pauza od 5 sekundi */
        await sleep(5000);

        /* dojava da prvi igrac crta, a drugi pogadja */
        sockets[1].emit('guess-draw', { message: `ROUND ${i}: drugi igrač crta` });
        sockets[0].emit('draw', { message: `ROUND ${i}: tvoj je red za crtanje` });

        /* slanje random rijeci oba korisnika */
        sockets[0].emit('word-to-drawer', { word: randWord });
        sockets[1].emit('word-to-guesser', { word: randWord });

        /* primanje komadica crteza od prvog korisnika i slanje drugome */
        sockets[0].on('drawing-send', (data) => {
            sockets[1].emit('drawing-receive', data);
        });

        /* primanje dojave da je obrisan cijeli prozor i slanje drugom korisniku da i on to treba */
        sockets[0].on('window-cleared', (data) => {
            sockets[1].emit('clear-window', { message: 'Drugi korisnik je obrisao prozor' });
        });

        /* drugi igrac dojavljuje da je pogodio rijec pa prvi ne smije vise crtati*/
        sockets[1].on('word-guessed', (data) => {
            sockets[0].emit('stop-draw', { message: `ROUND ${i}: ${data.message}` });
            pogodjeno = true;
        });

        /* trajanje jednog crtanja je 60 sekundi*/
        await sleep(60000);

        /* potpuno analogan postupak uz zamjenu uloga - drugi igrac crta, prvi pogadja */

        do {
            // generiranje random broja iz skupa {0, 1, ... , words.length - 1}
            let randNumber = Math.floor(Math.random() * words.length);
            var randWord = words[randNumber];
            words = words.filter(word => word != randWord);
        } while (!randWord);

        await sleep(5000);

        sockets[0].emit('guess-draw', { message: `ROUND ${i}: drugi igrač crta` });
        sockets[1].emit('draw', { message: `ROUND ${i}: tvoj je red za crtanje` });

        sockets[0].emit('word-to-guesser', { word: randWord });
        sockets[1].emit('word-to-drawer', { word: randWord });

        sockets[1].on('drawing-send', (data) => {
            sockets[0].emit('drawing-receive', data);
        });

        sockets[1].on('window-cleared', (data) => {
            sockets[0].emit('clear-window', { message: 'Drugi korisnik je obrisao prozor' });
        });

        sockets[0].on('word-guessed', (data) => {
            sockets[1].emit('stop-draw', { message: `ROUND ${i}: ${data.message}` });
        });

        await sleep(60000);
    }

    sockets[0].emit('end-game', { message: 'Igra je završila! PREUSMJERAVANJE' });
    sockets[1].emit('end-game', { message: 'Igra je završila! PREUSMJERAVANJE' });
}

module.exports = gameFlow;