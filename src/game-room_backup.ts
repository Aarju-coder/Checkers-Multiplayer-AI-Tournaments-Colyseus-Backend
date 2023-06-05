import {
    Room,
    matchMaker,
    Client,
    Delayed
}
    from "colyseus";
import {
    State
}
    from './GamePlay/GameState';
import {
    Player
}
    from './GamePlay/Player';
import {
    Message
}
    from '../typings/Message';
import {
    Settings
}
    from './GamePlay/Settings'
// import {
//     Cards
// }
//     from './GamePlay/Cards'
import {
    Card
}
    from '../typings/Card'

// import {
//     sqlService
// }
//     from "./GamePlay/updateDB";
import e from "express";
import { Events } from "./events"
import { HttpClient,    HttpClientResponse} from "typed-rest-client/HttpClient";
import { threadId } from "worker_threads";
import { get, post } from 'httpie';


export class GameRoom extends Room<State> {

    // When room is initialized
    
    nextRoundTimer: Delayed;
    turnTimer: Delayed;
    canBid = [];
    // maxScore = 500;
    maxScore = 30;
    maxClients = 2;
    gridSize: number = 8;
    startingFleetHealth: number = 2 + 3 + 5;
    playerHealth: Array < number > ;
    placements: Array < Array < number >> ;
    playersPlaced: number = 0;
    playerCount: number = 0;
    playerCardsRecieved: number = 0;
    playerReady: number =0;
    playerBidsRecieved: number = 0;
    eventHandler: Events;
    activePlayerIndex: number = 0;
    turnCardsSelected: number = 0;
    //turnSuit: CardSuit;
    gameId: number;
    turnNumber: number = 1;
    turnTime: Date;
    gameCompleted: boolean = false;

    bidInterval: Delayed;
    betAmount: number = 0;
    /**
     * php connection boolean
     */
    phpRequest: boolean = true;
    serverURL: String = "";
    endPoint: String = '';
    localRequest: boolean = false;
    gameTurnTimer = 30000;
    turnCount: number = 0;

    bidCard:Card;
    bidWinner:Player;
	
	tournamentPlayers = [];
	gameType: String = "";
    selectedPiece: any = {};
    tileID:any;
    myPiece: number = 0;
    player1userId: number;
    player2userId: number;
    winnerName: string = "";
    winnerUserId: number;
    looseruserId: number;
    saveWinner: boolean = false;
    onCreate(options: any) {
        console.log("create game room")
        this.saveWinner = false;
        // this.maxClients = options.playerCount;
        this.setSeatReservationTime(20);
        // this.setMetadata({
        //     seats: [{
        //         dbId: null
        //     },
        //     {
        //         dbId: null
        //     },
        //     ]
        // });
        this.setState(new State());
        this.eventHandler = new Events(this);
        this.state.status = Settings.gameStatus.WAITING;
        this.setEvents();
        console.log("game room created");
    }

    // When client successfully join the room
    onJoin(client: Client, options: any, auth: any) {

        try {
            
            let player: Player = new Player(client, options);
            player.id = client.sessionId;
            console.log("Player SessionId: "+ client.sessionId);
            player.index = this.playerCount + 1;
            
            // player.userId = userId;
            this.state.players[client.sessionId] = player;
            this.playerCount++;
            if(this.playerCount == 1){
                this.player1userId = parseInt(options.dbId)
            }
            
            if (this.playerCount == this.maxClients) {
                //this.printlogs(false,green("Start TournamentGame"));
                
                if (this.state.players.size === 2) {
                    this.player2userId = parseInt(options.dbId)
                    this.state.status = Settings.gameStatus.GAME_START;
                    console.log("game started")
                    this.state.turnIndex = 1;
                    this.onNextTurnTimer();
                    //this.startGame(this.clients);
                    this.lock();
            }
        }
        } catch (e) {
            console.log("on join error >>>>>>>>>>", e);
        }



    }
   
    
    // onGameStart() {

    //     this.state.status = Settings.gameStatus.GAMEPLAY;
    //     this.state.count = 0;
    //     this.changeTurn();
    //     this.setCards(true)
    //     this.onNextTurnTimer();

    // }

    // set card active that can be played in the game
    // setCards( isActive ) {

    //     var player = this.state.players[ this.state.turnIndex ];
    //     let cardsByKey = {};
    //     if( isActive ){


    //         for (var i = 0; i < player.cards.length; i++) {
    
    //             if (cardsByKey[player.cards[i].suit]) {
    //                 cardsByKey[player.cards[i].suit].push(i);
    //             } else {
    //                 cardsByKey[player.cards[i].suit] = [i];
    //             }
    
    //         }

    //         var suitsLength = Object.keys( cardsByKey ).length;
    //         if (this.state.count == 0) {
    
    //             // condition: no card has been played
    //             // spades will be played only when there are not any other cards from other suits
    //             if ( suitsLength > 1 ) {
    
    //                 for ( var key in cardsByKey ) {
    
