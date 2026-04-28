import { useState, useEffect } from "react";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap";
const C = {
  bg:'#04050E',bg2:'#07081A',surface:'#0C0D1E',card:'#10112A',
  border:'#191B36',borderHi:'#2A2D55',
  primary:'#5B4FFF',primDim:'rgba(91,79,255,0.14)',primGlow:'rgba(91,79,255,0.35)',
  low:'#00D97E',lowDim:'rgba(0,217,126,0.12)',lowGlow:'rgba(0,217,126,0.3)',
  med:'#FF9D23',medDim:'rgba(255,157,35,0.12)',medGlow:'rgba(255,157,35,0.3)',
  hi:'#FF3B3B',hiDim:'rgba(255,59,59,0.12)',hiGlow:'rgba(255,59,59,0.3)',
  text:'#E4E6F0',muted:'#525875',
};
const rC=(l)=>({Low:C.low,Medium:C.med,High:C.hi}[l]||C.primary);
const rD=(l)=>({Low:C.lowDim,Medium:C.medDim,High:C.hiDim}[l]||C.primDim);
const rG=(l)=>({Low:C.lowGlow,Medium:C.medGlow,High:C.hiGlow}[l]||C.primGlow);
const WMO={0:{l:'Clear Sky',i:'☀️',v:'clear'},1:{l:'Mainly Clear',i:'🌤️',v:'partly_cloudy'},2:{l:'Partly Cloudy',i:'⛅',v:'partly_cloudy'},3:{l:'Overcast',i:'☁️',v:'overcast'},45:{l:'Foggy',i:'🌫️',v:'foggy'},48:{l:'Icy Fog',i:'🌫️',v:'foggy'},51:{l:'Light Drizzle',i:'🌦️',v:'drizzle'},53:{l:'Drizzle',i:'🌦️',v:'drizzle'},61:{l:'Light Rain',i:'🌧️',v:'rainy'},63:{l:'Rain',i:'🌧️',v:'rainy'},65:{l:'Heavy Rain',i:'🌧️',v:'heavy_rain'},71:{l:'Snow',i:'❄️',v:'snowy'},73:{l:'Moderate Snow',i:'❄️',v:'snowy'},75:{l:'Heavy Snow',i:'❄️',v:'snowy'},80:{l:'Showers',i:'🌦️',v:'rainy'},81:{l:'Heavy Showers',i:'🌧️',v:'heavy_rain'},95:{l:'Thunderstorm',i:'⛈️',v:'stormy'},99:{l:'Heavy Storm',i:'⛈️',v:'stormy'}};
const getWMO=(c)=>WMO[c]||(c>=45&&c<55?WMO[45]:c>=51&&c<58?WMO[51]:c>=60&&c<68?WMO[63]:c>=70&&c<78?WMO[71]:c>=80&&c<83?WMO[80]:c>=95?WMO[95]:WMO[0]);
const hashPw=(s)=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h)^s.charCodeAt(i);return(h>>>0).toString(36);};
const mkForm=()=>({location:'',lat:null,lon:null,time:new Date().toTimeString().slice(0,5),date:new Date().toISOString().slice(0,10),weatherLabel:'',weatherIcon:'',weatherValue:'',traffic:'medium',roadType:'urban',visibility:'good',speedLimit:'50',driverAge:'25-45',vehicleType:'car',purpose:'commute'});

