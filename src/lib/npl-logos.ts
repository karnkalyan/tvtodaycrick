import { load } from "cheerio";
import { fetchSource } from "./npl-source";

// Franchise websites found through web search. Asset paths are discovered anew on every full sync.
export const FRANCHISE_WEBSITES: Record<string,string> = {
 "Biratnagar Kings":"https://biratkings.com/",
 "Chitwan Rhinos":"https://www.chitwanrhinos.com/",
 "Janakpur Bolts":"https://boltsjanakpur.com/",
 "Karnali Yaks":"https://karnaliyaks.com/",
 "Kathmandu Gorkhas":"https://kathmandugurkhas.com/",
 "Lumbini Lions":"https://www.lumbinilions.com.np/",
 "Pokhara Avengers":"https://www.pokharaavengers.com/",
 "Sudurpaschim Royals":"https://sudurpaschimroyals.com/",
};
export function websiteLogo(html:string,base:string,name:string):string|null {
 const $=load(html),first=name.split(" ")[0].toLowerCase();
 const images=$("img").map((_,el)=>({src:$(el).attr("src")||$(el).attr("data-src")||"",alt:$(el).attr("alt")||""})).get();
 const image=images.find(i=>i.src&&!/sponsor|partner|footer|logoos/i.test(i.src+" "+i.alt)&&((/logo|crest/i.test(i.alt)&&(/royals|rhinos|gorkh|gurkh/i.test(i.alt)||i.alt.toLowerCase().includes(first)))||i.src.toLowerCase().includes(first.toLowerCase()+"-logo")||/\/logo\/|\/rhinos-logo\.|\/royals-logo\./i.test(i.src)))||images.find(i=>i.alt.toLowerCase().includes(first)&&!/match|player|sponsor/i.test(i.alt)&&/logo\.png/.test(i.src));
 if(!image)return null;let url=new URL(image.src,base);if(url.pathname==="/_next/image"&&url.searchParams.get("url"))url=new URL(url.searchParams.get("url")!,base);return url.protocol==="https:"?url.href:null;
}
export async function imageAvailable(url:string|null):Promise<boolean>{if(!url||/placeholder|default-avatar|no-image/i.test(url))return false;try{const r=await fetch(url,{method:"GET",signal:AbortSignal.timeout(15000)});const valid=r.ok&&(r.headers.get("content-type")||"").startsWith("image/");await r.body?.cancel();return valid;}catch{return false;}}
export async function verifiedLogo(name:string,fallback:string|null,fallbackSource:string){
 const website=FRANCHISE_WEBSITES[name];
 if(website){try{const logo=websiteLogo(await fetchSource(website),website,name);if(logo&&await imageAvailable(logo))return {logoUrl:logo,logoSourceUrl:website};}catch{/* use verified publisher asset below */}}
 // An official franchise site also publishes the competing team's current crest.
 if(name==="Kathmandu Gorkhas"){try{const $=load(await fetchSource(FRANCHISE_WEBSITES["Sudurpaschim Royals"]));const src=$('img').filter((_,el)=>/KATHMANDU.*(?:GURKHAS|GORKHAS)/i.test($(el).attr("alt")||"")).first().attr("src");if(src&&await imageAvailable(src))return {logoUrl:src,logoSourceUrl:FRANCHISE_WEBSITES["Sudurpaschim Royals"]};}catch{}}
 if(await imageAvailable(fallback))return {logoUrl:fallback,logoSourceUrl:fallbackSource};
 throw new Error(`No verified logo available for ${name}; previous import preserved`);
}
