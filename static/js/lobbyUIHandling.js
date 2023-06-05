var UI = {
    mainPage: function () {
        this.display('main', true);
        this.display('createRoomPage', false);
        this.display('gamePlay', false);
        this.display('lobby', false);
    },
    joinRoomPage: function () {
        this.display('main', false);
        this.display('createRoomPage', false);
        this.display('gamePlay', false);
        this.display('lobby', true);
    },
    createRoomPage: function (roomId) {
        document.getElementById('createRoomPage').innerHTML = ' <h2>Room has been successfully created. <br>Room Code - ' + roomId + '</h2>';
        this.display('main', false);
        this.display('createRoomPage', true);
        this.display('gamePlay', false);
        this.display('lobby', true);
    },
    gamePlayPage: function () {
        this.display('main', false);
        this.display('createRoomPage', false);
        this.display('gamePlay', true);
        this.display('lobby', false);
    },
    display: function (id, flag) {
        document.getElementById(id).style.display = flag ? 'block' : 'none';
    },
    buttons: function () {

        document.getElementById("joinLobby").onclick = function () {
            Server.joinLobby();
        };
        document.getElementById("createRoom").onclick = function () {
            Server.createFriendRoom();
        };
        document.getElementById("joinRoom").onclick = function () {
            Server.joinFriendRoom();
        };
        document.getElementById("leaveGamePlay").onclick = function () {
            GamePlay.leaveGamePlay();
        };
        document.getElementById("leaveLobby").onclick = function () {
            Server.leaveLobby();
        };
        document.getElementById("reconnect").onclick = function () {
            var roomSessionId = prompt("Please enter Room Session Id:");
            var sessionId = prompt("Your Session Id:");
            GamePlay.reconnect(roomSessionId, sessionId);
        };
        document.getElementById("startGame").onclick = function () {
            Server.startGame();
        };

    },
    addLobbyPlayer: function (player) {
        var div = document.createElement('div');

        div.id = player.id;
        div.className = 'childblock';

        div.innerHTML = player.userName + ' Connected';

        document.getElementById('lobby').appendChild(div);
    },
    removeLobbyPlayer: function (player) {

        document.getElementById(player.id).remove();
    },
    changeGameStatus: function (status) {

        document.getElementById( 'gameStatus' ).innerHTML = 'Status -' + status;

    },
    addGamePlayer: function (player, key) {
        var div = document.getElementById("player" + key);
        div.innerHTML =
            '<h2 id = "userName' + key + '">' + player.userName + '</h2>' +
            '<p> Bid: <span id = "bid' + key + '"> </span></p>' +
            '<p> Trick Points: <span id = "trickPoint' + key + '">  </span></p>' +
            '<p> Card on Table: <span id = "cardOnTable' + key + '">  </span></p>';
    },
    createPlayerColumn: function () {
        var userIndex = global.index;
        for (var i = 0; i < 4; i++) {

            var div = document.createElement('div');

            div.id = "player" + userIndex;
            div.className = "column yellowColor";

            document.getElementById('playerData').appendChild(div);
            userIndex++;
            if (userIndex == 4) {
                userIndex = 0;
            }
        }

    },
    updateBid: function (id, value) {
        document.getElementById("bid" + id).innerHTML = value;
        console.log("bid >>>>>>>", document.getElementById("bid" + id), id);
    },
    updateTrickPoints: function (id, value) {
        document.getElementById("trickPoint" + id).innerHTML = value;
    },
    updateCardOnTable: function (id, value) {
        document.getElementById("cardOnTable" + id).innerHTML = value;
    },
    updateBotStatus: function (id, value, userName) {
        if (value) {
            document.getElementById("userName" + id).innerHTML = "BOT";
        } else {
            document.getElementById("userName" + id).innerHTML = userName;
        }
    },
    removeGamePlayer: function (player, key) {

        document.getElementById(key).remove();
    },
    onGamePlayerTurn: function (userIndex) {

        for (var i = 0; i < global.players.length; i++) {

            console.log("global.players[ i ].index", global.players[i].index, userIndex);
            if (global.players[i].index === userIndex) {
                document.getElementById("player" + userIndex).classList.remove("yellowColor");
                document.getElementById("player" + userIndex).classList.add("greenColor");
            } else {

                document.getElementById("player" + global.players[i].index).classList.remove("greenColor");
                document.getElementById("player" + global.players[i].index).classList.add("yellowColor");
            }
        }

    },
    addCards: function (card) {

        var div = document.getElementById("yourCardList");
        var cardButton = document.createElement('button');
        cardButton.id = "playerCard" + card.id;
        cardButton.value = card.id;
        cardButton.innerHTML = card.card + "|" + card.suit;
        global.gameCards.push({ button: cardButton, data: card });
        cardButton.onclick = function (e) {
            // console.log("card button click >>>", e.target, e.target.value );
            GamePlay.sendCard( e.target.value );
        }
        div.appendChild(cardButton);

    },

    removeCard: function(card){
        var elem = document.getElementById( "playerCard" + card.id );
        elem.remove();
        var index = global.gameCards.filter(a => a.data.id === card.id);
        global.gameCards.splice(index, 1);
    },
    sortCards: function (card) {
        global.gameCards.sort((a, b) => {

            return b.data.id - a.data.id ;

        });
        var div = document.getElementById("yourCardList");

        for (var i = 0; i < global.gameCards.length; i++) {
            div.prepend(global.gameCards[i].button);
        }
        div.prepend(document.getElementById("yourCardListHead"));
    },
    setCard: function (isActive, id) {
        var element = document.getElementById("playerCard" + id);
        element.disabled = !isActive;
    },
    insertScore: function ( score, id ) {
        var p = document.createElement('p');
        p.innerHTML = score + ' played';
        document.getElementById(id).appendChild(p);
    },

    showHideBiddingSection: function( isActive ){
        if( isActive ){
            document.getElementById( "yourBidList" ).style.display = "block";
        }else{
            document.getElementById( "yourBidList" ).style.display = "none";
        }

    },
    updateTeamScore: function ( team, score ) {

        console.log("global.myself.team", global.team);
        console.log("global.myself.opponentTeam", global.oppTeam);
        console.log("score", score["A"], score["B"]);

        if( team == global.team ){
            document.getElementById("yourScore").innerHTML = score;
        }else{
            document.getElementById("oppScore").innerHTML = score;
        }

    },
    declareWinner: function (position, id) {
        var p = document.createElement('p');
        p.innerHTML = 'I am winner. position ' + position;
        document.getElementById(id).appendChild(p);
    },
    displayLobbyPlayers: function () {
        this.display('main', false);
        this.display('createRoomPage', false);
        this.display('gamePlay', false);
        this.display('lobby', true);
    },
    updateLobbyPlayers: function (players) {

        var removePlayers = global.lobbyPlayers.filter(n => !players.includes(n));
        var addPlayers = players.filter(n => !global.lobbyPlayers.includes(n));
        for (var i = 0; i < removePlayers.length; i++) {
            var div = document.getElementById('lobbyPlayer' + removePlayers[i].dbId);
            if (div) div.remove();
            var index = global.lobbyPlayers.findIndex(x => x.dbId === removePlayers[i].dbId);
            global.lobbyPlayers.splice(index, 1);
        }
        for (var i = 0; i < addPlayers.length; i++) {
            var div = document.createElement('div');

            div.id = 'lobbyPlayer' + addPlayers[i].dbId;
            div.className = 'childblock';

            div.innerHTML = addPlayers[i].userName + ' Connected';

            document.getElementById('lobby').appendChild(div);

            global.lobbyPlayers.push(addPlayers[i]);
        }


    }
}