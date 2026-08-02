/* =====================================================================
   SON (effets + ambiance + musique + spatialisation + voix)
   ===================================================================== */
let AC=null, sonActif=true, musicInterval=null;
let gainEffets=null, gainMusique=null;

const VOL_EFFETS_KEY='dc_vol_effets', VOL_MUSIQUE_KEY='dc_vol_musique';
let volEffets=0.8, volMusique=0.8;
try{ const e=localStorage.getItem(VOL_EFFETS_KEY); if(e!==null) volEffets=Math.min(1,Math.max(0,parseFloat(e)));
     const m=localStorage.getItem(VOL_MUSIQUE_KEY); if(m!==null) volMusique=Math.min(1,Math.max(0,parseFloat(m))); }catch(e){}

export function initAudio(){
  if(AC) return;
  try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    gainEffets=AC.createGain(); gainEffets.gain.value=volEffets; gainEffets.connect(AC.destination);
    gainMusique=AC.createGain(); gainMusique.gain.value=volMusique; gainMusique.connect(AC.destination);
  }catch(e){}
}
/* Réglages 1 · Volume séparé musique/effets — deux bus de gain maîtres persistés (localStorage),
   ajustables en direct depuis les Paramètres sans repasser par toggleSound (qui reste le
   coupe-son global). */
export function setVolumeEffets(v){ volEffets=Math.min(1,Math.max(0,v)); if(gainEffets) gainEffets.gain.value=volEffets; try{ localStorage.setItem(VOL_EFFETS_KEY,String(volEffets)); }catch(e){} }
export function setVolumeMusique(v){ volMusique=Math.min(1,Math.max(0,v)); if(gainMusique) gainMusique.gain.value=volMusique; try{ localStorage.setItem(VOL_MUSIQUE_KEY,String(volMusique)); }catch(e){} }
export function getVolumeEffets(){ return volEffets; }
export function getVolumeMusique(){ return volMusique; }

function bip(f,d,t='square',v=.12,g=0,pan=0){ if(!sonActif||!AC) return;
  const o=AC.createOscillator(), gg=AC.createGain(), p=AC.createStereoPanner?AC.createStereoPanner():null;
  o.type=t; o.frequency.value=f;
  if(g) o.frequency.exponentialRampToValueAtTime(Math.max(60,f+g),AC.currentTime+d);
  gg.gain.value=v; gg.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);
  o.connect(gg);
  if(p){ p.pan.value=pan; gg.connect(p); p.connect(gainEffets); }
  else gg.connect(gainEffets);
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
/* Réglages 5 · Stings renforcés pour les moments qui n'avaient qu'un bip générique ou rien :
   fanfare distincte pour la victoire de secteur (boss vaincu), la victoire de mission planète,
   le déblocage d'un héros et l'apparition d'un boss épique (miroir/forge/eclipse) — cohérent
   avec la hiérarchie de rareté déjà établie visuellement (voir RARETE dans config.js). */
export const sonVictoireSecteur=()=>{ [440,554,659,880].forEach((f,i)=>setTimeout(()=>bip(f,.16,'triangle',.11,0), i*100)); };
export const sonVictoirePlanete=()=>{ [392,494,587,784].forEach((f,i)=>setTimeout(()=>bip(f,.18,'square',.11,60), i*110)); };
export const sonHerosDebloque=()=>{ [660,830,990].forEach((f,i)=>setTimeout(()=>bip(f,.14,'sine',.09,0), i*90)); };
export const sonEpique=()=>{ [220,330,440,660,880].forEach((f,i)=>setTimeout(()=>bip(f,.2,'sawtooth',.11,120), i*90)); };
/* Réglages 7 (essai) · Voix de synthèse contextuelle : la même association lettre→fréquence
   qu'avant, mais le timbre/tempo varie selon le contexte du message plutôt que d'être toujours
   identique — plus grave/lent et dissonant pour une alerte, plus clair/rapide pour une victoire.
   'normal' garde exactement le comportement d'origine. */
const VOIX_CONTEXTES={
  alerte:  {mult:0.62, type:'sawtooth', pas:115},
  victoire:{mult:1.35, type:'square',   pas:70},
  normal:  {mult:1,     type:'square',   pas:90},
};
export const sonVoix=(txt,contexte='normal')=>{
  const notes={'V':440,'A':520,'G':330,'U':390,'E':490,'1':660,'2':770,'3':880,'B':350,'O':410,'S':590};
  const cfg=VOIX_CONTEXTES[contexte]||VOIX_CONTEXTES.normal;
  let t=0; for(const ch of txt.toUpperCase()){ const f=(notes[ch]||400+Math.random()*200)*cfg.mult;
    setTimeout(()=>bip(f,.06,cfg.type,.06), t); t+=cfg.pas; } };

