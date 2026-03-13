const CreateContactTable = require("../Models/ContactUsTable");
const createOrderItemTable = require("../Models/orderItemsTable");
const createOrdersTable = require("../Models/ordersTable");
const createPaymentsTable = require("../Models/paymentsTable");
const createProductReviewsTable = require("../Models/productReviewsTable");
const createProductsTable = require("../Models/productsTable");
const createShippingInfoTable = require("../Models/shippinginfoTable");
const createEmailSubcribeTable = require("../Models/SubcriberEmailTable");
const createUserTable = require("../Models/UserTable");
const CreateWishlistTable = require("../Models/WishlistTable");

const CreatTables = async () => {
  try {
    await createUserTable();
    await createProductsTable();
    await createProductReviewsTable();
    await createOrdersTable();
    await createOrderItemTable();
    await createShippingInfoTable();
    await createPaymentsTable();
    await CreateWishlistTable();
    await createEmailSubcribeTable();
    await CreateContactTable();
    console.log("All Table Created Successfully");
  } catch (error) {
    console.log("Error Creating Tables:", error);
  }
};
module.exports = CreatTables;
