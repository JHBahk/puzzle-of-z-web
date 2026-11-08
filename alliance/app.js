"use strict";
const $=id=>document.getElementById(id);
const state={data:null,selected:1,filter:"all",search:"",view:null,baseView:null,drag:null,admin:document.body.dataset.admin==="1",token:"",githubSha:null,connected:false,busy:false};
const TOKEN_KEY="bam_alliance_git_pat_v1";
const GH_URL="https://api.github.com/repos/JHBahk/puzzle-of-z-web/contents/alliance/data.json";
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
function setSelect(n){const s=state.data.slots.find(x=>x.number===Number(n));if(!s)return;state.selected=s.number;$("selNum").textContent=fmt(s.number);$("selName").textContent=s.nickname?.trim()||"미등록 자리";$("selSub").textContent=s.nickname?"연맹원 등록됨":"지휘센터 빈 자리";$("selX").textContent=s.x;$("selY").textContent=s.y;$("focusHelp").textContent="대표 좌표 X:"+s.x+" / Y:"+s.y+" · 2×2 지휘센터";$("editOpen").hidden=!state.admin;document.querySelectorAll(".slot-group").forEach(g=>g.querySelector(".hq-tile")?.classList.toggle("selected",Number(g.dataset.number)===s.number));document.querySelectorAll(".slot-row").forEach(b=>b.classList.toggle("active",Number(b.dataset.number)===s.number));}
function listRender(){const el=$("slotList");el.innerHTML="";const q=state.search.trim().toLowerCase().replace(/\s+/g,"");const results=state.data.slots.filter(s=>(state.filter==="all"||(state.filter==="named"?!!s.nickname:!s.nickname))&&(!q||String(s.number).includes(q)||String(s.x)+","+s.y===q||("x"+s.x+"y"+s.y).includes(q)||s.nickname?.toLowerCase().includes(q)));
  $("listCount").textContent=results.length;for(const s of results){const b=document.createElement("button");b.type="button";b.className="slot-row"+(state.selected===s.number?" active":"");b.dataset.number=s.number;b.innerHTML=`<span class="row-no">${fmt(s.number)}</span><span class="row-body"><span class="row-name">${esc(s.nickname||"미등록 자리")}</span><span class="row-coords">X ${s.x} · Y ${s.y}</span></span><span class="row-status ${s.nickname?"filled":""}">${s.nickname?"등록":"빈자리"}</span>`;b.onclick=()=>{setSelect(s.number);if(window.innerWidth<961)$("mapStage").scrollIntoView({behavior:"smooth",block:"nearest"});};el.append(b);}if(!results.length)el.innerHTML='<div class="empty-list">조건에 맞는 자리가 없습니다.</div>';}
