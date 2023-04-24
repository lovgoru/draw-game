const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const gameFlow = require('./game-flow');

http.listen(3000);

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.redirect('index.html');
});

app.get('/game-over', (req, res) => {
    res.redirect('game-over.html');
});

/* polje u koje se spremaju socketi za svakog igraca */
var sockets = [];

io.on('connection', (socket) => {
    console.log('User connected');

    /* dodavanje socketa u polje sockets */
    sockets.push(socket);

    /* ako je samo jedan igrac povezan i ako ne postoji igra koja je u tijeku*/
    if (sockets.length === 1) {
        sockets[0].emit('wait-message', { message: `Čeka se drugi igrač` });
    }

    /* ako je dvoje igraca, igra moze poceti */
    if (sockets.length === 2) {
        uTijeku = true;
        gameFlow(sockets);
    }

    /* kad se igrac odspoji */
    socket.on('disconnect', () => {
        console.log('User disconnected');

        /* brisanje socketa u polju za tog igraca */
        sockets = sockets.filter(sock => { return sock !== socket });

        /* svi ostali igraci trebaju se odspojiti */
        for (let i = 0; i < sockets.length; ++i) {
            if (sockets[i])
                sockets[i].disconnect();
        }

    });
});


