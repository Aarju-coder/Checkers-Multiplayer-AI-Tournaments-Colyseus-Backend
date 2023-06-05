var host = window.document.location.host.replace(/:.*/, '');
var client = new Colyseus.Client(location.protocol.replace("http", "ws") + "//" + host + (location.port ? ':' + location.port : ''));
var Server = {

  joinLobby: function () {

    global.userName = prompt("Please enter your name:");
    global.dbId = prompt("Please enter your dbId:");
    global.lobbyRoom = null;
    client.joinOrCreate("lobby", {
      userName: global.userName,
      dbId: parseInt(global.dbId),
      avatar: "1",
      coin: 1000
    }).then(room => {

      console.log("here");
      global.lobbyRoom = room;
      UI.displayLobbyPlayers();
      room.onMessage("JOINFINAL", (message) => {
        console.log(message.gamePlayerList);
        UI.updateLobbyPlayers(message.gamePlayerList);
      });
      room.onMessage("ROOMCONNECT", (message) => {
        global.lobbyRoom.leave();
        global.lobbyRoom = null;
        GamePlay.joinGameRoom(message);
      });


    });
  },
  leaveLobby: function () {
    if( global.lobbyRoom)
      global.lobbyRoom.leave();
    UI.mainPage();
  },
  createFriendRoom: function () {
    global.userName = prompt("Please enter your name:");
    global.dbId = prompt("Please enter your dbId:");
    global.lobbyRoom = null;
    client.create("friendInvite", {
      userName: global.userName,
      dbId: parseInt(global.dbId),
      avatar: "1",
      coin: 1000
    }).then(room => {
      global.lobbyRoom = room;

      room.state.onChange = (changes) => {
        changes.forEach(change => {
          switch (change.field) {
            case 'customRoomCode':
              UI.display('startGame', true);
              UI.createRoomPage(change.value);
              break;
          }
        });

      }

      this.lobbyRoomValues(room);

    });
  },
  joinFriendRoom: function () {
    global.lobbyRoom = null;
    global.userName = prompt("Please enter your name:");
    global.dbId = prompt("Please enter your dbId:");
    global.customRoomCode = prompt("Please enter room code:");
    client.getAvailableRooms("friendInvite").then(rooms => {
      for (var i = 0; i < rooms.length; i++) {
        if (rooms[i].metadata && rooms[i].metadata.customRoomCode == global.customRoomCode) {

          client.joinById(rooms[i].roomId, {
            userName: global.userName,
            dbId: parseInt(global.dbId),
            coin: 1000
          }).then(room => {
            global.lobbyRoom = room;
            UI.joinRoomPage();
            room.onStateChange.once = () => {

              console.log("initial room state:", state.customRoomCode);

            };
        
            this.lobbyRoomValues(room);
          });
          return;
        }
      }
    });
  },
  lobbyRoomValues: function (room) {
    room.state.players.onAdd = (player, key) => {

      UI.addLobbyPlayer(player);

    };

    room.state.players.onRemove = (player, key) => {
      UI.removeLobbyPlayer(player);
    };

    room.onMessage("ROOM_CONNECT", (message) => {
      global.lobbyRoom.leave();
      GamePlay.joinGameRoom(message);
    });
    room.onMessage("ADMIN_DISCONNECT", (message) => {
      this.leaveLobby();
      alert("Admin Disconnect");
      location.reload();
    });
    room.onMessage("PLAYERS_LEFT", (message) => {
      this.leaveLobby();
      alert("Every one has left the game");
      location.reload();
    });
  },

  startGame: function () {
    global.lobbyRoom.send("START_GAME");
  },
}