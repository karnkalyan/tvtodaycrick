import { CircleAlert, Inbox, LoaderCircle } from "lucide-react";
import { RemoteImage } from "./remote-image";
import { getFranchiseBrand } from "@/lib/npl-franchises";
import type { Team } from "@/types/models";
export function PageHeader({eyebrow,title,description,actions}:{eyebrow:string;title:string;description:string;actions?:React.ReactNode}){return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions&&<div className="header-actions">{actions}</div>}</div>}
export function EmptyState({title,description}:{title:string;description:string}){return <div className="empty-state"><div><Inbox aria-hidden="true"/></div><h3>{title}</h3><p>{description}</p></div>}
export function TeamMark({team,size="md"}:{team:Pick<Team,"name"|"shortName"|"logoUrl"|"primaryColor"|"secondaryColor">;size?:"sm"|"md"|"lg"}){
  const brand = getFranchiseBrand(team?.name);
  const primary = team?.primaryColor && team.primaryColor !== "#0F172A" && team.primaryColor !== "#2563EB" ? team.primaryColor : brand.primaryColor;
  const secondary = team?.secondaryColor && team.secondaryColor !== "#F8FAFC" ? team.secondaryColor : brand.secondaryColor;
  const logo = team?.logoUrl || brand.logoFallback;
  return (
    <div className={`team-mark ${size}`} style={{ background: primary, color: brand.textColor, borderColor: secondary }} title={`${team.name} (${brand.themeName})`}>
      <RemoteImage src={logo} alt={`${team.name} logo`} fallback={team?.shortName || brand.shortName || team.name?.slice(0, 2).toUpperCase()} />
    </div>
  );
}
export function StatusPill({status}:{status:string}){return <span className={`status-pill ${status.toLowerCase().replaceAll("_","-")}`}>{status.replaceAll("_"," ")}</span>}
export function Spinner(){return <div className="loader-wrap" role="status"><LoaderCircle size={24} className="spin"/><span>Loading management data…</span></div>}
export function ErrorBox({message}:{message:string}){return <div className="error-box" role="alert"><CircleAlert size={22}/><span>{message}</span></div>}
export function Overs({balls}:{balls:number}){return <>{Math.floor(balls/6)}.{balls%6}</>}
export function formatDate(value?:string|null){if(!value)return "—";return new Intl.DateTimeFormat("en-NP",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kathmandu"}).format(new Date(value))}
export function humanRole(role:string){return role.replaceAll("_"," ").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())}
