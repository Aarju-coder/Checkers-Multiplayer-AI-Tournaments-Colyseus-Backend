import { type, Schema } from '@colyseus/schema';
export class Card extends Schema{

    @type('number')
    id: number;

    @type('boolean')
    isActive: boolean;
    
    @type('string')
    suit: string;
    
    @type('number')
    value: number;
        
    @type('string')
    card: string;
   
    constructor( obj: any ){
        super();
        this.id = obj.id;
        this.isActive = false;
        this.suit = obj.suit;
        this.card = obj.card;
        this.value = obj.value;
    }
}