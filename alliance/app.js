"use strict";
const $=id=>document.getElementById(id);
const state={data:null,version:0,api:"",serverReady:false,token:sessionStorage.getItem("bam_admin_session")||"",selected:1,filter:"all",search:"",view:null,baseView:null,pointers:new Map(),drag:null};
const url=(p)=>state.api.replace(/\/$/,"")+p;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const polygon=pts=>pts.map(([x,y])=>x+","+y).join(" ");
const X=x=>x*30,Y=y=>y*17;
const diamond=(x,y,type)=>type==="one"?[[x,y-1],[x+1,y],[x,y+1],[x-1,y]]:[[x,y-3],[x+2,y-1],[x,y+1],[x-2,y-1]];
const uv=(x,y)=>[(x+y)/2,(y-x)/2];
const k=(u,v)=>u+":"+v;
const tilePoints=(x,y,t)=>polygon(diamond(x,y,t).map(([a,b])=>[X(a),Y(b)]));
const fmt=(n)=>String(n).padStart(2,"0");
function show(message,bad=false){const el=$("notice");el.textContent=message;el.classList.toggle("error",bad);el.hidden=false;clearTimeout(show.timer);show.timer=setTimeout(()=>el.hidden=true,7000);}
function territory(data){const cells=new Set();function add(x,y,r){const [u,v]=uv(x,y);for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)cells.add(k(u+i,v+j));}add(299,535,6);for(const p of data.outposts)add(p.x,p.y,5);return cells;}
const mapStyles=`.territory{fill:#e5f5df;opacity:.7}.territory-border{stroke:#409267;stroke-width:2.7;stroke-linecap:round}.hq-tile{fill:#d9ebf8;stroke:#87b3ce;stroke-width:1.2;cursor:pointer}.hq-tile.boundary{fill:#fce3a5;stroke:#cba15a}.hq-tile.registered{fill:#9bddd3;stroke:#62bcb1}.hq-tile.selected{fill:#fff0b5;stroke:#dc8f33;stroke-width:3}.special-tile{stroke:#f5fbff;stroke-width:1.2}.mountain{fill:#89969e}.outpost{fill:#f07040}.fort,.sound,.steel{fill:#20465e}.warehouse,.hospital{fill:#168c80}.hq-no{text-anchor:middle;dominant-baseline:middle;font:750 20px system-ui,sans-serif;fill:#173b54}.hq-nick{text-anchor:middle;dominant-baseline:middle;font:700 12px system-ui,sans-serif;fill:#035b52}.special-label{text-anchor:middle;dominant-baseline:middle;font:700 15px system-ui,sans-serif;fill:#fff}.outpost-label{text-anchor:middle;dominant-baseline:middle;font:800 11px system-ui,sans-serif;fill:#fff}.mount-label{text-anchor:middle;dominant-baseline:middle;font:700 14px system-ui,sans-serif;fill:#fff}.heading-label{font:700 17px system-ui,sans-serif;fill:#668b8f;letter-spacing:1px}`;
function makeMap(){
  const data=state.data,territ=territory(data);if(!data)return "";
  const coords=[...territ].map(s=>{const [u,v]=s.split(":").map(Number);return {u,v,x:u-v,y:u+v}});
  const minX=Math.min(...coords.map(c=>c.x))-3,maxX=Math.max(...coords.map(c=>c.x))+3,minY=Math.min(...coords.map(c=>c.y))-4,maxY=Math.max(...coords.map(c=>c.y))+4;
  state.baseView={x:X(minX),y:Y(minY),w:X(maxX-minX),h:Y(maxY-minY)};
  if(!state.view)state.view={...state.baseView};
  const poly=(x,y,t,cl,label)=>`<polygon class="${cl}" points="${tilePoints(x,y,t)}"><title>${esc(label)}</title></polygon>`;
  let out='<style>'+mapStyles+'</style><g id="layout-layer">';
  out+='<g aria-hidden="true">';
  for(const c of coords)out+=`<polygon class="territory" points="${tilePoints(c.x,c.y,"one")}"/>`;
  for(const c of coords){const ns=[[0,-1],[1,0],[0,1],[-1,0]],pp=diamond(c.x,c.y,"one").map(([a,b])=>[X(a),Y(b)]);
    for(let i=0;i<4;i++){const [du,dv]=ns[i];if(!territ.has(k(c.u+du,c.v+dv)))out+=`<path class="territory-border" d="M${pp[i][0]} ${pp[i][1]}L${pp[(i+1)%4][0]} ${pp[(i+1)%4][1]}" fill="none"/>`;}
  }
  out+='</g>';
  for(const p of data.mountains||[]){out+=poly(p.x,p.y,"two","special-tile mountain","산 / 장애물");out+=`<text class="mount-label" x="${X(p.x)}" y="${Y(p.y-1)}">산</text>`;}
  for(const p of data.facilities){out+=poly(p.x,p.y,"two","special-tile "+p.key,p.name+" ("+p.x+","+p.y+")");let label=p.name==="음향함정"?"음향":p.name==="강철공장"?"강철":p.name;out+=`<text class="special-label" x="${X(p.x)}" y="${Y(p.y-1)}">${esc(label)}</text>`;}
  for(const p of data.outposts){out+=poly(p.x,p.y,"one","special-tile outpost","전초 "+p.number);out+=`<text class="outpost-label" x="${X(p.x)}" y="${Y(p.y)}">${p.number}</text>`;}
  for(const s of data.slots){const label=s.nickname||"빈자리";const className=["hq-tile",s.x+s.y===812?"boundary":"",s.nickname?"registered":"",state.selected===s.number?"selected":""].filter(Boolean).join(" ");
    out+=`<g class="slot-group" tabindex="0" role="button" data-number="${s.number}" aria-label="${esc(s.number+"번 "+label+" X"+s.x+" Y"+s.y)}">`;
    out+=poly(s.x,s.y,"two",className,s.number+"번 "+label+" X:"+s.x+" Y:"+s.y);
    const nick=s.nickname?.trim();const numberY=Y(s.y-1)+(nick?-9:0);
    out+=`<text class="hq-no" x="${X(s.x)}" y="${numberY}">${s.number}</text>`;
    if(nick){const short=[...nick].slice(0,9).join("");out+=`<text class="hq-nick" textLength="${Math.min(95,Math.max(24,[...short].length*12))}" lengthAdjust="spacingAndGlyphs" x="${X(s.x)}" y="${Y(s.y-1)+15}">${esc(short)}</text>`;}
    out+='</g>';
  }
  out+='</g>';return out;
}
function setView(){if(state.view){const v=state.view;$("mapSvg").setAttribute("viewBox",[v.x,v.y,v.w,v.h].join(" "));$("zoomLabel").textContent=Math.round(100*state.baseView.w/v.w)+"%";}}
function mapRender(){const el=$("mapSvg");el.innerHTML=makeMap();setView();}
function setZoom(f){if(!state.view)return;const v=state.view;const w=Math.min(state.baseView.w*2,Math.max(state.baseView.w/4,v.w/f)),h=Math.min(state.baseView.h*2,Math.max(state.baseView.h/4,v.h/f));v.x+=(v.w-w)/2;v.y+=(v.h-h)/2;v.w=w;v.h=h;setView();}
function setSelect(n){const s=state.data.slots.find(x=>x.number===Number(n));if(!s)return;state.selected=s.number;$("selNum").textContent=fmt(s.number);$("selName").textContent=s.nickname?.trim()||"미등록 자리";$("selSub").textContent=s.nickname?"연맹원 등록됨":"지휘센터 빈 자리";$("selX").textContent=s.x;$("selY").textContent=s.y;$("focusHelp").textContent="대표 좌표 X:"+s.x+" / Y:"+s.y+" · 2×2 지휘센터";$("editOpen").hidden=!state.serverReady||!state.token;document.querySelectorAll(".slot-group").forEach(g=>g.querySelector(".hq-tile")?.classList.toggle("selected",Number(g.dataset.number)===s.number));document.querySelectorAll(".slot-row").forEach(b=>b.classList.toggle("active",Number(b.dataset.number)===s.number));}
function listRender(){const el=$("slotList");el.innerHTML="";const q=state.search.trim().toLowerCase().replace(/\s+/g,"");const results=state.data.slots.filter(s=>(state.filter==="all"||(state.filter==="named"?!!s.nickname:!s.nickname))&&(!q||String(s.number).includes(q)||String(s.x)+","+s.y===q||("x"+s.x+"y"+s.y).includes(q)||s.nickname?.toLowerCase().includes(q)));
  $("listCount").textContent=results.length;for(const s of results){const b=document.createElement("button");b.type="button";b.className="slot-row"+(state.selected===s.number?" active":"");b.dataset.number=s.number;b.innerHTML=`<span class="row-no">${fmt(s.number)}</span><span class="row-body"><span class="row-name">${esc(s.nickname||"미등록 자리")}</span><span class="row-coords">X ${s.x} · Y ${s.y}</span></span><span class="row-status ${s.nickname?"filled":""}">${s.nickname?"등록":"빈자리"}</span>`;b.onclick=()=>{setSelect(s.number);if(window.innerWidth<961)$("mapStage").scrollIntoView({behavior:"smooth",block:"nearest"});};el.append(b);}if(!results.length)el.innerHTML='<div class="empty-list">조건에 맞는 자리가 없습니다.</div>';}
