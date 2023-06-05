import { Room, matchMaker, Client } from "colyseus";
import { HttpClient } from "typed-rest-client/HttpClient";
// import { NodeStringDecoder } from "string_decoder";

interface rooms {
  roomID: string;
  userID: number;
  t_id: string;
  active: boolean;
}
interface Tournament {}

export class ChampionshipSingletonClass {
  private static _instance: ChampionshipSingletonClass;
  private rooms = new Map<string, Array<any>>();
  private lobbys = new Map<String, Room>();
  private _score: number = 0;
  private _roomDict = {};
  private _round = new Map<string, number>();
  public _roomsCreatedForChampionship = new Map<string, any>();
  private _lobbyTimers = new Map<string, boolean>();
  // private gameRoomsCreated = [];
  // private stats: ClientStat[] = [];
  private constructor() {
    if (ChampionshipSingletonClass._instance) {
      throw new Error(
        "Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new."
      );
    }
    ChampionshipSingletonClass._instance = this;
  }

  public static getInstance(): ChampionshipSingletonClass {
    if (
      ChampionshipSingletonClass._instance == null ||
      ChampionshipSingletonClass._instance == undefined
    ) {
      ChampionshipSingletonClass._instance = new ChampionshipSingletonClass();
    }
    return ChampionshipSingletonClass._instance;
  }

