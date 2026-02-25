import { db } from "./db";
import { onboardingScripts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { textToSpeech } from "./replit_integrations/audio/client";
import fs from "fs";
import path from "path";

const AUDIO_DIR = path.join(process.cwd(), "public", "audio", "onboarding", "es");

async function generateSpanishAudio() {
  const scripts = await db.select().from(onboardingScripts).where(eq(onboardingScripts.language, "es"));

  if (scripts.length === 0) {
    console.log("No Spanish scripts found. Run seed first.");
    return;
  }

  console.log(`Found ${scripts.length} Spanish scripts. Generating audio...`);

  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }

  let success = 0;
  let failed = 0;

  for (const script of scripts) {
    const filename = `${script.step}${script.contextKey ? `-${script.contextKey}` : ""}-pw${script.pathwayId}.mp3`;
    const filepath = path.join(AUDIO_DIR, filename);
    const audioUrl = `/audio/onboarding/es/${filename}`;

    if (script.audioUrl && fs.existsSync(path.join(process.cwd(), "public", script.audioUrl.replace(/^\//, "")))) {
      console.log(`  Skipping (already exists): ${filename}`);
      success++;
      continue;
    }

    try {
      console.log(`  Generating: ${filename} (${script.scriptText.substring(0, 60)}...)`);

      const buffer = await textToSpeech(script.scriptText, "nova", "mp3");

      fs.writeFileSync(filepath, buffer);

      await db.update(onboardingScripts)
        .set({ audioUrl, updatedAt: new Date() })
        .where(eq(onboardingScripts.id, script.id));

      success++;
      console.log(`  Done: ${filename} (${buffer.length} bytes)`);
    } catch (err: any) {
      failed++;
      console.error(`  FAILED: ${filename} - ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nComplete: ${success} succeeded, ${failed} failed out of ${scripts.length} total.`);
}

generateSpanishAudio().catch(console.error).finally(() => process.exit(0));
