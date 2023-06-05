import http from "http";
import express from "express";
import serveIndex from "serve-index";
import cors from "cors";
import { Server, matchMaker } from "colyseus";
import { GameRoom } from "./src/game-room";
// import { FriendInvite } from "./src/friend-invite";
import { TournamentGameRoom } from "./src/tournamentGameRoom";
import { TournamentLobbyRoom } from "./src/tournamentLobbyRoom";
import { LobbyRoom } from "./src/lobby";
import path from "path";
import { playWithFriends } from "./src/PlayWFriendsLobby";
import basicAuth from "express-basic-auth";
import { monitor } from "@colyseus/monitor";
import { CheckersAIRoom } from "./src/checkersAI";
import { ChampionshipLobbyRoom } from "./src/championshipLobbyRoom";
import { ChampionshipGameRoom } from "./src/championshipGameRoom";
// import { apiService } from "./src/GamePlay/api";
// config for your database

const app = express();
const port = Number(process.env.PORT || 3002);

app.use(cors());
//app.use(express.json());

const server = http.createServer(app);
const gameServer = new Server({
  server: server,
  express: app,
  pingInterval: 1000,
});
// app.post("/createTournamentRound", apiService.createTournamentRouond);

gameServer.define("game", GameRoom);
gameServer.define("lobby", LobbyRoom);
gameServer.define("playWithFriends", playWithFriends);
gameServer.define("AI", CheckersAIRoom);
gameServer.define("tournamentGameRoom", TournamentGameRoom);
gameServer.define("tournamentLobbyRoom", TournamentLobbyRoom);
gameServer.define("championshipGameRoom", ChampionshipGameRoom);
gameServer.define("championshipLobbyRoom", ChampionshipLobbyRoom);
// gameServer.define("friendInvite", FriendInvite);

const basicAuthMiddleware = basicAuth({
  // list of users and passwords
  users: {
    admin: "admin",
  },
  // sends WWW-Authenticate header, which will prompt the user to fill
  // credentials in
  challenge: true,
});

app.use("/colyseus", basicAuthMiddleware, monitor());
app.use("/", express.static(path.join(__dirname, "static")));
app.use("/", serveIndex(path.join(__dirname, "static"), { icons: true }));
console.log(`Listening on ws://localhost:${port}`);
gameServer.listen(port);
