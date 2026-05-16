const express = require("express");
const salesController = require("../controllers/sales.controller");

const router = express.Router();

// Listado y consulta
router.get("/", salesController.list);
router.get("/:id", salesController.getOne);

// Documentos electrónicos
router.get("/:id/pdf", salesController.getPdf);
router.get("/:id/sunat-status", salesController.getSunatStatus);
router.get("/:id/electronic-document", salesController.getElectronicDocument);
router.post("/:id/retry-sunat", salesController.retrySunat);

// Operaciones
router.post("/", salesController.create);
router.patch("/:id/anular", salesController.anular);

module.exports = router;