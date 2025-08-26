import { useParams, Link } from "react-router-dom";
import React, { useMemo } from "react";
import specials from "../data/content/specials-list.json";

function unwrap(x:any){ return x?.Special ?? x?.special ?? x; }
function toFlat(src:any){
  const out:any[]=[]; const push=(it:any)=>{ const a=unwrap(it); if(a&&typeof a==="object") out.push(a); };
  if(Array.isArray(src)) src.forEach(push); else Object.values(src as any).forEach(push);
  return out;
}
const num=(v:any)=>Number.isFinite(Number(v))?Number(v):undefined;
function meta(a:any){
  const sp = a?.sp ?? a?.SP ?? a?.cost ?? a?.Cost;
  const rng = a?.range ?? a?.Range;
  const bits = [];
  if(sp!=null && String(sp)!=="") bits.push(`SP ${sp}`);
  if(rng!=null && String(rng)!=="") bits.push(`Rng ${rng}`);
  return bits.join(" • ");
}
function desc(a:any){
  const d = a?.desc ?? a?.description ?? a?.Effect ?? a?.effect;
  return (typeof d==="string" && d.trim()) ? d : "—";
}

export default function SpecialPage(){
  const { id } = useParams();
  const key = decodeURIComponent(id ?? "");
  const flat = useMemo(()=>toFlat(specials),[]);
  const a = useMemo(()=> flat.find(x=>String(x.id??x.sid??x.name??x.Name)===key) ||
                             flat.find(x=>String(x.name??x.Name)===key)
  ,[flat,key]);

  if(!a){
    return <div style={{maxWidth:960,margin:"24px auto",padding:"0 16px"}}>
      <p>Special not found.</p><Link to="/specials">← Back</Link>
    </div>;
  }

  const name = String(a.name ?? a.Name ?? key);
  return (
    <div style={{maxWidth:960,margin:"24px auto",padding:"0 16px"}}>
      <Link to="/specials" style={{textDecoration:"none"}}>← Back</Link>
      <h1 style={{marginTop:12}}>{name}</h1>
      <div style={{marginTop:16,background:"#fff",color:"#111",borderRadius:12,padding:16,boxShadow:"0 2px 12px rgba(0,0,0,.08)"}}>
        <div style={{opacity:.7,marginBottom:8}}>{meta(a)}</div>
        <div style={{whiteSpace:"pre-wrap"}}>{desc(a)}</div>
      </div>
    </div>
  );
}