    //                     if ( key !== "spades" ) {
    //                         for (var i = 0; i < cardsByKey[ key ].length; i++) {
    
    //                             player.cards[ cardsByKey[ key ][ i ] ].isActive = true;
    //                         }
    //                     }
    
    //                 }
    //             } else if ( suitsLength == 1 ) {
    //                 for ( var key in cardsByKey ) {
    
    //                     for ( var i = 0; i < cardsByKey[ key ].length; i++ ) {
    
    //                         player.cards[ cardsByKey[ key ][ i ] ].isActive = true;
    //                     }
    
    //                 }
    
    //             } else if ( suitsLength <= 0 ) {
    
    //                 console.log("Error in logic");
    
    //             }
    
    //         } else {
    
    //             // condition if a card has already played
    //             // if there are cards available for suit on table then that card will be played
    //             // else other cards from all other suits will be set active to play
    //             if ( cardsByKey[ this.state.currentRoundSuit ] ) {
    
    //                 for (var i = 0; i < cardsByKey[this.state.currentRoundSuit].length; i++) {
    
    //                     player.cards[cardsByKey[this.state.currentRoundSuit][i]].isActive = true;
    //                 }
    //             } else {
    
    //                 for (var key in cardsByKey) {
    
    
    //                     for (var i = 0; i < cardsByKey[key].length; i++) {
    
    //                         player.cards[cardsByKey[key][i]].isActive = true;
    //                     }
    
    
    //                 }
    
    //             }
    //         }
    //     }else{
    //         for (var i = 0; i < player.cards.length; i++) {

    //             player.cards[i].isActive = false;
    
    //         }
    //     }
   


    // }

    onNextTurnTimer() {

        if (this.turnTimer)
            this.turnTimer.clear();

        // bot timer
        // if( this.state.players[ this.state.turnIndex ].isBot ){
        //     if (this.state.status === Settings.gameStatus.GAMEPLAY) {
        //         this.onBotTurn("PLAYCARD");
        //     } else if (this.state.status === Settings.gameStatus.BIDDING) {
        //         this.onBotTurn("PLAYBID");
        //     }
        // }

        this.turnTimer = this.clock.setTimeout(() => {
            this.broadcast("turnChangeAfterTimeUp");

        },30000);

    }

    // AIPlay() {

    //     // console.log("AIPlay this.state.turnIndex", this.state.turnIndex);


    //     let player = this.state.players[this.state.turnIndex];
    //     let cards = player.cards;
    //     let card;

    //     if (this.state.count === 0) {

    //         // choose card descending order
    //         let cardsNotAttu = cards.filter(a => a.suit !== this.state.attu);
    //         if( cardsNotAttu.length ){
    //             cardsNotAttu.sort((a, b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0));
    //             card = cardsNotAttu[cardsNotAttu.length - 1];
    //         }else{
    //             cards.sort((a, b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0));
    //             card = cards[cards.length - 1];
    //         }
            
    //     } else {

    //         let cardsFromSameSuit = cards.filter(a => a.suit === this.state.currentRoundSuit);

    //         if (cardsFromSameSuit.length) {
    //             cardsFromSameSuit.sort((a, b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0))
    //             card = cardsFromSameSuit[cardsFromSameSuit.length - 1];
    //         } else {
    //             cards.sort((a, b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0))
    //             card = cards[0];

    //         }

    //     }
    //     if (card) {

    //         this.onCardPlay(card, this.state.turnIndex);
    //     }


    // }

    // AIBid() {

    //     this.state.players[this.state.turnIndex].bid = 1;

        
    //     this.state.count++;

    //     this.afterBid();

    // }


    // changeTurn() {

    //     this.state.turnIndex++;
    //     console.log("turnIndex1------->",this.state.turnIndex);
    //     if (this.state.turnIndex === 2) {
    //         this.state.turnIndex = 1;
    //     }
    //     console.log("turnIndex2------->",this.state.turnIndex);

    // }

    // onBotTurn(action) {

    //     this.clock.setTimeout(() => {
    //         if (this.turnTimer) this.turnTimer.clear();

    //         switch (action) {
    //             case "PLAYCARD":
    //                 this.AIPlay();
    //                 break;

    //             case "PLAYBID":
    //                 this.AIBid();
    //                 break;

    //         }

    //     }, Settings.botPlayTimer);


    // }

    // When a client leaves the room
     onLeave(client: Client, consented: boolean) {

        

        try {
            let player = this.getPlayer(client).player;
            player.connected = false;
            if ( consented ) {
                throw new Error("consented leave");
            }
            this.broadcast("Disconnect");
            // allow disconnected client to reconnect into this room until 5 seconds
            //  this.allowReconnection(client, 60);

            // client returned! let's re-activate it.
            player.connected = true;

        } catch (e) {

            let player = this.getPlayer(client);
            let leftPlayerCount = 0;
            // bot will play in place of left player
            //this.state.players[player.index].isBot = true;
            for (var i in this.state.players) {
                //if (this.state.players[i].isBot) {
                    leftPlayerCount++;
                //}
            }
            if (leftPlayerCount == 2) {
                // disconnect on all player leave
                this.broadcast("DISCONNECT");
                this.disconnect();
            }
        }

    }

