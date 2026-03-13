const pkg = require("pg");
require("dotenv").config();
const { Client } = pkg;
console.log("🔧 Database Configuration:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD Length:", process.env.DB_PASSWORD?.length);
const database = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});
(async () => {
  try {
    await database.connect();
    console.log("Database is Connected Successfully");
  } catch (error) {
    console.log("Database connection failed");
  }
})();
module.exports = database;
