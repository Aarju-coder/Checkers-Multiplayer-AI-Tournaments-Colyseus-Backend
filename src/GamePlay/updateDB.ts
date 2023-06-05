import { config as sqlConfig } from "../config/sql";
var waterfall = require("async-waterfall");
let onWin = 50;

export const sqlService = {
  onWin: function (dbId: number, points: number) {
    console.log("on win >>>>>", dbId, points);
    try {
      sqlConfig.getConnection(function (err, connection) {
        if (err) throw err; // not connected!
        waterfall(
          [
            function (callback) {
              console.log(
                "query >>>",
                "UPDATE user SET points = points + '" +
                  points +
                  "', winCount = winCount + 1  WHERE id = " +
                  dbId
              );
              sqlConfig.query(
                "UPDATE user SET points = points + '" +
                  points +
                  "', winCount = winCount + 1  WHERE id = " +
                  dbId,
                function (err, result, fields) {
                  if (err) callback(err);
                  callback(null);
                }
              );
            },
          ],
          function (err) {
            connection.release();
            if (err) {
              throw err;
            }
          }
        );
      });
    } catch (e) {
      console.log("Error: ", e);
    }
  },
  updatePlayCount: function (dbId: number) {
    try {
      sqlConfig.getConnection(function (err, connection) {
        if (err) throw err; // not connected!
        waterfall(
          [
            function (callback) {
              console.log(
                "query >>>",
                "UPDATE user SET playCount = playCount + 1  WHERE id = " + dbId
              );
              sqlConfig.query(
                "UPDATE user SET playCount = playCount + 1  WHERE id = " + dbId,
                function (err, result, fields) {
                  if (err) callback(err);
                  callback(null);
                }
              );
            },
          ],
          function (err) {
            connection.release();
            if (err) {
              throw err;
            }
          }
        );
      });
    } catch (e) {
      console.log("Error: ", e);
    }
  },
};
