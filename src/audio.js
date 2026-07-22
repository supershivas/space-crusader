/* =====================================================================
   SON (effets + ambiance + musique + spatialisation + voix)
   ===================================================================== */
let AC=null, sonActif=true, musicOsc=null, musicGain=null, musicInterval=null;

export function initAudio(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } }
function bip(f,d,t='square',v=.12,g=0,pan=0){ if(!sonActif||!AC) return;
  const o=AC.createOscillator(), gg=AC.createGain(), p=AC.createStereoPanner?AC.createStereoPanner():null;
  o.type=t; o.frequency.value=f;
  if(g) o.frequency.exponentialRampToValueAtTime(Math.max(60,f+g),AC.currentTime+d);
  gg.gain.value=v; gg.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);
  o.connect(gg);
  if(p){ p.pan.value=pan; gg.connect(p); p.connect(AC.destination); }
  else gg.connect(AC.destination);
  o.start(); o.stop(AC.currentTime+d); }
export const sonTir=()=>bip(720,.14,'square',.10,-460, -0.3+Math.random()*0.6);
export const sonTirEnnemi=()=>bip(300,.16,'sawtooth',.09,-160, -0.3+Math.random()*0.6);
export const sonBoom=()=>bip(150,.22,'sawtooth',.12,-90, -0.3+Math.random()*0.6);
export const sonAie=()=>bip(90,.32,'square',.16,-30);
export const sonSelect=()=>bip(520,.06,'square',.07);
export const sonRenfort=()=>bip(440,.12,'triangle',.10,220);
export const sonRadar=()=>bip(1250,.05,'sine',.028);
export const sonVague=()=>{ bip(520,.12,'triangle',.10,180); setTimeout(()=>bip(700,.16,'triangle',.10,220),120); };
export const sonUndo=()=>bip(350,.08,'sine',.08,100);
export const sonPause=()=>bip(600,.1,'triangle',.08,-200);
export const sonAchievement=()=>{ for(let i=0;i<4;i++) setTimeout(()=>bip(440+i*110,.08,'square',.08,0), i*80); };
export const sonVoix=(txt)=>{ /* bips de synthèse simples */
  const notes={'V':440,'A':520,'G':330,'U':390,'E':490,'1':660,'2':770,'3':880,'B':350,'O':410,'S':590};
  let t=0; for(const ch of txt.toUpperCase()){ const f=notes[ch]||400+Math.random()*200;
    setTimeout(()=>bip(f,.06,'square',.06), t); t+=90; } };

/* Musique ambiante générative : douce, aérée, variée (moins entêtante) */
let musicPlaying=false, musicPhase='calme', musicCount=0, musicRoot=0;
const PENTA=[0,3,5,7,10,12,15];      // pentatonique mineure (sonne toujours juste)
const BASSSHIFT=[0,-5,-7,-2];        // progression d'accords lente
function noteFreq(base,semis){ return base*Math.pow(2,semis/12); }
function playSoft(freq,dur,vol,type='sine'){ if(!sonActif||!AC) return;
  const o=AC.createOscillator(), g=AC.createGain(), t0=AC.currentTime;
  o.type=type; o.frequency.value=freq;
  g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(vol,t0+Math.min(0.18,dur*0.3));
  g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0+dur+0.05); }
export function startMusic(){ if(!sonActif||!AC||musicPlaying) return; musicPlaying=true; musicCount=0; scheduleMusic(); }
export function stopMusic(){ musicPlaying=false; if(musicInterval) clearTimeout(musicInterval); }
function scheduleMusic(){
  if(!musicPlaying||!sonActif||!AC) return;
  const bass = musicPhase==='boss'?98:(musicPhase==='tense'?110:130);
  const mel  = musicPhase==='boss'?196:(musicPhase==='tense'?220:262);
  if(musicCount%4===0){ musicRoot=BASSSHIFT[((musicCount/4)|0)%BASSSHIFT.length];
    playSoft(noteFreq(bass,musicRoot), musicPhase==='boss'?1.6:2.6, 0.05, 'triangle'); }   // nappe grave tenue
  if(Math.random()<0.6){                                   // 40% de silences = respiration
    const oct=Math.random()<0.3?12:0, semi=musicRoot+PENTA[Math.floor(Math.random()*PENTA.length)]+oct;
    const dur=0.5+Math.random()*0.9;
    playSoft(noteFreq(mel,semi), dur, 0.03, 'sine');
    if(Math.random()<0.22) playSoft(noteFreq(mel,semi+(Math.random()<0.5?3:7)), dur*0.9, 0.018, 'sine'); // harmonie douce
  }
  musicCount++;
  const g=musicPhase==='boss'?0.55:(musicPhase==='tense'?0.75:1.05);
  musicInterval=setTimeout(scheduleMusic, (g+Math.random()*g)*1000);   // tempo lent et varié
}
export function setMusicPhase(p){ if(musicPhase!==p){ musicPhase=p; } }

export function isSoundOn(){ return sonActif; }
export function canPlayAmbiance(){ return sonActif&&!!AC; }
export function toggleSound(){
  sonActif=!sonActif;
  if(!sonActif) stopMusic(); else startMusic();
  return sonActif;
}
