export async function api<T>(url:string, init?:RequestInit):Promise<T>{
  if(typeof window!=="undefined"&&url.startsWith("/api/")&&(!init?.method||init.method==="GET")){
    const scoped=new URL(url,window.location.origin);if(!scoped.searchParams.has("season"))scoped.searchParams.set("season",localStorage.getItem("npl-selected-season")||"2026");url=scoped.pathname+scoped.search;
  }
  const res=await fetch(url,{...init,headers:{...(init?.body instanceof FormData?{}:{"Content-Type":"application/json"}),...(init?.headers||{})}});
  const body=await res.json().catch(()=>({success:false,message:"Invalid server response"}));
  if(!res.ok||!body.success) throw new Error(body.message||`Request failed (${res.status})`);
  return body.data as T;
}
export const jsonBody=(value:unknown)=>JSON.stringify(value);