function render(){if(!state.data)return;
const slots=state.data.slots,occupied=slots.filter(s=>s.nickname?.trim()).length;
$("countTotal").textContent=slots.length;
$("countRegistered").textContent=occupied;
$("countVacant").textContent=slots.length-occupied;
$("modeStatus").textContent=state.admin?(state.connected?"GitHub 연결됨":"연결 필요"):"공개 조회";
$("updated").textContent=state.githubSha?"GitHub 최신 데이터":"공개 배치도";
if(state.admin)renderAuth();
mapRender();listRender();setSelect(state.selected);
}
const kstNow=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,19)+"+09:00";
function loadToken(){try{return localStorage.getItem(TOKEN_KEY)||"";}catch{return "";}}
function saveToken(t){try{localStorage.setItem(TOKEN_KEY,t);return true;}catch{return false;}}
function removeToken(){try{localStorage.removeItem(TOKEN_KEY);}catch{}}
function renderAuth(){
 if(!state.admin)return;
 const c=state.connected;
 $("authChip").textContent=c?"연결됨":"연결 필요";
 $("authChip").classList.toggle("connected",c);
 $("authStatus").textContent=c?"이 기기는 GitHub 저장소에 연결됐습니다. 좌표 수정 시 모든 연맹원에게 공유됩니다.":(state.token?"저장된 토큰을 확인할 수 없습니다. 토큰을 다시 연결해 주세요.":"최초 한 번만 이 웹 저장소 전용 GitHub 토큰을 등록하세요.");
 $("tokenForm").hidden=c;
 $("tokenDisconnect").hidden=!state.token;
}
function decodeGitHubBase64(b64){const b=atob(String(b64||"").replace(/\s+/g,""));return new TextDecoder().decode(Uint8Array.from(b,ch=>ch.charCodeAt(0)));}
function encodeGitHubBase64(text){const bytes=new TextEncoder().encode(text);let out="";const chunkSize=4096;for(let i=0;i<bytes.length;i+=chunkSize)out+=String.fromCharCode(...bytes.subarray(i,i+chunkSize));return btoa(out);}
async function githubRead(token=""){
 const headers={"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
 if(token)headers["Authorization"]="Bearer "+token;
 const response=await fetch(GH_URL+"?ref=main&_="+Date.now(),{headers,cache:"no-store"});
 let body={};try{body=await response.json();}catch{}
 if(!response.ok){
  const hint=response.status===401?"GitHub 토큰이 잘못되었거나 만료됐습니다.":response.status===403?"GitHub API 요청 제한 또는 토큰 권한을 확인하세요.":response.status===404?"대상 저장소를 찾을 수 없습니다. 토큰의 저장소 선택을 확인하세요.":"GitHub 데이터 읽기 실패 (HTTP "+response.status+").";
  const e=new Error(hint);e.status=response.status;throw e;
 }
 if(!body.sha||!body.content)throw Error("GitHub 파일 정보에 SHA 또는 데이터가 없습니다.");
 let data;try{data=JSON.parse(decodeGitHubBase64(body.content));}catch{throw Error("GitHub JSON을 읽을 수 없습니다.");}
 if(!data||!Array.isArray(data.slots)||data.slots.length!==100)throw Error("GitHub 좌표는 반드시 100개여야 합니다.");
 return {data,sha:body.sha};
}
async function publicFallback(){
 const urls=["https://raw.githubusercontent.com/JHBahk/puzzle-of-z-web/main/alliance/data.json?_="+Date.now(),"./data.json?_="+Date.now()];
 for(const url of urls){try{const r=await fetch(url,{cache:"no-store"});if(r.ok){const d=await r.json();if(Array.isArray(d.slots)&&d.slots.length===100)return {data:d,sha:null};}}catch{}}
 throw Error("GitHub 공개 지도 데이터를 불러오지 못했습니다.");
}
async function reload(){
 let snapshot=null;
 try{
  snapshot=await githubRead(state.admin?state.token:"");
  state.connected=Boolean(state.admin&&state.token);
 }catch(err){
  state.connected=false;
  if(state.admin&&state.token)show("연결한 토큰을 확인하지 못했습니다: "+err.message,true);
  try{snapshot=await githubRead("");}catch{snapshot=await publicFallback();}
 }
 if(!snapshot){show("좌표를 불러오지 못했습니다.",true);return false;}
 state.data=snapshot.data;state.githubSha=snapshot.sha;
 render();
 return true;
}
const openDialog=id=>{$(id).hidden=false;document.body.style.overflow="hidden";};
const closeDialog=id=>{$(id).hidden=true;document.body.style.overflow="";};
function editOpen(){
 if(!state.admin)return;
 if(!state.connected){show("먼저 GitHub 토큰을 한 번 연결해 주세요.",true);$("tokenForm").scrollIntoView({behavior:"smooth",block:"center"});$("githubToken").focus();return;}
 const p=state.data?.slots.find(s=>s.number===state.selected);if(!p)return;
 $("editNumber").value=p.number;$("editNickname").value=p.nickname||"";$("editX").value=p.x;$("editY").value=p.y;$("editError").textContent="";openDialog("editDialog");$("editNickname").focus();
}
function cells(p,outpost=false){const [u,v]=uv(p.x,p.y);return (outpost?[[u,v]]:[[u,v],[u-1,v],[u,v-1],[u-1,v-1]]).map(([a,b])=>a+":"+b);}
function inTerritory(d,p){const [u,v]=uv(p.x,p.y);
 return [{x:299,y:535,r:6},...d.outposts.map(o=>({...o,r:5}))].some(o=>{const [a,b]=uv(o.x,o.y);return Math.abs(a-u)<=o.r&&Math.abs(b-v)<=o.r;});}
function validateAll(d){
 if(!d||!Array.isArray(d.slots)||d.slots.length!==100||!Array.isArray(d.facilities)||!Array.isArray(d.outposts)||!Array.isArray(d.mountains))return "지휘센터 100개 데이터 형식을 확인하세요.";
 if(d.facilities.length!==5||d.outposts.length!==4)return "필수 연맹시설 또는 전초 수가 다릅니다.";
 const ids=new Set(),occupied=new Set();
 function take(p,isOutpost=false){
  if(!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.y<0||p.x>2000||p.y>2000||((p.x+p.y)%2))return "좌표가 게임 격자와 맞지 않습니다.";
  for(const c of cells(p,isOutpost)){if(occupied.has(c))return "건물·산·전초기지와 2×2 점유 칸이 겹칩니다.";occupied.add(c);}
  return "";
 }
 for(const f of d.facilities){const e=take(f);if(e)return e;}
 for(const m of d.mountains){const e=take(m);if(e)return e;}
 for(const o of d.outposts){const e=take(o,true);if(e)return e;}
 for(const p of d.slots){
  if(!Number.isInteger(p.number)||p.number<1||p.number>100||ids.has(p.number))return "1~100 번호가 중복되거나 누락됐습니다.";
  ids.add(p.number);
  if(typeof p.nickname!=="string"||[...p.nickname].length>24||/[\u0000-\u001F\u007F]/.test(p.nickname))return "닉네임은 24자 이내로 입력하세요.";
  if(!inTerritory(d,p))return p.number+"번 지휘센터가 연맹 녹색선 밖입니다.";
  const e=take(p);if(e)return p.number+"번: "+e;
 }
 return "";
}

function downloadFile(name,content,mime){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type:mime}));a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
async function githubWrite(draft,number){
 if(!state.admin||!state.connected||!state.token||!state.githubSha)throw Error("먼저 GitHub 토큰을 연결해야 합니다.");
 const body={message:"BAM alliance: update HQ "+number+" nickname and coordinates",content:encodeGitHubBase64(JSON.stringify(draft,null,2)+"\n"),sha:state.githubSha,branch:"main"};
 const r=await fetch(GH_URL,{method:"PUT",headers:{"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json","Authorization":"Bearer "+state.token},body:JSON.stringify(body),cache:"no-store"});
 let result={};try{result=await r.json();}catch{}
 if(!r.ok){let msg=r.status===401||r.status===403?"토큰 권한이 부족합니다. 이 저장소의 Contents 읽기·쓰기 권한을 확인하세요.":r.status===409||r.status===422?"다른 수정사항이 먼저 저장됐습니다. GitHub 새로고침 후 다시 수정하세요.":"GitHub 저장에 실패했습니다 (HTTP "+r.status+").";
  const e=new Error(msg);e.status=r.status;throw e;}
 if(!result.commit?.sha)throw Error("GitHub에서 저장 커밋을 확인하지 못했습니다.");
 // Read the actual committed data back before reporting success.
 let verified;
 try{verified=await githubRead(state.token);}catch(e){const error=new Error("저장 요청은 접수됐으나 GitHub 재확인에 실패했습니다. 다시 저장하지 말고 먼저 새로고침하세요.");error.status="UNVERIFIED";throw error;}
 const desired=draft.slots.find(s=>s.number===number);
 const actual=verified.data.slots.find(s=>s.number===number);
 if(!actual||actual.x!==desired.x||actual.y!==desired.y||(actual.nickname||"")!==(desired.nickname||"")){const e=new Error("GitHub 재조회 결과가 수정한 내용과 다릅니다. 새로고침 후 확인하세요.");e.status="UNVERIFIED";throw e;}
 state.data=verified.data;state.githubSha=verified.sha;render();return result.commit.sha;
}
$("mapSvg").addEventListener("click",e=>{if(state.drag?.moved)return;const grp=e.target.closest("[data-number]");if(grp)setSelect(grp.dataset.number);});
$("mapSvg").addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const g=e.target.closest("[data-number]");if(g){e.preventDefault();setSelect(g.dataset.number);}});
$("mapSvg").addEventListener("pointerdown",e=>{if(!state.view)return;$("mapStage").classList.add("dragging");state.drag={atX:e.clientX,atY:e.clientY,view:{...state.view},moved:false};e.currentTarget.setPointerCapture(e.pointerId);});
$("mapSvg").addEventListener("pointermove",e=>{const d=state.drag;if(!d||!state.view)return;const dx=e.clientX-d.atX,dy=e.clientY-d.atY;if(Math.abs(dx)+Math.abs(dy)>7)d.moved=true;if(d.moved){state.view.x=d.view.x-dx/state.mapW()*d.view.w;state.view.y=d.view.y-dy/state.mapH()*d.view.h;setView();}});
state.mapW=()=>$("mapStage").clientWidth||1;state.mapH=()=>$("mapStage").clientHeight||1;
function stopDrag(){const was=state.drag;state.drag=null;$("mapStage").classList.remove("dragging");if(was?.moved){state.drag={moved:true};setTimeout(()=>{if(state.drag?.moved)state.drag=null;},20);}}
$("mapSvg").addEventListener("pointerup",stopDrag);$("mapSvg").addEventListener("pointercancel",stopDrag);
$("mapSvg").addEventListener("wheel",e=>{if(!state.view)return;e.preventDefault();setZoom(e.deltaY<0?1.15:1/1.15);},{passive:false});
$("zoomIn").onclick=()=>setZoom(1.27);$("zoomOut").onclick=()=>setZoom(1/1.27);$("resetZoom").onclick=()=>{state.view={...state.baseView};setView();};
$("refresh").onclick=async()=>{try{const ok=await reload();if(ok)show(state.connected?"GitHub 토큰 연결과 최신 좌표를 확인했습니다.":"GitHub 최신 공개 좌표를 불러왔습니다.");}catch(e){show("새로고침 실패: "+e.message,true);}};
$("search").oninput=e=>{state.search=e.target.value;listRender();};
document.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));listRender();});
$("editOpen").onclick=editOpen;
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeDialog(b.dataset.close));
document.querySelectorAll(".overlay").forEach(o=>o.onclick=e=>{if(e.target===o)closeDialog(o.id);});
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".overlay:not([hidden])").forEach(o=>closeDialog(o.id));});
$("editForm").onsubmit=async e=>{
 e.preventDefault();if(!state.admin||state.busy)return;
 const number=state.selected,nickname=$("editNickname").value.trim(),x=Number($("editX").value),y=Number($("editY").value);
 const draft=JSON.parse(JSON.stringify(state.data)),p=draft.slots.find(s=>s.number===number);
 p.x=x;p.y=y;p.nickname=nickname;
 const err=validateAll(draft);if(err){$("editError").textContent=err;return;}
 const prev=state.data.slots.find(s=>s.number===number);
 if(prev.x===x&&prev.y===y&&(prev.nickname||"")===nickname){closeDialog("editDialog");return;}
 draft.updated_at_kst=kstNow();
 const button=$("editForm").querySelector("button[type=submit]");state.busy=true;button.disabled=true;button.textContent="GitHub 저장 중...";
 try{await githubWrite(draft,number);closeDialog("editDialog");show(number+"번 GitHub 저장·재조회 완료! 다른 연맹원도 새로고침하면 보입니다.");}
 catch(error){$("editError").textContent=error.message;if(error.status===409||error.status===422||error.status==="UNVERIFIED")show("저장 상태를 다시 확인해 주세요.",true);}
 finally{state.busy=false;button.disabled=false;button.textContent="변경사항 저장";}
};
$("exportSvg").onclick=()=>{if(!state.data)return;const src='<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[state.baseView.x,state.baseView.y,state.baseView.w,state.baseView.h].join(" ")+'">'+makeMap()+'</svg>';downloadFile("BAM_연맹_기지_100자리.svg",src,"image/svg+xml;charset=utf-8");};
if(state.admin){
 $("tokenForm").onsubmit=async e=>{e.preventDefault();if(state.busy)return;const t=$("githubToken").value.trim();
  if(t.length<20){show("GitHub에서 발급한 긴 토큰을 입력하세요. 숫자 7777은 GitHub 토큰이 아닙니다.",true);return;}
  state.busy=true;const btn=$("tokenConnect");btn.disabled=true;btn.textContent="연결 확인 중...";
  try{const doc=await githubRead(t);const old=state.token;state.token=t;state.connected=true;state.githubSha=doc.sha;state.data=doc.data;
   if(!saveToken(t)){state.token=old;state.connected=false;throw Error("이 브라우저는 토큰 자동 저장을 허용하지 않습니다. 브라우저 설정을 확인하세요.");}
   $("githubToken").value="";render();show("GitHub 연결 확인 완료. 이제 좌표 수정 시 저장소에 직접 기록됩니다.");}
  catch(err){show("GitHub 토큰 연결 실패: "+err.message,true);}
  finally{state.busy=false;btn.disabled=false;btn.textContent="한 번 연결하기";}
 };
 $("tokenDisconnect").onclick=async()=>{if(!confirm("이 기기에 저장된 GitHub 토큰 연결을 해제할까요? 좌표 데이터는 유지됩니다."))return;removeToken();state.token="";state.connected=false;await reload();show("이 기기의 GitHub 토큰 연결을 해제했습니다.");};
 $("exportJson").onclick=()=>{if(!state.data)return;downloadFile("BAM_연맹_좌표_100자리_백업.json",JSON.stringify(state.data,null,2)+"\n","application/json;charset=utf-8");show("현재 GitHub 좌표 데이터를 백업했습니다.");};
 state.token=loadToken();
}
reload().catch(err=>show("GitHub 데이터 읽기 실패: "+err.message,true));
