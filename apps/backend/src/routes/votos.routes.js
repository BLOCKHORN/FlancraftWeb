// apps/backend/src/routes/votos.routes.js
const express = require("express");
const router = express.Router();

const {
  ingestVote,
  getRanking,
  getResumen,
  getTop,
  getStatus,
} = require("../controllers/votos.controller");

// Proxy -> Backend (NuVotifier)
router.post("/ingest", ingestVote);

// Web / admin
router.get("/ranking", getRanking);
router.get("/resumen", getResumen);

// Widget
router.get("/top", getTop);
router.get("/status/:id", getStatus);

module.exports = router;
