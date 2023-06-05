const Settings = {
  maxChatLength: 100,
  gameStatus: {
    WAITING: "WAITING",
    GAME_START: "GAME_START",
    GAMEPLAY: "GAMEPLAY",
    GAME_COMPLETE: "GAME_COMPLETE",
    ROUND_COMPLETE: "ROUND_COMPLETE",
    CARD_DISTRIBUTION: "CARD_DISTRIBUTION",
    BIDDING: "BIDDING",
  },
  disconnectType: {
    TIMEOUT_DISCONNECT: "TIMEOUT_DISCONNECT",
    ADMIN_DISCONNECT: "ADMIN_DISCONNECT",
    
    GAME_COMPLETE: "GAME_COMPLETE",
    PLAYERS_LEFT: "PLAYERS_LEFT",
  },
  friendInviteExpire: 60 * 60 * 1000,
  // friendInviteExpire: 30 * 1000 ,
  winnerPoints: [2000, 1200, 800],
  beforeGameStartTimer: 1 * 1000,
  beforeGameComplete: 1 * 1000,
  gameRoomName: "game",
  nextRoundTimer: 2000,
  handWinnerTimer: 2000,
  roomTimeoutTimer: 60000 * 2,
  nextTurnTimer: 10000,
  afterRoundWinnerTime: 20000,
  biddingPoints: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  randomRoomNo: [],
  botPlayTimer: 1000,
  tournamentTimer: 60000,
};

export { Settings };
