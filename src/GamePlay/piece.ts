var WIDTH = 700
var HEIGHT = 700
var ROWS = 8
var COLS = 8
//var SQUARE_SIZE = WIDTH/COLS

export class Piece{
    PADDING = 15
    OUTLINE = 2
    row: number;
    col:number;
    king: boolean;
    x:number;
    y:number;
    uniqueID;
    pieceNumber: number;
    constructor(row, col, pieceNumber, uniqueID, king){

        this.row = row
        this.col = col
        this.pieceNumber = pieceNumber
        this.x = 0
        this.y = 0
        this.king = king;
        this.uniqueID = uniqueID;
        //this.calc_pos()
    }

    make_king(){
        this.king = true;
    }

    move(row, col){
        this.row = row
        this.col = col
        
    }
}
    