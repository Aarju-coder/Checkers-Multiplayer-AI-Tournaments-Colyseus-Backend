import { Room, matchMaker, Client } from "colyseus";
// import {  State} from './State';

import { Events } from "./events";

import { IHeaders } from "typed-rest-client/Interfaces";

import { MapSchema } from "@colyseus/schema";
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
  averagePoints: number;
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
  coin: number;
  dbId: number;
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

export class playWithFriends extends Room<State> {
  /**
   * after this time, create a match with a bot
   */
  maxWaitingTime = 15 * 1000;

  /**
   * after this time, try to fit this client with a not-so-compatible group
   */
  maxWaitingTimeForPriority?: number = 10 * 1000;

  /**
   * number of players on each match
   */
  numClientsToMatch = 2;

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
  evaluateGroupsInterval = 5000;

  /**
   * name of the room to create
   */
  roomToCreate = "game";

  /**
   * coin and group cache per-player
   */
  stats: ClientStat[] = [];

  // maxClients = 100;
  playerCount: number = 0;

  playerBidsRecieved: number = 0;
  eventHandler: Events;
  activePlayerIndex: number = 0;
  roomCode: string = "";
  clearInter;
  betAmount: number = 1.9;
  hostSessionId: string;
  entry: number = 1.9;
  rewards: number = 2.74;
  onCreate(options) {
    this.roomCode = "";
    this.reset();
    this.eventHandler = new Events(this);
    this.roomCode = options.roomCode;
    console.log("room code >>>>>> ", options.coin);
    console.log("Create lobby");
    if (options.maxWaitingTime) {
      this.maxWaitingTime = options.maxWaitingTime;
    }
    this.betAmount = parseFloat(options.coin);
    this.entry = parseFloat(options.entry);
    this.rewards = parseFloat(options.reward);

    // if (options.numClientsToMatch) {
    //     this.numClientsToMatch = options.numClientsToMatch;
    // }

    /**
     * Redistribute clients into groups at every interval
     */
    this.setSimulationInterval(
      () => this.recreateGroups(),
      this.evaluateGroupsInterval
    );
  }

  onJoin(client: Client, options: any) {
    try {
      this.playerCount++;
      console.log("room code matched", this.entry, this.rewards);
      if (this.playerCount == 1) {
        this.hostSessionId = client.sessionId;
      }
      if (this.playerCount > this.numClientsToMatch) {
        client.send("roomFull");
      } else if (this.betAmount > options.coin) {
        client.send("lessAmount");
      } else {
        client.send("roomId", {
          roomCode: this.roomId,
          entry: this.entry,
          rewards: this.rewards,
        });
        console.log("room code matched", this.entry, this.rewards);
        let ifExist = this.stats.filter((stat) => stat.dbId === options.dbId);
        if (ifExist.length) {
          client.send("DuplicateUserForceQuit");
          throw new Error("DUPLICATE_USER");
        }

        this.stats.push({
          client: client,
          coin: parseInt(options.coin),
          waitingTime: 0,
          dbId: parseInt(options.dbId),
          userName: options.userName,
          avatar: JSON.stringify(options.avatar),
          options,
        });
      }
    } catch (e) {
      console.log("Error in onJoin >>>>", e);
    }
  }

  addToGroup(client: ClientStat) {
    let bool = false;

    this.matchingGroups.forEach((element) => {
      //console.log("Elment Info: "+element.clients.length);
      if (bool == true) {
        return;
      }
      console.log("Group Status: " + element.active);
      if (element.active) {
        //console.log("Adding to existing");
        element.clients.push(client);
        bool = true;
      }
    });
    if (bool == false) {
      //console.log("Creating Group");
      let group: MatchmakingGroup = {
        clients: [client],
        averagePoints: client.coin,
        active: true,
      };
      this.matchingGroups.push(group);
    }
  }

