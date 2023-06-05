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
import { tournamentSingletonClass } from "./GamePlay/tournamentHandler";

interface ClientStat {
  client: Client;

  waitingTime: number;
  options?: any;
  coin: number;
  dbId: number;
  confirmed?: boolean;
  userName: string;
  avatar: number;
  active: boolean;
}

export class TournamentGameRoom extends Room<State> {
  // When room is initialized

  nextRoundTimer: Delayed;
  turnTimer: Delayed;
  canBid = [];
  // maxScore = 500;
  maxScore = 30;
  maxClients = 10;
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
  tournamentHandler: tournamentSingletonClass;
  tournamentId: string;
  round: number;
  tournamentStartTime: any;
  timeRemaining: any; //game class instance
  stats: ClientStat[] = [];
  winnerUserNames = [];
  winnerAvatars = [];
  looserId: number;
  tiedGame: boolean = false;
  lastRound: boolean = false;
  gameStartedinRoom: boolean = false;
  turnStartTime: number;
   turnDuration: number;
   playerObj = {};
   timeRemainingPlayer1: number = 0;
   timeRemainingPlayer2: number= 0;
  //gameOver : boolean = false;
  onCreate(options: any) {
    console.log("create game room");
    this.playerCount = 0;
    // this.maxClients = options.playerCount;
    this.roomId = String(options.roomId);
    this.tournamentId = options.t_id;
    this.lastRound = options.lastRound;
    console.log("roomId -> ", this.roomId);
    this.tournamentHandler = tournamentSingletonClass.getInstance();
    this.round = this.tournamentHandler.getRound(options.t_id);
    console.log("round -> ", this.round);
    console.log("options.t_id -> ", options.t_id);
    var roomData: Array<any> = [this, false, null];
    this.tournamentHandler.addGameRoomData(this.roomId, roomData);
    if (this.round == 1) {
      this.tournamentStartTime = new Date(options.tournamentStartTime);
    }
    this.setState(new State());
    this.eventHandler = new Events(this);
    this.state.status = Settings.gameStatus.WAITING;
    this.setEvents();
    console.log("tournament game room created");

    var gameStartTimer = setTimeout(() => {
      try {
        clearTimeout(gameStartTimer);
        console.log("gameStart");
        this.tournamentHandler.setRoomActive(
          options.t_id,
          this.round,
          this.roomId
        );
        this.onGameStart();
      } catch (e) {
        console.log(e);
      }
    }, 45000);
    console.log("game room created");
  }

