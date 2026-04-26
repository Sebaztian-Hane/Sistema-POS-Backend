const express = require("express");
const productsController = require("../controllers/products.controller");
const { requireRole } = require("../middlewares/role.middleware");

const router = express.Router();

router.get("/", productsController.list);
router.get("/:id", productsController.getOne);

router.post("/", requireRole("ADMIN"), productsController.create);
router.put("/:id", requireRole("ADMIN"), productsController.update);
router.delete("/:id", requireRole("ADMIN"), productsController.softDelete);
router.patch("/:id/stock", requireRole("ADMIN"), productsController.adjustStock);

module.exports = router;
