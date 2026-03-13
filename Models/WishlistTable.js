const database = require("../Database/db");
const CreateWishlistTable = async () => {
  try {
    const query = `CREATE TABLE IF NOT EXISTS wishlist(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id,product_id) 
    )`;
    await database.query(query);
  } catch (error) {
    console.error("❌ Failed To Create wishlist Table.", error);
    process.exit(1);
  }
};
module.exports = CreateWishlistTable;
