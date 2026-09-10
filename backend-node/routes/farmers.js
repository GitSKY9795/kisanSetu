const express = require("express");
const { createFarmer, getFarmer, updateFarmer, deleteFarmer } = require("../controllers/farmersController");
const { validateFarmerPayload } = require("../middleware/validation");
const { requireFirebaseToken, requireSession } = require("../middleware/auth");

const router = express.Router();
router.post("/", requireFirebaseToken, validateFarmerPayload, createFarmer);
router.get("/:id", requireSession, getFarmer);
router.put("/:id", requireSession, validateFarmerPayload, updateFarmer);
router.delete("/:id", requireSession, deleteFarmer);

module.exports = router;
