const express = require("express");
const customersController = require("../controllers/customers.controller");
const { requireRole } = require("../middlewares/role.middleware");

const router = express.Router();

router.get("/", customersController.list);
router.get("/:id", customersController.getOne);
router.post("/", customersController.create);
router.put("/:id", customersController.update);
router.delete("/:id", requireRole("ADMIN"), customersController.softDelete);

module.exports = router;
