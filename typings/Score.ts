import { type, Schema } from '@colyseus/schema';
export class Score extends Schema{

    @type('number')
    A: number = 0;

    @type('number')
    B: number = 0;

}