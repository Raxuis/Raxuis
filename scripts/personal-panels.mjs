const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[char]));

export function personalPanels(config) {
  const c = config.theme;
  const out = new Map();
  const text = (x,y,value,size=14,color=c.text1,extra='') => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${escape(value)}</text>`;
  const line = (x,y,w) => `<path d="M${x} ${y}h${w}" stroke="${c.line}"/>`;
  const label = (x,y,value) => text(x,y,value,11,c.text3,'letter-spacing=".6"');
  function svg(w,h,title,body) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title"><title id="title">${escape(title)}</title><style>text{font-family:Arial,Helvetica,sans-serif}.mono{font-family:Menlo,Consolas,monospace}.bounce{animation:bounce 2.8s ease-in-out infinite;transform-box:fill-box;transform-origin:center}.spin{animation:spin 7s linear infinite;transform-box:fill-box;transform-origin:center}.flash{animation:flash 4s ease-in-out infinite}.blink{animation:blink 2.4s steps(1,end) infinite}@keyframes bounce{0%,100%{transform:translateY(-9px)}48%{transform:translateY(10px)}55%{transform:translateY(8px)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes flash{0%,30%,48%,100%{opacity:1}36%,41%{opacity:.22}}@keyframes blink{0%,48%{opacity:1}49%,100%{opacity:.12}}@media(prefers-reduced-motion:reduce){.bounce,.spin,.flash,.blink{animation:none!important;transform:none!important;opacity:1!important}}</style><rect x=".5" y=".5" width="${w-1}" height="${h-1}" rx="10" fill="${c.page}" stroke="${c.line}"/>${body}</svg>\n`;
  }

  if (config.goals?.items?.length) {
    const goals = config.goals;
    const done = goals.items.filter(item => item.done).length;
    const count = goals.items.length;
    let body = label(28,34,`GOALS / ${goals.year}`) + text(28,77,'A few things I’m working towards.',27,c.text1,'letter-spacing="-.7"') + text(850,35,`${done} / ${count} completed`,12,c.text3,'text-anchor="end" class="mono"');
    const segmentWidth = (824 - (count-1)*6)/count;
    body += goals.items.map((item,i) => `<rect x="${28+i*(segmentWidth+6)}" y="100" width="${segmentWidth}" height="4" rx="2" fill="${item.done?c.text1:c.line}"/>`).join('');
    for (const [i,item] of goals.items.entries()) {
      const y = 125+i*46;
      body += line(28,y+46,824) + `<rect x="29" y="${y+14}" width="17" height="17" rx="4" fill="${item.done?c.text1:'none'}" stroke="${item.done?c.text1:c.text3}"/>`;
      if (item.done) body += `<path d="M33 ${y+22}l3 3 6-7" fill="none" stroke="${c.page}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
      body += text(62,y+27,item.label,16,item.done?c.text3:c.text2) + text(850,y+26,item.done?'DONE':'OPEN',10,item.done?c.text1:c.text3,'text-anchor="end" class="mono" letter-spacing=".8"');
    }
    out.set('goals',svg(880,145+count*46,`${goals.year} goals: ${goals.items.map(item=>`${item.done?'Completed':'Open'}: ${item.label}`).join('; ')}`,body));
  }

  const stroke = `fill="none" stroke="${c.text1}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const icons = {
    photography: `<g ${stroke}><path d="M38 73h14l7-10h26l7 10h12a6 6 0 0 1 6 6v43a6 6 0 0 1-6 6H38a6 6 0 0 1-6-6V79a6 6 0 0 1 6-6Z"/><g class="flash"><circle cx="71" cy="100" r="19"/><circle cx="71" cy="100" r="10"/></g><path d="M96 82h5"/></g>`,
    basketball: `<g ${stroke}><path d="M34 140h76" opacity=".3"/><g class="bounce"><circle cx="72" cy="96" r="29"/><path d="M43 96h58M72 67v58M52 75q34 21 40 41M92 75q-34 21-40 41"/></g></g>`,
    movement: `<g ${stroke}><g class="spin"><circle cx="43" cy="116" r="19"/><path d="M24 116h38M43 97v38" opacity=".45"/></g><g class="spin"><circle cx="103" cy="116" r="19"/><path d="M84 116h38M103 97v38" opacity=".45"/></g><path d="M43 116l19-35 19 35H43l15-26h37l8 26M57 77h14M88 73h10l-6 17M81 116l14-26"/></g>`,
    korean: `<g ${stroke}><path d="M34 67h29q9 0 9 8v56q-3-7-12-7H34ZM72 75q0-8 9-8h29v57H84q-9 0-12 7"/></g>${text(43,106,'가',23,c.text1,'font-family="Apple SD Gothic Neo,Malgun Gothic,sans-serif"')}<path class="blink" d="M86 105h14" stroke="${c.text1}" stroke-width="2"/>`
  };
  if (config.interests?.length) {
    out.set('outside-heading',svg(880,68,'Outside of coding',text(28,41,'Outside of coding',25,c.text1,'letter-spacing="-.6"')+text(852,40,'A LITTLE LESS SCREEN TIME',11,c.text3,'text-anchor="end" class="mono" letter-spacing=".5"')));
    for (const item of config.interests) {
      if (!icons[item.id]) throw new Error(`Unknown interest illustration: ${item.id}`);
      const body = label(28,30,item.category)+icons[item.id]+text(145,82,item.title,25,c.text1,'letter-spacing="-.5"')+item.description.map((value,i)=>text(145,112+i*21,value,14,c.text3)).join('');
      out.set(`outside-${item.id}`,svg(440,180,`${item.title}: ${item.description.join(' ')}`,body));
    }
  }
  return out;
}
