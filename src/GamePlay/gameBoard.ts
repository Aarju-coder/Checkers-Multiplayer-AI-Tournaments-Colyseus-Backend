import { ArraySchema } from '@colyseus/schema';
import { Piece } from './piece';
export class Board {
    board = [];
    red_left = 12;
    
    white_left = 12;
    //red = 1
    red_kings = 0;
    //white = 2
    white_kings = 0;
    constructor(boardCopy, boardrefer){
            if(boardCopy){
                let count = 0;
                for (var row = 0; row<8; row++){
                    this.board.push([])
                for (var col = 0; col< 8; col++){
                    if (col % 2 == ((row +  1) % 2)){
                        if (row < 3)
                            this.board[row].push(new Piece(row, col, 1, count, false));
                        else if (row > 4)
                            this.board[row].push(new Piece(row, col, 2, count, false));
                        else
                            this.board[row].push(0)

                        count++;
                    }
                    else
                        this.board[row].push(0)
                }
                
                }
            }else{
                //console.log("copy the board",);
                

                for (var i = 0; i < 8; i++){
                    this.board.push([])
                    for(var j = 0 ; j<8; j++){
                        if(boardrefer[i][j] == 0){
                            this.board[i].push(0);
                        }else{
                            this.board[i].push(new Piece(boardrefer[i][j].row, boardrefer[i][j].col, boardrefer[i][j].pieceNumber, boardrefer[i][j].uniqueID, boardrefer[i][j].king))
                        }
                        
                        
                        
                    }
                }
                    
            }
        
        
    }
    move(piece, row, col){
        //console.log("row ", row, " col ", col, " ", piece);
        var temp = this.board[row][col];
        this.board[row][col] = this.board[piece.row][piece.col]
        this.board[piece.row][piece.col] = temp;
        
        piece.move(row, col);
        //#print(piece)

        if (row == 7 || row == 0){
            piece.make_king()
            if (piece.pieceNumber == 2)
                this.white_kings += 1
            else
                this.red_kings += 1
        }
        
    }
    remove(pieces){
        console.log("removed piece -> ", JSON.stringify(pieces));
        for(var piece of pieces){
            this.board[piece.row][piece.col] = 0
            if (piece != 0)
                if (piece.pieceNumber == 1)
                    this.red_left -= 1
                else
                    this.white_left -= 1
        }
            
    }

  winner(){
    if (this.red_left <= 0){
        return 1;
    }
    else if (this.white_left <= 0){
        return 2;
    }
        return null;
}
evaluate(){
    var evaluation = this.white_left - this.red_left + (this.white_kings * 0.5 - this.red_kings * 0.5)
    //console.log("evalution --> ", evaluation);
    return evaluation;
}
get_all_pieces(pieceNumber){
    let pieces = [];
    var row:number;
    var col: number;
    for(row = 0; row< 8; row++){
        for (var col = 0 ; col < 8; col++){
            if(this.board[row][col] != 0 && this.board[row][col].pieceNumber == pieceNumber)
                pieces.push(this.board[row][col]);
        }
    }
    ////console.log("pieces you got -->> ", pieces[0]);
    return pieces
}
get_piece(row, col){
    ////console.log("get Piece --> ", this.board[row][col]);
    return this.board[row][col]
}
    
get_valid_moves(piece){
    var moves = {};
    var left:number = piece.col - 1
    var right:number = piece.col + 1
    var row = piece.row
    //console.log("Piece inside get_valid_moves --> ", piece.king , ' ',row);
    if (piece.pieceNumber == 2 && !piece.king){
        var trLeft = this._traverse_left(row -1, Math.max(row-3, -1), -1, piece.pieceNumber, left, []);
        moves = {...moves, ...trLeft};
        var trRight = this._traverse_right(row -1, Math.max(row-3, -1), -1, piece.pieceNumber, right, []);
        moves = {...moves, ...trRight};
    }
    if (piece.pieceNumber == 1 && !piece.king){
        var trLeft = this._traverse_left(row +1, Math.min(row+3, 8), 1, piece.pieceNumber, left, []);
        moves = {...moves, ...trLeft};
        var trRight = this._traverse_right(row +1, Math.min(row+3, 8), 1, piece.pieceNumber, right, []);
        moves = {...moves, ...trRight};
    }

    if (piece.king){
        console.log("this piece is a king");
        var kingCanKill = this.traverse_kingIfkillingOppPiece({position: [piece.row, piece.col]}, parseInt(piece.pieceNumber))
        moves = {...moves, ...kingCanKill};
    }
    return moves;
}

_traverse_left(start, stop, step, pieceNumber, left, skipped){
    var moves = {};
    var last = []
    //console.log("here in left ", start, ' ', stop , ' ', step , ' ', pieceNumber, " " ,left, ' ', skipped);
    var addSub; 
    
    for (let r  = start;pieceNumber == 1? r < stop : r > stop; r = r + step){
        
        if (left < 0)
            break;
        
        var current = this.board[r][left];
        ////console.log("current -->>", current);
        if (current == 0){
            if (skipped.length && !last.length)
                break;
            else if (skipped.length){
                moves[r + " " +left] = [last , skipped];
                ////console.log("moves --..1 ", moves);
            }
            else{
                moves[r + " " +left] = [last];
                ////console.log("moves --..2 ", moves);
            }
               
            
            if (last.length){
                if (step == -1)
                    var row = Math.max(r-3, 0)
                else
                    var row = Math.min(r+3, 8)

                var trLeft = this._traverse_left(r+step, row, step, pieceNumber, left-1,last);
                // //console.log("trLeft ",);
                moves = {...moves, ...trLeft};
                var trRight = this._traverse_right(r+step, row, step, pieceNumber, left+1,last);
                // //console.log("trRight -->> ", trRight);
                moves = {...moves, ...trRight};
                    
            }
            break;
        }
        else if (current.pieceNumber == pieceNumber){
            //console.log("piece in front of the piece, can not move");
            break;
        }
        else{
            last = [current]
            //console.log(" last == current --> ");
        }
            

        left -= 1
    }
        
    ////console.log("moves --> ", moves);
    return moves
}

