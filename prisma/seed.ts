import { PrismaClient, type BattingStyle, type BowlingStyle, type PlayerRole } from "@prisma/client";
const prisma = new PrismaClient();

const teams = [
  { name:"Biratnagar Kings", shortName:"BK", city:"Biratnagar", owner:"MAD Dream Sports", primary:"#123B7A", secondary:"#F2C51C", accent:"#E8EEF9", theme:"Kings Royal Blue & Yellow", slogan:"Rule the crease", standing:[2,7,5,2,10,0.68], players:[
    ["Sandeep","Lamichhane","Sandeep Lamichhane","BOWLER","RIGHT_HAND","LEG_SPIN",25,true,false,false,"Nepal"],
    ["Lokesh","Bam","Lokesh Bam","WICKET_KEEPER","RIGHT_HAND","RIGHT_ARM_MEDIUM",69,false,true,false,"Nepal"],
    ["Basir","Ahamad","Basir Ahamad","ALL_ROUNDER","LEFT_HAND","LEFT_ARM_ORTHODOX",75,false,false,false,"Nepal"],
    ["Pratish","GC","Pratish GC","ALL_ROUNDER","RIGHT_HAND","LEFT_ARM_MEDIUM",37,false,false,false,"Nepal"],
    ["Faf","du Plessis","Faf du Plessis","BATSMAN","RIGHT_HAND","NONE",18,false,false,true,"South Africa"],
    ["Martin","Guptill","Martin Guptill","BATSMAN","RIGHT_HAND","OFF_SPIN",31,false,false,true,"New Zealand"],
  ]},
  { name:"Chitwan Rhinos", shortName:"CR", city:"Chitwan", owner:"Chitwan Medical College", primary:"#4A241A", secondary:"#F16B2B", accent:"#F5B18B", theme:"Rhinos Deep Brown & Orange", slogan:"Charge together", standing:[7,7,2,5,4,-0.61], players:[
    ["Kushal","Malla","Kushal Malla","ALL_ROUNDER","LEFT_HAND","LEFT_ARM_ORTHODOX",23,true,false,false,"Nepal"],
    ["Ravi","Bopara","Ravi Bopara","ALL_ROUNDER","RIGHT_HAND","RIGHT_ARM_MEDIUM",25,false,false,true,"England"],
    ["Dev","Khanal","Dev Khanal","BATSMAN","RIGHT_HAND","OFF_SPIN",12,false,false,false,"Nepal"],
    ["Rijan","Dhakal","Rijan Dhakal","BOWLER","RIGHT_HAND","LEFT_ARM_MEDIUM",42,false,false,false,"Nepal"],
    ["Saif","Zaib","Saif Zaib","ALL_ROUNDER","LEFT_HAND","LEFT_ARM_ORTHODOX",8,false,false,true,"England"],
    ["Arjun","Saud","Arjun Saud","WICKET_KEEPER","RIGHT_HAND","NONE",9,false,true,false,"Nepal"],
  ]},
  { name:"Janakpur Bolts", shortName:"JB", city:"Janakpur", owner:"Dream Sports", primary:"#F20B78", secondary:"#102A5C", accent:"#F6C916", theme:"Bolts Pink & Blue", slogan:"Strike with speed", standing:[8,7,1,6,2,-0.44], players:[
    ["Anil","Sah","Anil Sah","WICKET_KEEPER","RIGHT_HAND","OFF_SPIN",14,true,true,false,"Nepal"],
    ["Aasif","Sheikh","Aasif Sheikh","WICKET_KEEPER","RIGHT_HAND","NONE",5,false,true,false,"Nepal"],
    ["Lalit","Rajbanshi","Lalit Rajbanshi","BOWLER","RIGHT_HAND","LEFT_ARM_ORTHODOX",27,false,false,false,"Nepal"],
    ["Sanjay","Krishnamurthi","Sanjay Krishnamurthi","ALL_ROUNDER","LEFT_HAND","OFF_SPIN",21,false,false,true,"United States"],
    ["Wayne","Parnell","Wayne Parnell","ALL_ROUNDER","LEFT_HAND","LEFT_ARM_FAST",7,false,false,true,"South Africa"],
    ["Maaz","Sadaqat","Maaz Sadaqat","ALL_ROUNDER","RIGHT_HAND","OFF_SPIN",33,false,false,true,"Pakistan"],
  ]},
  { name:"Karnali Yaks", shortName:"KY", city:"Karnali", owner:"Himalayan Builders", primary:"#123E8A", secondary:"#F05A45", accent:"#D8B85A", theme:"Yaks Royal Blue & Coral", slogan:"Built for altitude", standing:[6,7,2,5,4,-0.36], players:[
    ["Sompal","Kami","Sompal Kami","BOWLER","RIGHT_HAND","RIGHT_ARM_FAST",10,true,false,false,"Nepal"],
    ["Gulshan","Jha","Gulshan Jha","ALL_ROUNDER","LEFT_HAND","RIGHT_ARM_MEDIUM",15,false,false,false,"Nepal"],
    ["Nandan","Yadav","Nandan Yadav","BOWLER","RIGHT_HAND","RIGHT_ARM_MEDIUM",28,false,false,false,"Nepal"],
    ["Pawan","Sarraf","Pawan Sarraf","ALL_ROUNDER","RIGHT_HAND","OFF_SPIN",6,false,false,false,"Nepal"],
    ["Mark","Watt","Mark Watt","ALL_ROUNDER","LEFT_HAND","LEFT_ARM_ORTHODOX",50,false,false,true,"Scotland"],
    ["Arjun","Gharti","Arjun Gharti","WICKET_KEEPER","RIGHT_HAND","NONE",19,false,true,false,"Nepal"],
  ]},
  { name:"Kathmandu Gurkhas", shortName:"KG", city:"Kathmandu", owner:"Kathmandu Sports Development Venture", primary:"#101418", secondary:"#10B8B0", accent:"#F3CF52", theme:"Gurkha Black & Cyan", slogan:"Courage, Honor, Glory", standing:[3,7,5,2,10,0.54], players:[
    ["Karan","KC","Karan KC","BOWLER","RIGHT_HAND","RIGHT_ARM_FAST",33,true,false,false,"Nepal"],
    ["Rashid","Khan","Rashid Khan","BOWLER","RIGHT_HAND","RIGHT_ARM_MEDIUM",11,false,false,false,"Nepal"],
    ["Bhim","Sharki","Bhim Sharki","BATSMAN","RIGHT_HAND","OFF_SPIN",22,false,false,false,"Nepal"],
    ["Gerhard","Erasmus","Gerhard Erasmus","ALL_ROUNDER","RIGHT_HAND","OFF_SPIN",44,false,false,true,"Namibia"],
    ["John","Simpson","John Simpson","WICKET_KEEPER","LEFT_HAND","NONE",3,false,true,true,"England"],
    ["Ben","Charlesworth","Ben Charlesworth","BATSMAN","LEFT_HAND","RIGHT_ARM_MEDIUM",17,false,false,true,"England"],
  ]},
  { name:"Lumbini Lions", shortName:"LL", city:"Lumbini", owner:"Fortuna Health Care", primary:"#F04422", secondary:"#E7B747", accent:"#FFB04A", theme:"Lions Orange & Gold", slogan:"Roar for every run", standing:[4,7,4,3,8,-0.39], players:[
    ["Rohit","Paudel","Rohit Kumar Paudel","ALL_ROUNDER","RIGHT_HAND","OFF_SPIN",24,true,false,false,"Nepal"],
    ["Sundeep","Jora","Sundeep Jora","BATSMAN","RIGHT_HAND","OFF_SPIN",16,false,false,false,"Nepal"],
    ["Bibek","Yadav","Bibek Yadav","ALL_ROUNDER","RIGHT_HAND","RIGHT_ARM_MEDIUM",18,false,false,false,"Nepal"],
    ["D'Arcy","Short","D'Arcy Short","ALL_ROUNDER","LEFT_HAND","LEFT_ARM_ORTHODOX",4,false,false,true,"Australia"],
    ["JJ","Smit","JJ Smit","ALL_ROUNDER","RIGHT_HAND","LEFT_ARM_MEDIUM",12,false,false,true,"Namibia"],
    ["Ruben","Trumpelmann","Ruben Trumpelmann","BOWLER","RIGHT_HAND","LEFT_ARM_FAST",20,false,false,true,"Namibia"],
  ]},
  { name:"Pokhara Avengers", shortName:"PA", city:"Pokhara", owner:"Nepal T20 Pvt Ltd", primary:"#6E202B", secondary:"#E63739", accent:"#FF8C76", theme:"Avengers Brown Red", slogan:"Attack from the first ball", standing:[5,7,3,4,6,-0.18], players:[
    ["Kushal","Bhurtel","Kushal Bhurtel","BATSMAN","RIGHT_HAND","LEFT_ARM_ORTHODOX",14,true,false,false,"Nepal"],
    ["Adam","Rossington","Adam Rossington","WICKET_KEEPER","RIGHT_HAND","NONE",7,false,true,true,"England"],
    ["Arjun","Kumal","Arjun Kumal","BATSMAN","RIGHT_HAND","LEG_SPIN",30,false,false,false,"Nepal"],
    ["Bipin","Khatri","Bipin Khatri","BOWLER","RIGHT_HAND","LEFT_ARM_ORTHODOX",8,false,false,false,"Nepal"],
    ["James","Neesham","James Neesham","ALL_ROUNDER","LEFT_HAND","RIGHT_ARM_MEDIUM",50,false,false,true,"New Zealand"],
    ["Dhananjaya","Lakshan","Dhananjaya Lakshan","ALL_ROUNDER","LEFT_HAND","RIGHT_ARM_MEDIUM",22,false,false,true,"Sri Lanka"],
  ]},
  { name:"Sudurpaschim Royals", shortName:"SR", city:"Dhangadhi", owner:"Empire Sports", primary:"#F4C900", secondary:"#1547A8", accent:"#E95322", theme:"Royals Yellow & Blue", slogan:"Play royal. Finish strong.", standing:[1,7,6,1,12,0.83], players:[
    ["Dipendra","Airee","Dipendra Singh Airee","ALL_ROUNDER","RIGHT_HAND","OFF_SPIN",45,true,false,false,"Nepal"],
    ["Binod","Bhandari","Binod Bhandari","WICKET_KEEPER","RIGHT_HAND","NONE",9,false,true,false,"Nepal"],
    ["Aarif","Sheikh","Aarif Sheikh","ALL_ROUNDER","RIGHT_HAND","RIGHT_ARM_MEDIUM",6,false,false,false,"Nepal"],
    ["Abinash","Bohara","Abinash Bohara","BOWLER","RIGHT_HAND","RIGHT_ARM_FAST",20,false,false,false,"Nepal"],
    ["Chris","Lynn","Chris Lynn","BATSMAN","RIGHT_HAND","NONE",50,false,false,true,"Australia"],
    ["Scott","Kuggeleijn","Scott Kuggeleijn","ALL_ROUNDER","RIGHT_HAND","RIGHT_ARM_FAST",29,false,false,true,"New Zealand"],
  ]},
] as const;

