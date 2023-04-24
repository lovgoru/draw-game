var socket = io();
var guessingWord = "";

/* ovom zastavicom se oznacava moze li se ili ne crtati u canvas objekt */
var drawingMode = false;

/* ispisuje se poruka kod igraca koji se prvi spoji (sam je trenutno) */
socket.on('wait-message', (data) => {
    const p = document.getElementById('status-igre');
    p.textContent = data.message;
});

/* odbrojavanje do pocetka igre */
socket.on('start-message', (data) => {
    let timeStart = 5;
    const p = document.getElementById('status-igre');
    p.textContent = `Igra počinje za ${timeStart}`;
    var interval = window.setInterval(() => {
        --timeStart;
        p.textContent = `Igra počinje za ${timeStart}`;
        if (timeStart === 1)
            clearInterval(interval);
    }, 1000);
});

/* igrac koji crta prima rijec i ispisuje mu se na ekranu */
socket.on('word-to-drawer', (data) => {
    guessingWord = data.word;

    const canvas = document.getElementById('draw-window');
    const ctx = canvas.getContext('2d');

    ctx.font = "20px Comic Sans MS";
    ctx.fillStyle = "black";
    ctx.textAlign = "start";
    ctx.fillText('RIJEČ: ' + guessingWord, 10, 25);
});

/* igrac koji pogadja samo sprema rijec */
socket.on('word-to-guesser', (data) => {
    guessingWord = data.word;
});

/* igrac crta */
socket.on('draw', (data) => {
    const p = document.getElementById('status-igre');
    p.textContent = data.message;

    const eraseButton = document.getElementById('erase-button');
    const label = document.getElementById('label');
    const inputWord = document.getElementById('input-word');
    const checkButton = document.getElementById('check-button');

    eraseButton.style.visibility = 'visible';
    label.style.visibility = 'hidden';
    inputWord.style.visibility = 'hidden';
    checkButton.style.visibility = 'hidden';

    drawingMode = true;
    const canvas = document.getElementById('draw-window');
    const ctx = canvas.getContext('2d');

    /* brisanje svih sadzaja prozora za crtanje prije svakog novog crtanja */
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* pomocne funkcije za obradu evenata crtanja misem */

    function startDrawing(e) {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
    }

    function draw(e) {
        /* ako se ne smije crtati ili se ne crta, ne treba odraditi nista */
        if (!drawingMode || !isDrawing)
            return;

        /* crtanje linije na odredjenim koordinatama */
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();

        /* slanje podataka serveru za iscrtavanje slike kod drugog korisnika */
        socket.emit('drawing-send', {
            x: e.offsetX,
            y: e.offsetY,
            lastX: lastX,
            lastY: lastY
        });

        [lastX, lastY] = [e.offsetX, e.offsetY];

    }

    function stopDrawing() {
        isDrawing = false;
    }

    /* inicijalizacija pomocnih varijabli */
    var isDrawing = false;
    var lastX = 0;
    var lastY = 0;


    /* obrada evenata */
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    /* obrada eventa kad se klike na gumb za brisanje cijelog prozora */
    eraseButton.addEventListener('click', () => {
        /* slanje drugom igracu da obrise cijeli prozor */
        socket.emit('window-cleared', { message: 'Obriši prozor za cranje' });
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.font = "20px Comic Sans MS";
        ctx.fillStyle = "black";
        ctx.textAlign = "start";
        ctx.fillText('RIJEČ: ' + guessingWord, 10, 25);
    });

    /* iscrtavanje koliko je jos vremena preostalo za crtanje */
    let timeCounter = 60;
    let timer = document.getElementById('timer');
    timer.textContent = `Preostalo vrijeme: ${timeCounter}`;
    let interval = window.setInterval(() => {
        --timeCounter;
        timer.textContent = `Preostalo vrijeme: ${timeCounter}`;
        if (timeCounter === 0) {
            drawingMode = false;
            timer.textContent = 'KRAJ! Ne možete više crtati!';
            clearInterval(interval);
        }
    }, 1000);

});

/* igrac pogadja rijec */
socket.on('guess-draw', (data) => {
    drawingMode = false;
    let timeCount = 60;

    const p = document.getElementById('status-igre');
    p.textContent = data.message;

    const canvas = document.getElementById('draw-window');
    const ctx = canvas.getContext('2d');

    /* brisanje svih sadzaja prozora za crtanje nakon svakog novog crtanja */
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const eraseButton = document.getElementById('erase-button');
    const label = document.getElementById('label');
    const inputWord = document.getElementById('input-word');
    const checkButton = document.getElementById('check-button');

    /* igrac koji crta je obrisao prozor za crtanje pa treba i ovaj */
    socket.on('clear-window', (data) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    eraseButton.style.visibility = 'hidden';
    label.style.visibility = 'visible';
    inputWord.style.visibility = 'visible';
    checkButton.style.visibility = 'visible';

    /* igrac je kliknuo za provjeru rijeci pa treba provjeriti je li ispravna */
    checkButton.addEventListener('click', () => {
        const input = document.getElementById('input-word');
        if (timeCount > 0 && input.value === guessingWord) {
            input.value = '';
            ctx.font = "30px Comic Sans MS";
            ctx.fillStyle = "red";
            ctx.textAlign = "center";
            ctx.fillText("Pogodili ste riječ", canvas.width / 2, canvas.height / 2);
            socket.emit('word-guessed', { message: 'Drugi igrač je pogodio riječ' });
        }
        else {
            input.value = '';
        }
    });
    
    /* omogucavanje potvrde unosa rijeci pritiskom na ENTER */
    inputWord.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          checkButton.click();
        }
    });

    /* iscrtavanje preostalog vremena do kraja crtanja u rundi */
    let timer = document.getElementById('timer');
    timer.textContent = `Preostalo vrijeme: ${timeCount}`;
    var interval = window.setInterval(() => {
        --timeCount;
        timer.textContent = `Preostalo vrijeme: ${timeCount}`;
        if (timeCount === 0) {
            timer.textContent = 'KRAJ! Ne možete više pogađati!';
            clearInterval(interval);
        }
    }, 1000);
});

/* primanje komada crteza od igraca koji crta i crtanje tog dijela */
socket.on('drawing-receive', (data) => {
    const canvas = document.getElementById('draw-window');
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(data.lastX, data.lastY);
    ctx.lineTo(data.x, data.y);
    ctx.stroke();
});

/* kraj igre */
socket.on('end-game', (data) => {
    drawingMode = false;
    const p = document.getElementById('status-igre');
    p.textContent = data.message;

    const eraseButton = document.getElementById('erase-button');
    const label = document.getElementById('label');
    const inputWord = document.getElementById('input-word');
    const checkButton = document.getElementById('check-button');

    eraseButton.style.visibility = 'hidden';
    label.style.visibility = 'hidden';
    inputWord.style.visibility = 'hidden';
    checkButton.style.visibility = 'hidden';

    socket.disconnect();
    window.location.replace("/game-over");
});

/* zaustavi crtanje */
socket.on('stop-draw', (data) => {
    drawingMode = false;
    const p = document.getElementById('status-igre');
    p.textContent = data.message;

    const eraseButton = document.getElementById('erase-button');
    eraseButton.style.visibility = 'hidden';
});

socket.on('disconnect', () => {
    window.location.replace("/game-over");
});
