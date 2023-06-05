import http from "http";
import { Room, Client } from "colyseus";
import { type, Schema, MapSchema, ArraySchema } from '@colyseus/schema';
import { Card } from '../../typings/Card';



export class Player extends Schema {

    @type("string") 
    id: string;

    @type("number") 
    index: number;

    @type("string") 
    userName: string;

    @type("number") 
    coin: number;

    @type("string") 
    avatar: string;

    @type("string") 
    team: string;

    @type("number") 
    bid: number = null ;

    @type("number") 
    dbId: number ;

    @type("number") 
    points: number = 0;

    @type("boolean")
    isBot: boolean = false;

    @type( [ Card ] )
    cards = new ArraySchema< Card >();
    
    // @type("number")
    // myPiece: number = 0;
    
    @type( Card )
    cardPlayed: Card = null;
    userId: number = 0;
    client: any;
    canBid = [];
    // cards = [];
    playerCardsCount = {};
    gamePoints = 0;
    teamId = null;
    
    constructor( client: any, options: any){
        super();
        try{

            console.log( "client id >>>>>>>",options.userId  );
            this.client = client;
            this.id = client.id;
            this.dbId = parseInt(options.dbId);
            this.userName = options.userName;
            this.coin = parseInt(options.coin);
            this.avatar = options.avatar;
            this.team = ( options.team === 1 )? 'A' : 'B';
            //this.index = parseInt( index );

        }catch(e){
            console.log("Error has occured inside constructor of Player class - ", e);
        }
    }

    reset(){
        this.canBid = [];
        this.cards = new ArraySchema< Card >();
        this.playerCardsCount = {};
        this.cardPlayed = null;
        this.points = 0;
        this.bid = null;
    }

    replacePlayer( client, options ){
        this.client = client;
        this.id = client.id;
        this.dbId = parseInt( options.userId );
        this.userName = options.userName;
        this.coin = options.coin;
        this.avatar = options.avatar;
    }

}