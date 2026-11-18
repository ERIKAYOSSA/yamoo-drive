// @ts-nocheck
// Interface (rendu, état, animations) reprise du prototype. Code volontairement non typé (// @ts-nocheck) :
// à typer progressivement. Les nouveaux modules (api, reserve, payment, serveur) sont en TypeScript strict.
import {computeQuote} from "../shared/pricing.js";
import type {Catalog, ReservationInput} from "../shared/types.js";
import {formatIn, getCurrency, setCurrency} from "./currency.js";
import {getLang, L, tr} from "./i18n.js";

export interface UIApi {
  S: any;
  wa(text: string): string;
  fmt(n: number): string;
  getInput(): ReservationInput;
  getMessage(): string;
  persist(): void;
}

export function initUI(data: Catalog, page: string): UIApi {
 const WA=data.config.whatsapp;
 const CARS=data.vehicles,DRV=data.drivers,PROMOS=data.promos,SPEC=CARS.map(c=>c.spec);
 const OCC=[
 {t:"Mariage",p:"Un véhicule soigné pour le grand jour, avec chauffeur si vous le souhaitez.",c:1},
 {t:"Aéroport et accueil",p:"Récupérez vos invités à l’arrivée dans un véhicule confortable.",c:1},
 {t:"Voyage en famille",p:"Place pour tout le monde et pour les bagages.",c:4},
 {t:"Déplacement professionnel",p:"Arrivez à l’heure et à votre avantage.",c:1},
 {t:"Week-end et sorties",p:"Évadez-vous sans vous soucier de l’entretien.",c:2},
 {t:"Déménagement et transport",p:"De la charge utile pour vos objets volumineux.",c:3},
 {t:"Anniversaire et surprise",p:"Offrez un véhicule avec votre message personnel.",c:2}];
 const ANN=[["Nouveau","Livraison offerte pour toute location de 3 jours et plus."],["Cadeau","Offrez un véhicule : votre message personnalisé est offert."],["Fidélité","Chaque 5e location donne une journée gratuite."],["Bientôt","De nouveaux véhicules arrivent. Écrivez-nous pour être prévenu."]];
 const OI=["/img/oi0.webp", "/img/oi1.webp", "/img/oi2.webp", "/img/oi3.webp", "/img/oi4.webp", "/img/oi5.webp", "/img/oi6.webp"];
 const AMB=[["💍","#6a3d7c,#C9A55F"],["✈️","#0B2A6E,#3B6FD8"],["👨‍👩‍👧","#2FA37A,#0B2A6E"],["💼","#10213A,#5B6678"],["🌴","#E4572E,#C9A55F"],["📦","#8A6E4B,#10213A"],["🎉","#D6336C,#7B5EA7"]];
 const REV=[["Awa K.","J’ai offert une voiture à ma sœur pour son anniversaire. Elle a pleuré de joie, et la livraison était à l’heure."],["Serge M.","Location de 5 jours pour un mariage : véhicule impeccable et équipe très réactive sur WhatsApp."],["Nadine T.","Dossier validé vite et prix clair dès le départ. Je recommande."]];
 let PREV="";
 const FAV=new Set();try{JSON.parse(localStorage.getItem("yd-fav")||"[]").forEach(x=>FAV.add(x))}catch(x){}
 const esc=t=>t.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 const site=()=>location.origin,shareLink=t=>"https://wa.me/?text="+encodeURIComponent(t);
 const CH=()=>S.mode==="rent"&&S.chauf?15000:0;
 let LAST_MSG="";
 const S={mode:"buy",who:"me",car:0,days:3,view:0,photo:0,flt:"all",sort:"",chauf:false,drv:0,budget:50000,oc:0,cA:0,cB:1,date:""};

 const FIELDS=["name","msg","cname","cphone","place","date","stime","etime","pcode","deco","pname"];
 function persist(){try{const de=document.getElementById("date");if(de)S.date=de.value;
  const prev=JSON.parse(sessionStorage.getItem("yd-state")||"{}"),f={...(prev.f||{})};
  FIELDS.forEach(id=>{const e=document.getElementById(id);if(e)f[id]=e.value});f.date=S.date;
  sessionStorage.setItem("yd-state",JSON.stringify({S:{mode:S.mode,who:S.who,car:S.car,days:S.days,chauf:S.chauf,drv:S.drv,date:S.date},f}))}catch(x){}}
 function restore(){try{const o=JSON.parse(sessionStorage.getItem("yd-state")||"null");if(!o)return;Object.assign(S,o.S);
  FIELDS.forEach(id=>{const e=document.getElementById(id);if(e&&o.f&&o.f[id]!=null)e.value=o.f[id]});
  const d=document.getElementById("days");if(d)d.value=S.days}catch(x){}}
 const getInput=()=>{const v=id=>(document.getElementById(id)?.value||"").trim(),rent=S.mode==="rent";
  return{vehicleId:S.car,mode:S.mode,days:rent?S.days:undefined,startDate:rent?(v("date")||undefined):undefined,startTime:rent?(v("stime")||undefined):undefined,endTime:rent?(v("etime")||undefined):undefined,withDriver:rent&&S.chauf,driverId:rent&&S.chauf?S.drv:undefined,
   customer:{name:v("cname"),phone:v("cphone")},pickupPlace:v("place"),recipient:S.who==="other"?{name:v("name"),message:v("msg")}:undefined,decoration:v("deco")||undefined,referralCode:v("pcode").toUpperCase()||undefined}};
 const $=id=>document.getElementById(id)||Object.assign(document.createElement("div"),{value:"",checked:false});
 const fmtF=n=>formatIn(n,"XAF"),fmt=n=>formatIn(n,getCurrency());
 const inner=c=>`<path fill="${c}" d="M10 62 L18 46 Q22 40 30 38 L62 34 L80 16 Q84 12 90 12 L130 12 Q136 12 140 16 L156 34 L180 40 Q192 44 192 56 L192 66 L10 66 Z"/><path fill="#fff" opacity=".85" d="M70 34 L84 20 L108 20 L108 34 Z M114 20 L130 20 L144 34 L114 34 Z"/><circle cx="48" cy="68" r="13" fill="#10213A"/><circle cx="48" cy="68" r="5" fill="#cfd6e2"/><circle cx="152" cy="68" r="13" fill="#10213A"/><circle cx="152" cy="68" r="5" fill="#cfd6e2"/>`;
 const svg=c=>`<svg viewBox="0 0 200 90" aria-hidden="true">${inner(c)}</svg>`;
 const PH=["Vue extérieure","Intérieur","Coffre","Tableau de bord"],PHR=["Vue d’ensemble","Face avant","Jante","Flanc"];
 const real=(i,k)=>{const [key,z,p,l]=CARS[i].ph[k];return `<div class="crop" role="img" aria-label="${l}" style="background-image:var(--p${key});background-size:${z};background-position:${p}"></div>`};
 const thumb=i=>real(i,0);
 function photo(c,k){const o=`<svg viewBox="0 0 400 260" role="img" aria-label="${PH[k]}">`;
 if(k==0)return o+`<rect width="400" height="260" fill="#DCE7F2"/><rect y="190" width="400" height="70" fill="#B9C3CF"/><svg x="40" y="75" width="320" viewBox="0 0 200 90">${inner(c)}</svg></svg>`;
 if(k==1)return o+`<rect width="400" height="260" fill="#2A3550"/><rect x="50" y="90" width="120" height="120" rx="30" fill="${c}"/><rect x="230" y="90" width="120" height="120" rx="30" fill="${c}"/><rect x="40" y="200" width="320" height="20" rx="10" fill="#10213A"/></svg>`;
 if(k==2)return o+`<rect width="400" height="260" fill="#E9E1D0"/><rect x="50" y="60" width="300" height="150" rx="14" fill="#cfc6b2"/><rect x="80" y="110" width="110" height="80" rx="10" fill="${c}"/><rect x="210" y="130" width="90" height="60" rx="10" fill="#10213A"/></svg>`;
 return o+`<rect width="400" height="260" fill="#1B2438"/><circle cx="130" cy="130" r="62" fill="none" stroke="#9AA6B8" stroke-width="10"/><circle cx="130" cy="130" r="14" fill="${c}"/><rect x="220" y="80" width="140" height="90" rx="12" fill="#10213A" stroke="${c}" stroke-width="4"/><rect x="235" y="100" width="70" height="8" rx="4" fill="${c}"/></svg>`;}
 function priceOf(i){const q=computeQuote(CARS[i],{mode:S.mode,days:S.days,withDriver:S.mode==="rent"&&S.chauf},data.config.driverFeePerDay);return S.mode==="buy"?{v:fmt(q.total),f:fmtF(q.total),s:""}:{v:fmt(q.total),f:fmtF(q.total),s:` pour ${S.days} j`}}
 const card=(c,i)=>`<div class="cw"><button class="heart" data-fav="${i}" aria-pressed="${FAV.has(i)}" aria-label="Favori">♥</button><a class="car" href="/vehicule?id=${i}">${thumb(i)}<h3>${c.n}</h3><span>${c.d}</span><b>${S.mode==="buy"?fmt(c.buy):fmt(c.rent)+" / jour"}</b></a></div>`;
 function wa(text){return `https://wa.me/${WA}?text=${encodeURIComponent(text)}`}
 function render(){
 document.querySelectorAll("[data-mode]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.mode===S.mode));
 document.querySelectorAll("[data-who]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.who===S.who));
 $("gridHome").innerHTML=CARS.slice(0,3).map(card).join("");
 $("gridAll").innerHTML=CARS.map(card).join("");
 $("occ").innerHTML=OCC.map(o=>`<a href="/vehicule?id=${o.c}"><h3>${o.t}</h3><p>${o.p}</p><small>Véhicule conseillé : ${CARS[o.c].n}</small></a>`).join("");
 if(!$("heroArt").firstChild)$("heroArt").innerHTML=`<img src="/img/hero.webp" alt="Véhicules disponibles chez Yamoo Drive">`;
 $("selCar").innerHTML=CARS.map((c,i)=>`<option value="${i}"${i===S.car?" selected":""}>${c.n}</option>`).join("");
 $("daysBox").hidden=S.mode!=="rent";$("otherBox").hidden=S.who!=="other";
 $("daysOut").textContent=S.days+(S.days>1?" jours":" jour");
 const c=CARS[S.car],p=priceOf(S.car),other=S.who==="other",name=$("name").value.trim(),msg=$("msg").value.trim();
 $("tTag").textContent=other?"Cadeau Yamoo":"Pour vous";
 $("tTo").textContent=other?(name?`Pour ${name}`:"Pour quelqu’un de spécial"):"Votre prochain véhicule";
 $("tCar").innerHTML=thumb(S.car);
 $("tMsg").textContent=other?(msg?`« ${msg} »`:"Votre message apparaîtra ici."):"";
 $("tName").textContent=`${c.n} · ${S.mode==="buy"?"Achat":"Location"}`;
 $("tPrice").innerHTML=`${p.v}<small>${p.s}</small>`;if(PREV!==p.v+p.s){PREV=p.v+p.s;const t=$("tPrice");t.classList.remove("flash");void t.offsetWidth;t.classList.add("flash")}
 const cn=$("cname").value.trim(),sal=new Date().getHours()<18?"Bonjour":"Bonsoir",who=cn||"un client",lieu=$("place").value.trim(),dt=$("date").value,pc=$("pcode").value.trim();
 const lines=[`${sal} l’équipe Yamoo Drive 👋`,"",`Je m’appelle ${who} et je souhaite ${S.mode==="buy"?"acheter":"louer"} le véhicule : ${c.n}.`];
 if(other)lines.push(`Ce sera un cadeau pour ${name||"un proche"} 🎁${msg?`, avec ce message : « ${msg} »`:""}.`);
 lines.push("","Voici mon récapitulatif :",`• Véhicule : ${c.n}`,`• Prix : ${p.f}${p.s}${getCurrency()!=="XAF"?` (≈ ${p.v})`:""}`);
 if(S.mode==="rent"){lines.push(`• Durée : ${S.days} jour${S.days>1?"s":""}, à partir du ${dt?dt.split("-").reverse().join("/"):"jour à convenir"}`);if($("stime").value)lines.push(`• Heure de réception du véhicule : ${$("stime").value.replace(":","h")}`);if($("etime").value)lines.push(`• Heure de retour : ${$("etime").value.replace(":","h")}`);lines.push(CH()?`• Chauffeur : ${DRV[S.drv].n} (${DRV[S.drv].y} ans d’expérience)`:"• Sans chauffeur")}
 lines.push(`• Lieu de remise${S.mode==="rent"?" ou de livraison":""} : ${lieu||"à convenir"}`);
 if($("deco").value)lines.push(`• Décoration : ${$("deco").value}`);if(pc)lines.push(`• Code parrain : ${pc}`);
 lines.push("",`Pouvez-vous me confirmer la disponibilité et les prochaines étapes ? Merci d’avance, ${who}.`);
 const buildEn=()=>{const hr=new Date().getHours()<18?"Hello":"Good evening",w=cn||"a customer",l=[`${hr} Yamoo Drive team 👋`,"",`My name is ${w} and I would like to ${S.mode==="buy"?"buy":"rent"} this vehicle: ${c.n}.`];
 if(other)l.push(`This will be a gift for ${name||"a loved one"} 🎁${msg?`, with this message: “${msg}”`:""}.`);
 const dd=`${S.days} day${S.days>1?"s":""}`;
 l.push("","Here is my summary:",`• Vehicle: ${c.n}`,`• Price: ${p.f}${S.mode==="rent"?` for ${dd}`:""}${getCurrency()!=="XAF"?` (≈ ${p.v})`:""}`);
 if(S.mode==="rent"){l.push(`• Duration: ${dd}, starting ${dt?dt.split("-").reverse().join("/"):"on a date to be agreed"}`);if($("stime").value)l.push(`• Vehicle pickup time: ${$("stime").value}`);if($("etime").value)l.push(`• Return time: ${$("etime").value}`);l.push(CH()?`• Driver: ${DRV[S.drv].n} (${DRV[S.drv].y} years of experience)`:"• Without driver")}
 l.push(`• ${S.mode==="rent"?"Handover or delivery place":"Handover place"}: ${lieu||"to be agreed"}`);
 if($("deco").value)l.push(`• Decoration: ${tr($("deco").value)||$("deco").value}`);if(pc)l.push(`• Referral code: ${pc}`);
 l.push("",`Could you confirm availability and the next steps? Thank you in advance, ${w}.`);return l.join("\n")};
 LAST_MSG=getLang()==="en"?buildEn():lines.join("\n");$("go").href=wa(LAST_MSG);persist();renderPromos();renderMore();
 }
 function renderMore(){
 document.querySelectorAll("[data-chauf]").forEach(b=>b.setAttribute("aria-pressed",(b.dataset.chauf==="yes")===S.chauf));
 $("drvBox").hidden=!S.chauf;
 $("drvPick").innerHTML=DRV.map((d,k)=>`<button class="drv" data-drv="${k}" aria-pressed="${k===S.drv}"><span class="av">${d.n[0]}</span><span><b>${d.n}</b><br><small>${d.y} ans d’expérience · ★ ${d.r}</small></span></button>`).join("");
 $("drvList").innerHTML=DRV.map((d,k)=>`<article class="dcard"><div class="dh"><div class="av big">${d.n[0]}</div><div><h3>${d.n}</h3><p class="cap" style="margin:0">${d.y} ans d’expérience · ★ ${d.r} · ${d.l}</p></div></div><p>${d.d}</p><div class="dr">${d.rv.map(r=>`<div class="rev"><p>« ${r[1]} »</p><p class="cap">${r[0]} · ${"★".repeat(r[2])}</p></div>`).join("")}</div><div class="btns"><button class="cta" data-pick="${k}">Choisir ${d.n.split(" ")[0]}</button><a class="ghost" target="_blank" rel="noopener" href="${wa(L(`Bonjour Yamoo Drive, je souhaite donner mon avis sur le chauffeur ${d.n}.`,`Hello Yamoo Drive, I would like to leave a review about the driver ${d.n}.`))}">Donner mon avis</a></div></article>`).join("");
 $("bOut").textContent=fmt(S.budget)+" / jour";
 const ok=CARS.map((c,i)=>[c,i]).filter(([c])=>c.rent<=S.budget);
 $("bRes").innerHTML=ok.length?`Avec ce budget, vous pouvez louer : ${ok.map(([c,i])=>`<a href="/vehicule?id=${i}">${c.n}</a>`).join(", ")}.`:"Aucun véhicule à ce budget. Augmentez-le un peu.";
 document.querySelectorAll("[data-flt]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.flt===S.flt));document.querySelectorAll("[data-sort]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.sort===S.sort));
 const _ty=c=>/Berline/.test(c.n)?"berline":"suv",_pv=c=>S.mode==="buy"?c.buy:c.rent;let _L=CARS.map((c,i)=>[c,i]).filter(([c,i])=>S.flt==="fav"?FAV.has(i):S.flt==="all"||_ty(c)===S.flt);if(S.sort)_L.sort((x,y)=>(_pv(x[0])-_pv(y[0]))*(S.sort==="asc"?1:-1));
 $("gridAll").innerHTML=_L.map(([c,i])=>card(c,i)).join("")||`<p class="sub">${S.flt==="fav"?"Touchez le cœur d’un véhicule pour l’ajouter ici.":"Aucun véhicule dans cette catégorie."}</p>`;
 const o=OCC[S.oc],a=AMB[S.oc];
 $("amb").innerHTML=`<div class="chips">${OCC.map((x,k)=>`<button data-oc="${k}" aria-pressed="${k===S.oc}">${x.t}</button>`).join("")}</div><div class="amb"><div class="scene" style="background:linear-gradient(135deg,${a[1]})"><img class="oi" src="${OI[S.oc]}" alt="${o.t}"><div><h3>${o.t}</h3><p>${o.p}</p></div></div><a class="car" href="/vehicule?id=${o.c}">${thumb(o.c)}<h3>${CARS[o.c].n}</h3><span>${CARS[o.c].d}</span><b>${fmt(CARS[o.c].rent)} / jour</b></a></div>`;
 if($("cmpA").options&&!$("cmpA").options.length){const h=CARS.map((c,i)=>`<option value="${i}">${c.n}</option>`).join("");$("cmpA").innerHTML=h;$("cmpB").innerHTML=h}
 $("cmpA").value=S.cA;$("cmpB").value=S.cB;
 const A=CARS[S.cA],B=CARS[S.cB],a1=SPEC[S.cA],b1=SPEC[S.cB],lo=(x,y)=>x<y?[`<b>${fmt(x)}</b>`,fmt(y)]:x>y?[fmt(x),`<b>${fmt(y)}</b>`]:[fmt(x),fmt(y)],pb=lo(A.buy,B.buy),pr=lo(A.rent,B.rent);
 $("cmpT").innerHTML=`<table class="tbl"><tr><th></th><td>${thumb(S.cA)}<b>${A.n}</b></td><td>${thumb(S.cB)}<b>${B.n}</b></td></tr><tr><th>Places</th><td>${a1.p}</td><td>${b1.p}</td></tr><tr><th>Boîte</th><td>${a1.b}</td><td>${b1.b}</td></tr><tr><th>Énergie</th><td>${a1.t}</td><td>${b1.t}</td></tr><tr><th>Coffre</th><td>${a1.k}</td><td>${b1.k}</td></tr><tr><th>Achat</th><td>${pb[0]}</td><td>${pb[1]}</td></tr><tr><th>Par jour</th><td>${pr[0]}</td><td>${pr[1]}</td></tr></table>`;
 const nm=esc($("name").value.trim()||"toi"),ms=esc($("msg").value.trim()||"Une surprise t’attend. Profite de la route !"),cr=CARS[S.car];
 $("letter").innerHTML=`<span class="tag">Cadeau Yamoo</span><div class="to">Pour ${nm}</div>${thumb(S.car)}<div class="msg">« ${ms} »</div><p>${cr.n} · ${S.mode==="buy"?"à acheter":"à louer"}</p><a class="cta wa" target="_blank" rel="noopener" href="${wa(L(`Bonjour Yamoo Drive, c’est ${$("name").value.trim()||"le bénéficiaire"}. J’ai reçu un cadeau de la part de ${$("cname").value.trim()||"un proche"} : ${cr.n}. Je souhaite choisir ma date de remise.`,`Hello Yamoo Drive, this is ${$("name").value.trim()||"the recipient"}. I received a gift from ${$("cname").value.trim()||"a loved one"}: ${cr.n}. I would like to choose my handover date.`))}">Choisir ma date de remise</a>`;
 $("giftSend").href=shareLink(L(`Surprise ${$("name").value.trim()||""} ! Un véhicule t’attend chez Yamoo Drive : ${cr.n}. ${$("msg").value.trim()} ${site()}`,`Surprise ${$("name").value.trim()||""}! A vehicle is waiting for you at Yamoo Drive: ${cr.n}. ${$("msg").value.trim()} ${site()}`));
 $("revs").innerHTML=REV.map(r=>`<div class="rev"><div class="av">${r[0][0]}</div><p>${r[1]}</p><p class="cap">${r[0]}</p></div>`).join("");
 let pn=$("pname").value.trim().toUpperCase().replace(/[^A-Z]/g,"").slice(0,5),h=0;for(const k of pn)h=(h*31+k.charCodeAt(0))%90;
 const code=pn?`YAMOO-${pn}${10+h}`:"";
 $("pcodeOut").textContent=code||"Votre code apparaîtra ici";
 $("pShare").href=code?shareLink(L(`Utilise mon code ${code} chez Yamoo Drive et profite d’une réduction sur ta première location ! ${site()}`,`Use my code ${code} at Yamoo Drive and get a discount on your first rental! ${site()}`)):"/parrainage";
 }
 const openEnv=()=>{const e=$("envBtn");e.classList.add("open");setTimeout(()=>{e.hidden=true;$("letter").hidden=false},550)};
 const resetEnv=()=>{$("envBtn").hidden=false;$("envBtn").classList.remove("open");$("letter").hidden=true};
 function countUp(){document.querySelectorAll("[data-n]").forEach(e=>{const to=+e.dataset.n,f=v=>e.dataset.d?(v/10).toFixed(1).replace(".",L(",",".")):Math.round(v);
 if(matchMedia("(prefers-reduced-motion:reduce)").matches){e.textContent=f(to);return}const t0=performance.now(),st=n=>{const k=Math.min((n-t0)/1200,1);e.textContent=f(to*k);if(k<1)requestAnimationFrame(st)};requestAnimationFrame(st)})}
 function renderPromos(){
 const pr=(i,p)=>{const c=CARS[i],b=S.mode==="buy"?c.buy:c.rent;return {o:fmt(b)+(S.mode==="buy"?"":" / jour"),n:fmt(Math.round(b*(1-p/100)/1000)*1000)+(S.mode==="buy"?"":" / jour"),nf:fmtF(Math.round(b*(1-p/100)/1000)*1000)+(S.mode==="buy"?"":" / jour")}};
 $("gridPromo").innerHTML=PROMOS.map(m=>{const c=CARS[m.c],x=pr(m.c,m.pct),txt=L(`Bonjour Yamoo Drive, je profite de l’offre -${m.pct}% sur : ${c.n} (${S.mode==="buy"?"achat":"location"}). Prix promo : ${x.nf}.`,`Hello Yamoo Drive, I would like to take the -${m.pct}% offer on: ${c.n} (${S.mode==="buy"?"purchase":"rental"}). Promo price: ${x.nf}.`);
  return `<div class="promo"><span class="badge">-${m.pct}%</span>${thumb(m.c)}<h3>${c.n}</h3><span style="color:var(--mute);font-size:14px">${m.t}</span><div><span class="old">${x.o}</span><span class="new">${x.n}</span></div><div class="cd" data-end="${m.end}"></div><div class="btns"><a class="cta wa" target="_blank" rel="noopener" href="${wa(txt)}">Profiter de l’offre</a><a class="ghost" href="/vehicule?id=${m.c}">Voir</a></div></div>`}).join("");
 $("ann").innerHTML=ANN.map(a=>`<div><span>${a[0]}</span><p>${a[1]}</p></div>`).join("");
 const f=PROMOS.reduce((a,b)=>b.pct>a.pct?b:a);
 $("homePromo").innerHTML=`<div><b>Jusqu’à -${f.pct}% sur une sélection de véhicules</b><div style="opacity:.8">${f.t}</div></div><div class="cd" data-end="${f.end}"></div>`;
 tick();
 }
 function tick(){const n=Date.now();document.querySelectorAll("[data-end]").forEach(e=>{let d=new Date(e.dataset.end)-n;if(d<=0){e.textContent="Offre terminée";return}
 const j=Math.floor(d/864e5),h=Math.floor(d%864e5/36e5),m=Math.floor(d%36e5/6e4),s=Math.floor(d%6e4/1e3),p=v=>String(v).padStart(2,"0");
 e.textContent=`Fin dans ${j} j ${p(h)} h ${p(m)} min ${p(s)} s`})}
 setInterval(tick,1000);
 function detail(){const i=S.view,c=CARS[i];S.car=i;
 $("dName").textContent=c.n;$("dDesc").textContent=c.d;
 $("dPrice").textContent=S.mode==="buy"?fmt(c.buy):fmt(c.rent)+" / jour";
 $("dNote").textContent=c.note;
 $("mainPh").innerHTML=real(i,S.photo);$("cap").textContent=c.ph[S.photo][3];
 $("thumbs").innerHTML=c.ph.map((p,k)=>`<button data-ph="${k}" aria-label="${p[3]}" aria-pressed="${k===S.photo}">${real(i,k)}</button>`).join("");
 $("dAsk").href=wa(L(`Bonjour Yamoo Drive, j’ai une question sur : ${c.n}.`,`Hello Yamoo Drive, I have a question about: ${c.n}.`));
 $("dFav").dataset.fav=i;$("dFav").textContent=FAV.has(i)?"♥ Dans mes favoris":"♡ Ajouter aux favoris";
 $("dShare").href=shareLink(L(`Que penses-tu de celui-ci : ${c.n} chez Yamoo Drive ? ${site()}/vehicule?id=${i}`,`What do you think of this one: ${c.n} at Yamoo Drive? ${site()}/vehicule?id=${i}`));
 const t=new Date();t.setHours(0,0,0,0);const p2=v=>String(v).padStart(2,"0");let h=L("LMMJVSD","MTWTFSS").split("").map(d=>`<b>${d}</b>`).join("")+"<i></i>".repeat((t.getDay()+6)%7);
 for(let k=0;k<28;k++){const d=new Date(t);d.setDate(t.getDate()+k);const iso=`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`,busy=(k*3+i*5)%7===0||(k+i)%11===0;h+=`<button data-day="${iso}" ${busy?"disabled":""} aria-pressed="${iso===S.date}" aria-label="${iso}${busy?" indisponible":""}">${d.getDate()}</button>`}
 $("cal").innerHTML=h;$("calCap").textContent=S.date?`Début choisi : ${S.date}. Touchez Réserver pour continuer.`:"Touchez un jour libre pour commencer la location. Les jours barrés sont pris (exemple).";
 }
 function route(pg){
  if(pg==="vehicule"){let id=+(new URLSearchParams(location.search).get("id")||0);if(!CARS[id])id=0;S.view=id;S.photo=0;S.car=id}
  document.querySelectorAll(".page").forEach(s=>s.classList.toggle("on",s.id==="p-"+pg));
  document.querySelectorAll("#nav a").forEach(a=>{const on=a.dataset.p===(pg==="vehicule"?"vehicules":pg);on?a.setAttribute("aria-current","page"):a.removeAttribute("aria-current")});
  render();if(pg==="vehicule")detail();if(pg==="accueil")countUp();if(pg==="cadeau")resetEnv();enterPage(pg);
 }
 document.addEventListener("click",e=>{
 const fv=e.target.closest("[data-fav]"),fl=e.target.closest("[data-flt]"),oc=e.target.closest("[data-oc]"),dy=e.target.closest("[data-day]"),cf=e.target.closest("[data-chauf]"),dv=e.target.closest("[data-drv]"),pk=e.target.closest("[data-pick]");
 if(fv){const k=+fv.dataset.fav;FAV.has(k)?FAV.delete(k):FAV.add(k);try{localStorage.setItem("yd-fav",JSON.stringify([...FAV]))}catch(x){}render();if(FAV.has(k))document.querySelectorAll(`[data-fav="${k}"]`).forEach(b=>b.classList.add("pop"));if($("p-vehicule").classList.contains("on"))detail();return}
 const st=e.target.closest("[data-sort]");if(st){S.sort=st.dataset.sort;render();return}
 if(fl){S.flt=fl.dataset.flt;render();return}
 if(oc){S.oc=+oc.dataset.oc;render();return}
 if(dy){S.date=dy.dataset.day;S.mode="rent";$("date").value=S.date;render();detail();return}
 if(cf){S.chauf=cf.dataset.chauf==="yes";render();return}
 if(dv){S.drv=+dv.dataset.drv;render();return}
 if(pk){S.drv=+pk.dataset.pick;S.chauf=true;S.mode="rent";persist();location.href="/reserver";return}
 if(e.target.closest("#envBtn")){openEnv();return}
 if(e.target.closest("#replay")){resetEnv();return}
 const m=e.target.closest("[data-mode]"),w=e.target.closest("[data-who]"),t=e.target.closest("[data-ph]");
 if(m){S.mode=m.dataset.mode;render();if($("p-vehicule").classList.contains("on"))detail()}
 if(w){S.who=w.dataset.who;render()}
 if(t){S.photo=+t.dataset.ph;detail()}
 });
 $("selCar").addEventListener("change",e=>{S.car=+e.target.value;render()});
 $("days").addEventListener("input",e=>{S.days=+e.target.value;render()});
 ["name","msg","cname","cphone","place","date","stime","etime","pcode","pname","deco"].forEach(id=>$(id).addEventListener("input",render));
 $("budget").addEventListener("input",e=>{S.budget=+e.target.value;render()});
 $("cmpA").addEventListener("change",e=>{S.cA=+e.target.value;render()});$("cmpB").addEventListener("change",e=>{S.cB=+e.target.value;render()});
 $("dRes").addEventListener("click",()=>{S.car=S.view;persist()});
 function enterPage(pg){const pe=$("p-"+pg)||$("p-vehicule");pe.classList.add("enter");pe.querySelectorAll(".grid>*,.dcard,.occ>a").forEach((el,k)=>el.style.setProperty("--i",k%8));setTimeout(()=>pe.classList.remove("enter"),1300);
 if(!("IntersectionObserver" in window))return;
 const els=pe.querySelectorAll(".sec:not(.in),.feat>div:not(.in),.stats>div:not(.in)");els.forEach(e=>e.classList.add("rv"));
 const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add("in");io.unobserve(x.target)}}),{threshold:.1});els.forEach(e=>io.observe(e))}
 addEventListener("scroll",()=>{const h=document.documentElement;$("prog").style.width=(h.scrollTop/((h.scrollHeight-h.clientHeight)||1)*100)+"%"},{passive:true});
 function applyTheme(t,save){document.documentElement.dataset.theme=t;if(save){try{localStorage.setItem("yd-theme",t)}catch(x){}}$("theme").textContent=t==="dark"?"☀ Mode clair":"☾ Mode sombre"}
 let t0=null;try{t0=localStorage.getItem("yd-theme")}catch(x){}
 applyTheme(t0||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"),false);
 $("theme").addEventListener("click",()=>{if(!matchMedia("(prefers-reduced-motion:reduce)").matches){document.documentElement.classList.add("tt");setTimeout(()=>document.documentElement.classList.remove("tt"),500)}applyTheme(document.documentElement.dataset.theme==="dark"?"light":"dark",true)});
 const refreshStatic=()=>document.querySelectorAll("[data-fcfa]").forEach(e=>{e.textContent=fmt(+e.dataset.fcfa)});
 const curSel=document.getElementById("cur");
 if(curSel){curSel.value=getCurrency();curSel.addEventListener("change",()=>{setCurrency(curSel.value);refreshStatic();render();if($("p-vehicule").classList.contains("on"))detail()})}
 refreshStatic();
 document.getElementById("lang")?.addEventListener("change",()=>{refreshStatic();render();if($("p-vehicule").classList.contains("on"))detail()});
 function initSlider(){const t=$("trk"),n=CARS.length;t.innerHTML=CARS.map((c,i)=>`<a class="sl" href="/vehicule?id=${i}">${thumb(i)}<div class="slc"><b>${c.n}</b><span>${c.d}</span></div></a>`).join("");
 $("dots").innerHTML="<i></i>".repeat(n);const ds=$("dots").children;let k=0,hold=false;
 const mark=()=>{const w=t.children[1].offsetLeft-t.children[0].offsetLeft;k=Math.round(t.scrollLeft/w);[...ds].forEach((d,j)=>d.classList.toggle("on",j===k))};
 t.addEventListener("scroll",mark,{passive:true});mark();
 ["pointerenter","touchstart"].forEach(v=>t.addEventListener(v,()=>hold=true,{passive:true}));["pointerleave","touchend"].forEach(v=>t.addEventListener(v,()=>setTimeout(()=>hold=false,2500),{passive:true}));
 if(!matchMedia("(prefers-reduced-motion:reduce)").matches)setInterval(()=>{if(hold||!t.offsetParent)return;const j=(k+1)%n;t.scrollTo({left:t.children[j].offsetLeft-t.children[0].offsetLeft,behavior:"smooth"})},3500)}
 if(document.getElementById("trk"))initSlider();
 (function(){const n=$("nav"),w=$("nw"),up=()=>{w.classList.toggle("r",n.scrollLeft+n.clientWidth<n.scrollWidth-6);w.classList.toggle("l",n.scrollLeft>6)};
 n.addEventListener("scroll",up,{passive:true});addEventListener("resize",up);addEventListener("load",up);setTimeout(up,300);up();
 $("nR").addEventListener("click",()=>n.scrollBy({left:Math.max(160,n.clientWidth*.6),behavior:"smooth"}));
 $("nL").addEventListener("click",()=>n.scrollBy({left:-Math.max(160,n.clientWidth*.6),behavior:"smooth"}))})();
 restore();route(page);
 return {S,wa,fmt,getInput,getMessage:()=>LAST_MSG,persist};
}
