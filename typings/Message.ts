import { type, Schema } from '@colyseus/schema';
export class Message extends Schema{

    @type('string')
    id: string;

    @type('string')
    avatar: string;

    @type('string')
    name: string;

    @type('string')
    text: string;

    @type('string')
    messagetype: string;
    
    constructor( id: string, avatar: string, name: string, text: string, messagetype: string){
        super();
        this.id = id;
        this.name = name;
        this.avatar = avatar;
        this.text = text;
        this.messagetype = messagetype;
    }
}