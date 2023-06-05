import mysql from 'mysql';
export const config = mysql.createPool({
    connectionLimit : 100,
    host: "localhost",
    user: "root",
    password: "",
    database: "dart_game"
});

  // var con = mysql.createConnection({
  //   host: "localhost",
  //   user: "root",
  //   password: "3udhaN1!!@2021",
  //   database: "sudhani_whist"
  // });