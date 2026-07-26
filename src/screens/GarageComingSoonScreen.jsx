import { BG, CARD2, BORDER, TEXT, MUTED, btnStyle } from "../lib/theme.js";
import { BusLogo } from "../components/shared.jsx";

// ─── GARAGE COMING SOON SCREEN ─────────────────────────────────────────────────
// Shown instead of Home for any driver whose garage doesn't have a roster
// loaded yet (see hasLiveRoster in lib/garages.js) — right now that's every
// garage except Summerhill, whose duties are the only ones built into the app.
export function GarageComingSoonScreen({garage, onSignOut}) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:`radial-gradient(circle at 50% 0%,${CARD2} 0%,${BG} 60%)`,padding:24,textAlign:"center"}}>
      <div style={{marginBottom:20}}><BusLogo size={64}/></div>
      <h1 style={{color:TEXT,fontSize:24,fontWeight:800,margin:"0 0 12px",letterSpacing:"-0.5px"}}>{garage} is coming soon</h1>
      <p style={{color:MUTED,fontSize:15,maxWidth:320,lineHeight:1.6,margin:"0 0 28px"}}>
        Shift Tracker only has duty rosters loaded for Summerhill right now. {garage}'s duties haven't been added yet — you'll get a notification here as soon as they are.
      </p>
      <button style={{...btnStyle,maxWidth:240,background:"transparent",border:`1px solid ${BORDER}`,color:MUTED}} onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
