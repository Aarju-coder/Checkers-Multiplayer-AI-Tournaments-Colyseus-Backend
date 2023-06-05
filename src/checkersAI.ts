import { Room, matchMaker, Client, Delayed } from "colyseus";
import { State } from "./GamePlay/GameState";
import { Player } from "./GamePlay/Player";
import { Events } from "./events";
import { HttpClient } from "typed-rest-client/HttpClient";
import { Board } from "./GamePlay/gameBoard";

export class CheckersAIRoom extends Room<State> {
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

  //bidCard:Card;
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
  board: Board;
  tileIdarray = {};
  jumpType = "";
  onCreate() {
    this.setState(new State());
    this.eventHandler = new Events(this);
    //this.state.status = Settings.gameStatus.WAITING;
    this.setEvents();
    this.board = new Board(true, null);
    var tileId = 0;
    for (var row = 0; row < 8; row++) {
      for (var col = 0; col < 8; col++) {
        if (col % 2 == (row + 1) % 2) {
          this.tileIdarray[row + " " + col] = tileId++;
        }
      }
    }
  }

  // When client successfully join the room
  onJoin(client: Client, options: any, auth: any) {
    try {
      let player: Player = new Player(client, options);
      player.id = client.sessionId;
      ////console.log("Player SessionId: "+ client.sessionId);
      player.index = this.playerCount + 1;

      // player.userId = userId;
      this.state.players[client.sessionId] = player;
      this.playerCount++;
      if (this.playerCount == 1) {
        this.player1userId = parseInt(options.dbId);
        this.onNextTurnTimer();
        //this.state.status = Settings.gameStatus.GAME_START
        this.state.turnIndex = 2;
      }
    } catch (e) {
      ////console.log("on join error >>>>>>>>>>", e);
    }
  }

  minimax(position, depth, max_player) {
    try {
      ////console.log("depth -->> ", depth);
      //////console.log("position");

      if (depth == 0 || position.winner() != null) {
        ////console.log("minimax1")
        return [position.evaluate(), position];
      }

      if (max_player) {
        ////console.log("minimax2")
        var maxEval = Number.NEGATIVE_INFINITY;
        var best_move = null;
        let moves = this.get_all_moves(position, 1);
        ////console.log("moves inside minmax -->> ", moves);
        ////console.log("moves inside minmax -->> ", moves);

        for (let move of moves) {
          var evaluation = this.minimax(move, depth - 1, false);
          ////console.log("maxeval and evaluation -> ", maxEval);
          maxEval = Math.max(maxEval, evaluation[0]);
          ////console.log("maxeval and evaluation -> ", maxEval, " ", evaluation[0])
          if (maxEval == evaluation[0]) {
            best_move = move;
          }
        }
        return [maxEval, best_move];
      } else {
        ////console.log("minimax3")
        var minEval = Number.POSITIVE_INFINITY;
        var best_move = null;
        let moves = this.get_all_moves(position, 2);
        ////console.log("moves inside minmax2 -->> ", moves);
        for (let move of moves) {
          var evaluation = this.minimax(move, depth - 1, true);
          ////console.log("maxeval and evaluation -> ", maxEval);
          minEval = Math.min(minEval, evaluation[0]);
          ////console.log("mineval and evaluation2 -> ", minEval, " ", evaluation[0])
          if (minEval == evaluation[0]) {
            best_move = move;
          }
        }
        return [minEval, best_move];
      }
    } catch (e) {
      //console.log(e);
    }
  }
  get_all_moves(board, movePiece) {
    let moves = [];
    let pieces = board.get_all_pieces(movePiece);
    ////console.log("pieces -> ",pieces);
    for (var piece of pieces) {
      ////console.log(" piece -->> ", piece);

      var valid_moves = board.get_valid_moves(piece);
      //console.log("valid_Moves ->", valid_moves);
      //console.log("valid moves -")
      if (Object.keys(valid_moves).length > 0) {
        Object.entries(valid_moves).map((entry) => {
          ////console.log(" move -->> ", entry);
          let key = entry[0];
          let value = entry[1];
          ////console.log("key -->", key, " ", value);
          try {
            var temp_board = new Board(false, board.board);
            var temp_piece = temp_board.get_piece(piece.row, piece.col);
            var new_board = this.simulate_move(
              temp_piece,
              key,
              temp_board,
              value
            );
            moves.push(new_board);
          } catch (e) {
            console.log(e);
          }
        });
        ////console.log("key -->> ", key[1], key[2]);
        //draw_moves(game, board, piece)
      }
    }
    return moves;
  }

