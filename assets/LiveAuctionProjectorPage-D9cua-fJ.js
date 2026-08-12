import{u as Qe,r as c,j as e,L as Ze}from"./index-Bh92Tu04.js";import{s as L}from"./supabase-j5CbjUjn.js";import{L as $e}from"./Loader-DJbQorHT.js";import{g as B}from"./cloudinary-BJgoPJhw.js";import{I as Ce}from"./IndianCurrencyDisplay-Do9wkD2m.js";import"./createLucideIcon-BJwuErwy.js";import"./currencyUtils-BpMnUgpb.js";const rt=()=>{var fe,he,me,ge,ye,ue,be,ve,we,je,ke,Se,ze,Ie,_e,We,Le;const[Me]=Qe(),Y=Me.get("code"),[H,Te]=c.useState([]),[Re,Ee]=c.useState(!0),[b,X]=c.useState(null),[a,A]=c.useState(null),[V,P]=c.useState([]),[W,K]=c.useState([]),[O,J]=c.useState(!1),[m,ee]=c.useState(null),[F,te]=c.useState(!1),[j,re]=c.useState(null),[k,De]=c.useState(window.innerWidth<=700),[o,Ne]=c.useState(window.innerWidth<=600),[Be,ae]=c.useState(!1),[Ae,ie]=c.useState(!1),[Oe,se]=c.useState(!1),[Fe,ne]=c.useState(!1),[oe,le]=c.useState(""),[ce,de]=c.useState(null),[Ue,pe]=c.useState("?"),[M,xe]=c.useState(!1),U=c.useRef(null),q=c.useRef(null),T=c.useRef(new Set),Q=c.useRef(!1),Ge=(r,t,g)=>{if(r==null)return;ne(!0),xe(!0),le(""),de(null),U.current&&clearInterval(U.current),q.current&&clearTimeout(q.current);let d=0;const p=22;U.current=setInterval(()=>{d++;const S=Math.floor(Math.random()*99)+1;pe(`#${S}`),d>=p&&(clearInterval(U.current),pe(`#${r}`),xe(!1),le(t||""),de(g||null),q.current=setTimeout(()=>{ne(!1)},3e3))},85)};c.useEffect(()=>{const r=()=>{De(window.innerWidth<=700),Ne(window.innerWidth<=600)};return window.addEventListener("resize",r),()=>window.removeEventListener("resize",r)},[]);const _=async(r=!1)=>{try{console.log("Fetching fresh projector data...",{forceSponsors:r});let t=null;if(Y){const{data:g}=await L.from("auctions").select("*").eq("auction_code",Y).maybeSingle();t=g}else{const{data:g,error:d}=await L.from("auctions").select("*").neq("status","draft").order("created_at",{ascending:!1});if(d)throw d;Te(g||[]),X(null),P([]),A(null);return}if(X(t),t){const{data:g}=await L.from("auction_teams").select("*").eq("auction_id",t.id);P(g||[]);const{data:d}=await L.from("auction_players").select("*, players(*)").eq("auction_id",t.id).eq("auction_status","active").limit(1).maybeSingle();if(A(d||null),!Q.current||r){console.log("Fetching sponsors from database (Cache miss / forced)...");const{data:p}=await L.from("sponsors").select("*").eq("auction_id",t.id).eq("is_active",!0).order("sequence",{ascending:!0});K(p||[]),Q.current=!0}else console.log("Using cached sponsors data.")}else P([]),A(null),K([]),Q.current=!1}catch(t){console.error("Projector fetch error:",t)}finally{Ee(!1)}},Ye=async r=>{const t=`${r.id}-sold`;if(T.current.has(t)){console.log("Duplicate sold event ignored for player:",r.id);return}T.current.add(t);const{data:g}=await L.from("auction_players").select("*, players(*)").eq("id",r.id).single();g&&(ee(g),J(!0),setTimeout(()=>{J(!1),ee(null),_()},8e3))},Pe=async r=>{const t=`${r.id}-unsold`;if(T.current.has(t)){console.log("Duplicate unsold event ignored for player:",r.id);return}T.current.add(t);const{data:g}=await L.from("auction_players").select("*, players(*)").eq("id",r.id).single();g&&(re(g),te(!0),setTimeout(()=>{te(!1),re(null),_()},8e3))};if(c.useEffect(()=>{_();const r=L.channel("projector_sync_channel").on("broadcast",{event:"random_number_draw"},d=>{var p;if(console.log("Received random_number_draw broadcast on projector:",d),((p=d==null?void 0:d.payload)==null?void 0:p.playerNumber)!=null){const S=d.payload;Ge(S.playerNumber,S.playerName,S.photoUrl)}}).on("postgres_changes",{event:"*",schema:"public",table:"auction_players"},d=>{var w;console.log("Realtime Player Event:",d.eventType,(w=d.new)==null?void 0:w.auction_status);const{new:p,old:S,eventType:R}=d;p.auction_status==="sold"?Ye(p):p.auction_status==="unsold"?Pe(p):(p.auction_status==="active"&&(T.current.delete(`${p.id}-sold`),T.current.delete(`${p.id}-unsold`)),R==="UPDATE"&&p.auction_status==="active"&&S&&S.auction_status==="active"?A(n=>n&&n.id===p.id?{...n,current_bid_price:p.current_bid_price,current_bid_team_id:p.current_bid_team_id,previous_bid_price:p.previous_bid_price,previous_bid_team_id:p.previous_bid_team_id}:(_(),n)):_())}).on("postgres_changes",{event:"*",schema:"public",table:"auctions"},()=>{console.log("Realtime Auction Event triggered refresh"),_()}).subscribe((d,p)=>{console.log("Realtime Status:",d),d==="SUBSCRIPTION_ERROR"&&console.error("Realtime Subscription Error:",p),d==="SUBSCRIBED"&&_()}),t=()=>{document.visibilityState==="visible"&&(console.log("Tab focused, syncing projector..."),_())};document.addEventListener("visibilitychange",t);const g=setInterval(()=>{console.log("Heartbeat sync..."),_()},3e4);return()=>{L.removeChannel(r),document.removeEventListener("visibilitychange",t),clearInterval(g)}},[Y]),c.useEffect(()=>{ae(!1)},[a==null?void 0:a.id]),c.useEffect(()=>{ie(!1)},[m==null?void 0:m.id]),c.useEffect(()=>{se(!1)},[j==null?void 0:j.id]),c.useEffect(()=>{if(!O)return;const r=document.getElementById("sold-canvas");if(!r)return;const t=r.getContext("2d");let g;const d=()=>{r.width=window.innerWidth,r.height=window.innerHeight};d(),window.addEventListener("resize",d);const p=(f,l,x)=>{const i=400/(400+x+300),u=f*i+r.width/2,v=l*i+r.height*.45;return{x:u,y:v,scale:i}},S=(f,l,x)=>{const s=Math.cos(x),i=Math.sin(x);return[f*s+l*i,-f*i+l*s]},R=(f,l,x)=>{const s=Math.cos(x),i=Math.sin(x);return[f*s-l*i,f*i+l*s]},w=[],n=60;for(let f=0;f<5;f++){const l=80-f*15,x=n-f*10;for(let s=0;s<Math.PI*2;s+=Math.PI/6)w.push({x:Math.cos(s)*x,y:l,z:Math.sin(s)*x})}for(let f=0;f<6;f++){const l=-10-f*15,x=25+f*10;for(let s=0;s<Math.PI*2;s+=Math.PI/8)w.push({x:Math.cos(s)*x,y:l,z:Math.sin(s)*x})}class D{constructor(){this.reset(),this.y=Math.random()*-r.height-50}reset(){this.x=Math.random()*r.width-r.width/2,this.y=-r.height/2-20,this.z=Math.random()*600-300,this.vx=Math.random()*2-1,this.vy=Math.random()*3+2,this.vz=Math.random()*2-1,this.color=`hsl(${Math.random()*360}, 100%, 65%)`,this.size=Math.random()*12+6,this.rx=Math.random()*Math.PI,this.ry=Math.random()*Math.PI,this.rz=Math.random()*Math.PI,this.vrx=Math.random()*.05-.025,this.vry=Math.random()*.05-.025,this.vrz=Math.random()*.05-.025}update(){this.x+=this.vx,this.y+=this.vy,this.z+=this.vz,this.rx+=this.vrx,this.ry+=this.vry,this.rz+=this.vrz,this.y>r.height/2+50&&this.reset()}draw(){const l=p(this.x,this.y,this.z);if(l.scale<=0)return;t.save(),t.translate(l.x,l.y),t.rotate(this.rz),t.fillStyle=this.color,t.globalAlpha=Math.min(1,l.scale);const x=this.size*l.scale;t.fillRect(-x/2,-x/2,x,x),t.restore()}}const G=Array.from({length:85},()=>new D);let y=0;const z=()=>{t.clearRect(0,0,r.width,r.height),G.forEach(l=>{l.update(),l.draw()}),y+=.015,t.save(),t.strokeStyle="#ffd700",t.lineWidth=1.5,t.shadowBlur=15,t.shadowColor="#ffd700";const f={};w.forEach(l=>{let[x,s]=S(l.x,l.z,y),[i,u]=R(l.y,s,.1);const v=p(x,i,u);f[l.y]||(f[l.y]=[]),f[l.y].push(v)}),Object.keys(f).forEach(l=>{const x=f[l];t.beginPath(),t.moveTo(x[0].x,x[0].y);for(let s=1;s<x.length;s++)t.lineTo(x[s].x,x[s].y);t.closePath(),t.stroke()}),t.restore(),g=requestAnimationFrame(z)};return z(),()=>{window.removeEventListener("resize",d),cancelAnimationFrame(g)}},[O]),c.useEffect(()=>{if(!F)return;const r=document.getElementById("unsold-canvas");if(!r)return;const t=r.getContext("2d");let g;const d=()=>{r.width=window.innerWidth,r.height=window.innerHeight};d(),window.addEventListener("resize",d);const p=(s,i,u)=>{const h=350/(350+u+400),I=s*h+(window.innerWidth<768?r.width*.5:r.width*.25),N=i*h+r.height*.65;return{x:I,y:N,scale:h}},S=(s,i,u)=>{const v=Math.cos(u),h=Math.sin(u);return[s*v+i*h,-s*h+i*v]},R=(s,i,u)=>{const v=Math.cos(u),h=Math.sin(u);return[s*v-i*h,s*h+i*v]},w=120,n={x:-200,y:-50,z:-400,vx:6,vy:3,vz:12,radius:12,hit:!1};class D{constructor(i){this.x=i,this.y=w-50,this.z=0,this.w=8,this.h=100,this.vx=0,this.vy=0,this.vz=0,this.rx=0,this.ry=0,this.rz=0,this.vrx=0,this.vry=0,this.vrz=0}update(){n.hit&&(this.vy+=.35,this.x+=this.vx,this.y+=this.vy,this.z+=this.vz,this.rx+=this.vrx,this.ry+=this.vry,this.rz+=this.vrz,this.y+this.h/2>w&&(this.y=w-this.h/2,this.vy=-this.vy*.3,this.vx*=.8,this.vz*=.8,this.vrx*=.8,this.vry*=.8,this.vrz*=.8))}draw(){const i=this.h/2,v=[{x:-this.w/2,y:-i,z:0},{x:this.w/2,y:-i,z:0},{x:this.w/2,y:i,z:0},{x:-this.w/2,y:i,z:0}].map(h=>{let[I,N]=R(h.y,h.z,this.rx),[Z,$]=S(h.x,N,this.ry);return p(Z+this.x,I+this.y,$+this.z)});t.save(),t.fillStyle="#8b5a2b",t.strokeStyle="#5c3a21",t.lineWidth=1,t.beginPath(),t.moveTo(v[0].x,v[0].y);for(let h=1;h<v.length;h++)t.lineTo(v[h].x,v[h].y);t.closePath(),t.fill(),t.stroke(),t.restore()}}class G{constructor(i,u){this.x=i,this.y=u,this.z=0,this.w=24,this.h=5,this.vx=0,this.vy=0,this.vz=0,this.rx=0,this.ry=0,this.rz=0,this.vrx=0,this.vry=0,this.vrz=0}update(){n.hit&&(this.vy+=.35,this.x+=this.vx,this.y+=this.vy,this.z+=this.vz,this.rx+=this.vrx,this.ry+=this.vry,this.rz+=this.vrz,this.y+this.h/2>w&&(this.y=w-this.h/2,this.vy=-this.vy*.25,this.vx*=.8,this.vz*=.8))}draw(){const i=this.w/2,u=this.h/2,h=[{x:-i,y:-u,z:0},{x:i,y:-u,z:0},{x:i,y:u,z:0},{x:-i,y:u,z:0}].map(I=>{let[N,Z]=R(I.y,I.z,this.rx),[$,qe]=S(I.x,Z,this.ry);return p($+this.x,N+this.y,qe+this.z)});t.save(),t.fillStyle="#cd853f",t.beginPath(),t.moveTo(h[0].x,h[0].y);for(let I=1;I<h.length;I++)t.lineTo(h[I].x,h[I].y);t.closePath(),t.fill(),t.restore()}}const y=[new D(-22),new D(0),new D(22)],z=[new G(-11,w-103),new G(11,w-103)];class f{constructor(){this.x=Math.random()*r.width,this.y=Math.random()*-r.height,this.length=Math.random()*12+4,this.speed=Math.random()*3+3}update(){this.y+=this.speed,this.y>r.height&&(this.y=-20,this.x=Math.random()*r.width)}draw(){t.strokeStyle="rgba(59, 130, 246, 0.25)",t.lineWidth=1,t.beginPath(),t.moveTo(this.x,this.y),t.lineTo(this.x,this.y+this.length),t.stroke()}}const l=Array.from({length:30},()=>new f),x=()=>{t.clearRect(0,0,r.width,r.height),l.forEach(i=>{i.update(),i.draw()}),n.hit?(n.x+=n.vx,n.y+=n.vy,n.z+=n.vz,n.vy+=.35,n.y>w&&(n.y=w,n.vy=-n.vy*.25)):(n.x+=n.vx,n.y+=n.vy,n.z+=n.vz,n.z>=0&&(n.hit=!0,n.vx=-4,n.vy=4,n.vz=-2,y[0].vx=-6,y[0].vy=-6,y[0].vz=-5,y[0].vrx=.15,y[0].vry=-.1,y[0].vrz=-.05,y[1].vx=1,y[1].vy=-8,y[1].vz=-8,y[1].vrx=-.18,y[1].vrz=.12,y[2].vx=7,y[2].vy=-5,y[2].vz=-4,y[2].vrx=.12,y[2].vry=.14,z[0].vx=-5,z[0].vy=-12,z[0].vz=-10,z[0].vrx=.25,z[1].vx=6,z[1].vy=-14,z[1].vz=-12,z[1].vrx=-.3));const s=p(n.x,n.y,n.z);s.scale>0&&(t.save(),t.fillStyle="#ef4444",t.shadowBlur=10*s.scale,t.shadowColor="rgba(239, 68, 68, 0.5)",t.beginPath(),t.arc(s.x,s.y,n.radius*s.scale,0,Math.PI*2),t.fill(),t.restore()),y.forEach(i=>{i.update(),i.draw()}),z.forEach(i=>{i.update(),i.draw()}),g=requestAnimationFrame(x)};return x(),()=>{window.removeEventListener("resize",d),cancelAnimationFrame(g)}},[F]),Re)return e.jsx($e,{message:"CALIBRATING PROJECTOR..."});const E=a!=null&&a.current_bid_team_id?V.find(r=>r.id===a.current_bid_team_id):null,C=m!=null&&m.team_id?V.find(r=>r.id===m.team_id):null;return e.jsxs("div",{style:{backgroundColor:"#050a10",minHeight:"100vh",color:"#fff",position:"relative",overflow:"hidden",padding:"clamp(12px, 2vw, 32px)",boxSizing:"border-box"},children:[e.jsx("div",{style:{position:"absolute",top:"-20%",left:"-10%",borderRadius:"50%",zIndex:0,pointerEvents:"none",width:"clamp(300px, 50vw, 600px)",height:"clamp(300px, 50vw, 600px)",background:"radial-gradient(circle, rgba(255,215,0,0.05) 0%, transparent 70%)"}}),e.jsx("div",{style:{position:"absolute",bottom:"-20%",right:"-10%",borderRadius:"50%",zIndex:0,pointerEvents:"none",width:"clamp(400px, 60vw, 800px)",height:"clamp(400px, 60vw, 800px)",background:"radial-gradient(circle, rgba(57,255,20,0.05) 0%, transparent 70%)"}}),e.jsxs("div",{style:{position:"relative",zIndex:1,display:"flex",flexDirection:"column",minHeight:"calc(100vh - clamp(24px, 4vw, 64px))"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px",marginBottom:"clamp(8px, 2vh, 16px)",borderBottom:"2px solid rgba(255,255,255,0.1)",paddingBottom:"clamp(6px, 1.2vh, 12px)"},children:[e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"4px"},children:e.jsx("h2",{style:{margin:0,textTransform:"uppercase",letterSpacing:"clamp(2px, 0.8vw, 8px)",color:"rgba(255,255,255,0.5)",fontSize:"clamp(0.75rem, 2vw, 1.5rem)"},children:(b==null?void 0:b.auction_name)||"LIVE AUCTION"})}),e.jsx("div",{onClick:()=>_(),style:{padding:"0.4rem 1.2rem",background:"#ff4444",color:"#fff",fontWeight:"bold",borderRadius:"4px",letterSpacing:"4px",fontSize:"clamp(0.75rem, 1.5vw, 1rem)",animation:"pulse 1.5s infinite",whiteSpace:"nowrap",cursor:"pointer",userSelect:"none"},title:"Click to force sync",children:"LIVE"})]}),b?!a&&!O&&!F?e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"1rem"},children:[e.jsx("div",{style:{position:"relative",width:"250px",height:"160px",marginBottom:"1rem"},children:e.jsxs("svg",{width:"250",height:"160",viewBox:"0 0 250 200",style:{overflow:"visible"},children:[e.jsxs("defs",{children:[e.jsxs("linearGradient",{id:"pitchGrad",x1:"0%",y1:"100%",x2:"0%",y2:"0%",children:[e.jsx("stop",{offset:"0%",stopColor:"#111827",stopOpacity:"0.8"}),e.jsx("stop",{offset:"100%",stopColor:"transparent"})]}),e.jsxs("radialGradient",{id:"glow",cx:"50%",cy:"50%",r:"50%",children:[e.jsx("stop",{offset:"0%",stopColor:"var(--accent-gold)",stopOpacity:"0.3"}),e.jsx("stop",{offset:"100%",stopColor:"transparent"})]})]}),e.jsx("circle",{cx:"125",cy:"100",r:"80",fill:"url(#glow)",style:{animation:"pulseGlow 3s infinite ease-in-out"}}),e.jsx("ellipse",{cx:"125",cy:"145",rx:"100",ry:"12",fill:"url(#pitchGrad)",stroke:"rgba(255,255,255,0.05)",strokeWidth:"1"}),e.jsxs("g",{stroke:"rgba(255,255,255,0.3)",strokeWidth:"3",strokeLinecap:"round",fill:"none",children:[e.jsx("line",{x1:"165",y1:"140",x2:"165",y2:"70"}),e.jsx("line",{x1:"173",y1:"140",x2:"173",y2:"70"}),e.jsx("line",{x1:"181",y1:"140",x2:"181",y2:"70"}),e.jsx("line",{x1:"162",y1:"67",x2:"184",y2:"67",strokeWidth:"2.5",stroke:"var(--accent-gold)"})]}),e.jsxs("g",{className:"batsman-anim",style:{transformOrigin:"70px 140px"},children:[e.jsx("path",{d:"M 60,140 Q 55,105 65,90 T 75,70",fill:"none",stroke:"rgba(255,255,255,0.4)",strokeWidth:"8",strokeLinecap:"round"}),e.jsx("circle",{cx:"75",cy:"60",r:"8",fill:"rgba(255,255,255,0.5)"}),e.jsx("path",{d:"M 60,140 L 52,165",fill:"none",stroke:"rgba(255,255,255,0.4)",strokeWidth:"8",strokeLinecap:"round"}),e.jsx("path",{d:"M 60,140 L 70,165",fill:"none",stroke:"rgba(255,255,255,0.4)",strokeWidth:"8",strokeLinecap:"round"}),e.jsx("path",{d:"M 65,90 Q 85,90 95,95",fill:"none",stroke:"rgba(255,255,255,0.4)",strokeWidth:"6",strokeLinecap:"round"}),e.jsxs("g",{children:[e.jsx("line",{x1:"70",y1:"85",x2:"105",y2:"55",stroke:"#ffd700",strokeWidth:"4",strokeLinecap:"round"}),e.jsx("path",{d:"M 100,60 L 140,25 L 146,30 L 106,65 Z",fill:"var(--accent-gold)",stroke:"rgba(0,0,0,0.2)",strokeWidth:"1"}),e.jsx("animateTransform",{attributeName:"transform",type:"rotate",values:"0 70 85; -35 70 85; 60 70 85; 0 70 85; 0 70 85",keyTimes:"0; 0.3; 0.45; 0.7; 1",dur:"2.5s",repeatCount:"indefinite"})]})]}),e.jsxs("circle",{r:"7",fill:"#ef4444",style:{filter:"drop-shadow(0 0 6px #ef4444)"},children:[e.jsx("animate",{attributeName:"cx",values:"-30; 50; 95; 98; 260",keyTimes:"0; 0.25; 0.45; 0.46; 0.65",dur:"2.5s",repeatCount:"indefinite"}),e.jsx("animate",{attributeName:"cy",values:"60; 125; 85; 80; -40",keyTimes:"0; 0.25; 0.45; 0.46; 0.65",dur:"2.5s",repeatCount:"indefinite"}),e.jsx("animate",{attributeName:"opacity",values:"0; 1; 1; 1; 1; 0; 0",keyTimes:"0; 0.05; 0.25; 0.45; 0.65; 0.75; 1",dur:"2.5s",repeatCount:"indefinite"})]}),e.jsxs("circle",{cx:"95",cy:"85",fill:"none",stroke:"#fff",strokeWidth:"2",children:[e.jsx("animate",{attributeName:"r",values:"1; 1; 18; 1",keyTimes:"0; 0.43; 0.55; 1",dur:"2.5s",repeatCount:"indefinite"}),e.jsx("animate",{attributeName:"opacity",values:"0; 0; 1; 0; 0",keyTimes:"0; 0.43; 0.45; 0.55; 1",dur:"2.5s",repeatCount:"indefinite"})]})]})}),e.jsx("h1",{style:{fontSize:"clamp(1.5rem, 4vw, 3rem)",color:"var(--accent-gold)",margin:0,letterSpacing:"3px",fontWeight:900,textShadow:"0 0 20px rgba(255, 215, 0, 0.4)",textTransform:"uppercase",animation:"pulseText 2s infinite"},children:"Waiting for next turn..."}),e.jsx("p",{style:{color:"rgba(255,255,255,0.4)",fontSize:"1rem",marginTop:"0.5rem",fontStyle:"italic"},children:"Organizers are preparing the next player card"})]}):e.jsxs("div",{style:{display:"grid",gridTemplateColumns:k?"1fr":"1fr 1fr",gap:k?"20px":"clamp(20px, 5vw, 60px)",flex:1,alignItems:k?"start":"center"},children:[e.jsx("div",{style:{display:"flex",flexDirection:"column",alignItems:"center"},children:e.jsxs("div",{style:{position:"relative",display:"inline-block"},children:[(a==null?void 0:a.player_number)!=null&&e.jsxs("div",{style:{position:"absolute",top:"12px",left:"12px",background:"var(--accent-gold)",color:"#000",padding:"clamp(4px, 0.8vh, 8px) clamp(8px, 1.5vw, 16px)",borderRadius:"clamp(4px, 0.8vw, 8px)",fontSize:"clamp(0.8rem, 1.5vw, 1.4rem)",fontWeight:900,zIndex:10,boxShadow:"0 4px 15px rgba(0,0,0,0.5)",border:"2px solid rgba(0,0,0,0.2)"},children:["#",a.player_number]}),(fe=a==null?void 0:a.players)!=null&&fe.photo_url&&!Be?e.jsx("img",{src:B(a.players.photo_url,600),alt:"Player",onError:()=>ae(!0),style:{width:"auto",height:k?"clamp(260px, 75vw, 450px)":"clamp(420px, 68vh, 750px)",maxWidth:"100%",objectFit:"cover",borderRadius:"clamp(12px, 2vw, 30px)",border:"clamp(4px, 0.8vw, 8px) solid #ffd700",boxShadow:"0 0 80px rgba(255,215,0,0.2)",display:"block"}}):e.jsx("div",{style:{width:k?"clamp(260px, 75vw, 450px)":"clamp(420px, 68vh, 750px)",height:k?"clamp(260px, 75vw, 450px)":"clamp(420px, 68vh, 750px)",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg, rgba(255,215,0,0.1), rgba(57,255,20,0.05))",color:"rgba(255,215,0,0.3)",fontSize:k?"clamp(4.5rem, 20vw, 10rem)":"clamp(7rem, 18vh, 20rem)",fontWeight:900,borderRadius:"clamp(12px, 2vw, 30px)",border:"clamp(4px, 0.8vw, 8px) solid #ffd700",boxShadow:"0 0 80px rgba(255,215,0,0.2)"},children:(((me=(he=a==null?void 0:a.players)==null?void 0:he.first_name)==null?void 0:me.charAt(0))||"")+(((ye=(ge=a==null?void 0:a.players)==null?void 0:ge.last_name)==null?void 0:ye.charAt(0))||"")}),e.jsx("div",{style:{position:"absolute",bottom:"clamp(-10px, -1.5vh, -18px)",left:"50%",transform:"translateX(-50%)",background:"#ffd700",color:"#000",padding:"clamp(4px, 1vh, 10px) clamp(12px, 2.5vw, 28px)",borderRadius:"clamp(6px, 1vw, 12px)",fontSize:k?"clamp(0.65rem, 3vw, 1rem)":"clamp(0.7rem, 1.5vw, 1.8rem)",fontWeight:900,boxShadow:"0 8px 30px rgba(0,0,0,0.5)",whiteSpace:"nowrap"},children:(be=(ue=a==null?void 0:a.players)==null?void 0:ue.player_role)==null?void 0:be.toUpperCase()})]})}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",justifyContent:"center",color:"#ffd700",paddingTop:"clamp(10px, 1.5vh, 20px)"},children:[e.jsxs("h1",{style:{fontSize:k?"clamp(1.4rem, 6vw, 2.5rem)":"clamp(1.6rem, 4.5vw, 5rem)",margin:"0 0 clamp(4px, 1vh, 12px) 0",lineHeight:1.2,textShadow:"0 8px 20px rgba(0,0,0,0.5)",wordBreak:"break-word"},children:[(ve=a==null?void 0:a.players)==null?void 0:ve.first_name," ",e.jsx("span",{children:(we=a==null?void 0:a.players)==null?void 0:we.last_name})]}),e.jsxs("div",{style:{fontSize:k?"clamp(0.7rem, 3vw, 1rem)":"clamp(0.75rem, 1.5vw, 1.8rem)",color:"rgba(255,255,255,0.7)",margin:"0 0 clamp(8px, 2vh, 20px) 0",display:"flex",flexDirection:"column",gap:"clamp(4px, 1vh, 8px)"},children:[e.jsxs("div",{style:{display:"flex",gap:"clamp(8px, 1.5vw, 20px)",flexWrap:"wrap"},children:[e.jsx("span",{style:{color:"rgba(255,255,255,0.4)",fontSize:"0.9em"},children:"Batting Style:"}),e.jsx("span",{style:{color:"var(--accent-gold)",fontWeight:600},children:((je=a==null?void 0:a.players)==null?void 0:je.batting_style)||"N/A"}),e.jsx("span",{style:{opacity:.3},children:"|"}),e.jsx("span",{style:{color:"rgba(255,255,255,0.4)",fontSize:"0.9em"},children:"Bowling Style:"}),e.jsx("span",{style:{color:"var(--accent-gold)",fontWeight:600},children:((ke=a==null?void 0:a.players)==null?void 0:ke.bowling_style)||"N/A"})]}),e.jsxs("div",{style:{opacity:.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:["State: ",(Se=a==null?void 0:a.players)==null?void 0:Se.state," | Base: ₹",((b==null?void 0:b.base_price)||0).toLocaleString("en-IN")]})]}),e.jsxs("div",{style:{background:"rgba(255,255,255,0.03)",border:"2px solid rgba(255,215,0,0.2)",padding:"clamp(10px, 2vh, 20px)",borderRadius:"clamp(12px, 2vw, 25px)",boxShadow:"0 15px 40px rgba(0,0,0,0.4)",overflow:"hidden"},children:[e.jsx("div",{style:{fontSize:k?"clamp(0.6rem, 2.5vw, 0.9rem)":"clamp(0.7rem, 1.2vw, 1.4rem)",color:"#ffd700",textTransform:"uppercase",letterSpacing:"4px",marginBottom:"clamp(4px, 0.5vh, 10px)",fontWeight:"bold"},children:"Current Bid"}),(()=>{const r=(a==null?void 0:a.current_bid_price)||(b==null?void 0:b.base_price)||0;return e.jsx("div",{style:{margin:"0 0 clamp(8px, 1.5vh, 20px) 0"},children:e.jsx(Ce,{amount:r,size:k?"lg":"2xl",color:E?"#39ff14":"#fff",subtextColor:"rgba(255,215,0,0.9)",align:"left"})})})(),E?e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"clamp(8px, 1.5vw, 20px)",padding:"clamp(6px, 1.2vh, 12px)",background:"rgba(57,255,20,0.1)",borderRadius:"clamp(8px, 1vw, 15px)",border:"1px solid #39ff14",flexWrap:"wrap"},children:[E.logo_url&&e.jsx("img",{src:E.logo_url,alt:"Team",style:{width:"clamp(28px, 5vw, 70px)",height:"clamp(28px, 5vw, 70px)",objectFit:"contain",flexShrink:0}}),e.jsx("div",{style:{fontSize:k?"clamp(0.9rem, 4vw, 1.4rem)":"clamp(1rem, 2.5vw, 2rem)",fontWeight:"bold",color:"#39ff14"},children:E.team_name})]}):e.jsx("div",{style:{fontSize:k?"clamp(0.9rem, 4vw, 1.4rem)":"clamp(1rem, 2.5vw, 2rem)",fontWeight:"bold",color:"#ff4444",animation:"flash 1s infinite"},children:"OPENING BID..."})]})]})]}):e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",maxWidth:"800px",margin:"0 auto",width:"100%",padding:"2rem 1rem"},children:[e.jsxs("div",{style:{background:"rgba(255, 255, 255, 0.03)",border:"1px solid rgba(255, 215, 0, 0.2)",borderRadius:"16px",padding:"3rem 2rem",textAlign:"center",width:"100%",boxShadow:"0 15px 40px rgba(0, 0, 0, 0.5)",marginBottom:"2rem"},children:[e.jsx("h1",{style:{color:"#ffd700",fontFamily:"var(--font-heading)",fontSize:"clamp(1.5rem, 4vw, 2.5rem)",margin:"0 0 1rem 0",letterSpacing:"2px",textTransform:"uppercase"},children:"Select Live Projector"}),e.jsx("p",{style:{color:"rgba(255, 255, 255, 0.6)",margin:0,fontSize:"clamp(0.9rem, 1.5vw, 1.1rem)"},children:"Choose an ongoing tournament to launch the real-time live auction projector screen."})]}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:"1.5rem",width:"100%"},children:H.length===0?e.jsx("div",{style:{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"12px",padding:"3rem",gridColumn:"1 / -1",textAlign:"center"},children:e.jsx("p",{style:{color:"rgba(255,255,255,0.4)",margin:0},children:"No active tournaments found."})}):H.map(r=>e.jsxs(Ze,{to:`/live-auction-projector?code=${r.auction_code}`,style:{background:"rgba(255, 255, 255, 0.03)",border:"1px solid rgba(255, 255, 255, 0.08)",borderRadius:"12px",padding:"1.5rem",textDecoration:"none",color:"inherit",display:"flex",flexDirection:"column",gap:"1rem",transition:"transform 0.2s, border-color 0.2s, box-shadow 0.2s",cursor:"pointer"},className:"projector-card-hover",onMouseEnter:t=>{t.currentTarget.style.transform="translateY(-5px)",t.currentTarget.style.borderColor="#ffd700",t.currentTarget.style.boxShadow="0 10px 20px rgba(255, 215, 0, 0.1)"},onMouseLeave:t=>{t.currentTarget.style.transform="translateY(0)",t.currentTarget.style.borderColor="rgba(255, 255, 255, 0.08)",t.currentTarget.style.boxShadow="none"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsx("span",{style:{padding:"0.2rem 0.6rem",borderRadius:"4px",fontSize:"0.7rem",fontWeight:"bold",textTransform:"uppercase",background:r.status==="running"?"rgba(239, 68, 68, 0.15)":r.status==="registration_open"?"rgba(57, 255, 20, 0.15)":"rgba(255,255,255,0.06)",color:r.status==="running"?"#f87171":r.status==="registration_open"?"#39ff14":"rgba(255,255,255,0.4)"},children:r.status==="running"?"🔴 Live":r.status==="registration_open"?"🟢 Open":"⚪ Ended"}),e.jsx("span",{style:{fontSize:"0.75rem",color:"#ffd700",fontWeight:"bold"},children:r.auction_code})]}),e.jsx("h3",{style:{margin:0,fontSize:"1.2rem",color:"#fff"},children:r.auction_name}),e.jsx("div",{style:{fontSize:"0.8rem",color:"rgba(255,255,255,0.6)"},children:r.venue?`📍 ${r.venue}`:""}),e.jsx("div",{style:{display:"flex",justifyContent:"flex-end",marginTop:"auto",color:"#39ff14",fontWeight:"bold",fontSize:"0.85rem",alignItems:"center",gap:"0.25rem"},children:"Launch Projector →"})]},r.id))})]}),b&&W&&W.length>0&&e.jsxs("div",{style:{marginTop:"auto",paddingTop:"clamp(8px, 1.2vh, 16px)",borderTop:"1.5px solid rgba(255, 255, 255, 0.08)",width:"100%",textAlign:"center",zIndex:2,overflow:"hidden"},children:[e.jsx("div",{onClick:()=>_(!0),style:{fontSize:"clamp(0.6rem, 1.2vw, 0.8rem)",textTransform:"uppercase",letterSpacing:"3px",color:"var(--accent-gold)",marginBottom:"clamp(6px, 1vh, 12px)",fontWeight:"bold",opacity:.8,cursor:"pointer",display:"inline-block",userSelect:"none"},title:"Click to reload sponsors",children:"Tournament Sponsors 🔄"}),e.jsx("div",{style:{overflow:"hidden",width:"100%",display:"flex",maskImage:"linear-gradient(to right, transparent, white 15%, white 85%, transparent)",WebkitMaskImage:"linear-gradient(to right, transparent, white 15%, white 85%, transparent)"},children:e.jsx("div",{style:{display:"flex",gap:"clamp(15px, 2.5vw, 35px)",animation:"marquee 25s linear infinite",whiteSpace:"nowrap",width:"max-content",padding:"4px 0"},children:(W.length<4?[...W,...W,...W,...W]:[...W,...W]).map((r,t)=>e.jsxs("div",{style:{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:"4px",background:"rgba(255, 255, 255, 0.03)",padding:"8px 16px",borderRadius:"10px",border:"1px solid rgba(255, 255, 255, 0.08)",boxShadow:"0 4px 10px rgba(0, 0, 0, 0.3)",textAlign:"center",flexShrink:0},children:[e.jsx("span",{style:{fontSize:"clamp(0.8rem, 1.2vw, 1rem)",color:"rgba(255,255,255,0.95)",fontWeight:"bold",textShadow:"0 2px 4px rgba(0,0,0,0.5)"},children:r.name}),r.photo_url?e.jsx("img",{src:B(r.photo_url,300),alt:r.name,style:{height:"clamp(60px, 8.5vh, 95px)",width:"clamp(120px, 15vw, 200px)",objectFit:"contain",borderRadius:"6px"}}):e.jsx("div",{style:{height:"clamp(60px, 8.5vh, 95px)",width:"clamp(120px, 15vw, 200px)",background:"rgba(255,255,255,0.05)",borderRadius:"6px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.8rem",color:"rgba(255,255,255,0.4)"},children:"NO LOGO"})]},`${r.id}-${t}`))})})]})]}),O&&m&&e.jsxs("div",{style:{position:"fixed",top:0,left:0,width:"100%",height:"100%",background:"radial-gradient(circle at center, rgba(16,24,39,0.98) 0%, #050a10 100%)",zIndex:1e3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"fadeIn 0.8s cubic-bezier(0.19,1,0.22,1)",border:"clamp(6px, 1.5vw, 15px) solid #ffd700",overflowY:"hidden",padding:"clamp(10px, 2vh, 24px)",boxSizing:"border-box"},children:[e.jsx("canvas",{id:"sold-canvas",style:{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:1}}),e.jsxs("div",{className:"sold-details-container",children:[e.jsx("div",{style:{fontSize:"clamp(1rem, 2.8vh, 2.2rem)",color:"#fff",textTransform:"uppercase",letterSpacing:"clamp(2px, 1vw, 12px)",marginBottom:"clamp(2px, 0.5vh, 8px)",position:"relative",zIndex:2,animation:"slideUp 1s ease-out",textAlign:"center"},children:"Congratulations!"}),e.jsx("div",{style:{fontSize:"clamp(2.5rem, 9vh, 6.5rem)",fontWeight:900,color:"#ffd700",textShadow:"0 0 30px rgba(255,215,0,0.5)",transform:"rotate(-3deg)",marginBottom:"clamp(8px, 1.5vh, 20px)",position:"relative",zIndex:2,animation:"bounceIn 1.2s cubic-bezier(0.36,0,0.66,-0.56) both",textAlign:"center",width:"100%"},children:"SOLD!"}),e.jsxs("div",{style:{display:"flex",flexDirection:o?"column":"row",alignItems:"center",justifyContent:"center",gap:"clamp(16px, 3vw, 40px)",width:"100%",maxWidth:"1200px",zIndex:2,animation:"scaleUp 1s 0.3s both"},children:[e.jsx("div",{style:{display:"flex",flexDirection:o?"column":"row",alignItems:"center",gap:"clamp(15px, 2.5vw, 30px)",flexShrink:0},children:e.jsx("div",{className:"cricket-anim-sold-static-container",style:{width:"clamp(180px, 25vh, 300px)",height:"clamp(180px, 25vh, 300px)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:e.jsxs("svg",{width:"100%",height:"100%",viewBox:"0 0 400 400",style:{pointerEvents:"none"},children:[e.jsxs("defs",{children:[e.jsxs("linearGradient",{id:"batWood",x1:"0%",y1:"0%",x2:"100%",y2:"0%",children:[e.jsx("stop",{offset:"0%",stopColor:"#d97706"}),e.jsx("stop",{offset:"50%",stopColor:"#b45309"}),e.jsx("stop",{offset:"100%",stopColor:"#78350f"})]}),e.jsxs("linearGradient",{id:"batGrip",x1:"0%",y1:"0%",x2:"100%",y2:"0%",children:[e.jsx("stop",{offset:"0%",stopColor:"#ffd700"}),e.jsx("stop",{offset:"100%",stopColor:"#b45309"})]}),e.jsxs("radialGradient",{id:"ballShade",cx:"30%",cy:"30%",r:"70%",children:[e.jsx("stop",{offset:"0%",stopColor:"#ff6b6b"}),e.jsx("stop",{offset:"70%",stopColor:"#b91c1c"}),e.jsx("stop",{offset:"100%",stopColor:"#450a0a"})]})]}),e.jsx("circle",{className:"anim-shockwave",cx:"200",cy:"200",r:"1",fill:"none",stroke:"#ffd700",strokeWidth:"4"}),e.jsx("g",{className:"anim-sparks",style:{transformOrigin:"200px 200px"},children:e.jsx("path",{d:"M200,160 L200,130 M200,240 L200,270 M160,200 L130,200 M240,200 L270,200 M170,170 L150,150 M230,230 L250,250 M170,230 L150,250 M230,170 L250,150",stroke:"#ffd700",strokeWidth:"6",strokeLinecap:"round"})}),e.jsxs("g",{className:"dancing-player-body",style:{transformOrigin:"200px 220px"},children:[e.jsx("path",{d:"M 188,220 Q 175,250 170,270",fill:"none",stroke:"#1e3a8a",strokeWidth:"10",strokeLinecap:"round",className:"dancing-leg-left",style:{transformOrigin:"188px 220px"}}),e.jsx("ellipse",{cx:"166",cy:"272",rx:"8",ry:"5",fill:"#fff"}),e.jsx("path",{d:"M 212,220 Q 225,250 230,270",fill:"none",stroke:"#1e3a8a",strokeWidth:"10",strokeLinecap:"round",className:"dancing-leg-right",style:{transformOrigin:"212px 220px"}}),e.jsx("ellipse",{cx:"234",cy:"272",rx:"8",ry:"5",fill:"#fff"}),e.jsx("path",{d:"M 180,165 L 220,165 L 215,225 L 185,225 Z",fill:"#ffd700",stroke:"#ffd700",strokeWidth:"2"}),e.jsx("path",{d:"M 180,175 L 217,200 L 215,210 L 182,185 Z",fill:"#1e3a8a"}),e.jsx("text",{x:"200",y:"205",fill:"#fff",fontSize:"16",fontWeight:"bold",textAnchor:"middle",children:"7"}),e.jsx("path",{d:"M 180,175 Q 150,160 140,185",fill:"none",stroke:"#ffd700",strokeWidth:"8",strokeLinecap:"round"}),e.jsx("circle",{cx:"138",cy:"188",r:"6",fill:"#fff"}),e.jsx("path",{d:"M 220,175 Q 250,175 260,195",fill:"none",stroke:"#ffd700",strokeWidth:"8",strokeLinecap:"round"}),e.jsx("circle",{cx:"262",cy:"198",r:"6",fill:"#fff"}),e.jsxs("g",{className:"celebrating-bat",style:{transformOrigin:"262px 198px"},children:[e.jsx("rect",{x:"259",y:"168",width:"6",height:"30",rx:"2",fill:"url(#batGrip)"}),e.jsx("path",{d:"M 254,88 L 270,88 L 274,168 C 274,172 270,175 262,175 C 254,175 250,172 250,168 Z",fill:"url(#batWood)"}),e.jsx("rect",{x:"252",y:"110",width:"20",height:"35",fill:"#ffd700",opacity:"0.8"})]}),e.jsx("rect",{x:"195",y:"158",width:"10",height:"10",fill:"#ffedd5"}),e.jsx("circle",{cx:"200",cy:"146",r:"16",fill:"#ffedd5"}),e.jsx("circle",{cx:"194",cy:"144",r:"2",fill:"#000"}),e.jsx("circle",{cx:"206",cy:"144",r:"2",fill:"#000"}),e.jsx("path",{d:"M 193,151 Q 200,158 207,151",fill:"none",stroke:"#b91c1c",strokeWidth:"2",strokeLinecap:"round"}),e.jsx("path",{d:"M 182,142 A 18,18 0 0,1 218,142 Z",fill:"#1e3a8a"}),e.jsx("path",{d:"M 215,142 L 230,145 L 230,149 L 215,148 Z",fill:"#ffd700"})]}),e.jsxs("g",{className:"confetti-group",style:{transformOrigin:"200px 200px"},children:[e.jsx("circle",{cx:"120",cy:"150",r:"4",fill:"#ff0"}),e.jsx("circle",{cx:"280",cy:"150",r:"4",fill:"#0ff"}),e.jsx("circle",{cx:"150",cy:"100",r:"3",fill:"#f0f"}),e.jsx("circle",{cx:"250",cy:"100",r:"3",fill:"#ff0"}),e.jsx("circle",{cx:"100",cy:"220",r:"5",fill:"#39ff14"}),e.jsx("circle",{cx:"300",cy:"220",r:"5",fill:"#ff4444"})]})]})})}),e.jsxs("div",{style:{display:"flex",flexDirection:o?"column":"row",alignItems:"center",gap:o?"16px":"clamp(16px, 3vw, 40px)",textAlign:o?"center":"left",background:"rgba(255,255,255,0.05)",padding:o?"16px 12px":"clamp(12px, 2vh, 32px)",borderRadius:"clamp(12px, 2vw, 30px)",border:"2px solid rgba(255,215,0,0.4)",boxShadow:"0 25px 50px rgba(0,0,0,0.5)",maxWidth:"100%",flex:1},children:[e.jsxs("div",{style:{position:"relative"},children:[(m==null?void 0:m.player_number)!=null&&e.jsxs("div",{style:{position:"absolute",top:"-8px",left:"-8px",background:"var(--accent-gold)",color:"#000",padding:"clamp(3px, 0.6vh, 6px) clamp(8px, 1.2vw, 14px)",borderRadius:"50px",fontSize:"clamp(0.7rem, 1vw, 1.1rem)",fontWeight:900,zIndex:10,boxShadow:"0 4px 12px rgba(0,0,0,0.5)",border:"2px solid #fff"},children:["#",m.player_number]}),m.players.photo_url&&!Ae?e.jsx("img",{src:B(m.players.photo_url,400),alt:"Sold",onError:()=>ie(!0),style:{width:o?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",height:o?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",borderRadius:"50%",border:"clamp(3px, 0.6vw, 8px) solid #39ff14",objectFit:"cover",boxShadow:"0 0 40px rgba(57,255,20,0.3)",flexShrink:0}}):e.jsx("div",{style:{width:o?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",height:o?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",borderRadius:"50%",border:"clamp(3px, 0.6vw, 8px) solid #39ff14",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg, rgba(57,255,20,0.1), rgba(255,255,255,0.05))",color:"rgba(57,255,20,0.3)",fontSize:o?"clamp(1.5rem, 5vh, 2.5rem)":"clamp(2.5rem, 7vh, 4.5rem)",fontWeight:900,boxShadow:"0 0 40px rgba(57,255,20,0.3)",flexShrink:0},children:(((ze=m.players.first_name)==null?void 0:ze.charAt(0))||"")+(((Ie=m.players.last_name)==null?void 0:Ie.charAt(0))||"")})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"clamp(4px, 0.8vh, 12px)",minWidth:0},children:[e.jsxs("div",{style:{fontSize:o?"clamp(1.1rem, 3.8vh, 1.6rem)":"clamp(1.3rem, 4.5vh, 2.8rem)",fontWeight:"bold",color:"#fff",wordBreak:"break-word"},children:[m.players.first_name," ",m.players.last_name]}),e.jsx("div",{style:{margin:"0.5rem 0"},children:e.jsx(Ce,{amount:m.sold_price||0,size:o?"lg":"xl",color:"#ffd700",subtextColor:"rgba(255,255,255,0.8)",align:"left"})}),e.jsxs("div",{style:{fontSize:o?"clamp(0.7rem, 2.2vh, 0.9rem)":"clamp(0.8rem, 2.5vh, 1.4rem)",color:"rgba(255,255,255,0.6)",display:"flex",flexWrap:"wrap",alignItems:"center",gap:"clamp(8px, 1.5vw, 20px)",marginBottom:"clamp(4px, 1vh, 12px)"},children:[e.jsx("span",{style:{opacity:.5},children:"Batting:"}),e.jsx("span",{children:m.players.batting_style}),e.jsx("span",{style:{opacity:.3},children:"|"}),e.jsx("span",{style:{opacity:.5},children:"Bowling:"}),e.jsx("span",{children:m.players.bowling_style})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:o?"center":"flex-start",gap:"clamp(8px, 1vw, 16px)",flexWrap:"wrap"},children:[(C==null?void 0:C.logo_url)&&e.jsx("img",{src:C.logo_url,alt:"Team",style:{width:o?"clamp(20px, 4vh, 32px)":"clamp(30px, 6vh, 50px)",height:o?"clamp(20px, 4vh, 32px)":"clamp(30px, 6vh, 50px)",objectFit:"contain"}}),e.jsx("div",{style:{fontSize:o?"clamp(1rem, 3.5vh, 1.5rem)":"clamp(1.2rem, 4vh, 2.4rem)",fontWeight:900,color:"#39ff14",wordBreak:"break-word"},children:C==null?void 0:C.team_name})]})]})]})]})]})]}),F&&j&&e.jsxs("div",{style:{position:"fixed",top:0,left:0,width:"100%",height:"100%",background:"radial-gradient(circle at center, rgba(31,41,55,0.98) 0%, #050a10 100%)",zIndex:1e3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"fadeIn 0.8s cubic-bezier(0.19,1,0.22,1)",border:"clamp(6px, 1.5vw, 15px) solid #ff4444",overflowY:"hidden",padding:"clamp(10px, 2vh, 24px)",boxSizing:"border-box"},children:[e.jsx("canvas",{id:"unsold-canvas",style:{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:1}}),e.jsxs("div",{className:"unsold-details-container",style:{position:"relative",zIndex:2},children:[e.jsx("div",{style:{fontSize:"clamp(1rem, 2.8vh, 2.2rem)",color:"#fff",textTransform:"uppercase",letterSpacing:"clamp(2px, 1vw, 12px)",marginBottom:"clamp(2px, 0.5vh, 8px)",position:"relative",zIndex:2,animation:"slideUp 1s ease-out",textAlign:"center"},children:"Better Luck Next Time!"}),e.jsx("div",{style:{fontSize:"clamp(2.5rem, 9vh, 6.5rem)",fontWeight:900,color:"#ff4444",textShadow:"0 0 30px rgba(255,68,68,0.5)",transform:"rotate(-3deg)",marginBottom:"clamp(8px, 1.5vh, 20px)",position:"relative",zIndex:2,animation:"bounceIn 1.2s cubic-bezier(0.36,0,0.66,-0.56) both",textAlign:"center",width:"100%"},children:"UNSOLD"}),e.jsxs("div",{style:{display:"flex",flexDirection:o?"column":"row",alignItems:"center",justifyContent:"center",gap:"clamp(16px, 3vw, 40px)",width:"100%",maxWidth:"1200px",zIndex:2,animation:"scaleUp 1s 0.3s both"},children:[e.jsx("div",{style:{display:"flex",flexDirection:o?"column":"row",alignItems:"center",gap:"clamp(15px, 2.5vw, 30px)",flexShrink:0},children:e.jsx("div",{className:"cricket-anim-unsold-static-container",style:{width:"clamp(180px, 25vh, 300px)",height:"clamp(180px, 25vh, 300px)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:e.jsxs("svg",{width:"100%",height:"100%",viewBox:"0 0 400 400",style:{pointerEvents:"none"},children:[e.jsxs("defs",{children:[e.jsxs("linearGradient",{id:"stumpWood",x1:"0%",y1:"0%",x2:"100%",y2:"0%",children:[e.jsx("stop",{offset:"0%",stopColor:"#cd853f"}),e.jsx("stop",{offset:"50%",stopColor:"#8b5a2b"}),e.jsx("stop",{offset:"100%",stopColor:"#5c3a21"})]}),e.jsxs("linearGradient",{id:"batWood",x1:"0%",y1:"0%",x2:"100%",y2:"0%",children:[e.jsx("stop",{offset:"0%",stopColor:"#d97706"}),e.jsx("stop",{offset:"50%",stopColor:"#b45309"}),e.jsx("stop",{offset:"100%",stopColor:"#78350f"})]}),e.jsxs("linearGradient",{id:"batGrip",x1:"0%",y1:"0%",x2:"100%",y2:"0%",children:[e.jsx("stop",{offset:"0%",stopColor:"#ffd700"}),e.jsx("stop",{offset:"100%",stopColor:"#b45309"})]}),e.jsxs("radialGradient",{id:"redBallShade",cx:"30%",cy:"30%",r:"70%",children:[e.jsx("stop",{offset:"0%",stopColor:"#ff4d4d"}),e.jsx("stop",{offset:"70%",stopColor:"#990000"}),e.jsx("stop",{offset:"100%",stopColor:"#3d0000"})]})]}),e.jsx("circle",{className:"anim-unsold-shockwave",cx:"200",cy:"180",r:"1",fill:"none",stroke:"#ff4444",strokeWidth:"4"}),e.jsx("g",{className:"anim-stump-left",style:{transformOrigin:"175px 260px"},children:e.jsx("rect",{x:"171",y:"160",width:"8",height:"100",rx:"3",fill:"url(#stumpWood)"})}),e.jsx("g",{className:"anim-stump-mid",style:{transformOrigin:"200px 260px"},children:e.jsx("rect",{x:"196",y:"160",width:"8",height:"100",rx:"3",fill:"url(#stumpWood)"})}),e.jsx("g",{className:"anim-stump-right",style:{transformOrigin:"225px 260px"},children:e.jsx("rect",{x:"221",y:"160",width:"8",height:"100",rx:"3",fill:"url(#stumpWood)"})}),e.jsx("g",{className:"anim-bail-left",style:{transformOrigin:"185px 156px"},children:e.jsx("rect",{x:"170",y:"154",width:"28",height:"6",rx:"2",fill:"url(#stumpWood)"})}),e.jsx("g",{className:"anim-bail-right",style:{transformOrigin:"215px 156px"},children:e.jsx("rect",{x:"202",y:"154",width:"28",height:"6",rx:"2",fill:"url(#stumpWood)"})}),e.jsxs("g",{className:"anim-unsold-ball",children:[e.jsx("circle",{cx:"0",cy:"0",r:"14",fill:"url(#redBallShade)"}),e.jsx("path",{d:"M -14,0 A 14,14 0 0,0 14,0",fill:"none",stroke:"#fff",strokeWidth:"1.5",strokeDasharray:"2,2"})]}),e.jsxs("g",{className:"sad-cricketer-walk",style:{transformOrigin:"200px 220px"},children:[e.jsx("path",{d:"M 188,220 Q 175,250 170,270",fill:"none",stroke:"#475569",strokeWidth:"10",strokeLinecap:"round",className:"sad-leg-left",style:{transformOrigin:"188px 220px"}}),e.jsx("ellipse",{cx:"166",cy:"272",rx:"8",ry:"5",fill:"#fff"}),e.jsx("path",{d:"M 212,220 Q 225,250 230,270",fill:"none",stroke:"#475569",strokeWidth:"10",strokeLinecap:"round",className:"sad-leg-right",style:{transformOrigin:"212px 220px"}}),e.jsx("ellipse",{cx:"234",cy:"272",rx:"8",ry:"5",fill:"#fff"}),e.jsx("path",{d:"M 180,165 L 220,165 L 215,225 L 185,225 Z",fill:"#64748b",stroke:"#64748b",strokeWidth:"2"}),e.jsx("path",{d:"M 180,175 L 217,200 L 215,210 L 182,185 Z",fill:"#334155"}),e.jsx("text",{x:"200",y:"205",fill:"#fff",fontSize:"16",fontWeight:"bold",textAnchor:"middle",children:"0"}),e.jsx("path",{d:"M 180,175 Q 165,155 180,148",fill:"none",stroke:"#64748b",strokeWidth:"8",strokeLinecap:"round"}),e.jsx("circle",{cx:"180",cy:"148",r:"6",fill:"#fff"}),e.jsx("path",{d:"M 220,175 Q 235,210 240,220",fill:"none",stroke:"#64748b",strokeWidth:"8",strokeLinecap:"round"}),e.jsx("circle",{cx:"240",cy:"220",r:"6",fill:"#fff"}),e.jsxs("g",{style:{transformOrigin:"240px 220px",transform:"rotate(25deg)"},children:[e.jsx("rect",{x:"237",y:"190",width:"6",height:"30",rx:"2",fill:"url(#batGrip)"}),e.jsx("path",{d:"M 232,220 L 248,220 L 252,295 C 252,299 248,302 240,302 C 232,302 228,299 228,295 Z",fill:"url(#batWood)"})]}),e.jsx("rect",{x:"195",y:"158",width:"10",height:"10",fill:"#ffedd5"}),e.jsx("circle",{cx:"200",cy:"146",r:"16",fill:"#ffedd5"}),e.jsx("path",{d:"M 192,143 Q 195,145 198,143",fill:"none",stroke:"#000",strokeWidth:"1.5",strokeLinecap:"round"}),e.jsx("path",{d:"M 202,143 Q 205,145 208,143",fill:"none",stroke:"#000",strokeWidth:"1.5",strokeLinecap:"round"}),e.jsx("path",{d:"M 193,154 Q 200,148 207,154",fill:"none",stroke:"#b91c1c",strokeWidth:"2.5",strokeLinecap:"round"}),e.jsx("path",{d:"M 194,146 L 194,158",fill:"none",stroke:"#3b82f6",strokeWidth:"2.5",strokeLinecap:"round",strokeDasharray:"3,3",strokeDashoffset:"0",className:"sad-tears"}),e.jsx("path",{d:"M 206,146 L 206,158",fill:"none",stroke:"#3b82f6",strokeWidth:"2.5",strokeLinecap:"round",strokeDasharray:"3,3",strokeDashoffset:"0",className:"sad-tears"}),e.jsx("path",{d:"M 182,142 A 18,18 0 0,1 218,142 Z",fill:"#334155"}),e.jsx("path",{d:"M 215,142 L 230,145 L 230,149 L 215,148 Z",fill:"#94a3b8"})]})]})})}),e.jsxs("div",{style:{display:"flex",flexDirection:o?"column":"row",alignItems:"center",gap:o?"16px":"clamp(16px, 3vw, 40px)",textAlign:o?"center":"left",background:"rgba(255,255,255,0.05)",padding:o?"16px 12px":"clamp(12px, 2vh, 32px)",borderRadius:"clamp(12px, 2vw, 30px)",border:"2px solid rgba(255,68,68,0.4)",boxShadow:"0 25px 50px rgba(0,0,0,0.5)",maxWidth:"100%",flex:1},children:[e.jsxs("div",{style:{position:"relative"},children:[(j==null?void 0:j.player_number)!=null&&e.jsxs("div",{style:{position:"absolute",top:"-8px",left:"-8px",background:"#ff4444",color:"#fff",padding:"clamp(3px, 0.6vh, 6px) clamp(8px, 1.2vw, 14px)",borderRadius:"50px",fontSize:"clamp(0.7rem, 1vw, 1.1rem)",fontWeight:900,zIndex:10,boxShadow:"0 4px 12px rgba(0,0,0,0.5)",border:"2px solid #fff"},children:["#",j.player_number]}),j.players.photo_url&&!Oe?e.jsx("img",{src:B(j.players.photo_url,400),alt:"Unsold",onError:()=>se(!0),style:{width:o?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",height:o?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",borderRadius:"50%",border:"clamp(3px, 0.6vw, 8px) solid #94a3b8",objectFit:"cover",boxShadow:"0 0 40px rgba(148,163,184,0.2)",flexShrink:0,filter:"grayscale(0.5)"}}):e.jsx("div",{style:{width:o?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",height:o?"clamp(80px, 18vh, 120px)":"clamp(120px, 22vh, 220px)",borderRadius:"50%",border:"clamp(3px, 0.6vw, 8px) solid #94a3b8",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg, rgba(255,68,68,0.1), rgba(255,255,255,0.05))",color:"rgba(255,68,68,0.3)",fontSize:o?"clamp(1.5rem, 5vh, 2.5rem)":"clamp(2.5rem, 7vh, 4.5rem)",fontWeight:900,boxShadow:"0 0 40px rgba(255,68,68,0.1)",flexShrink:0},children:(((_e=j.players.first_name)==null?void 0:_e.charAt(0))||"")+(((We=j.players.last_name)==null?void 0:We.charAt(0))||"")})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"clamp(4px, 0.8vh, 12px)",minWidth:0},children:[e.jsxs("div",{style:{fontSize:o?"clamp(1.2rem, 4vh, 1.8rem)":"clamp(1.4rem, 4.5vh, 2.8rem)",fontWeight:"bold",color:"#fff",wordBreak:"break-word"},children:[j.players.first_name," ",j.players.last_name]}),e.jsxs("div",{style:{fontSize:o?"clamp(0.8rem, 2.5vh, 1rem)":"clamp(0.9rem, 2.8vh, 1.5rem)",color:"rgba(255,255,255,0.7)",display:"flex",flexWrap:"wrap",alignItems:"center",gap:"clamp(10px, 2vw, 30px)"},children:[e.jsx("span",{style:{background:"rgba(255,255,255,0.1)",padding:"4px 12px",borderRadius:"4px"},children:j.players.player_role}),e.jsx("span",{style:{opacity:.5},children:"|"}),e.jsxs("span",{style:{color:"#ff4444"},children:["BASE: ₹ ",(Le=b==null?void 0:b.base_price)==null?void 0:Le.toLocaleString()]})]}),e.jsx("div",{style:{fontSize:o?"clamp(0.7rem, 2.2vh, 0.9rem)":"clamp(0.8rem, 2.5vh, 1.2rem)",color:"rgba(255,255,255,0.5)",fontStyle:"italic",marginTop:"10px"},children:"This player may come back for accelerated auction."})]})]})]})]})]}),Fe&&e.jsxs("div",{style:{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",zIndex:99999,background:"radial-gradient(circle at center, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.99))",backdropFilter:"blur(20px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2rem",color:"#fff",animation:"fadeIn 0.3s ease-out"},children:[e.jsxs("div",{style:{fontSize:"clamp(1.2rem, 2.5vw, 2.2rem)",fontWeight:900,color:"var(--accent-gold)",letterSpacing:"4px",textTransform:"uppercase",marginBottom:"1.5rem",animation:"pulseText 1s infinite alternate"},children:["🎰 ",(b==null?void 0:b.auction_name)||"CRICKET LEAGUE"," - RANDOM PLAYER DRAW"]}),e.jsxs("div",{style:{background:"rgba(0,0,0,0.6)",border:"4px solid var(--accent-gold)",borderRadius:"30px",padding:"2.5rem 5rem",boxShadow:"0 0 80px rgba(255,215,0,0.5)",marginBottom:"2rem",display:"flex",flexDirection:"column",alignItems:"center",minWidth:"400px"},children:[e.jsx("div",{style:{fontSize:"clamp(6rem, 18vw, 14rem)",fontWeight:900,color:M?"var(--accent-gold)":"#39ff14",fontFamily:"var(--font-heading)",lineHeight:1,textShadow:M?"0 0 40px rgba(255,215,0,0.8)":"0 0 60px rgba(57,255,20,0.9)",animation:M?"pulse 0.15s infinite":"bounceIn 0.5s ease-out"},children:Ue}),e.jsx("div",{style:{fontSize:"clamp(1.1rem, 2.2vw, 1.8rem)",color:M?"var(--text-muted)":"var(--accent-gold)",fontWeight:"bold",marginTop:"1rem",letterSpacing:"2px"},children:M?"GENERATING RANDOM PLAYER NUMBER...":"🎉 DRAWN AUCTION PLAYER!"})]}),!M&&oe&&e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"2rem",background:"rgba(255,255,255,0.08)",border:"2px solid rgba(255,215,0,0.5)",padding:"1.5rem 3.5rem",borderRadius:"20px",animation:"cardFadeInFromBelow 0.6s ease-out both",boxShadow:"0 20px 50px rgba(0,0,0,0.7)",maxWidth:"850px"},children:[ce&&e.jsx("img",{src:B(ce,300),alt:"Player",style:{width:"130px",height:"130px",borderRadius:"16px",border:"3px solid var(--accent-gold)",objectFit:"cover",boxShadow:"0 0 25px rgba(255,215,0,0.4)"}}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:"1rem",color:"var(--accent-green)",fontWeight:"bold",letterSpacing:"2px"},children:"STARTING AUCTION NOW:"}),e.jsx("div",{style:{fontSize:"2.8rem",fontWeight:900,color:"#fff",textTransform:"uppercase"},children:oe})]})]})]}),e.jsx("style",{children:`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @keyframes pulse {
                    0%   { transform: scale(1); opacity: 1; }
                    50%  { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes flash {
                    0%, 100% { opacity: 1; }
                    50%      { opacity: 0.3; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(1.05); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes explode {
                    0%   { transform: scale(1); opacity: 1; }
                    100% { transform: scale(30); opacity: 0; }
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to   { transform: translateY(0); opacity: 1; }
                }
                @keyframes goldGlowPulse {
                    0%, 100% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.4); }
                    50%      { box-shadow: 0 0 45px rgba(255, 215, 0, 0.45); border-color: rgba(255, 215, 0, 0.9); }
                }
                @keyframes bounceIn {
                    0%   { transform: scale(0.3) rotate(-10deg); opacity: 0; }
                    50%  { transform: scale(1.1) rotate(20deg); opacity: 1; }
                    70%  { transform: scale(0.9) rotate(-5deg); }
                    100% { transform: scale(1) rotate(-3deg); }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.8); opacity: 0; }
                    to   { transform: scale(1); opacity: 1; }
                }
                .fw-0  { top: 20%; left: 20%; background: #ff0;    animation: explode 2.0s infinite; }
                .fw-1  { top: 70%; left: 10%; background: #f0f;    animation: explode 2.5s infinite 0.5s; }
                .fw-2  { top: 10%; left: 80%; background: #0ff;    animation: explode 2.2s infinite 1.0s; }
                .fw-3  { top: 80%; left: 85%; background: #39ff14; animation: explode 2.8s infinite 0.2s; }
                .fw-4  { top: 40%; left: 50%; background: #ff4444; animation: explode 2.4s infinite 0.7s; }
                .fw-5  { top: 15%; left: 45%; background: #fff;    animation: explode 2.1s infinite 1.2s; }
                .fw-6  { top: 85%; left: 30%; background: #ffd700; animation: explode 2.6s infinite 0.8s; }
                .fw-7  { top: 50%; left: 15%; background: #007bff; animation: explode 2.3s infinite 0.4s; }
                .fw-8  { top: 30%; left: 75%; background: #ff8c00; animation: explode 2.7s infinite 0.9s; }
                .fw-9  { top: 60%; left: 90%; background: #9400d3; animation: explode 2.5s infinite 0.1s; }
                .fw-10 { top:  5%; left:  5%; background: #adff2f; animation: explode 2.9s infinite 1.1s; }
                .fw-11 { top: 90%; left: 60%; background: #00ffff; animation: explode 2.4s infinite 0.6s; }

                /* Cricket SOLD cinematic animations */
                .cricket-anim-sold-wrapper {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 400px;
                    height: 400px;
                    z-index: 1005;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIntroCinematic 2.0s ease-out both;
                }

                @keyframes fadeIntroCinematic {
                    0% { opacity: 1; visibility: visible; }
                    85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); visibility: hidden; }
                }

                /* Dancing player animations */
                .dancing-player-body {
                    animation: playerDance 0.8s ease-in-out infinite alternate;
                }

                @keyframes playerDance {
                    0% { transform: translateY(10px) scale(0.98) rotate(-3deg); }
                    100% { transform: translateY(-15px) scale(1.02) rotate(3deg); }
                }

                .celebrating-bat {
                    animation: spinBat 0.6s linear infinite;
                }

                @keyframes spinBat {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .dancing-leg-left {
                    animation: legDanceLeft 0.8s ease-in-out infinite alternate;
                }

                @keyframes legDanceLeft {
                    0% { transform: rotate(-10deg); }
                    100% { transform: rotate(15deg); }
                }

                .dancing-leg-right {
                    animation: legDanceRight 0.8s ease-in-out infinite alternate;
                }

                @keyframes legDanceRight {
                    0% { transform: rotate(10deg); }
                    100% { transform: rotate(-15deg); }
                }

                .confetti-group {
                    animation: confettiExplode 2.0s ease-out infinite;
                }

                @keyframes confettiExplode {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(1.6); opacity: 0; }
                }

                .anim-bat-group {
                    animation: batSwing 1.8s cubic-bezier(0.25, 1, 0.5, 1) both;
                }

                @keyframes batSwing {
                    0% { transform: rotate(-85deg); }
                    /* Contact point around 27% of 1.8s (approx 0.5s) */
                    27% { transform: rotate(5deg); }
                    40% { transform: rotate(15deg); }
                    70% { transform: rotate(45deg); opacity: 1; }
                    100% { transform: rotate(60deg); opacity: 0; }
                }

                .anim-ball-group {
                    animation: ballFlightSold 1.8s cubic-bezier(0.25, 1, 0.5, 1) both;
                }

                @keyframes ballFlightSold {
                    0% { transform: translate(-150px, 320px) scale(1.4); }
                    /* Contact point at 0.5s */
                    27% { transform: translate(200px, 200px) scale(1); }
                    /* Flies high and away to top right */
                    60% { transform: translate(450px, -150px) scale(0.5); }
                    100% { transform: translate(600px, -300px) scale(0.2); opacity: 0; }
                }

                .anim-shockwave {
                    animation: glowShockwave 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes glowShockwave {
                    0%, 26% { transform: scale(0); opacity: 0; }
                    27% { transform: scale(0); opacity: 1; stroke-width: 8px; }
                    70% { transform: scale(6); opacity: 0; stroke-width: 1px; }
                    100% { transform: scale(6); opacity: 0; }
                }

                .anim-sparks {
                    animation: sparkBurst 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes sparkBurst {
                    0%, 26% { transform: scale(0); opacity: 0; }
                    27% { transform: scale(0.5); opacity: 1; }
                    60% { transform: scale(1.8); opacity: 0; }
                    100% { transform: scale(1.8); opacity: 0; }
                }

                /* Cricket UNSOLD cinematic animations */
                .cricket-anim-unsold-wrapper {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 400px;
                    height: 400px;
                    z-index: 1005;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIntroCinematic 2.0s ease-out both;
                }

                .anim-unsold-ball {
                    animation: ballFlightUnsold 1.8s cubic-bezier(0.25, 1, 0.5, 1) both;
                }

                @keyframes ballFlightUnsold {
                    0% { transform: translate(50px, -150px) scale(1.6); }
                    /* Contact point at 0.5s */
                    27% { transform: translate(200px, 175px) scale(1); }
                    /* Deflects down and right */
                    60% { transform: translate(260px, 280px) scale(0.8); }
                    100% { transform: translate(300px, 350px) scale(0.6); opacity: 0; }
                }

                .anim-unsold-shockwave {
                    animation: glowShockwaveUnsold 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes glowShockwaveUnsold {
                    0%, 26% { transform: scale(0); opacity: 0; }
                    27% { transform: scale(0); opacity: 1; stroke-width: 8px; }
                    70% { transform: scale(5); opacity: 0; stroke-width: 1px; }
                    100% { transform: scale(5); opacity: 0; }
                }

                .anim-stump-left {
                    animation: stumpShatterLeft 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes stumpShatterLeft {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(-55deg) translate(-100px, 20px); opacity: 0.8; }
                }

                .anim-stump-mid {
                    animation: stumpShatterMid 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes stumpShatterMid {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(15deg) translate(20px, 80px); opacity: 0.8; }
                }

                .anim-stump-right {
                    animation: stumpShatterRight 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes stumpShatterRight {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(65deg) translate(120px, 10px); opacity: 0.8; }
                }

                .anim-bail-left {
                    animation: bailShatterLeft 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                @keyframes bailShatterLeft {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(-280deg) translate(-120px, -180px); opacity: 0.5; }
                }

                .anim-bail-right {
                    animation: bailShatterRight 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) both;
                }

                /* Sad cricketer crying animations in place next to stumps */
                .sad-cricketer-walk {
                    animation: sadBob 0.6s ease-in-out infinite alternate;
                    opacity: 1;
                }

                @keyframes sadBob {
                    0% { transform: translate(90px, 10px) scale(0.85) translateY(0); }
                    100% { transform: translate(90px, 10px) scale(0.85) translateY(8px); }
                }

                .sad-leg-left {
                    /* Stand still */
                }

                .sad-leg-right {
                    /* Stand still */
                }

                .sad-tears {
                    animation: dripTears 0.4s linear infinite;
                }

                @keyframes dripTears {
                    0% { stroke-dashoffset: 0; opacity: 0.3; }
                    50% { opacity: 1; }
                    100% { stroke-dashoffset: 8; opacity: 0.2; }
                }

                @keyframes bailShatterRight {
                    0%, 27% { transform: rotate(0deg) translate(0, 0); }
                    100% { transform: rotate(320deg) translate(140px, -200px); opacity: 0.5; }
                }

                /* Fading in details container instantly with the overlay */
                .sold-details-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    animation: cardFadeInFromBelow 1.2s cubic-bezier(0.19, 1, 0.22, 1) both;
                }

                .unsold-details-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    animation: cardFadeInFromBelow 1.2s cubic-bezier(0.19, 1, 0.22, 1) both;
                }

                @keyframes cardFadeInFromBelow {
                    from {
                        opacity: 0;
                        transform: translateY(40px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes pulseGlow {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.08); opacity: 0.7; }
                }

                .batsman-anim {
                    animation: batsmanStance 2.5s infinite ease-in-out;
                }

                @keyframes batsmanStance {
                    0%, 100% { transform: scale(1) translate(0, 0); }
                    50% { transform: scale(1) translate(1px, 0.5px); }
                }

                @keyframes pulseText {
                    0%, 100% { opacity: 0.8; text-shadow: 0 0 15px rgba(255, 215, 0, 0.3); }
                    50% { opacity: 1; text-shadow: 0 0 30px rgba(255, 215, 0, 0.7); }
                }
            `})]})};export{rt as default};
