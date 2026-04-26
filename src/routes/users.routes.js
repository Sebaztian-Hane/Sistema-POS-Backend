const express = require("express");
const usersController = require("../controllers/users.controller");
const { requireRole } = require("../middlewares/role.middleware");

const router = express.Router();

router.use(requireRole("ADMIN"));

router.get("/", usersController.list);
router.post("/", usersController.create);
router.put("/:id", usersController.update);
router.patch("/:id/toggle", usersController.toggleActive);

module.exports = router;
