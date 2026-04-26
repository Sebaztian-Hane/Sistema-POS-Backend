const express = require("express");
const categoriesController = require("../controllers/categories.controller");
const { requireRole } = require("../middlewares/role.middleware");

const router = express.Router();

router.get("/", categoriesController.list);

router.post("/", requireRole("ADMIN"), categoriesController.create);
router.put("/:id", requireRole("ADMIN"), categoriesController.update);
router.delete("/:id", requireRole("ADMIN"), categoriesController.remove);

module.exports = router;
