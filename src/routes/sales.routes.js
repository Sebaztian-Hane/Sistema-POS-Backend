const express = require("express");
const salesController = require("../controllers/sales.controller");

const router = express.Router();

router.get("/", salesController.list);
router.get("/:id", salesController.getOne);
router.post("/", salesController.create);
router.patch("/:id/anular", salesController.anular);

module.exports = router;