  // When client successfully join the room
  onJoin(client: Client, options: any) {
    try {
      //this.sessionIdObj.set(client.id, options.dbId);
      let player: Player = new Player(client, options);
      player.id = client.sessionId;
      console.log("Player SessionId: " + client.sessionId);
      player.index = this.playerCount + 1;

      // player.userId = userId;
      this.stats.push({
        client: client,
        coin: 5,
        waitingTime: 0,
        dbId: parseInt(options.dbId),
        userName: options.userName,
        avatar: parseInt(options.avatar),
        active: true,
        options,
      });

      this.state.players[client.sessionId] = player;
      this.playerCount++;
      if (this.playerCount == 1) {
        this.player1userId = parseInt(options.dbId);
        this.playerObj[options.dbId] = this.timeRemainingPlayer1;
      }

      if (this.playerCount == 2) {
        if (this.state.players.size === 2) {
          this.player2userId = parseInt(options.dbId);
          this.playerObj[options.dbId] = this.timeRemainingPlayer2;
          console.log("user ids  -> ", this.player1userId, this.player2userId)
          this.state.turnIndex = 2;
          this.state.status = Settings.gameStatus.GAME_START;
          console.log("game started");
          this.broadcast("playerData", {
            stats: this.stats,
          });
        }
      }
    } catch (e) {
      console.log("on join error >>>>>>>>>>", e);
    }
  }
  onGameStart() {
    
    console.log("game started 1 ", this.playerCount);
    if (this.playerCount == 1) {
      this.winnerAvatars.push(this.stats[0].avatar);
      this.winnerUserId = this.stats[0].dbId;
      this.winnerUserNames.push(this.stats[0].userName);
      if (!this.lastRound) {
        this.stats[0].client.send("onePlayerWinner", {
          winnerAvatar: this.stats[0].avatar,
          winnerUserId: this.stats[0].dbId,
          winnerUserNames: this.stats[0].userName,
        });
        var roomData: Array<any> = [
          this,
          true,
          {
            userId: this.stats[0].dbId,
            rank1: this.stats[0].userName,
            rank1Avatar: this.stats[0].avatar,
          },
        ];
        this.tournamentHandler.addGameRoomData(this.roomId, roomData);
      } else {
        var winnerDetails;
        var looserDetails = {
          userId: 0,
          rank2: "",
          rank2Avatar: "",
        };
        this.stats.forEach((clientWinner) => {
          if (clientWinner.dbId == this.winnerUserId) {
            winnerDetails = {
              userId: clientWinner.dbId,
              rank1: clientWinner.userName,
              rank1Avatar: clientWinner.avatar,
            };
            console.log("tournament winner -> ", winnerDetails);
          }
        });
        this.broadcast("tournamentEnded", {
          winner: winnerDetails,
          looser: looserDetails,
        });
        this.tournamentHandler.saveWinnerDb(
          [
            {
              userId: this.winnerUserId,
            },
          ],
          this.tournamentId,
          this.round
        );
      }

      //this.gameOverInRoom = true;
    } else if (this.playerCount == 2) {
      this.onNextTurnTimer();
      this.gameStartedinRoom = true;
      this.broadcast("GameStartTourny");
      this.lock();
    } else {
      //this.gameOverInRoom = true;
      //if no player connected to this room
      var roomData: Array<any> = [
        this,
        true,
        { userId: null, rank1: null, rank1Avatar: null },
      ];
      this.tournamentHandler.addGameRoomData(this.roomId, roomData);
      this.disconnect();
    }
  }
  onNextTurnTimer() {
    if (this.turnTimer) this.turnTimer.clear();
    console.log("startng timer");
    this.turnStartTime = this.clock.elapsedTime;
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
        if (!this.gameCompleted) {
          
          if (this.turnTimer) this.turnTimer.clear();

          // if (this.playerCount < 2) {
          //   // disconnect on all player leave
          //   this.disconnect();
          // }
          if (this.playerCount == 1) {
            this.gameCompleted = true;
            let otherclient: Client = this.state.getOtherClient(
              this.clients,
              client
            );
            console.log("game started or not : ", this.gameStartedinRoom);
            if (!this.gameStartedinRoom) {
              console.log("game started or not2 : ", this.gameStartedinRoom);
              if (otherclient)
                otherclient.send("onePlayerWinner", {
                  winnerAvatar: this.stats[0].avatar,
                  winnerUserId: this.stats[0].dbId,
                  winnerUserNames: this.stats[0].userName,
                });
            } else {
            if (this.gameStartedinRoom) {
              console.log("game started or not 3: ", this.gameStartedinRoom);
              if (otherclient)
                otherclient.send("Disconnect", { LeftPlayer: client });
            }
          }
            this.stats.forEach((stat) => {
              if (stat.client.id == client.id) {
                this.looseruserId = stat.dbId;
              } else {
                this.winnerUserId = stat.dbId;
              }
            });
            console.log("user id winner ", this.winnerUserId);

            if (!this.lastRound) {
              this.stats.forEach((clientWinner) => {
                if (clientWinner.dbId == this.winnerUserId) {
                  var roomData: Array<any> = [
                    this,
                    true,
                    {
                      userId: clientWinner.dbId,
                      rank1: clientWinner.userName,
                      rank1Avatar: clientWinner.avatar,
                    },
                  ];
                  this.tournamentHandler.addGameRoomData(this.roomId, roomData);
                  // this.broadcast("gameOver", {
                  //   rank1: clientWinner.userName,
                  //   rank1Avatar: clientWinner.avatar,
                  // });
                }
              });
            } else {
              //save winner last round
              var winnerDetails;
              var looserDetails;
              this.stats.forEach((clientWinner) => {
                if (clientWinner.dbId == this.winnerUserId) {
                  winnerDetails = {
                    userId: clientWinner.dbId,
                    rank1: clientWinner.userName,
                    rank1Avatar: clientWinner.avatar,
                  };
                  console.log("tournament winner -> ", winnerDetails);
                } else if (clientWinner.dbId == this.looseruserId) {
                  looserDetails = {
                    userId: clientWinner.dbId,
                    rank2: clientWinner.userName,
                    rank2Avatar: clientWinner.avatar,
                  };
                  console.log("tournament winner -> ", winnerDetails);
                }
              });
              this.broadcast("tournamentEnded", {
                winner: winnerDetails,
                looser: looserDetails,
              });
              this.tournamentHandler.saveWinnerDb(
                [
                  {
                    userId: this.winnerUserId,
                  },
                  {
                    userId: this.looseruserId,
                  },
                ],
                this.tournamentId,
                this.round
              );
            }
            this.broadcast("winner");
          }else{
            this.disconnect();
          }
        }
      }
    }
  }
  // When a client leaves the room
  getTimeRemaining() {
    const elapsedTime = this.clock.elapsedTime - this.turnStartTime;
    //const timeRemaining = this.turnDuration - elapsedTime;
    return elapsedTime;
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
      let timeElaspedInPlayingTurn = this.getTimeRemaining();
      if (this.state.turnIndex == 1) {
        this.timeRemainingPlayer1 += timeElaspedInPlayingTurn;
      } else if (this.state.turnIndex == 2) {
        this.timeRemainingPlayer2 += timeElaspedInPlayingTurn;
      }
      console.log("player Turn change so counting time -> ", timeElaspedInPlayingTurn,"  --  ", this.timeRemainingPlayer1, "  ----  ",this.timeRemainingPlayer2)
      this.state.turnIndex = message.playerTurn;

      console.log("updatingTurnIndex2", this.state.turnIndex);
      this.onNextTurnTimer();
      // let otherclient: Client = this.state.getOtherClient(this.clients, client);
      client.send("PlayerTurn", { playerTurn: message.playerTurn });
    });
    // this.onMessage("Left", (client, message) => {
    //   try {
    //     console.log("Client has Left the game");
    //     let otherclient: Client = this.state.getOtherClient(
    //       this.clients,
    //       client
    //     );
    //     otherclient.send("Disconnect", { LeftPlayer: client });
    //     this.onLeave(client, true);
    //   } catch (e) {
    //     console.log("error is --> ", e);
    //   }
    // });
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

      if (this.myPiece == 2) {
        this.broadcast("gameStart", {
          playercount: 2,
          stats: this.stats,
        });
        this.myPiece = 0;
      }
    });
    this.onMessage("Winner", (client, message) => {
      console.log("winner---->", message);
      this.winnerName = message.winner;
      if(!this.gameCompleted){
        if (this.player1userId == parseInt(message.userid)) {
          this.winnerUserId = this.player1userId;
          this.looseruserId = this.player2userId;
        } else if (this.player2userId == parseInt(message.userid)) {
          this.winnerUserId = this.player2userId;
          this.looseruserId = this.player1userId;
        }
        console.log("winner looser -> ", this.winnerUserId, this.looseruserId)
        console.log("winner looser -> ", this.player1userId, this.player2userId);
        this.gameCompleted = true;
        if (!this.lastRound) {
          this.stats.forEach((clientWinner) => {
            if (clientWinner.dbId == this.winnerUserId) {
              var roomData: Array<any> = [
                this,
                true,
                {
                  userId: clientWinner.dbId,
                  rank1: clientWinner.userName,
                  rank1Avatar: clientWinner.avatar,
                },
              ];
              this.tournamentHandler.addGameRoomData(this.roomId, roomData);
              // this.broadcast("gameOver", {
              //   rank1: clientWinner.userName,
              //   rank1Avatar: clientWinner.avatar,
              // });
            }
          });
        } else {
          //save winner last round
          var winnerDetails;
          var looserDetails;
          this.stats.forEach((clientWinner) => {
            console.log("winner and loosers - >", clientWinner);
            if (clientWinner.dbId == this.winnerUserId) {
              winnerDetails = {
                userId: clientWinner.dbId,
                rank1: clientWinner.userName,
                rank1Avatar: clientWinner.avatar,
              };
              console.log("tournament winner -> ", winnerDetails);
            } else if (clientWinner.dbId == this.looseruserId) {
              looserDetails = {
                userId: clientWinner.dbId,
                rank2: clientWinner.userName,
                rank2Avatar: clientWinner.avatar,
              };
              console.log("tournament looser last round -> ", winnerDetails);
            }
          });
          this.broadcast("tournamentEnded", {
            winner: winnerDetails,
            looser: looserDetails,
          });
          this.tournamentHandler.saveWinnerDb(
            [
              {
                userId: this.winnerUserId,
              },
              {
                userId: this.looseruserId,
              },
            ],
            this.tournamentId,
            this.round
          );
        }
      }
      
      this.broadcast("winner");
      this.disconnect();
      //this.saveWinnerDb();
    });
    
    this.onMessage("gameTie", () => {
      console.log("gameTied");
     
      if (!this.gameCompleted) {
        if (this.timeRemainingPlayer1 > this.timeRemainingPlayer2) {
          this.winnerUserId = this.player1userId;
          this.looseruserId = this.player2userId;
        } else {
          this.winnerUserId = this.player2userId;
          this.looseruserId = this.player1userId;
        }
        console.log("winner looser -> ", this.winnerUserId, this.looseruserId);
        console.log(
          "winner looser -> ",
          this.player1userId,
          this.player2userId
        );
        this.gameCompleted = true;
        if (!this.lastRound) {
          this.stats.forEach((clientWinner) => {
            console.log("winner and loosers - >", clientWinner);
            if (clientWinner.dbId == this.winnerUserId) {
              var roomData: Array<any> = [
                this,
                true,
                {
                  userId: clientWinner.dbId,
                  rank1: clientWinner.userName,
                  rank1Avatar: clientWinner.avatar,
                },
              ];
              this.tournamentHandler.addGameRoomData(this.roomId, roomData);
              // this.broadcast("gameOver", {
              //   rank1: clientWinner.userName,
              //   rank1Avatar: clientWinner.avatar,
              // });
            }else{
              clientWinner.client.send("gameTiedTourny",{time: this.timeRemainingPlayer1 - this.timeRemainingPlayer2});
            }
          });
        } else {
          //save winner last round
          var winnerDetails;
          var looserDetails;
          this.stats.forEach((clientWinner) => {
            console.log("winner and loosers - >", clientWinner);
            if (clientWinner.dbId == this.winnerUserId) {
              winnerDetails = {
                userId: clientWinner.dbId,
                rank1: clientWinner.userName,
                rank1Avatar: clientWinner.avatar,
              };
              console.log("tournament winner -> ", winnerDetails);
            } else {
              looserDetails = {
                userId: clientWinner.dbId,
                rank2: clientWinner.userName,
                rank2Avatar: clientWinner.avatar,
              };
              console.log("tournament looser last round -> ", winnerDetails);
            }
          });
          this.broadcast("tournamentEnded", {
            winner: winnerDetails,
            looser: looserDetails,
          });
          this.tournamentHandler.saveWinnerDb(
            [
              {
                userId: this.winnerUserId,
              },
              {
                userId: this.looseruserId,
              },
            ],
            this.tournamentId,
            this.round
          );
        }
      }
      this.broadcast("winner");
      this.disconnect();
      this.tiedGame = true;

    });
  }

  async saveWinnerDb() {
    try {
      let param = [
        {
          userId: this.winnerUserId,
          gameType: "Checkers",
          bet_amount: 1000,
          win_amount: 2000,
          winCurrency: "Coin",
          position: 1,
          roomId: this.roomId,
        },
        {
          userId: this.looseruserId,
          gameType: "Checkers",
          bet_amount: 1000,
          win_amount: 0,
          winCurrency: "Coin",
          position: 2,
          roomId: this.roomId,
        },
      ];
      let dataString = JSON.stringify(param);
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
