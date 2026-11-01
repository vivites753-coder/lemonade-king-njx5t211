// Small pictures drawn on the scene where the game once drew emoji: the faces over people's heads, the goods on the
// menu board and by the coins that float up, the marks on signs. A key is the emoji the simulation uses for a feeling
// or a thing, "gi:<name>" for a shape of src/ui/glyphs.ts (drawn in one colour), or the id of a picture.
import { GLYPHS, type GlyphName } from '../ui/glyphs';
import { getImage } from './assets';
import type { Ctx } from './iso';

const PICTO: Record<string, string> = {
  '😠': 'ui_em_angry',
  '😡': 'ui_em_angry',
  '🙂': 'ui_em_happy',
  '😋': 'ui_em_happy',
  '😍': 'ui_em_love',
  '😐': 'ui_em_meh',
  '😕': 'ui_em_meh',
  '😢': 'ui_em_sad',
  '😝': 'ui_em_sour',
  '🥴': 'ui_em_dizzy',
  '💫': 'ui_em_dizzy',
  '🎁': 'ui_em_gift',
  '💸': 'ui_em_money',
  '⏳': 'ui_em_wait',
  '❗': 'ui_em_alert',
  '💥': 'ui_em_alert',
  '💬': 'ui_em_chat',
  '⏰': 'ui_em_clock',
  '🤒': 'ui_em_sick',
  '🤢': 'ui_em_sick',
  // somebody wants a lemonade (street.ts)
  '💭': 'ui_em_want',
  '🍋': 'ui_gd_lemon',
  '🍪': 'ui_gd_cookie',
  '🍊': 'ui_gd_orange',
  '🧃': 'ui_gd_juice',
  '🍰': 'ui_gd_pastry',
  '💛': 'ui_heart',
  '🐱': 'char_cat_sit',
  '👛': 'item_wallet',
  '🎈': 'item_balloon_red',
  '✨': 'ui_coin',
};

/** The shapes, made once. */
const shapes = new Map<string, Path2D>();

/** True when `key` has a picture or a shape to draw (else it is plain text, like "2/5"). */
export function hasPicto(key: string): boolean {
  return key.startsWith('gi:') || key in PICTO;
}

/** Draws the picture of `key` centred at (x, y), `size` high; a shape is filled with `color`. Nothing while the
 * picture is still loading. Returns the width it takes. */
export function picto(ctx: Ctx, key: string, x: number, y: number, size: number, color = '#ffffff'): number {
  if (key.startsWith('gi:')) {
    const name = key.slice(3) as GlyphName;
    let p = shapes.get(name);
    if (!p) {
      p = new Path2D(/d="([^"]+)"/.exec(GLYPHS[name])?.[1] ?? '');
      shapes.set(name, p);
    }
    ctx.save();
    ctx.translate(x - size / 2, y - size / 2);
    ctx.scale(size / 256, size / 256);
    ctx.fillStyle = color;
    ctx.fill(p);
    ctx.restore();
    return size;
  }
  const img = getImage(PICTO[key] ?? key);
  if (!img) return size;
  const w = (size * img.naturalWidth) / img.naturalHeight;
  ctx.drawImage(img, x - w / 2, y - size / 2, w, size);
  return w;
}
