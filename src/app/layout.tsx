import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "NPL-TVToday | Nepal Premier League", description: "NPL-TVToday: Nepal Premier League fixtures, teams, squads and cricket operations." };

const themeScript=`(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':false;document.documentElement.dataset.theme=d?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})()`;
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body suppressHydrationWarning>{children}</body></html>}
