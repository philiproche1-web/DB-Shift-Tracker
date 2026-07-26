import { BG } from "../lib/theme.js";
import { PageHeader, EmptyState, RouteAlertCard } from "../components/shared.jsx";

export function RouteAlertsScreen({alerts, onBack}) {
  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:40}}>
      <PageHeader eyebrow="Your garage" title="Route Alerts" onBack={onBack}/>
      <div style={{padding:"4px 16px 0"}}>
        {alerts.length===0 ? (
          <EmptyState title="No active alerts" body="You'll see diversions and roadworks here as soon as one's posted for your garage."/>
        ) : alerts.map(a => <RouteAlertCard key={a.id} alert={a}/>)}
      </div>
    </div>
  );
}
