import { textToSpeech } from "./replit_integrations/audio/client";
import { writeFile, mkdir } from "fs/promises";

const scripts = [
  {
    filename: "step1-pathway.mp3",
    text: "Welcome to North State Pathways. Your journey to a meaningful career starts right here. Whether you're drawn to healthcare or education, we'll help you find the perfect path forward."
  },
  {
    filename: "step2-county.mp3",
    text: "The North State is home to ten beautiful counties, each with unique opportunities. Choose where you call home, and we'll connect you with programs right in your community."
  },
  {
    filename: "step3-student.mp3",
    text: "Every student's journey is different. Whether you're just starting out or looking to advance your career, there's a pathway designed for exactly where you are right now."
  },
  {
    filename: "step4-location.mp3",
    text: "Some students thrive close to home, while others are ready for a new adventure. Either way, Northern California has incredible options waiting for you."
  },
  {
    filename: "step5-support.mp3",
    text: "From financial aid to hands-on work experience, we're here to support every part of your journey. Let us know what matters most to you."
  }
];

async function generate() {
  await mkdir("public/audio", { recursive: true });

  for (const script of scripts) {
    console.log(`Generating: ${script.filename}...`);
    const buffer = await textToSpeech(script.text, "nova", "mp3");
    await writeFile(`public/audio/${script.filename}`, buffer);
    console.log(`  Saved: public/audio/${script.filename} (${buffer.length} bytes)`);
  }

  console.log("All narration audio files generated!");
}

generate().catch(console.error).finally(() => process.exit(0));