function render(){if(!state.data)return;const slots=state.data.slots;const occupied=slots.filter(s=>s.nickname?.trim()).length;$("countTotal").textContent=slots.length;$("countRegistered").textContent=occupied;$("countVacant").textContent=slots.length-occupied;$("modeStatus").textContent=state.serverReady?(state.token?"관리자":"실시간 조회"):"공개 조회";$("updated").textContent=state.serverReady?"서버 DB 동기화":"기본 지도 데이터";$("adminOpen").textContent=state.token&&state.serverReady?"관리자 로그아웃":"관리자 로그인";mapRender();listRender();setSelect(state.selected);}
async function apiRequest(path,opt={}){const headers={"Content-Type":"application/json",...(opt.headers||{})};if(state.token)headers.Authorization="Bearer "+state.token;const res=await fetch(url(path),{...opt,headers,cache:"no-store"});let body;try{body=await res.json();}catch{body={};}if(!res.ok){const e=new Error(body.error||"서버 요청 실패 ("+res.status+")");e.status=res.status;throw e;}return body;}
async function reload(){try{const cf=await fetch("./config.json?v="+Date.now(),{cache:"no-store"}).then(r=>r.ok?r.json():{}).catch(()=>({}));state.api=(cf.apiBase||"").trim();state.serverReady=false;let raw;if(state.api){try{raw=await apiRequest("/api/state");state.serverReady=true;state.version=raw.version;raw=raw.data;}catch(e){show("편집 서버에 연결할 수 없어 기본 공개 지도를 표시합니다: "+e.message,true);}}if(!raw){const resp=await fetch("./data.json?v="+Date.now(),{cache:"no-store"});if(!resp.ok)throw Error("지도 데이터 HTTP "+resp.status);raw=await resp.json();}if(!Array.isArray(raw.slots)||raw.slots.length!==100)throw Error("지도 데이터의 지휘센터 100개를 확인할 수 없습니다.");state.data=raw;if(!state.serverReady)state.token="";render();}catch(e){show("좌표를 불러오지 못했습니다: "+e.message,true);}}
const openDialog=id=>{$(id).hidden=false;document.body.style.overflow="hidden";};
const closeDialog=id=>{$(id).hidden=true;document.body.style.overflow="";};
function editOpen(){if(!state.token||!state.serverReady){show("관리자 인증 서버 연결 후 수정할 수 있습니다.",true);return;}const s=state.data.slots.find(s=>s.number===state.selected);$("editNumber").value=s.number;$("editNickname").value=s.nickname||"";$("editX").value=s.x;$("editY").value=s.y;$("editError").textContent="";openDialog("editDialog");$("editNickname").focus();}
function showLogin(){if(state.token){state.token="";sessionStorage.removeItem("bam_admin_session");render();show("관리자 로그아웃 완료");return;}if(!state.serverReady){show("공개 조회 페이지는 준비됐습니다. 연맹장 수정 기능은 별도 인증 서버 배포 후 열립니다.",true);return;}$("loginError").textContent="";$("pinInput").value="";openDialog("loginDialog");$("pinInput").focus();}
$("mapSvg").addEventListener("click",e=>{if(state.drag?.moved)return;const grp=e.target.closest("[data-number]");if(grp)setSelect(grp.dataset.number);});
$("mapSvg").addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const g=e.target.closest("[data-number]");if(g){e.preventDefault();setSelect(g.dataset.number);}});
$("mapSvg").addEventListener("pointerdown",e=>{if(!state.view)return;$("mapStage").classList.add("dragging");state.drag={atX:e.clientX,atY:e.clientY,view:{...state.view},moved:false};e.currentTarget.setPointerCapture(e.pointerId);});
$("mapSvg").addEventListener("pointermove",e=>{const d=state.drag;if(!d||!state.view)return;const dx=e.clientX-d.atX,dy=e.clientY-d.atY;if(Math.abs(dx)+Math.abs(dy)>7)d.moved=true;if(d.moved){state.view.x=d.view.x-dx/state.mapW()*d.view.w;state.view.y=d.view.y-dy/state.mapH()*d.view.h;setView();}});
state.mapW=()=>$("mapStage").clientWidth||1;state.mapH=()=>$("mapStage").clientHeight||1;
function stopDrag(){const was=state.drag;state.drag=null;$("mapStage").classList.remove("dragging");if(was?.moved){state.drag={moved:true};setTimeout(()=>{if(state.drag?.moved)state.drag=null;},20);}}
$("mapSvg").addEventListener("pointerup",stopDrag);$("mapSvg").addEventListener("pointercancel",stopDrag);
$("mapSvg").addEventListener("wheel",e=>{if(!state.view)return;e.preventDefault();setZoom(e.deltaY<0?1.15:1/1.15);},{passive:false});
$("zoomIn").onclick=()=>setZoom(1.27);$("zoomOut").onclick=()=>setZoom(1/1.27);$("resetZoom").onclick=()=>{state.view={...state.baseView};setView();};
$("refresh").onclick=async()=>{await reload();show("최신 배치도 데이터를 다시 불러왔습니다.");};
$("search").oninput=e=>{state.search=e.target.value;listRender();};
document.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));listRender();});
$("adminOpen").onclick=showLogin;$("editOpen").onclick=editOpen;
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeDialog(b.dataset.close));
document.querySelectorAll(".overlay").forEach(o=>o.onclick=e=>{if(e.target===o)closeDialog(o.id);});
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".overlay:not([hidden])").forEach(o=>closeDialog(o.id));});
$("loginForm").onsubmit=async e=>{e.preventDefault();const b=$("loginForm").querySelector("button");b.disabled=true;try{const r=await apiRequest("/api/login",{method:"POST",body:JSON.stringify({pin:$("pinInput").value})});state.token=r.token;sessionStorage.setItem("bam_admin_session",r.token);closeDialog("loginDialog");render();show("연맹장 관리 모드가 열렸습니다.");}catch(err){$("loginError").textContent=err.message;}finally{b.disabled=false;}};
$("editForm").onsubmit=async e=>{e.preventDefault();const button=$("editForm").querySelector("button");button.disabled=true;const payload={number:state.selected,nickname:$("editNickname").value.trim(),x:Number($("editX").value),y:Number($("editY").value),expected_version:state.version};try{const r=await apiRequest("/api/slot",{method:"PUT",body:JSON.stringify(payload)});state.version=r.version;state.data=r.data;closeDialog("editDialog");render();show(payload.number+"번 자리 저장 완료 · 모든 연맹원에게 반영됩니다.");}catch(err){$("editError").textContent=err.message;if(err.status===409)show("다른 관리자가 먼저 수정했습니다. 새로고침 후 다시 수정하세요.",true);if(err.status===401){state.token="";sessionStorage.removeItem("bam_admin_session");}}finally{button.disabled=false;}};
$("exportSvg").onclick=()=>{if(!state.data)return;const svg=$("mapSvg");const src='<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[state.baseView.x,state.baseView.y,state.baseView.w,state.baseView.h].join(" ")+'">'+makeMap()+'</svg>';const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([src],{type:"image/svg+xml;charset=utf-8"}));a.download="BAM_연맹_기지_100자리.svg";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),400);};
reload();
