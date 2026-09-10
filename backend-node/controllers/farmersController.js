const { ObjectId } = require("mongodb");
const { getDatabase } = require("../db");

function serializeFarmer(farmer) {
  if (!farmer) return null;
  const { _id, ...fields } = farmer;
  return { id: _id.toString(), ...fields };
}

function farmerId(request) {
  return ObjectId.isValid(request.params.id) ? new ObjectId(request.params.id) : null;
}

async function createFarmer(request, response, next) {
  const { full_name, mobile_number, state, district, village, pin_code, farmer_type, land_area, main_crops } = request.body;
  const now = new Date();
  try {
    const farmer = { firebase_uid: request.firebaseUser.uid, full_name: full_name.trim(), mobile_number, state: state.trim(), district: district.trim(), village: village.trim(), pin_code: pin_code || null, farmer_type: farmer_type || null, land_area: land_area ?? null, main_crops: main_crops || null, created_at: now, updated_at: now };
    const result = await getDatabase().collection("farmers").insertOne(farmer);
    return response.status(201).json(serializeFarmer({ ...farmer, _id: result.insertedId }));
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ error: "A farmer with this mobile number or Firebase account already exists" });
    return next(error);
  }
}

async function getFarmer(request, response, next) {
  try {
    const id = farmerId(request);
    const farmer = id ? await getDatabase().collection("farmers").findOne({ _id: id }) : null;
    if (!farmer) return response.status(404).json({ error: "Farmer not found" });
    return response.json(serializeFarmer(farmer));
  } catch (error) { return next(error); }
}

async function updateFarmer(request, response, next) {
  const { full_name, mobile_number, state, district, village, pin_code, farmer_type, land_area, main_crops } = request.body;
  try {
    const id = farmerId(request);
    const update = { full_name: full_name.trim(), mobile_number, state: state.trim(), district: district.trim(), village: village.trim(), pin_code: pin_code || null, farmer_type: farmer_type || null, land_area: land_area ?? null, main_crops: main_crops || null, updated_at: new Date() };
    const result = await getDatabase().collection("farmers").findOneAndUpdate({ _id: id }, { $set: update }, { returnDocument: "after" });
    if (!result) return response.status(404).json({ error: "Farmer not found" });
    return response.json(serializeFarmer(result));
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ error: "A farmer with this mobile number already exists" });
    return next(error);
  }
}

async function deleteFarmer(request, response, next) {
  try {
    const result = await getDatabase().collection("farmers").deleteOne({ _id: farmerId(request) });
    if (result.deletedCount === 0) return response.status(404).json({ error: "Farmer not found" });
    return response.status(204).send();
  } catch (error) { return next(error); }
}

module.exports = { createFarmer, getFarmer, updateFarmer, deleteFarmer };
