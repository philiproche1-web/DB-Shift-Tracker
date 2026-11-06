import { BORDER, CARD2, MUTED } from "../lib/theme.js";

// Rim colour by level for levelled badges (bronze → silver → gold → …).
const RIMS = ["#CD7F32", "#C0C0C0", "#FFCD00", "#60E0FF", "#C084FC"];

export function rimColor(badge, level) {
  if (!badge.levels || badge.levels.length === 1) return badge.color;
  return RIMS[Math.min(Math.max(level, 0), RIMS.length - 1)];
}

// Round medal: emoji on a category tint with a coloured rim. Locked badges
// are a dashed outline; secret ones show "?".
export function Badge({badge, level = 0, earned = true, hidden = false, size = 64}) {
  const font = `${(size * 0.46) / 16}rem`;
  if (!earned) {
    return (
      <div aria-hidden="true" style={{width:size,height:size,borderRadius:"50%",border:`2px dashed ${BORDER}`,background:CARD2,
        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:MUTED,fontSize:font,fontWeight:800,filter:hidden?"none":"grayscale(1)",opacity:hidden?1:0.45}}>
        {hidden ? "?" : badge.emoji}
      </div>
    );
  }
  const rim = rimColor(badge, level);
  return (
    <div aria-hidden="true" style={{width:size,height:size,borderRadius:"50%",background:`${badge.color}22`,border:`${Math.max(3, size / 20)}px solid ${rim}`,
      boxShadow:`0 0 ${size / 5}px ${rim}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:font,lineHeight:1}}>
      {badge.emoji}
    </div>
  );
}
