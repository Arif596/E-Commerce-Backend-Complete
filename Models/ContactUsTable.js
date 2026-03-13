const database = require("../Database/db");
const CreateContactTable = async () => {
  try {
    const query = `CREATE TABLE IF NOT EXISTS contact_message(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    message TEXT NOT  NULL,
    created_at TIMESTAMP DEFAULT NOW())`;
    await database.query(query);
    console.log("Contact table created successfully");
  } catch (error) {
    console.log("Error creating Contact table:", error);
    process.exit(1);
  }
};
module.exports = CreateContactTable;
