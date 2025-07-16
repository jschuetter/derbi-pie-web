// Get the client
const mysql = require('mysql2');

// Create the connection to database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'derbi-pie',
  password: 'aaa'
});

// console.log('MySQL test query:\n');
// // A simple SELECT query
// connection.query(
//   'SELECT * FROM rt_master WHERE rt_shape = "k̑leu̯s-" ',
//   function (err, results, fields) {
//     console.log(results); // results contains rows returned by server
//     console.log(fields); // fields contains extra meta data about results, if available
//   }
// );

module.exports = connection
