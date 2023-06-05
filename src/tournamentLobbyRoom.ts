import { Room, matchMaker, Client } from "colyseus";
// import {  State} from './State';
import { HttpClient, HttpClientResponse } from "typed-rest-client/HttpClient";
import axios from "axios";
import { Events } from "./events";
//import { Game } from "./GamePlay/game";
import { IHeaders } from "typed-rest-client/Interfaces";
import { tournamentSingletonClass } from "./GamePlay/tournamentHandler";
import { MapSchema } from "@colyseus/schema";
//import { SingletonClass } from "./GamePlay/tournamentHandler";
const schema = require("@colyseus/schema");
const { defineTypes, Schema } = schema;

export class Player extends Schema {
  players: MapSchema<Player> = new MapSchema<Player>();
  phase: string;
}

export class State extends Schema {
  players: MapSchema<Player> = new MapSchema<Player>();
  phase: string;
}

interface MatchmakingGroup {
  roomId: number;
  clients: ClientStat[];
  priority?: boolean;
  playerCount?: number;
  ready?: boolean;
  confirmed?: number;
  active?: boolean;

  // cancelConfirmationTimeout?: Delayed;
}

interface ClientStat {
  client: Client;

  waitingTime: number;
  options?: any;
  group?: MatchmakingGroup;
  roomId: number;
  userID: number;
  confirmed?: boolean;
  userName: string;
  avatar: string;
}

defineTypes(State, {
  whatever: "string",
});

export interface IRequestOptions {
  // defaults to application/json
  // common versioning is application/json;version=2.1
  acceptHeader?: string;
  // since accept is defaulted, set additional headers if needed
  additionalHeaders?: IHeaders;

  responseProcessor?: Function;
  //Dates aren't automatically deserialized by JSON, this adds a date reviver to ensure they aren't just left as strings
  deserializeDates?: boolean;
}

export class TournamentLobbyRoom extends Room<State> {
  /**
   * after this time, create a match with a bot
   */
  gameLobby = {
    2: [],
    3: [],
    4: [],
  };
  availablePlayers = [];
  playersInGame = {};
  maxWaitingTime = 15 * 1000;

  /**
   * after this time, try to fit this client with a not-so-compatible group
   */
  maxWaitingTimeForPriority?: number = 10 * 1000;

  /**
   * number of players on each match
   */
  numClientsToMatch = 0;

  /**
   * Groups of players per iteration
   */
  matchingGroups: MatchmakingGroup[] = [];

  /**
   * If `allowUnmatchedGroups` is true, players inside an unmatched group (that
   * did not reached `numClientsToMatch`, and `maxWaitingTime` has been
   * reached) will be matched together. Your room should fill the remaining
   * spots with "bots" on this case.
   */
  allowUnmatchedGroups: boolean = true;
  /**
   * Evaluate groups for each client at interval
   */
  evaluateGroupsInterval = 1000;

  /**
   * name of the room to create
   */
  roomToCreate = "tournamentGameRoom";

  /**
   * coin and group cache per-player
   */
  stats: ClientStat[] = [];

  // maxClients = 100;
  playerCount: number = 0;

  playerBidsRecieved: number = 0;
  eventHandler: Events;
  activePlayerIndex: number = 0;
  userName: string;
  client1: any;
  client2: any;
  client3: any;
  client4: any;
  clientArray: any;
  tournamentHandler: tournamentSingletonClass;
  tournamentStartTime: any;
  //roomCreated = [];
  round: number ;
  onCreate(options) {
    this.tournamentHandler = tournamentSingletonClass.getInstance();
    this.roomId = options.t_id + '_' + this.roomId;
    this.tournamentHandler.addLobbyRoomData(this.roomId, this);
    this.reset();
    this.eventHandler = new Events(this);
    this.setEvents();
    console.log("Create Tournament lobby");
  }

