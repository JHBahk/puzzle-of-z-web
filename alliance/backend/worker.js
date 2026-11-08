// BAM Alliance API — independent D1 database; no connection to raid targets.
const ALLOWED_ORIGINS=new Set(["https://jhbahk.github.io","http://localhost:8000","http://127.0.0.1:8000","http://localhost:5173"]);
const SEED_URL="https://raw.githubusercontent.com/JHBahk/puzzle-of-z-web/main/alliance/data.json";
const encoder=new TextEncoder();
const strBytes=x=>encoder.encode(String(x));
const b64url=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const from64=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
const json=(obj,status=200,origin="",extra={})=>new Response(JSON.stringify(obj),{status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store","vary":"Origin",...(ALLOWED_ORIGINS.has(origin)?{"access-control-allow-origin":origin}:{}),...extra}});
const error=(message,status,origin)=>json({error:message},status,origin);
const kst=()=>new Date(Date.now()+9*60*60*1000).toISOString().replace("Z","+09:00");
function validData(d){return d&&Array.isArray(d.slots)&&d.slots.length===100&&Array.isArray(d.facilities)&&Array.isArray(d.outposts)&&Array.isArray(d.mountains);}
async function readState(env){let row=await env.DB.prepare("SELECT data_json,version FROM app_state WHERE id=1").first();if(!row){const response=await fetch(SEED_URL,{headers:{"Accept":"application/json"},cache:"no-store"});if(!response.ok)throw Error("Seed data unavailable");const d=await response.json();if(!validData(d))throw Error("Seed data invalid");await env.DB.prepare("INSERT OR IGNORE INTO app_state(id,version,data_json) VALUES(1,1,?)").bind(JSON.stringify(d)).run();row=await env.DB.prepare("SELECT data_json,version FROM app_state WHERE id=1").first();}return {data:JSON.parse(row.data_json),version:Number(row.version)};}
async function sign(text,secret){const key=await crypto.subtle.importKey("raw",strBytes(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64url(await crypto.subtle.sign("HMAC",key,strBytes(text)));}
async function makeToken(secret){const body=b64url(strBytes(JSON.stringify({role:"admin",exp:Math.floor(Date.now()/1000)+8*3600,nonce:crypto.randomUUID()})));return body+"."+await sign(body,secret);}
async function isAdmin(request,env){const v=request.headers.get("Authorization")||"";if(!v.startsWith("Bearer ")||!env.SESSION_SECRET)return false;const [body,sig]=v.slice(7).split(".");if(!body||!sig)return false;const actual=await sign(body,env.SESSION_SECRET);if(sig.length!==actual.length)return false;let diff=0;for(let i=0;i<sig.length;i++)diff|=sig.charCodeAt(i)^actual.charCodeAt(i);if(diff)return false;try{const p=JSON.parse(new TextDecoder().decode(from64(body)));return p.role==="admin"&&p.exp>Math.floor(Date.now()/1000);}catch{return false;}}
async function safeBody(request,max=3000){if(Number(request.headers.get("content-length")||0)>max)throw Error("입력 크기 초과");const s=await request.text();if(s.length>max)throw Error("입력 크기 초과");return JSON.parse(s);}
function samePin(a,b){const x=strBytes(a),y=strBytes(b);let diff=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]||0)^(y[i]||0);return diff===0;}
async function ipKey(req,secret){const ip=req.headers.get("CF-Connecting-IP")||"unknown";return await sign(ip,secret);}
async function checkLogin(req,env,origin){if(!env.ADMIN_PIN||!env.SESSION_SECRET)return error("관리 서버 비밀번호 설정이 필요합니다.",503,origin);let body;try{body=await safeBody(req,300);}catch{return error("올바른 비밀번호를 입력하세요.",400,origin);}const key=await ipKey(req,env.SESSION_SECRET),now=Date.now();let a=await env.DB.prepare("SELECT failures,window_start,locked_until FROM login_limits WHERE ip_hash=?").bind(key).first();if(a&&Number(a.locked_until)>now)return error("로그인 시도 제한 중입니다. 15분 뒤 다시 시도하세요.",429,origin);
 if(!samePin(String(body.pin||""),env.ADMIN_PIN)){const fresh=!a||now-Number(a.window_start)>15*60*1000;const failures=fresh?1:Number(a.failures)+1;const locked=failures>=5?now+15*60*1000:0;await env.DB.prepare("INSERT INTO login_limits(ip_hash,failures,window_start,locked_until) VALUES(?,?,?,?) ON CONFLICT(ip_hash) DO UPDATE SET failures=excluded.failures,window_start=excluded.window_start,locked_until=excluded.locked_until").bind(key,failures,fresh?now:Number(a.window_start),locked).run();return error("비밀번호가 올바르지 않습니다.",401,origin);}
 await env.DB.prepare("DELETE FROM login_limits WHERE ip_hash=?").bind(key).run();return json({token:await makeToken(env.SESSION_SECRET),expires_in:28800},200,origin);
}
function occupiedCells(x,y,isOutpost=false){const u=(x+y)/2,v=(y-x)/2;return (isOutpost?[[u,v]]:[[u,v],[u-1,v],[u,v-1],[u-1,v-1]]).map(([a,b])=>a+":"+b);}
function inTerritory(d,x,y){const [u,v]=[(x+y)/2,(y-x)/2];const sources=[{x:299,y:535,r:6},...d.outposts.map(o=>({...o,r:5}))];return sources.some(o=>{const a=(o.x+o.y)/2,b=(o.y-o.x)/2;return Math.abs(a-u)<=o.r&&Math.abs(b-v)<=o.r;});}
function validateMove(d,number,x,y,nickname){if(!Number.isInteger(number)||number<1||number>100)return "번호가 올바르지 않습니다.";if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>2000||y>2000||((x+y)%2))return "X·Y는 같은 격자에 속하는 정수 좌표여야 합니다.";if(typeof nickname!=="string"||[...nickname].length>24||/[\u0000-\u001F\u007F]/.test(nickname))return "닉네임은 24자 이내로 입력하세요.";if(!inTerritory(d,x,y))return "지휘센터 대표 좌표가 녹색 연맹 영역 밖입니다.";const used=new Set(),take=(obj,out=false)=>{for(const z of occupiedCells(obj.x,obj.y,out)){if(used.has(z))return false;used.add(z);}return true;};for(const f of [...d.facilities,...d.mountains])if(!take(f))return "시설 데이터에 충돌이 있습니다.";for(const f of d.outposts)if(!take(f,true))return "전초 데이터에 충돌이 있습니다.";for(const s of d.slots){const test=s.number===number?{x,y}:s;if(!take(test))return "다른 지휘센터·산·연맹 시설과 2×2 칸이 겹칩니다.";}return "";}
async function saveSlot(req,env,origin){if(!await isAdmin(req,env))return error("관리자 로그인이 만료됐습니다.",401,origin);let body;try{body=await safeBody(req,1500);}catch{return error("저장할 내용을 확인하세요.",400,origin);}const {data,version}=await readState(env);if(Number(body.expected_version)!==version)return error("다른 사람이 먼저 수정했습니다. 새로고침하세요.",409,origin);const number=Number(body.number),x=Number(body.x),y=Number(body.y),nickname=String(body.nickname??"").trim();const msg=validateMove(data,number,x,y,nickname);if(msg)return error(msg,400,origin);const target=data.slots.find(s=>s.number===number);if(!target)return error("번호를 찾을 수 없습니다.",404,origin);
 const before={number:target.number,x:target.x,y:target.y,nickname:target.nickname||""};if(before.x===x&&before.y===y&&before.nickname===nickname)return json({data,version,unchanged:true},200,origin);
 target.x=x;target.y=y;target.nickname=nickname;data.updated_at_kst=kst();
 const result=await env.DB.prepare("UPDATE app_state SET data_json=?,version=version+1 WHERE id=1 AND version=?").bind(JSON.stringify(data),version).run();
 if(!result.meta?.changes)return error("다른 사람이 먼저 수정했습니다. 새로고침하세요.",409,origin);
 await env.DB.prepare("INSERT INTO audit_log(changed_at_kst,slot_number,before_json,after_json) VALUES(?,?,?,?)").bind(data.updated_at_kst,number,JSON.stringify(before),JSON.stringify({number,x,y,nickname})).run();
 return json({data,version:version+1},200,origin);
}
export default {async fetch(request,env){const origin=request.headers.get("Origin")||"",path=new URL(request.url).pathname;try{
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":ALLOWED_ORIGINS.has(origin)?origin:"null","access-control-allow-methods":"GET,POST,PUT,OPTIONS","access-control-allow-headers":"Authorization,Content-Type","access-control-max-age":"600","vary":"Origin"}});
 if(path==="/api/health"&&request.method==="GET")return json({ok:true,service:"bam-alliance",time:kst()},200,origin);
 if(path==="/api/state"&&request.method==="GET"){const s=await readState(env);return json(s,200,origin);}
 if((path==="/api/login"||path==="/api/slot")&&!ALLOWED_ORIGINS.has(origin))return error("허용되지 않은 사이트입니다.",403,origin);
 if(path==="/api/login"&&request.method==="POST")return await checkLogin(request,env,origin);
 if(path==="/api/slot"&&request.method==="PUT")return await saveSlot(request,env,origin);
 return error("찾을 수 없는 주소입니다.",404,origin);
 }catch(e){console.error("BAM API request failure",e);return error("서버 요청 중 오류가 발생했습니다.",500,origin);}}};
