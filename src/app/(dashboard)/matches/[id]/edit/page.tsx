import Manager from '@/components/managers/matches';
import { notFound } from 'next/navigation';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const value=Number(id);if(!Number.isSafeInteger(value)||value<1)notFound();return <Manager key={id} mode="edit" recordId={value}/>;}
