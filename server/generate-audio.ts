import { textToSpeech } from "./replit_integrations/audio/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const VOICE = "nova" as const;

const scripts: Record<string, string> = {
  "welcome": "Welcome to North State Pathways! Let's find the right path for you. Which area interests you most — Healthcare or Education?",
  "county": "Great choice! Now, which county do you live in? This helps us find programs near you.",
  "student-type": "Almost there! Tell us about your education background so we can match you with the best options.",
  "chat-start": "Perfect! I'm connecting you with our AI advisor now. They'll give you personalized recommendations based on what you've told us.",
};

async function generateAudio() {
  const outDir = join(process.cwd(), "public", "audio");
  await mkdir(outDir, { recursive: true });

  for (const [name, text] of Object.entries(scripts)) {
    console.log(`Generating: ${name}...`);
    try {
      const buffer = await textToSpeech(text, VOICE, "mp3");
      const filePath = join(outDir, `${name}.mp3`);
      await writeFile(filePath, buffer);
      console.log(`  Saved: ${filePath} (${buffer.length} bytes)`);
    } catch (err) {
      console.error(`  Error generating ${name}:`, err);
    }
  }
  console.log("Done!");
}

generateAudio().catch(console.error);
