import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const defaultCategories = [
  { name: "食費",   type: "expense", color: "#ef4444", icon: "utensils" },
  { name: "交通費", type: "expense", color: "#f97316", icon: "train" },
  { name: "日用品", type: "expense", color: "#eab308", icon: "shopping-cart" },
  { name: "娯楽",   type: "expense", color: "#22c55e", icon: "gamepad-2" },
  { name: "医療",   type: "expense", color: "#8b5cf6", icon: "heart-pulse" },
  { name: "固定費", type: "expense", color: "#06b6d4", icon: "zap" },
  { name: "その他", type: "expense", color: "#6b7280", icon: "circle-ellipsis" },
  { name: "給料",   type: "income",  color: "#22c55e", icon: "banknote" },
  { name: "補助金", type: "income",  color: "#0ea5e9", icon: "hand-coins" },
  { name: "その他", type: "income",  color: "#6b7280", icon: "circle-ellipsis" },
];

async function main() {
  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { name_type: { name: cat.name, type: cat.type } },
      update: {},
      create: cat,
    });
  }
  console.log("Seeded default categories.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