type PlayerSeed = readonly [string,string,string,PlayerRole,BattingStyle,BowlingStyle,number,boolean,boolean,boolean,string];

async function main(){
  const tournament = await prisma.tournament.upsert({
    where:{name_season:{name:"Nepal Premier League",season:"2025 Demo"}},
    update:{},
    create:{
      name:"Nepal Premier League",shortName:"NPL",season:"2025 Demo",country:"Nepal",
      primaryColor:"#0F172A",secondaryColor:"#F8FAFC",startDate:new Date("2025-11-17T06:30:00.000Z"),endDate:new Date("2025-12-13T12:00:00.000Z"),
      venue:"TU International Cricket Ground, Kirtipur",description:"Demo tournament dataset based on the eight-team NPL 2025 structure. Use for development, UI testing and cricket operations workflows."
    }
  });

  const teamIds: Record<string,number> = {};
  const playerIds: Record<string,number> = {};
  for(const item of teams){
    const franchise = await prisma.franchise.upsert({
      where:{name:`${item.name} Franchise`},
      update:{ownerName:item.owner},
      create:{name:`${item.name} Franchise`,shortName:item.shortName,ownerName:item.owner,address:`${item.city}, Nepal`,description:`Demo franchise profile for ${item.name}.`,website:null}
    });
    const team = await prisma.team.upsert({
      where:{franchiseId_name:{franchiseId:franchise.id,name:item.name}},
      update:{primaryColor:item.primary,secondaryColor:item.secondary,accentColor:item.accent,themeName:item.theme,slogan:item.slogan},
      create:{franchiseId:franchise.id,name:item.name,shortName:item.shortName,primaryColor:item.primary,secondaryColor:item.secondary,accentColor:item.accent,themeName:item.theme,homeGround:"TU International Cricket Ground, Kirtipur",city:item.city,country:"Nepal",foundedYear:2024,slogan:item.slogan,description:`NPL-inspired demo team profile for ${item.name}.`}
    });
    teamIds[item.shortName]=team.id;
    const [position,played,won,lost,points,nrr]=item.standing;
    await prisma.tournamentTeam.upsert({
      where:{tournamentId_teamId:{tournamentId:tournament.id,teamId:team.id}},
      update:{position,played,won,lost,points,netRunRate:nrr},
      create:{tournamentId:tournament.id,teamId:team.id,position,played,won,lost,points,netRunRate:nrr}
    });
    for(const p of item.players as readonly PlayerSeed[]){
      const [firstName,lastName,displayName,role,battingStyle,bowlingStyle,jerseyNumber,isCaptain,isWicketKeeper,isOverseas,nationality]=p;
      const player=await prisma.player.upsert({
        where:{teamId_displayName:{teamId:team.id,displayName}},
        update:{role,battingStyle,bowlingStyle,jerseyNumber,isCaptain,isWicketKeeper,isOverseas,nationality,isActive:true},
        create:{teamId:team.id,firstName,lastName,displayName,role,battingStyle,bowlingStyle,jerseyNumber,isCaptain,isWicketKeeper,isOverseas,nationality,isActive:true,bio:"NPL-based demo player record for development and UI testing."}
      });
      playerIds[displayName]=player.id;
    }
  }

  // Match relations use cascading deletes, so recreating the demo fixtures also clears their toss/innings/stat rows.
  await prisma.match.deleteMany({where:{tournamentId:tournament.id}});

  const samples = [
    {no:"M24",date:"2025-12-04T11:30:00.000Z",a:"SR",b:"CR",winner:"SR",result:"Sudurpaschim Royals won by 49 runs",scoreA:[169,4,120],scoreB:[120,10,103],pom:"Chris Lynn"},
    {no:"M25",date:"2025-12-05T07:30:00.000Z",a:"LL",b:"JB",winner:"LL",result:"Lumbini Lions won by 4 wickets",scoreA:[136,6,115],scoreB:[132,6,120],pom:"Rohit Kumar Paudel"},
    {no:"M27",date:"2025-12-06T11:30:00.000Z",a:"CR",b:"PA",winner:"PA",result:"Pokhara Avengers won by 8 wickets",scoreA:[120,6,120],scoreB:[121,2,118],pom:"Adam Rossington"},
    {no:"M28",date:"2025-12-07T07:30:00.000Z",a:"KY",b:"JB",winner:"KY",result:"Karnali Yaks won by 3 runs",scoreA:[151,7,120],scoreB:[148,8,120],pom:"Gulshan Jha"},
  ] as const;

  const matchIds: Record<string,number> = {};
  for(const s of samples){
    const match=await prisma.match.create({data:{tournamentId:tournament.id,matchNumber:s.no,title:`${teams.find(t=>t.shortName===s.a)?.name} vs ${teams.find(t=>t.shortName===s.b)?.name}`,stage:"LEAGUE",venue:"TU International Cricket Ground, Kirtipur",startTime:new Date(s.date),status:"COMPLETED",overs:20,homeTeamId:teamIds[s.a],awayTeamId:teamIds[s.b],winnerTeamId:teamIds[s.winner],resultText:s.result,playerOfMatch:s.pom,notes:"NPL-based demo result for dashboard and score-entry testing."}});
    matchIds[s.no]=match.id;
    await prisma.toss.create({data:{matchId:match.id,winnerTeamId:teamIds[s.a],decision:s.no==="M24"?"BOWL":"BAT",notes:"Demo toss entry"}});
    await prisma.matchInnings.createMany({data:[
      {matchId:match.id,teamId:teamIds[s.a],inningsNumber:1,runs:s.scoreA[0],wickets:s.scoreA[1],balls:s.scoreA[2],status:"COMPLETED"},
      {matchId:match.id,teamId:teamIds[s.b],inningsNumber:2,runs:s.scoreB[0],wickets:s.scoreB[1],balls:s.scoreB[2],target:s.scoreA[0]+1,status:"COMPLETED"},
    ]});
  }

  const demoPerformances = [
    ["M24","Chris Lynn","SR",75,56,6,3,0,0,0],["M24","Dipendra Singh Airee","SR",24,18,2,1,1,18,19],["M24","Ravi Bopara","CR",29,24,3,1,0,0,0],["M24","Dev Khanal","CR",28,25,3,0,0,0,0],["M24","Abinash Bohara","SR",0,0,0,0,3,24,26],
    ["M25","Rohit Kumar Paudel","LL",34,32,3,0,2,18,22],["M25","Aasif Sheikh","JB",20,18,2,0,0,0,0],["M25","Lalit Rajbanshi","JB",0,0,0,0,2,24,25],
    ["M27","Adam Rossington","PA",65,48,7,2,0,0,0],["M27","Arjun Kumal","PA",43,53,3,0,0,0,0],["M27","Bipin Khatri","PA",0,0,0,0,1,18,17],["M27","Dhananjaya Lakshan","PA",0,0,0,0,3,24,22],
    ["M28","Gulshan Jha","KY",49,22,6,3,1,12,15],["M28","Mark Watt","KY",30,27,2,1,0,0,0],["M28","Nandan Yadav","KY",0,0,0,0,3,24,29],["M28","Sanjay Krishnamurthi","JB",35,29,3,1,1,18,21]
  ] as const;
  for(const [matchNo,name,teamShort,runs,balls,fours,sixes,wickets,ballsBowled,runsConceded] of demoPerformances){
    const pid=playerIds[name]; const mid=matchIds[matchNo]; if(!pid||!mid)continue;
    await prisma.playerMatchStat.create({data:{matchId:mid,playerId:pid,teamId:teamIds[teamShort],innings:1,runs,ballsFaced:balls,fours,sixes,wickets,ballsBowled,runsConceded}});
  }

  const live=await prisma.match.create({data:{tournamentId:tournament.id,matchNumber:"DEMO-LIVE",title:"Kathmandu Gurkhas vs Biratnagar Kings",stage:"LEAGUE",venue:"TU International Cricket Ground, Kirtipur",startTime:new Date(),status:"LIVE",overs:20,homeTeamId:teamIds.KG,awayTeamId:teamIds.BK,notes:"Live demo match. Edit from Score Entry."}});
  await prisma.toss.create({data:{matchId:live.id,winnerTeamId:teamIds.KG,decision:"BAT"}});
  await prisma.matchInnings.create({data:{matchId:live.id,teamId:teamIds.KG,inningsNumber:1,runs:118,wickets:4,balls:92,extras:7,status:"LIVE"}});

  const liveStats=[
    ["Ben Charlesworth",46,32,5,2,0,0,0],
    ["Gerhard Erasmus",34,24,3,1,0,0,0],
    ["Sandeep Lamichhane",0,0,0,0,2,24,27],
    ["Pratish GC",0,0,0,0,1,18,21],
  ] as const;
  for(const [name,runs,balls,fours,sixes,wickets,ballsBowled,runsConceded] of liveStats){
    const pid=playerIds[name]; if(!pid) continue;
    const p=await prisma.player.findUniqueOrThrow({where:{id:pid}});
    await prisma.playerMatchStat.create({data:{matchId:live.id,playerId:pid,teamId:p.teamId,innings:1,runs,ballsFaced:balls,fours,sixes,wickets,ballsBowled,runsConceded}});
  }

  console.log(`Seeded ${teams.length} NPL-based teams, ${Object.keys(playerIds).length} players and demo matches.`);
}

main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
