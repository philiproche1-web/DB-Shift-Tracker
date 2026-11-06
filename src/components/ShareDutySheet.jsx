import { useState, useEffect } from "react";
import { getDayType, today } from "../lib/dutyMath.js";
import { CARD, BORDER, TEXT, MUTED, ACCENT, btnStyle, cardStyle, inputStyle } from "../lib/theme.js";
import { buildShareCaption, nextDateForDayType, renderDutyImage, shareDutyImage, shareFilename } from "../lib/dutyShare.js";
import { trackEvent } from "../lib/analytics.js";
import { recordUsage } from "../lib/usage.js";
import { DateInput, FieldLabel, useModalA11y } from "./shared.jsx";
import { displayRoster } from "../lib/roster.js";

const DAY_TYPE_WORD = { weekday: "Mon–Fri", saturday: "Saturday", sunday: "Sunday" };

// Bottom sheet: preview + (Lookup only) date + editable caption + Share.
// duty: { roster, zone, dutyNo, reportTime, breakStart, finishTime, seq, date? }
// dayType: only passed from Lookup, which has no date — the sheet then asks.
export function ShareDutySheet({ duty, dayType, source, onClose }) {
  const ref = useModalA11y(onClose);
  const [date, setDate] = useState(duty.date || nextDateForDayType(dayType, today()));
  const data = { ...duty, date };
  const [caption, setCaption] = useState(() => buildShareCaption(data));
  const [captionEdited, setCaptionEdited] = useState(false);
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState("");

  // Re-render the image whenever the date changes (Lookup); Home is fixed.
  useEffect(() => {
    let cancelled = false, url = null;
    setBlob(null);
    renderDutyImage(data).then((b) => {
      if (cancelled) return;
      url = URL.createObjectURL(b);
      setBlob(b); setPreviewUrl(url);
    }).catch(() => { if (!cancelled) setStatus("Couldn't build the image on this phone."); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  function changeDate(v) {
    setDate(v);
    if (!captionEdited) setCaption(buildShareCaption({ ...duty, date: v }));
  }

  async function share() {
    if (!blob) return;
    const result = await shareDutyImage({ blob, caption, filename: shareFilename(data) });
    trackEvent("duty_shared", { source, result });
    if (result !== "cancelled") recordUsage("share", date);
    if (result === "shared") onClose();
    else if (result === "downloaded") setStatus("Image saved. Caption copied — paste it in WhatsApp.");
  }

  const wrongDay = dayType && date && getDayType(date) !== dayType;

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#00000099",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,padding:12}}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Share this duty" tabIndex={-1} onClick={(e)=>e.stopPropagation()}
        style={{...cardStyle,background:CARD,width:"100%",maxWidth:420,padding:16,outline:"none",boxSizing:"border-box",maxHeight:"100%",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:12}}>
          <p style={{color:TEXT,fontWeight:800,fontSize:"1.0625rem",margin:0}}>Swap {displayRoster(duty.roster)}</p>
          <button type="button" onClick={onClose} aria-label="Close" style={{background:"none",border:`1px solid ${BORDER}`,color:TEXT,borderRadius:10,width:44,height:44,fontSize:"1.25rem",cursor:"pointer",flexShrink:0}}>×</button>
        </div>

        {dayType && (
          <div style={{marginBottom:12}}>
            <FieldLabel htmlFor="share-date">Date</FieldLabel>
            <DateInput id="share-date" value={date} min={today()} onChange={(e)=>changeDate(e.target.value)} invalid={wrongDay}/>
            {wrongDay && <p style={{color:ACCENT,fontSize:"0.75rem",margin:"6px 0 0"}}>This is a {DAY_TYPE_WORD[dayType]} duty — that date runs {DAY_TYPE_WORD[getDayType(date)]} duties.</p>}
          </div>
        )}

        <div style={{borderRadius:12,overflow:"hidden",border:`1px solid ${BORDER}`,marginBottom:12,maxHeight:220,overflowY:"auto",background:"#07090F"}}>
          {previewUrl
            ? <img src={previewUrl} alt={`Image of duty ${displayRoster(duty.roster)}`} style={{display:"block",width:"100%"}}/>
            : <p style={{color:MUTED,fontSize:"0.8125rem",textAlign:"center",padding:"40px 0",margin:0}}>Building image…</p>}
        </div>

        <FieldLabel htmlFor="share-caption" hint="edit the last line">Caption</FieldLabel>
        <textarea id="share-caption" value={caption} rows={3}
          onChange={(e)=>{setCaption(e.target.value); setCaptionEdited(true);}}
          style={{...inputStyle,resize:"vertical",fontFamily:"inherit",lineHeight:1.4,marginBottom:12}}/>

        <button type="button" onClick={share} disabled={!blob} style={{...btnStyle,opacity:blob?1:0.5,cursor:blob?"pointer":"default"}}>Share</button>
        <p style={{color:MUTED,fontSize:"0.75rem",margin:"8px 0 0",textAlign:"center"}}>
          {status || "Pick WhatsApp in the list."}
        </p>
      </div>
    </div>
  );
}