function RiskGauge({pct,level}){
  const safePct=(!pct||isNaN(pct))?0:pct;
  const cx=110,cy=105,r=82,color=rC(level);
  const atp=(a)=>{const rad=Math.PI-(a*Math.PI/180);return{x:cx+r*Math.cos(rad),y:cy-r*Math.sin(rad)};};
  const arc=(a1,a2)=>{const s=atp(a1),e=atp(a2),large=(a2-a1)>180?1:0;return`M${s.x.toFixed(1)} ${s.y.toFixed(1)} A${r} ${r} 0 ${large} 0 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;};
  const needle=Math.min(179,Math.max(1,(safePct/100)*180));const np=atp(needle);
  return(
    <svg viewBox="0 20 220 95" style={{width:'100%',maxWidth:220,display:'block',margin:'0 auto'}}>
      <path d={arc(0,60)} fill="none" stroke={C.low} strokeWidth="13" strokeLinecap="round" opacity="0.18"/>
      <path d={arc(60,120)} fill="none" stroke={C.med} strokeWidth="13" strokeLinecap="round" opacity="0.18"/>
      <path d={arc(120,180)} fill="none" stroke={C.hi} strokeWidth="13" strokeLinecap="round" opacity="0.18"/>
      {safePct>0&&<path d={arc(0,needle)} fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" style={{filter:`drop-shadow(0 0 7px ${color})`}}/>}
      <line x1={cx} y1={cy} x2={np.x.toFixed(1)} y2={np.y.toFixed(1)} stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{filter:`drop-shadow(0 0 5px ${color})`}}/>
      <circle cx={cx} cy={cy} r="6" fill={color} style={{filter:`drop-shadow(0 0 7px ${color})`}}/><circle cx={cx} cy={cy} r="2.5" fill={C.bg}/>
      <text x="14" y="116" fill={C.low} fontSize="8" fontWeight="700" fontFamily="JetBrains Mono,monospace">LOW</text>
      <text x="97" y="30" fill={C.med} fontSize="8" fontWeight="700" fontFamily="JetBrains Mono,monospace">MED</text>
      <text x="188" y="116" fill={C.hi} fontSize="8" fontWeight="700" fontFamily="JetBrains Mono,monospace" textAnchor="end">HIGH</text>
    </svg>
  );
}

const Label=({c})=><div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.09em',marginBottom:7,fontFamily:'Outfit,sans-serif'}}>{c}</div>;
const Card=({ch,s={}})=><div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:20,...s}}>{ch}</div>;
const SecTitle=({ic,t})=><div style={{fontSize:11,fontWeight:800,color:C.muted,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:16,display:'flex',alignItems:'center',gap:6}}><span>{ic}</span><span>{t}</span></div>;
const Chip=({active,onClick,children,color})=><button onClick={onClick} style={{padding:'7px 11px',border:`1px solid ${active?(color||C.primary):C.border}`,borderRadius:8,cursor:'pointer',fontSize:12,fontFamily:'Outfit,sans-serif',fontWeight:active?700:400,background:active?(color?`${color}1A`:C.primDim):C.card,color:active?(color||C.primary):C.muted,transition:'all 0.15s'}}>{children}</button>;
const Inp=({...p})=><input {...p} style={{width:'100%',padding:'10px 14px',background:C.card,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'Outfit,sans-serif',...(p.style||{})}}/>;
const Sel=({value,onChange,children})=><select value={value} onChange={onChange} style={{width:'100%',padding:'10px 14px',background:C.card,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:13,outline:'none',fontFamily:'Outfit,sans-serif'}}>{children}</select>;

function LoadingOverlay({txt}){
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(4,5,14,0.92)',backdropFilter:'blur(10px)',zIndex:999,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:24}}>
      <div style={{position:'relative',width:90,height:90}}>
        {[0,1,2].map(i=><div key={i} style={{position:'absolute',inset:`${i*10}px`,borderRadius:'50%',border:'2px solid transparent',borderTopColor:i===0?C.primary:i===1?C.med:C.hi,animation:`spin${i} ${1+i*0.3}s linear infinite`}}/>)}
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>🛡️</div>
      </div>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:18,fontWeight:800,letterSpacing:'-0.01em',marginBottom:8}}>Analyzing Risk</div>
        <div style={{fontSize:13,color:C.muted,fontFamily:'JetBrains Mono,monospace'}}>{txt}</div>
      </div>
    </div>
  );
}

function Auth({setUser,loadHist,setScreen}){
  const [authMode,setAuthMode]=useState('login');
  const [aForm,setAForm]=useState({name:'',email:'',password:''});
  const [aErr,setAErr]=useState('');
  const [showPw,setShowPw]=useState(false);

  const doAuth=()=>{
    setAErr('');
    const{name,email,password}=aForm;
    if(!email.includes('@')||email.length<5)return setAErr('Enter a valid email address');
    if(password.length<6)return setAErr('Password must be at least 6 characters');
    const users=JSON.parse(localStorage.getItem('rg_us')||'{}');
    if(authMode==='signup'){
      if(!name.trim())return setAErr('Please enter your full name');
      if(users[email])return setAErr('This email is already registered');
      users[email]={name:name.trim(),email,ph:hashPw(password)};
      localStorage.setItem('rg_us',JSON.stringify(users));
    }else{if(!users[email]||users[email].ph!==hashPw(password))return setAErr('Incorrect email or password');}
    const u=users[email];const obj={name:u.name,email:u.email};
    setUser(obj);localStorage.setItem('rg_u',JSON.stringify(obj));
    loadHist(email);setScreen('home');
  };

  return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:`radial-gradient(ellipse at 30% 60%,rgba(91,79,255,0.13) 0%,transparent 55%),${C.bg}`}}>
      <div style={{width:'100%',maxWidth:430}} className="scaleIn">
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:72,height:72,borderRadius:22,background:`linear-gradient(135deg,${C.primary},#8B7FFF)`,boxShadow:`0 18px 50px ${C.primGlow}`,marginBottom:18,fontSize:34}}>🛡️</div>
          <h1 style={{margin:0,fontSize:34,fontWeight:900,letterSpacing:'-0.03em'}}>Road<span style={{color:C.primary}}>Guard</span><span style={{color:C.muted,fontSize:20,fontWeight:400}}> AI</span></h1>
          <p style={{margin:'8px 0 0',color:C.muted,fontSize:14}}>Intelligent road accident risk prediction engine</p>
        </div>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:22,padding:30,boxShadow:`0 30px 90px rgba(0,0,0,0.5)`}}>
          <div style={{display:'flex',background:C.bg2,borderRadius:12,padding:4,marginBottom:24}}>
            {[['login','Sign In'],['signup','Create Account']].map(([m,l])=>(
              <button key={m} onClick={()=>{setAuthMode(m);setAErr('');}} style={{flex:1,padding:'10px',border:'none',borderRadius:9,cursor:'pointer',fontFamily:'Outfit,sans-serif',fontWeight:700,fontSize:14,transition:'all 0.2s',background:authMode===m?C.primary:'transparent',color:authMode===m?'#fff':C.muted}}>{l}</button>
            ))}
          </div>
          {authMode==='signup'&&<div style={{marginBottom:14}}><Label c="Full Name"/><Inp value={aForm.name} onChange={e=>setAForm(f=>({...f,name:e.target.value}))} placeholder="Jane Smith"/></div>}
          <div style={{marginBottom:14}}><Label c="Email Address"/><Inp type="email" value={aForm.email} onChange={e=>setAForm(f=>({...f,email:e.target.value}))} placeholder="you@example.com"/></div>
          <div style={{marginBottom:aErr?14:20}}>
            <Label c="Password"/>
            <div style={{position:'relative'}}>
              <Inp type={showPw?'text':'password'} value={aForm.password} onChange={e=>setAForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&doAuth()} placeholder="6+ characters" style={{paddingRight:46}}/>
              <button onClick={()=>setShowPw(x=>!x)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:15,padding:4}}>{showPw?'🙈':'👁️'}</button>
            </div>
          </div>
          {aErr&&<div style={{background:'rgba(255,59,59,0.1)',border:'1px solid rgba(255,59,59,0.25)',borderRadius:9,padding:'10px 14px',marginBottom:14,fontSize:13,color:'#FF6B6B',fontWeight:500}}>⚠️ {aErr}</div>}
          <button onClick={doAuth} style={{width:'100%',padding:'14px',background:`linear-gradient(135deg,${C.primary},#8B7FFF)`,border:'none',borderRadius:12,color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',boxShadow:`0 8px 28px ${C.primGlow}`,fontFamily:'Outfit,sans-serif'}}>
            {authMode==='login'?'Sign In →':'Create Account →'}
          </button>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginTop:18}}>
            {[['📡','Live Weather','Auto-fetched'],['🤖','AI Model','Gemini AI'],['🔒','Secure','Local storage']].map(([ic,t,s])=>(
              <div key={t} style={{background:C.card,borderRadius:10,padding:'10px 8px',textAlign:'center'}}>
                <div style={{fontSize:18,marginBottom:3}}>{ic}</div>
                <div style={{fontSize:11,fontWeight:700,color:C.text}}>{t}</div>
                <div style={{fontSize:10,color:C.muted}}>{s}</div>
              </div>
            ))}
          </div>
        </div>
        <p style={{textAlign:'center',color:C.muted,fontSize:11,marginTop:14}}>🔒 All data stored locally · No external servers</p>
      </div>
    </div>
  );
}

