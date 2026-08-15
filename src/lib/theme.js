// Mutable theme state — plain `let`s (not React state) so applyTheme() can
// swap them and every component just re-reads the live module binding on
// its next render, triggered by the forceUpdate callback passed in.
export function compColor(current, max) {
  const p = current / max;
  return p >= 1 ? DANGER : p >= 0.8 ? "#f59e0b" : SUCCESS;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
// let (not const) so theme changes can mutate them and trigger re-render
export let BG="#07090F",CARD="#0D1321",BORDER="#1A2438",CARD2="#141B2D";
export let TEXT="#FFFFFF",MUTED="#8C99B8";
export let NAV="#0A0E1A",NAV_MUTED="#8C99B8";
export const ACCENT="#FFCD00",SUCCESS="#00C896",DANGER="#FF4455";

let currentThemeIsDark = true;

// NAV is the bottom nav's own surface, and NAV_MUTED its inactive label
// colour. They are theme tokens rather than the literals the nav used to
// hardcode: in light mode the bar rendered as a near-black slab under a
// near-white app, and its inactive labels measured 4.05:1 against it —
// below the 4.5:1 WCAG AA floor for 10px text, in the theme a driver in
// bright sunlight is most likely using. Both values below clear 4.5:1
// against their own NAV surface.
export const DARK  = {BG:"#07090F",CARD:"#0D1321",BORDER:"#1A2438",CARD2:"#141B2D",TEXT:"#FFFFFF",MUTED:"#8C99B8",INPUT:"#0A0E1A",NAV:"#0A0E1A",NAV_MUTED:"#8C99B8"};
export const LIGHT = {BG:"#F5F7FA",CARD:"#FFFFFF",BORDER:"#D8DFE8",CARD2:"#EEF1F5",TEXT:"#0D1321",MUTED:"#64748B",INPUT:"#FFFFFF",NAV:"#FFFFFF",NAV_MUTED:"#5A6678"};

export let cardStyle={background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:18};
export let inputStyle={background:DARK.INPUT,border:`1px solid ${BORDER}`,borderRadius:8,padding:"12px 14px",color:TEXT,fontSize:16,width:"100%",boxSizing:"border-box",WebkitAppearance:"none"};
export let btnStyle={background:ACCENT,color:"#07090F",border:"none",borderRadius:12,padding:"16px 20px",fontSize:16,fontWeight:800,cursor:"pointer",width:"100%",letterSpacing:"0.3px"};
export const tag=(c)=>({background:c+"22",color:c,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,display:"inline-block",letterSpacing:"0.5px",textTransform:"uppercase"});

export function applyTheme(appearance, forceUpdate) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = appearance==="dark"||(appearance==="system"&&prefersDark);
  currentThemeIsDark = dark;
  const t = dark ? DARK : LIGHT;
  BG=t.BG; CARD=t.CARD; BORDER=t.BORDER; CARD2=t.CARD2; TEXT=t.TEXT; MUTED=t.MUTED;
  NAV=t.NAV; NAV_MUTED=t.NAV_MUTED;
  cardStyle  = {background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:18};
  inputStyle = {background:t.INPUT,border:`1px solid ${BORDER}`,borderRadius:8,padding:"12px 14px",color:TEXT,fontSize:16,width:"100%",boxSizing:"border-box",WebkitAppearance:"none"};
  btnStyle   = {background:ACCENT,color:"#07090F",border:"none",borderRadius:12,padding:"16px 20px",fontSize:16,fontWeight:800,cursor:"pointer",width:"100%",letterSpacing:"0.3px"};
  // The address/status bar colour was hardcoded dark in index.html, so it
  // stayed black in light mode. This can't be a static <meta> pair keyed off
  // prefers-color-scheme, because "dark"/"light" here can come from the
  // driver's own in-app choice, not just the OS — so it's set here,
  // wherever the resolved theme actually changes, same as every other token
  // on this page.
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", BG);
  }
  if(forceUpdate) forceUpdate();
}
