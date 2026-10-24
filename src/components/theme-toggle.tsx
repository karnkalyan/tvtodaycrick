"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
export function ThemeToggle(){
  const [dark,setDark]=useState(false);
  useEffect(()=>{setDark(document.documentElement.dataset.theme==="dark")},[]);
  const toggle=()=>{const next=!dark;setDark(next);document.documentElement.dataset.theme=next?"dark":"light";localStorage.setItem("theme",next?"dark":"light")};
  return <button className="icon-button" onClick={toggle} aria-label={dark?"Use light theme":"Use dark theme"} title={dark?"Use light theme":"Use dark theme"}>{dark?<Sun size={23}/>:<Moon size={23}/>}</button>;
}
