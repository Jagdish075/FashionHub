import dotenv from "dotenv";
import connectDB from "./config/db.js";
import Product from "./models/Product.js";

dotenv.config();

const FX_RATE = Number(process.env.USD_TO_INR_RATE || 83);
const APPLY = process.argv.includes("--apply");

const isLikelyUsdPrice = (price) => Number.isFinite(price) && price > 0 && price <= 500;

const run = async () => {
  await connectDB();

  const products = await Product.find({});
  const candidates = products.filter((p) => isLikelyUsdPrice(Number(p.price)));

  if (candidates.length === 0) {
    console.log("No likely USD-priced products found.");
    process.exit(0);
  }

  console.log(`Found ${candidates.length} likely USD-priced products.`);
  candidates.forEach((p) => {
    const oldPrice = Number(p.price);
    const newPrice = Math.round(oldPrice * FX_RATE);
    console.log(`${p._id} | ${p.title} | ${oldPrice} -> ${newPrice}`);
  });

  if (!APPLY) {
    console.log("Dry run complete. Re-run with --apply to update DB.");
    process.exit(0);
  }

  for (const product of candidates) {
    const oldPrice = Number(product.price);
    product.price = Math.round(oldPrice * FX_RATE);
    await product.save();
  }

  console.log(`Updated ${candidates.length} products to INR using rate ${FX_RATE}.`);
  process.exit(0);
};

run().catch((err) => {
  console.error("Price migration failed:", err);
  process.exit(1);
});