  //add rooms to our room map
  public addGameRoomData(key: string, value: Array<any>): void {
    this.rooms.set(key, value);
  }
  //add lobby rooms to our lobby room map
  public addLobbyRoomData(key: string, value: any): void {
    this.lobbys.set(key + "_", value);
    console.log("Lobby room saved successfully key-> ", key);
  }
  public checkIfRoomCreated(key: string): boolean {
    for (const [keyOfRooms, value] of this._roomsCreatedForChampionship) {
      if (keyOfRooms.startsWith(key)) {
        console.log("this room already created");
        return false;
      }
    }
    console.log("room need to be created");
    return true;
  }
  async saveWinnerDb(winner, t_id, round) {
    try {
      let param: any;
      let entries: any[] = [];
      let winners = [];

      if (!winner.length) {
        for (const [key, value] of this._roomsCreatedForChampionship) {
          if (key.startsWith(t_id + "_" + round)) {
            let roomObject = this._roomsCreatedForChampionship.get(key);
            console.log("roomEntry -> ", roomObject);
            roomObject.forEach((roomObj) => {
              var entry = {
                roomId: roomObj.roomID,
                tId: parseInt(t_id),
                round: parseInt(round),
                userId: parseInt(roomObj.userID),
                roomName: roomObj.roomID,
                isCompleted: false,
              };
              entries.push(entry);
              console.log("roomEntry -> ", entry);
            });
          }
        }
        param = [
          {
            entries: entries,
            winners: [],
          },
        ];
      } else if (winner.length) {
        console.log("tourny ended saving winners!");
        for (const [key, value] of this._roomsCreatedForChampionship) {
          if (key.startsWith(t_id + "_" + round)) {
            let roomObject = this._roomsCreatedForChampionship.get(key);
            roomObject.forEach((roomObj) => {
              var entry = {
                roomId: parseInt(roomObj.roomID),
                tId: parseInt(t_id),
                round: parseInt(round),
                userId: parseInt(roomObj.userID),
                roomName: roomObj.roomID,
                isCompleted: true,
              };
              entries.push(entry);
              console.log("roomEntry1 -> ", entry);
            });
          }
        }

        if (winner.length == 2) {
          param = [
            {
              entries: entries,
              winners: [
                {
                  userId: winner[0].userId,
                  position: "First",
                  tId: t_id,
                },
                {
                  userId: winner[1].userId,
                  position: "Second",
                  tId: t_id,
                },
              ],
            },
          ];
        } else if (winner.length == 1) {
          param = [
            {
              entries: entries,
              winners: [
                {
                  userId: winner[0].userId,
                  position: "First",
                  tId: t_id,
                },
              ],
            },
          ];
        }
      } else {
        console.log(
          "Bad Request in tournament details save ",
          winner,
          " t ID - ",
          t_id
        );
      }

      let dataString = JSON.stringify(param);
      console.log("saving winner ", JSON.stringify(param));
      let _http: HttpClient = new HttpClient("typed-test-client-tests");
      //process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
      let finalUrl =
        "https://admin.mojogos.ao:8443/admin-panel/tournament/tournamentStartEntries";
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
  public arrangeRoom(value: any, t_id: string, tournamentStartTime: any): void {
    var round = this.getRound(t_id);
    if (value.length < 1) {
      return;
    } else if (value.length == 1) {
      console.log("tournaMent Ended.", value);
      for (const [key, room] of this.lobbys) {
        if (key.startsWith(t_id)) {
          room.broadcast("tournamentEndedOnePlayerJoin", {
            winner: value[0],
          });
        }
      }
      this.saveWinnerDb(value, t_id, round);
    } else {
      console.log("this round => ", round);
      if (round == null) {
        this.setRound(t_id, 1);
        round = 1;
      } else {
        this.setRound(t_id, round + 1);
        round = round + 1;
      }

      var roomNameString = t_id + "_" + round;
      console.log("value -> ", value);
      var playerPerRoom = 2;
      var minPlayerPerRoom = 2;
      var totalRooms = Math.floor(value.length / playerPerRoom);
      var extraPlayer = value.length % playerPerRoom;
      var rooms: Array<number> = [];
      console.log("value.length -> ", value.length);
      console.log("totalRooms -> ", totalRooms);
      console.log("extraPlayer -> ", extraPlayer);
      if (extraPlayer < minPlayerPerRoom && totalRooms > 0 && extraPlayer > 0) {
        totalRooms--;
        extraPlayer = extraPlayer + playerPerRoom;
        if (extraPlayer % 2 == 1) {
          extraPlayer = Math.floor(extraPlayer / 2);
          rooms.push(extraPlayer + 1);
          rooms.push(extraPlayer);
        } else {
          extraPlayer = Math.floor(extraPlayer / 2);
          rooms.push(extraPlayer);
          rooms.push(extraPlayer);
        }
        console.log("rooms Count 0 -> ", rooms);
        extraPlayer = 0;
      }
      if (extraPlayer > 0) {
        rooms.push(extraPlayer);
        console.log("rooms Count 1 -> ", rooms);
      }
      for (var i = 0; i < totalRooms; ++i) {
        rooms.push(playerPerRoom);
        console.log("rooms Count 2 -> ", rooms);
      }
      // var tournamentRound = new tournamentRound();
      // var tr = tournamentRound.addTournamentRound(key,rooms);
      var countRoom = 0;
      var countPlayer = 0;
      var roomsCreated: Array<rooms> = [];
      console.log("rooms Count -> 3 ", rooms);
      let lastRound = false;
      if (rooms.length == 1) {
        lastRound = true;
      }
      // create rooms for every playser registered on new Round
      for (var j of rooms) {
        // var roomName: String = key+"_"+tr.getID()+"_"+countRoom;
        var room = roomNameString + "_" + countRoom + "_";
        for (var k = 0; k < j; ++k) {
          //get and set user Id

          roomsCreated.push({
            roomID: room,
            userID: value[countPlayer].userId,
            t_id: t_id,
            active: false,
          });
          countPlayer++;
        }
        countRoom = countRoom + 1;
        matchMaker.createRoom("championshipGameRoom", {
          roomId: room,
          playerCount: j,
          tournamentStartTime: tournamentStartTime,
          t_id: t_id,
          lastRound: lastRound,
        });
      }

      this._roomsCreatedForChampionship.set(roomNameString + "_", roomsCreated);
      if (!lastRound) this.timerForGameStartLobby(t_id, round, countRoom);

      if (round > 1) {
        setTimeout(() => {
          for (const [key, value] of this.lobbys) {
            if (key.startsWith(t_id)) {
              value.broadcast("newRoundStart", {
                rooms: roomsCreated,
                lastRound: lastRound,
              });
            }
          }
          this.saveWinnerDb([], t_id, round);
        }, 5000);
      }
    }
  }
  public timerForGameStartLobby(
    t_id: string,
    round: number,
    roomcount: number
  ) {
    try {
      var winnerArray = [];
      console.log("starting Timer to keep an eye -> ");
      var roomCount = roomcount;
      let closedRooms = {};
      var tournamentTimer = setInterval(() => {
        var t_Id = t_id;
        var tournamentrooms = this.getRoomByTournmnetandRoundId(t_id, round);
        console.log("winnerArray -> ", winnerArray);
        console.log("roomCount -> ", roomCount);
        console.log("closedRooms -> ", closedRooms);
        for (const [key, value] of tournamentrooms) {
          if (key.startsWith(t_id + "_" + round + "_")) {
            // console.log(value);
            // var allGottisOfeveryOngoingGame = value[0].returnAllGottis();
            //console.log("allGottisOfeveryOngoingGame -> ", allGottisOfeveryOngoingGame);
            var roomClosed = value[1];
            console.log("roomClosed -> ", roomClosed);
            if (roomClosed) {
              
              if (value && value[2]) {
                if (value[2].userId != 0 && value[2].userId != null) {
                  let winner = this.rooms.get(key)[2];
                  var found = false;
                  for (var i = 0; i < winnerArray.length; i++) {
                    if (winnerArray[i].userId == winner.userId) {
                      found = true;
                      break;
                    }
                  }
                  if (!found) {
                    closedRooms[key] = value[1];
                    console.log("new Winner -> ", winner);
                    roomCount--;
                    for (const [key, value] of this.lobbys) {
                      console.log("this.lobbys ", key);
                      if (key.startsWith(t_id)) {
                        console.log("waiting for next round.");
                        value.broadcast("waitForNewRoundToStart", {
                          winner: winner,
                          winnersLeft: roomCount,
                          // allPlayerGottis: allGottisOfeveryOngoingGame,
                        });
                      }
                    }
                    if (winner.userId != null) winnerArray.push(winner);
                  }
                } else if (value[2].userID == null) {
                  var found = false;
                  Object.keys(closedRooms).forEach((key1) => {
                    if (key1 == key) {
                      console.log("Found.");
                      found = true;
                    }
                  });
                  console.log(
                    "room found ended with no user subtaracting the room count -> ",
                    closedRooms,
                    found
                  );
                  if (!found) {
                    closedRooms[key] = value[1];
                    roomCount--;
                  }
                }
              }
            }
          }
        }

        console.log("roomCount 1-> ", roomCount);
        console.log("winnerArray -> ", winnerArray);
        if (roomCount == 0) {
          clearInterval(tournamentTimer);
          this.arrangeRoom(winnerArray, t_Id, null);
        }
      }, 1000);
    } catch (error) {
      console.log(
        "error inside timer For Game Start Lobby Tournament -> ",
        error
      );
    }
  }
  public setRound(key: string, value: number): void {
    this._round.set(key + "_", value);
  }
  public getRound(t_id: string): number {
    let round: number;
    for (const [key, value] of this._round) {
      console.log("getRound -> ", key + " = " + value);
      if (key.startsWith(t_id + "_")) {
        round = value;
      }
    }
    return round;
    //return this._round;
  }
  public setRoomActive(tId, roundId, roomId): void {
    this._roomsCreatedForChampionship
      .get(tId + "_" + roundId + "_")
      .forEach((room) => {
        if (room.roomID === roomId) {
          room.active = true;
        }
      });
  }
  public ifGameStartedorNotInRound(tId, roundId, userId): boolean {
    var check = false;
    this._roomsCreatedForChampionship
      .get(tId + "_" + roundId + "_")
      .forEach((room) => {
        if (room.userID == userId) {
          if (room.active != true) {
            check = true;
          }
        }
      });
    return check;
  }
  public getRoomDataFirstRound(userId: string, roomKey: string): any {
    var roomId: string;
    let playerCount: number = 0;
    for (const [key, value] of this._roomsCreatedForChampionship) {
      console.log(key + " = " + JSON.stringify(value));
      if (key.startsWith(roomKey + "_")) {
        for (let i = 0; i < value.length; i++) {
          console.log(value[i].userID + " = " + userId);
          if (value[i].userID == userId) {
            roomId = value[i].roomID;
          }
        }
      }
    }
    for (const [key, value] of this._roomsCreatedForChampionship) {
      console.log(key + " = " + value);
      if (key.startsWith(roomKey + "_")) {
        for (let i = 0; i < value.length; i++) {
          console.log(value[i].roomID + " = " + roomId);
          if (value[i].roomID == roomId) {
            playerCount++;
          }
        }
      }
    }
    let info = {
      roomId: roomId,
      playerCount: playerCount,
    };
    console.log(" room ID & playerCountin room -> ", info);
    return info;
  }
  public getPlayersByTournment(key: string): Map<string, Room> {
    let roomsToReturn = new Map<string, Room>();
    console.log("key -> ", key);
    for (const [key, value] of this.rooms) {
      console.log(key + " = " + value);
      if (key.startsWith(key + "_")) {
        console.log("room match found");
        roomsToReturn.set(key, value[0]);
      }
    }
    return roomsToReturn;
  } //it will match ti_id and retne all roms for that tonramnet

  public getRoomByTournmnetandRoundId(
    t_id: string,
    round_id: number
  ): Map<string, Array<any>> {
    let roomsToReturn = new Map<string, Array<any>>();
    for (const [key, value] of this.rooms) {
      //console.log(key + " = " + value);
      if (key.startsWith(t_id + "_" + round_id + "_")) {
        roomsToReturn.set(key, value);
      }
    }
    return roomsToReturn;
  }
  public sendMesageToTournamnetAndround(
    tournmanet_id: string,
    round_id: string
  ): void {
    // getRoomsByT and R
    // and braodcat
    //let roomsToReturn = new Map<string,Room>();
    for (const [key, value] of this.rooms) {
      console.log(key + " = " + value);
      if (key.startsWith(tournmanet_id + "_" + round_id + "_")) {
        this.rooms.get(key)[0].broadcast("Brodcasting", { value: "hey" });
      }
    }
  }
  public getUsersInTandR(t_id: string, r_id: string): Client[] {
    let users: Client[];
    for (const [key, value] of this.rooms) {
      console.log(key + " = " + value);
      if (key.startsWith(t_id + "_" + r_id + "_")) {
        for (let clients of this.rooms.get(key)[0].clients) {
          users.push(clients);
        }
      }
    }
    return users;
  }
  // public arrangeRooms(t_id: string){

  // }
  public broadcast(message: string, value: any, key: string): void {
    console.log("broadcast Value: ", value);
    this._roomDict[key].broadcast(message, value);
  }
  // public TournamentRoundArrangeRooms(tourny: Tournament){
  //     var trl = this.getLevel(tourny);
  //     var fb = this.getFB(trl);
  //     var sb= fb*2;
  //     var playerPerRoom=4;
  //     var minPlayerPerRoom=2;
  // }
  public getFB(trl): number {
    return 0;
  }
  public getLevel(tourny: Tournament) {}

  public saveUser(client: Client, options: any): void {
    // this.stats.push({
    //     client: client,
    //     coin: parseInt(options.coin),
    //     waitingTime: 0,
    //     userID: parseInt(options.userID),
    //     userName: options.userName,
    //     avatar: JSON.stringify(options.avatar),
    //     options,
    //   });
  }
  // public getStats(): ClientStat[]{
  //     return this.stats;
  // }
  public getRoom(): any {
    let key: any;
    for (let i in this._roomDict) {
      key = this._roomDict[i];
    }
    //  console.log("another room ID",key);
    return key;
  }

  public setScore(value: number): void {
    this._score = value;
  }

  public getScore(): number {
    return this._score;
  }

  public addPoints(value: number): void {
    this._score += value;
  }

  public removePoints(value: number): void {
    this._score -= value;
  }
}
