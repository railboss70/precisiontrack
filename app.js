const TZ="America/Chicago";
const NAME="Matt Pitsenbarger";
const KEY="precisiontrack-v1";
const CATS=[
  "Site Activities",
  "Job Procurement",
  "Coaching / Training / Reviewing",
  "Customer Procurement",
  "Inspections",
  "Back Office / Indirect",
  "Skill Development"
];
const COLORS={
  "Skill Development":"#6b4ea2",
  "Site Activities":"#2f6fbf",
  "Back Office / Indirect":"#d4a017",
  "Customer Procurement":"#1f7a9c",
  "Inspections":"#2f9e6b",
  "Job Procurement":"#8a4b2f",
  "Coaching / Training / Reviewing":"#5b6b7c"
};
function now(){return new Date()}
function ymd(d){return new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(d)}
function parseYmd(s){const [y,m,da]=s.split("-").map(Number);return new Date(y,m-1,da,12)}
function startOfWeekMonday(d){
  const p=ymd(d).split("-").map(Number);
  const local=new Date(p[0],p[1]-1,p[2]);
  const day=local.getDay();
  local.setDate(local.getDate()+(day===0?-6:1-day));
  return ymd(local);
}
function addDays(s,n){const d=parseYmd(s);d.setDate(d.getDate()+n);return ymd(d)}
function fmtTime(iso){
  if(!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:TZ});
}
function hoursBetween(a,b){
  if(!a||!b) return 0;
  const ms=new Date(b)-new Date(a);
  if(ms<=0) return 0;
  return Math.round((ms/3600000)*100)/100;
}
function entryHours(e){
  if(e.manualHrs!=="" && e.manualHrs!=null) return Number(e.manualHrs)||0;
  if(e.in && e.out) return hoursBetween(e.in,e.out);
  if(e.in && !e.out) return hoursBetween(e.in, now().toISOString());
  return 0;
}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function load(){
  try{return JSON.parse(localStorage.getItem(KEY))||{weekStart:null,entries:[],mgmt:""}}
  catch{return {weekStart:null,entries:[],mgmt:""}}
}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
let state=load();
if(!state.weekStart) state.weekStart=startOfWeekMonday(now());
if(!state.entries) state.entries=[];
if(state.mgmt==null) state.mgmt="";
let pendingCat="";
let pendingNext=false;
function openEntry(){return state.entries.find(e=>e.in && !e.out)}
function weekDates(){return Array.from({length:7},(_,i)=>addDays(state.weekStart,i))}
function weekEntries(){const set=new Set(weekDates());return state.entries.filter(e=>set.has(e.date)).sort((a,b)=>(a.in||"").localeCompare(b.in||""))}
function openCatModal(){
  pendingCat="";
  document.getElementById("taskIn").value="";
  document.getElementById("notesIn").value="";
  const box=document.getElementById("catButtons");
  box.innerHTML="";
  CATS.forEach(c=>{
    const b=document.createElement("button");
    b.className="cat";
    b.textContent=c;
    b.onclick=()=>{pendingCat=c;[...box.children].forEach(x=>x.classList.remove("active"));b.classList.add("active")};
    box.appendChild(b);
  });
  document.getElementById("catModal").classList.add("open");
}
function startNewActivity(){
  const running=openEntry();
  if(running){ pendingNext=true; openOutModal(running); return; }
  pendingNext=false;
  openCatModal();
}
function closeModal(){document.getElementById("catModal").classList.remove("open")}
function closeOutModal(){
  document.getElementById("outModal").classList.remove("open");
  pendingNext=false;
}
function openOutModal(running){
  document.getElementById("outTaskLabel").textContent =
    (running.category||"") + " · " + (running.task||"Activity") + " — is this completed, still in progress, or a key accomplishment?";
  document.getElementById("statusOut").value = running.status || "Completed";
  document.getElementById("keyOut").checked = !!running.key;
  document.getElementById("notesOut").value = running.notes || "";
  document.getElementById("outModal").classList.add("open");
}
function confirmStart(){
  if(!pendingCat){alert("Pick a category.");return}
  const task=document.getElementById("taskIn").value.trim();
  if(!task){alert("Enter a description / task.");return}
  state.entries.push({
    id:uid(), date:ymd(now()), in:now().toISOString(), out:null,
    category:pendingCat, task,
    notes:document.getElementById("notesIn").value.trim(),
    status:"In Progress", key:false, manualHrs:""
  });
  save(); closeModal(); render();
}
function clockOut(){
  const running=openEntry();
  if(!running){alert("Nothing is running.");return}
  pendingNext=false;
  openOutModal(running);
}
function confirmClose(){
  const running=openEntry();
  if(!running){closeOutModal();return}
  running.out=now().toISOString();
  running.status=document.getElementById("statusOut").value;
  running.key=document.getElementById("keyOut").checked;
  const extra=document.getElementById("notesOut").value.trim();
  if(extra) running.notes=extra;
  save();
  document.getElementById("outModal").classList.remove("open");
  render();
  if(pendingNext){ pendingNext=false; openCatModal(); }
}
function shiftWeek(n){
  const d=parseYmd(state.weekStart);
  d.setDate(d.getDate()+n*7);
  state.weekStart=ymd(d);
  save(); render();
}
function showTab(name){
  ["today","week","report"].forEach(t=>{
    document.getElementById("tab-"+t).classList.toggle("hidden",t!==name);
    document.querySelector('.tab[data-tab="'+t+'"]').classList.toggle("active",t===name);
  });
  render();
}
function saveMgmt(){
  state.mgmt=document.getElementById("mgmtNotes").value;
  save();
  alert("Saved.");
}
function deleteEntry(id){
  if(!confirm("Delete this activity?")) return;
  state.entries=state.entries.filter(e=>e.id!==id);
  save(); render();
}
function toggleKey(id){
  const e=state.entries.find(x=>x.id===id);
  if(e){e.key=!e.key;save();render()}
}
function totals(){
  const list=weekEntries();
  let total=0;
  const by={};
  CATS.forEach(c=>by[c]={hrs:0,n:0});
  list.forEach(e=>{
    if(!by[e.category]) by[e.category]={hrs:0,n:0};
    if(e.out || e.manualHrs!==""){
      by[e.category].hrs=Math.round((by[e.category].hrs+entryHours(e))*100)/100;
      by[e.category].n++;
      total+=entryHours(e);
    }
  });
  const run=openEntry();
  let live=Math.round(total*100)/100;
  if(run && weekDates().includes(run.date) && run.manualHrs===""){
    const rh=hoursBetween(run.in, now().toISOString());
    live=Math.round((live+rh)*100)/100;
    if(!by[run.category]) by[run.category]={hrs:0,n:0};
    by[run.category].hrs=Math.round((by[run.category].hrs+rh)*100)/100;
    by[run.category].n++;
  }
  return {total:live, by, count:list.length};
}
function esc(s){return (s||"").replace(/[&<>"']/g,c=>({"&":"&","<":"<",">":">","\"":""","'":"&#39;"}[c]))}
function entryCard(e){
  const h=entryHours(e);
  const run=!e.out;
  return `<div class="entry">
    <b>${esc(e.category)}</b>
    ${esc(e.task)} · ${h.toFixed(2)} hrs ${run?"(running)":""}
    <div class="hint">${fmtTime(e.in)} – ${e.out?fmtTime(e.out):"now"} · ${esc(e.status)}${e.key?" · KEY":""}</div>
    ${e.notes?`<div class="hint">${esc(e.notes)}</div>`:""}
    <div class="clock" style="margin-top:6px">
      <button class="btn-ghost" style="margin:0;padding:8px" onclick="toggleKey('${e.id}')">${e.key?"Unmark key":"Mark key"}</button>
      <button class="btn-ghost" style="margin:0;padding:8px" onclick="deleteEntry('${e.id}')">Delete</button>
    </div>
  </div>`;
}
function buildReport(){
  const start=state.weekStart, end=addDays(start,6);
  const t=totals();
  const list=weekEntries();
  const startNice=parseYmd(start).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  const endNice=parseYmd(end).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  const gen=now().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  const status={Completed:0,"In Progress":0,Incomplete:0};
  list.forEach(e=>{status[e.status]=(status[e.status]||0)+1});
  const keys=list.filter(e=>e.key);
  const rows=CATS.map(c=>{
    const hrs=t.by[c]?t.by[c].hrs:0;
    const n=t.by[c]?t.by[c].n:0;
    const pct=t.total?((hrs/t.total)*100).toFixed(1):"0.0";
    return `<tr><td>${c}</td><td>${hrs.toFixed(1)}</td><td>${pct}%</td><td>${n}</td></tr>`;
  }).join("");
  const breakdown=CATS.map(c=>{
    const hrs=t.by[c]?t.by[c].hrs:0;
    if(!hrs) return "";
    const pct=t.total?Math.round((hrs/t.total)*100):0;
    const col=COLORS[c]||"#123a63";
    return `<div class="rowline"><span>${c}</span><span>${hrs.toFixed(1)}h · ${pct}%</span></div>
      <div class="bar"><i style="width:${pct}%;background:${col}"></i></div>`;
  }).join("");
  const log=list.map(e=>`<tr>
    <td>${e.date.slice(5)}</td>
    <td>${esc(e.category)}</td>
    <td>${esc(e.task)}</td>
    <td>${entryHours(e).toFixed(1)}</td>
    <td>${esc(e.status)}</td>
    <td>${e.key?"★":""}</td>
    <td>${esc(e.notes)}</td>
  </tr>`).join("") || `<tr><td colspan="7">No entries this week.</td></tr>`;
  const accom=keys.length?keys.map((e,i)=>`<p style="margin:6px 0"><b>${i+1}. ${esc(e.task)}</b> — ${esc(e.notes||e.category)} (${entryHours(e).toFixed(1)}h)</p>`).join(""):"<p>None marked this week.</p>";
  const notes=(document.getElementById("mgmtNotes").value||state.mgmt||"").trim() || "None recorded.";
  const html=`
    <div style="text-align:center">
      <img src="logo.jpg" style="height:42px;background:#fff">
      <h2>PRECISIONTRACK • WEEKLY TIME SUMMARY</h2>
      <div class="hint">Prepared for Management Review | Confidential – Internal Use Only</div>
    </div>
    <div class="meta">
      <span>Reporting Period <b>${startNice} – ${endNice}</b></span>
      <span>Total Hours <b>${t.total.toFixed(0)} hrs</b></span>
      <span>Generated <b>${gen}</b></span>
    </div>
    <h3 style="color:var(--navy);font-size:13px">1. TIME ALLOCATION BY CATEGORY</h3>
    <table>
      <tr><th>Category</th><th>Hours</th><th>% of Total</th><th># Entries</th></tr>
      ${rows}
      <tr><td><b>TOTAL</b></td><td><b>${t.total.toFixed(1)}</b></td><td><b>100%</b></td><td><b>${t.count}</b></td></tr>
    </table>
    <h3 style="color:var(--navy);font-size:13px">TIME BREAKDOWN</h3>
    ${breakdown}
    <h3 style="color:var(--navy);font-size:13px">2. TASK STATUS SUMMARY</h3>
    <table>
      <tr><th>Status</th><th>Count</th><th>Description</th></tr>
      <tr><td>Completed</td><td>${status.Completed||0}</td><td>Tasks finished this week</td></tr>
      <tr><td>In Progress</td><td>${status["In Progress"]||0}</td><td>Active / carried into next week</td></tr>
      <tr><td>Incomplete</td><td>${status.Incomplete||0}</td><td>Not started or blocked</td></tr>
    </table>
    <h3 style="color:var(--navy);font-size:13px">3. KEY ACCOMPLISHMENTS THIS WEEK</h3>
    ${accom}
    <h3 style="color:var(--navy);font-size:13px">4. NOTES / COMMENTS FOR MANAGEMENT</h3>
    <p style="white-space:pre-wrap">${esc(notes)}</p>
    <h3 style="color:var(--navy);font-size:13px">DAILY TIME LOG</h3>
    <table>
      <tr><th>Date</th><th>Category</th><th>Task</th><th>Hrs</th><th>Status</th><th>Key</th><th>Notes</th></tr>
      ${log}
    </table>
    <p class="hint" style="text-align:center;margin-top:10px">PrecisionTrack • STX Corporation – Railroad Construction Services • Confidential</p>
  `;
  document.getElementById("reportBox").innerHTML=html;
  return reportText(startNice,endNice,t,list,status,keys,notes);
}
function reportText(startNice,endNice,t,list,status,keys,notes){
  let lines=[];
  lines.push("PRECISIONTRACK • WEEKLY TIME SUMMARY");
  lines.push("Prepared for Management Review | Confidential – Internal Use Only");
  lines.push("Employee: "+NAME);
  lines.push("Reporting Period: "+startNice+" – "+endNice);
  lines.push("Total Hours: "+t.total.toFixed(1));
  lines.push("");
  lines.push("1. TIME ALLOCATION BY CATEGORY");
  CATS.forEach(c=>{
    const hrs=t.by[c]?t.by[c].hrs:0;
    const n=t.by[c]?t.by[c].n:0;
    const pct=t.total?((hrs/t.total)*100).toFixed(1):"0.0";
    lines.push("  "+c+": "+hrs.toFixed(1)+" hrs  "+pct+"%  ("+n+" entries)");
  });
  lines.push("  TOTAL: "+t.total.toFixed(1)+" hrs");
  lines.push("");
  lines.push("2. TASK STATUS SUMMARY");
  lines.push("  Completed: "+(status.Completed||0));
  lines.push("  In Progress: "+(status["In Progress"]||0));
  lines.push("  Incomplete: "+(status.Incomplete||0));
  lines.push("");
  lines.push("3. KEY ACCOMPLISHMENTS");
  if(!keys.length) lines.push("  None marked.");
  keys.forEach((e,i)=>lines.push("  "+(i+1)+". "+e.task+" — "+(e.notes||e.category)));
  lines.push("");
  lines.push("4. NOTES / COMMENTS FOR MANAGEMENT");
  lines.push("  "+(notes||"None"));
  lines.push("");
  lines.push("DAILY TIME LOG");
  list.forEach(e=>{
    lines.push("  "+e.date+" | "+e.category+" | "+e.task+" | "+entryHours(e).toFixed(1)+"h | "+e.status+(e.key?" | KEY":"")+(e.notes?" | "+e.notes:""));
  });
  lines.push("");
  lines.push("Submitted by: "+NAME);
  return lines.join("\n");
}
async function copyReport(){
  const text=buildReport();
  try{await navigator.clipboard.writeText(text);alert("Report copied as text.")}
  catch{alert("Copy failed. Use Print / Save PDF instead.")}
}
function printReport(){
  buildReport();
  const w=window.open("","_blank");
  w.document.write(`<html><head><title>PrecisionTrack Weekly Time Summary</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#1b2430} table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#0b2a4a;color:#fff;text-align:left;padding:6px} td{border-bottom:1px solid #d5dde7;padding:6px;vertical-align:top}
    h2{color:#0b2a4a;text-align:center}</style></head><body>${document.getElementById("reportBox").innerHTML}</body></html>`);
  w.document.close(); w.focus(); w.print();
}
function loadSample(){
  const start=startOfWeekMonday(now());
  state.weekStart=start;
  const mk=(off,cat,task,hrs,status,key,notes)=>{
    const date=addDays(start,off);
    return {id:uid(),date,in:null,out:null,category:cat,task,notes,status,key:!!key,manualHrs:String(hrs)};
  };
  state.entries=state.entries.filter(e=>!weekDates().includes(e.date));
  state.entries.push(
    mk(0,"Site Activities","JHA, housekeeping around office",1,"Completed",false,"Cleaned office, moved locked-out equipment."),
    mk(0,"Back Office / Indirect","Checking time",3.5,"Completed",false,""),
    mk(0,"Site Activities","Teams meeting platform",1,"Completed",false,"Discussing Fulcrum inspections."),
    mk(0,"Skill Development","ArcGIS training",2,"Completed",false,"Track schematics / GIS."),
    mk(0,"Back Office / Indirect","Management meeting",2.5,"Completed",false,"Covered many topics."),
    mk(1,"Site Activities","JHA safety meeting",1,"Completed",false,"Ties, cleanup, surfacing Track 3."),
    mk(1,"Back Office / Indirect","Spanish version of JHA",2,"Completed",true,"Spanish JHA for Calera. Gave Chapo updated form."),
    mk(1,"Customer Procurement","Dinner with Eric / Grayton Materials",4,"Completed",false,"Dinner and meeting went good."),
    mk(2,"Site Activities","Walked track 1,2,3 CSX storage",1.5,"Completed",false,"Checked crew and laydown yards."),
    mk(2,"Skill Development","ArcGIS heat map",3,"In Progress",false,"Cullman heat map and customer list."),
    mk(3,"Customer Procurement","ARCGIS / Grok / Railinc master list",6,"Completed",true,"Finished AL, GA, TN customer master list."),
    mk(4,"Skill Development","ARC GIS track schematic",5,"In Progress",false,"Track schematic."),
    mk(5,"Skill Development","ARC GIS",8,"Completed",true,"First track schematic and customer heat maps.")
  );
  state.mgmt="Productive week at site.\nJacob being back has allowed more time on ArcGIS.";
  save();
  document.getElementById("mgmtNotes").value=state.mgmt;
  showTab("report");
  buildReport();
}
function render(){
  document.getElementById("mgmtNotes").value=state.mgmt||"";
  const run=openEntry();
  document.getElementById("statusPill").className="pill "+(run?"on":"off");
  document.getElementById("statusPill").textContent=run?("Running · "+run.category):"No activity running";
  document.getElementById("elapsed").textContent=run?(run.task+" · "+entryHours(run).toFixed(2)+" hrs so far"):"Tap Clock In / Next to start an activity.";
  const today=ymd(now());
  const todays=state.entries.filter(e=>e.date===today).sort((a,b)=>(a.in||"").localeCompare(b.in||""));
  document.getElementById("todayList").innerHTML=todays.length?todays.map(entryCard).join(""):"<p class='hint'>No activities yet today.</p>";
  const start=state.weekStart,end=addDays(start,6);
  document.getElementById("weekLabel").textContent=
    parseYmd(start).toLocaleDateString("en-US",{month:"short",day:"numeric"})+" – "+
    parseYmd(end).toLocaleDateString("en-US",{month:"short",day:"numeric"});
  const t=totals();
  document.getElementById("tAll").textContent=t.total.toFixed(2)+" hrs";
  document.getElementById("catTotals").innerHTML=CATS.map(c=>{
    const hrs=t.by[c]?t.by[c].hrs:0;
    const n=t.by[c]?t.by[c].n:0;
    return `<div class="rowline"><span>${c}</span><span>${hrs.toFixed(1)}h · ${n}</span></div>`;
  }).join("");
  document.getElementById("weekList").innerHTML=weekEntries().length?weekEntries().map(entryCard).join(""):"<p class='hint'>No entries this week.</p>";
}
function tick(){
  document.getElementById("liveClock").textContent=now().toLocaleTimeString("en-US",{timeZone:TZ,hour:"numeric",minute:"2-digit",second:"2-digit"});
  const run=openEntry();
  if(run) document.getElementById("elapsed").textContent=run.task+" · "+entryHours(run).toFixed(2)+" hrs so far";
}
setInterval(tick,1000);
tick();
render();
