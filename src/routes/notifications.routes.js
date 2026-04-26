const express = require("express");
const notificationsController = require("../controllers/notifications.controller");

const router = express.Router();

router.get("/", notificationsController.listUnread);
router.patch("/read-all", notificationsController.markAllRead);
router.patch("/:id/read", notificationsController.markRead);

module.exports = router;
