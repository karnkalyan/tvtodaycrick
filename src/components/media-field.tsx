"use client";
import { useId, useRef, useState } from "react";
import { LoaderCircle, Upload } from "lucide-react";
import { api } from "@/lib/client-api";
import type { MediaAsset } from "@/types/models";
export function MediaField({label,value,onChange,accept="image/*"}:{label:string;value:string;onChange:(v:string)=>void;accept?:string}){
 const id=useId();const input=useRef<HTMLInputElement>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
 const upload=async(file?:File)=>{if(!file)return;setBusy(true);setError("");try{const fd=new FormData();fd.append("file",file);const asset=await api<MediaAsset>("/api/media",{method:"POST",body:fd});onChange(asset.url)}catch(e){setError(e instanceof Error?e.message:"Upload failed")}finally{setBusy(false)}};
 return <div className="field"><label htmlFor={id}>{label}</label><div className="media-field"><input id={id} value={value} onChange={e=>onChange(e.target.value)} placeholder="/uploads/... or https://..."/><button type="button" className="button secondary compact" onClick={()=>input.current?.click()} disabled={busy}>{busy?<LoaderCircle className="spin"/>:<Upload/>}{busy?"Uploading…":"Upload"}</button><input ref={input} className="sr-only" type="file" aria-label={`Upload ${label}`} accept={accept} onChange={e=>upload(e.target.files?.[0])}/></div>{error&&<small className="field-error" role="alert">{error}</small>}{value&&accept.startsWith("image")&&<div className="upload-preview"><img src={value} alt="Selected media"/></div>}</div>
}
