import { BG, CARD, BORDER, TEXT, MUTED, ACCENT } from "../lib/theme.js";
import { fmtShort } from "../lib/dutyMath.js";
import { CATEGORIES } from "../lib/achievements.js";
import { PageHeader } from "../components/shared.jsx";
import { Badge } from "../components/Badge.jsx";

// rows: output of badgeRows(ctx, earned)
export function AchievementsScreen({rows, onBack}) {
  const earned = rows.filter((r) => r.earned).length;
  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:40}}>
      <PageHeader eyebrow="Your badges" title="Achievements" subtitle={`${earned} of ${rows.length} earned`} onBack={onBack}/>
      <div style={{padding:"4px 16px 0"}}>
        {CATEGORIES.map((cat) => {
          const list = rows.filter((r) => r.badge.cat === cat.id);
          return (
            <section key={cat.id} style={{marginBottom:22}}>
              <p style={{color:MUTED,fontSize:"0.6875rem",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 10px"}}>
                {cat.label} · {list.filter((r) => r.earned).length}/{list.length}
              </p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,150px),1fr))",gap:10}}>
                {list.map((r) => <BadgeTile key={r.badge.id} row={r}/>)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function BadgeTile({row}) {
  const {badge, earned, hidden, name, rule, level, count, at, progress} = row;
  const pct = progress?.target ? Math.round((100 * progress.value) / progress.target) : null;
  return (
    <div data-badge={badge.id} style={{background:CARD,border:`1px solid ${earned ? badge.color + "55" : BORDER}`,borderRadius:14,padding:"14px 10px",
      display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:6,minWidth:0}}>
      <Badge badge={badge} level={Math.max(0, level - 1)} earned={earned} hidden={hidden} size={56}/>
      <p style={{color:earned?TEXT:MUTED,fontSize:"0.8125rem",fontWeight:800,margin:"4px 0 0",lineHeight:1.25,overflowWrap:"anywhere"}}>
        {hidden ? "Secret badge" : name}{count > 1 ? ` ×${count}` : ""}
      </p>
      <p style={{color:MUTED,fontSize:"0.6875rem",margin:0,lineHeight:1.35,overflowWrap:"anywhere"}}>{hidden ? "Keep going…" : rule}</p>
      {earned && at && <p style={{color:badge.color,fontSize:"0.6875rem",fontWeight:700,margin:0}}>{progress?.count ? `×${progress.count} · ` : ""}{fmtShort(at)}</p>}
      {!hidden && pct !== null && (
        <div style={{width:"100%",marginTop:2}}>
          <div style={{background:BORDER,borderRadius:4,height:5}}>
            <div style={{width:`${Math.min(100, pct)}%`,background:ACCENT,height:5,borderRadius:4}}/>
          </div>
          <p style={{color:MUTED,fontSize:"0.6875rem",margin:"4px 0 0"}}>{progress.value} / {progress.target}</p>
        </div>
      )}
    </div>
  );
}
