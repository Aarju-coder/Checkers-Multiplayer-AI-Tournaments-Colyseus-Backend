import { type, Schema, ArraySchema } from '@colyseus/schema';
export class Round extends Schema{

    @type("number")
    score: number = 0;

    @type("string")
    type: string = "normal";

    constructor( score: number, type: string ){
        super();
        try{
            this.score = score;
            this.type = type;
        }catch(e){
            console.log("Error has occured inside constructor of Player class - ", e);
        }
    }

}