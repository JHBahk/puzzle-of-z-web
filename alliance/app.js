"use strict";
const $=id=>document.getElementById(id);
const state={data:null,selected:1,filter:"all",search:"",view:null,baseView:null,drag:null,admin:document.body.dataset.admin==="1",isLocal:false};
const LOCAL_KEY="bam_alliance_local_v2";
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
$("modeStatus").textContent=state.admin?"이 기기 편집":(state.isLocal?"이 기기 수정":"공개 조회");
$("updated").textContent=state.isLocal?"브라우저에 저장된 수정본":(state.admin?"기본 공개 데이터":"GitHub 공개 데이터");
mapRender();listRender();setSelect(state.selected);
}
const kstNow=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,19)+"+09:00";
function saveLocal(data){try{localStorage.setItem(LOCAL_KEY,JSON.stringify(data));state.isLocal=true;return true;}catch(e){show("기기 저장에 실패했습니다. JSON 파일로 내보내기를 이용해 주세요.",true);return false;}}
function loadLocal(){try{const d=JSON.parse(localStorage.getItem(LOCAL_KEY)||"null");return d&&Array.isArray(d.slots)&&d.slots.length===100?d:null;}catch{return null;}}
function clearLocal(){try{localStorage.removeItem(LOCAL_KEY);state.isLocal=false;}catch(e){show("브라우저 저장 데이터를 삭제하지 못했습니다.",true);}}
async function reload(){
try{
 const r=await fetch("./data.json?v="+Date.now(),{cache:"no-store"});
 if(!r.ok)throw Error("GitHub 공개 좌표 HTTP "+r.status);
 const remote=await r.json();
 if(!Array.isArray(remote.slots)||remote.slots.length!==100)throw Error("공개 좌표가 100개가 아닙니다.");
 const local=loadLocal(),rt=Date.parse(remote.updated_at_kst||"")||0,lt=Date.parse(local?.updated_at_kst||"")||0;
 if(local&&rt>lt){clearLocal();state.data=remote;state.isLocal=false;}
 else {state.data=local||remote;state.isLocal=!!local;}
 render();
}catch(err){const local=loadLocal();if(local){state.data=local;state.isLocal=true;render();show("공개 데이터 연결 실패: 이 기기의 저장본을 표시합니다.",true);}
 else show("좌표를 불러오지 못했습니다: "+err.message,true);}
}
const openDialog=id=>{$(id).hidden=false;document.body.style.overflow="hidden";};
const closeDialog=id=>{$(id).hidden=true;document.body.style.overflow="";};
function editOpen(){if(!state.admin)return;const p=state.data.slots.find(s=>s.number===state.selected);
$("editNumber").value=p.number;$("editNickname").value=p.nickname||"";$("editX").value=p.x;$("editY").value=p.y;$("editError").textContent="";openDialog("editDialog");$("editNickname").focus();}
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
$("mapSvg").addEventListener("click",e=>{if(state.drag?.moved)return;const grp=e.target.closest("[data-number]");if(grp)setSelect(grp.dataset.number);});
$("mapSvg").addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const g=e.target.closest("[data-number]");if(g){e.preventDefault();setSelect(g.dataset.number);}});
$("mapSvg").addEventListener("pointerdown",e=>{if(!state.view)return;$("mapStage").classList.add("dragging");state.drag={atX:e.clientX,atY:e.clientY,view:{...state.view},moved:false};e.currentTarget.setPointerCapture(e.pointerId);});
$("mapSvg").addEventListener("pointermove",e=>{const d=state.drag;if(!d||!state.view)return;const dx=e.clientX-d.atX,dy=e.clientY-d.atY;if(Math.abs(dx)+Math.abs(dy)>7)d.moved=true;if(d.moved){state.view.x=d.view.x-dx/state.mapW()*d.view.w;state.view.y=d.view.y-dy/state.mapH()*d.view.h;setView();}});
state.mapW=()=>$("mapStage").clientWidth||1;state.mapH=()=>$("mapStage").clientHeight||1;
function stopDrag(){const was=state.drag;state.drag=null;$("mapStage").classList.remove("dragging");if(was?.moved){state.drag={moved:true};setTimeout(()=>{if(state.drag?.moved)state.drag=null;},20);}}
$("mapSvg").addEventListener("pointerup",stopDrag);$("mapSvg").addEventListener("pointercancel",stopDrag);
$("mapSvg").addEventListener("wheel",e=>{if(!state.view)return;e.preventDefault();setZoom(e.deltaY<0?1.15:1/1.15);},{passive:false});
$("zoomIn").onclick=()=>setZoom(1.27);$("zoomOut").onclick=()=>setZoom(1/1.27);$("resetZoom").onclick=()=>{state.view={...state.baseView};setView();};
$("refresh").onclick=async()=>{await reload();show(state.isLocal?"이 기기 저장본을 다시 불러왔습니다.":"GitHub 공개 데이터를 다시 불러왔습니다.");};
$("search").oninput=e=>{state.search=e.target.value;listRender();};
document.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));listRender();});
$("editOpen").onclick=editOpen;
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeDialog(b.dataset.close));
document.querySelectorAll(".overlay").forEach(o=>o.onclick=e=>{if(e.target===o)closeDialog(o.id);});
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".overlay:not([hidden])").forEach(o=>closeDialog(o.id));});
$("editForm").onsubmit=e=>{e.preventDefault();if(!state.admin)return;
const number=state.selected;
const nickname=$("editNickname").value.trim(),x=Number($("editX").value),y=Number($("editY").value);
const draft=JSON.parse(JSON.stringify(state.data)),p=draft.slots.find(s=>s.number===number);
p.x=x;p.y=y;p.nickname=nickname;const err=validateAll(draft);
if(err){$("editError").textContent=err;return;}
const existing=state.data.slots.find(s=>s.number===number);
if(existing.x===x&&existing.y===y&&(existing.nickname||"")===nickname){closeDialog("editDialog");return;}
draft.updated_at_kst=kstNow();
if(!saveLocal(draft))return;
state.data=draft;closeDialog("editDialog");render();show(number+"번 저장 완료 · 이 기기에만 저장됐습니다. 전체 공유는 JSON 내보내기 후 전달해 주세요.");
};
$("exportSvg").onclick=()=>{if(!state.data)return;const src='<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[state.baseView.x,state.baseView.y,state.baseView.w,state.baseView.h].join(" ")+'">'+makeMap()+'</svg>';downloadFile("BAM_연맹_기지_100자리.svg",src,"image/svg+xml;charset=utf-8");};
if(state.admin){
 $("exportJson").onclick=()=>{if(!state.data)return;downloadFile("BAM_연맹_좌표_100자리.json",JSON.stringify(state.data,null,2)+"\n","application/json;charset=utf-8");show("JSON 파일을 저장했습니다. 전체 공개 반영은 파일을 이 채팅에 보내 주세요.");};
 $("importJson").onclick=()=>$("importFile").click();
 $("importFile").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{
  if(f.size>200000)throw Error("파일 크기가 너무 큽니다.");
  const next=JSON.parse(await f.text()),err=validateAll(next);
  if(err)throw Error(err);
  if(!confirm("가져온 100자리 JSON으로 이 기기의 편집 내용을 교체할까요?"))return;
  next.updated_at_kst=kstNow();
  if(!saveLocal(next))return;
  state.data=next;render();show("JSON 가져오기 완료 · 이 기기에서만 반영됐습니다.");
 }catch(err){show("JSON 가져오기 실패: "+err.message,true);}finally{e.target.value="";}};
 $("clearLocal").onclick=async()=>{if(!confirm("이 기기의 닉네임·좌표 수정 내용을 지우고 GitHub 공개 원본으로 돌아갈까요?\n먼저 JSON 내보내기로 백업하는 것을 권장합니다."))return;
 clearLocal();await reload();show("이 기기의 편집 내용을 초기화했습니다.");
 };
}
reload();