function Home({form,setF,locSt,wxSt,setWxSt,detectAll,predict}){
  const dt=new Date(`${form.date}T${form.time}`);const hr=dt.getHours();
  const isRush=(hr>=7&&hr<=9)||(hr>=17&&hr<=19);const isNight=hr<6||hr>=22;
  const timeTag=isNight?{t:'🌙 Night Driving',c:C.hi}:isRush?{t:'⚡ Rush Hour',c:C.med}:{t:'☀️ Off-Peak Hours',c:C.low};
  return(
    <div className="fadeUp">
      <div style={{marginBottom:22}}>
        <h1 style={{margin:0,fontSize:26,fontWeight:900,letterSpacing:'-0.02em'}}>Predict Trip Risk <span style={{fontSize:16,fontWeight:400,color:C.muted}}>— AI-powered analysis</span></h1>
        <p style={{margin:'5px 0 0',color:C.muted,fontSize:13}}>Tap <b style={{color:C.primary}}>Auto-Detect</b> to get your GPS location + live weather automatically. Fill the rest manually.</p>
      </div>
      {/* Row 1: 3 equal columns */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:14}}>

        {/* CARD 1: Location + Weather */}
        <Card ch={<>
          <SecTitle ic="📍" t="Location & Live Weather"/>
          <button onClick={detectAll} disabled={locSt==='loading'} style={{width:'100%',padding:'13px',marginBottom:14,border:`1.5px dashed ${locSt==='done'?C.low:C.primary}`,borderRadius:11,background:locSt==='done'?C.lowDim:C.primDim,color:locSt==='done'?C.low:C.primary,cursor:locSt==='loading'?'wait':'pointer',fontSize:13,fontWeight:700,fontFamily:'Outfit,sans-serif',transition:'all 0.2s'}}>
            {locSt==='loading'?'📡 Detecting location & weather...':locSt==='done'?'✅ Location & Live Weather Fetched!':locSt==='error'?'❌ GPS failed — enter location manually':'📡 Auto-Detect My Location + Live Weather'}
          </button>
          <div style={{marginBottom:12}}><Label c="Location"/><Inp value={form.location} onChange={e=>setF('location',e.target.value)} placeholder="Or type city / address manually…"/></div>
          <div style={{background:C.card,borderRadius:10,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
            <span style={{fontSize:30,lineHeight:1,flexShrink:0}}>{form.weatherIcon||'🌡️'}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600}}>{form.weatherLabel||'Not set — auto-detect or pick below'}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:3}}>Visibility: <b style={{color:C.text}}>{form.visibility||'—'}</b></div>
            </div>
            <span style={{fontSize:9,fontWeight:800,letterSpacing:'0.05em',color:wxSt==='done'?C.low:wxSt==='loading'?C.med:C.muted}}>{wxSt==='done'?'● LIVE':wxSt==='loading'?'⏳':'● MANUAL'}</span>
          </div>
          <div><Label c={wxSt==='done'?'Override Weather':'Select Weather Conditions'}/>
            <Sel value={form.weatherValue} onChange={e=>{const o=e.target.options[e.target.selectedIndex];setF('weatherValue',e.target.value);if(e.target.value){setF('weatherLabel',o.dataset.label||o.text);setF('weatherIcon',o.dataset.icon||'🌡️');setWxSt('done');}}}>
              <option value="">— Select weather —</option>
              {[['clear','☀️','Clear / Sunny'],['partly_cloudy','⛅','Partly Cloudy'],['overcast','☁️','Overcast'],['foggy','🌫️','Foggy'],['drizzle','🌦️','Drizzle'],['rainy','🌧️','Rain'],['heavy_rain','🌧️','Heavy Rain'],['snowy','❄️','Snow / Sleet'],['stormy','⛈️','Thunderstorm']].map(([v,ic,l])=>(
                <option key={v} value={v} data-icon={ic} data-label={l}>{ic} {l}</option>
              ))}
            </Sel>
          </div>
        </>}/>

        {/* CARD 2: Date & Time */}
        <Card ch={<>
          <SecTitle ic="🕐" t="Date & Time"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
            <div><Label c="Trip Date"/><Inp type="date" value={form.date} onChange={e=>setF('date',e.target.value)}/></div>
            <div><Label c="Departure Time"/><Inp type="time" value={form.time} onChange={e=>setF('time',e.target.value)}/></div>
          </div>
          <Label c="Quick Presets"/>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
            {[['Now',new Date().toTimeString().slice(0,5)],['Morning','08:00'],['Afternoon','14:00'],['Rush','17:30'],['Late Night','23:00']].map(([l,t])=>(
              <Chip key={l} active={form.time===t} onClick={()=>setF('time',t)}>{l}</Chip>
            ))}
          </div>
          <div style={{background:C.card,borderRadius:10,padding:'11px 14px',display:'flex',alignItems:'center',gap:10,border:`1px solid ${timeTag.c}30`}}>
            <span style={{fontSize:22}}>{isNight?'🌙':isRush?'⚡':'☀️'}</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:timeTag.c}}>{timeTag.t}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>{isNight?'3× higher fatality risk during night hours':isRush?'Peak accident period — 40% of daily crashes':'Relatively lower accident frequency period'}</div>
            </div>
          </div>
        </>}/>

        {/* CARD 3: Traffic & Road */}
        <Card ch={<>
          <SecTitle ic="🚦" t="Traffic & Road Type"/>
          <div style={{marginBottom:16}}>
            <Label c="Traffic Level"/>
            <div style={{display:'flex',gap:8}}>
              {[['low','🟢 Low',C.low],['medium','🟡 Medium',C.med],['high','🔴 High',C.hi]].map(([v,l,col])=>(
                <button key={v} onClick={()=>setF('traffic',v)} style={{flex:1,padding:'10px 6px',border:`1.5px solid ${form.traffic===v?col:C.border}`,borderRadius:9,cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'Outfit,sans-serif',background:form.traffic===v?`${col}1A`:C.card,color:form.traffic===v?col:C.muted,transition:'all 0.15s'}}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <Label c="Road Type"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[['urban','🏙️ Urban'],['highway','🛣️ Highway'],['rural','🌿 Rural'],['mountain','⛰️ Mountain']].map(([v,l])=>(
                <Chip key={v} active={form.roadType===v} onClick={()=>setF('roadType',v)}>{l}</Chip>
              ))}
            </div>
          </div>
          <div>
            <Label c="Visibility"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[['good','👁️ Good'],['moderate','🌫️ Moderate'],['poor','🌁 Poor'],['very_poor','❌ Very Poor']].map(([v,l])=>(
                <Chip key={v} active={form.visibility===v} onClick={()=>setF('visibility',v)} color={v==='poor'||v==='very_poor'?C.hi:v==='moderate'?C.med:undefined}>{l}</Chip>
              ))}
            </div>
          </div>
        </>}/>
      </div>

      {/* Row 2: Vehicle & Driver — full width, 3-col inner layout */}
      <Card s={{marginBottom:14}} ch={<>
        <SecTitle ic="🚗" t="Vehicle & Driver"/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
          <div>
            <Label c="Vehicle Type"/>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7}}>
              {[['car','🚗','Car'],['motorcycle','🏍️','Moto'],['truck','🚚','Truck'],['bus','🚌','Bus'],['bicycle','🚲','Bicycle'],['suv','🚙','SUV']].map(([v,ic,l])=>(
                <button key={v} onClick={()=>setF('vehicleType',v)} style={{padding:'10px 5px',border:`1.5px solid ${form.vehicleType===v?C.primary:C.border}`,borderRadius:9,cursor:'pointer',fontFamily:'Outfit,sans-serif',fontSize:11,fontWeight:form.vehicleType===v?700:400,background:form.vehicleType===v?C.primDim:C.card,color:form.vehicleType===v?C.primary:C.muted,display:'flex',flexDirection:'column',alignItems:'center',gap:3,transition:'all 0.15s'}}>
                  <span style={{fontSize:20}}>{ic}</span><span>{l}</span>
                </button>
              ))}
            </div>
            {form.vehicleType==='motorcycle'&&<div style={{marginTop:8,padding:'8px 10px',background:'rgba(255,59,59,0.08)',borderRadius:7,fontSize:11,color:'#FF7777'}}>⚠️ 29× higher fatality rate vs cars</div>}
          </div>
          <div>
            <Label c="Driver Age Group"/>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {[['16-24','Young'],['25-45','Adult'],['46-65','Middle'],['65+','Senior']].map(([v,l])=>(
                <Chip key={v} active={form.driverAge===v} onClick={()=>setF('driverAge',v)} color={v==='16-24'||v==='65+'?C.hi:undefined}>{v} <span style={{fontSize:10,opacity:0.7}}>{l}</span></Chip>
              ))}
            </div>
          </div>
          <div>
            <Label c="Trip Purpose"/>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {[['commute','💼 Commute'],['leisure','🎉 Leisure'],['emergency','🚨 Emergency'],['business','📋 Business'],['school','🎒 School']].map(([v,l])=>(
                <Chip key={v} active={form.purpose===v} onClick={()=>setF('purpose',v)}>{l}</Chip>
              ))}
            </div>
          </div>
        </div>
      </>}/>

      {/* Row 3: Speed Zone — full width, 4-col grid */}
      <Card s={{marginBottom:16}} ch={<>
        <SecTitle ic="⚡" t="Speed Zone"/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {[['10','🔴 10','School zone'],['30','🟡 30','Residential'],['50','🟢 50','Urban'],['60','🟢 60','Arterial'],['80','🟡 80','Sub-highway'],['100','🟠 100','Highway'],['120','🔴 120','Motorway'],['130','🔴 130+','Autobahn']].map(([v,l,s])=>(
            <button key={v} onClick={()=>setF('speedLimit',v)} style={{padding:'12px 8px',border:`1.5px solid ${form.speedLimit===v?C.primary:C.border}`,borderRadius:10,cursor:'pointer',fontFamily:'Outfit,sans-serif',fontSize:12,fontWeight:form.speedLimit===v?700:400,background:form.speedLimit===v?C.primDim:C.card,color:form.speedLimit===v?C.primary:C.muted,transition:'all 0.15s',display:'flex',flexDirection:'column',alignItems:'center',gap:4,width:'100%'}}>
              <span style={{fontWeight:700}}>{l} km/h</span><span style={{fontSize:10,opacity:0.6}}>{s}</span>
            </button>
          ))}
        </div>
      </>}/>

      <div style={{textAlign:'center',paddingBottom:30}}>
        <button onClick={predict} style={{padding:'17px 60px',background:`linear-gradient(135deg,${C.primary},#8B7FFF)`,border:'none',borderRadius:16,color:'#fff',fontSize:17,fontWeight:900,cursor:'pointer',fontFamily:'Outfit,sans-serif',boxShadow:`0 12px 40px ${C.primGlow}`,letterSpacing:'0.01em'}}>
          🧠 Analyze Trip Risk →
        </button>
        <p style={{color:C.muted,fontSize:12,marginTop:10}}>Powered by Gemini AI · Uses real-time weather + GPS data</p>
      </div>
    </div>
  );
}

