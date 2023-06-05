import { type, Schema, MapSchema } from '@colyseus/schema';
//import { Settings } from './settings';

export class Events extends Schema {

    room: any;
    constructor( room: Object ){
        super();
        this.room = room;
    }

    sendToClient( client: any, en: string, data: any ){
        this.room.send( client, { en: en, data: data });
    }

    sendClient( client: any, data: any ){
        this.room.send( client,data);
    }

    sendToRoom( en: string, data: object ){

        this.room.broadcast( { en: en, data: data } );
    }

    sendObjToRoom(data:Object){
        this.room.broadcast(data);
    }

    onEvent ( message: any, socket: any ) {

        var room = this.room;
        switch( message.en ){

           /* case 'PLAY':
                if( room.state.status === Settings.status.BETTING )
                    room.gameplay.bet( message, socket );
                else
                    room.gameplay.play( message, socket );
                break;
            case 'PASS':
                room.gameplay.pass( message, socket );
                break;
            case 'BET':
                room.gameplay.bet( message, socket );
                break;*/
    
        }

    }
    
}