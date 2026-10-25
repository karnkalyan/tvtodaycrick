(() => {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const stage = $('#stage');
  const operator = $('#operator');
  const params = new URLSearchParams(location.search);
  const preview = params.get('preview') === '1';
  const autoDemo = params.get('demo') === '1';
  document.body.classList.toggle('preview', preview);

  const STORAGE_KEY = 'npl-gfx-v8-state';
  const CHANNEL_NAME = 'npl-gfx-v8-cues';
  // Data is refresh-based. BroadcastChannel is used only for explicit operator cues
  // (show / clear / stinger), never for score/data synchronization.
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;

  const TEAM_SLUGS = {
    KAG: 'kathmandu-gurkhas',
    JAB: 'janakpur-bolts',
    CHR: 'chitwan-rhinos',
    KAY: 'karnali-yaks',
    LUL: 'lumbini-lions',
    POA: 'pokhara-avengers',
    BIK: 'biratnagar-kings',
    SPR: 'sudurpaschim-royals'
  };

  const GLOBAL_PLAYER_PHOTOS = {
    'andre-russell': '/images/teams/biratnagar-kings/players/andre-russell.webp',
    'aparajit-poudel': '/images/teams/biratnagar-kings/players/aparajit-poudel.webp',
    'basir-ahamad': '/images/teams/biratnagar-kings/players/basir-ahamad.webp',
    'charith-asalanka': '/images/teams/biratnagar-kings/players/charith-asalanka.png',
    'dilsad-ali': '/images/teams/biratnagar-kings/players/dilsad-ali.webp',
    'dipak-bohara': '/images/teams/sudurpaschim-royals/players/dipak-bohara.webp',
    'imran-sheikh': '/images/teams/karnali-yaks/players/imran-sheikh.png',
    'lokesh-bam': '/images/teams/biratnagar-kings/players/lokesh-bam.webp',
    'narayan-joshi': '/images/teams/pokhara-avengers/players/narayan-joshi.webp',
    'naren-saud': '/images/teams/biratnagar-kings/players/naren-saud.png',
    'pratik-shrestha': '/images/teams/kathmandu-gurkhas/players/pratik-shrestha.png',
    'pratish-gc': '/images/teams/biratnagar-kings/players/pratish-gc.webp',
    'rupesh-kumar-singh': '/images/teams/biratnagar-kings/players/rupesh-kumar-singh.png',
    'sahil-patel': '/images/teams/kathmandu-gurkhas/players/sahil-patel.webp',
    'sandeep-lamichhane': '/images/teams/biratnagar-kings/players/sandeep-lamichhane.webp',
    'shubham-ranjane': '/images/teams/biratnagar-kings/players/shubham-ranjane.png',
    'subash-bhandari': '/images/teams/biratnagar-kings/players/subash-bhandari.webp',
    'sujan-thapaliya': '/images/teams/biratnagar-kings/players/sujan-thapaliya.webp',
    'surya-tamang': '/images/teams/lumbini-lions/players/surya-tamang.png',
    'arjun-saud': '/images/teams/lumbini-lions/players/arjun-saud.webp',
    'ashok-dhami': '/images/teams/chitwan-rhinos/players/ashok-dhami.webp',
    'bibek-kumar-yadav': '/images/teams/chitwan-rhinos/players/bibek-kumar-yadav.webp',
    'bibek-yadav': '/images/teams/chitwan-rhinos/players/bibek-kumar-yadav.webp',
    'bipin-acharya': '/images/teams/pokhara-avengers/players/bipin-acharya.webp',
    'bipin-rawal': '/images/teams/chitwan-rhinos/players/bipin-rawal.webp',
    'deepak-bohara': '/images/teams/chitwan-rhinos/players/deepak-bohara.webp',
    'deepak-dumre': '/images/teams/karnali-yaks/players/deepak-dumre.png',
    'dev-khanal': '/images/teams/karnali-yaks/players/dev-khanal.png',
    'gautam-kc': '/images/teams/chitwan-rhinos/players/gautam-kc.webp',
    'kalim-sana': '/images/teams/chitwan-rhinos/players/kalim-sana.webp',
    'kamal-singh-airee': '/images/teams/chitwan-rhinos/players/kamal-singh-airee.webp',
    'kushal-malla': '/images/teams/chitwan-rhinos/players/kushal-malla.webp',
    'mousom-dhakal': '/images/teams/chitwan-rhinos/players/mousom-dhakal.webp',
    'ranjeet-kumar': '/images/teams/chitwan-rhinos/players/ranjeet-kumar.webp',
    'ravi-bopara': '/images/teams/chitwan-rhinos/players/ravi-bopara.webp',
    'rijan-dhakal': '/images/teams/chitwan-rhinos/players/rijan-dhakal.webp',
    'salahuddin-khan': '/images/teams/chitwan-rhinos/players/salahuddin-khan.webp',
    'santosh-karki': '/images/teams/janakpur-bolts/players/santosh-karki.png',
    'sikandar-raza': '/images/teams/chitwan-rhinos/players/sikandar-raza.webp',
    'usama-mir': '/images/teams/chitwan-rhinos/players/usama-mir.webp',
    'aaditya-mahata': '/images/teams/janakpur-bolts/players/aaditya-mahata.png',
    'aakash-tripathi': '/images/teams/lumbini-lions/players/aakash-tripathi.webp',
    'aasif-sheikh': '/images/teams/lumbini-lions/players/aasif-sheikh.webp',
    'abhishek-tiwari': '/images/teams/pokhara-avengers/players/abhishek-tiwari.webp',
    'amar-singh-rautela': '/images/teams/janakpur-bolts/players/amar-singh-rautela.webp',
    'anil-sah': '/images/teams/janakpur-bolts/players/anil-sah.png',
    'ashutosh-pandey': '/images/teams/janakpur-bolts/players/ashutosh-pandey.webp',
    'bikash-aagri': '/images/teams/janakpur-bolts/players/bikash-aagri.png',
    'bishal-patel': '/images/teams/lumbini-lions/players/bishal-patel.png',
    'bishal-shusling': '/images/teams/janakpur-bolts/players/bishal-shusling.webp',
    'harmeet-singh': '/images/teams/sudurpaschim-royals/players/harmeet-singh.webp',
    'hemant-dhami': '/images/teams/sudurpaschim-royals/players/hemant-dhami.webp',
    'iftikhar-ahmed': '/images/teams/janakpur-bolts/players/iftikhar-ahmed.webp',
    'james-neesham': '/images/teams/pokhara-avengers/players/james-neesham.webp',
    'kishore-mahato': '/images/teams/lumbini-lions/players/kishore-mahato.webp',
    'kishor-mahato': '/images/teams/lumbini-lions/players/kishore-mahato.webp',
    'lalit-rajbanshi': '/images/teams/janakpur-bolts/players/lalit-rajbanshi.webp',
    'mayan-yadav': '/images/teams/janakpur-bolts/players/mayan-yadav.webp',
    'moeen-ali': '/images/teams/janakpur-bolts/players/moeen-ali.webp',
    'rit-gautam': '/images/teams/karnali-yaks/players/rit-gautam.png',
    'sachin-bhatt': '/images/teams/sudurpaschim-royals/players/sachin-bhatt.webp',
    'sanjay-krishnamurthi': '/images/teams/janakpur-bolts/players/sanjay-krishnamurthi.png',
    'shubh-kansakar': '/images/teams/karnali-yaks/players/shubh-kansakar.png',
    'sohaib-maqsood': '/images/teams/janakpur-bolts/players/sohaib-maqsood.webp',
    'tul-bahadur-thapa': '/images/teams/janakpur-bolts/players/tul-bahadur-thapa.webp',
    'ariful-islam': '/images/teams/karnali-yaks/players/ariful-islam.webp',
    'arjun-gharti': '/images/teams/pokhara-avengers/players/arjun-gharti.webp',
    'bipin-prasad-sharma': '/images/teams/karnali-yaks/players/bipin-sharma.png',
    'bipin-sharma': '/images/teams/karnali-yaks/players/bipin-sharma.png',
    'chadwick-walton': '/images/teams/karnali-yaks/players/chadwick-walton.png',
    'dipendra-rawat': '/images/teams/karnali-yaks/players/dipendra-rawat.png',
    'diwan-pun': '/images/teams/karnali-yaks/players/diwan-pun.png',
    'gulshan-jha': '/images/teams/karnali-yaks/players/gulshan-jha.webp',
    'hussain-talaat': '/images/teams/karnali-yaks/players/hussain-talaat.png',
    'nandan-yadav': '/images/teams/karnali-yaks/players/nandan-yadav.png',
    'pawan-sarraf': '/images/teams/karnali-yaks/players/pawan-sarraf.webp',
    'sompal-kami': '/images/teams/karnali-yaks/players/sompal-kami.webp',
    'unish-bikram-singh': '/images/teams/karnali-yaks/players/unish-bikram-singh.png',
    'unish-singh': '/images/teams/karnali-yaks/players/unish-bikram-singh.png',
    'yuvraj-khatri': '/images/teams/karnali-yaks/players/yuvraj-khatri.png',
    'zeeshan-maqsood': '/images/teams/karnali-yaks/players/zeeshan-maqsood.png',
    'bhim-sharki': '/images/teams/kathmandu-gurkhas/players/bhim-sharki.webp',
    'dan-douthwaite': '/images/teams/kathmandu-gurkhas/players/dan-douthwaite.webp',
    'david-warner': '/images/teams/kathmandu-gurkhas/players/david-warner.webp',
    'dayanand-mandal': '/images/teams/kathmandu-gurkhas/players/dayanand-mandal.webp',
    'deepesh-kandel': '/images/teams/kathmandu-gurkhas/players/deepesh-kandel.webp',
    'dev-shah': '/images/teams/kathmandu-gurkhas/players/dev-shah.webp',
    'karan-kc': '/images/teams/kathmandu-gurkhas/players/karan-kc.webp',
    'krishna-karki': '/images/teams/kathmandu-gurkhas/players/krishna-karki.webp',
    'michael-levitt': '/images/teams/kathmandu-gurkhas/players/michael-levitt.webp',
    'mohammad-aadil-alam': '/images/teams/kathmandu-gurkhas/players/mohammad-aadil-alam.webp',
    'aadil-alam': '/images/teams/kathmandu-gurkhas/players/mohammad-aadil-alam.webp',
    'prashiddha-jaisi': '/images/teams/kathmandu-gurkhas/players/prashiddha-jaisi.webp',
    'raju-rijal': '/images/teams/kathmandu-gurkhas/players/raju-rijal.webp',
    'rashid-khan': '/images/teams/kathmandu-gurkhas/players/rashid-khan.webp',
    'santosh-yadav': '/images/teams/kathmandu-gurkhas/players/santosh-yadav.webp',
    'shahab-alam': '/images/teams/kathmandu-gurkhas/players/shahab-alam.webp',
    'stephen-eskinazi': '/images/teams/kathmandu-gurkhas/players/stephen-eskinazi.webp',
    'sumit-maharjan': '/images/teams/kathmandu-gurkhas/players/sumit-maharjan.webp',
    'abhishesh-gautam': '/images/teams/lumbini-lions/players/abhishesh-gautam.webp',
    'ajay-chauhan': '/images/teams/lumbini-lions/players/ajay-chauhan.webp',
    'arniko-prasad-yadav': '/images/teams/lumbini-lions/players/arniko-prasad-yadav.webp',
    'ben-cutting': '/images/teams/lumbini-lions/players/ben-cutting.webp',
    'dilip-nath': '/images/teams/pokhara-avengers/players/dilip-nath.webp',
    'dinesh-adhikari': '/images/teams/lumbini-lions/players/dinesh-adhikari.webp',
    'durgesh-gupta': '/images/teams/lumbini-lions/players/durgesh-gupta.webp',
    'ramon-simmonds': '/images/teams/lumbini-lions/players/ramon-simmonds.webp',
    'rohit-kumar-paudel': '/images/teams/lumbini-lions/players/rohit-paudel.webp',
    'rohit-paudel': '/images/teams/lumbini-lions/players/rohit-paudel.webp',
    'saad-bin-zafar': '/images/teams/lumbini-lions/players/saad-bin-zafar.webp',
    'sher-malla': '/images/teams/lumbini-lions/players/sher-malla.webp',
    'sundeep-jora': '/images/teams/lumbini-lions/players/sundeep-jora.webp',
    'tilak-bhandari': '/images/teams/lumbini-lions/players/tilak-bhandari.webp',
    'tom-moores': '/images/teams/lumbini-lions/players/tom-moores.webp',
    'unmukt-chand': '/images/teams/lumbini-lions/players/unmukt-chand.webp',
    'aakash-chand': '/images/teams/pokhara-avengers/players/aakash-chand.webp',
    'anderson-phillip': '/images/teams/pokhara-avengers/players/anderson-phillip.webp',
    'arjun-kumal': '/images/teams/pokhara-avengers/players/arjun-kumal.webp',
    'basant-karki': '/images/teams/pokhara-avengers/players/basant-karki.webp',
    'bibek-rana-magar': '/images/teams/pokhara-avengers/players/bibek-rana-magar.webp',
    'bipin-khatri': '/images/teams/pokhara-avengers/players/bipin-khatri.webp',
    'dan-mousley': '/images/teams/pokhara-avengers/players/dan-mousley.webp',
    'dinesh-kharel': '/images/teams/pokhara-avengers/players/dinesh-kharel.webp',
    'kiran-thagunna': '/images/teams/pokhara-avengers/players/kiran-thagunna.webp',
    'kushal-bhurtel': '/images/teams/pokhara-avengers/players/kushal-bhurtel.webp',
    'marcus-stoinis': '/images/teams/pokhara-avengers/players/marcus-stoinis.webp',
    'matt-critchley': '/images/teams/pokhara-avengers/players/matt-critchley.webp',
    'raymon-reefer': '/images/teams/pokhara-avengers/players/raymon-reefer.webp',
    'sagar-dhakal': '/images/teams/pokhara-avengers/players/sagar-dhakal.webp',
    'sudip-aryal': '/images/teams/pokhara-avengers/players/sudip-aryal.webp',
    'trit-raj-das': '/images/teams/pokhara-avengers/players/trit-raj-das.png',
    'aarif-sheikh': '/images/teams/sudurpaschim-royals/players/aarif-sheikh.webp',
    'abinash-bohara': '/images/teams/sudurpaschim-royals/players/abinash-bohara.webp',
    'amit-shrestha': '/images/teams/sudurpaschim-royals/players/amit-shrestha.webp',
    'anil-kharel': '/images/teams/sudurpaschim-royals/players/anil-kharel.webp',
    'ayub-chand': '/images/teams/sudurpaschim-royals/players/ayub-chand.webp',
    'binod-bhandari': '/images/teams/sudurpaschim-royals/players/binod-bhandari.webp',
    'brandon-mcmullen': '/images/teams/sudurpaschim-royals/players/brandon-mcmullen.webp',
    'dipendra-singh-airee': '/images/teams/sudurpaschim-royals/players/dipendra-singh-airee.webp',
    'hikmat-mahara': '/images/teams/sudurpaschim-royals/players/hikmat-mahara.webp',
    'ishan-pandey': '/images/teams/sudurpaschim-royals/players/ishan-pandey.webp',
    'milan-bohara': '/images/teams/sudurpaschim-royals/players/milan-bohara.webp',
    'naresh-budhayer': '/images/teams/sudurpaschim-royals/players/naresh-budhayer.webp',
    'rohan-mustafa': '/images/teams/sudurpaschim-royals/players/rohan-mustafa.webp',
    'sahan-arachchige': '/images/teams/sudurpaschim-royals/players/sahan-arachchige.webp',
    'scott-kuggeleijn': '/images/teams/sudurpaschim-royals/players/scott-kuggeleijn.webp'
  };

  function getTeamLogoUrl(code) {
    const norm = normalizeCode(code);
    const slug = TEAM_SLUGS[norm] || 'kathmandu-gurkhas';
    return `/images/teams/${slug}/logo.png`;
  }

  function getPlayerPhotoUrl(teamCode, playerName) {
    if (!playerName) return '';
    const clean = playerName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (GLOBAL_PLAYER_PHOTOS[clean]) return GLOBAL_PLAYER_PHOTOS[clean];
    const stripped = clean.replace(/^(mohammad|md|kumar|singh)-/, '');
    if (GLOBAL_PLAYER_PHOTOS[stripped]) return GLOBAL_PLAYER_PHOTOS[stripped];
    const norm = normalizeCode(teamCode);
    const slug = TEAM_SLUGS[norm] || 'kathmandu-gurkhas';
    return `/images/teams/${slug}/players/${clean}.webp`;
  }

  const TEAMS = {
    KAG:{name:'KATHMANDU GURKHAS',short:'KATHMANDU',primary:'#101418',secondary:'#10b8b0',text:'#ffffff',soft:'#123d40',captain:'KARAN KC',hero:'BHIM SHARKI',heroRole:'MIDDLE-ORDER BATTER',bowler:'SHAHAB ALAM',colors:'BLACK · CYAN · GOLD',logoUrl:'/images/teams/kathmandu-gurkhas/logo.png',externalLogo:'https://iwcgzmjvuwjuvhwcgozt.supabase.co/storage/v1/object/public/team-logos/1782984743950-409375.webp',roster:['KARAN KC','BHIM SHARKI','MOHAMMAD AADIL ALAM','SHAHAB ALAM','SANTOSH YADAV','PRASHIDDHA JAISI','RASHID KHAN','DAYANAND MANDAL','SUMIT MAHARJAN','KRISHNA KARKI','SURAJ TAMANG']},
    JAB:{name:'JANAKPUR BOLTS',short:'JANAKPUR',primary:'#f20b78',secondary:'#102a5c',text:'#ffffff',soft:'#5b123f',captain:'ANIL SAH',hero:'ANIL SAH',heroRole:'TOP-ORDER BATTER',bowler:'LALIT RAJBANSHI',colors:'PINK · BLUE · YELLOW',logoUrl:'/images/teams/janakpur-bolts/logo.png',externalLogo:'https://boltsjanakpur.com/logo.png',roster:['ANIL SAH','LALIT RAJBANSHI','BIKASH AAGRI','MAYAN YADAV','AADITYA MAHATA','RIT GAUTAM','SANTOSH KARKI','TRIT RAJ DAS','AASHUTOSH PANDEY','ABHISEKH TIWARI','BISHAL KUMAR PATEL']},
    CHR:{name:'CHITWAN RHINOS',short:'CHITWAN',primary:'#4a241a',secondary:'#f16b2b',text:'#ffffff',soft:'#241a18',captain:'KUSHAL MALLA',hero:'KUSHAL MALLA',heroRole:'BATTING ALL-ROUNDER',bowler:'RIJAN DHAKAL',colors:'DEEP BROWN · ORANGE',logoUrl:'/images/teams/chitwan-rhinos/logo.png',externalLogo:'https://www.chitwanrhinos.com/rhinos-logo.png',roster:['KUSHAL MALLA','RIJAN DHAKAL','DEEPAK BOHARA','RANJEET KUMAR','KAMAL SINGH AIREE','DEV KHANAL','ARJUN SAUD','BIBEK KUMAR YADAV','BIPIN RAWAL','GAUTAM KC','MAUSAM DHAKAL']},
    KAY:{name:'KARNALI YAKS',short:'KARNALI',primary:'#123e8a',secondary:'#f05a45',text:'#ffffff',soft:'#172b58',captain:'SOMPAL KAMI',hero:'GULSHAN JHA',heroRole:'ALL-ROUNDER',bowler:'SOMPAL KAMI',colors:'ROYAL BLUE · CORAL',logoUrl:'/images/teams/karnali-yaks/logo.png',externalLogo:'https://media.cricnepal.com/assets/teams/Karnali-Yaks-NPL.webp',roster:['SOMPAL KAMI','GULSHAN JHA','NANDAN YADAV','DEEPAK DUMRE','PAWAN SARRAF','UNISH BIKRAM SINGH','YUVRAJ KHATRI','BIPIN PRASAD SHARMA','DIPENDRA RAWAT','DIWAN PUN','SHUBH KANSAKAR']},
    LUL:{name:'LUMBINI LIONS',short:'LUMBINI',primary:'#f04422',secondary:'#e7b747',text:'#ffffff',soft:'#6e2018',captain:'ROHIT PAUDEL',hero:'ROHIT PAUDEL',heroRole:'TOP-ORDER BATTER',bowler:'KISHOR MAHATO',colors:'ORANGE · GOLD',logoUrl:'/images/teams/lumbini-lions/logo.png',externalLogo:'https://www.lumbinilions.com.np/storage/c4ca4238a0b923820dcc509a6f75849b/logo/2026-09/lumbinilions-logo-1789543627.png',roster:['ROHIT PAUDEL','SHER MALLA','DILIP NATH','SUNDEEP JORA','DINESH ADHIKARI','ABHISESH GAUTAM','TILAK BHANDARI','AAKASH TRIPATHI','AASIF SHEIKH','AJAY CHAUHAN','KISHOR MAHATO']},
    POA:{name:'POKHARA AVENGERS',short:'POKHARA',primary:'#6e202b',secondary:'#e63739',text:'#ffffff',soft:'#351319',captain:'KUSHAL BHURTEL',hero:'KUSHAL BHURTEL',heroRole:'OPENING BATTER',bowler:'SAGAR DHAKAL',colors:'BROWN RED · CRIMSON',logoUrl:'/images/teams/pokhara-avengers/logo.png',externalLogo:'https://www.pokharaavengers.com/logo.png',roster:['KUSHAL BHURTEL','ARJUN KUMAL','DINESH KHAREL','BIPIN KHATRI','AAKASH CHAND','KIRAN THAGUNNA','SAGAR DHAKAL','ARJUN GHARTI','BIBEK KUMAR RANA MAGAR','BIPIN ACHARYA','SUDIP ARYAL']},
    BIK:{name:'BIRATNAGAR KINGS',short:'BIRATNAGAR',primary:'#123b7a',secondary:'#f2c51c',text:'#ffffff',soft:'#17305c',captain:'SANDEEP LAMICHHANE',hero:'LOKESH BAM',heroRole:'BATTER',bowler:'SANDEEP LAMICHHANE',colors:'ROYAL BLUE · YELLOW',logoUrl:'/images/teams/biratnagar-kings/logo.png',externalLogo:'https://biratkings.com/assets/biratnagar-kings-logo-transparent-ByYqYoTH.png',roster:['SANDEEP LAMICHHANE','LOKESH BAM','BASIR AHAMAD','NARAYAN JOSHI','PRATISH GC','SUBASH BHANDARI','RUPESH KUMAR SINGH','SUJAN THAPALIYA','DILSAD ALI','NAREN BHATTA','ABHISHEK PATHAK']},
    SPR:{name:'SUDURPASCHIM ROYALS',short:'SUDURPASCHIM',primary:'#f4c900',secondary:'#1547a8',text:'#111827',soft:'#6b5900',captain:'DIPENDRA SINGH AIREE',hero:'DIPENDRA SINGH AIREE',heroRole:'ALL-ROUNDER',bowler:'ABINASH BOHARA',colors:'YELLOW · BLUE',logoUrl:'/images/teams/sudurpaschim-royals/logo.png',externalLogo:'https://sudurpaschimroyals.com/royals-logo.png',roster:['DIPENDRA SINGH AIREE','BINOD BHANDARI','AARIF SHEIKH','ISHAN PANDEY','ABINASH BOHARA','HEMANT DHAMI','HIKMAT MAHARA','ANIL KHAREL','AYUB CHAND','DIPAK BOHARA','MILAN BOHARA']}
  };
  const TEAM_ORDER = ['KAG','JAB','CHR','KAY','LUL','POA','BIK','SPR'];

  const defaults = {
    meta:{version:6,updatedAt:Date.now()},
    match:{teamA:'LUL',teamB:'SPR'},
    score:{runs:0,wickets:0,overs:'0.0',recent:['-','-','-','-','-','-']},
    live:{
      innings:'MATCH SCHEDULED',rateText:'MATCH NOT STARTED',
      strikerName:'ROHIT PAUDEL',strikerRuns:'0',strikerBalls:'0',
      nonStrikerName:'AAKASH TRIPATHI',nonStrikerRuns:'0',nonStrikerBalls:'0',
      bowlerName:'ABINASH BOHARA',bowlerFigures:'0/0',bowlerOvers:'0.0',
      requirement:'LUMBINI LIONS vs SUDURPASCHIM ROYALS · MATCH SCHEDULED',
      matchLabel:'MATCH 01 · NPL 2026 · SEASON3-M1 · LEAGUE',
      venue:'TRIBHUVAN UNIVERSITY INTERNATIONAL CRICKET GROUND, KIRTIPUR',
      tossText:'MATCH SCHEDULED · TOSS AT 12:45 PM · MATCH COMMENCES 1:15 PM NPT',
      target:'-'
    },
    ui:{scoreMode:'hidden',graphic:null,motion:82,ambient:true},
    profile:[['MATCHES','31'],['RUNS','834'],['AVERAGE','31.8'],['STRIKE RATE','124.5'],['50s','6'],['HIGH SCORE','79*']],
    compare:[['RUNS','0','0'],['BALLS','0','0'],['DOT %','0.0','0.0'],['BOUNDARIES','0','0'],['STRIKE RATE','0.0','0.0']],
    fow:[],
    summary:[['ROHIT PAUDEL','0*','0','0','0','0.0'],['AAKASH TRIPATHI','0*','0','0','0','0.0']],
    bowling:[['ABINASH BOHARA','0.0','0','0','0','0.00']],
    points:[
      ['1','SPR','0','0','0','0','0.000'],
      ['2','BIK','0','0','0','0','0.000'],
      ['3','KAG','0','0','0','0','0.000'],
      ['4','JAB','0','0','0','0','0.000'],
      ['5','CHR','0','0','0','0','0.000'],
      ['6','KAY','0','0','0','0','0.000'],
      ['7','LUL','0','0','0','0','0.000'],
      ['8','POA','0','0','0','0','0.000']
    ]
  };

  const deepClone = obj => JSON.parse(JSON.stringify(obj));
  const merge = (base, saved) => {
    const out = deepClone(base);
    if (!saved || typeof saved !== 'object') return out;
    for (const k of Object.keys(saved)) {
      if (saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k]) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) out[k] = {...out[k],...saved[k]};
      else out[k]=saved[k];
    }
    return out;
  };
  let state;
  try {
    try {
      localStorage.removeItem('npl-gfx-v7-state');
      localStorage.removeItem('npl-gfx-v6-state');
    } catch(e){}
    if (rawSaved && (
      rawSaved.score?.runs === 64 || 
      rawSaved.score?.overs === '16.0' || 
      rawSaved.live?.target === '5:00 PM' || 
      (rawSaved.live?.innings && rawSaved.live.innings.includes('5:00 PM')) ||
      (rawSaved.live?.requirement && rawSaved.live.requirement.includes('5:00 PM')) ||
      (rawSaved.live?.tossText && rawSaved.live.tossText.includes('5:00 PM')) ||
      (rawSaved.points && rawSaved.points.some(p => p[2] === '7' || p[2] === 7))
    )) {
      state = deepClone(defaults);
      try { localStorage.removeItem(STORAGE_KEY); } catch(e){}
    } else {
      state = merge(defaults, rawSaved);
      if (state.live?.innings && state.live.innings.includes('5:00 PM')) state.live.innings = defaults.live.innings;
      if (state.live?.requirement && state.live.requirement.includes('5:00 PM')) state.live.requirement = defaults.live.requirement;
      if (state.live?.tossText && state.live.tossText.includes('5:00 PM')) state.live.tossText = defaults.live.tossText;
      if (state.live?.target === '5:00 PM') state.live.target = '-';
      if (state.points && state.points.some(p => p[2] === '7' || p[2] === 7)) {
        state.points = deepClone(defaults.points);
      }
    }
  } catch {
    state = deepClone(defaults);
  }
  // Layer graphic state is preserved from storage / DB on refresh

  function fit(){
    const scale=Math.min(innerWidth/1920,innerHeight/1080);
    stage.style.transform=`translate(-50%,-50%) scale(${scale})`;
  }
  addEventListener('resize',fit); fit();

  if (window.gsap) {
    gsap.ticker.lagSmoothing(500,16);
    try { gsap.ticker.fps(120); } catch {}
    gsap.defaults({overwrite:'auto'});
  }

  function contrast(hex){
    if(!hex) return '#ffffff';
    const h=hex.replace('#','');
    const [r,g,b]=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));
    return (r*299+g*587+b*114)/1000 > 150 ? '#121212' : '#ffffff';
  }

  const CODE_MAP = {
    KAG: 'KAG', KG: 'KAG', KATHMANDU: 'KAG', 'KATHMANDU GURKHAS': 'KAG',
    JAB: 'JAB', JB: 'JAB', JANAKPUR: 'JAB', 'JANAKPUR BOLTS': 'JAB',
    CHR: 'CHR', CR: 'CHR', CHITWAN: 'CHR', 'CHITWAN RHINOS': 'CHR',
    KAY: 'KAY', KY: 'KAY', KARNALI: 'KAY', 'KARNALI YAKS': 'KAY',
    LUL: 'LUL', LL: 'LUL', LUMBINI: 'LUL', 'LUMBINI LIONS': 'LUL',
    POA: 'POA', PA: 'POA', POKHARA: 'POA', 'POKHARA AVENGERS': 'POA',
    BIK: 'BIK', BK: 'BIK', BIRATNAGAR: 'BIK', 'BIRATNAGAR KINGS': 'BIK',
    SPR: 'SPR', SR: 'SPR', SUDURPASCHIM: 'SPR', 'SUDURPASCHIM ROYALS': 'SPR'
  };

  function normalizeCode(raw) {
    if (!raw) return 'KAG';
    const clean = String(raw).trim().toUpperCase();
    return CODE_MAP[clean] || (TEAMS[clean] ? clean : 'KAG');
  }

  function team(code){
    const norm = normalizeCode(code);
    return TEAMS[norm] || TEAMS.KAG;
  }
  function setText(id,value){ const el=$('#'+id); if(el && el.textContent!==String(value)) el.textContent=value; }

  function injectMotionLayers(){
    $$('.full-card,.lower-third,.lower-strip,.compact-bug,.scorebar,.master-card').forEach(el=>{
      if(el.querySelector('.motion-surface')) return;
      const s=document.createElement('div'); s.className='motion-surface'; s.setAttribute('aria-hidden','true');
      s.innerHTML='<div class="card-aura-glow"></div><div class="cricket-grid-mesh"></div><div class="cricket-seam-arc"></div><i></i><i></i><i></i><b></b><em></em><div class="liquid-glass-sheen"></div>';
      el.prepend(s);
    });
    const stinger=$('#stinger');
    if(stinger && !stinger.querySelector('.stinger-rings')){
      const fx=document.createElement('div'); fx.className='stinger-rings'; fx.innerHTML='<i></i><i></i><i></i><b></b><b></b><b></b>'; stinger.prepend(fx);
    }
  }
  injectMotionLayers();

  function applyTeamTheme(){
    const normA = normalizeCode(state.match.teamA);
    const normB = normalizeCode(state.match.teamB);
    const a=team(normA), b=team(normB);
    const root = document.documentElement;
    root.style.setProperty('--team-a',a.primary); root.style.setProperty('--team-a2',a.secondary); root.style.setProperty('--team-a-text',a.text || contrast(a.primary)); root.style.setProperty('--team-a-soft',a.soft);
    root.style.setProperty('--team-b',b.primary); root.style.setProperty('--team-b2',b.secondary); root.style.setProperty('--team-b-text',b.text || contrast(b.primary)); root.style.setProperty('--team-b-soft',b.soft);
    root.style.setProperty('--accent', a.secondary || a.primary);
    root.style.setProperty('--accent2', a.primary);
    root.style.setProperty('--accentText', '#ffffff');

    if(stage) {
      stage.style.setProperty('--team-a',a.primary); stage.style.setProperty('--team-a2',a.secondary); stage.style.setProperty('--team-a-text',a.text || contrast(a.primary)); stage.style.setProperty('--team-a-soft',a.soft);
      stage.style.setProperty('--team-b',b.primary); stage.style.setProperty('--team-b2',b.secondary); stage.style.setProperty('--team-b-text',b.text || contrast(b.primary)); stage.style.setProperty('--team-b-soft',b.soft);
      stage.style.setProperty('--accent', a.secondary || a.primary);
      stage.style.setProperty('--accent2', a.primary);
      stage.style.setProperty('--accentText', '#ffffff');
      stage.dataset.teamA=normA; stage.dataset.teamB=normB;
    }

    ['masterCard', 'anchorMaster'].forEach(id => {
      const master = $('#' + id);
      if (!master) return;
      master.style.setProperty('--team-a', a.primary);
      master.style.setProperty('--team-a2', a.secondary);
      master.style.setProperty('--team-b', b.primary);
      master.style.setProperty('--team-b2', b.secondary);
      master.dataset.teamA = normA;
      master.dataset.teamB = normB;
    });
  }

  function renderTeams(){
    const a=team(state.match.teamA), b=team(state.match.teamB);
    const map={teamAName:a.name,teamBName:b.name,matchupAName:a.name,matchupBName:b.name,xiTeamName:a.name,xiTeamNameBig:a.name,resultAName:a.name,resultBName:b.name};
    Object.entries(map).forEach(([id,v])=>setText(id,v));

    // Render official team crest logos with fallback
    const setCrest = (id, tm, code, className='team-crest-img') => {
      const el = $('#' + id);
      if (!el) return;
      const norm = normalizeCode(code);
      const ext = norm === 'KAG' || norm === 'KAY' ? 'webp' : 'png';
      const localUrl = `/broadcast/assets/crests/${norm.toLowerCase()}.${ext}`;
      const url = tm.logoUrl || localUrl;
      const altUrl = tm.externalLogo || localUrl;
      el.innerHTML = `<img class="${className}" src="${url}" alt="${tm.name}" onerror="if(this.src!=='${localUrl}')this.src='${localUrl}';else if(this.src!=='${altUrl}')this.src='${altUrl}';else this.outerHTML='<span class=\\'monogram-fallback\\'>${code}</span>';" />`;
    };

    setCrest('teamAMonogram', a, state.match.teamA, 'team-crest-img');
    setCrest('teamBMonogram', b, state.match.teamB, 'team-crest-img');
    setCrest('compactTeam', a, state.match.teamA, 'team-crest-img');
    setCrest('matchupACode', a, state.match.teamA, 'matchup-crest-img');
    setCrest('matchupBCode', b, state.match.teamB, 'matchup-crest-img');
    setCrest('xiTeamCode', a, state.match.teamA, 'xi-crest-img');
    setCrest('tossCode', b, state.match.teamB, 'toss-crest-img');
    setCrest('resultACode', a, state.match.teamA, 'result-crest-img');
    setCrest('resultBCode', b, state.match.teamB, 'result-crest-img');
    setCrest('masterTeamAMonogram', a, state.match.teamA, 'team-crest-img');
    setCrest('masterVsMonogram', b, state.match.teamB, 'team-crest-img');
    setCrest('anchorMasterTeamAMonogram', a, state.match.teamA, 'team-crest-img');
    setCrest('anchorMasterTeamBMonogram', b, state.match.teamB, 'team-crest-img');
    setCrest('dualTeamMonogram', a, state.match.teamA, 'team-crest-img');
    // Scorecard graphics logos
    setCrest('inningsSummaryCrest', a, state.match.teamA, 'scorecard-crest-img');
    setCrest('bowlingCardCrest', b, state.match.teamB, 'scorecard-crest-img');
    setCrest('fowCrest', a, state.match.teamA, 'scorecard-crest-img');
    setText('masterTeamAName', a.name);
    setText('masterTeamBName', b.name);
    setText('masterTeamACode', a.short || state.match.teamA);
    setText('masterTeamBCode', b.short || state.match.teamB);
    setText('masterTeamABadge', 'BATTING');
    setText('masterTeamBBadge', 'BOWLING');
    setText('anchorMasterTeamAName', a.name);
    setText('anchorMasterTeamBName', b.name);
    setText('dualTeams', `${a.name} vs ${b.name}`);
    setText('masterTossText', state.live.tossText || `${b.name} WON TOSS & ELECTED TO BOWL`);

    // Update background watermarks for all cards with proper positioning and opacity
    const getCrestUrl = (tm, code) => {
      const norm = normalizeCode(code);
      const ext = norm === 'KAG' || norm === 'KAY' ? 'webp' : 'png';
      return tm.logoUrl || `/broadcast/assets/crests/${norm.toLowerCase()}.${ext}`;
    };
    const urlA = getCrestUrl(a, state.match.teamA);
    const urlB = getCrestUrl(b, state.match.teamB);

    const setCardWatermark = (cardId, url, altName, pos = 'right') => {
      const card = $('#' + cardId);
      if (!card) return;
      let wm = card.querySelector('.card-watermark' + (pos === 'left' ? '.left' : pos === 'center' ? '.center' : ':not(.left):not(.center)'));
      if (!wm) {
        wm = document.createElement('div');
        wm.className = `card-watermark ${pos}`;
        wm.setAttribute('aria-hidden', 'true');
        card.appendChild(wm);
      }
      wm.innerHTML = `<img class="card-watermark-img" src="${url}" alt="${altName}" />`;
    };

    setCardWatermark('inningsSummary', urlA, a.name, 'right');
    setCardWatermark('bowlingCard', urlB, b.name, 'right');
    setCardWatermark('fow', urlA, a.name, 'right');
    setCardWatermark('playingXI', urlA, a.name, 'right');
    setCardWatermark('toss', urlB, b.name, 'right');
    setCardWatermark('batterProfile', urlA, a.name, 'right');
    setCardWatermark('bowlerProfile', urlB, b.name, 'right');
    setCardWatermark('playerOfMatch', urlA, a.name, 'left');
    setCardWatermark('powerplay', urlA, a.name, 'right');
    setCardWatermark('projected', urlA, a.name, 'right');
    setCardWatermark('partnership', urlA, a.name, 'right');
    setCardWatermark('chase', urlA, a.name, 'right');
    setCardWatermark('overSummary', urlA, a.name, 'right');
    setCardWatermark('matchup', urlA, a.name, 'left');
    setCardWatermark('matchup', urlB, b.name, 'right');
    setCardWatermark('result', urlA, a.name, 'left');
    setCardWatermark('result', urlB, b.name, 'right');
    setCardWatermark('comparison', urlA, a.name, 'left');
    setCardWatermark('comparison', urlB, b.name, 'right');

    const bgA = $('#masterBgCrestA'); if (bgA) bgA.style.backgroundImage = `url('${urlA}')`;
    const bgB = $('#masterBgCrestB'); if (bgB) bgB.style.backgroundImage = `url('${urlB}')`;
    const anchorBgA = $('#anchorMasterBgCrestA'); if (anchorBgA) anchorBgA.style.backgroundImage = `url('${urlA}')`;
    const anchorBgB = $('#anchorMasterBgCrestB'); if (anchorBgB) anchorBgB.style.backgroundImage = `url('${urlB}')`;

    const tossTeam=$('#tossTeamName'); if(tossTeam)tossTeam.textContent=b.name;
    setText('ltEyebrow',`CAPTAIN · ${a.name}`); setText('ltName',a.captain); setText('ltRole','TEAM CAPTAIN · NPL 2026');
    setText('profileName',a.hero); setText('profileRole',a.heroRole);
    const profileInitials=$('#profileInitials'); if(profileInitials) profileInitials.textContent=a.hero.split(/\s+/).map(x=>x[0]).slice(0,2).join('');
    const bp=$('#bowlerProfile'); if(bp){const h=bp.querySelector('h2');if(h)h.textContent=b.bowler;const sp=bp.querySelector('.profile-placeholder span');if(sp)sp.textContent=b.bowler.split(/\s+/).map(x=>x[0]).slice(0,2).join('');}
    const cmp=$('#comparison'); if(cmp){const ps=cmp.querySelectorAll('.compare-person h2');if(ps[0])ps[0].textContent=state.live.strikerName;if(ps[1])ps[1].textContent=b.bowler;}
    const tossSmall=$('#toss .editorial-copy small'); if(tossSmall)tossSmall.textContent=`${b.name} WON THE TOSS`;
    const pom=$('#playerOfMatch .award-copy h2'); if(pom)pom.innerHTML=a.hero.replace(' ','<br>');
    const labels={
      '#playingXI .xi-lead small':'NPL SEASON 3 · 2026',
      '#batterProfile .eyebrow':`BATTER PROFILE · ${a.name}`,
      '#bowlerProfile .eyebrow':`BOWLER PROFILE · ${b.name}`,
      '#fow .card-title b':a.name,
      '#fowTeam':a.name,
      '#inningsSummary .card-title b':`${a.short} · ${state.score.runs}/${state.score.wickets}`,
      '#inningsSummaryTeam':`${a.short} · ${state.score.runs}/${state.score.wickets}`,
      '#bowlingCard .card-title b':b.name,
      '#bowlingCardTeam':b.name,
      '#powerplay .strip-label b':a.name,
      '#projected .strip-label b':a.name,
      '#chase .strip-label b':a.name
    };
    for(const [sel,v] of Object.entries(labels)){const el=$(sel);if(el)el.textContent=v;}
    applyTeamTheme();
  }

  function getContextualFow(tm, runs, wickets, overs, striker, nonStriker) {
    if (!tm || !Array.isArray(tm.roster)) return [];
    const w = Math.min(10, Math.max(0, Number(wickets) || 0));
    if (w === 0) return [];
    
    // Dismissed candidate pool: all roster players who are NOT currently at crease
    const dismissedPool = tm.roster.filter(p => {
      const pNorm = String(p).toUpperCase().trim();
      const sNorm = String(striker || '').toUpperCase().trim();
      const nsNorm = String(nonStriker || '').toUpperCase().trim();
      return pNorm !== sNorm && pNorm !== nsNorm && !sNorm.includes(pNorm) && !nsNorm.includes(pNorm);
    });

    const totRuns = Number(runs) || 0;
    const totOvers = parseFloat(overs) || 16.0;

    const pctR = [0.22, 0.44, 0.65, 0.81, 0.88, 0.92, 0.95, 0.97, 0.98, 0.99];
    const pctO = [0.15, 0.38, 0.62, 0.84, 0.89, 0.93, 0.96, 0.98, 0.99, 1.0];

    const result = [];
    for (let i = 0; i < w; i++) {
      const wScore = Math.max(i + 1, Math.min(Math.max(1, totRuns - (w - i - 1)), Math.round(totRuns * (pctR[i] || (0.1 * (i + 1))))));
      const wOverNum = Math.min(totOvers, (totOvers * (pctO[i] || (0.1 * (i + 1)))).toFixed(1));
      const pName = dismissedPool[i] || tm.roster[i] || `BATTER ${i+1}`;
      result.push([`${i + 1}/${wScore}`, pName, `${wOverNum} OV`]);
    }
    return result;
  }

  function roleFor(i){
    return ['CAPTAIN','BATTER','BATTER','ALL-ROUNDER','SPINNER','BOWLER','ALL-ROUNDER','BATTER','BOWLER','FAST BOWLER','BOWLER'][i] || 'PLAYER';
  }

  function renderLists(){
    const a=team(state.match.teamA);
    const xiList = $('#xiList');
    if (xiList && Array.isArray(a.roster)) {
      xiList.innerHTML=a.roster.slice(0,11).map((n,i)=>`<div class="xi-row"><span>${String(i+1).padStart(2,'0')}</span><b>${n}</b><small>${roleFor(i)}</small></div>`).join('');
    }
    const xiTeamName = $('#xiTeamName'); if(xiTeamName) xiTeamName.textContent = a.name;
    const xiTeamNameBig = $('#xiTeamNameBig'); if(xiTeamNameBig) xiTeamNameBig.textContent = a.name;

    const ps = $('#profileStats'); if(ps) ps.innerHTML=state.profile.map(r=>`<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
    const cr = $('#compareRows'); if(cr) cr.innerHTML=state.compare.map(r=>`<div class="compare-row"><span>${r[1]}</span><b>${r[0]}</b><span>${r[2]}</span></div>`).join('');
    
    // Dynamic Fall of Wickets for batting team (strictly ensuring correct team players)
    let activeFow = state.fow;
    const isTeamFowValid = Array.isArray(activeFow) && activeFow.length >= state.score.wickets && activeFow.every(f => {
      const fScore = parseInt((f[0] || '').split('/')[1] || '0', 10);
      const fPlayer = String(f[1] || '').toUpperCase();
      return fScore <= state.score.runs && Array.isArray(a.roster) && a.roster.some(r => {
        const rNorm = String(r).toUpperCase();
        return rNorm.includes(fPlayer) || fPlayer.includes(rNorm);
      });
    });
    if (!isTeamFowValid || !Array.isArray(activeFow) || activeFow.length === 0) {
      activeFow = getContextualFow(a, state.score.runs, state.score.wickets, state.score.overs, state.live.strikerName, state.live.nonStrikerName);
    }
    const fr = $('#fowRows'); if(fr) fr.innerHTML=activeFow.map(r=>`<div class="fow-row"><strong>${r[0]}</strong><b>${r[1]}</b><span>${r[2]}</span></div>`).join('');
    const sr = $('#summaryRows'); if(sr) sr.innerHTML=state.summary.map(r=>`<div class="summary-row"><b>${r[0]}</b><strong>${r[1]}</strong><span>${r[2]}</span><span>${r[3]}</span><span>${r[4]}</span><span>${r[5]}</span></div>`).join('');
    const br = $('#bowlingRows'); if(br) br.innerHTML=state.bowling.map(r=>`<div class="bowling-row"><b>${r[0]}</b><span>${r[1]}</span><span>${r[2]}</span><span>${r[3]}</span><strong>${r[4]}</strong><span>${r[5]}</span></div>`).join('');
    
    // Points table for full cards and Master Zone 5 (strictly deduplicated)
    const ptsTableHtml = state.points.map(r=>{
      const t=team(r[1]);
      return `<div class="points-row"><b>${r[0]}</b><b><span class="team-pill"><i class="team-dot" style="--dot:${t.primary};--ring:${t.secondary}">${r[1]}</i>${t.name}</span></b><span>${r[2]}</span><span>${r[3]}</span><span>${r[4]}</span><span>${r[5]}</span><span>${r[6]}</span></div>`;
    }).join('');
    const pr = $('#pointsRows'); if(pr) pr.innerHTML = ptsTableHtml;

    // Master Zone 5 Mini Standings (5 distinct franchises) for Master Card and Anchor Master
    const masterPointsEl = $('#masterPointsRows');
    const anchorPointsEl = $('#anchorMasterPointsRows');
    if (Array.isArray(state.points)) {
      const pointsRowsHtml = state.points.slice(0, 5).map(r => {
        const t = team(r[1]);
        return `
          <div class="table-row body">
            <span class="pos-num">${r[0]}</span>
            <b><span style="display:inline-flex;align-items:center;gap:6px;"><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${t.primary};border:1.5px solid ${t.secondary};"></i>${r[1]}</span></b>
            <span>${r[2]}</span>
            <span>${r[3]}</span>
            <span>${r[4]}</span>
            <span class="pts-val">${r[5]}</span>
            <span style="color:#94a3b8;font-size:10px;">${r[6]}</span>
          </div>
        `;
      }).join('');
      if (masterPointsEl) masterPointsEl.innerHTML = pointsRowsHtml;
      if (anchorPointsEl) anchorPointsEl.innerHTML = pointsRowsHtml;
    }

    // Dynamic Standings Header Pill
    const allPreTournament = Array.isArray(state.points) && state.points.every(r => Number(r[2]) === 0);
    const pillText = allPreTournament ? 'SEASON 3 · PRE-TOURNAMENT' : 'LIVE POSITIONS';
    setText('masterStandingsPill', pillText);
    setText('anchorMasterStandingsPill', pillText);

    // Fall of Wickets cards for Master Card and Anchor Master
    const masterFowEl = $('#masterFowCards');
    const anchorFowEl = $('#anchorMasterFowCards');
    let fowHtml = '';
    if (activeFow && activeFow.length > 0) {
      fowHtml = activeFow.slice(-4).map(f => `
        <div class="fow-step-card">
          <span class="fow-score">${f[0]}</span>
          <b class="fow-player">${f[1]}</b>
          <small class="fow-over">${f[2]}</small>
        </div>
      `).join('');
    } else {
      fowHtml = `
        <div class="fow-step-card opening">
          <span class="fow-score">0/0</span>
          <b class="fow-player">OPENING PARTNERSHIP</b>
          <small class="fow-over">${state.score.overs} OV · NO WICKETS DOWN</small>
        </div>
      `;
    }
    if (masterFowEl) masterFowEl.innerHTML = fowHtml;
    if (anchorFowEl) anchorFowEl.innerHTML = fowHtml;
  }

  function renderRecent(){
    const isScheduled = (state.score.overs === '0.0' || state.score.overs === '0' || !state.score.overs) && (Number(state.score.runs) === 0 || !state.score.runs) || (state.live?.innings && state.live.innings.toUpperCase().includes('SCHEDULED'));
    const balls = isScheduled ? ['-', '-', '-', '-', '-', '-'] : (state.score.recent || []);
    const html=balls.map(v=>`<i class="${v==='4'?'four':v==='6'?'six':v==='W'?'wicket':/WD|NB/.test(v)?'extra':''}">${v}</i>`).join('');
    const el1=$('#recentBalls'); if(el1)el1.innerHTML=html;
    const el2=$('#masterRecentBalls'); if(el2)el2.innerHTML=html;
    const el3=$('#anchorMasterRecentBalls'); if(el3)el3.innerHTML=html;
    const ovRem = $('#masterOverStatus');
    if (ovRem) {
      if (isScheduled) {
        ovRem.textContent = 'FIRST OVER PENDING';
      } else {
        const legalBallsInOver = balls.filter(b => b !== '-' && !/WD|NB/.test(b)).length;
        ovRem.textContent = `${Math.max(0, 6 - legalBallsInOver)} BALLS REMAINING`;
      }
    }
    const ovProg = $('#masterOverProgressTitle');
    if (ovProg) {
      ovProg.textContent = isScheduled ? 'OVER 1 PENDING' : `OVER ${Math.floor(parseFloat(state.score.overs) || 0) + 1} IN PROGRESS`;
    }
  }

  function setInput(id,v){const el=$('#'+id);if(el&&document.activeElement!==el)el.value=v;}
  function fillInputs(){
    setInput('teamASelect',state.match.teamA);setInput('teamBSelect',state.match.teamB);
    const l=state.live,s=state.score;
    const map={runsInput:s.runs,wkInput:s.wickets,oversInput:s.overs,requirementInput:l.requirement,matchLabelInput:l.matchLabel,venueInput:l.venue,inningsInput:l.innings,rateInput:l.rateText,strikerNameInput:l.strikerName,strikerRunsInput:l.strikerRuns,strikerBallsInput:l.strikerBalls,nonStrikerNameInput:l.nonStrikerName,nonStrikerRunsInput:l.nonStrikerRuns,nonStrikerBallsInput:l.nonStrikerBalls,bowlerNameInput:l.bowlerName,bowlerFiguresInput:l.bowlerFigures,bowlerOversInput:l.bowlerOvers};
    Object.entries(map).forEach(([id,v])=>setInput(id,v));
    const mi=$('#motionIntensity'); if(mi&&document.activeElement!==mi)mi.value=state.ui.motion;
  }

  function animateNumber(el,from,to){
    if(!el)return;from=Number(from);to=Number(to);
    if(!window.gsap||!Number.isFinite(from)||!Number.isFinite(to)){el.textContent=to;return;}
    const proxy={v:from}; gsap.to(proxy,{v:to,duration:.44,ease:'power3.out',onUpdate:()=>el.textContent=Math.round(proxy.v)});
  }
  function pop(el,amount=1.12){if(!el)return;if(window.gsap)gsap.fromTo(el,{scale:amount},{scale:1,duration:.5,ease:'elastic.out(1,.38)'});}

  function renderLive(previous=null,animate=true){
    renderTeams(); const l=state.live,s=state.score;
    const a = team(state.match.teamA);
    const b = team(state.match.teamB);

    // Dynamic statistical derivations
    const sRuns = Number(l.strikerRuns) || 0;
    const sBalls = Number(l.strikerBalls) || 0;
    const sSR = sBalls > 0 ? ((sRuns / sBalls) * 100).toFixed(1) : '0.0';

    const nsRuns = Number(l.nonStrikerRuns) || 0;
    const nsBalls = Number(l.nonStrikerBalls) || 0;
    const nsSR = nsBalls > 0 ? ((nsRuns / nsBalls) * 100).toFixed(1) : '0.0';

    const bFigs = (l.bowlerFigures || '0/0').split('/').map(Number);
    const bWkts = bFigs[0] || 0;
    const bRuns = bFigs[1] || 0;
    const bOvs = (l.bowlerOvers || '0.0').split('.').map(Number);
    const bBallsTot = (bOvs[0] || 0) * 6 + (bOvs[1] || 0);
    const bEcon = bBallsTot > 0 ? ((bRuns / (bBallsTot / 6))).toFixed(2) : '0.00';

    const [ov, bl] = String(s.overs || '0.0').split('.').map(Number);
    const totalBalls = (ov || 0) * 6 + (bl || 0);

    const isScheduled = (s.overs === '0.0' || s.overs === '0' || !s.overs) && (Number(s.runs) === 0 || !s.runs) || (l.innings && l.innings.toUpperCase().includes('SCHEDULED'));
    const isCompleted = (l.innings && l.innings.toUpperCase().includes('COMPLETED')) || (l.rateText && l.rateText.toUpperCase().includes('FINAL RESULT'));

    let targetVal = l.target || s.target;
    if (!targetVal && l.requirement) {
      const tMatch = l.requirement.match(/TARGET\s*(\d+)/i);
      if (tMatch) targetVal = tMatch[1];
    }
    if (!targetVal || isScheduled) {
      targetVal = '-';
    }

    let rrr = '-';
    let crr = '-';
    let projected = '-';
    let winProbA = 50;
    let winProbB = 50;

    if (!isScheduled && !isCompleted) {
      crr = totalBalls > 0 ? ((s.runs / (totalBalls / 6))).toFixed(2) : '0.00';
      projected = Math.round(Number(crr) * 20);
      if (Number(targetVal) > 0) {
        const needed = Math.max(0, Number(targetVal) - s.runs);
        const ballsRemaining = Math.max(1, 120 - totalBalls);
        rrr = ((needed / ballsRemaining) * 6).toFixed(2);
        winProbA = Math.min(96, Math.max(4, Math.round(100 - (needed / ballsRemaining * 48))));
        winProbB = 100 - winProbA;
      }
    } else if (isCompleted) {
      crr = 'FINAL';
      projected = s.runs;
      rrr = '-';
    }

    // Extract clean Match Pill (e.g. "MATCH 01")
    let matchPillText = 'MATCH 01';
    if (l.matchLabel) {
      const mMatch = l.matchLabel.match(/MATCH\s*(\d+|0\d+)|M(\d+)/i);
      if (mMatch) {
        const num = mMatch[1] || mMatch[2];
        matchPillText = `MATCH ${String(num).padStart(2, '0')}`;
      }
    }

    const partRuns = sRuns + nsRuns;
    const partBalls = sBalls + nsBalls;
    const partRate = partBalls > 0 ? ((partRuns / partBalls) * 6).toFixed(2) : '-';
    const splitAPct = partRuns > 0 ? Math.round((sRuns / partRuns) * 100) : 50;
    const splitBPct = 100 - splitAPct;

    const wktCount = Number(s.wickets) || 0;
    const currentWkt = Math.min(10, wktCount + 1);
    const wktSuffix = currentWkt === 1 ? 'ST' : currentWkt === 2 ? 'ND' : currentWkt === 3 ? 'RD' : 'TH';
    const partnershipLabel = isScheduled ? 'OPENING STAND · 0 (0b)' : `${currentWkt}${wktSuffix} WICKET PARTNERSHIP`;

    // Dynamic phase calculation matching actual game score
    const curOv = parseFloat(s.overs) || 0;
    if (isScheduled) {
      setText('phasePP', 'YET TO BAT');
      setText('phaseMid', 'YET TO BAT');
      setText('phaseDeath', 'YET TO BAT');
    } else {
      const ppRuns = Math.min(s.runs, Math.round(s.runs * (curOv <= 6 ? 1 : curOv <= 15 ? 0.42 : 0.40)));
      const ppWkts = Math.min(s.wickets, curOv <= 6 ? s.wickets : 1);
      const midRuns = curOv <= 6 ? 0 : Math.min(s.runs - ppRuns, Math.round(s.runs * 0.54));
      const midWkts = curOv <= 6 ? 0 : Math.min(Math.max(0, s.wickets - ppWkts), 3);
      const deathRuns = Math.max(0, s.runs - ppRuns - midRuns);
      const deathWkts = Math.max(0, s.wickets - ppWkts - midWkts);
      const deathOv = Math.max(0, (curOv - 15)).toFixed(1);

      setText('phasePP', curOv <= 6 ? `${s.runs}/${s.wickets} (${s.overs} OV)` : `${ppRuns}/${ppWkts}`);
      setText('phaseMid', curOv <= 6 ? 'YET TO BAT' : curOv <= 15 ? `${s.runs - ppRuns}/${s.wickets - ppWkts}` : `${midRuns}/${midWkts}`);
      setText('phaseDeath', curOv <= 15 ? 'YET TO BAT' : `${deathRuns}/${deathWkts} (${deathOv} OV)`);
    }

    const map={
      inningsText:l.innings,rateText:l.rateText,strikerName:l.strikerName,strikerRuns:l.strikerRuns,strikerBalls:l.strikerBalls,nonStrikerName:l.nonStrikerName,nonStrikerRuns:l.nonStrikerRuns,nonStrikerBalls:l.nonStrikerBalls,bowlerName:l.bowlerName,bowlerFigures:l.bowlerFigures,bowlerOvers:l.bowlerOvers,requirement:l.requirement,matchLabel:l.matchLabel,venueLabel:l.venue,
      compactStrikerName:l.strikerName,compactStrikerRuns:l.strikerRuns,compactStrikerBalls:l.strikerBalls,compactBowlerName:l.bowlerName,compactBowlerFigures:l.bowlerFigures,compactBowlerOvers:l.bowlerOvers,compactOvers:s.overs,compactScore:`${s.runs}/${s.wickets}`,
      // 16:9 Master Card
      masterRuns:s.runs,masterWickets:s.wickets,masterOvers:s.overs,masterRate:crr,masterRrr:rrr,masterTarget:targetVal,masterProjected:projected,
      masterInnings:l.innings,masterMatchPill:matchPillText,masterMatchLabel:l.matchLabel,masterVenue:l.venue,masterRequirement:l.requirement,
      masterTeamACode:a.short,masterTeamBCode:b.short,
      masterStrikerName:l.strikerName,masterStrikerRuns:`${sRuns}*`,masterStrikerBalls:sBalls,masterStrikerSR:sSR,
      masterStrikerFours:Math.max(0, Math.floor(sRuns / 7)),masterStrikerSixes:Math.max(0, Math.floor(sRuns / 18)),masterStrikerDots:Math.max(0, sBalls - Math.floor(sRuns / 1.8)),
      masterNonStrikerName:l.nonStrikerName,masterNonStrikerRuns:`${nsRuns}*`,masterNonStrikerBalls:nsBalls,masterNonStrikerSR:nsSR,
      masterNonStrikerFours:Math.max(0, Math.floor(nsRuns / 8)),masterNonStrikerSixes:Math.max(0, Math.floor(nsRuns / 22)),masterNonStrikerDots:Math.max(0, nsBalls - Math.floor(nsRuns / 1.8)),
      masterBowlerName:l.bowlerName,masterBowlerFigures:l.bowlerFigures,masterBowlerOvers:l.bowlerOvers,masterBowlerEcon:bEcon,
      masterBowlerBoundaries:Math.max(0, Math.floor(bRuns / 7)),masterBowlerDots:Math.max(0, bBallsTot - Math.floor(bRuns / 1.5)),
      masterPartnershipLabel:partnershipLabel,masterPartnershipRuns:`${partRuns} RUNS`,masterPartnershipBalls:partBalls,masterPartnershipRate:partRate,
      masterWinProbAText:`${a.short} ${winProbA}%`,masterWinProbBText:`${b.short} ${winProbB}%`,
      masterTossText:state.live.tossText || `${b.name} WON TOSS & ELECTED TO BOWL`,
      masterBowlerSpellBadge: isScheduled ? '1ST SPELL' : `SPELL ${Math.max(1, Math.ceil(parseFloat(l.bowlerOvers) || 1))} OV`,
      masterOverProgressTitle: isScheduled ? 'FIRST OVER PENDING' : `OVER ${Math.floor(curOv) + 1} IN PROGRESS`,
      // Anchor master (manual full-screen layer with rich game informatics)
      anchorMasterRuns:s.runs,anchorMasterWickets:s.wickets,anchorMasterOvers:s.overs,
      anchorMasterMatchLabel:l.matchLabel,anchorMasterVenue:l.venue,anchorMasterRequirement:l.requirement,
      anchorMasterStrikerName:l.strikerName,anchorMasterStrikerRuns:`${sRuns}*`,anchorMasterStrikerBalls:sBalls,anchorMasterStrikerSR:sSR,
      anchorMasterStrikerFours:Math.max(0, Math.floor(sRuns / 7)),anchorMasterStrikerSixes:Math.max(0, Math.floor(sRuns / 18)),
      anchorMasterNonStrikerName:l.nonStrikerName,anchorMasterNonStrikerRuns:`${nsRuns}*`,anchorMasterNonStrikerBalls:nsBalls,anchorMasterNonStrikerSR:nsSR,
      anchorMasterNonStrikerFours:Math.max(0, Math.floor(nsRuns / 8)),anchorMasterNonStrikerSixes:Math.max(0, Math.floor(nsRuns / 22)),
      anchorMasterBowlerName:l.bowlerName,anchorMasterBowlerFigures:l.bowlerFigures,anchorMasterBowlerOvers:l.bowlerOvers,anchorMasterBowlerEcon:bEcon,
      anchorMasterBowlerMaidens:'0',anchorMasterBowlerDots:Math.max(0, bBallsTot - Math.floor(bRuns / 1.5)),
      anchorMasterBowlerStyle:b.name.includes('ROYALS') ? 'RIGHT-ARM FAST MEDIUM' : 'LEFT-ARM ORTHODOX SPIN',
      anchorMasterPartnershipLabel:partnershipLabel,anchorMasterPartnershipRuns:`${partRuns} RUNS`,anchorMasterPartnershipBalls:`${partBalls} BALLS`,anchorMasterPartnershipRate:partRate,
      anchorMasterTossText:state.live.tossText || `${b.name} WON TOSS & ELECTED TO BOWL`,
      anchorMasterPhasePP:curOv <= 6 ? `${s.runs}/${s.wickets} (${s.overs} OV)` : `${ppRuns}/${ppWkts}`,
      anchorMasterPhaseMid:curOv <= 6 ? 'YET TO BAT' : curOv <= 15 ? `${s.runs - ppRuns}/${s.wickets - ppWkts}` : `${midRuns}/${midWkts}`,
      anchorMasterPhaseDeath:curOv <= 15 ? 'YET TO BAT' : `${deathRuns}/${deathWkts} (${deathOv} OV)`,
      anchorMasterRate:crr,anchorMasterRrr:rrr,anchorMasterTarget:targetVal,
      // Dual screen
      dualScore:`${s.runs}/${s.wickets}`,dualOvers:`${s.overs} OVERS · ${l.rateText}`,dualRequirement:l.requirement,dualBatters:`${l.strikerName} ${l.strikerRuns} (${l.strikerBalls}) · ${l.nonStrikerName} ${l.nonStrikerRuns} (${l.nonStrikerBalls})`,dualBowler:`${l.bowlerName} · ${l.bowlerFigures} (${l.bowlerOvers} ov)`,dualMatchLabel:l.matchLabel
    };
    Object.entries(map).forEach(([id,v])=>setText(id,v));

    // Update Win Probability bar
    const wpA = $('#masterWinProbA'); if (wpA) wpA.style.width = `${winProbA}%`;
    const wpB = $('#masterWinProbB'); if (wpB) wpB.style.width = `${winProbB}%`;

    // Update partnership split bars
    const psA = $('#masterPartSplitA'); if (psA) psA.style.width = `${splitAPct}%`;
    const psB = $('#masterPartSplitB'); if (psB) psB.style.width = `${splitBPct}%`;
    const apsA = $('#anchorMasterPartSplitA'); if (apsA) apsA.style.width = `${splitAPct}%`;
    const apsB = $('#anchorMasterPartSplitB'); if (apsB) apsB.style.width = `${splitBPct}%`;

    // Update real player portrait cutouts across cards WITHOUT initials overlay
    const setCutout = (elId, initialsId, teamCode, name) => {
      const el = $('#' + elId);
      if (!el) return;
      const url = getPlayerPhotoUrl(teamCode, name);
      if (url) {
        el.style.backgroundImage = `url('${url}')`;
      }
      if (initialsId) {
        const ini = $('#' + initialsId);
        if (ini) ini.textContent = '';
      }
    };
    setCutout('masterStrikerPhoto', 'masterStrikerInitials', state.match.teamA, l.strikerName);
    setCutout('masterNonStrikerPhoto', 'masterNonStrikerInitials', state.match.teamA, l.nonStrikerName);
    setCutout('masterBowlerPhoto', 'masterBowlerInitials', state.match.teamB, l.bowlerName);
    setCutout('anchorMasterStrikerPhoto', '', state.match.teamA, l.strikerName);
    setCutout('anchorMasterNonStrikerPhoto', '', state.match.teamA, l.nonStrikerName);
    setCutout('anchorMasterBowlerPhoto', '', state.match.teamB, l.bowlerName);
    setCutout('ltPhoto', 'ltInitials', state.match.teamA, l.strikerName);

    if(previous&&animate&&previous.score.runs!==s.runs)animateNumber($('#runs'),previous.score.runs,s.runs);else setText('runs',s.runs);
    if(previous&&animate&&previous.score.wickets!==s.wickets)animateNumber($('#wickets'),previous.score.wickets,s.wickets);else setText('wickets',s.wickets);
    setText('overs',s.overs); renderRecent(); fillInputs();
    if(previous&&animate&&JSON.stringify(previous.score.recent)!==JSON.stringify(s.recent)){const last=$('#recentBalls i:last-child');pop(last,1.5);}
    if(previous&&animate&&(previous.score.runs!==s.runs||previous.score.wickets!==s.wickets)){
      pop($('.score-value'),1.08);
      if(window.gsap) gsap.fromTo('.score-lockup',{boxShadow:'inset 0 0 24px rgba(245,158,11,0.45)'},{boxShadow:'inset 0 0 0px transparent',duration:0.75,clearProps:'boxShadow'});
    }
  }

  function hardHide(el){
    if(!el) return;
    stopElementMotion(el);
    if(window.gsap){
      try{
        gsap.killTweensOf(el);
        gsap.killTweensOf(el.querySelectorAll('*'));
        gsap.set(el, { autoAlpha: 0, display: 'none', clearProps: 'transform,clipPath' });
      }catch(e){}
    }
    el.classList.add('is-hidden');
    el.classList.remove('is-visible');
    el.style.display = 'none';
    el.style.visibility = 'hidden';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
  }
  function reveal(el){
    if(!el) return;
    el.classList.remove('is-hidden');
    el.classList.add('is-visible');
    el.style.display = '';
    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
    el.style.clipPath = '';
    if(window.gsap){
      try{ gsap.set(el, { autoAlpha: 1, display: '', clearProps: 'clipPath' }); }catch(e){}
    }
  }

  function waveText(el){
    if(!el||el.dataset.waveLock==='1')return; const raw=el.dataset.raw||el.textContent; if(raw.length>55)return;
    el.dataset.raw=raw;el.dataset.waveLock='1';
    el.style.whiteSpace='nowrap';el.style.display='inline-flex';el.style.flexDirection='row';el.style.flexWrap='nowrap';el.style.justifyContent='center';
    el.innerHTML=[...raw].map(ch=>`<span class="wave-char" style="display:inline-block;white-space:pre;flex-shrink:0;">${ch===' '?'&nbsp;':ch}</span>`).join('');
    const chars=[...el.children],m=Math.max(.25,state.ui.motion/100);
    if(window.anime)anime({targets:chars,translateY:[20*m,0],opacity:[0,1],rotateX:[-55,0],delay:anime.stagger(15*m,{from:'center'}),duration:460*m+220,easing:'easeOutExpo',complete:()=>el.dataset.waveLock='0'});else setTimeout(()=>el.dataset.waveLock='0',700);
  }

  function animateIn(el){
    if(!el)return;reveal(el); const m=Math.max(.25,state.ui.motion/100);
    if(!window.gsap){el.animate([{opacity:0,transform:'translateY(26px) scale(.99)'},{opacity:1,transform:'none'}],{duration:460,easing:'cubic-bezier(.2,.8,.2,1)'});return;}
    gsap.killTweensOf(el); const strip=el.matches('.scorebar,.compact-bug,.lower-third,.lower-strip');
    const tl=gsap.timeline();
    tl.fromTo(el,{autoAlpha:0,y:strip?34*m:24*m,scale:strip?.995:.985,clipPath:strip?'inset(0 0 100% 0 round 12px)':'inset(3% 2% 3% 2% round 24px)'},{autoAlpha:1,y:0,scale:1,clipPath:'inset(0% 0% 0% 0% round 0px)',duration:(strip?.42:.58)*m+.12,ease:'power4.out'});
    const title=el.querySelector('.card-title'); if(title)tl.fromTo(title,{x:-38*m,opacity:.2},{x:0,opacity:1,duration:.38,ease:'power3.out'},.03);
    const photo=el.querySelector('.profile-placeholder,.portrait-placeholder,.mini-portrait,.mega-monogram'); if(photo)tl.fromTo(photo,{y:26*m,x:18*m,scale:.93,opacity:0},{y:0,x:0,scale:1,opacity:1,duration:.62,ease:'back.out(1.25)'},.08);
    const parts=el.querySelectorAll('.xi-row,.profile-stats>div,.compare-row,.fow-row,.summary-row,.points-row,.bowling-row,.match-team,.match-center,.editorial-mark,.editorial-copy,.side-stat,.strip-player,.chase-big,.chase-small,.over-balls i,.result-team,.result-middle,.powerplay-info,.projection');
    if(parts.length)tl.fromTo(parts,{opacity:0,y:15*m},{opacity:1,y:0,duration:.35,stagger:.026*m+.008,ease:'power3.out'},.12);
  }

  function animateOut(el,instant=false){
    if(!el||el.classList.contains('is-hidden')||el.style.display==='none')return;
    const done=()=>hardHide(el);
    if(instant){done();return;}
    stopElementMotion(el);
    if(window.gsap){
      const strip=el.matches('.scorebar,.compact-bug,.lower-third,.lower-strip');
      gsap.killTweensOf(el);
      gsap.to(el,{
        autoAlpha:0,
        y:strip?28:16,
        scale:0.985,
        duration:0.28,
        ease:'power3.in',
        onComplete:done
      });
    }else{
      done();
    }
  }

  let stingerActive=false;

  function hideNonStingerLayers(){
    $$('.gfx').forEach(el=>{
      if(el.id!=='stinger')hardHide(el);
    });
    const banner=$('#masterEventLowerThird');
    if(banner){banner.classList.remove('is-active');banner.classList.add('is-hidden');}
    $('#masterCard')?.classList.remove('has-event-lower-third');
    $('#anchorMaster')?.classList.remove('has-event-lower-third');
  }

  function applyVisibility(animate=false){
    if(stingerActive){
      hideNonStingerLayers();
      reveal($('#stinger'));
      return;
    }
    const scorebar=$('#scorebar'),compact=$('#compactBug');
    const targetGraphic = state.ui.graphic || null;
    // Full-screen masters own the full canvas, so lower score layers stay hidden.
    if(targetGraphic === 'masterCard' || targetGraphic === 'anchorMaster' || state.ui.scoreMode === 'hidden'){
      hardHide(scorebar);
      hardHide(compact);
    }else if(state.ui.scoreMode==='scorebar'){
      hardHide(compact);
      animate?animateIn(scorebar):reveal(scorebar);
    }else if(state.ui.scoreMode==='compactBug'){
      hardHide(scorebar);
      animate?animateIn(compact):reveal(compact);
    }else{
      animate?animateOut(scorebar):hardHide(scorebar);
      animate?animateOut(compact):hardHide(compact);
    }
    $$('.gfx').forEach(el=>{
      if(['scorebar','compactBug','stinger'].includes(el.id))return;
      if(targetGraphic===el.id){
        const isAlreadyVisible = el.classList.contains('is-visible') && el.style.display !== 'none' && !el.classList.contains('is-hidden') && parseFloat(el.style.opacity || '1') > 0.5;
        if (!isAlreadyVisible) {
          animate ? animateIn(el) : reveal(el);
        }
      }else{
        animate ? animateOut(el) : hardHide(el);
      }
    });
  }
  function render(previous=null,animate=true){renderLists();renderLive(previous,animate);applyVisibility(animate&&!!previous);}

  function flashStatus(label='SAVED'){
    const el=$('#syncStatus');if(!el)return;
    el.textContent=label;el.classList.add('hot');clearTimeout(flashStatus.t);
    flashStatus.t=setTimeout(()=>{el.textContent='MANUAL CUE';el.classList.remove('hot')},900);
  }

  async function saveState(reason='update', persist=true){
    if(!persist)return;
    const snapshot=deepClone(state);
    snapshot.meta={version:6,updatedAt:Date.now(),reason};
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(snapshot));flashStatus('SAVED · SYNCED');}catch{}
    // Persist to MySQL database via API
    try{
      if(typeof fetch!=='undefined'){
        fetch('/api/broadcast/state',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            state:snapshot,
            action:reason,
            layer:snapshot.ui?.graphic||snapshot.ui?.scoreMode||null,
            payload:{reason,timestamp:Date.now()}
          })
        }).catch(()=>{});
      }
    }catch{}
  }

  function sendCue(action,payload={}){
    const msg={type:'cue',action,...payload,at:Date.now()};
    if(channel){try{channel.postMessage(msg);}catch{}}
    if(broadcastWs&&broadcastWs.readyState===WebSocket.OPEN){
      try{broadcastWs.send(JSON.stringify(msg));}catch{}
    }
    flashStatus('CUE SENT');
  }

  function show(id,publish=true, persist=publish){
    if(id==='scorebar'||id==='compactBug'){
      state.ui.scoreMode=id;
      applyVisibility(true);
      saveState('score mode ' + id, persist);
    }else{
      state.ui.graphic=id;
      applyVisibility(true);
      saveState('show ' + id, persist);
    }
    if(publish)sendCue('show',{id});
  }

  function stopElementMotion(el){
    if(!el)return;
    if(window.gsap){
      try{gsap.killTweensOf(el);gsap.killTweensOf(el.querySelectorAll('*'));}catch{}
    }
    if(window.anime?.remove){
      try{anime.remove(el);anime.remove(el.querySelectorAll('*'));}catch{}
    }
    el.getAnimations?.().forEach(a=>a.cancel());
    el.querySelectorAll('*').forEach(n=>n.getAnimations?.().forEach(a=>a.cancel()));
  }

  let stingerTimeline=null,stingerFallbackTimer=null;
  function stopStinger(restore=true){
    clearTimeout(stingerFallbackTimer);stingerFallbackTimer=null;
    if(stingerTimeline){try{stingerTimeline.kill()}catch{}stingerTimeline=null;}
    const el=$('#stinger');if(el){stopElementMotion(el);hardHide(el);}
    const wasActive=stingerActive;
    stingerActive=false;
    if(restore&&wasActive)applyVisibility(false);
  }

  function clearTransientLocal(){
    stopStinger();
    clearTimeout(ltEventTimer);
    dismissEventLowerThird();
    state.ui.graphic=null;
    applyVisibility(true);
  }

  function clearGraphics(publish=true, persist=publish){
    stopDemo(false,false);
    clearTransientLocal();
    const lt=$('#lowerThird');if(lt)animateOut(lt);
    state.ui.graphic=null;
    saveState('clear', persist);
    if(publish)sendCue('clear');
  }

  function stopAll(publish=true, persist=publish){
    stopDemo(false,false);
    clearTransientLocal();
    const lt=$('#lowerThird');if(lt)animateOut(lt);
    state.ui.graphic=null;
    saveState('stopAll', persist);
    if(publish)sendCue('stopAll');
  }

  function receiveCue(msg){
    if(!msg)return;
    const actionType = msg.action || msg.type;
    const prev = deepClone(state);
    switch(actionType){
      case 'show': {
        const id = msg.id || msg.data?.id;
        if(id){
          if(id === 'scorebar' || id === 'compactBug'){
            state.ui.scoreMode = id;
            applyVisibility(true);
            saveState('score mode ' + id, false);
          } else {
            show(id, false, false);
          }
        }
        break;
      }
      case 'clear': {
        clearGraphics(false, false);
        break;
      }
      case 'stopAll': {
        if(msg.clearScores || msg.stopScores){
          state.ui.scoreMode = 'hidden';
        }
        stopAll(false, false);
        break;
      }
      case 'stopLayer': {
        const id = msg.id || msg.layer;
        if(id){
          if(id === 'scorebar' || id === 'compactBug'){
            state.ui.scoreMode = 'hidden';
            applyVisibility(true);
          } else {
            if(state.ui.graphic === id) state.ui.graphic = null;
            const el = $('#' + id);
            if(el) animateOut(el);
          }
          saveState('stopLayer ' + id, false);
        }
        break;
      }
      case 'init': {
        if(msg.state){
          state = merge(defaults, msg.state);
          render(prev, false);
        }
        break;
      }
      case 'stinger': {
        const evt = msg.event || msg.data?.event;
        if(evt) {
          playStinger(evt, false);
        }
        break;
      }
      case 'eventLowerThird':
      case 'eventBanner': {
        const evt = msg.event || msg.data?.event || 'four';
        const isPersist = Boolean(msg.persist || msg.data?.persist);
        triggerMasterEventLowerThird(evt, isPersist);
        break;
      }
      case 'scoreMode': {
        const mode = msg.mode || msg.data?.mode;
        if(mode){
          state.ui.scoreMode = mode;
          applyVisibility(true);
          saveState('scoreMode ' + mode, false);
        }
        break;
      }
      case 'hideScores': {
        state.ui.scoreMode = 'hidden';
        applyVisibility(true);
        saveState('hideScores', false);
        break;
      }
      case 'action': {
        const name = msg.name || msg.data?.name;
        if(name) {
          action(name, false);
        }
        break;
      }
      case 'scoreUpdate': {
        const d = msg.data || msg.payload || msg;
        if(typeof d.runs === 'number') state.score.runs = d.runs;
        if(typeof d.wickets === 'number') state.score.wickets = d.wickets;
        if(d.overs !== undefined) state.score.overs = d.overs;
        renderLive(prev, true);
        break;
      }
      case 'updateData':
      case 'dataUpdated': {
        const p = msg.payload || msg.data || msg;
        if(p.match){
          if(p.match.teamA) state.match.teamA = p.match.teamA;
          if(p.match.teamB) state.match.teamB = p.match.teamB;
        }
        if(p.score){
          if(p.score.runs !== undefined) state.score.runs = Number(p.score.runs) || 0;
          if(p.score.wickets !== undefined) state.score.wickets = Number(p.score.wickets) || 0;
          if(p.score.overs !== undefined) state.score.overs = String(p.score.overs);
        }
        if(p.live){
          Object.assign(state.live, p.live);
        }
        if(p.points && Array.isArray(p.points)){
          state.points = p.points;
        }
        if(p.fow){
          state.fow = p.fow;
        } else if(p.match && p.match.teamA) {
          const a = team(state.match.teamA);
          state.fow = getContextualFow(a, state.score.runs, state.score.wickets, state.score.overs, state.live.strikerName, state.live.nonStrikerName);
        }
        applyTeamTheme();
        // In-place update without re-animating or flickering the master card
        renderLists();
        renderLive(prev, false);
        break;
      }
      case 'replay': {
        if(state.ui.graphic) animateIn($('#'+state.ui.graphic));
        else if(state.ui.scoreMode !== 'hidden') animateIn($('#'+state.ui.scoreMode));
        break;
      }
      case 'reloadState': {
        try {
          const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
          if(saved){
            state = merge(state, saved);
            renderLists();
            renderLive(prev, false);
          }
        } catch {}
        break;
      }
    }
  }
  if(channel)channel.addEventListener('message',e=>receiveCue(e.data));
  window.addEventListener('message',e=>{if(e.data&&typeof e.data==='object')receiveCue(e.data);});
  window.addEventListener('storage',e=>{
    if(e.key===STORAGE_KEY&&e.newValue){
      try{
        const prev=deepClone(state);
        const saved=JSON.parse(e.newValue);
        if(saved){
          state=merge(state,saved);
          applyTeamTheme();
          renderLists();
          renderLive(prev, false);
        }
      }catch{}
    }
  });

  let masterEventTimeout = null;
  function dismissEventLowerThird(){
    if(masterEventTimeout){clearTimeout(masterEventTimeout);masterEventTimeout=null;}
    const banner=$('#masterEventLowerThird');
    if(banner){banner.classList.remove('is-active');banner.classList.add('is-hidden');}
    $('#masterCard')?.classList.remove('has-event-lower-third');
    $('#anchorMaster')?.classList.remove('has-event-lower-third');
  }

  function triggerMasterEventLowerThird(eventType = 'four', persist = false) {
    stopStinger();
    clearTimeout(ltEventTimer);
    const standaloneLowerThird=$('#lowerThird');
    if(standaloneLowerThird)hardHide(standaloneLowerThird);
    const banner = $('#masterEventLowerThird');
    if (!banner) return;
    const masterCard = $('#masterCard');
    const anchorMaster = $('#anchorMaster');

    const norm = String(eventType || 'four').toLowerCase().replace(/[-_]/g, '').trim();

    const EVENT_CONFIGS = {
      four: {
        title: 'FOUR',
        kicker: 'BOUNDARY',
        badge: '4 RUNS',
        icon: '⚡',
        themeClass: 'melt-theme-four'
      },
      six: {
        title: 'SIX',
        kicker: 'MAXIMUM 6',
        badge: '6 RUNS',
        icon: '🚀',
        themeClass: 'melt-theme-six'
      },
      maximum: {
        title: 'SIX',
        kicker: 'MAXIMUM 6',
        badge: '6 RUNS',
        icon: '🚀',
        themeClass: 'melt-theme-six'
      },
      wicket: {
        title: 'WICKET',
        kicker: 'TIMBER! OUT',
        badge: 'OUT',
        icon: '🎯',
        themeClass: 'melt-theme-wicket'
      },
      out: {
        title: 'WICKET',
        kicker: 'OUT · BREAKTHROUGH',
        badge: 'OUT',
        icon: '🎯',
        themeClass: 'melt-theme-wicket'
      },
      wide: {
        title: 'WIDE',
        kicker: 'EXTRA',
        badge: 'WIDE +1',
        icon: '◄►',
        themeClass: 'melt-theme-wide'
      },
      noball: {
        title: 'NO BALL',
        kicker: 'HAZARD FAULT',
        badge: 'FREE HIT NEXT',
        icon: '⚠',
        themeClass: 'melt-theme-noball'
      },
      freehit: {
        title: 'FREE HIT',
        kicker: 'PENALTY OVERSTEP',
        badge: 'FREE HIT',
        icon: '⚡',
        themeClass: 'melt-theme-freehit'
      },
      drs: {
        title: 'DRS REVIEW',
        kicker: 'THIRD UMPIRE',
        badge: 'REVIEW',
        icon: '📡',
        themeClass: 'melt-theme-drs'
      },
      review: {
        title: 'DRS REVIEW',
        kicker: 'THIRD UMPIRE',
        badge: 'REVIEW',
        icon: '📡',
        themeClass: 'melt-theme-drs'
      },
      drsreview: {
        title: 'DRS REVIEW',
        kicker: 'THIRD UMPIRE',
        badge: 'REVIEW',
        icon: '📡',
        themeClass: 'melt-theme-drs'
      },
      timeout: {
        title: 'TIMEOUT',
        kicker: 'STRATEGIC BREAK',
        badge: '2.5 MIN',
        icon: '⏱',
        themeClass: 'melt-theme-timeout'
      },
      fifty: {
        title: 'FIFTY',
        kicker: '50 MILESTONE',
        badge: '50 RUNS',
        icon: '🏆',
        themeClass: 'melt-theme-fifty'
      },
      50: {
        title: 'FIFTY',
        kicker: '50 MILESTONE',
        badge: '50 RUNS',
        icon: '🏆',
        themeClass: 'melt-theme-fifty'
      },
      '50runs': {
        title: '50 RUNS',
        kicker: '50 MILESTONE',
        badge: 'HALF CENTURY',
        icon: '🏆',
        themeClass: 'melt-theme-fifty'
      },
      century: {
        title: 'CENTURY',
        kicker: '100 MILESTONE',
        badge: '100 RUNS',
        icon: '💯',
        themeClass: 'melt-theme-century'
      },
      100: {
        title: 'CENTURY',
        kicker: '100 MILESTONE',
        badge: '100 RUNS',
        icon: '💯',
        themeClass: 'melt-theme-century'
      },
      '100runs': {
        title: '100 RUNS',
        kicker: '100 MILESTONE',
        badge: 'MASTER TON',
        icon: '💯',
        themeClass: 'melt-theme-century'
      }
    };

    const cfg = EVENT_CONFIGS[norm] || EVENT_CONFIGS.four;

    // Apply pure kinetic typography and badges
    setText('meltTitle', cfg.title);
    setText('meltKicker', cfg.kicker);
    setText('meltBadgeText', cfg.badge);
    setText('meltIconSymbol', cfg.icon);

    // Apply theme classes and reveal
    banner.className = `master-event-lower-third is-active ${cfg.themeClass}`;
    banner.classList.remove('is-hidden');

    // 1. Auto-squeeze Zone 4 & 5 or Anchor Master informatics
    if (masterCard) masterCard.classList.add('has-event-lower-third');
    if (anchorMaster) anchorMaster.classList.add('has-event-lower-third');

    // 2. Play GSAP entrance if available
    if (window.gsap) {
      gsap.fromTo('#meltTitle', 
        { scale: 0.6, x: -35, opacity: 0 }, 
        { scale: 1, x: 0, opacity: 1, duration: 0.45, ease: 'back.out(2)' }
      );
      gsap.fromTo('#meltBurstBox', 
        { scale: 0.5, rotation: -20, opacity: 0 }, 
        { scale: 1, rotation: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
      );
    }

    // 3. Clear existing timer
    if (masterEventTimeout) clearTimeout(masterEventTimeout);

    // 4. Auto-dismiss after 4.6 seconds and smoothly un-squeeze (unless persist requested)
    if (!persist) {
      masterEventTimeout = setTimeout(() => {
        banner.classList.remove('is-active');
        if (masterCard) masterCard.classList.remove('has-event-lower-third');
        if (anchorMaster) anchorMaster.classList.remove('has-event-lower-third');
        setTimeout(() => {
          if (!banner.classList.contains('is-active')) {
            banner.classList.add('is-hidden');
          }
        }, 450);
      }, 4600);
    }
  }

  let ltEventTimer = null;
  function showLowerThirdEvent(event, title, detail) {
    const lt = $('#lowerThird');
    if (!lt) return;
    const a = team(state.match.teamA);
    setText('ltEyebrow', event);
    setText('ltName', title || state.live.strikerName);
    setText('ltRole', detail || `${a.name} · NPL 2026`);
    setText('ltStat', `${state.live.strikerRuns} (${state.live.strikerBalls})`);
    setText('ltNumber', event.includes('WICKET') ? 'W' : event.includes('SIX') ? '6' : '4');
    
    setTimeout(() => {
      clearTimeout(ltEventTimer);
      animateIn(lt);
      ltEventTimer = setTimeout(() => {
        animateOut(lt);
      }, 4500);
    }, 500);
  }

  function updateBowlerFigures(runsConceded, isWkt, isLegal) {
    let bf = state.live.bowlerFigures || '0/0';
    let parts = bf.split('/');
    let w = Number(parts[0]) || 0;
    let r = Number(parts[1]) || 0;
    r += runsConceded;
    if (isWkt) w += 1;
    state.live.bowlerFigures = `${w}/${r}`;

    if (isLegal) {
      let bo = state.live.bowlerOvers || '0.0';
      let [o, b] = bo.split('.').map(Number);
      o = o || 0;
      b = (b || 0) + 1;
      if (b >= 6) {
        o += 1;
        b = 0;
      }
      state.live.bowlerOvers = `${o}.${b}`;
    }
  }

  function rotateStrike() {
    const sName = state.live.strikerName;
    const sRuns = state.live.strikerRuns;
    const sBalls = state.live.strikerBalls;

    state.live.strikerName = state.live.nonStrikerName;
    state.live.strikerRuns = state.live.nonStrikerRuns;
    state.live.strikerBalls = state.live.nonStrikerBalls;

    state.live.nonStrikerName = sName;
    state.live.nonStrikerRuns = sRuns;
    state.live.nonStrikerBalls = sBalls;
  }

  function advanceOver() {
    let [o, b] = String(state.score.overs).split('.').map(Number);
    o = o || 0;
    b = (b || 0) + 1;
    let overFinished = false;
    if (b >= 6) {
      o += 1;
      b = 0;
      overFinished = true;
    }
    state.score.overs = `${o}.${b}`;

    if (overFinished) {
      // Over complete!
      // 1. Strike rotates at the end of the over
      rotateStrike();
      // 2. Select next bowler from roster
      const bTeam = team(state.match.teamB);
      if (bTeam && bTeam.roster && bTeam.roster.length) {
        const curBowler = state.live.bowlerName;
        const available = bTeam.roster.filter(name => name !== curBowler);
        if (available.length) {
          const nextBowler = available[(o % available.length)];
          state.live.bowlerName = nextBowler;
          state.live.bowlerFigures = '0/0';
          state.live.bowlerOvers = '0.0';
        }
      }
      // 3. Clear this over ball dots for the new over
      state.score.recent = [];
    }
  }

  function add(v, r=0, legal=true, wicket=false, persist=true){
    const previous = deepClone(state);
    state.score.runs += r;
    if (wicket) state.score.wickets = Math.min(10, state.score.wickets + 1);
    state.score.recent = [...state.score.recent, v].slice(-6);

    // Update bowler figures
    updateBowlerFigures(r, wicket, legal);

    // Update striker runs and balls
    if (r > 0 && !wicket) {
      state.live.strikerRuns = String((Number(state.live.strikerRuns) || 0) + r);
    }
    if (legal) {
      state.live.strikerBalls = String((Number(state.live.strikerBalls) || 0) + 1);
      advanceOver();
    }

    // Odd runs rotate strike mid-over
    if (r % 2 === 1 && !wicket) {
      rotateStrike();
    }

    // Recalculate Current Run Rate (CRR)
    const [ov, bl] = String(state.score.overs).split('.').map(Number);
    const totalBalls = (ov || 0) * 6 + (bl || 0);
    if (totalBalls > 0) {
      state.live.rateText = `CRR ${(state.score.runs / (totalBalls / 6)).toFixed(2)}`;
    }

    renderLive(previous, true);
    saveState('score update', persist);
  }

  const stingers = {
    four: ['BOUNDARY', 'FOUR', '4 RUNS · TO THE FENCE', 'four'],
    six: ['MAXIMUM', 'SIX', 'MAXIMUM 6 · OVER THE ROPES', 'six'],
    wicket: ['BREAKTHROUGH', 'WICKET', 'TIMBER! WICKET · OUT', 'wicket'],
    wide: ['EXTRA', 'WIDE', 'WIDE DELIVERY · +1 RUN', 'wide'],
    noball: ['NO BALL', 'NO BALL', 'NO BALL · FREE HIT NEXT', 'noball'],
    freehit: ['PENALTY', 'FREE HIT', 'FREE HIT DELIVERY · DANGER', 'freehit'],
    fifty: ['MILESTONE', 'FIFTY', '50 RUNS · HALF-CENTURY', 'fifty'],
    '50': ['MILESTONE', '50 RUNS', '50 RUNS · HALF-CENTURY', 'fifty'],
    '50runs': ['MILESTONE', '50 RUNS', '50 RUNS · HALF-CENTURY', 'fifty'],
    century: ['MILESTONE', 'CENTURY', '100 RUNS · MASTERCLASS TON', 'century'],
    '100': ['MILESTONE', '100 RUNS', '100 RUNS · MASTERCLASS TON', 'century'],
    '100runs': ['MILESTONE', '100 RUNS', '100 RUNS · MASTERCLASS TON', 'century'],
    review: ['DRS', 'REVIEW', 'DECISION PENDING · ULTRAEDGE', 'review'],
    drs: ['DRS REVIEW', 'DRS REVIEW', 'DECISION PENDING · ULTRAEDGE', 'review'],
    drsreview: ['DRS REVIEW', 'DRS REVIEW', 'DECISION PENDING · ULTRAEDGE', 'review'],
    timeout: ['BREAK', 'TIMEOUT', 'STRATEGIC TIMEOUT · 2.5 MIN', 'timeout'],
    out: ['DECISION', 'OUT', 'WICKET CONFIRMED ON REPLAY', 'out']
  };

  function playStinger(type, publish=true, persist=false){
    stopStinger();
    clearTimeout(ltEventTimer);
    dismissEventLowerThird();
    stingerActive=true;
    hideNonStingerLayers();
    const norm = String(type || 'four').toLowerCase().replace(/[-_]/g, '').trim();
    const cfg = stingers[norm] || stingers[type] || stingers.four;
    const el = $('#stinger');
    if (!el) return;
    
    // Clear display locks and set event theme
    el.classList.remove('is-hidden');
    el.classList.add('is-visible');
    el.style.display = 'flex';
    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.clipPath = 'none';
    el.className = `gfx stinger is-visible ${cfg[3]}`;

    setText('stingerKicker', cfg[0]);
    setText('stingerBadgeText', cfg[2]);

    const word = $('#stingerWord');
    if (word) {
      const rawText = cfg[1];
      // Generate individual letter spans for intense kinetic 3D typography
      word.innerHTML = [...rawText].map(ch => 
        `<span class="stinger-char" style="display:inline-block;white-space:pre;transform-origin:50% 70%;">${ch === ' ' ? '&nbsp;' : ch}</span>`
      ).join('');
    }

    if (window.gsap) {
      stingerTimeline = gsap.timeline({
        onComplete: () => {
          if (!persist) {
            stingerTimeline = null;
            hardHide(el);
            stingerActive=false;
            applyVisibility(false);
          }
        }
      });

      // 1. Initial State
      stingerTimeline
        .set(el, { autoAlpha: 1, display: 'flex', zIndex: 20000, clearProps: 'clipPath' })
        .set('.stinger-copy', { scale: 1, opacity: 1, display: 'flex' })
        .set('#stingerWord', { opacity: 1, scale: 1, display: 'inline-flex' })
        
        // 2. Background Shockwaves & Rules Explosive Entrance
        .fromTo('.stinger-bg', { scale: 1.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'power3.out' }, 0)
        .fromTo('.shock-ring', 
          { scale: 0.1, opacity: 1 }, 
          { scale: 3.8, opacity: 0, duration: 1.35, stagger: 0.12, ease: 'power3.out' }, 0)
        .fromTo('.stinger-rule.rule-a', 
          { scaleX: 0, x: -600, opacity: 0 }, 
          { scaleX: 1.3, x: 0, opacity: 0.95, duration: 0.45, ease: 'expo.out' }, 0)
        .fromTo('.stinger-rule.rule-b', 
          { scaleX: 0, x: 600, opacity: 0 }, 
          { scaleX: 1.3, x: 0, opacity: 0.95, duration: 0.45, ease: 'expo.out' }, 0)

        // 3. Explosive Radial Sparkle Particles Burst
        .fromTo('#stingerParticles i',
          { x: 0, y: 0, scale: 1.5, opacity: 1 },
          { 
            x: (i) => Math.cos(i * Math.PI / 4) * 580, 
            y: (i) => Math.sin(i * Math.PI / 4) * 400, 
            scale: 0.1, 
            opacity: 0, 
            duration: 1.3, 
            ease: 'power2.out' 
          }, 0.05)

        // 4. Kicker Badge Pop
        .fromTo('.stinger-kicker-badge', 
          { y: -35, opacity: 0, scale: 0.6 }, 
          { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2.2)' }, 0.06)

        // 5. GIANT CENTER TEXT EXPLOSION - Kinetic Character-by-Character Impact & 3D Slam
        .fromTo('.stinger-char',
          {
            scale: 0.1,
            opacity: 0,
            y: 90,
            rotationX: -80,
            rotationZ: (i) => (i % 2 === 0 ? -15 : 15)
          },
          {
            scale: 1,
            opacity: 1,
            y: 0,
            rotationX: 0,
            rotationZ: 0,
            duration: 0.55,
            stagger: 0.05,
            ease: 'back.out(2.4)'
          }, 0.08)

        // Whole Word Slam Punch
        .fromTo('#stingerWord',
          { scale: 0.4 },
          { scale: 1.18, duration: 0.35, ease: 'power4.out' }, 0.08)
        .to('#stingerWord',
          { scale: 1.0, duration: 0.28, ease: 'power2.out' }, 0.43)

        // 6. Pill Badge & Equalizer Bars Entry
        .fromTo('.stinger-event-pill, .stinger-motion-bars', 
          { opacity: 0, y: 35, scale: 0.8 }, 
          { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.08, ease: 'back.out(1.8)' }, 0.22)

        // 7. Dramatic Screen Punch Hold (gentle subtle breathing zoom between 0.6s and 2.8s)
        .to('#stingerWord', { scale: 1.06, duration: 2.1, ease: 'sine.inOut' }, 0.71);

        // 8. Epic Cinematic Outro Dissolve at 2.8s (unless persist requested)
        if (!persist) {
          stingerTimeline.to(el, { autoAlpha: 0, scale: 1.15, duration: 0.42, ease: 'power3.in' }, 2.8);
        }
    } else {
      if (!persist) {
        stingerFallbackTimer = setTimeout(() => {
          stingerFallbackTimer = null;
          hardHide(el);
          stingerActive=false;
          applyVisibility(false);
        }, 2900);
      }
    }
    if (publish) sendCue('stinger', { event: type });
  }

  function useTeamPreset(){
    const a=team(state.match.teamA),b=team(state.match.teamB);
    state.live.strikerName=a.hero;state.live.nonStrikerName=a.roster[2]||a.captain;state.live.bowlerName=b.bowler;
    state.live.requirement=`${a.short} NEED 27 FROM 22 BALLS`;
    state.fow=[[`1/31`,a.captain,'3.5 OV'],['2/67',a.roster[4]||a.hero,'8.1 OV'],['3/94',a.roster[3]||a.hero,'11.2 OV'],['4/112',a.roster[8]||a.hero,'13.4 OV']];
    state.summary=[[a.captain,'18','12','3','0','150.0'],[a.hero,'58*','41','6','2','141.5'],[a.roster[4]||a.hero,'22','17','2','1','129.4'],[a.roster[2]||a.hero,'27*','21','2','1','128.6']];
    state.bowling=[[b.bowler,'3.2','0','24','1','7.20'],[b.roster[2]||b.bowler,'4.0','0','36','1','9.00'],[b.roster[3]||b.bowler,'3.0','0','25','1','8.33'],[b.roster[5]||b.bowler,'3.0','0','27','0','9.00']];
  }

  function readInputs(){
    const v=id=>($('#'+id)?.value??'').trim();
    const a=v('teamASelect'),b=v('teamBSelect'); if(TEAMS[a])state.match.teamA=a;if(TEAMS[b])state.match.teamB=b;
    state.score.runs=Math.max(0,Number(v('runsInput'))||0);state.score.wickets=Math.max(0,Math.min(10,Number(v('wkInput'))||0));state.score.overs=v('oversInput')||'0.0';
    Object.assign(state.live,{matchLabel:v('matchLabelInput'),venue:v('venueInput'),innings:v('inningsInput'),rateText:v('rateInput'),strikerName:v('strikerNameInput').toUpperCase(),strikerRuns:v('strikerRunsInput'),strikerBalls:v('strikerBallsInput'),nonStrikerName:v('nonStrikerNameInput').toUpperCase(),nonStrikerRuns:v('nonStrikerRunsInput'),nonStrikerBalls:v('nonStrikerBallsInput'),bowlerName:v('bowlerNameInput').toUpperCase(),bowlerFigures:v('bowlerFiguresInput'),bowlerOvers:v('bowlerOversInput'),requirement:v('requirementInput').toUpperCase()});
  }

  let inputTimer;
  function saveInputsDraft(){
    if(!preview)return;
    clearTimeout(inputTimer);
    inputTimer=setTimeout(()=>{
      const prev=deepClone(state);readInputs();render(prev,false);saveState('operator edit');
    },180);
  }

  const DEMO_SEQUENCE=['matchup','toss','playingXI','lowerThird','batterProfile','bowlerProfile','comparison','partnership','powerplay','chase','overSummary','projected','fow','inningsSummary','bowlingCard','pointsTable','review','result','playerOfMatch'];
  let demoTimer=null,demoIndex=0,demoToken=0;
  function demoAll(){
    stopDemo(false,false);const token=++demoToken;demoIndex=0;show(DEMO_SEQUENCE[0],true);
    demoTimer=setInterval(()=>{if(token!==demoToken)return;demoIndex=(demoIndex+1)%DEMO_SEQUENCE.length;show(DEMO_SEQUENCE[demoIndex],true);},2600);
  }
  function stopDemo(clearCurrent=false,publish=true){
    demoToken++;
    if(demoTimer){clearInterval(demoTimer);demoTimer=null;}
    if(clearCurrent)clearTransientLocal();
    if(publish)sendCue('stopAll');
  }

  function action(name, persist=true){
    switch(name){
      case'run1':add('1',1,true,false,persist);break;case'run2':add('2',2,true,false,persist);break;case'run3':add('3',3,true,false,persist);break;
      case'undoDelivery':{
        const previous=deepClone(state);
        state.score.recent=(state.score.recent||[]).slice(0,-1);
        renderLive(previous,true);
        saveState('undo delivery', persist);
        break;
      }
      case'four':
        add('4',4,true,false,persist);
        playStinger('four', persist);
        break;
      case'six':
        add('6',6,true,false,persist);
        playStinger('six', persist);
        break;
      case'dot':add('0',0,true,false,persist);break;
      case'wide':
        add('WD',1,false,false,persist);
        playStinger('wide', persist);
        break;
      case'noBall':
        add('NB',1,false,false,persist);
        playStinger('noball', persist);
        break;
      case'wicket':
        add('W',0,true,true,persist);
        playStinger('wicket', persist);
        break;
      case'freehit':
        playStinger('freehit', persist);
        break;
      case'drs':
      case'review':
        playStinger('review', persist);
        break;
      case'timeout':
        playStinger('timeout', persist);
        break;
      case'fifty':
        playStinger('fifty', persist);
        break;
      case'century':
        playStinger('century', persist);
        break;
      case'hideScores':state.ui.scoreMode='hidden';applyVisibility(true);saveState('hide scores');sendCue('hideScores');break;case'clearGraphic':stopAll(true);break;
      case'reset':{stopAll(true);state=deepClone(defaults);state.ui.graphic=null;render(null,false);saveState('reset');break;}
      case'applyData':{const prev=deepClone(state);readInputs();render(prev,false);saveState('apply data');break;}
      case'demoAll':demoAll();break;case'stopDemo':stopDemo(true,true);break;case'stopAll':stopAll(true);break;
      case'ambientToggle':state.ui.ambient=!state.ui.ambient;applyAmbientState();saveState('ambient');break;
      case'replayGraphic':if(state.ui.graphic)animateIn($('#'+state.ui.graphic));else if(state.ui.scoreMode!=='hidden')animateIn($('#'+state.ui.scoreMode));sendCue('replay');break;
    }
  }


  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-tab]');if(t){$$('[data-tab]').forEach(x=>x.classList.remove('active'));$$('[data-panel]').forEach(x=>x.classList.remove('active'));t.classList.add('active');$(`[data-panel="${t.dataset.tab}"]`)?.classList.add('active');return;}
    const s=e.target.closest('[data-show]');if(s){stopDemo(false,false);show(s.dataset.show,true);return;}
    const a=e.target.closest('[data-action]');if(a){action(a.dataset.action);return;}
    const ev=e.target.closest('[data-event]');if(ev){playStinger(ev.dataset.event);return;}
  });

  operator?.addEventListener('input',e=>{
    if(e.target.id==='motionIntensity'){state.ui.motion=Number(e.target.value)||0;document.documentElement.style.setProperty('--motion-strength',state.ui.motion/100);saveState('motion');return;}
    if(e.target.matches('input,select'))saveInputsDraft();
  });
  operator?.addEventListener('change',e=>{
    if(e.target.matches('#teamASelect,#teamBSelect')){const prev=deepClone(state);readInputs();useTeamPreset();render(prev,false);saveState('team preset');}
  });
  $('#collapseOperator')?.addEventListener('click',()=>operator.classList.add('is-collapsed'));
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;const k=e.key.toLowerCase();if(k==='4')playStinger('four');else if(k==='6')playStinger('six');else if(k==='w')playStinger('wicket');else if(k==='s')show('scorebar');else if(k==='c')stopAll(true);else if(k==='o')operator?.classList.toggle('is-collapsed');else if(k==='d')demoAll();});

  function applyAmbientState(){
    document.body.classList.toggle('ambient-off',!state.ui.ambient);
    document.documentElement.style.setProperty('--motion-strength',state.ui.motion/100);
    if(!state.ui.ambient && window.gsap)gsap.killTweensOf('.motion-surface i,.motion-surface b,.motion-surface em,.portrait-placeholder,.profile-placeholder,.mini-portrait,.mega-monogram,.broadcast-atmosphere i');
    if(state.ui.ambient)startAmbientMotion();
  }
  let ambientStarted=false;
  function startAmbientMotion(){
    if(ambientStarted&&!state.ui.ambient)return;ambientStarted=true;if(!state.ui.ambient)return;
    if(window.gsap){
      gsap.to('.broadcast-atmosphere i:nth-child(1)',{x:130,y:-22,duration:11,repeat:-1,yoyo:true,ease:'sine.inOut'});
      gsap.to('.broadcast-atmosphere i:nth-child(2)',{x:-110,y:28,duration:14,repeat:-1,yoyo:true,ease:'sine.inOut'});
      gsap.to('.motion-surface i:nth-child(1)',{xPercent:22,yPercent:5,duration:8.5,repeat:-1,yoyo:true,ease:'sine.inOut'});
      gsap.to('.motion-surface i:nth-child(2)',{xPercent:-18,yPercent:-4,duration:10.5,repeat:-1,yoyo:true,ease:'sine.inOut'});
      gsap.to('.motion-surface em',{xPercent:42,duration:5.2,repeat:-1,ease:'none'});
    }
    if(window.anime){
      anime({targets:'.portrait-placeholder,.profile-placeholder,.mini-portrait',translateY:[0,-8],rotate:[0,.35],duration:2400,delay:anime.stagger(120),direction:'alternate',loop:true,easing:'easeInOutSine'});
      anime({targets:'.team-monogram,.mega-monogram',translateY:[0,-3],scale:[1,1.018],duration:2000,delay:anime.stagger(90),direction:'alternate',loop:true,easing:'easeInOutSine'});
      anime({targets:'.motion-surface b',translateX:['-18%','18%'],opacity:[.025,.12],duration:4400,delay:anime.stagger(140),direction:'alternate',loop:true,easing:'easeInOutQuad'});
    }
  }

  function startFpsMeter(){
    const el=$('#fpsStatus');if(!el)return;let frames=0,last=performance.now(),ema=0;
    const tick=now=>{frames++;if(now-last>=500){const fps=frames*1000/(now-last);ema=ema?ema*.65+fps*.35:fps;el.textContent=`FPS ${Math.round(ema)}`;frames=0;last=now;}requestAnimationFrame(tick)};requestAnimationFrame(tick);
  }

  let broadcastWs = null;
  function connectWebSocket(){
    try{
      let wsUrl = '';
      if (typeof window !== 'undefined') {
        const isHttps = window.location.protocol === 'https:';
        if (isHttps) {
          wsUrl = 'wss://' + window.location.host + '/ws';
        } else {
          const host = window.location.hostname || 'localhost';
          const port = window.location.port === '3211' ? '3212' : (window.location.port === '3000' ? '3001' : '3212');
          wsUrl = 'ws://' + host + ':' + port;
        }
      } else {
        wsUrl = 'ws://localhost:3212';
      }
      broadcastWs = new WebSocket(wsUrl);
      broadcastWs.onopen = () => {
        console.log('[Broadcast GFX] WebSocket connected to ' + wsUrl);
      };
      broadcastWs.onmessage = (event) => {
        try{
          const msg = JSON.parse(event.data);
          if (msg.type === 'init' && msg.state) {
            console.log('[Broadcast GFX] Loaded DB state via WebSocket:', msg.state);
            const prev = deepClone(state);
            state = merge(defaults, msg.state);
            render(prev, false);
            return;
          }
          receiveCue(msg);
        }catch(e){}
      };
      broadcastWs.onclose = () => {
        setTimeout(connectWebSocket, 2000);
      };
      broadcastWs.onerror = () => {
        try{ broadcastWs.close(); }catch(e){}
      };
    }catch(e){
      setTimeout(connectWebSocket, 3000);
    }
  }

  async function initFromDb(){
    try{
      const res = await fetch('/api/broadcast/state');
      if (res.ok) {
        const data = await res.json();
        if (data?.state) {
          console.log('[Broadcast GFX] Restored DB state on refresh:', data.state);
          const prev = deepClone(state);
          state = merge(defaults, data.state);
          if (typeof window !== 'undefined' && window.location.pathname.includes('/output') && (!state.ui.graphic || state.ui.graphic === 'masterCard')) {
            state.ui.graphic = 'anchorMaster';
          }
          render(prev, false);
        }
      }
    }catch(e){}

    try{
      const nplRes = await fetch('/api/broadcast/npl-data');
      if (nplRes.ok) {
        const npl = await nplRes.json();
        if (npl?.teams?.length) {
          npl.teams.forEach(t => {
            if (TEAMS[t.code] && t.players?.length) {
              TEAMS[t.code].roster = t.players.map(p => p.name);
            }
          });
        }
        if (npl?.standings?.length) {
          const seen = new Set();
          const cleanStandings = [];
          for (const s of npl.standings) {
            if (!seen.has(s.teamCode)) {
              seen.add(s.teamCode);
              cleanStandings.push(s);
            }
          }
          state.points = cleanStandings.map((s, idx) => [
            String(idx + 1),
            s.teamCode,
            String(s.played),
            String(s.won),
            String(s.lost),
            String(s.points),
            s.netRunRate
          ]);
        }
        renderLists();
        renderLive(null, false);
      }
    }catch(e){}
  }

  connectWebSocket();
  initFromDb();

  render(null,false);applyAmbientState();startFpsMeter();
  if(preview)flashStatus('MANUAL CUE');
  if(autoDemo&&preview) setTimeout(demoAll, 500);

  const queryGraphic = params.get('graphic') || params.get('layer') || params.get('card') || params.get('view');
  if (queryGraphic) {
    setTimeout(() => {
      show(queryGraphic, false);
    }, 250);
  } else if (typeof window !== 'undefined' && window.location.pathname.includes('/output')) {
    setTimeout(() => {
      if (!state.ui.graphic || state.ui.graphic === 'masterCard') {
        show('anchorMaster', false);
      }
    }, 350);
  }

  const queryEvent = params.get('event');
  const queryStinger = params.get('stinger');
  if (queryEvent) {
    setTimeout(() => {
      triggerMasterEventLowerThird(queryEvent, params.get('persist') === '1');
    }, 450);
  } else if (queryStinger) {
    setTimeout(() => {
      playStinger(queryStinger, false);
    }, 450);
  }

  window.NPLGFX={
    show:id=>show(id,true),clear:()=>stopAll(true),stinger:type=>playStinger(type,true),eventLowerThird:(type,persist=false)=>triggerMasterEventLowerThird(type,persist),demo:demoAll,stopDemo:()=>stopDemo(true,true),
    setTeams(a,b){const prev=deepClone(state);if(TEAMS[a])state.match.teamA=a;if(TEAMS[b])state.match.teamB=b;useTeamPreset();render(prev,true);saveState('api teams');},
    setScore(payload={}){const prev=deepClone(state);Object.assign(state.score,payload);renderLive(prev,true);saveState('api score');},
    setLive(payload={}){const prev=deepClone(state);Object.assign(state.live,payload);renderLive(prev,true);saveState('api live');},
    setPlayerPhoto(id,url){const el=$('#'+id);if(!el)return;el.style.backgroundImage=`url(${JSON.stringify(url).slice(1,-1)})`;el.classList.add('custom-photo');},
    getState(){return deepClone(state)}, save(){saveState('api save')}, teams:deepClone(TEAMS)
  };
})();