export default function App(){
  useEffect(()=>{const l=document.createElement('link');l.href=FONT_URL;l.rel='stylesheet';document.head.appendChild(l);return()=>l.remove();},[]);
  const [screen,setScreen]=useState('auth');
  const [user,setUser]=useState(null);
  const [form,setForm]=useState(mkForm());
  const [locSt,setLocSt]=useState('idle');
  const [wxSt,setWxSt]=useState('idle');
  const [loading,setLoading]=useState(false);
  const [loadTxt,setLoadTxt]=useState('');
  const [result,setResult]=useState(null);
  const [history,setHistory]=useState([]);
  const [histFilter,setHistFilter]=useState('All');
  const [selectedHist,setSelectedHist]=useState(null);

  useEffect(()=>{const u=localStorage.getItem('rg_u');if(u){const p=JSON.parse(u);setUser(p);loadHist(p.email);setScreen('home');}},[]);
  const setF=(k,v)=>setForm(f=>({...f,[k]:v}));
  const loadHist=(email)=>{const h=localStorage.getItem(`rg_h_${email}`);if(h)setHistory(JSON.parse(h));};
  const saveHist=(email,h)=>localStorage.setItem(`rg_h_${email}`,JSON.stringify(h));

  const detectAll=async()=>{
    setLocSt('loading');setWxSt('loading');
    try{
      const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:12000}));
      const{latitude:lat,longitude:lon}=pos.coords;
      const gr=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,{headers:{'Accept-Language':'en'}});
      const gd=await gr.json();
      const city=gd.address?.city||gd.address?.town||gd.address?.suburb||gd.address?.village||'Your Location';
      const cc=(gd.address?.country_code||'').toUpperCase();
      setForm(f=>({...f,location:`${city}${cc?', '+cc:''}`,lat,lon}));setLocSt('done');
      const wr=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,visibility,wind_speed_10m&timezone=auto`);
      const wd=await wr.json();const code=wd.current?.weather_code??0;const vis=wd.current?.visibility??10000;
      const wi=getWMO(code);let visLevel='good';
      if(vis<200)visLevel='very_poor';else if(vis<1000)visLevel='poor';else if(vis<4000)visLevel='moderate';
      setForm(f=>({...f,weatherLabel:wi.l,weatherIcon:wi.i,weatherValue:wi.v,visibility:visLevel}));setWxSt('done');
    }catch(e){setLocSt('error');setWxSt('idle');}
  };

  const predict=async()=>{
    if(!form.location)return alert('⚠️ Please set a location first');
    if(!form.weatherValue)return alert('⚠️ Please set weather conditions');
    setLoading(true);
    const steps=['🔍 Analyzing location data...','🌦️ Processing weather conditions...','🚦 Evaluating traffic patterns...','🧠 Running AI risk model...','📊 Generating safety report...'];
    let si=0;setLoadTxt(steps[0]);
    const timer=setInterval(()=>{si=(si+1)%steps.length;setLoadTxt(steps[si]);},900);
    try{
      const resp=await fetch('http://localhost:5000/api/predict',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          location:form.location,
          date:form.date,
          time:form.time,
          weather:form.weatherValue,
          weatherLabel:form.weatherLabel,
          traffic:form.traffic,
          roadType:form.roadType,
          visibility:form.visibility,
          speedLimit:form.speedLimit,
          driverAge:form.driverAge,
          vehicleType:form.vehicleType,
          purpose:form.purpose,
          lat:form.lat,
          lon:form.lon,
        })
      });
      const pred=await resp.json();
      if(!resp.ok)throw new Error(pred.message||'Backend error '+resp.status);
      const entry={
        id:Date.now(),ts:new Date().toISOString(),inputs:{...form},
        riskLevel:pred.riskLevel||'Medium',
        riskPercentage:Number(pred.riskPercentage)||0,
        explanation:pred.explanation||'',
        topFactors:Array.isArray(pred.topFactors)?pred.topFactors:[],
        recommendations:Array.isArray(pred.recommendations)?pred.recommendations:[],
        safeToTravel:pred.safeToTravel??true,
        alternativeSuggestion:pred.alternativeSuggestion||'',
        riskBreakdown:pred.riskBreakdown||{},
      };
      setResult(entry);const nh=[entry,...history].slice(0,100);
      setHistory(nh);saveHist(user.email,nh);setScreen('result');
    }catch(e){
      alert('❌ Prediction failed: '+e.message);
    }
    clearInterval(timer);setLoading(false);
  };

  const logout=()=>{localStorage.removeItem('rg_u');setUser(null);setScreen('auth');setResult(null);setHistory([]);setForm(mkForm());setLocSt('idle');setWxSt('idle');};
  const dotGrid=`radial-gradient(circle,${C.border} 1px,transparent 1px)`;

  return(
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:'Outfit,sans-serif',color:C.text,backgroundImage:`radial-gradient(ellipse at 15% 85%,rgba(91,79,255,0.07) 0%,transparent 55%),radial-gradient(ellipse at 85% 15%,rgba(255,59,59,0.05) 0%,transparent 50%),${dotGrid}`,backgroundSize:`auto,auto,28px 28px`}}>
      <style>{`
        *{box-sizing:border-box}
        input[type=date]::-webkit-calendar-picker-indicator,input[type=time]::-webkit-calendar-picker-indicator{filter:invert(0.5) sepia(1) hue-rotate(200deg)}
        select option{background:#10112A}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${C.bg2}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        @keyframes spin0{to{transform:rotate(360deg)}}
        @keyframes spin1{to{transform:rotate(360deg)}}
        @keyframes spin2{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}
        .fadeUp{animation:fadeUp 0.4s ease both}
        .scaleIn{animation:scaleIn 0.35s ease both}
        button:hover{opacity:0.88}
        button:active{transform:scale(0.97)!important}
      `}</style>
      {loading&&<LoadingOverlay txt={loadTxt}/>}
      {screen==='auth'?<Auth setUser={setUser} loadHist={loadHist} setScreen={setScreen}/>:<><Nav/><div style={{maxWidth:1100,margin:'0 auto',padding:'26px 16px'}}>{screen==='home'?<Home form={form} setF={setF} locSt={locSt} wxSt={wxSt} setWxSt={setWxSt} detectAll={detectAll} predict={predict}/>:screen==='result'?<Result/>:<History/>}</div></>}
    </div>
  );

  function Nav(){
    return(
      <nav style={{background:`${C.surface}F0`,backdropFilter:'blur(14px)',borderBottom:`1px solid ${C.border}`,padding:'0 20px',position:'sticky',top:0,zIndex:100}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',height:58}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:34,height:34,borderRadius:9,background:`linear-gradient(135deg,${C.primary},#8B7FFF)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17}}>🛡️</div>
            <span style={{fontWeight:900,fontSize:17,letterSpacing:'-0.02em'}}>Road<span style={{color:C.primary}}>Guard</span><span style={{color:C.muted,fontSize:12,fontWeight:400}}> AI</span></span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            {[['home','🔮','Predict'],['history','📊','History']].map(([s,ic,l])=>(
              <button key={s} onClick={()=>setScreen(s)} style={{padding:'7px 14px',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'Outfit,sans-serif',fontWeight:600,fontSize:13,transition:'all 0.15s',background:screen===s?C.primDim:'transparent',color:screen===s?C.primary:C.muted}}>{ic} {l}</button>
            ))}
            <div style={{marginLeft:10,paddingLeft:10,borderLeft:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:30,height:30,borderRadius:8,background:`linear-gradient(135deg,${C.primary},#FF6B9D)`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'#fff',fontSize:13}}>{user?.name?.[0]?.toUpperCase()}</div>
              <span style={{fontSize:12,color:C.muted,maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name}</span>
              <button onClick={logout} style={{padding:'5px 10px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:7,color:C.muted,cursor:'pointer',fontSize:11,fontFamily:'Outfit,sans-serif'}}>Logout</button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  function Result(){
    if(!result)return null;
    const color=rC(result.riskLevel);const dim=rD(result.riskLevel);const glow=rG(result.riskLevel);
    const bd=result.riskBreakdown||{};
    return(
      <div className="fadeUp">
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:22}}>
          <button onClick={()=>setScreen('home')} style={{padding:'8px 14px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:9,color:C.muted,cursor:'pointer',fontSize:13,fontFamily:'Outfit,sans-serif'}}>← New Prediction</button>
          <div>
            <h1 style={{margin:0,fontSize:22,fontWeight:900,letterSpacing:'-0.02em'}}>Risk Analysis Report</h1>
            <p style={{margin:0,color:C.muted,fontSize:12}}>{new Date(result.ts).toLocaleString()} · {result.inputs?.location}</p>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>

          {/* MAIN RISK */}
          <div style={{background:C.surface,border:`1.5px solid ${color}40`,borderRadius:20,padding:28,boxShadow:`0 16px 60px ${glow}25`,gridColumn:'span 2',maxWidth:560}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:13,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:16}}>Overall Risk Level</div>
              <RiskGauge pct={result.riskPercentage} level={result.riskLevel}/>
              <div style={{display:'inline-flex',alignItems:'center',gap:12,marginTop:10,background:dim,border:`1.5px solid ${color}40`,borderRadius:14,padding:'12px 28px'}}>
                <span style={{fontSize:36,fontWeight:900,color,fontFamily:'JetBrains Mono,monospace'}}>{result.riskPercentage}%</span>
                <div style={{textAlign:'left'}}>
                  <div style={{fontSize:22,fontWeight:900,color}}>{result.riskLevel} Risk</div>
                  <div style={{fontSize:12,color:C.muted}}>{result.safeToTravel?'✅ Safe with caution':'⚠️ Reconsider this trip'}</div>
                </div>
              </div>
              <div style={{marginTop:18,background:C.border,borderRadius:99,height:8,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${result.riskPercentage}%`,background:`linear-gradient(90deg,${C.low},${C.med},${C.hi})`,borderRadius:99,boxShadow:`0 0 10px ${color}`}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                <span style={{fontSize:10,color:C.low,fontWeight:600}}>0 SAFE</span>
                <span style={{fontSize:10,color:C.hi,fontWeight:600}}>100 DANGER</span>
              </div>
            </div>
          </div>

          {/* EXPLANATION */}
          <Card ch={<>
            <SecTitle ic="📋" t="Risk Explanation"/>
            <p style={{margin:0,fontSize:14,lineHeight:1.7,color:C.text}}>{result.explanation}</p>
            {result.alternativeSuggestion&&<div style={{marginTop:14,padding:'11px 14px',background:C.medDim,border:`1px solid ${C.med}30`,borderRadius:10}}>
              <span style={{fontSize:11,fontWeight:700,color:C.med,textTransform:'uppercase',letterSpacing:'0.08em'}}>💡 Suggestion</span>
              <p style={{margin:'6px 0 0',fontSize:13,color:C.text}}>{result.alternativeSuggestion}</p>
            </div>}
          </>}/>

          {/* TOP FACTORS */}
          <Card ch={<>
            <SecTitle ic="⚠️" t="Top Risk Factors"/>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {(result.topFactors||[]).map((f,i)=>(
                <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'11px 14px',background:C.card,borderRadius:10,border:`1px solid ${C.border}`}}>
                  <div style={{width:24,height:24,borderRadius:6,background:`${[C.hi,C.med,C.primary][i]}20`,border:`1px solid ${[C.hi,C.med,C.primary][i]}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:[C.hi,C.med,C.primary][i],flexShrink:0}}>{i+1}</div>
                  <p style={{margin:0,fontSize:13,color:C.text,lineHeight:1.5}}>{f}</p>
                </div>
              ))}
            </div>
          </>}/>

          {/* RECOMMENDATIONS */}
          <Card ch={<>
            <SecTitle ic="✅" t="Safety Recommendations"/>
            <div style={{display:'flex',flexDirection:'column',gap:9}}>
              {(result.recommendations||[]).map((r,i)=>(
                <div key={i} style={{display:'flex',gap:11,alignItems:'flex-start',padding:'11px 14px',background:C.lowDim,borderRadius:10,border:`1px solid ${C.low}25`}}>
                  <span style={{fontSize:14,flexShrink:0,color:C.low,fontWeight:800}}>✓</span>
                  <p style={{margin:0,fontSize:13,color:C.text,lineHeight:1.5}}>{r}</p>
                </div>
              ))}
            </div>
          </>}/>

          {/* RISK BREAKDOWN */}
          {Object.keys(bd).length>0&&<Card ch={<>
            <SecTitle ic="📊" t="Risk Breakdown"/>
            {Object.entries(bd).map(([k,v])=>(
              <div key={k} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                  <span style={{fontSize:12,fontWeight:600,color:C.text,textTransform:'capitalize'}}>{k.replace(/([A-Z])/g,' $1')}</span>
                  <span style={{fontSize:12,fontFamily:'JetBrains Mono,monospace',color:C.primary}}>+{v}%</span>
                </div>
                <div style={{background:C.border,borderRadius:99,height:6,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.min(100,(v/35)*100)}%`,background:`linear-gradient(90deg,${C.primary},${C.med})`,borderRadius:99}}/>
                </div>
              </div>
            ))}
          </>}/>}

          {/* TRIP SUMMARY */}
          <Card ch={<>
            <SecTitle ic="🗺️" t="Trip Summary"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[['📍','Location',result.inputs?.location||'—'],['🕐','Time',`${result.inputs?.date} ${result.inputs?.time}`],[result.inputs?.weatherIcon||'🌡️','Weather',result.inputs?.weatherLabel||'—'],['🚦','Traffic',result.inputs?.traffic||'—'],['🛣️','Road',result.inputs?.roadType||'—'],['🚗','Vehicle',result.inputs?.vehicleType||'—'],['⚡','Speed',`${result.inputs?.speedLimit} km/h`],['👤','Driver Age',result.inputs?.driverAge||'—']].map(([ic,k,v])=>(
                <div key={k} style={{padding:'9px 12px',background:C.card,borderRadius:9,display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontSize:16,flexShrink:0}}>{ic}</span>
                  <div><div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.07em'}}>{k}</div><div style={{fontSize:12,fontWeight:600,color:C.text,marginTop:1,textTransform:'capitalize'}}>{v}</div></div>
                </div>
              ))}
            </div>
          </>}/>
        </div>
        <div style={{textAlign:'center',padding:'24px 0',display:'flex',justifyContent:'center',gap:12,flexWrap:'wrap'}}>
          <button onClick={()=>setScreen('home')} style={{padding:'12px 28px',background:C.primDim,border:`1px solid ${C.primary}40`,borderRadius:12,color:C.primary,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Outfit,sans-serif'}}>🔮 New Prediction</button>
          <button onClick={()=>setScreen('history')} style={{padding:'12px 28px',background:C.card,border:`1px solid ${C.border}`,borderRadius:12,color:C.muted,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Outfit,sans-serif'}}>📊 View History</button>
        </div>
      </div>
    );
  }

  function History(){
    const totals={total:history.length,Low:0,Medium:0,High:0,avgRisk:0};
    history.forEach(h=>{totals[h.riskLevel]=(totals[h.riskLevel]||0)+1;totals.avgRisk+=(h.riskPercentage||0);});
    if(totals.total>0)totals.avgRisk=Math.round(totals.avgRisk/totals.total);
    const filtered=histFilter==='All'?history:history.filter(h=>h.riskLevel===histFilter);
    return(
      <div className="fadeUp">
        <div style={{marginBottom:22}}>
          <h1 style={{margin:0,fontSize:24,fontWeight:900,letterSpacing:'-0.02em'}}>Trip History & Analytics</h1>
          <p style={{margin:'4px 0 0',color:C.muted,fontSize:13}}>{totals.total} predictions · stored locally on your device</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:18}}>
          {[{ic:'🗓️',l:'Total Trips',v:totals.total,c:C.primary},{ic:'🟢',l:'Low Risk',v:totals.Low||0,c:C.low},{ic:'🟡',l:'Medium Risk',v:totals.Medium||0,c:C.med},{ic:'🔴',l:'High Risk',v:totals.High||0,c:C.hi},{ic:'📊',l:'Avg Risk',v:`${totals.avgRisk}%`,c:C.primary}].map(s=>(
            <div key={s.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:16,textAlign:'center'}}>
              <div style={{fontSize:22,marginBottom:6}}>{s.ic}</div>
              <div style={{fontSize:26,fontWeight:900,color:s.c,fontFamily:'JetBrains Mono,monospace'}}>{s.v}</div>
              <div style={{fontSize:11,color:C.muted,fontWeight:600,marginTop:4,textTransform:'uppercase',letterSpacing:'0.07em'}}>{s.l}</div>
            </div>
          ))}
        </div>
        {totals.total>0&&<Card s={{marginBottom:16}} ch={<>
          <SecTitle ic="📈" t="Risk Distribution"/>
          <div style={{display:'flex',height:40,borderRadius:10,overflow:'hidden',gap:2}}>
            {[['Low',C.low],['Medium',C.med],['High',C.hi]].map(([l,c])=>{
              const pct=totals.total>0?((totals[l]||0)/totals.total*100):0;
              return pct>0&&<div key={l} style={{flex:pct,background:c,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',minWidth:30}}>{pct>8&&`${Math.round(pct)}%`}</div>;
            })}
          </div>
          <div style={{display:'flex',gap:16,marginTop:8}}>
            {[['Low',C.low],['Medium',C.med],['High',C.hi]].map(([l,c])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:8,height:8,borderRadius:2,background:c}}/><span style={{fontSize:11,color:C.muted}}>{l}: {totals[l]||0}</span></div>
            ))}
          </div>
        </>}/>}
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
          {['All','Low','Medium','High'].map(f=>(
            <Chip key={f} active={histFilter===f} onClick={()=>setHistFilter(f)} color={f==='Low'?C.low:f==='Medium'?C.med:f==='High'?C.hi:undefined}>
              {f==='All'?`All (${totals.total})`:f==='Low'?`🟢 Low (${totals.Low||0})`:f==='Medium'?`🟡 Med (${totals.Medium||0})`:`🔴 High (${totals.High||0})`}
            </Chip>
          ))}
          {history.length>0&&<button onClick={()=>{if(window.confirm('Delete all history?')){setHistory([]);saveHist(user.email,[]);}}} style={{marginLeft:'auto',padding:'7px 12px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,cursor:'pointer',fontSize:11,fontFamily:'Outfit,sans-serif'}}>🗑️ Clear All</button>}
        </div>
        {filtered.length===0?(
          <div style={{textAlign:'center',padding:'60px 20px',color:C.muted}}>
            <div style={{fontSize:48,marginBottom:16}}>📋</div>
            <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>No predictions yet</div>
            <div style={{fontSize:13}}>Go to <b style={{color:C.primary}}>Predict</b> to analyze your first trip</div>
          </div>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {filtered.map(h=>{
              const color=rC(h.riskLevel);const isOpen=selectedHist===h.id;
              return(
                <div key={h.id} style={{background:C.surface,border:`1px solid ${isOpen?color+'50':C.border}`,borderRadius:14,overflow:'hidden',transition:'all 0.2s'}}>
                  <div onClick={()=>setSelectedHist(isOpen?null:h.id)} style={{padding:'14px 18px',cursor:'pointer',display:'flex',alignItems:'center',gap:14}}>
                    <div style={{width:44,height:44,borderRadius:11,background:rD(h.riskLevel),border:`1.5px solid ${color}40`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <span style={{fontSize:14,fontWeight:900,color,fontFamily:'JetBrains Mono,monospace'}}>{h.riskPercentage||0}</span>
                      <span style={{fontSize:9,color,fontWeight:600}}>%</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14,marginBottom:3,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        <span style={{color}}>{h.riskLevel} Risk</span>
                        <span style={{fontSize:12,color:C.muted,fontWeight:400,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.inputs?.location||'Unknown location'}</span>
                      </div>
                      <div style={{fontSize:11,color:C.muted,display:'flex',flexWrap:'wrap',gap:8}}>
                        <span>🕐 {h.inputs?.date} {h.inputs?.time}</span>
                        <span>{h.inputs?.weatherIcon||'🌡️'} {h.inputs?.weatherLabel||'—'}</span>
                        <span>🚦 {h.inputs?.traffic||'—'}</span>
                        <span>🚗 {h.inputs?.vehicleType||'—'}</span>
                      </div>
                    </div>
                    <span style={{fontSize:12,color:C.muted,transform:isOpen?'rotate(180deg)':'rotate(0)',transition:'transform 0.2s',flexShrink:0}}>▼</span>
                  </div>
                  {isOpen&&<div style={{borderTop:`1px solid ${C.border}`,padding:'14px 18px'}}>
                    <p style={{margin:'0 0 12px',fontSize:13,color:C.text,lineHeight:1.6}}>{h.explanation}</p>
                    {h.alternativeSuggestion&&<div style={{padding:'9px 12px',background:C.medDim,borderRadius:9,marginBottom:12,fontSize:12,color:C.text}}>💡 {h.alternativeSuggestion}</div>}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                      <div>
                        <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:7}}>Top Factors</div>
                        {(h.topFactors||[]).map((f,i)=><div key={i} style={{fontSize:12,color:C.text,padding:'6px 0',borderBottom:`1px solid ${C.border}`,lineHeight:1.4}}>• {f}</div>)}
                      </div>
                      <div>
                        <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:7}}>Recommendations</div>
                        {(h.recommendations||[]).map((r,i)=><div key={i} style={{fontSize:12,color:C.text,padding:'6px 0',borderBottom:`1px solid ${C.border}`,lineHeight:1.4}}>✓ {r}</div>)}
                      </div>
                    </div>
                  </div>}
                </div>
              );
            })}
          </div>
        )}
        <div style={{height:40}}/>
      </div>
    );
  }
}
