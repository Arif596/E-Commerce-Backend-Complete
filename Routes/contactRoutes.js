const express = require("express");
const sendContactMessage = require("../Controller/contactController");
const router = express.Router();
router.post("/send/message", sendContactMessage);
module.exports = router;
