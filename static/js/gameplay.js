var GamePlay = {

    setGameRoom: function (room) {

        global.gameRoom = room;
        global.roomSessionId = room.id;
        global.sessionId = room.sessionId;
        UI.gamePlayPage();
        room.onError((code, message) => {
            console.log("oops, error ocurred:");
            console.log(message);
        });
        room.state.onChange = (changes) => {

            changes.forEach(change => {
                switch (change.field) {
                    case 'status':
                        console.log( "status >>", change.value ); 
                        UI.changeGameStatus(change.value);
                        break;
                    case 'turnIndex':
                        console.log( "turnIndex >>", change.value ); 
                        UI.onGamePlayerTurn(change.value);
                        if( room.state.status === "BIDDING" && global.myself.index == change.value ){
                            UI.showHideBiddingSection(true);
                        }else{
                            UI.showHideBiddingSection(false);
                        }
                        break;
                    case 'teamScore':
                        // update team score
                        // console.log( "team Score >>", change.value ); 
                        // UI.updateTeamScore(change.value);
                        break;
                }
            });

        }

        room.state.teamScore.onChange = (changes) => {

            console.log("score changes >>>>>>", changes);
            changes.forEach(change => {
                switch (change.field) {
                    case 'A':
                        UI.updateTeamScore( 'A', change.value )
                        break;
                    case 'B':
                        UI.updateTeamScore( 'B', change.value );
                        break;
                }
            });
        }
        room.state.players.onAdd = (player, key) => {

            global.players[player.index] = {
                id: player.id,
                dbId: player.dbId,
                userName: player.userName,
                coin: player.coin,
                avatar: player.avatar,
                team: player.team,
                index: player.index,
            };
            if( room.sessionId == player.id ){
                global.myself = global.players[player.index];
                global.myself.oppTeam = player.team == "A" ? "A" : "B";
            }
            console.log( "player addede >>>>>>>>>>", global.players[player.index] );
            UI.addGamePlayer( player, player.index );
            player.onChange = function (changes) {

                changes.forEach(change => {
                    switch (change.field) {
                        case "bid":
                            UI.updateBid(player.index, change.value)
                            break;
                        case "points":
                            // update points
                            UI.updateTrickPoints(player.index, change.value);
                            break;
                        case "isBot":
                            // update bot status
                            UI.updateBotStatus(player.index, change.value, player.userName);
                            break;

                        case "cardPlayed":
                            // update card played
                            var card = change.value;
                            if(card){
                                UI.updateCardOnTable(player.index, card.card + " | " + card.suit);
                                if( player.index == global.myself.index ){
                                    UI.removeCard( card );
                                }
                            }else{
                                UI.updateCardOnTable(player.index, "-");
                            }
                            break;
                    } 
                });
            };

            if(global.myself.index == player.index ){
                player.cards.onAdd = function (card, key) {
                    console.log( "Cards >>>>>>>>", card );
                    UI.addCards(card);
                    UI.sortCards();
                    card.onChange = function (changes) {
                        changes.forEach(change => {
                            switch (change.field) {
                                case "isActive":
                                    UI.setCard(change.value, card.id);
                                    break;
                            }
                        });
                    }

                }
            }

            room.state.players.onRemove = (player, key) => {
                console.log("players on remove ", player);
                UI.removeGamePlayer(player, key);
            }
            room.onMessage("PLAYER_LEFT", (message) => {
                this.leave();
                alert("Game has completed");
                location.reload();

            });

        }
        room.onMessage("HANDWINNER", (message) => {
           console.log( "handwinner animation >>", message );
        });
        room.onMessage("DECLAREROUNDWINNER", (message) => {
            console.log( "DECLAREROUNDWINNER popup >>", message );
        });
        room.onMessage("DECLAREGAMEWINNER", (message) => {
            console.log( "DECLAREGAMEWINNER popup >>", message );
        });
        room.onMessage("DISCONNECT", (message) => {
            alert("Disconnect Room");
        });
    },
    sendCard: function(id){
        global.gameRoom.send("CARD",{ cardId: id });
    },
    sendBid: function( value ){
        console.log( "send bid >>", value );
        global.gameRoom.send("BID",{ bid: value });
    },
    joinGameRoom: async function (message) {
        try {
            global.gameRoom = null;
            const room = await client.consumeSeatReservation(message.seat);
            console.log("joined successfully", room);
            localStorage.setItem("team", message.team);
            localStorage.setItem("userIndex", message.userIndex);
            global.team = message.team == 1 ? "A" : "B";
            global.index = message.userIndex;
            global.oppTeam = global.team == "A" ? "B" : "A";
            UI.createPlayerColumn();
            this.setGameRoom(room);
        } catch (e) {
            console.error("join error", e);
        }
    },
    leaveGamePlay: function () {
        global.gameRoom.leave();
        UI.mainPage();
    },
    reconnect: async function (roomId, sessionId) {
        try {
            const room = await client.reconnect(roomId, sessionId);
            console.log("joined successfully", room);
            var team = localStorage.getItem("team");
            var userIndex = localStorage.getItem("userIndex");
            global.team = team == 1 ? "A" : "B";
            global.index = userIndex;
            global.oppTeam = global.team == "A" ? "B" : "A";
            UI.createPlayerColumn();
            this.setGameRoom(room);
        } catch (e) {
            console.error("join error", e);
        }
    }
}