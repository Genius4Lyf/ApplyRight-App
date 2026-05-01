// One-shot script: pads the existing icon into a 1024x1024 adaptive-icon
// foreground with ~25% margin on each side, plus a solid white background.
// Run: node scripts/pad-icon.js
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SRC_ICON = path.join(root, 'assets', 'icon.png');
const FG_OUT = path.join(root, 'assets', 'icon-foreground.png');
const BG_OUT = path.join(root, 'assets', 'icon-background.png');

const CANVAS = 1024;
const LOGO = 540; // ~52% of canvas → ~24% margin on each side, fits the adaptive-icon safe zone

async function main() {
  const resized = await sharp(SRC_ICON)
    .resize(LOGO, LOGO, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(FG_OUT);

  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toFile(BG_OUT);

  console.log('Wrote', FG_OUT);
  console.log('Wrote', BG_OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
