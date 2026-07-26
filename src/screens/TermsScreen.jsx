import { useState } from "react";
import { BG, CARD, CARD2, BORDER, TEXT, MUTED, ACCENT, btnStyle } from "../lib/theme.js";

export function TermsScreen({onAccept, readOnly, onClose}) {
  const [tick1, setTick1] = useState(false);
  const [tick2, setTick2] = useState(false);
  const [hasScrolledEnd, setHasScrolledEnd] = useState(readOnly);
  const canAccept = tick1 && tick2;

  function checkScrollEnd(e) {
    if(hasScrolledEnd) return;
    const el = e.target;
    if(el.scrollTop + el.clientHeight >= el.scrollHeight - 12) setHasScrolledEnd(true);
  }

  return (
    <div style={{background:BG,height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"32px 20px 16px",background:`linear-gradient(180deg,${CARD2} 0%,${BG} 100%)`}}>
        <p style={{color:ACCENT,fontSize:11,textTransform:"uppercase",letterSpacing:2,fontWeight:700,margin:"0 0 6px"}}>{readOnly?"Reference":"Before you begin"}</p>
        <h1 style={{color:TEXT,fontSize:24,fontWeight:800,margin:"0 0 4px",letterSpacing:"-0.5px"}}>Terms & Conditions</h1>
        <p style={{color:MUTED,fontSize:13,margin:0}}>{readOnly?"For your reference":"Please read carefully before using Dublin Bus Shift Tracker"}</p>
      </div>

      <div onScroll={checkScrollEnd} style={{flex:1,overflowY:"auto",padding:"0 16px 16px"}}>
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:"18px 16px",marginBottom:16,fontSize:14,lineHeight:1.7,color:TEXT}}>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>1. Ownership &amp; Intellectual Property</p>
          <p style={{margin:"0 0 14px"}}>Dublin Bus Shift Tracker and all content within it, including running board data, interface design, and code, is the private property of the developer. All rights are reserved. The app may not be copied, redistributed, or reproduced in any form without the express written permission of the developer.</p>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>2. Private Use Only</p>
          <p style={{margin:"0 0 14px"}}>This app is provided for the personal, private use of authorised users only. It is not affiliated with, endorsed by, or connected to Dublin Bus, Dublin Bus management, or any trade union. Any resemblance to official Dublin Bus systems is incidental.</p>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>3. Data Accuracy &amp; Responsibility</p>
          <p style={{margin:"0 0 14px"}}>The accuracy of hours, compliance figures, and shift records displayed in this app is entirely dependent on the data entered by the user. The developer accepts no responsibility for errors arising from incorrect data entry. In any employment dispute or compliance matter, official records held by Dublin Bus take precedence over figures shown in this app.</p>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>4. Running Board Data</p>
          <p style={{margin:"0 0 14px"}}>Running board and schedule information displayed in the app is sourced from Dublin Bus operational data. This data may not always reflect last-minute operational changes, diversions, or schedule amendments. Users should always verify current duties through official Dublin Bus channels. The developer will endeavour to keep data up to date but cannot guarantee real-time accuracy.</p>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>5. Data Storage &amp; Privacy</p>
          <p style={{margin:"0 0 14px"}}>All data entered into the app is stored locally on your device only. The developer has no access to your personal data, shift records, or usage information at any time.</p>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>6. Limitation of Liability</p>
          <p style={{margin:"0 0 14px"}}>The developer accepts no liability for any loss, consequence, or outcome arising from the use of or reliance on information displayed in this app, including but not limited to hours calculations, compliance figures, or running board data.</p>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>7. Availability &amp; Access</p>
          <p style={{margin:"0 0 14px"}}>The app may be updated, modified, or taken offline at any time and without prior notice. Access may be revoked at the developer's sole discretion. Features may be added or removed without notice.</p>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>8. Safe Use</p>
          <p style={{margin:"0 0 0"}}>This app must never be used while driving, operating a vehicle, or in any situation where use of a mobile device is prohibited by law or company policy. The developer accepts no liability for any incident arising from unsafe use of the app.</p>
        </div>

        {readOnly ? (
          <button onClick={onClose} style={{...btnStyle,marginBottom:32}}>Close</button>
        ) : (<>

        {!hasScrolledEnd && (
          <p style={{color:ACCENT,fontSize:12,textAlign:"center",margin:"0 0 10px",fontWeight:600}}>Scroll to the bottom to continue ↓</p>
        )}

        {/* Checkbox 1 */}
        <div onClick={()=>hasScrolledEnd&&setTick1(!tick1)} style={{background:CARD,border:`1px solid ${tick1?ACCENT:BORDER}`,borderRadius:14,padding:"16px",marginBottom:10,cursor:hasScrolledEnd?"pointer":"not-allowed",opacity:hasScrolledEnd?1:0.5,display:"flex",gap:14,alignItems:"flex-start"}}>
          <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${tick1?ACCENT:BORDER}`,background:tick1?ACCENT:"none",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",marginTop:1}}>
            {tick1&&<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#07090F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          <p style={{color:tick1?TEXT:MUTED,fontSize:13,fontWeight:tick1?600:400,margin:0,lineHeight:1.5}}>I have read and agree to the Terms &amp; Conditions above</p>
        </div>

        {/* Checkbox 2 */}
        <div onClick={()=>hasScrolledEnd&&setTick2(!tick2)} style={{background:CARD,border:`1px solid ${tick2?ACCENT:BORDER}`,borderRadius:14,padding:"16px",marginBottom:20,cursor:hasScrolledEnd?"pointer":"not-allowed",opacity:hasScrolledEnd?1:0.5,display:"flex",gap:14,alignItems:"flex-start"}}>
          <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${tick2?ACCENT:BORDER}`,background:tick2?ACCENT:"none",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",marginTop:1}}>
            {tick2&&<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#07090F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          <p style={{color:tick2?TEXT:MUTED,fontSize:13,fontWeight:tick2?600:400,margin:0,lineHeight:1.5}}>I confirm I will not use this app while driving or operating a vehicle</p>
        </div>

        <button onClick={onAccept} disabled={!canAccept} style={{...btnStyle,opacity:canAccept?1:0.35,marginBottom:32}}>
          Accept &amp; Continue
        </button>
        </>)}
      </div>
    </div>
  );
}