  recreateGroups() {
    console.log("recreate groups starts>>>>");
    // re-set all groups

    this.matchingGroups = [];

    //console.log("Redistribute group: "+ this.stats.length);

    const stats = this.stats.sort((a, b) => a.coin - b.coin);

    let currentGroup: MatchmakingGroup; //= this.createGroup(this.stats);
    //console.log("Current Group: "+ this.stats);

    let totalPoints = 0;

    for (let i = 0, l = stats.length; i < l; i++) {
      const stat: ClientStat = stats[i];
      // console.log("State player info? "+ stat.coin);
      stat.waitingTime += this.clock.deltaTime;

      /**
       * do not attempt to re-assign groups for clients inside "ready" groups
       */

      this.addToGroup(stat);
    }

    this.matchingGroups.forEach((currentGroup) => {
      if (currentGroup.clients.length === this.numClientsToMatch) {
        currentGroup.ready = true;
        currentGroup.confirmed = 0;
        totalPoints = 0;
      }
    });

    this.checkGroupsReady();
    console.log("recreate groups starts ends>>>>");
  }

  async checkGroupsReady() {
    await Promise.all(
      this.matchingGroups.map(async (group) => {
        if (group.ready) {
          group.ready = true;
          group.confirmed = 1;

          /**
           * Create room instance in the server.
           */
          const room = await matchMaker.createRoom(this.roomToCreate, {
            betAmount: this.betAmount,
          });
          var info = {
            roomId: room.roomId,
            gameMode: "2",
            attributeType: "-1",
            bidAmount: this.betAmount,
          };
          let GamePlayer = [];

          let pos;
          await Promise.all(
            group.clients.map(async (client) => {
              //const matchData = await matchMaker.reserveSeatFor(room, client.options);

              /**
               * Send room data for new WebSocket connection!
               */

              const index = this.stats.findIndex(
                (stat) => stat.client === client.client
              );
              this.stats.splice(index, 1);

              console.log("stats length >>>>>>", this.stats.length);
              let item = {
                sessionId: client.client.sessionId,
                dbId: client.dbId,
              };
              GamePlayer.push(item);

              let userIndex = null;

              let opponentInfo: ClientStat = group.clients.find(
                (item) => item.client != client.client
              );
              console.log(
                "Opponent Info: " +
                  opponentInfo.dbId +
                  " name: " +
                  opponentInfo.userName
              );
              const matchData = await matchMaker.reserveSeatFor(room, {
                coin: client.coin,
                dbId: client.dbId,
                userName: client.userName,
                avatar: client.avatar,
                userIndex: userIndex,
                type: "SEAT",
              });

              client.client.send("ROOMCONNECT", {
                roomId: room.roomId,
                seat: matchData,
                // sessionId: client.client.sessionId,
                userIndex: userIndex,
                oppName: opponentInfo.userName,
                oppAvatar: opponentInfo.avatar,
                oppdbId: opponentInfo.dbId,
                oppSessionId: this.state.players[client.client.id],
                type: "SEAT",
              });
              // client.client.send(room.roomId);
              console.log("after ROOMCONNECT");
              // this.clearInter.clear();
            })
          );
        } else {
          console.log("here in the else checkGroupsReady");
        }
      })
    );
  }

  onLeave(client) {
    console.log("client left", client.sessionId);

    let index = -1;
    index = this.stats.findIndex(
      (stat) => stat.client.sessionId === client.sessionId
    );
    if (index >= 0) {
      console.log("Index: " + index);
      this.stats.splice(index, 1);
    }

    this.matchingGroups.filter((obj) => {
      if (obj.clients[0].client.sessionId === client.sessionId) {
        console.log("Group Info: " + obj.averagePoints);
        obj.active = false;
        return obj;
      }
    });

    this.playerCount--;
  }

  onDispose() {
    console.log("lobby destroyed!");
  }

  reset() {
    let state = new State();

    state.phase = "waiting";

    this.setState(state);
  }
}
