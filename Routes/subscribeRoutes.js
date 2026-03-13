const express = require("express");
const SubcriberEmialUser = require("../Controller/sendSubscribeEmaiControllerl");
const router = express.Router();
router.post("/add/subcribe", SubcriberEmialUser);
module.exports = router;
