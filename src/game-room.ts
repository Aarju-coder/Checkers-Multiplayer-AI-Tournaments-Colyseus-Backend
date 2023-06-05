import { Room, matchMaker, Client, Delayed } from "colyseus";
import { State } from "./GamePlay/GameState";
import { Player } from "./GamePlay/Player";
import { Message } from "../typings/Message";
import { Settings } from "./GamePlay/Settings";
// import {
//     Cards
// }
//     from './GamePlay/Cards'
import { Card } from "../typings/Card";

// import {
//     sqlService
// }
//     from "./GamePlay/updateDB";
import e from "express";
import { Events } from "./events";
import { HttpClient, HttpClientResponse } from "typed-rest-client/HttpClient";
//import { https } from 'ssl-root-cas/latest';
import { threadId } from "worker_threads";
import { get, post } from "httpie";

interface stat {
  dbId: number;
  clientId: string;
}
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
  playerHealth: Array<number>;
  placements: Array<Array<number>>;
  playersPlaced: number = 0;
  playerCount: number = 0;
  playerCardsRecieved: number = 0;
  playerReady: number = 0;
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
  endPoint: String = "";
  localRequest: boolean = false;
  gameTurnTimer = 30000;
  turnCount: number = 0;

  bidCard: Card;
  bidWinner: Player;

  tournamentPlayers = [];
  gameType: String = "";
  selectedPiece: any = {};
  tileID: any;
  myPiece: number = 0;
  player1userId: number;
  player2userId: number;
  winnerName: string = "";
  winnerUserId: number;
  looseruserId: number;
  turnCountPlayer1: number = 0;
  turnCountPlayer2: number = 0;
  tiedGame: boolean = false;
  sessionIdObj: stat[] = [];
  gameEnded: boolean = false;
  onCreate(options: any) {
    console.log("create game room");
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
    this.betAmount = options.betAmount;
    this.setState(new State());
    this.eventHandler = new Events(this);
    this.state.status = Settings.gameStatus.WAITING;
    this.setEvents();
    console.log("game room created");
  }

  // When client successfully join the room
  onJoin(client: Client, options: any, auth: any) {
    try {
      this.sessionIdObj.push({
        dbId: parseInt(options.dbId),
        clientId: client.id,
      });
      client.send("yourID", { yourID: client.sessionId });
      let player: Player = new Player(client, options);
      player.id = client.sessionId;
      console.log("Player SessionId: " + client.sessionId);
      player.index = this.playerCount + 1;

      // player.userId = userId;
      this.state.players[client.sessionId] = player;
      this.playerCount++;
      if (this.playerCount == 1) {
        this.player1userId = parseInt(options.dbId);
      }

      if (this.playerCount == this.maxClients) {
        //this.printlogs(false,green("Start TournamentGame"));

        if (this.state.players.size === 2) {
          this.player2userId = parseInt(options.dbId);
          this.state.status = Settings.gameStatus.GAME_START;
          console.log("game started");
          this.state.turnIndex = 2;
          this.onNextTurnTimer();
          //this.startGame(this.clients);
          //this.saveWinnerDb();
        }
      }
    } catch (e) {
      console.log("on join error >>>>>>>>>>", e);
    }
  }

  onNextTurnTimer() {
    if (this.turnTimer) this.turnTimer.clear();

    this.turnTimer = this.clock.setTimeout(() => {
      if (this.state.turnIndex == 1) {
        this.turnCountPlayer1++;
      } else if (this.state.turnIndex == 2) {
        this.turnCountPlayer2++;
      }
      console.log(
        "turnChanging -> ",
        this.turnCountPlayer1,
        " ",
        this.turnCountPlayer2
      );
      if (this.turnCountPlayer1 >= 3) {
        console.log(
          "someonemissedThreeTurns -> ",
          this.turnCountPlayer1,
          " ",
          this.turnCountPlayer2
        );
        this.broadcast("MissedThreeTurns", { playerTurn: 1 });
      } else if (this.turnCountPlayer2 >= 3) {
        console.log(
          "someonemissedThreeTurns1 -> ",
          this.turnCountPlayer1,
          " ",
          this.turnCountPlayer2
        );
        this.broadcast("MissedThreeTurns", { playerTurn: 2 });
      } else {
        console.log(
          "turnChanging1 -> ",
          this.turnCountPlayer1,
          " ",
          this.turnCountPlayer2
        );
        this.broadcast("turnChangeAfterTimeUp");
      }
    }, 30000);
  }

  // When a client leaves the room
  async onLeave(client: Client, consented) {
    if (this.tiedGame) {
      if (this.turnTimer) this.turnTimer.clear();
      this.disconnect();
    } else {
      try {
        let player = this.getPlayer(client).player;
        console.log("inside OnLeave");
        player.connected = false;
        if (consented) {
          throw new Error("consented leave");
        }
        console.log("waiting to reconnect");
        this.broadcast("playerReconnecting");
        console.log("reconnecting");
        if (this.turnTimer) this.turnTimer.clear();
        // allow disconnected client to reconnect into this room until 5 seconds
        await this.allowReconnection(client, 15);

        this.broadcast("playerReconnected", {
          playerTurn: this.state.turnIndex,
        });
        console.log("reconnected");
        this.onNextTurnTimer();

        // client returned! let's re-activate it.
        player.connected = true;
      } catch (e) {
        this.playerCount--;
        let otherclient: Client = this.state.getOtherClient(
          this.clients,
          client
        );
        if (otherclient) otherclient.send("Disconnect", { LeftPlayer: client });

        if (this.turnTimer) this.turnTimer.clear();

        if (this.playerCount == 1 && !this.gameEnded) {
          this.sessionIdObj.forEach((stat) => {
            if (stat.clientId != client.id) {
              this.winnerUserId = stat.dbId;
            } else {
              this.looseruserId = stat.dbId;
            }
          });

          console.log("user id winner ", this.winnerUserId, this.looseruserId);
          this.gameEnded = true;
          this.saveWinnerDb();
        }
      }
    }
  }

  setEvents() {
    this.onMessage("playerTurnChange", (client, message) => {
      console.log(
        "updatingTurnIndex",
        message.playerTurn,
        " ",
        message.timerOrPlayed
      );
      if (!message.timerOrPlayed) {
        if (this.state.turnIndex == 1) {
          this.turnCountPlayer1 = 0;
        } else if (this.state.turnIndex == 2) {
          this.turnCountPlayer2 = 0;
        }
      }
      this.state.turnIndex = message.playerTurn;

      console.log("updatingTurnIndex2", this.state.turnIndex);
      this.onNextTurnTimer();
      // let otherclient: Client = this.state.getOtherClient(this.clients, client);
      client.send("PlayerTurn", { playerTurn: message.playerTurn });
    });
    this.onMessage("Left", (client, message) => {
      try {
        console.log("Client has Left the game");
      } catch (e) {
        console.log("error is --> ", e);
      }

      // this.state.turnIndex = message.playerTurn;
      // client.send("PlayerTurn",{playerTurn: this.state.turnIndex});
    });
    this.onMessage("boardUpdate", (client, message) => {
      try {
        console.log("updating Board");
        var position = message.position;
        var tileposition = message.tilePosition;
        var player = message.player;
        const width = 8;
        var indexToTurnzero = position[1] + width * position[0];
        var indexToTurnone = tileposition[1] + width * tileposition[0];
        this.state.board[indexToTurnzero] = 0;
        this.state.board[indexToTurnone] = player;
        // for(var i = 0; i < this.state.board.length; i++){
        //     console.log(i+1," ->boardArray-> ", " ",this.state.board[i]);
        // }
        let otherclient: Client = this.state.getOtherClient(
          this.clients,
          client
        );
        otherclient.send("boardUpdated", {
          tileId: this.tileID,
          selectedPiece: this.selectedPiece,
        });
        console.log("board updated");
      } catch (e) {
        console.log("game over");
      }

      //this.state.board = message.playerTurn;
      // client.send("boardUpdatee",{playerTurn: this.state.turnIndex});
    });
    this.onMessage("selectedPiece", (client, message) => {
      console.log("saving selected Piece");
      this.selectedPiece = message.selectedPiece;
      this.tileID = message.tileId;
      console.log("selected Piece saved -->", this.selectedPiece);
    });
    this.onMessage("returnMypiece", (client, message) => {
      console.log("returnMypiece");
      this.myPiece += 1;
      //player.myPiece = this.playerCount + 1;
      client.send("yourPiece", { myPiece: this.myPiece });
      console.log("Player myPiece: ", this.myPiece);
      client.send("gameStart", {
        playercount: 2,
      });
      if (this.myPiece == 2) {
        this.myPiece = 0;
      }
    });
    this.onMessage("Winner", (client, message) => {
      console.log("winner---->", message.winner);
      this.winnerName = message.winner;
      if (!this.gameEnded) {
        if (this.player1userId == parseInt(message.userid)) {
          this.winnerUserId = this.player1userId;
          this.looseruserId = this.player2userId;
        } else if (this.player2userId == parseInt(message.userid)) {
          this.winnerUserId = this.player2userId;
          this.looseruserId = this.player1userId;
        }
        this.gameEnded = true;
        this.saveWinnerDb();
      }
    });
    this.onMessage("gameTie", (client, message) => {
      console.log("gameTied");
      this.tiedGame = true;
    });
  }

  async saveWinnerDb() {
    try {
      var winAmount: number =
        this.maxClients * this.betAmount -
        this.maxClients * this.betAmount * 0.2;
      console.log("winAmount1 -> ", winAmount, this.betAmount);
      winAmount = winAmount - winAmount * 0.1;
      console.log("winAmount -> ", winAmount, this.betAmount);
      let param = [
        {
          userId: this.winnerUserId,
          gameType: "Checker",
          bet_amount: this.betAmount,
          win_amount: winAmount.toFixed(2),
          winCurrency: "Coin",
          position: 1,
          roomId: this.roomId,
        },
        {
          userId: this.looseruserId,
          gameType: "Checker",
          bet_amount: this.betAmount,
          win_amount: 0,
          winCurrency: "Coin",
          position: 2,
          roomId: this.roomId,
        },
      ];
      let dataString = JSON.stringify(param);
      console.log("requestData -> ", dataString);
      let _http: HttpClient = new HttpClient("typed-test-client-tests");
      //process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
      let finalUrl =
        "https://admin.mojogos.ao:8443/payment-gateway-service/saveTransactionDetails";
      const res = await _http.post(finalUrl, dataString, {
        header: "",
        "Content-Type": "application/json",
      });

      let body: string = String(await res.readBody());
      console.log("Server response of saving winner-> ", body);
      //this.broadcast("winner",{winner: this.winnerName});
    } catch (err) {
      console.log(err);
      // console.error('~> headers:', err.headers);
      // console.error('~> data:', err.data);
    }
  }
  getPlayer(client) {
    let playerData;
    this.state.players.forEach((player, key) => {
      // for (var i in this.state.players) {
      if (client.id === player.id)
        playerData = {
          player: player,
          index: player.index,
        };
    });
    return playerData;
  }

  // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
  onDispose() {
    console.log("room on disposed");
  }
}
