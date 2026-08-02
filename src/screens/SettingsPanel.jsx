import { useState, useEffect } from "react";
import { isCalendarSunday, addDays, fmtShort } from "../lib/dutyMath.js";
import { ZONES } from "../lib/roster.js";
import { garageOptions } from "../lib/garages.js";
import { CARD, CARD2, BORDER, TEXT, MUTED, SUCCESS, DANGER, cardStyle, inputStyle, btnStyle } from "../lib/theme.js";
import { loadSettings, saveSettings, APP_VERSION } from "../lib/persistence.js";
import { SegGroup, DateInput, ConfirmDialog } from "../components/shared.jsx";

// ─── SETTINGS PANEL ───────────────────────────────────────────────────────────
export function SettingsPanel({period, onClose, onThemeChange, leaveSettings, onLeaveSettingsChange, onReplayTour, onViewTerms, onViewFAQ, onEditStartDate, driverGarage, onChangeGarage, driverFirstName, onChangeFirstName, onSendFeedback}) {
  const [settings, setSettings] = useState(loadSettings);
  const [annualInput, setAnnualInput] = useState(String(leaveSettings?.annualTotal||20));
  const [annualError, setAnnualError] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [editingStartDate, setEditingStartDate] = useState(false);
  const [startDateInput, setStartDateInput] = useState(period?.startDate||"");
  const startDateIsSunday = startDateInput && isCalendarSunday(startDateInput);
  const [breakMinInput, setBreakMinInput] = useState(String(settings.breakReminderMinutes ?? 10));
  const [breakMinError, setBreakMinError] = useState(null);
  const [editingGarage, setEditingGarage] = useState(false);
  const [garageInput, setGarageInput] = useState(driverGarage || "");
  const [garageSaving, setGarageSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(driverFirstName || "");
  const [nameSaving, setNameSaving] = useState(false);
  const appearances = [{v:"system",l:"📱 System"},{v:"light",l:"☀️ Light"},{v:"dark",l:"🌙 Dark"}];

  useEffect(()=>{
    if(!toast) return;
    const t = setTimeout(()=>setToast(null), 4000);
    return ()=>clearTimeout(t);
  },[toast]);

  function checkScrollEnd(e) {
    const el = e.target;
    setScrolledToEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 8);
  }

  function setAppearance(val) {
    const next = {...settings, appearance:val};
    setSettings(next); saveSettings(next);
    onThemeChange(val);
  }
  function setZone(z) {
    const next = {...settings, defaultZone:z};
    setSettings(next); saveSettings(next);
    localStorage.setItem("dbus_last_zone", z);
  }
  function toggleNotifications() {
    if (settings.notificationsEnabled) {
      const next = {...settings, notificationsEnabled:false};
      setSettings(next); saveSettings(next);
      return;
    }
    if (typeof Notification === "undefined") { setToast("Notifications aren't supported in this browser."); return; }
    Notification.requestPermission().then(perm => {
      if (perm === "granted") {
        const next = {...settings, notificationsEnabled:true};
        setSettings(next); saveSettings(next);
        setToast("Reminders on.");
      } else {
        setToast("Notifications blocked — allow them for this site in your phone's settings to use reminders.");
      }
    });
  }
  function toggleBreakReminder() {
    const next = {...settings, breakReminderEnabled: !settings.breakReminderEnabled};
    setSettings(next); saveSettings(next);
  }
  function saveBreakMinutes() {
    const n = parseInt(breakMinInput,10);
    if(isNaN(n) || n<1 || n>60) { setBreakMinError("Enter a number between 1 and 60."); return; }
    setBreakMinError(null);
    const next = {...settings, breakReminderMinutes:n};
    setSettings(next); saveSettings(next);
    setToast("Break reminder time saved.");
  }
  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === driverFirstName) { setEditingName(false); return; }
    setNameSaving(true);
    const ok = await onChangeFirstName(trimmed);
    setNameSaving(false);
    if (ok) { setEditingName(false); setToast("Name updated."); }
    else setToast("Couldn't update your name — try again.");
  }
  async function saveGarage() {
    if (garageInput === driverGarage) { setEditingGarage(false); return; }
    setGarageSaving(true);
    const ok = await onChangeGarage(garageInput);
    setGarageSaving(false);
    if (ok) { setEditingGarage(false); setToast(`Garage changed to ${garageInput}.`); }
    else setToast("Couldn't update your garage — try again.");
  }
  function saveAnnual() {
    const n = parseInt(annualInput,10);
    if(isNaN(n) || n<1 || n>30) { setAnnualError("Enter a number between 1 and 30."); return; }
    setAnnualError(null);
    onLeaveSettingsChange({...(leaveSettings||{}), annualTotal:n});
    setToast("Annual leave entitlement saved.");
  }

  return (
    <div style={{position:"fixed",inset:0,background:"#000000bb",zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={onClose}>
      <div style={{position:"relative",background:CARD,borderRadius:"20px 20px 0 0",border:`1px solid ${BORDER}`,borderBottom:"none",maxHeight:"85vh"}} onClick={e=>e.stopPropagation()}>
      <div onScroll={checkScrollEnd} style={{padding:24,maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{color:TEXT,fontSize:20,fontWeight:800,margin:0}}>Settings</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:MUTED,fontSize:24,cursor:"pointer",padding:"0 4px",lineHeight:1}}>×</button>
        </div>

        {toast && (
          <div style={{background:CARD2,border:`1px solid ${BORDER}`,borderRadius:10,padding:"10px 14px",marginBottom:16,color:TEXT,fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <span>{toast}</span>
            <button onClick={()=>setToast(null)} style={{background:"none",border:"none",color:MUTED,fontSize:16,cursor:"pointer",padding:0,lineHeight:1,flexShrink:0}}>×</button>
          </div>
        )}

        {/* Appearance */}
        <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 10px"}}>Appearance</p>
        <div style={{marginBottom:8}}>
          <SegGroup options={appearances.map(a=>({v:a.v,l:a.l}))} value={settings.appearance} cols={3} onChange={setAppearance}/>
        </div>
        <p style={{color:MUTED,fontSize:12,margin:"0 0 20px"}}>
          {settings.appearance==="system"?"Matches your phone's display setting.":settings.appearance==="light"?"Light mode — easier in bright daylight.":"Dark mode — easier in low light."}
        </p>

        {/* Name */}
        <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 10px"}}>Name</p>
        {!editingName ? (
          <div style={{...cardStyle,marginBottom:20,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <div>
              <p style={{color:TEXT,fontSize:14,fontWeight:600,margin:0}}>{driverFirstName || "Not set"}</p>
              <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>Used to personalize the app.</p>
            </div>
            <button onClick={()=>{setNameInput(driverFirstName||"");setEditingName(true);}}
              style={{background:CARD2,color:TEXT,border:`1px solid ${BORDER}`,borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer",flexShrink:0}}>
              Change
            </button>
          </div>
        ) : (
          <div style={{...cardStyle,marginBottom:20,padding:"14px 16px"}}>
            <input type="text" value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="First name" style={{...inputStyle,marginBottom:12}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={()=>{setEditingName(false);setNameInput(driverFirstName||"");}} style={{background:"transparent",color:MUTED,border:`1px solid ${BORDER}`,borderRadius:10,padding:"10px 8px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                Cancel
              </button>
              <button onClick={saveName} disabled={nameSaving || !nameInput.trim()} style={{...btnStyle,padding:"10px 8px",fontSize:13,borderRadius:10,opacity:(nameSaving||!nameInput.trim())?0.6:1}}>
                {nameSaving?"Saving…":"Save"}
              </button>
            </div>
          </div>
        )}

        {/* Garage */}
        <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 10px"}}>Garage</p>
        {!editingGarage ? (
          <div style={{...cardStyle,marginBottom:20,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <div>
              <p style={{color:TEXT,fontSize:14,fontWeight:600,margin:0}}>{driverGarage || "Not set"}</p>
              <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>Moved depot? Change it here.</p>
            </div>
            <button onClick={()=>{setGarageInput(driverGarage||"");setEditingGarage(true);}}
              style={{background:CARD2,color:TEXT,border:`1px solid ${BORDER}`,borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer",flexShrink:0}}>
              Change
            </button>
          </div>
        ) : (
          <div style={{...cardStyle,marginBottom:20,padding:"14px 16px"}}>
            <select value={garageInput} onChange={e=>setGarageInput(e.target.value)} style={{...inputStyle,marginBottom:12}} aria-label="Garage">
              {garageOptions().map(o=>(
                <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
              ))}
            </select>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={()=>{setEditingGarage(false);setGarageInput(driverGarage||"");}} style={{background:"transparent",color:MUTED,border:`1px solid ${BORDER}`,borderRadius:10,padding:"10px 8px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                Cancel
              </button>
              <button onClick={saveGarage} disabled={garageSaving} style={{...btnStyle,padding:"10px 8px",fontSize:13,borderRadius:10,opacity:garageSaving?0.6:1}}>
                {garageSaving?"Saving…":"Save"}
              </button>
            </div>
          </div>
        )}

        {/* Default Zone */}
        <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 10px"}}>Default zone</p>
        <p style={{color:MUTED,fontSize:12,margin:"0 0 10px"}}>Pre-selected when you open Lookup or Log a Shift.</p>
        <div style={{marginBottom:20}}>
          <SegGroup options={ZONES} value={settings.defaultZone} cols={4} onChange={setZone}/>
        </div>

        {/* Period start date */}
        {period && (
          <>
            <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 10px"}}>Period start date</p>
            {!editingStartDate ? (
              <div style={{...cardStyle,marginBottom:20,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                <div>
                  <p style={{color:TEXT,fontSize:14,fontWeight:600,margin:0}}>{fmtShort(period.startDate)} – {fmtShort(addDays(period.startDate,34))}</p>
                  <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>Entered the wrong Sunday? Fix it here.</p>
                </div>
                <button onClick={()=>{setStartDateInput(period.startDate);setEditingStartDate(true);}}
                  style={{background:CARD2,color:TEXT,border:`1px solid ${BORDER}`,borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer",flexShrink:0}}>
                  Change
                </button>
              </div>
            ) : (
              <div style={{...cardStyle,marginBottom:20,padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:8,background:"#F59E0B14",border:"1px solid #F59E0B44",borderRadius:10,padding:"10px 12px",margin:"0 0 12px"}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#F59E0B",flexShrink:0,marginTop:6}}/>
                  <p style={{color:"#F59E0B",fontSize:13,margin:0,lineHeight:1.4}}>The Sunday of your long week is your start date.</p>
                </div>
                <DateInput value={startDateInput} onChange={e=>setStartDateInput(e.target.value)}/>
                {!startDateIsSunday && (
                  <div style={{display:"flex",alignItems:"center",gap:8,margin:"10px 0 0"}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:DANGER,flexShrink:0}}/>
                    <p style={{color:DANGER,fontSize:13,margin:0}}>That's not a Sunday — periods must start on a Sunday.</p>
                  </div>
                )}
                {startDateIsSunday && startDateInput!==period.startDate && (
                  <div style={{display:"flex",alignItems:"center",gap:8,margin:"10px 0 0"}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:SUCCESS,flexShrink:0}}/>
                    <p style={{color:SUCCESS,fontSize:13,margin:0}}>{fmtShort(startDateInput)} – {fmtShort(addDays(startDateInput,34))} · 5 weeks</p>
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:14}}>
                  <button onClick={()=>setEditingStartDate(false)} style={{background:"transparent",color:MUTED,border:`1px solid ${BORDER}`,borderRadius:10,padding:"10px 8px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                    Cancel
                  </button>
                  <button
                    disabled={!startDateIsSunday || startDateInput===period.startDate}
                    onClick={()=>setConfirmDialog({
                      msg:`Change this period to start ${fmtShort(startDateInput)}? Your logged shifts and leave stay as they are, but which week they fall under may change.`,
                      yesLabel:"Save",
                      onYes:()=>{
                        onEditStartDate(startDateInput);
                        setConfirmDialog(null); setEditingStartDate(false);
                        setToast("Period start date updated.");
                      }
                    })}
                    style={{...btnStyle,padding:"10px 8px",fontSize:13,borderRadius:10,opacity:(!startDateIsSunday||startDateInput===period.startDate)?0.4:1}}>
                    Save
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Shift reminders */}
        <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 10px"}}>Shift reminders</p>
        <div style={{...cardStyle,marginBottom:20,padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={toggleNotifications}>
            <div>
              <p style={{color:TEXT,fontSize:14,fontWeight:600,margin:0}}>Notify me</p>
              <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>A nudge if today's shift isn't logged, or you're close to a limit — only while the app is open.</p>
            </div>
            <div style={{width:44,height:26,borderRadius:13,background:settings.notificationsEnabled?SUCCESS:BORDER,position:"relative",transition:"background 0.2s",flexShrink:0}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:settings.notificationsEnabled?21:3,transition:"left 0.2s"}}/>
            </div>
          </div>

          <div style={{borderTop:`1px solid ${BORDER}`,margin:"14px 0"}}/>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={toggleBreakReminder}>
            <div>
              <p style={{color:TEXT,fontSize:14,fontWeight:600,margin:0}}>Remind me before break ends</p>
              <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>{settings.breakReminderMinutes} minutes before your break finishes.</p>
            </div>
            <div style={{width:44,height:26,borderRadius:13,background:settings.breakReminderEnabled?SUCCESS:BORDER,position:"relative",transition:"background 0.2s",flexShrink:0}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:settings.breakReminderEnabled?21:3,transition:"left 0.2s"}}/>
            </div>
          </div>
          {settings.breakReminderEnabled && (
            <div style={{display:"flex",gap:8,alignItems:"center",marginTop:12}}>
              <input type="number" min="1" max="60" value={breakMinInput} onChange={e=>{setBreakMinInput(e.target.value);setBreakMinError(null);}}
                style={{...inputStyle,width:70,textAlign:"center",fontSize:16,fontWeight:700,padding:"8px",...(breakMinError?{borderColor:DANGER}:{})}}/>
              <span style={{color:MUTED,fontSize:13}}>minutes before</span>
              <button onClick={saveBreakMinutes} style={{...btnStyle,width:"auto",padding:"8px 16px",fontSize:13,borderRadius:10,marginLeft:"auto"}}>Save</button>
            </div>
          )}
          {breakMinError && <p style={{color:DANGER,fontSize:12,margin:"6px 0 0"}}>{breakMinError}</p>}
        </div>

        {/* Annual Leave Entitlement */}
        <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 10px"}}>Annual leave entitlement</p>
        <p style={{color:MUTED,fontSize:12,margin:"0 0 10px"}}>Full-time drivers get 20 days. Adjust if you're part-time.</p>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:annualError?6:20}}>
          <input type="number" min="1" max="30" value={annualInput} onChange={e=>{setAnnualInput(e.target.value);setAnnualError(null);}}
            style={{...inputStyle,width:80,textAlign:"center",fontSize:18,fontWeight:700,padding:"10px 8px",...(annualError?{borderColor:DANGER}:{})}}/>
          <span style={{color:MUTED,fontSize:14}}>days</span>
          <button onClick={saveAnnual} style={{...btnStyle,width:"auto",padding:"10px 20px",fontSize:13,borderRadius:10,marginLeft:"auto"}}>Save</button>
        </div>
        {annualError && <p style={{color:DANGER,fontSize:12,margin:"0 0 20px"}}>{annualError}</p>}

        {/* Help & legal */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <button onClick={onReplayTour} style={{background:CARD2,color:TEXT,border:`1px solid ${BORDER}`,borderRadius:12,padding:"12px 8px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            ↻ Replay tour
          </button>
          <button onClick={onViewFAQ} style={{background:CARD2,color:TEXT,border:`1px solid ${BORDER}`,borderRadius:12,padding:"12px 8px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            FAQ
          </button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          <button onClick={onViewTerms} style={{background:CARD2,color:TEXT,border:`1px solid ${BORDER}`,borderRadius:12,padding:"12px 8px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            Terms & Conditions
          </button>
          <button onClick={onSendFeedback} style={{background:CARD2,color:TEXT,border:`1px solid ${BORDER}`,borderRadius:12,padding:"12px 8px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            Send Feedback
          </button>
        </div>

        {/* App Info */}
        <div style={{borderTop:`1px solid ${BORDER}`,paddingTop:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <p style={{color:MUTED,fontSize:12,margin:"0 0 2px"}}>Dublin Bus Shift Tracker</p>
              <p style={{color:MUTED,fontSize:11,margin:0}}>Summerhill depot · 390 duties · 4 zones</p>
            </div>
            <span style={{background:CARD2,color:MUTED,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700}}>v{APP_VERSION}</span>
          </div>
        </div>
      </div>
      </div>
      {!scrolledToEnd && (
        <div style={{position:"absolute",left:0,right:0,bottom:0,height:28,background:`linear-gradient(180deg,transparent,${CARD})`,pointerEvents:"none"}}/>
      )}
      {confirmDialog && <ConfirmDialog msg={confirmDialog.msg} yesLabel={confirmDialog.yesLabel||"Confirm"} onYes={confirmDialog.onYes} onNo={confirmDialog.onNo||(()=>setConfirmDialog(null))}/>}
    </div>
  );
}
