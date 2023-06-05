import { type, Schema, MapSchema, ArraySchema } from '@colyseus/schema';
import { Player } from "../GamePlay/Player";
import { Message } from '../../typings/Message';
import { Score } from '../../typings/Score';
import { Sandbagging } from '../../typings/Sandbagging';
import { Client } from 'colyseus';

export class State extends Schema {

    // @type({ map: Player }) 
    // players: MapSchema < Player > = new MapSchema< Player >();

    @type({ map: Player })
    players = new MapSchema<Player>();
    
    @type('int16')
    playerTurn: number = -1;

    @type("string")
    status: string; 

    @type([ Message ])
    chatMessage = new ArraySchema< Message >();

    @type("number")
    turnIndex: number = 1;

    @type("string")
    attu: string = "spades" ;

    // @type(Score)
    // teamScore: Score = new Score();
    @type(['number'])
    board = new ArraySchema< number >();

    // @type(['number'])
    // firstPlayerboard = new ArraySchema< number >();

    @type('number')
    activePlayer = 1;

    sandBagging: Sandbagging = new Sandbagging();

    startTurnIndex = 0;
    count = 0;
    passCount = 0;
    botExist = false;
    firstCardPlayed = false;

    currentRoundSuit = null; 

    reset(){
        this.attu = null;
        this.count = 0;
        this.passCount = 0;
    }
    getOtherClient(clients: Client[], currentClient: Client): Client {
        let client: Client;
        clients.forEach(clientItem => {
            if (clientItem.sessionId != currentClient.sessionId) {
                client = clientItem;
            } else {

            }
        });
        return client;

    }

    constructor(){
        super();
        this.board = new ArraySchema(
            0, 1, 0, 1, 0, 1, 0, 1,
            1, 0, 1, 0, 1, 0, 1, 0,
            0, 1, 0, 1, 0, 1, 0, 1,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            2, 0, 2, 0, 2, 0, 2, 0,
            0, 2, 0, 2, 0, 2, 0, 2,
            2, 0, 2, 0, 2, 0, 2, 0,
        )
        // this.firstPlayerboard = new ArraySchema(
        //     0, 2, 0, 2, 0, 2, 0, 2,
        //     2, 0, 2, 0, 2, 0, 2, 0,
        //     0, 2, 0, 2, 0, 2, 0, 2,
        //     0, 0, 0, 0, 0, 0, 0, 0,
        //     0, 0, 0, 0, 0, 0, 0, 0,
        //     1, 0, 1, 0, 1, 0, 1, 0,
        //     0, 1, 0, 1, 0, 1, 0, 1,
        //     1, 0, 1, 0, 1, 0, 1, 0,
        // )
    }
}