/* Musique ambiante générative : douce, aérée, variée (moins entêtante) */
let musicPlaying=false, musicPhase='calme', musicBiome=null, musicCount=0, musicRoot=0;
const PENTA=[0,3,5,7,10,12,15];      // pentatonique mineure (sonne toujours juste)
const BASSSHIFT=[0,-5,-7,-2];        // progression d'accords lente
/* Réglages 2 · Ambiance par biome (missions planète) : chaque biome a son propre timbre plutôt
   que la même gamme calme/tense/boss partout — désert sec et clairsemé, glace cristalline et
   scintillante (octaves hautes), grotte grave et étouffée (cohérent avec sa mécanique
   d'obscurité), villes anciennes plus dense avec une pointe de dissonance. Réutilise
   scheduleMusic/PENTA/BASSSHIFT existants : juste un jeu de paramètres différent. */
const BIOME_SONORE={
  desert:           {bass:104, mel:224, type:'triangle', densite:0.38, octaveHaute:0, dissonance:0},
  glace:            {bass:150, mel:360, type:'sine',     densite:0.58, octaveHaute:0.5, dissonance:0},
  grotte:           {bass:78,  mel:150, type:'sawtooth', densite:0.28, octaveHaute:0, dissonance:0},
  villes_anciennes: {bass:118, mel:236, type:'sine',     densite:0.72, octaveHaute:0.15, dissonance:0.3},
};
function noteFreq(base,semis){ return base*Math.pow(2,semis/12); }
/* Réglages 3 · Spatialisation lente de la musique : un panoramique qui erre doucement dans le
   temps (LFO simple recalculé à chaque note, pas de nœud audio dédié nécessaire vu la durée
   courte des notes) plutôt qu'un son de musique toujours centré. */
function panMusique(){ return Math.sin(Date.now()/6000)*0.5; }
function playSoft(freq,dur,vol,type='sine',pan=0){ if(!sonActif||!AC) return;
  const o=AC.createOscillator(), g=AC.createGain(), t0=AC.currentTime;
  const p=AC.createStereoPanner?AC.createStereoPanner():null;
  o.type=type; o.frequency.value=freq;
  g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(vol,t0+Math.min(0.18,dur*0.3));
  g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(g);
  if(p){ p.pan.value=Math.max(-1,Math.min(1,pan)); g.connect(p); p.connect(gainMusique); }
  else g.connect(gainMusique);
  o.start(t0); o.stop(t0+dur+0.05); }
export function startMusic(){ if(!sonActif||!AC||musicPlaying) return; musicPlaying=true; musicCount=0; scheduleMusic(); }
export function stopMusic(){ musicPlaying=false; if(musicInterval) clearTimeout(musicInterval); }
function scheduleMusic(){
  if(!musicPlaying||!sonActif||!AC) return;
  const conf=musicBiome&&BIOME_SONORE[musicBiome];
  const bass = conf ? conf.bass : (musicPhase==='boss'?98:(musicPhase==='tense'?110:130));
  const mel  = conf ? conf.mel  : (musicPhase==='boss'?196:(musicPhase==='tense'?220:262));
  const type = conf ? conf.type : 'sine';
  const densite = conf ? conf.densite : 0.6;
  const pan0=panMusique();
  if(musicCount%4===0){ musicRoot=BASSSHIFT[((musicCount/4)|0)%BASSSHIFT.length];
    playSoft(noteFreq(bass,musicRoot), musicPhase==='boss'?1.6:2.6, 0.05, 'triangle', pan0*0.4); }   // nappe grave tenue
  if(Math.random()<densite){
    const octaveHaute=conf?conf.octaveHaute:0.3;
    const oct=Math.random()<octaveHaute?12:0;
    let semi=musicRoot+PENTA[Math.floor(Math.random()*PENTA.length)]+oct;
    if(conf&&conf.dissonance&&Math.random()<conf.dissonance) semi+=Math.random()<0.5?1:6;   // villes anciennes : léger frottement
    const dur=0.5+Math.random()*0.9;
    playSoft(noteFreq(mel,semi), dur, 0.03, type, pan0);
    if(Math.random()<0.22) playSoft(noteFreq(mel,semi+(Math.random()<0.5?3:7)), dur*0.9, 0.018, type, -pan0*0.6); // harmonie douce
  }
  musicCount++;
  const g=musicPhase==='boss'?0.55:(musicPhase==='tense'?0.75:1.05);
  musicInterval=setTimeout(scheduleMusic, (g+Math.random()*g)*1000);   // tempo lent et varié
}
export function setMusicPhase(p){ if(musicPhase!==p){ musicPhase=p; } }
export function setMusicBiome(b){ musicBiome=b; }

export function isSoundOn(){ return sonActif; }
export function canPlayAmbiance(){ return sonActif&&!!AC; }
export function toggleSound(){
  sonActif=!sonActif;
  if(!sonActif) stopMusic(); else startMusic();
  return sonActif;
}
