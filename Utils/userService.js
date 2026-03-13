const database = require("../Database/db");
// Get All User
const FetchAllUser = async () => {
  const result = await database.query("SELECT* FROM users");
  return result.rows;
};
module.exports = FetchAllUser;
