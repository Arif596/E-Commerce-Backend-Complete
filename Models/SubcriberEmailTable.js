const database = require("../Database/db");

async function createEmailSubcribeTable() {
  try {
    const query = `
            CREATE TABLE IF NOT EXISTS subscribed_emails (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        subscribed_at TIMESTAMP DEFAULT NOW()
            );
        `;
    await database.query(query);
    console.log("Subcribe Email table created successfully");
  } catch (error) {
    console.log("Error creating Subcribe Email table:", error);
    process.exit(1);
  }
}

module.exports = createEmailSubcribeTable;
