const allowedFarmerTypes = new Set(["Land Owner", "Tenant"]);

function validateFarmerPayload(request, response, next) {
  const payload = request.body || {};
  const requiredFields = ["full_name", "mobile_number", "state", "district", "village"];
  const missingFields = requiredFields.filter((field) => !String(payload[field] || "").trim());

  if (missingFields.length > 0) {
    return response.status(400).json({ error: "Missing required fields", fields: missingFields });
  }

  if (!/^\+91[6-9]\d{9}$/.test(payload.mobile_number)) {
    return response.status(400).json({ error: "mobile_number must use +91 followed by 10 digits" });
  }

  if (payload.pin_code !== undefined && payload.pin_code !== null && !/^\d{6}$/.test(String(payload.pin_code))) {
    return response.status(400).json({ error: "pin_code must contain 6 digits" });
  }

  if (payload.farmer_type && !allowedFarmerTypes.has(payload.farmer_type)) {
    return response.status(400).json({ error: "farmer_type must be Land Owner or Tenant" });
  }

  if (payload.land_area !== undefined && payload.land_area !== null && (Number.isNaN(Number(payload.land_area)) || Number(payload.land_area) < 0)) {
    return response.status(400).json({ error: "land_area must be a non-negative number" });
  }

  next();
}

module.exports = { validateFarmerPayload };