    setEvents() {
        this.onMessage("playerTurnChange",(client, message) => {
            console.log("updatingTurnIndex", message.playerTurn);
            this.state.turnIndex = message.playerTurn;
            console.log("updatingTurnIndex2", this.state.turnIndex);
            this.onNextTurnTimer();
            // let otherclient: Client = this.state.getOtherClient(this.clients, client);
            client.send("PlayerTurn",{playerTurn: message.playerTurn});
            
        });
        this.onMessage("Left",(client, message) => {
            try{
                console.log("Client has Left the game");
            let otherclient: Client = this.state.getOtherClient(this.clients, client);
            otherclient.send('Disconnect',{LeftPlayer: client});
            this.onLeave(client, true);
        }catch(e){
            console.log("error is --> ",e);
        }
            
            // this.state.turnIndex = message.playerTurn;
            // client.send("PlayerTurn",{playerTurn: this.state.turnIndex});
            
        });
        this.onMessage("boardUpdate",(client, message) => {
            try{
            console.log("updating Board");
            var position = message.position;
            var tileposition = message.tilePosition;
            var player = message.player;
            const width = 8;
            var indexToTurnzero = position[1] + width * position[0];
            var indexToTurnone = tileposition[1] + width * tileposition[0];
            this.state.board[indexToTurnzero] = 0;
            this.state.board[indexToTurnone] = player;
            for(var i = 0; i < this.state.board.length; i++){
                console.log(i+1," ->boardArray-> ", " ",this.state.board[i]);
            }
            let otherclient: Client = this.state.getOtherClient(this.clients, client);
            otherclient.send("boardUpdated",{tileId: this.tileID,selectedPiece: this.selectedPiece});
            console.log("board updated");
        }catch (e){
            console.log("game over");
        }
            
            //this.state.board = message.playerTurn;
            // client.send("boardUpdatee",{playerTurn: this.state.turnIndex});
            
        });
        this.onMessage("selectedPiece",(client, message) => {
            console.log("saving selected Piece");
            this.selectedPiece = message.selectedPiece;
            this.tileID = message.tileId;
            console.log("selected Piece saved -->",this.selectedPiece);
            
        });
        this.onMessage("returnMypiece",(client, message) => {
            console.log("returnMypiece");
            this.myPiece += 1;
            //player.myPiece = this.playerCount + 1;
            client.send("yourPiece",{myPiece :this.myPiece});
            console.log("Player myPiece: ", this.myPiece);
            client.send("gameStart",{
                playercount : 2,
            });
            if(this.myPiece == 2){
                this.myPiece = 0;
            }
        });
        this.onMessage("Winner",(client, message) => {
            console.log("winner---->",message.winner);
            this.winnerName = message.winner;
            if(this.player1userId == parseInt(message.userid)){
                this.winnerUserId = this.player1userId;
                this.looseruserId = this.player2userId;
            }else if(this.player2userId == parseInt(message.userid)){
                this.winnerUserId = this.player2userId;
                this.looseruserId = this.player1userId;
            }
            if(this.saveWinner == false){
                this.saveWinner = true;
                this.saveWinnerDb();
            }
            
        });
    }

    async saveWinnerDb(){
        try{
            let param = [
                {
                "userId": this.winnerUserId,
                "gameType": 'Checkers',
                "bet_amount":1000,
                "win_amount":2000,
                "winCurrency":"Coin",
                "position":1,
                "roomId": this.roomId
               },
               {
                "userId": this.looseruserId,
                "gameType": 'Checkers',
                "bet_amount":1000,
                "win_amount":0,
                "winCurrency":"Coin",
                "position":2,
                "roomId": this.roomId
               },
            ];
            //let dataString = JSON.stringify(param);
            //let _http: HttpClient = new HttpClient('typed-test-client-tests');
            let finalUrl = 'https://admin.mojogos.ao:8443/payment-gateway-service/saveTransactionDetails';
            const res = await post(finalUrl, {
                body: param
              });
                console.log(res.statusCode); //=> 201
                console.log(res.data); //=> { id: 1, name: 'bulbasaur', number: 1, moves: [{...}, {...}] }
            // await _http.post(finalUrl, dataString, {
            //     headers: '',
            // });
            //let body: string = String(await res.readBody());
            //console.log("Server response of saving winner-> ",body);
            //this.broadcast("winner",{winner: this.winnerName});
        }catch(err){
            console.error('Error!', err.statusCode, err.message);
            console.error('~> headers:', err.headers);
            console.error('~> data:', err.data);
            
        }
    }
    getPlayer(client) {
        let playerData;
        this.state.players.forEach((player, key) => {
        // for (var i in this.state.players) {
            if (client.id === player.id)
                playerData = {
                    player: player,
                    index: player.index
                };
        });
        return playerData;
    }

    // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
    onDispose() {

        console.log("room on disposed");

    }

}