  async onJoin(client: Client, options: any) {
    try {
      
      var arrangeRoomcreated = this.tournamentHandler.checkIfRoomCreated(options.t_id+'_');
      if(arrangeRoomcreated){
        let dataString = {
          tId: options.t_id,
        };
        
        this.tournamentStartTime = new Date(options.tournamentStartTime);
        //let _http: HttpClient = new HttpClient("typed-test-client-tests");
        //process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
        let finalUrl =
          "https://admin.mojogos.ao:8443/admin-panel/tournament/registeredUsers/list";
        await axios.post(finalUrl, dataString).then((data) => {
          console.log('response-> ',data.data)
          this.tournamentHandler.arrangeRoom( data.data, options.t_id, this.tournamentStartTime);
          this.round = this.tournamentHandler.getRound(options.t_id);
        });
        var checkIfIcanPlay = this.tournamentHandler.ifGameStartedorNotInRound(options.t_id, this.round, options.userID);
        console.log(checkIfIcanPlay);
        if(this.round == 1){
          let roomtojoin = this.tournamentHandler.getRoomDataFirstRound(
            options.userID,
            options.t_id+'_'+this.round,
          );
          console.log("roomtojoin -> ", roomtojoin);
          client.send("waitingForPlayers", {
            sessionId: client.id,
            roomId: roomtojoin.roomId
          });
          console.log("inside onJoin  <-->");
        }
        // if(checkIfIcanPlay == true){
        //   let roomtojoin = this.tournamentHandler.getRoomDataFirstRound(
        //     options.userID,
        //     options.t_id+'_'+this.round,
        //   );
        //   console.log("roomtojoin -> ", roomtojoin);
        //   client.send("waitingForPlayers", {
        //     sessionId: client.id,
        //     roomId: roomtojoin.roomId
        //   });
        //   console.log("inside onJoin  <-->");
        // }else if (checkIfIcanPlay == false){
        //   console.log("can not play");
        //   client.send("NotInTournamentOrRoundAllreadyStarted");
        // }
      }
      else{
        this.round = this.tournamentHandler.getRound(options.t_id);
        let lastRoundTemp = this.tournamentHandler._roomsCreatedForTournament.get(options.t_id+'_'+this.round);
        let lastRound : boolean = false;
        if(lastRoundTemp && lastRoundTemp.length && lastRoundTemp.length == 1) lastRound = true;
        console.log("lastRoundcheck lobby ", lastRound);
        if(this.round == 1){
          let roomtojoin = this.tournamentHandler.getRoomDataFirstRound(
            options.userID,
            options.t_id+'_'+this.round,
          );
          console.log("roomtojoin -> ", roomtojoin);
          client.send("waitingForPlayers", {
            sessionId: client.id,
            roomId: roomtojoin.roomId,
            lastRound: lastRound
          });
        }
        // var checkIfIcanPlay = this.tournamentHandler.ifGameStartedorNotInRound(options.t_id, this.round, options.userID);
        // console.log(checkIfIcanPlay);
        // if(checkIfIcanPlay == true){
        //   let roomtojoin = this.tournamentHandler.getRoomDataFirstRound(
        //     options.userID,
        //     options.t_id+'_'+this.round,
        //   );
        //   console.log("roomtojoin -> ", roomtojoin);
        //   client.send("waitingForPlayers", {
        //     sessionId: client.id,
        //     roomId: roomtojoin.roomId
        //   });
        // }else if (checkIfIcanPlay== false){
        //   console.log("can not play");
        //   client.send("NotInTournamentOrRoundAllreadyStarted");
        // }
          console.log("inside onJoin  <-->");
      }
      this.clients.forEach((clients, index) => {
        if(clients.id == client.id) {
          this.clients[index].id = options.userId;
        }
      });
      
    } catch (e) {
      console.log("Error in onJoin >>>>", e);
    }
  }

  
  onLeave(client: Client) {
  }

  setEvents() {
    this.onMessage("startGame", (client, message) => {
      console.log("startGame and Go to next sscreen", message);
      this.broadcast("startgame", { except: client });
    });
  }

  onDispose() {
    console.log("lobby destroyed!");
  }

  reset() {
    let state = new State();
    this.playerCount = 0;
    state.phase = "waiting";

    this.setState(state);
  }
}
// [{"tId":590,"userId":666473,"roomName":"ludofiesttourneytest_590_606_0","roomId":607,"createdAt":"2022-07-27T07:52:04.720+00:00","modifiedAt":"2022-07-27T07:52:04.720+00:00"}
// ,{"tId":590,"userId":122522,"roomName":"ludofiesttourneytest_590_606_0","roomId":607,"createdAt":"2022-07-27T07:52:04.720+00:00","modifiedAt":"2022-07-27T07:52:04.720+00:00"}
// ,{"tId":590,"userId":387551,"roomName":"ludofiesttourneytest_590_606_0","roomId":607,"createdAt":"2022-07-27T07:52:04.720+00:00","modifiedAt":"2022-07-27T07:52:04.720+00:00"}
// ,{"tId":590,"userId":747103,"roomName":"ludofiesttourneytest_590_606_1","roomId":611,"createdAt":"2022-07-27T07:52:04.720+00:00","modifiedAt":"2022-07-27T07:52:04.720+00:00"}
// ,{"tId":590,"userId":782093,"roomName":"ludofiesttourneytest_590_606_1","roomId":611,"createdAt":"2022-07-27T07:52:04.720+00:00","modifiedAt":"2022-07-27T07:52:04.720+00:00"}]
