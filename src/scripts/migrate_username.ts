import { prisma } from "../lib/prisma";

async function run() {
  console.log("Altering table...");
  await prisma.$executeRawUnsafe(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);"
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(300);"
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(255);"
  );
  await prisma.$executeRawUnsafe(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100);"
  );
  console.log("Columns added successfully!");

  const users = await prisma.user.findMany();
  console.log("Total users:", users.length);

  for (const u of users) {
    if (!u.username) {
      const base =
        u.email
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 25) || "user";
      let candidate = base;
      const existing = await prisma.user.findUnique({
        where: { username: candidate },
      });
      if (existing) {
        candidate = candidate + "_" + Math.floor(1000 + Math.random() * 9000);
      }
      await prisma.user.update({
        where: { id: u.id },
        data: { username: candidate },
      });
      console.log("Updated user username:", u.email, "->", candidate);
    }
  }

  await prisma.$executeRawUnsafe(
    "CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users(username);"
  );
  console.log("Unique index added successfully!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