 _traverse_right(start, stop, step, pieceNumber, right:number, skipped){
    var moves = {};
    var last = []
    //console.log("here in right ", start, ' ', stop , ' ', step , ' ', pieceNumber, " " , right, ' ', skipped);
    ////console.log("type ", right, " ", typeof right)
    for (let r  = start; pieceNumber == 1? r < stop : r > stop;r+=step){
        

        if (right >= 8)
            break;
    
        var current = this.board[r][right];
        ////console.log("current -->>", current);
    if (current == 0){
        if (skipped.length && !(last.length)){
            break
        }
        else if (skipped.length){
            moves[r + " " +right] = [last , skipped]
            ////console.log("moves --..1 ", moves);
        }
        else{
            moves[r + " " + right] = [last]
            ////console.log("moves --..2 ", moves);
        }
            
        
        if (last.length){
            if (step == -1)
                var row = Math.max(r-3, 0)
            else
                var row = Math.min(r+3, 8)
            var trLeft = this._traverse_left(r+step, row, step, pieceNumber, right-1,last);
            // //console.log("trLeft --> ", trLeft);
            moves = {...moves, ...trLeft};
            var trRight = this._traverse_right(r+step, row, step, pieceNumber, right+1,last);
            // //console.log("trRight -->> ", trRight);
            moves = {...moves, ...trRight};
            
        }
        break;
    }
    else if (current.pieceNumber == pieceNumber){
        //console.log("piece in front of the piece, can not move");
        break;
    }
    else{
        
        last[0] = [current]
        //console.log(" last == current --> ");
    }
    right += 1

    }
    
    
    ////console.log("moves --> ", moves);
return moves
 }


