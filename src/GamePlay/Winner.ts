
import { type, Schema } from '@colyseus/schema';
export class Winner extends Schema {
    
    @type("string") 
    id: string;

    @type("number") 
    position: number;
    constructor( id: string, position: number ){
        super();
        this.id = id;
        this.position = position;
    }
}