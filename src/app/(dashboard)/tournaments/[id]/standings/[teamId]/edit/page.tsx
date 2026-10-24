import { StandingEditor } from '@/components/standing-editor';
import { notFound } from 'next/navigation';
export default async function Page({params}:{params:Promise<{id:string;teamId:string}>}){const {id,teamId}=await params;const tournament=Number(id),team=Number(teamId);if(!Number.isSafeInteger(tournament)||tournament<1||!Number.isSafeInteger(team)||team<1)notFound();return <StandingEditor tournamentId={tournament} teamId={team} mode="edit"/>;}
