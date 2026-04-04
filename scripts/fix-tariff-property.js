const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFile();

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI not defined");
  }

  await mongoose.connect(uri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 15000,
  });

  const propertySchema = new mongoose.Schema(
    {
      userId: mongoose.Schema.Types.ObjectId,
      propertyName: String,
    },
    { strict: false, collection: "properties" }
  );

  const tariffSchema = new mongoose.Schema(
    {
      propertyId: mongoose.Schema.Types.ObjectId,
      tariffType: String,
      effectiveFrom: Date,
    },
    { strict: false, collection: "tariffs" }
  );

  const Property =
    mongoose.models.FixTariffProperty ||
    mongoose.model("FixTariffProperty", propertySchema);
  const Tariff =
    mongoose.models.FixTariff ||
    mongoose.model("FixTariff", tariffSchema);

  const explicitPropertyId = process.env.PROPERTY_ID;
  const explicitUserId = process.env.USER_ID;

  let propertyQuery = {};

  if (explicitPropertyId) {
    if (!mongoose.Types.ObjectId.isValid(explicitPropertyId)) {
      throw new Error("PROPERTY_ID is not a valid ObjectId");
    }

    propertyQuery = { _id: new mongoose.Types.ObjectId(explicitPropertyId) };
  } else if (explicitUserId) {
    if (!mongoose.Types.ObjectId.isValid(explicitUserId)) {
      throw new Error("USER_ID is not a valid ObjectId");
    }

    propertyQuery = { userId: new mongoose.Types.ObjectId(explicitUserId) };
  }

  const property = await Property.findOne(propertyQuery)
    .sort({ createdAt: -1 })
    .lean();

  if (!property) {
    throw new Error("No property found to attach tariffs to");
  }

  const tariffs = await Tariff.find({}).sort({ createdAt: -1 }).lean();

  console.log("Selected Property:", {
    _id: String(property._id),
    userId: property.userId ? String(property.userId) : null,
    propertyName: property.propertyName || null,
  });
  console.log(
    "Tariffs Before Update:",
    tariffs.map((tariff) => ({
      _id: String(tariff._id),
      propertyId: tariff.propertyId ? String(tariff.propertyId) : null,
      tariffType: tariff.tariffType || null,
      effectiveFrom: tariff.effectiveFrom || null,
    }))
  );

  const updateResult = await Tariff.updateMany(
    {},
    {
      $set: {
        propertyId: new mongoose.Types.ObjectId(String(property._id)),
      },
    }
  );

  const updatedTariffs = await Tariff.find({}).sort({ createdAt: -1 }).lean();

  console.log("Update Result:", {
    matchedCount: updateResult.matchedCount,
    modifiedCount: updateResult.modifiedCount,
  });
  console.log(
    "Updated Tariffs:",
    updatedTariffs.map((tariff) => ({
      _id: String(tariff._id),
      propertyId: tariff.propertyId ? String(tariff.propertyId) : null,
      tariffType: tariff.tariffType || null,
      effectiveFrom: tariff.effectiveFrom || null,
      matchesProperty: String(tariff.propertyId) === String(property._id),
    }))
  );
}

main()
  .catch((error) => {
    console.error("Tariff property fix failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {}
  });
