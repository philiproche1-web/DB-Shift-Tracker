import { BG, CARD, BORDER, TEXT, MUTED, ACCENT } from "../lib/theme.js";
import { fmtShort } from "../lib/dutyMath.js";
import { CATEGORIES } from "../lib/achievements.js";
import { PageHeader } from "../components/shared.jsx";
import { Badge } from "../components/Badge.jsx";

// rows: output of badgeRows(ctx, earned)
// Each category is a section with its own colour and a row of badges you
// swipe left/right (Phil 2026-11-06: not one long list to scroll down).
export function AchievementsScreen({rows, onBack}) {
  const earned = rows.filter((r) => r.earned).length;
  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:40}}>
      <PageHeader eyebrow="Your badges" title="Achievements" subtitle={`${earned} of ${rows.length} earned`} onBack={onBack}/>
      <div style={{padding:"4px 0 0"}}>
        <p style={{color:MUTED,fontSize:"0.75rem",margin:"0 16px 16px"}}>Come back to your badges any time from Settings › Achievements. Swipe each row for more.</p>
        {CATEGORIES.map((cat) => {
          const list = rows.filter((r) => r.badge.cat === cat.id);
          if (!list.length) return null;
          const color = list[0].badge.color;
          const got = list.filter((r) => r.earned).length;
          return (
            <section key={cat.id} data-category={cat.id} style={{marginBottom:22}}>
              <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8,margin:"0 16px 10px"}}>
                <h2 style={{color,fontSize:"1.125rem",fontWeight:800,margin:0}}>{cat.label}</h2>
                <span style={{color:got?color:MUTED,fontSize:"0.875rem",fontWeight:800}}>{got} / {list.length}</span>
              </div>
              <div className="rb-badge-row" role="list"
                style={{display:"flex",gap:10,overflowX:"auto",scrollSnapType:"x mandatory",padding:"2px 16px 6px",scrollPaddingLeft:16,scrollbarWidth:"none"}}>
                {list.map((r) => <BadgeTile key={r.badge.id} row={r}/>)}
              </div>
            </section>
          );
        })}
      </div>
      <style>{`.rb-badge-row::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}

function BadgeTile({row}) {
  const {badge, earned, hidden, name, rule, level, count, at, progress} = row;
  const pct = progress?.target ? Math.round((100 * progress.value) / progress.target) : null;
  return (
    <div role="listitem" data-badge={badge.id} style={{flex:"0 0 min(42vw,170px)",scrollSnapAlign:"start",background:CARD,border:`1px solid ${earned ? badge.color + "66" : BORDER}`,borderRadius:16,padding:"16px 10px",
      display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:6,minWidth:0,boxSizing:"border-box"}}>
      <Badge badge={badge} level={Math.max(0, level - 1)} earned={earned} hidden={hidden} size={72}/>
      <p style={{color:earned?TEXT:MUTED,fontSize:"0.875rem",fontWeight:800,margin:"6px 0 0",lineHeight:1.25,overflowWrap:"anywhere"}}>
        {hidden ? "Secret badge" : name}{count > 1 ? ` ×${count}` : ""}
      </p>
      <p style={{color:MUTED,fontSize:"0.71875rem",margin:0,lineHeight:1.35,overflowWrap:"anywhere"}}>{hidden ? "Keep going…" : rule}</p>
      {earned && at && <p style={{color:badge.color,fontSize:"0.71875rem",fontWeight:700,margin:0}}>{progress?.count ? `×${progress.count} · ` : ""}{fmtShort(at)}</p>}
      {!hidden && pct !== null && (
        <div style={{width:"100%",marginTop:"auto"}}>
          <div style={{background:BORDER,borderRadius:4,height:5}}>
            <div style={{width:`${Math.min(100, pct)}%`,background:ACCENT,height:5,borderRadius:4}}/>
          </div>
          <p style={{color:MUTED,fontSize:"0.6875rem",margin:"4px 0 0"}}>{progress.value} / {progress.target}</p>
        </div>
      )}
    </div>
  );
}
