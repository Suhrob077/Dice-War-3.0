import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  "https://wcmrbzppkqfeiapxczin.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbXJienBwa3FmZWlhcHhjemluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjYyMzAsImV4cCI6MjA3MDg0MjIzMH0.zbPzlkKDnKniArInLAD_6McAsXs1i0obNu1UvLXbkGc"
);

async function generate() {
  const publicDir = path.join(__dirname, "../public");
  const files = [];

  async function readDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await readDir(fullPath);
      } else {
        const relativePath = "/" + path.relative(publicDir, fullPath).replace(/\\/g, "/");
        files.push(relativePath);
      }
    }
  }

  await readDir(publicDir);

  // Supabase heroes URL’larini olish
  const { data: heroes, error } = await supabase.from("heroes").select("image_url");
  if (error) {
    console.error("Supabase heroes fetch error:", error);
  } else {
    heroes.forEach(hero => files.push(hero.image_url));
  }

  // Manifest faylni yaratish
  const manifestPath = path.join(publicDir, "resource-manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(files, null, 2));

  console.log(`✅ Manifest generated with Supabase heroes: ${manifestPath}`);
}

generate().catch(console.error);
