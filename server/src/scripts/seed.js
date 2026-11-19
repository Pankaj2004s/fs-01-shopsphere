import mongoose from "mongoose";
import { env } from "../config/env.js";
import User from "../features/users/user.model.js";
import Category from "../features/categories/category.model.js";
import Product from "../features/products/product.model.js";

const SEED_PASSWORD = "password123";

const vendorsData = [
  { name: "Asha Traders", email: "asha.vendor@seed.shopsphere.dev" },
  { name: "Ravi Store", email: "ravi.vendor@seed.shopsphere.dev" },
];

const categoryNames = ["Books", "Electronics", "Fashion"];

const productsData = [
  {
    name: "Clean Code",
    price: 499,
    stock: 25,
    category: "Books",
    vendor: 0,
    image: "clean-code",
  },
  {
    name: "The Pragmatic Programmer",
    price: 599,
    stock: 18,
    category: "Books",
    vendor: 0,
    image: "pragmatic-programmer",
  },
  {
    name: "Atomic Habits",
    price: 399,
    stock: 40,
    category: "Books",
    vendor: 1,
    image: "atomic-habits",
  },
  {
    name: "Wireless Mouse",
    price: 799,
    stock: 60,
    category: "Electronics",
    vendor: 1,
    image: "wireless-mouse",
  },
  {
    name: "Mechanical Keyboard",
    price: 3499,
    stock: 15,
    category: "Electronics",
    vendor: 0,
    image: "mechanical-keyboard",
  },
  {
    name: "USB-C Charger 65W",
    price: 1299,
    stock: 32,
    category: "Electronics",
    vendor: 1,
    image: "usb-c-charger",
  },
  {
    name: "Cotton T-Shirt",
    price: 349,
    stock: 100,
    category: "Fashion",
    vendor: 0,
    image: "cotton-tshirt",
  },
  {
    name: "Denim Jeans",
    price: 1499,
    stock: 45,
    category: "Fashion",
    vendor: 1,
    image: "denim-jeans",
  },
  {
    name: "Running Shoes",
    price: 2499,
    stock: 22,
    category: "Fashion",
    vendor: 0,
    image: "running-shoes",
  },
];

// The images are SVG files in client/public/products, served by the client.
// CLIENT_URL decides the host: localhost for development, the Vercel URL for live.
const imageBase = `${process.env.CLIENT_URL ?? "http://localhost:5173"}/products`;
const productImage = (file) => `${imageBase}/${file}.svg`;

const seed = async () => {
  await mongoose.connect(env.mongoUri);

  const categories = {};
  for (const name of categoryNames) {
    const existing = await Category.findOne({ name }).collation({
      locale: "en",
      strength: 2,
    });
    categories[name] = existing ?? (await Category.create({ name }));
  }

  const vendors = [];
  for (const vendor of vendorsData) {
    const existing = await User.findOne({ email: vendor.email });
    vendors.push(
      existing ??
        (await User.create({
          ...vendor,
          role: "vendor",
          password: SEED_PASSWORD,
        })),
    );
  }

  await Product.deleteMany({ vendor: { $in: vendors.map((v) => v._id) } });

  const docs = productsData.map(({ category, vendor, image, ...rest }) => ({
    ...rest,
    description: `${rest.name} - sample product for ShopSphere`,
    images: [productImage(image)],
    category: categories[category]._id,
    vendor: vendors[vendor]._id,
  }));

  const created = await Product.insertMany(docs);

  console.log("Categories:", categoryNames.length);
  console.log("Vendors:", vendors.length);
  console.log("Products created:", created.length);
};

try {
  await seed();
} catch (err) {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
