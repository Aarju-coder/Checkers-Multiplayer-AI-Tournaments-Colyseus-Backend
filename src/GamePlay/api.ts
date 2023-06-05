import axios from "axios";
const loopbackLink = "localhost:3000";
import { Server, matchMaker } from "colyseus";
export const apiService = {
  tournamentOnWin: function (roundId, winnerTeamId) {
    console.log(" team Id >>>>>>>>>", roundId, winnerTeamId);
    axios
      .post(loopbackLink + "tournamentOnWin", {
        roundId: roundId,
        winnerTeamId: winnerTeamId,
      })
      .then((res) => {
        let data = res.data;
        console.log("create tournament round");
        if (data.status) {
          console.log("winner team has been send for");
        } else {
          console.log("Server Error");
        }
      })
      .catch((error) => {
        console.error(error);
      });
  },
  createTournamentRouond: async function (req, res) {
    let data = req.body;
    if (data.roundId && data.players.length === 4) {
      const room = await matchMaker.createRoom("tournamentGame", {
        speed: "slow",
        textChat: true,
        voiceChat: true,
        roundId: data.roundId,
      });

      let gamePlayers = [];

      await Promise.all(
        data.players.map(async (client) => {
          const matchData = await matchMaker.reserveSeatFor(room, {
            team: client.team,
            teamId: client.teamId,
            coin: client.coin,
            userId: client.userId,
            userName: client.userName,
            avatar: client.avatar,
            userIndex: client.userIndex,
            type: "SEAT",
          });

          /**
           * Send room data for new WebSocket connection!
           */
          gamePlayers.push({
            id: client.userId,
            seat: matchData,
            userIndex: client.userIndex,
            team: client.team,
            teamId: client.teamId,
          });
        })
      );

      return res.send({ status: true, gamePlayers: gamePlayers });
    }

    return res.send({ status: false });
  },
};
