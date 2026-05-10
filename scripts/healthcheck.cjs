/**
 * Health Check Script - Groq API Connection Tester
 * Jalankan: npm run health:check
 */

const fs = require("fs");
const path = require("path");

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";

function pass(msg) { console.log(`  ${GREEN}\u2713${RESET} ${msg}`); }
function fail(msg) { console.log(`  ${RED}\u2717${RESET} ${msg}`); }
function warn(msg) { console.log(`  ${YELLOW}!${RESET} ${msg}`); }
function info(msg) { console.log(`  ${CYAN}\u2192${RESET} ${msg}`); }

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama-3.1-70b-versatile",
  "mixtral-8x7b-32768",
];

const GROQ_SERVICE_PATH = path.resolve(__dirname, "..", "src", "services", "groqService.ts");

async function testModel(apiKey, model) {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Respond with only: OK" }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "";
      return { ok: true, reply: reply.trim().substring(0, 30) };
    }
    const err = await res.json().catch(() => ({}));
    return { ok: false, status: res.status, error: err?.error?.message || `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

async function main() {
  console.log(`\n${BOLD}======================================${RESET}`);
  console.log(`${BOLD}  Groq API Health Check${RESET}`);
  console.log(`${BOLD}======================================${RESET}\n`);

  let allPassed = true;

  // ── Test 1: Check .env file ──
  console.log(`${BOLD}[1/4] File .env${RESET}`);
  const envPath = path.resolve(__dirname, "..", ".env");
  let apiKey = "";

  if (!fs.existsSync(envPath)) {
    fail("File .env tidak ditemukan!");
    info("Buat file .env di root project dengan isi:");
    info("VITE_GROQ_API_KEY=your_api_key_here");
    allPassed = false;
  } else {
    pass("File .env ditemukan");
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/VITE_GROQ_API_KEY\s*=\s*(.+)/);
    if (!match || !match[1] || match[1].trim() === "" || match[1].trim() === "paste_your_groq_api_key_here") {
      fail("VITE_GROQ_API_KEY kosong atau belum diisi!");
      info("Buka file .env dan ganti dengan API Key dari https://console.groq.com/keys");
      allPassed = false;
    } else {
      apiKey = match[1].trim();
      pass(`VITE_GROQ_API_KEY terdeteksi (${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)})`);
      if (!apiKey.startsWith("gsk_")) {
        warn("API Key Groq biasanya diawali dengan 'gsk_'. Pastikan key Anda benar.");
        allPassed = false;
      } else {
        pass("Format API Key valid (diawali gsk_)");
      }
    }
  }

  // ── Test 2: Internet connectivity ──
  console.log(`\n${BOLD}[2/4] Koneksi Internet${RESET}`);
  try {
    const res = await fetch("https://www.google.com", { method: "HEAD", signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      pass("Koneksi internet aktif");
    } else {
      fail(`Respons tidak normal: HTTP ${res.status}`);
      allPassed = false;
    }
  } catch (err) {
    fail("Tidak dapat terhubung ke internet!");
    info(`Error: ${err.message}`);
    info("Periksa koneksi WiFi/LAN Anda");
    allPassed = false;
  }

  // ── Test 3: Groq API reachable ──
  console.log(`\n${BOLD}[3/4] Koneksi ke Server Groq${RESET}`);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", { method: "GET", signal: AbortSignal.timeout(5000) });
    pass(`Server Groq API dapat dijangkau (HTTP ${res.status})`);
  } catch (err) {
    fail("Tidak dapat terhubung ke server Groq API!");
    info(`Error: ${err.message}`);
    info("Kemungkinan koneksi diblokir oleh firewall atau proxy kampus");
    allPassed = false;
  }

  // ── Test 4: Test multiple models ──
  console.log(`\n${BOLD}[4/4] Validasi API Key & Model${RESET}`);

  if (!apiKey || apiKey === "paste_your_groq_api_key_here") {
    warn("Skipped \u2014 API Key belum diisi");
  } else {
    console.log(`  Testing ${MODELS.length} model...`);
    let workingModel = null;

    for (const model of MODELS) {
      const result = await testModel(apiKey, model);
      if (result.ok) {
        pass(`${model} ${GREEN}WORKS${RESET} \u2014 Respons: "${result.reply}"`);
        if (!workingModel) workingModel = model;
      } else {
        const shortErr = result.error.length > 60 ? result.error.substring(0, 60) + "..." : result.error;
        fail(`${model} ${RED}FAILED${RESET} \u2014 ${shortErr}`);
      }
    }

    if (workingModel) {
      // Read current groqService.ts to check which model is used
      if (fs.existsSync(GROQ_SERVICE_PATH)) {
        const serviceContent = fs.readFileSync(GROQ_SERVICE_PATH, "utf8");
        const modelMatch = serviceContent.match(/const MODEL\s*=\s*"([^"]+)"/);
        const currentModel = modelMatch ? modelMatch[1] : "unknown";

        if (currentModel === workingModel) {
          pass(`groqService.ts sudah menggunakan model yang benar: ${workingModel}`);
        } else {
          warn(`groqService.ts menggunakan "${currentModel}" tapi yang berfungsi adalah "${workingModel}"`);
          info(`Mengupdate groqService.ts ke model: ${workingModel}...`);
          const updated = serviceContent.replace(
            /const MODEL\s*=\s*"[^"]+"/,
            `const MODEL = "${workingModel}"`
          );
          fs.writeFileSync(GROQ_SERVICE_PATH, updated);
          pass(`groqService.ts berhasil diupdate ke: ${workingModel}`);
          info("Restart dev server (npm run dev) agar perubahan diterapkan");
        }
      }
    } else {
      allPassed = false;
      console.log("");
      fail("Tidak ada model yang berfungsi dengan API Key ini!");
      info("Kemungkinan penyebab:");
      info("  1. API Key tidak valid \u2014 buat key baru di https://console.groq.com/keys");
      info("  2. Rate limit tercapai \u2014 tunggu beberapa menit lalu coba lagi");
      info("  3. Model sudah deprecated \u2014 cek https://console.groq.com/docs/models");
    }
  }

  // ── Summary ──
  console.log(`\n${BOLD}======================================${RESET}`);
  if (allPassed) {
    console.log(`${GREEN}${BOLD}  Semua pengecekan PASSED!${RESET}`);
    console.log(`  Chatbot seharusnya berfungsi normal.`);
    console.log(`  Jalankan: npm run dev`);
  } else {
    console.log(`${RED}${BOLD}  Ada masalah yang perlu diperbaiki!${RESET}`);
    console.log(`  Perbaiki error di atas lalu jalankan ulang:`);
    console.log(`  npm run health:check`);
  }
  console.log(`${BOLD}======================================${RESET}\n`);
}

main();