  simulate_move(piece, move, board, skip) {
    ////console.log(" move -> ", move);
    ////console.log(" skip -> ", JSON.stringify(skip));
    //board.move(piece, parseInt(move[0]), parseInt(move[2]));
    board.move(piece, parseInt(move[0]), parseInt(move[2]));

    if (!skip.length.length) {
      skip = [[[]]];
    } else {
      if (skip[0][0].pieceNumber != undefined) {
        console.log("skip -> ", skip);
        board.remove([skip[0][0]]);
        //console.log("inside the board remove");
      } else if (skip[0][0][0].pieceNumber != undefined) {
        console.log("skip2 -> ", skip);
        board.remove([skip[0][0]]);
      }
    }

    return board;
  }
  findTileId(position) {
    return this.tileIdarray[position[0] + " " + position[1]];
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
      ////console.log("Server response of saving winner-> ",body);
      //this.broadcast("winner",{winner: this.winnerName});
    } catch (err) {
      ////console.log(err);
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
        this.disconnect();
      } else if (this.turnCountPlayer2 >= 3) {
        console.log(
          "someonemissedThreeTurns1 -> ",
          this.turnCountPlayer1,
          " ",
          this.turnCountPlayer2
        );
        this.broadcast("MissedThreeTurns", { playerTurn: 2 });
        this.disconnect();
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
  // onNextTurnTimer() {
  //   if (this.turnTimer) this.turnTimer.clear();

  //   this.turnTimer = this.clock.setTimeout(() => {
  //     if (this.state.turnIndex == 1) {
  //       this.turnCountPlayer1++;
  //     } else if (this.state.turnIndex == 2) {
  //       this.turnCountPlayer2++;
  //     }
  //     ////console.log("turnChanging -> ", this.turnCountPlayer1, " ", this.turnCountPlayer2);
  //     if (this.turnCountPlayer1 >= 3 || this.turnCountPlayer2 >= 3) {
  //       ////console.log("someonemissedThreeTurns -> ", this.turnCountPlayer1, " ", this.turnCountPlayer2);
  //       this.broadcast("Disconnect");
  //     } else {
  //       ////console.log("turnChanging1 -> ", this.turnCountPlayer1, " ", this.turnCountPlayer2);
  //       this.broadcast("turnChangeAfterTimeUp");
  //     }
  //   }, 30000);
  // }
  findIfMovePossible(pieces) {
    try {
      console.log("pieces -> ", JSON.stringify(pieces));
      let moves = [];
      for (var piece of pieces) {
        var validMoves = this.board.get_valid_moves(piece);
        if (Object.keys(validMoves).length > 0) {
          Object.entries(validMoves).map((entry) => {
            let key = entry[0];
            let value = entry[1];
            console.log(" find move -->> ", value);

            if (value[0].length) {
              moves.push([piece, key, value]);
            }
          });
        }
      }

      return moves;
    } catch (e) {
      console.log(e);
    }
  }
  setEvents() {
    this.onMessage("playerTurnChange", (client, message) => {
      console.log(
        "updatingTurnIndexAI",
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
      ////console.log("updatingTurnIndex", message.playerTurn);
      this.state.turnIndex = message.playerTurn;
      ////console.log("updatingTurnIndex2", this.state.turnIndex);
      this.onNextTurnTimer();
      // let otherclient: Client = this.state.getOtherClient(this.clients, client);
      client.send("PlayerTurn", { playerTurn: message.playerTurn });
      if (message.playerTurn == 1) {
        console.log("AI turn");
        try {
          let iterator = true,
            needAIorMove = true;
          const width = 8;
          while (iterator) {
            var olderPieces = this.board.get_all_pieces(1);
            var canMove = this.findIfMovePossible(olderPieces);
            console.log("can It move then move0 -> ", JSON.stringify(canMove));
            var newPosition, oldPosition, pieceId, tileId;
            //canDoubleJump = [];
            if (canMove.length && canMove != null) {
              needAIorMove = false;
              console.log("can It remove then remove -> ", canMove[0][2][0][0]);

              oldPosition = [canMove[0][0].row, canMove[0][0].col];

              pieceId = canMove[0][0].uniqueID;
              let pieceKingOrNotbefore = canMove[0][0].king;
              this.board.move(
                canMove[0][0],
                parseInt(canMove[0][1][0]),
                parseInt(canMove[0][1][2])
              );
              newPosition = [
                parseInt(canMove[0][1][0]),
                parseInt(canMove[0][1][2]),
              ];
              let pieceKingOrNotAfter = canMove[0][0].king;
              if (!pieceKingOrNotbefore && pieceKingOrNotAfter) {
                console.log("AI piece becoming king");
                iterator = false;
              }
              if (canMove[0][2][0][0].row != undefined) {
                this.board.remove([canMove[0][2][0][0]]);
                //canDoubleJump = this.findIfMovePossible([canMove[0][0]]);
              } else if (canMove[0][2][0][0][0].row != undefined) {
                this.board.remove([canMove[0][2][0][0][0]]);
                //canDoubleJump = this.findIfMovePossible([canMove[0][0]]);
              }
              console.log("old - new position -> ", oldPosition, newPosition);
              var indexToTurnzero = oldPosition[1] + width * oldPosition[0];
              var indexToTurnone = newPosition[1] + width * newPosition[0];

              this.state.board[indexToTurnzero] = 0;
              this.state.board[indexToTurnone] = 1;
              tileId = this.findTileId(newPosition);

              // //console.log("board --> ", indexToTurnone);
              // //console.log("board 1--> ", indexToTurnzero);
              ////console.log("new_board --> ", new_board[1].board);
              //this.state.ai_move(new_board);
              // for(var i = 0; i < this.state.board.length; i++){
              //     ////console.log(i+1," ->boardArray-> ", " ",this.state.board[i]);
              // }
              // let otherclient: Client = this.state.getOtherClient(this.clients, client);
              //console.log("tile ID --> ", tileId)
              client.send("updateBoardAI", {
                tileId: tileId,
                pieceId: pieceId,
              });
              //console.log(this.board);
            } else {
              iterator = false;
              if (needAIorMove) {
                var new_board = this.minimax(this.board, 2, true);
                ////console.log(" evaluation -> ", new_board[0]);
                //console.log(" new_board ", new_board[1]);
                this.board = new_board[1];
                var pieces = this.board.get_all_pieces(1);

                olderPieces.forEach((piece) => {
                  pieces.forEach((piece1) => {
                    if (piece.uniqueID == piece1.uniqueID) {
                      if (piece.row != piece1.row && piece.col != piece1.col) {
                        oldPosition = [piece.row, piece.col];
                        newPosition = [piece1.row, piece1.col];
                        pieceId = piece.uniqueID;
                      }
                    }
                  });
                });
                console.log("old - new position -> ", oldPosition, newPosition);
                var indexToTurnzero = oldPosition[1] + width * oldPosition[0];
                var indexToTurnone = newPosition[1] + width * newPosition[0];
                this.state.board[indexToTurnzero] = 0;
                this.state.board[indexToTurnone] = 1;
                tileId = this.findTileId(newPosition);
                // //console.log("board --> ", indexToTurnone);
                // //console.log("board 1--> ", indexToTurnzero);
                ////console.log("new_board --> ", new_board[1].board);
                //this.state.ai_move(new_board);
                // for(var i = 0; i < this.state.board.length; i++){
                //     ////console.log(i+1," ->boardArray-> ", " ",this.state.board[i]);
                // }
                // let otherclient: Client = this.state.getOtherClient(this.clients, client);
                //console.log("tile ID --> ", tileId)
                client.send("updateBoardAI", {
                  tileId: tileId,
                  pieceId: pieceId,
                });
              }
            }
          }

          //console.log("canDoubleJump -> ", canDoubleJump);
          // if (canDoubleJump.length && canDoubleJump != null) {
          //   var waitTillfirstMove = setTimeout(() => {
          //     clearTimeout(waitTillfirstMove);
          //     console.log(
          //       "can It remove then remove -> ",
          //       canDoubleJump[0][2][0][0]
          //     );

          //     oldPosition = [canDoubleJump[0][0].row, canDoubleJump[0][0].col];

          //     pieceId = canDoubleJump[0][0].uniqueID;
          //     this.board.move(
          //       canDoubleJump[0][0],
          //       parseInt(canDoubleJump[0][1][0]),
          //       parseInt(canDoubleJump[0][1][2])
          //     );
          //     newPosition = [
          //       parseInt(canDoubleJump[0][1][0]),
          //       parseInt(canDoubleJump[0][1][2]),
          //     ];
          //     if (canDoubleJump[0][2][0][0].row != undefined) {
          //       this.board.remove([canDoubleJump[0][2][0][0]]);
          //       // canDoubleJump = this.findIfMovePossible([canDoubleJump[0][0]]);
          //     } else if (canDoubleJump[0][2][0][0][0].row != undefined) {
          //       this.board.remove([canDoubleJump[0][2][0][0][0]]);
          //       // canDoubleJump = this.findIfMovePossible([canDoubleJump[0][0]]);
          //     }
          //     //console.log(this.board);
          //     console.log(oldPosition, newPosition);
          //     indexToTurnzero = oldPosition[1] + width * oldPosition[0];
          //     indexToTurnone = newPosition[1] + width * newPosition[0];
          //     this.state.board[indexToTurnzero] = 0;
          //     this.state.board[indexToTurnone] = 1;
          //     tileId = this.findTileId(newPosition);
          //     client.send("updateBoardAI", {
          //       tileId: tileId,
          //       pieceId: pieceId,
          //     });
          //   }, 3000);
          // }
        } catch (e) {
          console.log("logging ai exception -> ", e);
        }
      }
    });
    this.onMessage("Left", (client, message) => {
      try {
        ////console.log("Client has Left the game");
        // let otherclient: Client = this.state.getOtherClient(this.clients, client);
        // otherclient.send('Disconnect',{LeftPlayer: client});
        this.onLeave(client, true);
      } catch (e) {
        ////console.log("error is --> ",e);
      }

      // this.state.turnIndex = message.playerTurn;
      // client.send("PlayerTurn",{playerTurn: this.state.turnIndex});
    });
    this.onMessage("pieceToRemove", (client, message) => {
      console.log("pieceToremove -> ", message.pieceToRemove);
      //console.log(this.board);
      var piece = this.board.get_piece(
        message.pieceToRemove[0],
        message.pieceToRemove[1]
      );
      console.log("pieceToremove1 -> ", piece);
      if (piece != 0) {
        this.board.remove([piece]);
      }
    });
    this.onMessage("boardUpdate", (client, message) => {
      ////console.log("updating Board", JSON.stringify(message));
      try {
        var position = message.position;
        var tileposition = message.tilePosition;
        var player = message.player;
        const width = 8;
        var indexToTurnzero = position[1] + width * position[0];
        var indexToTurnone = tileposition[1] + width * tileposition[0];
        this.state.board[indexToTurnzero] = 0;
        this.state.board[indexToTurnone] = player;
        console.log("board updated", position, tileposition);
        this.board.move(
          this.board.get_piece(position[0], position[1]),
          tileposition[0],
          tileposition[1]
        );

        console.log(
          "lastpiecemoved -> ",
          JSON.stringify(this.board.get_piece(tileposition[0], tileposition[1]))
        );
      } catch (e) {
        console.log(e);
      }

      //this.state.board = message.playerTurn;
      // client.send("boardUpdatee",{playerTurn: this.state.turnIndex});
    });
    this.onMessage("selectedPiece", (client, message) => {
      ////console.log("saving selected Piece");
      this.selectedPiece = message.selectedPiece;
      this.tileID = message.tileId;
      ////console.log("selected Piece saved -->",this.selectedPiece);
    });
    this.onMessage("returnMypiece", (client, message) => {
      ////console.log("returnMypiece");

      //player.myPiece = this.playerCount + 1;
      client.send("yourPiece", { myPiece: 2 });
      ////console.log("Player myPiece: ", this.myPiece);
      client.send("gameStart", {
        playercount: 2,
      });
    });
    this.onMessage("Winner", (client, message) => {
      console.log("winner---->", message.winner);
      this.winnerName = message.winner;
      if (this.player1userId == parseInt(message.userid)) {
        this.winnerUserId = this.player1userId;
        this.looseruserId = this.player2userId;
      } else if (this.player2userId == parseInt(message.userid)) {
        this.winnerUserId = this.player2userId;
        this.looseruserId = this.player1userId;
      }
      this.disconnect();
      //this.saveWinnerDb();
    });
  }
  // When a client leaves the room
  onLeave(client: Client, consented: boolean) {
    try {
      let player = this.getPlayer(client).player;
      player.connected = false;
      if (consented) {
        throw new Error("consented leave");
      }
      // allow disconnected client to reconnect into this room until 5 seconds

      this.allowReconnection(client, 120);

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

  // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
  onDispose() {
    ////console.log("room on disposed");
  }
}