 traverse_kingIfkillingOppPiece(k: any, playerTurn){
    var i: any, j: any, moves = {};
    console.log(k);
    for( i = k.position[0] -1 , j = k.position[1]-1; i > 0 && j > 0 ; i--, j--){
        var tempRow = i ;
        var tempColumn = j ;
        console.log("Row: ", tempRow, "Column: ", tempColumn);
        
        if(this.board[tempRow][tempColumn].pieceNumber ==  playerTurn){
          //if found your own piece 
          console.log("Found your own piece");
          break;
        }else if(this.board[tempRow][tempColumn].pieceNumber != playerTurn && this.board[tempRow][tempColumn] != 0){
          //if found your opp. piece check if it's in bounds
          if(this.board[tempRow-1][tempColumn-1] == 0 ){
            
            console.log("Found your opp piece and next tile is empty"); 
            var temp_moves = {};
            temp_moves[(tempRow-1 )+ " " + (tempColumn-1)] = [[this.board[tempRow][tempColumn]]];
            moves = {...moves, ...temp_moves}
          }else{
            console.log("Found your opp piece but next piece is not empty"); 
            break;
            
          }
        }else {
            console.log("No piece found on Path");  
          }
  }for( i = k.position[0] -1, j = k.position[1]+1; i > 0 && j < 7 ; i--, j++){
    var tempRow = i ;
    var tempColumn = j ;
    console.log("Row: ", tempRow, "Column: ", tempColumn);
    if(this.board[tempRow][tempColumn].pieceNumber == playerTurn){
      //if found your own piece 
      console.log("Found your own piece");
      break;
    }else if(this.board[tempRow][tempColumn].pieceNumber != playerTurn && this.board[tempRow][tempColumn] != 0){
      //if found your opp. piece check if it's in bounds
      if(this.board[tempRow-1][tempColumn+1] == 0 ){
        console.log("Found your opp piece and next tile is empty"); 
        var temp_moves = {};
        temp_moves[(tempRow-1 )+ " " + (tempColumn+1)] = [[this.board[tempRow][tempColumn]]];
        moves = {...moves, ...temp_moves}
      }else{
        console.log("Found your opp piece but next piece is not empty"); 
        break;
      }
    }else {
      console.log("No piece found on Path");  
    }
  }for( i = k.position[0] + 1, j = k.position[1] - 1; i < 7 && j > 0 ; i++, j--){
    var tempRow = i ;
    var tempColumn = j ;
    console.log("Row: ", tempRow, "Column: ", tempColumn);
    if(this.board[tempRow][tempColumn].pieceNumber == playerTurn){
      //if found your own piece 
      console.log("Found your own piece");
      break;
    }else if(this.board[tempRow][tempColumn].pieceNumber != playerTurn && this.board[tempRow][tempColumn] != 0){
      //if found your opp. piece check if it's in bounds
      if(this.board[tempRow+1][tempColumn-1] == 0 ){
        console.log("Found your opp piece and next tile is empty"); 
        var temp_moves = {};
        temp_moves[(tempRow+1 )+ " " + (tempColumn-1)] = [[this.board[tempRow][tempColumn]]];
        moves = {...moves, ...temp_moves}
      }else{
        console.log("Found your opp piece but next piece is not empty"); 
        break;
      }
    }else {
      console.log("No piece found on Path");  
    }
  }for( i = k.position[0] + 1, j = k.position[1] + 1; i < 7 && j < 7 ; i++, j++){
    var tempRow = i ;
    var tempColumn = j ;
    console.log("Row: ", tempRow, "Column: ", tempColumn);
    if(this.board[tempRow][tempColumn].pieceNumber == playerTurn){
      //if found your own piece 
      console.log("Found your own piece");
      break;
    }else if(this.board[tempRow][tempColumn].pieceNumber != playerTurn && this.board[tempRow][tempColumn] != 0){
      //if found your opp. piece check if it's in bounds
      if(this.board[tempRow+1][tempColumn+1] == 0 ){
        console.log("Found your opp piece and next tile is empty"); 
        var temp_moves = {};
        temp_moves[(tempRow+1 )+ " " + (tempColumn+1)] = [[this.board[tempRow][tempColumn]]];
        moves = {...moves, ...temp_moves}
      }else{
        console.log("Found your opp piece but next piece is not empty"); 
        break;
      }
    }else {
      console.log("No piece found on Path");  
    }
  }



  if(this.board[k.position[0] - 1][k.position[1]-1] == 0){
    var temp_moves = {};
    temp_moves[(k.position[0] - 1)+ " " + (k.position[1]-1)] = [[]];
    moves = {...moves, ...temp_moves}
  }else if(this.board[k.position[0] - 1][k.position[1]+1] == 0){
    var temp_moves = {};
    temp_moves[(k.position[0] - 1)+ " " + (k.position[1]+1)] = [[]];
    moves = {...moves, ...temp_moves}
  }else if(this.board[k.position[0] + 1][k.position[1]-1] == 0){
    var temp_moves = {};
    temp_moves[(k.position[0] + 1)+ " " + (k.position[1]-1)] = [[]];
    moves = {...moves, ...temp_moves}
  }else if(this.board[k.position[0] + 1][k.position[1]+1] == 0){
    var temp_moves = {};
    temp_moves[(k.position[0] + 1)+ " " + (k.position[1]+1)] = [[]];
    moves = {...moves, ...temp_moves}
  }
  return moves;
 }
}

