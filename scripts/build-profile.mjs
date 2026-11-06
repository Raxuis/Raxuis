import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { personalPanels } from './personal-panels.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(await readFile(path.join(root, 'profile.config.json'), 'utf8'));
const colors = config.theme;
const target = path.join(root, 'profile/generated');
const width = 880;
const xml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[char]));
const text = (x,y,value,size=13,color=colors.text1,extra='') => `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" ${extra}>${xml(value)}</text>`;
const box = (x,y,w,h,color=colors.page) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
const rule = (x,y,w) => `<path d="M${x} ${y}h${w}" stroke="${colors.line}"/>`;
const divider = (x,y,h) => `<path d="M${x} ${y}v${h}" stroke="${colors.line}"/>`;
const muted = (x,y,value) => text(x,y,value,11,colors.text3,'letter-spacing=".5"');
function panel(w,h,title,body) {
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title"><title id="title">${xml(title)}</title><style>text{font-family:Menlo,Consolas,monospace;font-weight:400}.sans{font-family:Arial,Helvetica,sans-serif}@media(prefers-reduced-motion:reduce){.animated{display:none}.still{display:inline}}</style>${box(0,0,w,h)}<g>${body}</g><rect x=".5" y=".5" width="${w-1}" height="${h-1}" rx="10" fill="none" stroke="${colors.line}"/></svg>\n`;
}
function bar(w,title,note='') {
 return box(0,0,w,38,colors.panel)+rule(0,37.5,w)+text(12,24,title)+text(w-12,24,note,12,colors.text3,'text-anchor="end"');
}
function metric(x,y,w,h,label,value,subtitle='',accent=false) {
 return divider(x,y,h)+rule(x,y+h,w)+muted(x+16,y+26,label.toUpperCase())+text(x+16,y+62,value,24,accent?colors.accent:colors.text1)+(subtitle?text(x+16,y+84,subtitle,12,colors.text3):'');
}
function shorten(value,max) {
 const s=String(value||'');return s.length<=max?s:s.slice(0,max-1)+'…';
}
function lines(value,max=46,count=2) {
 const words=String(value).split(/\s+/),result=[];let current='';
 for(const word of words){if(current.length+word.length+1>max&&current){result.push(current);current=word}else current=current?current+' '+word:word;}
 if(current)result.push(current);
 return result.length>count?[...result.slice(0,count-1),shorten(result.slice(count-1).join(' '),max)]:result;
}
let snapshot;
try{snapshot=JSON.parse(await readFile(path.join(root,'profile/stats.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const repos=snapshot?.repositoryData||[];
const selected=config.github.moreRepos.map(name=>repos.find(r=>r.name===name)).filter(Boolean);
const palette=colors.auroraPalette;

function header() {
 const body = muted(30,38,'RAXUIS / PERSONAL SPACE')+
 text(850,38,'CODE · PRODUCTS · CURIOSITY',11,colors.text3,'text-anchor="end"')+
 text(28,153,config.profile.name,108,colors.text1,'class="sans" letter-spacing="-6"')+
 text(32,201,config.profile.intro,24,colors.text2,'class="sans"')+
 rule(30,238,820)+
 muted(32,270,'CURRENTLY')+text(32,298,config.profile.status,14)+
 divider(530,257,58)+muted(552,270,'PUBLIC REPOS')+text(552,302,snapshot?.publicRepositories??'—',27)+
 divider(704,257,58)+muted(726,270,'FOLLOWERS')+text(726,302,snapshot?.followers??'—',27);
 return panel(width,340,`${config.profile.name} — ${config.profile.intro}`,body);
}
function project(p){
 const w=440,desc=lines(p.description,44);
 const body=muted(26,35,p.category)+
 text(26,93,p.name,42,colors.text1,'class="sans" letter-spacing="-1"')+
 desc.map((line,i)=>text(26,130+i*23,line,15,colors.text2,'class="sans"')).join('')+
 text(26,195,p.stack[0],12,colors.text3)+text(26,216,p.stack[1],12,colors.text3)+
 `<rect x="26" y="243" width="168" height="37" rx="18.5" fill="${colors.accent}"/>`+
 text(110,267,p.cta+' ↗',13,colors.buttonText,'text-anchor="middle"');
 return panel(w,306,`${p.name}: ${p.description}`,body);
}
function repoTable(){
 const body=bar(width,'the workbench',`${selected.length} public projects`)+muted(12,60,'REPOSITORY')+muted(225,60,'DESCRIPTION')+muted(610,60,'LANGUAGE')+muted(790,60,'STARS')+
 selected.map((r,i)=>{const y=70+i*52;return rule(0,y+52,width)+text(12,y+31,shorten(r.name,23))+text(225,y+31,shorten(r.description,48),13,colors.text2,'class="sans"')+text(610,y+31,r.primaryLanguage?.name||'mixed',12)+text(790,y+31,`★ ${r.stargazerCount}`,12);}).join('');
 return panel(width,70+selected.length*52,'Selected repositories by Raxuis',body);
}
function streakInfo(){
 const days=snapshot.weeks.flatMap(w=>w.contributionDays).filter(d=>d.date<=snapshot.updatedAt).sort((a,b)=>a.date.localeCompare(b.date));
 let longest=[],active=[];
 for(const d of days){active=d.contributionCount>0?[...active,d]:[];if(active.length>longest.length)longest=active;}
 let last=days.length-1;
 if(days[last]?.date===snapshot.updatedAt&&!days[last].contributionCount)last--;
 let current=[];
 while(last>=0&&days[last].contributionCount>0)current.unshift(days[last--]);
 return {days,longest,current};
}
const shortDate=d=>new Date(d+'T00:00:00Z').toLocaleDateString('en-US',{month:'short',day:'2-digit',timeZone:'UTC'});
const span=days=>days.length?`${shortDate(days[0].date)} – ${shortDate(days.at(-1).date)}`:'no active streak';
function streak(){
 const {days,current,longest}=streakInfo();
 const offset=new Date(days[0].date+'T00:00:00Z').getUTCDay();
 const grid=days.map((d,i)=>{
  const n=d.contributionCount,level=n===0?0:n<3?1:n<7?2:n<12?3:4;
  const fill=[colors.well,palette[1],palette[2],palette[4],palette[5]][level];
  return `<rect x="${44+Math.floor((i+offset)/7)*15}" y="${162+(i+offset)%7*15}" width="11" height="11" fill="${fill}"><title>${d.date}: ${n} contributions</title></rect>`;
 }).join('');
 return panel(width,278,'Contribution calendar for the past year',bar(width,'showing up, day after day',`updated ${snapshot.updatedAt}`)+
 metric(0,38,width/3,100,'Contributions',snapshot.contributions.toLocaleString('en-US'),'last 12 months')+
 metric(width/3,38,width/3,100,'Current streak',`${current.length} days`,span(current),true)+metric(width*2/3,38,width/3,100,'Longest / year',`${longest.length} days`,span(longest))+grid);
}
function stats(){
 const counts=new Map();for(const r of repos)if(r.primaryLanguage)counts.set(r.primaryLanguage.name,(counts.get(r.primaryLanguage.name)||0)+1);
 const top=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,5),sum=top.reduce((n,[,count])=>n+count,0)||1;
 const shades=[colors.accent,palette[4],palette[3],palette[2],colors.text3];let x=16;
 let body=bar(width,'in numbers',`github.com/${config.github.username}`);
 for(const [i,[label,n]]of [['Stars earned',snapshot.stars],['Commits / year',snapshot.commits],['PRs / year',snapshot.pulls],['Issues / year',snapshot.issues]].entries())body+=metric(i*220,38,220,90,label,n);
 body+=muted(16,155,'TOP LANGUAGES BY REPO');
 for(const [i,[language,count]] of top.entries()){
  const w=count/sum*848;body+=box(x,168,w,10,shades[i]);x+=w;
  body+=box(16+i*169.6,198,8,8,shades[i])+text(30+i*169.6,206,`${language} ${Math.round(count/sum*100)}%`,12,colors.text2);
 }
 return panel(width,228,'GitHub statistics: stars on public non-fork repositories, past-year contributions, top-five languages by repository count',body);
}
await mkdir(target,{recursive:true});
const version=createHash('sha256').update(JSON.stringify(config)).update(JSON.stringify(snapshot??null)).update(await readFile(fileURLToPath(import.meta.url))).update(await readFile(new URL('./personal-panels.mjs',import.meta.url))).digest('hex').slice(0,10);
const files=new Map([['header',header()],['repos',repoTable()]]);
for(const [name,content] of personalPanels(config)) files.set(name,content);
for(const [i,p] of config.featuredProjects.entries())files.set(`project-${i+1}`,project(p));
if(snapshot){files.set('streak',streak());files.set('stats',stats());}
for(const [i,l] of config.profile.links.entries())files.set(`link-${i+1}`,panel(220,68,l.label,text(20,41,l.label+' ↗',14,colors.text1,'class="sans"')));
for(const [name,content] of files)await writeFile(path.join(target,name+'.svg'),content);
for(const name of await readdir(target))if(name.endsWith('.svg')&&!files.has(name.slice(0,-4)))await unlink(path.join(target,name));
const img=(name,pct,alt)=>`<img src="./profile/generated/${name}.svg?v=${version}" width="${pct}%" alt="${xml(alt)}">`;
const link=(url,content)=>`<a href="${xml(url)}">${content}</a>`;
const blocks=[`<p align="center">${img('header',100,`${config.profile.name} — ${config.profile.intro}`)}</p>`,
'<p align="center">'+config.featuredProjects.map((p,i)=>link(p.url,img(`project-${i+1}`,49,`${p.name}: ${p.description}`))).join(' ')+'</p>',
link(`https://github.com/${config.github.username}?tab=repositories`,img('repos',100,selected.map(r=>`${r.name}: ${r.description}`).join('; ')))];
if(config.goals?.items?.length)blocks.push(img('goals',100,`${config.goals.year} goals. ${config.goals.items.map(item=>`${item.done?'Completed':'Open'}: ${item.label}`).join('; ')}`));
if(config.interests?.length){
 blocks.push(img('outside-heading',100,'Outside of coding'));
 for(let i=0;i<config.interests.length;i+=2){
  blocks.push('<p align="center">'+config.interests.slice(i,i+2).map(item=>img(`outside-${item.id}`,49,`${item.title}: ${item.description.join(' ')}`)).join(' ')+'</p>');
 }
}
if(snapshot){const s=streakInfo();blocks.push(link(`https://github.com/${config.github.username}`,img('streak',100,`${snapshot.contributions} contributions in the past year. Current streak ${s.current.length} days; longest in this period ${s.longest.length} days. Updated ${snapshot.updatedAt}.`)));blocks.push(link(`https://github.com/${config.github.username}`,img('stats',100,`${snapshot.stars} stars on public non-fork repositories; ${snapshot.commits} commits, ${snapshot.pulls} pull requests, ${snapshot.issues} issues in the past year. Updated ${snapshot.updatedAt}.`)));}
blocks.push('<p align="center">'+config.profile.links.map((l,i)=>link(l.url,img(`link-${i+1}`,25,l.label))).join('')+'</p>');
if (config.widgets?.length) {
 blocks.push('<hr>', '## Widgets');
 for (const widget of config.widgets) {
  if (widget.imageUrl.startsWith('./') && !snapshot) continue;
  const widthAttribute = widget.width ? ` width="${xml(widget.width)}"` : '';
  const image = `<img src="${xml(widget.imageUrl)}"${widthAttribute} alt="${xml(widget.alt)}">`;
  blocks.push(`<p align="center">${link(widget.url,image)}</p>`);
 }
}
await writeFile(path.join(root,'README.md'),blocks.join('\n\n')+'\n');
console.log(`Generated ${files.size} SVG panels and README.md.`);
