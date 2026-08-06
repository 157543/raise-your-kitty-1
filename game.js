"use strict";

const CONFIG = window.CONFIG;
const ASSETS = window.ASSETS;
const EventSystem = window.EventSystem;
const DailyChoiceEventSystem = window.DailyChoiceEventSystem;
const TaskSystem = window.TaskSystem;
const RelationshipSystem = window.RelationshipSystem;
const AchievementSystem = window.AchievementSystem;

(()=>{
      const root=document.documentElement;
      const syncGameViewport=()=>{
        const vv=window.visualViewport;
        const width=Math.round(vv?.width||window.innerWidth||document.documentElement.clientWidth||0);
        const height=Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight||0);
        if(width>0) root.style.setProperty('--game-viewport-width',`${width}px`);
        if(height>0) root.style.setProperty('--game-viewport-height',`${height}px`);
        root.style.setProperty('--game-viewport-top',`${Math.round(vv?.offsetTop||0)}px`);
        root.style.setProperty('--game-viewport-left',`${Math.round(vv?.offsetLeft||0)}px`);
        const shortSide=Math.min(window.screen?.width||width,window.screen?.height||height);
        const touchCapable=('ontouchstart' in window)||(navigator.maxTouchPoints||0)>0;
        const isPhone=Boolean(touchCapable&&shortSide<=600);
        root.classList.toggle('phone-landscape',Boolean(isPhone&&width>height));
        root.classList.toggle('phone-portrait',Boolean(isPhone&&height>=width));
      };
      syncGameViewport();
      window.addEventListener('resize',syncGameViewport,{passive:true});
      window.addEventListener('orientationchange',()=>setTimeout(syncGameViewport,80),{passive:true});
      window.visualViewport?.addEventListener('resize',syncGameViewport,{passive:true});
      window.visualViewport?.addEventListener('scroll',syncGameViewport,{passive:true});
    })();

/*
    写实素材目录约定：
    assets/cover/home-cover.webp
    assets/rooms/room-clean.webp
    assets/rooms/room-light-damage.webp
    assets/rooms/room-heavy-damage.webp
    assets/rooms/room-destroyed.webp
    assets/cats/<品种>/<kitten或adult>/<状态>.webp

    品种键：orange tabby tuxedo white black calico silver americanSilver
    状态键：idle happy sleepy angry sick mischievous

    每个年龄阶段有6种状态。图片尚未上传或选择无图片模式时，系统使用内置矢量画面。
  */
  /* =========================
     2. 通用工具模块
  ========================= */
  const Utils = (() => {
    const $ = s => document.querySelector(s);
    const $$ = s => [...document.querySelectorAll(s)];
    const clamp = (v,min=0,max=100) => Math.max(min,Math.min(max,v));
    const pick = a => a[Math.floor(Math.random()*a.length)];
    function roll(weights){const entries=Object.entries(weights);const total=entries.reduce((s,[,w])=>s+w,0);let n=Math.random()*total;for(const [k,w] of entries){n-=w;if(n<0)return k}return entries.at(-1)[0]}
    function effectText(e){const labels={health:"健康",trust:"信任",vitality:"活力",courage:"胆量",intimacy:"亲密",hunger:"饱腹",cleanliness:"清洁",damage:"房屋损坏",coins:"金币"};return Object.entries(e||{}).filter(([,v])=>v).map(([k,v])=>`${labels[k]} ${v>0?"+":""}${v}`)}
    return {$,$$,clamp,pick,roll,effectText};
  })();

  /* =========================
     2.6 图片模式与本地资源缓存模块

     不使用账号注册。用户打开链接后，网页在后台把 WebP 文件保存到
     当前网站专属的 Cache Storage 中；无图片模式不会发出任何图片请求。
  ========================= */
  const AssetManager = (() => {
    const PREF_KEY="cloudCatAssetPreference_v1";
    const CACHE_PREFIX="cloud-cat-webp-";
    const CACHE_NAME=`${CACHE_PREFIX}${ASSETS.version}`;
    let preference=null;
    let runtimeMode="unknown";
    let backgroundPromise=null;

    function validBreed(key){return !!(key&&CONFIG.breeds[key]&&CONFIG.breeds[key].imageReady)}
    function availableBreeds(){return Object.keys(CONFIG.breeds).filter(validBreed)}
    function allBreeds(){return Object.keys(CONFIG.breeds)}

    function init(){
      try{
        const saved=JSON.parse(localStorage.getItem(PREF_KEY)||"null");
        if(saved?.mode==="none"){
          preference={mode:"none"};runtimeMode="none";
        }else if(saved?.mode==="images"&&validBreed(saved.breed)){
          preference={mode:"images",breed:saved.breed};runtimeMode="images";
        }
      }catch(error){preference=null;runtimeMode="unknown"}
      purgeOldCaches();
      return preference;
    }

    async function purgeOldCaches(){
      if(!("caches" in window))return;
      try{
        const names=await caches.keys();
        await Promise.all(names.filter(name=>name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME).map(name=>caches.delete(name)));
      }catch(error){}
    }

    function getPreference(){return preference?{...preference}:null}
    function imagesEnabled(){return runtimeMode==="images"}
    function preferredBreed(){return imagesEnabled()&&validBreed(preference?.breed)?preference.breed:null}
    function beginImageSetup(breed){if(!validBreed(breed))throw new Error("该品种图片尚未开放");preference={mode:"images",breed};runtimeMode="images"}
    function commitImageMode(breed){beginImageSetup(breed);localStorage.setItem(PREF_KEY,JSON.stringify(preference));return getPreference()}
    function useNoImages(){preference={mode:"none"};runtimeMode="none";localStorage.setItem(PREF_KEY,JSON.stringify(preference));return getPreference()}

    function versionedUrl(path){
      const url=new URL(path,location.href);
      url.searchParams.set("assetv",ASSETS.version);
      return url.href;
    }

    async function openCache(){return "caches" in window?caches.open(CACHE_NAME):null}

    async function isCached(path){
      if(!path||!("caches" in window))return false;
      try{const cache=await openCache();return !!(await cache.match(versionedUrl(path)))}catch(error){return false}
    }

    async function fetchAsset(path,{retries=2}={}){
      if(!imagesEnabled()||!path||!path.toLowerCase().endsWith(".webp"))return {ok:false,path,reason:"disabled"};
      const url=versionedUrl(path);
      let cache=null;
      try{
        cache=await openCache();
        if(cache){
          const hit=await cache.match(url);
          if(hit)return {ok:true,path,url,response:hit.clone(),fromCache:true};
        }
      }catch(error){}

      let lastError=null;
      for(let attempt=0;attempt<=retries;attempt++){
        try{
          const response=await fetch(url,{cache:"no-store",credentials:"same-origin"});
          if(!response.ok)throw new Error(`HTTP ${response.status}`);
          const type=(response.headers.get("content-type")||"").toLowerCase();
          if(type&&!type.includes("image/webp")&&!type.includes("application/octet-stream"))throw new Error("返回的不是 WebP 图片");
          if(cache){try{await cache.put(url,response.clone())}catch(error){}}
          return {ok:true,path,url,response:response.clone(),fromCache:false};
        }catch(error){lastError=error;if(attempt<retries)await new Promise(resolve=>setTimeout(resolve,450*(attempt+1)))}
      }
      return {ok:false,path,url,reason:lastError?.message||"下载失败"};
    }

    async function cachePaths(paths,onProgress=null,concurrency=2){
      const queue=[...new Set((paths||[]).filter(path=>typeof path==="string"&&path.toLowerCase().endsWith(".webp")))];
      const total=queue.length;
      let cursor=0,completed=0;
      const results=new Array(total);
      const worker=async()=>{
        while(true){
          const index=cursor++;
          if(index>=total)return;
          const path=queue[index];
          const result=await fetchAsset(path);
          results[index]=result;
          completed++;
          if(onProgress)onProgress({completed,total,path,ok:result.ok,fromCache:!!result.fromCache});
        }
      };
      await Promise.all(Array.from({length:Math.max(1,Math.min(concurrency,total||1))},worker));
      const failed=results.filter(result=>result&&!result.ok);
      return {ok:failed.length===0,total,completed,failed,results};
    }

    function catPaths(breed,age){return ASSETS.catStates.map(state=>`assets/cats/${breed}/${age}/${state}.webp`)}
    function scenePaths(){return [...Object.values(ASSETS.rooms),...Object.values(ASSETS.routeScenes||{})]}
    function initialPack(breed){return [...scenePaths(),...catPaths(breed,"kitten")]}
    function gamePack(game){return [...scenePaths(),...catPaths(game.breedKey,game.ageStage||"kitten")]}
    function breedPack(breed){return [...catPaths(breed,"kitten"),...catPaths(breed,"adult")]}

    async function prepareInitial(breed,onProgress){beginImageSetup(breed);return cachePaths(initialPack(breed),onProgress,2)}
    async function ensureGamePack(game,onProgress){if(!imagesEnabled()||!game)return {ok:true,total:0,completed:0,failed:[]};return cachePaths(gamePack(game),onProgress,2)}
    async function ensureAge(breed,age,onProgress){if(!imagesEnabled()||!validBreed(breed))return {ok:true,total:0,completed:0,failed:[]};return cachePaths(catPaths(breed,age),onProgress,2)}

    function backgroundPaths(currentBreed){
      const paths=[];
      if(validBreed(currentBreed))paths.push(...catPaths(currentBreed,"adult"));
      availableBreeds().filter(breed=>breed!==currentBreed).forEach(breed=>paths.push(...breedPack(breed)));
      return [...new Set(paths)];
    }

    function startBackgroundDownload(currentBreed,onProgress){
      if(!imagesEnabled())return Promise.resolve({ok:true,total:0,completed:0,failed:[]});
      if(backgroundPromise)return backgroundPromise;
      backgroundPromise=cachePaths(backgroundPaths(currentBreed),onProgress,2).finally(()=>{backgroundPromise=null});
      return backgroundPromise;
    }

    return {init,getPreference,imagesEnabled,preferredBreed,beginImageSetup,commitImageMode,useNoImages,availableBreeds,allBreeds,validBreed,fetchAsset,isCached,cachePaths,catPaths,scenePaths,initialPack,gamePack,breedPack,prepareInitial,ensureGamePack,ensureAge,startBackgroundDownload};
  })();

  /* =========================
     3. 存档模块
  ========================= */
  const Storage = (() => {
    const KEY="cloudCatShelterSave_v10";
    const BACKUP_KEY="cloudCatShelterSave_v10_backup";
    const LEGACY=["cloudCatShelterSave_v9","cloudCatShelterSave_v9_backup","cloudCatShelterSave_v8","cloudCatShelterSave_v8_backup","cloudCatShelterSave_v7","cloudCatShelterSave_v7_backup","cloudCatShelterSave_v5","cloudCatShelterSave_v4","cloudCatGameSave_v2","cloudCatGameSave_v1"];
    const sharedFields=["version","slots","day","actionsLeft","coins","houseDamage","dailyTask","dailyChoice","inventory","collection","achievements","activeCatId","cats"];
    function makeId(){return globalThis.crypto?.randomUUID?.()||`cat_${Date.now()}_${Math.random().toString(36).slice(2,9)}`}
    function normalizeCat(source={},rootDay=1){
      const cat={...source,stats:{...(source.stats||{})}};
      sharedFields.forEach(key=>delete cat[key]);
      cat.id=cat.id||makeId();
      cat.name=cat.name||Utils.pick(CONFIG.names);
      cat.breedKey=CONFIG.breeds[cat.breedKey]?cat.breedKey:"orange";
      cat.routeKey=CONFIG.routes[cat.routeKey]?cat.routeKey:"shelterKitten";
      cat.routeName=cat.routeName||CONFIG.routes[cat.routeKey].name;
      cat.sex=cat.sex||Utils.pick(CONFIG.sexes);
      cat.ageStage=cat.ageStage==="adult"?"adult":"kitten";
      cat.personality=CONFIG.personalities[cat.personality]?cat.personality:"spirit";
      cat.initialPersonality=CONFIG.personalities[cat.initialPersonality]?cat.initialPersonality:cat.personality;
      cat.personalityChanged=!!cat.personalityChanged||cat.ageStage==="adult";
      cat.joinedDay=Number.isFinite(cat.joinedDay)?cat.joinedDay:1;
      cat.mood=cat.mood||"neutral";
      cat.isSick=!!cat.isSick;
      cat.treatmentCost=cat.isSick&&Number.isInteger(cat.treatmentCost)?cat.treatmentCost:null;
      cat.bathDue=!!cat.bathDue;
      cat.lastBathDay=Number.isFinite(cat.lastBathDay)?cat.lastBathDay:null;
      cat.nextBathDay=Number.isFinite(cat.nextBathDay)?cat.nextBathDay:rootDay+(["shop","friend"].includes(cat.routeKey)?10:5);
      cat.logs=Array.isArray(cat.logs)?cat.logs.slice(0,40):[`第${rootDay}天：${cat.name}来到你的猫舍。`];
      const base=CONFIG.routes[cat.routeKey]?.base||CONFIG.routes.shelterKitten.base;
      cat.stats={...base,...cat.stats};
      Object.keys(cat.stats).forEach(key=>cat.stats[key]=Utils.clamp(Number(cat.stats[key])||0));
      if(cat.personality==="chaos"){cat.stats.trust=Math.min(cat.stats.trust,45);cat.stats.intimacy=Math.min(cat.stats.intimacy,35)}
      RelationshipSystem.normalize(cat,rootDay);
      return cat;
    }
    function normalize(data){
      if(!data||typeof data!=="object")return null;
      if(Array.isArray(data.cats)){
        const day=Math.max(1,Number(data.day)||1);
        const cats=data.cats.map(cat=>normalizeCat(cat,day));
        if(!cats.length)return null;
        const slots=Math.max(3,Number(data.slots)||3,cats.length);
        const activeCatId=cats.some(cat=>cat.id===data.activeCatId)?data.activeCatId:cats[0].id;
        const inventory={catStrip:Math.max(0,Math.floor(Number(data.inventory?.catStrip)||0)),can:Math.max(0,Math.floor(Number(data.inventory?.can)||0))};
        const collection=CatDexSystem.sync(data.collection,cats,day);
        const root={version:10,slots,day,actionsLeft:Utils.clamp(Number.isFinite(Number(data.actionsLeft))?Number(data.actionsLeft):4,0,4),coins:Math.max(0,Number(data.coins)||0),houseDamage:Utils.clamp(Number(data.houseDamage)||0),dailyTask:data.dailyTask||null,dailyChoice:data.dailyChoice||null,inventory,collection,achievements:null,activeCatId,cats};
        root.achievements=AchievementSystem.normalize(data.achievements,root,{migrating:!data.achievements});
        return root;
      }
      const day=Math.max(1,Number(data.day)||1);
      const cat=normalizeCat(data,day);
      const inventory={catStrip:Math.max(0,Math.floor(Number(data.inventory?.catStrip)||0)),can:Math.max(0,Math.floor(Number(data.inventory?.can)||0))};
      const cats=[cat],collection=CatDexSystem.sync(data.collection,cats,day);
      const root={version:10,slots:3,day,actionsLeft:Utils.clamp(Number.isFinite(Number(data.actionsLeft))?Number(data.actionsLeft):4,0,4),coins:Math.max(0,Number(data.coins)||0),houseDamage:Utils.clamp(Number(data.houseDamage)||0),dailyTask:data.dailyTask||null,dailyChoice:data.dailyChoice||null,inventory,collection,achievements:null,activeCatId:cat.id,cats};
      root.achievements=AchievementSystem.normalize(data.achievements,root,{migrating:!data.achievements});
      return root;
    }
    function save(data){
      if(!data)return false;
      try{
        const raw=data?.__isGameProxy?data.toJSON():data;
        const root=normalize(raw);
        if(!root)return false;
        const serialized=JSON.stringify(root);
        const previous=localStorage.getItem(KEY);
        if(previous)localStorage.setItem(BACKUP_KEY,previous);
        localStorage.setItem(KEY,serialized);
        return true;
      }catch(error){return false}
    }
    function parseSaved(raw){if(!raw)return null;try{return normalize(JSON.parse(raw))}catch(error){return null}}
    function load(){
      let root=parseSaved(localStorage.getItem(KEY));
      if(!root)root=parseSaved(localStorage.getItem(BACKUP_KEY));
      if(!root){for(const key of LEGACY){root=parseSaved(localStorage.getItem(key));if(root)break}}
      if(root)save(root);
      return root;
    }
    function clear(){localStorage.removeItem(KEY);localStorage.removeItem(BACKUP_KEY);LEGACY.forEach(key=>localStorage.removeItem(key))}
    return {save,load,clear,normalize,KEY,BACKUP_KEY};
  })();

  /* =========================
     4. 矢量猫与房间绘制模块
     所有图片都嵌在单个 HTML 中，不需要额外上传图片。
  ========================= */
  const Art = (() => {
    function eyes(mood){if(mood==="sleepy")return `<path d="M-17 0 q7 6 14 0 M8 0 q7 6 14 0" fill="none" stroke="#2e2724" stroke-width="3" stroke-linecap="round"/>`;if(mood==="angry")return `<path d="M-22 -5 l15 5 M23 -5 l-15 5" stroke="#2e2724" stroke-width="3"/><ellipse cx="-13" cy="4" rx="4" ry="7" fill="#252323"/><ellipse cx="14" cy="4" rx="4" ry="7" fill="#252323"/>`;return `<ellipse cx="-14" cy="2" rx="${mood==="happy"?6:5}" ry="${mood==="happy"?8:7}" fill="#252323"/><ellipse cx="14" cy="2" rx="${mood==="happy"?6:5}" ry="${mood==="happy"?8:7}" fill="#252323"/><circle cx="-12" cy="0" r="1.5" fill="white"/><circle cx="16" cy="0" r="1.5" fill="white"/>`}
    function pattern(breed){const c=CONFIG.breeds[breed];if(breed==="calico")return `<path d="M-34 -9 q18-16 30-2 q-7 13-21 18z" fill="${c.patch}"/><path d="M7 -19 q20 0 26 16 q-12 6-27 0z" fill="#343236"/>`;if(["orange","tabby","silver","americanSilver"].includes(breed))return `<path d="M-22 -26 l6 15 M-5 -30 l3 17 M15 -27 l-5 15" stroke="${c.stripe}" stroke-width="4" stroke-linecap="round" opacity=".85"/>`;if(breed==="tuxedo")return `<path d="M-22 -7 q22-14 43 0 q-4 26-21 31 q-17-5-22-31" fill="${c.light}"/>`;if(breed==="white")return `<path d="M-7 -31 q12 1 19 9" stroke="${c.stripe}" stroke-width="3" opacity=".5"/>`;return ""}
    function catGroup(breed,age,mood="neutral",x=0,y=0){const c=CONFIG.breeds[breed];const kitten=age==="kitten";const s=kitten?.78:1;const head=kitten?47:42;return `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M45 38 q42 2 45 45 q-2 39-47 39 q-16 0-27-7" fill="${c.base}"/>
      <path d="M80 79 q42 7 34-30" fill="none" stroke="${c.base}" stroke-width="18" stroke-linecap="round"/>
      <ellipse cx="-1" cy="48" rx="49" ry="52" fill="${c.base}"/>
      <path d="M-39 4 L-28 -38 L-5 -10 M39 4 L28 -38 L5 -10" fill="${c.base}" stroke="${c.stripe}" stroke-width="2"/>
      <ellipse cx="0" cy="4" rx="${head}" ry="${head-3}" fill="${c.base}"/>
      ${pattern(breed)}
      <path d="M-10 15 q10 8 20 0" fill="none" stroke="${c.light}" stroke-width="13" stroke-linecap="round" opacity=".95"/>
      <g transform="translate(0 0)">${eyes(mood)}<path d="M0 13 l-4 4 h8z" fill="#a76567"/><path d="M0 17 q-5 5-10 2 M0 17 q5 5 10 2" fill="none" stroke="#5b403b" stroke-width="2"/></g>
      <path d="M-22 83 q-7 31 4 40 M15 85 q6 30-2 38" stroke="${c.base}" stroke-width="18" stroke-linecap="round"/>
      <path d="M-28 64 q15 18 28 2 q12 17 27-1" fill="none" stroke="${c.light}" stroke-width="8" opacity=".8"/>
    </g>`}
    function roomSVG(game,preview=false,hideCat=false){const d=game.houseDamage||0;const level=d<15?0:d<40?1:d<70?2:3;const mood=game.mood||"neutral";const age=game.ageStage||"kitten";const breed=game.breedKey||"orange";const scratches=level>=1?`<path d="M184 239 l22-38 M194 245 l22-37 M205 247 l17-31" stroke="#8d5b45" stroke-width="4" opacity=".65"/>`:"";const torn=level>=2?`<path d="M477 72 l17 34 l-9 25 l16 34 l-14 28" fill="#f4d4c2" stroke="#bb7966" stroke-width="3"/>`:"";const chaos=level>=3?`<g><path d="M84 92 l38 12 l-34 22z" fill="#ede6dd"/><path d="M365 85 l28 10 l-25 18z" fill="#ede6dd"/><path d="M525 276 l30 5" stroke="#6e5a4f" stroke-width="5"/><circle cx="548" cy="292" r="13" fill="#d8ad70"/><path d="M521 288 l34 11" stroke="#56835d" stroke-width="6"/></g>`:"";const plant=level>=2?`<g transform="translate(535 291) rotate(68)"><rect x="-20" y="0" width="40" height="28" rx="5" fill="#b66d4b"/><path d="M0 0 q-20-35-9-67 M0 0 q16-35 8-64" stroke="#4f8d5c" stroke-width="7"/><circle cx="-13" cy="-60" r="15" fill="#6fa66d"/><circle cx="13" cy="-54" r="14" fill="#6fa66d"/></g>`:`<g transform="translate(535 275)"><rect x="-20" y="0" width="40" height="34" rx="5" fill="#b66d4b"/><path d="M0 0 q-20-35-9-67 M0 0 q16-35 8-64" stroke="#4f8d5c" stroke-width="7"/><circle cx="-13" cy="-60" r="15" fill="#6fa66d"/><circle cx="13" cy="-54" r="14" fill="#6fa66d"/></g>`;return `<svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg" aria-label="小猫的房间">
      <defs><linearGradient id="wall" x2="0" y2="1"><stop stop-color="#fff8ec"/><stop offset="1" stop-color="#f6dfc9"/></linearGradient><linearGradient id="floor" x2="1"><stop stop-color="#d8a875"/><stop offset="1" stop-color="#efc38f"/></linearGradient></defs>
      <rect width="640" height="285" fill="url(#wall)"/><rect y="285" width="640" height="115" fill="url(#floor)"/><path d="M0 312 H640 M0 350 H640" stroke="#c38b5c" opacity=".45"/>
      <rect x="430" y="34" width="150" height="142" rx="8" fill="#d8effc" stroke="#fff" stroke-width="11"/><path d="M505 39 V171 M435 105 H575" stroke="#fff" stroke-width="7"/>${torn}
      <rect x="72" y="210" width="180" height="92" rx="18" fill="#d79878"/><rect x="84" y="177" width="156" height="67" rx="20" fill="#e7aa8b"/>${scratches}
      <ellipse cx="342" cy="329" rx="125" ry="44" fill="#f3d9ba" stroke="#fff2e3" stroke-width="7"/>
      <g transform="translate(297 185)"><rect x="0" y="0" width="18" height="125" rx="9" fill="#b88b61"/><rect x="-28" y="-8" width="74" height="18" rx="9" fill="#9b7253"/><circle cx="9" cy="-25" r="12" fill="#ef8e52"/></g>
      <g transform="translate(38 274)"><ellipse cx="55" cy="38" rx="55" ry="23" fill="#bd8a65"/><ellipse cx="55" cy="34" rx="44" ry="16" fill="#ffe4c8"/></g>
      ${plant}${chaos}
      ${hideCat?"":catGroup(breed,age,mood,360,228)}
      ${preview?"":`<circle cx="590" cy="336" r="16" fill="#ef8f54"/><path d="M580 327 l20 18 M600 327 l-20 18" stroke="#fff" stroke-width="3"/>`}
    </svg>`}
    function catSVG(game){const breed=game.breedKey||"orange";const age=game.ageStage||"kitten";const mood=game.mood||"neutral";return `<svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg" aria-label="猫咪占位图">${catGroup(breed,age,mood,128,90)}</svg>`}
    function logoSVG(){return `<svg viewBox="0 0 120 120"><circle cx="60" cy="65" r="40" fill="#e79a55"/><path d="M28 43 L36 12 L53 37 M92 43 L84 12 L67 37" fill="#e79a55"/><circle cx="47" cy="62" r="5"/><circle cx="73" cy="62" r="5"/><path d="M60 72 l-5 5 h10z" fill="#9e5f62"/><path d="M60 77 q-7 8-15 1 M60 77 q7 8 15 1" fill="none" stroke="#5b4138" stroke-width="3"/><path d="M18 68 h24 M78 68 h24 M20 78 h23 M77 78 h23" stroke="#5b4138" stroke-width="2"/></svg>`}
    return {roomSVG,catSVG,logoSVG};
  })();

  /* =========================
     4.5 写实视觉渲染模块
     所有照片统一使用 WebP
  ========================= */
  const Visual = (() => {
    const {$}=Utils;
    const imageCache=new Map();
    const objectUrls=new Set();

    function resetCache(){
      imageCache.clear();
      objectUrls.forEach(url=>URL.revokeObjectURL(url));
      objectUrls.clear();
    }

    function roomLevel(damage=0){if(damage<15)return "clean";if(damage<40)return "light";if(damage<70)return "heavy";return "destroyed"}
    function stateFor(game,override=null){if(override)return override;if(game.isSick)return "sick";if(game.mood==="angry")return "angry";if(game.mood==="sleepy")return "sleepy";if(game.mood==="happy")return "happy";if(game.personality==="demon"&&game.houseDamage>=15)return "mischievous";return "idle"}
    function roomPath(game){
      /* 开局通过“宠物店购买”查看候选猫时，使用宠物店专属背景；
         领养回家后 game.day 已存在，继续使用正常房间背景。 */
      if(game?.routeKey==="shop"&&!game?.day)return ASSETS.routeScenes.shop;
      return ASSETS.rooms[roomLevel(game.houseDamage||0)];
    }
    function catPath(game,stateOverride=null,ageOverride=null){const state=stateFor(game,stateOverride);const age=ageOverride||game.ageStage||"kitten";return `assets/cats/${game.breedKey||"orange"}/${age}/${state}.webp`}

    function decodeUrl(url,priority="auto"){
      return new Promise(resolve=>{
        const image=new Image();let settled=false;
        image.decoding="async";image.loading="eager";
        if("fetchPriority" in image)image.fetchPriority=priority;
        const finish=async ok=>{if(settled)return;settled=true;if(ok&&typeof image.decode==="function"){try{await image.decode()}catch(error){}}resolve(ok)};
        image.addEventListener("load",()=>finish(true),{once:true});
        image.addEventListener("error",()=>finish(false),{once:true});
        image.src=url;
        if(image.complete)queueMicrotask(()=>finish(image.naturalWidth>0));
      });
    }

    function loadImage(path,priority="auto"){
      if(!AssetManager.imagesEnabled()||!path)return Promise.resolve({ok:false,path:"",url:""});
      const key=`${ASSETS.version}|${path}`;
      if(imageCache.has(key))return imageCache.get(key);
      const promise=(async()=>{
        const asset=await AssetManager.fetchAsset(path);
        if(!asset.ok)return {ok:false,path,url:""};
        try{
          const blob=await asset.response.blob();
          const objectUrl=URL.createObjectURL(blob);objectUrls.add(objectUrl);
          const ok=await decodeUrl(objectUrl,priority);
          if(ok)return {ok:true,path,url:objectUrl,fromCache:asset.fromCache};
          URL.revokeObjectURL(objectUrl);objectUrls.delete(objectUrl);
        }catch(error){}
        return {ok:false,path,url:""};
      })();
      imageCache.set(key,promise);
      return promise;
    }

    function readyImage(className,result,alt=""){
      const image=document.createElement("img");image.className=`${className} loaded`;image.alt=alt;image.decoding="sync";image.loading="eager";if("fetchPriority" in image)image.fetchPriority="high";image.src=result.url;return image;
    }

    function buildStage(game,state,roomResult,catResult,options={}){
      const stage=document.createElement("div");
      const requestedRoom=roomPath(game),requestedCat=catPath(game,state);
      stage.className=`visual-stage state-${state}`;stage.dataset.roomPath=requestedRoom;stage.dataset.catPath=requestedCat;stage.dataset.ready="1";
      const roomFallback=document.createElement("div");roomFallback.className="visual-room-fallback";roomFallback.innerHTML=Art.roomSVG(game,true,true);stage.appendChild(roomFallback);
      if(roomResult.ok){stage.appendChild(readyImage("visual-room-photo",roomResult,"房间背景"));stage.classList.add("room-loaded")}
      const shadow=document.createElement("div");shadow.className="visual-cat-shadow";stage.appendChild(shadow);
      const catFallback=document.createElement("div");catFallback.className="visual-cat-fallback";catFallback.innerHTML=Art.catSVG({...game,mood:state==="mischievous"?"happy":state});stage.appendChild(catFallback);
      if(catResult.ok){stage.appendChild(readyImage("visual-cat-photo",catResult,"猫咪"));stage.classList.add("cat-loaded")}
      const light=document.createElement("div");light.className="visual-light";stage.appendChild(light);
      const vignette=document.createElement("div");vignette.className="visual-vignette";stage.appendChild(vignette);
      if(options.showAssetHint&&AssetManager.imagesEnabled()&&(!roomResult.ok||!catResult.ok)){const hint=document.createElement("div");hint.className="asset-hint";hint.textContent="该 WebP 素材尚未准备完成";stage.appendChild(hint)}
      return stage;
    }

    function fallbackStage(game,state,options={}){const missing={ok:false,path:"",url:""};const stage=buildStage(game,state,missing,missing,options);stage.dataset.ready="0";return stage}

    function currentStage(element){const stages=[...element.querySelectorAll(".visual-stage:not(.visual-stage-leaving)")];return stages.at(-1)||null}
    function swapStage(element,nextStage){
      const current=currentStage(element);
      if(!current){element.replaceChildren(nextStage);return nextStage}
      nextStage.classList.add("visual-stage-swap");element.appendChild(nextStage);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{nextStage.classList.add("swap-ready");current.classList.add("visual-stage-leaving")}));
      setTimeout(()=>{current.remove();nextStage.classList.remove("visual-stage-swap","swap-ready")},390);
      return nextStage;
    }
    async function renderScene(target,game,options={}){
      const element=typeof target==="string"?$(target):target;if(!element||!game)return null;
      const state=stateFor(game,options.state||null),requestedRoom=roomPath(game),requestedCat=catPath(game,state),current=currentStage(element);
      if(current&&current.dataset.ready==="1"&&current.dataset.roomPath===requestedRoom&&current.dataset.catPath===requestedCat)return current;
      const token=(element.__visualRenderToken||0)+1;element.__visualRenderToken=token;
      if(!current)element.replaceChildren(fallbackStage(game,state,options));
      if(!AssetManager.imagesEnabled()||!AssetManager.validBreed(game.breedKey)){
        if(element.__visualRenderToken!==token)return null;
        return swapStage(element,fallbackStage(game,state,options));
      }
      const [roomResult,catResult]=await Promise.all([loadImage(requestedRoom,"high"),loadImage(requestedCat,"high")]);
      if(element.__visualRenderToken!==token)return null;
      return swapStage(element,buildStage(game,state,roomResult,catResult,options));
    }

    async function renderCatPreview(target,breedKey,age="kitten",unlocked=true){
      const element=typeof target==="string"?$(target):target;if(!element)return;
      const token=(element.__catDexRenderToken||0)+1;element.__catDexRenderToken=token;
      element.classList.toggle("locked",!unlocked);element.replaceChildren();
      if(!unlocked)return;
      const preview={breedKey,ageStage:age,mood:"neutral",isSick:false,personality:"spirit",houseDamage:0};
      const fallback=document.createElement("div");fallback.className="catdex-cat-fallback";fallback.innerHTML=Art.catSVG(preview);element.appendChild(fallback);
      if(!AssetManager.imagesEnabled()||!AssetManager.validBreed(breedKey))return;
      const result=await loadImage(catPath(preview,"idle",age),"auto");
      if(element.__catDexRenderToken!==token||!result.ok)return;
      element.appendChild(readyImage("catdex-cat-photo",result,`${CONFIG.breeds[breedKey].name}${age==="adult"?"成年":"幼猫"}形态`));
    }

    async function renderCover(){
      const box=$("#logoArt");if(!box)return;
      box.innerHTML="";box.classList.remove("has-cover");
      const fallback=document.createElement("div");fallback.className="cover-fallback";fallback.innerHTML=Art.logoSVG();box.appendChild(fallback);
      /* 封面不属于首批必需资源，保持内置图形，避免额外网络请求。 */
    }

    function eventState(event){const text=`${event.title||""} ${event.body||""}`;if(/生病|病情|应激|发热/.test(text))return "sick";if(/攻击|出爪|哈气|警告|不许碰|伏击/.test(text))return "angry";if(/推翻|破坏|抓坏|撕裂|跑酷|偷走|捣乱|快递箱/.test(text))return "mischievous";if(/睡|困/.test(text))return "sleepy";if(/开心|呼噜|蹭|顺利|陪伴|礼物|治愈/.test(text))return "happy";return null}
    function eventKey(event){const text=`${event.title||""} ${event.body||""}`;if(/成年|性格定型/.test(text))return "grow";if(/看病|治疗|医生|医院/.test(text))return "doctor";if(/洗护非常顺利|表现很乖/.test(text))return "bathGood";if(/洗澡|洗护|剪指甲|挣扎/.test(text))return "bathStruggle";if(/生病|病情|应激|发热/.test(text))return "sick";if(/攻击|出爪|脚踝|哈气/.test(text))return "attack";if(/打工/.test(text))return "work";if(/推翻|杯子|抓坏|撕裂|破坏/.test(text))return "damage";if(/喂|吃饭|猫粮|食盆|碗/.test(text))return /推翻|掀|撒|倒/.test(text)?"feedSpill":"feed";if(/摸|蹭|肚皮|呼噜/.test(text))return "pet";return null}

    async function renderEvent(target,event){
      const element=typeof target==="string"?$(target):target,game=Game.get();if(!element)return;
      const token=(element.__eventRenderToken||0)+1;element.__eventRenderToken=token;element.classList.remove("event-photo-mode");
      if(game)await renderScene(element,game,{state:event.visual?.catState||eventState(event)});else element.innerHTML="";
      if(element.__eventRenderToken!==token||!AssetManager.imagesEnabled())return;
      const key=event.visual?.eventKey||eventKey(event),explicit=event.visual?.eventImage,path=explicit||(key?ASSETS.eventImages[key]:null);
      if(!path||!(await AssetManager.isCached(path)))return;
      const result=await loadImage(path,"low");
      if(element.__eventRenderToken!==token||!result.ok)return;
      element.replaceChildren(readyImage("event-photo",result,event.title||"事件插图"));element.classList.add("event-photo-mode");
    }

    function preload(game){
      if(!game||!AssetManager.imagesEnabled()||!AssetManager.validBreed(game.breedKey))return Promise.resolve([]);
      const age=game.ageStage||"kitten";
      const paths=[roomPath(game),...ASSETS.catStates.map(state=>catPath(game,state,age))];
      return Promise.all([...new Set(paths)].map(path=>loadImage(path,"high")));
    }

    function preloadStatic(){return Promise.resolve([])}
    return {renderScene,renderCover,renderEvent,renderCatPreview,preload,preloadStatic,loadImage,stateFor,roomPath,catPath,resetCache};
  })();

  /* =========================
     5.5 金币与打工模块
  ========================= */
  const Economy = (() => {
    function randomInt(min,max){return Math.floor(Math.random()*(max-min+1))+min}

    function dailyIncome(personality){
      const amount={spirit:10,demon:15,chaos:20}[personality]||10;
      const personalityName=CONFIG.personalities[personality]?.name||"灵珠";
      return {
        emoji:"💰",
        title:"每日养猫金币到账",
        body:`${personalityName}的每日养成金币已经到账，今天获得${amount}金币。`,
        effects:{coins:amount},
        amount
      };
    }

    function randomReward(catName){
      if(Math.random()>=.15)return null;
      const rewards=[
        {emoji:"📹",title:"猫咪视频意外走红",body:`你随手拍下的${catName}短视频突然获得许多点赞，平台发来了一笔小奖励。`,min:12,max:20},
        {emoji:"🎁",title:"朋友送来猫粮补贴",body:`朋友来看望${catName}，临走前给你留下一点养猫补贴。`,min:6,max:12},
        {emoji:"🎫",title:"捡到宠物店优惠券",body:"你整理口袋时发现一张可以折现使用的宠物店优惠券。",min:3,max:8},
        {emoji:"📸",title:"社区猫咪摄影奖励",body:`你上传的${catName}照片被社区选中，获得了一份小奖金。`,min:10,max:18},
        {emoji:"🧸",title:"旧玩具转卖成功",body:"你把已经闲置的宠物用品挂到二手平台，很快就有人买走了。",min:5,max:10}
      ];
      const reward=structuredClone(Utils.pick(rewards));
      const coins=randomInt(reward.min,reward.max);
      delete reward.min;delete reward.max;
      reward.effects={coins};
      return reward;
    }

    function work(personality,catName){
      const effects={coins:12,hunger:-5,intimacy:-1};
      let emoji="💼",title="完成一天的兼职",body=`你外出工作了一段时间，获得12金币。${catName}独自在家等你回来。`;

      if(personality==="spirit"){
        emoji="🏠";
        title="它乖乖等你回家";
        body=`你打工获得了12金币。${catName}虽然有点想你，但只是安静地守在门边等待。`;
      }else if(personality==="demon"){
        if(Math.random()<.30){
          const damage=randomInt(5,9);
          effects.damage=damage;
          emoji="📦";
          title="打工回来后的惊喜";
          body=`你打工获得了12金币，但${catName}独自在家时拆开了快递箱，还顺手破坏了一点房间。`;
        }else{
          emoji="😼";
          title="今天居然没有拆家";
          body=`你打工获得了12金币。${catName}独自在家憋了一肚子坏主意，但今天暂时没有造成损失。`;
        }
      }else{
        if(Math.random()<.60){
          const damage=randomInt(10,18);
          effects.damage=damage;
          emoji="🏚️";
          title="独自在家的耄耋";
          body=`你打工获得了12金币。回家后却发现${catName}趁你不在，对房间进行了一轮大规模破坏。`;
        }else{
          emoji="👁️";
          title="反常的平静";
          body=`你打工获得了12金币。${catName}今天没有拆家，只是躲在暗处冷冷看着你回来。`;
        }
      }

      return {emoji,title,body,effects};
    }

    return {dailyIncome,randomReward,work};
  })();

  /* =========================
     6. 游戏状态模块
  ========================= */
  const Game = (() => {
    let shelter=null,game=null,candidate=null;
    const sharedKeys=new Set(["version","slots","day","actionsLeft","coins","houseDamage","dailyTask","dailyChoice","inventory","collection","achievements","activeCatId","cats"]);
    function activeCat(){return shelter?.cats?.find(cat=>cat.id===shelter.activeCatId)||shelter?.cats?.[0]||null}
    function makeProxy(){
      if(!shelter||!activeCat())return null;
      return new Proxy({}, {
        get(_target,prop){
          if(prop==="__isGameProxy")return true;
          if(prop==="__shelter")return shelter;
          if(prop==="toJSON")return ()=>shelter;
          if(prop==="cats")return shelter.cats;
          if(sharedKeys.has(prop))return shelter[prop];
          return activeCat()?.[prop];
        },
        set(_target,prop,value){
          if(sharedKeys.has(prop))shelter[prop]=value;
          else{const cat=activeCat();if(cat)cat[prop]=value}
          return true;
        },
        has(_target,prop){return sharedKeys.has(prop)||prop in (activeCat()||{})},
        ownKeys(){return [...new Set([...Reflect.ownKeys(shelter||{}),...Reflect.ownKeys(activeCat()||{})])]},
        getOwnPropertyDescriptor(){return {enumerable:true,configurable:true,writable:true}}
      });
    }
    function get(){return game}
    function getShelter(){return shelter}
    function getCats(){return shelter?.cats||[]}
    function catCount(){return getCats().length}
    function hasRoom(){return !shelter||catCount()<shelter.slots}
    function set(value){
      if(!value){shelter=null;game=null;return null}
      shelter=Storage.normalize(value?.__isGameProxy?value.toJSON():value);
      if(!shelter){game=null;return null}
      game=makeProxy();
      TaskSystem.ensure(game);
      DailyChoiceEventSystem.ensure(game);
      AchievementSystem.ensure(shelter);
      AchievementSystem.evaluate(shelter);
      Storage.save(game);
      return game;
    }
    function getCandidate(){return candidate}
    function breedAllowedForRoute(breedKey,routeKey){const breed=CONFIG.breeds[breedKey];return !!breed&&(!breed.shopOnly||routeKey==="shop")}
    function allowedBreedsForRoute(routeKey){return Object.keys(CONFIG.breeds).filter(key=>breedAllowedForRoute(key,routeKey))}
    function personalityForBreed(breedKey,fallback){return CONFIG.breeds[breedKey]?.forcedPersonality||fallback}
    function storyForBreed(routeKey,breedKey){if(routeKey==="shop"&&breedKey==="americanSilver")return "宠物店的玻璃柜里，这只美短银虎斑一看见你就主动靠近，圆圆的眼睛一直追着你的手。店员说，它从小就格外亲人。";return CONFIG.routes[routeKey].story}
    function createCandidate(routeKey,forcedPersonality=null,forcedName="",forcedBreed=null){const route=CONFIG.routes[routeKey],allowed=allowedBreedsForRoute(routeKey),breedKey=forcedBreed&&allowed.includes(forcedBreed)?forcedBreed:Utils.pick(allowed),routePersonality=forcedPersonality||(route.initial?Utils.roll(route.initial):"spirit");candidate={routeKey,routeName:route.name,ageStage:route.ageStage,routePersonality,personality:personalityForBreed(breedKey,routePersonality),breedKey,sex:Utils.pick(CONFIG.sexes),suggestedName:forcedName||Utils.pick(CONFIG.names),story:storyForBreed(routeKey,breedKey),rerollable:routeKey!=="shelterAdult"};return candidate}
    function setCandidateBreed(breedKey){if(candidate&&breedAllowedForRoute(breedKey,candidate.routeKey)){candidate.breedKey=breedKey;candidate.personality=personalityForBreed(breedKey,candidate.routePersonality||candidate.personality);candidate.story=storyForBreed(candidate.routeKey,breedKey)}return candidate}
    function buildCat(c,name,day){
      const r=CONFIG.routes[c.routeKey],personality=personalityForBreed(c.breedKey,c.personality),stats={...r.base};
      if(personality==="spirit"){stats.trust+=8;stats.intimacy+=8}
      if(personality==="demon")stats.vitality+=8;
      if(personality==="chaos"){stats.trust-=10;stats.intimacy-=8;stats.courage+=8}
      Object.keys(stats).forEach(key=>stats[key]=Utils.clamp(stats[key]));
      const catName=name||c.suggestedName;
      return {id:globalThis.crypto?.randomUUID?.()||`cat_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,name:catName,routeKey:c.routeKey,routeName:c.routeName,breedKey:c.breedKey,sex:c.sex,ageStage:c.ageStage,personality,initialPersonality:personality,personalityChanged:c.ageStage==="adult",joinedDay:day,mood:"neutral",isSick:false,treatmentCost:null,bathDue:false,lastBathDay:null,nextBathDay:day+(["shop","friend"].includes(c.routeKey)?10:5),stats,relationship:RelationshipSystem.create(stats.intimacy,day),logs:[`第${day}天：${catName}来到你的猫舍。`]};
    }
    function adopt(name){
      if(!candidate)return {error:"还没有选择猫咪"};
      if(!hasRoom())return {error:`猫舍已经满了，目前只有${shelter.slots}个猫位`};
      const first=!shelter;
      if(first)shelter={version:10,slots:3,day:1,actionsLeft:4,coins:100,houseDamage:0,dailyTask:null,dailyChoice:null,inventory:{catStrip:0,can:0},collection:CatDexSystem.sync({},[],1),achievements:AchievementSystem.create(1),activeCatId:null,cats:[]};
      const cat=buildCat(candidate,name,shelter.day);
      const dexResult=CatDexSystem.register(shelter.collection,cat,shelter.day);shelter.cats.push(cat);shelter.collection=CatDexSystem.sync(shelter.collection,shelter.cats,shelter.day);shelter.activeCatId=cat.id;game=makeProxy();
      if(first)TaskSystem.create(game);else TaskSystem.ensure(game);
      DailyChoiceEventSystem.ensure(game);
      recordAchievement("catsAdopted");
      Storage.save(game);
      return {game,cat,first,collectionUnlock:dexResult.newUnlock};
    }
    function daysOwned(cat=activeCat()){return cat?Math.max(1,shelter.day-cat.joinedDay+1):0}
    function growthDaysLeft(cat=activeCat()){return !cat||cat.ageStage==="adult"?0:Math.max(0,7-daysOwned(cat))}
    function switchCat(id){
      if(!shelter)return {error:"还没有猫舍"};
      const cat=shelter.cats.find(item=>item.id===id);if(!cat)return {error:"没有找到这只猫"};
      shelter.activeCatId=id;game=makeProxy();
      if(game.day>=game.nextBathDay&&!game.lastBathDay)game.bathDue=true;
      let growth=null;if(game.ageStage==="kitten"&&!game.personalityChanged&&daysOwned(cat)>=7)growth=grow();
      TaskSystem.refresh(game);DailyChoiceEventSystem.ensure(game);checkAchievements();Storage.save(game);return {game,growth};
    }
    function removeActiveCat({allowLast=false}={}){
      if(!shelter||!activeCat())return {error:"没有可以移除的猫"};
      if(!allowLast&&shelter.cats.length<=1)return {error:"猫舍里只剩最后一只猫，不能弃养"};
      const removed=activeCat(),index=shelter.cats.findIndex(cat=>cat.id===removed.id);
      shelter.cats.splice(index,1);shelter.collection=CatDexSystem.sync(shelter.collection,shelter.cats,shelter.day);
      if(!shelter.cats.length){Storage.clear();shelter=null;game=null;return {removed,remaining:0,game:null}}
      shelter.activeCatId=shelter.cats[Math.min(index,shelter.cats.length-1)].id;game=makeProxy();TaskSystem.refresh(game);Storage.save(game);
      return {removed,remaining:shelter.cats.length,game};
    }
    function rollTreatmentCost(){return Math.floor(Math.random()*201)+100}
    function becomeSick(){if(!game)return null;game.isSick=true;if(!Number.isInteger(game.treatmentCost)||game.treatmentCost<100||game.treatmentCost>300)game.treatmentCost=rollTreatmentCost();return game.treatmentCost}
    function maxFor(key){if(game.personality==="chaos"&&key==="trust")return 45;if(game.personality==="chaos"&&key==="intimacy")return 35;return 100}
    function change(key,value){
      if(key==="damage"){game.houseDamage=Utils.clamp(game.houseDamage+value);return}
      if(key==="coins"){game.coins=Math.max(0,game.coins+value);return}
      const before=game.stats[key];
      game.stats[key]=Utils.clamp(game.stats[key]+value,0,maxFor(key));
      if(key==="intimacy"){
        const milestones=RelationshipSystem.onIntimacyChanged(game,before,game.stats[key]);
        milestones.forEach(event=>log(`${game.name}与你的关系提升到了“${event.title.replace("关系提升：","")}”。`));
      }
    }
    function apply(effects){Object.entries(effects||{}).forEach(([key,value])=>change(key,value))}
    function relationshipView(cat=game){if(!cat)return null;const max=cat.personality==="chaos"?35:100;return RelationshipSystem.view(cat,max)}
    function collectionView(){if(!shelter)return null;const result=CatDexSystem.view(shelter.collection,shelter.cats,shelter.day);shelter.collection=result.collection;return result}
    function takeRelationshipEvents(){if(!game)return[];const events=RelationshipSystem.takePending(game);if(events.length)Storage.save(game);return events}
    function welcomeEvent(){if(!game)return null;const event=RelationshipSystem.welcomeEvent(game);if(event){log(event.body);Storage.save(game)}return event}
    function log(text){game.logs.unshift(`第${game.day}天：${text}`);game.logs=game.logs.slice(0,40)}
    function noteAchievementUnlocks(unlocked){(unlocked||[]).forEach(definition=>log(`解锁成就“${definition.name}”，获得称号“${definition.title.name}”。`))}
    function checkAchievements(){if(!shelter)return[];const unlocked=AchievementSystem.evaluate(shelter);noteAchievementUnlocks(unlocked);return unlocked}
    function recordAchievement(key,amount=1,meta={}){if(!shelter)return[];const unlocked=AchievementSystem.record(shelter,key,amount,meta);noteAchievementUnlocks(unlocked);return unlocked}
    function achievementView(filter="all"){if(!shelter)return null;checkAchievements();return AchievementSystem.view(shelter,filter)}
    function currentTitle(){return shelter?AchievementSystem.currentTitle(shelter):null}
    function selectTitle(key){if(!shelter)return {error:"还没有猫舍"};const result=AchievementSystem.selectTitle(shelter,key);if(!result.error)Storage.save(game);return result}
    function takeAchievementEvents(){if(!shelter)return[];const events=AchievementSystem.takePending(shelter);if(events.length)Storage.save(game);return events}
    function isDead(){return !!game&&game.stats.health<=0}
    function action(actionKey){if(!game||game.actionsLeft<=0)return null;game.actionsLeft--;const hungerBefore=game.stats.hunger;const baseEvent=game.breedKey==="americanSilver"&&game.stats.hunger<70&&actionKey==="pet"?{emoji:"🐱",title:"一看见你就开始撒娇",body:`${game.name}一看见你就喵喵叫，还主动抬起头去蹭你的手。它越蹭越起劲，前爪都快离开地面，像是马上就要站起来抱住你。`,effects:{trust:2,intimacy:4},visual:{catState:"happy"}}:EventSystem.getAction(game.personality,actionKey);const event=RelationshipSystem.decorateAction(game,actionKey,baseEvent);apply(event.effects);const hungerGain=Math.max(0,game.stats.hunger-hungerBefore);TaskSystem.record(game,{type:actionKey,hungerGain});TaskSystem.refresh(game);game.mood=event.visual?.catState||((event.effects.health<0||event.effects.trust<0)?"angry":actionKey==="play"||actionKey==="feed"?"happy":"neutral");log(event.body);recordAchievement(actionKey==="clean"?"cleanLitter":actionKey);Storage.save(game);return {event,death:isDead()}}
    function work(){if(!game||game.actionsLeft<=0)return null;game.actionsLeft--;const event=Economy.work(game.personality,game.name);apply(event.effects);TaskSystem.refresh(game);game.mood=event.effects.damage?"angry":"neutral";log(event.body);recordAchievement("work");Storage.save(game);return {event,death:isDead()}}
    const mallItems={catStrip:{name:"猫条",emoji:"🍗",price:5,hunger:20,intimacy:2},can:{name:"猫罐头",emoji:"🥫",price:10,hunger:50,intimacy:5}};
    function inventory(){if(!shelter.inventory)shelter.inventory={catStrip:0,can:0};return shelter.inventory}
    function buyItem(itemKey){if(!game)return {error:"没有小猫"};const item=mallItems[itemKey];if(!item)return {error:"商品不存在"};if(game.coins<item.price)return {error:`金币不足，还需要${item.price-game.coins}金币`};change("coins",-item.price);inventory()[itemKey]=(inventory()[itemKey]||0)+1;TaskSystem.record(game,{type:"shop"});TaskSystem.refresh(game);const event={emoji:"🛍️",title:`${item.name}已放入背包`,body:`你花了${item.price}金币购买${item.name}。它已经放进猫舍共享背包，可以选择任意一只猫使用。`,effects:{coins:-item.price}};log(`你在商场购买了${item.name}，当前库存${inventory()[itemKey]}个。`);recordAchievement("itemsBought");Storage.save(game);return {event,death:false}}
    function useItem(itemKey){if(!game)return {error:"没有小猫"};const item=mallItems[itemKey];if(!item)return {error:"物品不存在"};if((inventory()[itemKey]||0)<=0)return {error:`背包里没有${item.name}了`};if(game.stats.hunger>=100)return {error:`${game.name}现在已经吃得很饱了`};inventory()[itemKey]--;const hungerBefore=game.stats.hunger,intimacyBefore=game.stats.intimacy;change("hunger",item.hunger);change("intimacy",item.intimacy);const gained=Math.round(game.stats.hunger-hungerBefore),actualIntimacyGained=Math.round(game.stats.intimacy-intimacyBefore);TaskSystem.record(game,{type:"feedItem",hungerGain:gained});TaskSystem.refresh(game);game.mood="happy";const baseEvent={emoji:item.emoji,title:`${game.name}吃掉了${item.name}`,body:`你从背包里拿出${item.name}。${game.name}闻到香味立刻凑了过来，很快吃得干干净净，也和你更亲近了。`,effects:{hunger:gained,intimacy:actualIntimacyGained},visual:{catState:"happy"}};const event=RelationshipSystem.decorateAction(game,"feedItem",baseEvent);log(`你从背包取出${item.name}喂给${game.name}，饱腹增加${gained}，亲密增加${actualIntimacyGained}。`);recordAchievement("itemsUsed");recordAchievement("feed");Storage.save(game);return {event,death:false}}
    function cleanRoom(){if(!game)return {error:"没有小猫"};if(game.actionsLeft<=0)return {error:"今天已经没有行动次数了"};if(game.houseDamage<=0)return {error:"房间现在已经很干净了"};game.actionsLeft--;const before=game.houseDamage;game.houseDamage=Utils.clamp(game.houseDamage-25);const reduced=Math.round(before-game.houseDamage);const event={emoji:"🧽",title:"房间打扫完成",body:`你花时间收拾了散落的猫粮、猫砂和被弄乱的物品，房屋损坏度降低了${reduced}%。`,effects:{damage:-reduced}};TaskSystem.record(game,{type:"cleanRoom"});TaskSystem.refresh(game);log(event.body);recordAchievement("cleanRoom",1,{before,after:game.houseDamage});Storage.save(game);return {event,death:isDead()}}
    function claimDailyTask(){if(!game)return {error:"没有小猫"};const result=TaskSystem.claim(game);if(result.error)return result;game.mood="happy";recordAchievement("tasksClaimed");Storage.save(game);return result}
    function dailyChoiceView(){if(!game)return null;return DailyChoiceEventSystem.view(game)}
    function resolveDailyChoice(choiceId){
      if(!game)return {error:"没有小猫"};
      const selected=DailyChoiceEventSystem.select(game,choiceId);
      if(selected.error)return selected;
      const {choice}=selected;
      if(choice.actions)game.actionsLeft=Utils.clamp(game.actionsLeft+choice.actions,0,4);
      Object.entries(choice.inventory||{}).forEach(([key,value])=>{game.inventory[key]=Math.max(0,(game.inventory[key]||0)+value)});
      apply(choice.effects||{});
      game.dailyChoice.resolved=true;game.dailyChoice.choiceId=choice.id;
      const outcome=DailyChoiceEventSystem.outcome(game,choice);
      const event={...outcome,effects:{...(choice.effects||{})}};
      game.mood=event.visual?.catState||"neutral";
      log(`每日随机事件“${event.title}”：${event.body}`);
      recordAchievement("eventsResolved");
      Storage.save(game);
      return {event,death:isDead()};
    }
    function endDay(){
      game.day++;game.actionsLeft=4;const events=[];
      change("hunger",-18);change("cleanliness",-11);change("vitality",18);
      if(game.stats.hunger<25){change("health",-8);log(`${game.name}饿得没有精神，健康下降。`)}
      if(game.stats.cleanliness<25){change("health",-6);log(`环境太脏，${game.name}的健康受到影响。`)}
      const dayEvent=EventSystem.getDay(game.personality);apply(dayEvent.effects);game.mood=dayEvent.effects.health<0||dayEvent.effects.damage>10?"angry":"sleepy";log(dayEvent.body);events.push(dayEvent);
      const incomeEvent=Economy.dailyIncome(game.personality);apply(incomeEvent.effects);log(`每日养猫金币到账，获得${incomeEvent.amount}金币。`);events.push(incomeEvent);
      const companionEvent=RelationshipSystem.dailyCompanionReward(game);if(companionEvent){apply(companionEvent.effects);log(companionEvent.body);events.push(companionEvent)}
      const rewardEvent=Economy.randomReward(game.name);if(rewardEvent){apply(rewardEvent.effects);log(rewardEvent.body);events.push(rewardEvent)}
      if(game.isSick){change("health",-8);const sickEvent={emoji:"🤒",title:"病情没有好转",body:`${game.name}仍然在生病，精神比昨天更差了。`,effects:{health:-8}};events.push(sickEvent);log(sickEvent.body)}
      else if(Math.random()<.04){const cost=becomeSick();change("health",-12);const sickEvent={emoji:"🌡️",title:"小猫生病了",body:`${game.name}今天突然没什么精神，也不太愿意吃东西。本次治疗费用为${cost}金币，最好尽快带它去看病。`,effects:{health:-12}};events.push(sickEvent);log(sickEvent.body)}
      if(!game.bathDue&&game.day>=game.nextBathDay){game.bathDue=true;const bathEvent={emoji:"🛁",title:"该洗澡并剪指甲了",body:`${game.name}已经到需要护理的时间。请从房间图片上的“护理与看病”入口处理。`,effects:{}};events.push(bathEvent);log(bathEvent.body)}
      let growth=null;if(game.ageStage==="kitten"&&!game.personalityChanged&&daysOwned()>=7)growth=grow();
      TaskSystem.create(game);log(`新的每日任务：${TaskSystem.view(game).name}。`);DailyChoiceEventSystem.create(game);log("今天出现了一个新的随机事件，等待你的选择。");checkAchievements();Storage.save(game);return {events,growth,dailyChoice:DailyChoiceEventSystem.view(game),death:isDead()}
    }
    function grow(){const old=game.personality;const growthWeights=CONFIG.routes[game.routeKey]?.growth||{spirit:1,demon:1,chaos:1};const next=personalityForBreed(game.breedKey,Utils.roll(growthWeights));game.ageStage="adult";game.personality=next;CatDexSystem.markStage(shelter.collection,game,"adult",game.day);game.personalityChanged=true;if(next==="chaos"){game.stats.trust=Math.min(game.stats.trust,45);game.stats.intimacy=Math.min(game.stats.intimacy,35);RelationshipSystem.ensure(game)}game.mood=next==="chaos"?"angry":"neutral";const story=next==="spirit"?`${game.name}长大后安静了许多，开始每天主动趴在你身边。`:next==="demon"?`你发现家里的杯子总会莫名其妙掉到地上。监控里的${game.name}每次推完都会若无其事地走开。`:`${game.name}静静看着你。下一秒，它突然给了你一爪，随后转身抓坏了新沙发。`;log(`${game.name}成年了，性格从“${CONFIG.personalities[old].name}”定型为“${CONFIG.personalities[next].name}”。`);recordAchievement("catsGrown");return {old,next,story}}
    return {get,set,getShelter,getCats,catCount,hasRoom,getCandidate,createCandidate,setCandidateBreed,breedAllowedForRoute,allowedBreedsForRoute,adopt,switchCat,removeActiveCat,daysOwned,growthDaysLeft,maxFor,change,apply,log,isDead,action,work,buyItem,useItem,cleanRoom,claimDailyTask,dailyChoiceView,resolveDailyChoice,endDay,becomeSick,relationshipView,takeRelationshipEvents,welcomeEvent,collectionView,checkAchievements,recordAchievement,achievementView,currentTitle,selectTitle,takeAchievementEvents};
  })();

  /* =========================
     7. 护理与看病模块
  ========================= */
  const Care = (() => {
    let waitingChaosChoice=false;
    function completeBath(){const g=Game.get();g.stats.cleanliness=100;g.bathDue=false;g.lastBathDay=g.day;g.nextBathDay=g.day+10;Game.recordAchievement("care")}
    function makeSick(amount=15){const g=Game.get();Game.becomeSick();Game.change("health",-amount)}
    function useAction(){const g=Game.get();if(!g||g.actionsLeft<=0)return false;g.actionsLeft--;return true}
    function bath(){
      const g=Game.get();if(!g)return {error:"没有小猫"};if(!g.bathDue)return {error:"现在还不需要洗澡并剪指甲"};if(!useAction())return {error:"今天已经没有行动次数了"};
      const r=Math.random();let event;
      if(g.personality==="spirit"){
        if(r<.85){completeBath();Game.apply({trust:3,intimacy:4});event={emoji:"🫧",title:"乖乖完成护理",body:`${g.name}安静地站在水盆里，剪指甲时也只是轻轻缩了缩爪子。`,effects:{cleanliness:"恢复到100",trust:3,intimacy:4}}}
        else if(r<.95){completeBath();Game.apply({trust:1,intimacy:2});event={emoji:"🤍",title:"需要一点安抚",body:`${g.name}中途有些挣扎。你用毛巾包住它、轻声安抚后，终于完成了洗澡和剪指甲。`,effects:{cleanliness:"恢复到100",trust:1,intimacy:2}}}
        else{completeBath();makeSick();event={emoji:"🌡️",title:"护理后应激生病",body:`${g.name}虽然完成了洗澡和剪指甲，却因为紧张出现应激反应，随后病倒了。`,effects:{cleanliness:"恢复到100",health:-15}}}
      }else if(g.personality==="demon"){
        if(r<.85){completeBath();Game.apply({trust:1,intimacy:2});event={emoji:"💦",title:"挣扎了很久",body:`${g.name}从头到尾都在试图逃跑。你花了很久安抚它，才勉强完成护理。`,effects:{cleanliness:"恢复到100",trust:1,intimacy:2}}}
        else if(r<.95){completeBath();Game.apply({trust:3,intimacy:4});event={emoji:"🫧",title:"今天意外地很乖",body:`${g.name}今天像换了一只猫，洗澡和剪指甲都异常配合。`,effects:{cleanliness:"恢复到100",trust:3,intimacy:4}}}
        else{completeBath();makeSick();event={emoji:"🌡️",title:"护理后应激生病",body:`${g.name}在激烈挣扎后出现应激反应，虽然护理完成了，但它生病了。`,effects:{cleanliness:"恢复到100",health:-15}}}
      }else{
        if(r<.75){waitingChaosChoice=true;Storage.save(g);return {choice:true,event:{emoji:"😾",title:"它攻击了你",body:`${g.name}在碰到水的一瞬间猛烈反击，然后缩到角落持续哈气。`,effects:{}}}}
        if(r<.90){completeBath();makeSick();event={emoji:"🌡️",title:"直接应激生病",body:`${g.name}在护理过程中严重应激。洗澡和剪甲完成了，但它随后病倒。`,effects:{cleanliness:"恢复到100",health:-15}}}
        else{completeBath();event={emoji:"🧤",title:"挣扎后勉强完成",body:`${g.name}不断挣扎和哈气。你用厚毛巾包住它并慢慢安抚，终于完成护理。`,effects:{cleanliness:"恢复到100"}}}
      }
      Game.log(event.body);Storage.save(g);return {event,death:Game.isDead()}
    }
    function resolveChaos(force){const g=Game.get();if(!g||!waitingChaosChoice)return null;waitingChaosChoice=false;let event;
      if(!force){event={emoji:"🛋️",title:"你放弃了洗澡",body:`${g.name}立刻钻到沙发底下，对着外面持续哈气。今天的护理没有完成。`,effects:{}}}
      else if(Math.random()<.70){completeBath();makeSick();event={emoji:"🌡️",title:"强行清洗后应激生病",body:`你强行完成了洗澡和剪指甲，但${g.name}出现严重应激，并在之后病倒。`,effects:{cleanliness:"恢复到100",health:-15}}}
      else{event={emoji:"🛋️",title:"洗澡失败",body:`${g.name}挣脱后跑到沙发底下哈气。洗澡和剪指甲没有完成。`,effects:{}}}
      Game.log(event.body);Storage.save(g);return {event,death:Game.isDead()}
    }
    function doctor(){const g=Game.get();if(!g)return {error:"没有小猫"};if(!g.isSick)return {error:`${g.name}目前没有生病`};if(g.actionsLeft<=0)return {error:"今天已经没有行动次数了"};const cost=Game.becomeSick();if(g.coins<cost)return {error:`金币不足，本次看病需要${cost}金币`};g.actionsLeft--;g.coins-=cost;g.isSick=false;g.treatmentCost=null;Game.change("health",30);g.mood="neutral";const event={emoji:"🏥",title:"看病完成",body:`医生检查并治疗了${g.name}。本次治疗花费${cost}金币，它已经脱离生病状态，需要继续好好休息。`,effects:{coins:-cost,health:30}};Game.log(event.body);Game.recordAchievement("care");Storage.save(g);return {event,death:Game.isDead()}}
    return {bath,resolveChaos,doctor};
  })();

  /* =========================
     7.5 手机沉浸式 HUD 控制
  ========================= */
  const PhoneHud = (() => {
    const {$,$$}=Utils;
    let hideTimer=null;
    const isPhone=()=>document.documentElement.classList.contains('phone-landscape')&&document.body.classList.contains('game-home-active');
    const hasBlockingUi=()=>Boolean($('.hud-drawer.show')||$('.game-overlay-screen.active')||$('.overlay.show')||$('.asset-loading.show'));
    function clear(){if(hideTimer){clearTimeout(hideTimer);hideTimer=null}}
    function hide(){clear();if(!isPhone()||hasBlockingUi())return;document.body.classList.add('phone-hud-hidden')}
    function schedule(delay=2200){clear();if(!isPhone()||hasBlockingUi())return;hideTimer=setTimeout(hide,delay)}
    function show(reschedule=true){clear();document.body.classList.remove('phone-hud-hidden');if(reschedule)schedule()}
    function hold(){clear();document.body.classList.remove('phone-hud-hidden')}
    function bind(){
      const shell=$('.game-shell'),reveal=$('#hudRevealBtn');
      reveal?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();show(true)});
      shell?.addEventListener('pointerdown',event=>{if(event.target.closest('#hudRevealBtn'))return;show(true)},{passive:true});
      window.addEventListener('resize',()=>{if(isPhone())show(true);else{clear();document.body.classList.remove('phone-hud-hidden')}},{passive:true});
      document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();else show(true)});
    }
    return {bind,show,hide,schedule,hold,clear,isPhone};
  })();

  /* =========================
     8. 界面渲染模块
  ========================= */
  const UI = (() => {
    const {$,$$,clamp}=Utils;let eventCloseCallback=null,eventHomePose=null,catDexFilter='all',achievementFilter='all';
    function showAssetLoading(text="正在加载房间和猫咪素材……"){
      const overlay=$("#assetLoading");
      if(!overlay)return;
      $("#assetLoadingText").textContent=text;
      overlay.classList.add("show");
    }
    function hideAssetLoading(){
      const overlay=$("#assetLoading");
      if(overlay)overlay.classList.remove("show");
    }
    function updateAssetModeButton(){const pref=AssetManager.getPreference();const text=!pref?"尚未选择":pref.mode==="none"?"轻量无图片":`完整图片 · ${CONFIG.breeds[pref.breed]?.name||"已选择"}`;$("#assetSettingsBtn").textContent=`🎨 画面模式：${text}`;const hud=$("#hudSettingsBtn");if(hud)hud.title=`画面模式：${text}`}
    function updateBackgroundStatus(progress,finished=false){const box=$("#assetBackgroundStatus");if(!box)return;if(finished){box.textContent=progress?.failed?.length?`⚠️ 有${progress.failed.length}张图片未成功，下次进入会继续尝试`:`✅ 其他可用品种已保存到本机`;box.classList.add("show","done");setTimeout(()=>box.classList.remove("show"),3200);return}box.classList.remove("done");box.classList.add("show");box.textContent=`🐾 后台准备其他猫咪 ${progress.completed}/${progress.total}`}

    function showScreen(id){const overlayIds=['attributeScreen','careScreen','mallScreen','shelterManageScreen','catDexScreen','achievementScreen'],isGameOverlay=overlayIds.includes(id);if(isGameOverlay){$$('.screen').forEach(screen=>{if(screen.id==='homeScreen')screen.classList.add('active');else if(overlayIds.includes(screen.id))screen.classList.toggle('active',screen.id===id);else screen.classList.remove('active')})}else{$$('.screen').forEach(screen=>screen.classList.toggle('active',screen.id===id))}document.body.classList.toggle('game-home-active',id==='homeScreen'||isGameOverlay);$$('.hud-drawer').forEach(drawer=>{drawer.classList.remove('show');drawer.setAttribute('aria-hidden','true')});$('#hudDrawerScrim')?.classList.remove('show');const adopted=!!Game.get();$('#abandonBtn').classList.toggle('show',adopted&&Game.catCount()>1&&(id==='homeScreen'||isGameOverlay));if($('#routeSectionTitle'))$('#routeSectionTitle').textContent=adopted?'再获得一只新猫':'先获得一只小猫';if(!isGameOverlay)window.scrollTo({top:0,behavior:'smooth'});if(id==='homeScreen'){PhoneHud.show(true)}else{PhoneHud.hold()}}
    function renderCandidate(){const c=Game.getCandidate(),breed=CONFIG.breeds[c.breedKey];Visual.preload(c);Visual.renderScene('#candidateArt',{...c,houseDamage:0,mood:'neutral',isSick:false},{showAssetHint:true});$('#candidateTitle').textContent=c.ageStage==='adult'?'你决定领养这只成年猫':'你遇见了一只小猫';$('#originStory').textContent=c.story;$('#candidateAge').textContent=c.ageStage==='adult'?'成年猫（性格固定）':'幼猫（第7天成年）';$('#candidateBreed').textContent=breed.name;$('#candidateSex').textContent=c.sex;$('#candidatePersonality').textContent=`${CONFIG.personalities[c.personality].name} · ${breed.forcedPersonality?'品种固定性格':c.ageStage==='adult'?'不会变化':'成年时重新定型'}`;const select=$('#candidateBreedSelect'),allowed=Game.allowedBreedsForRoute(c.routeKey);select.innerHTML=allowed.map(key=>{const item=CONFIG.breeds[key];return `<option value="${key}" ${key===c.breedKey?'selected':''}>${item.name}${item.shopOnly?'（宠物店限定）':''}${item.imageReady?'':'（图片开发中）'}</option>`}).join('');if(breed.shopOnly)$('#candidateBreedHint').textContent='美短银虎斑仅可在宠物店获得，性格100%固定为灵珠。当前图片尚未完成时会使用内置轻量画面。';else $('#candidateBreedHint').textContent=breed.imageReady?'这个品种已有 WebP 图片；如果尚未缓存，系统会在领养前自动准备。':'该品种 WebP 图片仍在开发中，目前会使用内置轻量画面。';$('#catNameInput').value=c.suggestedName;$('#rerollBtn').style.display=c.rerollable?'block':'none';const hasShelter=!!Game.getShelter(),full=hasShelter&&!Game.hasRoom();$('#adoptBtn').textContent=hasShelter?'加入猫舍':'带它回家';$('#adoptBtn').disabled=full;if(full)$('#candidateBreedHint').textContent='猫舍已经满了。请先返回猫舍处理现有猫咪。'}
    function statCards(game,keys){const labels={health:'❤️ 健康',trust:'🤝 信任',vitality:'⚡ 活力',courage:'🛡️ 胆量',intimacy:'💗 亲密',hunger:'🥩 饱腹',cleanliness:'✨ 清洁'};return keys.map(k=>{const v=game.stats[k];const p=v/Game.maxFor(k)*100;return `<div class="stat-card"><div class="stat-head"><span>${labels[k]}</span><span>${Math.round(v)}</span></div><div class="bar"><span style="width:${clamp(p)}%"></span></div></div>`}).join('')}
    function hudStats(game){
      const relationship=Game.relationshipView();
      const items=[
        ['health','💗','健康',game.stats.health,100],['hunger','🥩','饱腹',game.stats.hunger,100],['cleanliness','🫧','清洁',game.stats.cleanliness,100],['intimacy','💕',`亲密·${relationship.name}`,game.stats.intimacy,Game.maxFor('intimacy')],
        ['vitality','⚡','活力',game.stats.vitality,100],['courage','🛡️','胆量',game.stats.courage,100],['damage','🏠','破坏',game.houseDamage,100],['coins','🪙','金币',game.coins,null]
      ];
      return items.map(([key,icon,label,value,max])=>{const rounded=Math.round(value);const warning=max&&rounded<30;const sick=key==='health'&&game.isSick;const display=max?`${rounded}/${Math.round(max)}`:`${rounded}`;return `<div class="hud-stat ${warning?'warning':''} ${sick?'sick':''}" data-stat-key="${key}" title="${label} ${display}"><span class="hud-stat-icon">${icon}</span><span class="hud-stat-label">${label}</span><span class="hud-stat-value">${display}</span></div>`}).join('');
    }
    function damageLabel(d){return d<15?'房间完好':d<40?'轻微破坏':d<70?'明显破坏':'惨不忍睹'}
    function renderDailyTask(g){const task=TaskSystem.view(g),card=$('#dailyTaskCard'),button=$('#taskClaimBtn');$('#dailyTaskEmoji').textContent=task.emoji;$('#dailyTaskName').textContent=task.name;$('#dailyTaskReward').textContent=`奖励 ${task.reward}金币`;$('#dailyTaskDesc').textContent=task.desc;$('#dailyTaskProgressText').textContent=task.progressText;$('#dailyTaskStatus').textContent=task.claimed?'已领取':task.completed?'已完成':'进行中';$('#dailyTaskProgressBar').style.width=`${task.percent}%`;card.classList.toggle('claimed',task.claimed);button.disabled=!task.completed||task.claimed;button.textContent=task.claimed?'今日奖励已领取':task.completed?'领取任务奖励':'完成后领取'}
    function renderPortraitQuick(g){
      const button=$('#portraitQuickCard');if(!button||!g)return;
      const daily=Game.dailyChoiceView(),task=TaskSystem.view(g);
      if(daily&&!daily.resolved){
        $('#portraitQuickIcon').textContent='✨';
        $('#portraitQuickText').textContent=`${g.name}今天遇到了一件事`;
        $('#portraitQuickProgress').textContent='点击处理';
        button.dataset.quickType='event';
      }else{
        $('#portraitQuickIcon').textContent=task.emoji||'📋';
        $('#portraitQuickText').textContent=`今日任务：${task.name}`;
        $('#portraitQuickProgress').textContent=task.claimed?'已领取':task.completed?'可领取':task.progressText;
        button.dataset.quickType='task';
      }
    }
    function renderHome(){const g=Game.get();if(!g)return;TaskSystem.ensure(g);TaskSystem.refresh(g);const relation=Game.relationshipView();$('#dayChip').textContent=`第 ${g.day} 天`;if($('#portraitCoinChip'))$('#portraitCoinChip').textContent=`🪙 ${Math.round(g.coins)}`;$('#homeCatName').textContent=g.name;$('#homeCatSub').textContent=`${CONFIG.breeds[g.breedKey].name} · ${g.sex} · ${g.ageStage==='adult'?'成年猫':'幼猫'} · ${CONFIG.personalities[g.personality].name}`;$('#homeRelationshipChip').textContent=`${relation.emoji} ${relation.name} · 亲密 ${relation.value}/${relation.maximum}`;const equippedTitle=Game.currentTitle(),titleChip=$('#homeTitleChip');titleChip.hidden=!equippedTitle;if(equippedTitle)titleChip.textContent=`${equippedTitle.emoji} 称号 · ${equippedTitle.name}`;Visual.preload(g);Visual.renderScene('#roomArt',g);$('#roomCaption').textContent=roomCaption(g);$('#damageLabel').textContent=`${damageLabel(g.houseDamage)} · ${Math.round(g.houseDamage)}%`;$('#careBtn').classList.toggle('alert',g.bathDue||g.isSick);$('#careLabel').textContent=g.isSick?'小猫生病了':g.bathDue?'需要护理':'护理与看病';$('#compactStats').innerHTML=hudStats(g);renderDailyTask(g);const task=TaskSystem.view(g);$('#taskDot').classList.toggle('show',task.completed&&!task.claimed);const dailyChoice=Game.dailyChoiceView();$('#dailyEventDot')?.classList.toggle('show',Boolean(dailyChoice&&!dailyChoice.resolved));renderPortraitQuick(g);$('#actionPointsText').textContent=`今日行动 ${g.actionsLeft}/4`;$('#growthText').textContent=g.ageStage==='adult'?'已成年':`距离成年 ${Game.growthDaysLeft()}天`;const root=Game.getShelter();if($('#shelterCount'))$('#shelterCount').textContent=`${root.cats.length}/${root.slots}`;const dex=Game.collectionView();if($('#catDexCount')&&dex)$('#catDexCount').textContent=`${dex.summary.unlocked}/${dex.summary.total}`;const achievementData=Game.achievementView();if($('#achievementCount')&&achievementData)$('#achievementCount').textContent=`${achievementData.summary.unlocked}/${achievementData.summary.total}`;$$('.action-btn').forEach(button=>{button.disabled=(button.id!=='sleepBtn'&&button.id!=='mobileActionMoreBtn'&&button.dataset.action!=='feed'&&g.actionsLeft<=0)});$$('.action-remaining').forEach(el=>el.textContent=g.actionsLeft);if($('#feedNormalBtn'))$('#feedNormalBtn').disabled=g.actionsLeft<=0;renderMall();$('#cleanRoomBtn').disabled=g.actionsLeft<=0||g.houseDamage<=0;if($('#moreCleanBtn'))$('#moreCleanBtn').disabled=g.actionsLeft<=0||g.houseDamage<=0;if($('#mobileCleanLitterBtn'))$('#mobileCleanLitterBtn').disabled=g.actionsLeft<=0;if($('#mobileWorkBtn'))$('#mobileWorkBtn').disabled=g.actionsLeft<=0;$('#cleanRoomLabel').textContent=g.houseDamage>0?`打扫房间 -25%`:'房间很干净';$('#logList').innerHTML=g.logs.map(x=>`<div class="log-item">${x}</div>`).join('');renderMall();Storage.save(g);PhoneHud.schedule()}
    function roomCaption(g){if(g.isSick)return `${g.name}生病了，看起来没有精神。`;if(g.mood==='angry')return `${g.name}现在看起来不太高兴。`;if(g.mood==='sleepy')return `${g.name}困了，正准备找地方睡觉。`;if(g.mood==='happy')return `${g.name}心情很好，尾巴轻轻晃着。`;if(g.stats.hunger<25)return `${g.name}正在等你放饭。`;const relation=Game.relationshipView();if(relation.rank>=5)return `${g.name}几乎一直守在你身边，已经和你形影不离。`;if(relation.rank>=4)return `${g.name}一看见你就会主动靠近。`;if(relation.rank>=2)return `${g.name}在你身边很放松，安静地观察着房间。`;return `${g.name}在房间里观察你。`}
    function renderShelter(){
      const root=Game.getShelter(),g=Game.get();if(!root||!g)return;
      const esc=value=>String(value??"").replace(/[&<>\"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
      $('#shelterDay').textContent=`第${root.day}天`;
      $('#shelterCapacityText').textContent=`猫位 ${root.cats.length} / ${root.slots}`;
      $('#shelterCoins').textContent=`🪙 ${root.coins}`;
      const cards=root.cats.map(cat=>{
        const active=cat.id===root.activeCatId,breed=CONFIG.breeds[cat.breedKey],personality=CONFIG.personalities[cat.personality];
        const relation=RelationshipSystem.view(cat,cat.personality==='chaos'?35:100);
        const icon=cat.breedKey==='black'?'🐈‍⬛':'🐱';
        return `<article class="shelter-cat-card ${active?'active':''}">${active?'<span class="shelter-active-badge">正在照顾</span>':''}<div class="shelter-cat-emoji">${icon}</div><h3 class="shelter-cat-name">${esc(cat.name)}</h3><div class="shelter-cat-meta">${esc(breed.name)} · ${esc(cat.sex)}<br>${cat.ageStage==='adult'?'成年猫':'幼猫'} · ${esc(personality.name)}</div><div class="shelter-relationship"><span>${relation.emoji} ${relation.name}</span><small>${relation.value}/${relation.maximum}</small></div><div class="shelter-mini-stats"><div class="shelter-mini-row"><span>健康</span><div class="bar"><span style="width:${clamp(cat.stats.health)}%"></span></div><b>${Math.round(cat.stats.health)}</b></div><div class="shelter-mini-row"><span>饱腹</span><div class="bar"><span style="width:${clamp(cat.stats.hunger)}%"></span></div><b>${Math.round(cat.stats.hunger)}</b></div></div><button class="shelter-switch-btn" data-shelter-switch="${cat.id}" ${active?'disabled':''}>${active?'当前猫咪':'切换照顾'}</button></article>`;
      });
      for(let index=root.cats.length;index<root.slots;index++)cards.push(`<button class="shelter-empty-card" data-add-cat><span>➕</span><strong>空猫位</strong><small>去救助站、宠物店或其他地点获得新猫</small></button>`);
      $('#catShelterGrid').innerHTML=cards.join('');
      $('#addCatFromShelterBtn').disabled=!Game.hasRoom();
      $('#addCatFromShelterBtn').textContent=Game.hasRoom()?'＋ 获得一只新猫':'猫舍已满';
    }
    function renderAttributes(){const g=Game.get(),p=CONFIG.personalities[g.personality],relation=Game.relationshipView();$('#attributeDay').textContent=`第${g.day}天`;$('#attributeName').textContent=`${g.name}的档案`;Visual.renderScene('#attributeArt',g);$('#attributeInfo').innerHTML=`<div class="info-box"><small>品种</small><strong>${CONFIG.breeds[g.breedKey].name}</strong></div><div class="info-box"><small>性别</small><strong>${g.sex}</strong></div><div class="info-box"><small>年龄</small><strong>${g.ageStage==='adult'?'成年猫':'幼猫'}</strong></div><div class="info-box"><small>获得方式</small><strong>${g.routeName}</strong></div><div class="info-box"><small>初始性格</small><strong>${CONFIG.personalities[g.initialPersonality].name}</strong></div><div class="info-box"><small>亲密关系</small><strong>${relation.emoji} ${relation.name}</strong></div>`;$('#attributeStats').innerHTML=statCards(g,['health','trust','vitality','courage','intimacy','hunger','cleanliness']);const nextText=relation.next?(relation.cappedBeforeNext?`受当前性格上限影响，亲密最高为 ${relation.maximum}，暂时无法到达「${relation.next.name}」。`:`距离「${relation.next.name}」还需要 ${Math.max(0,relation.nextAt-relation.value)} 点亲密。`):'你们已经达到最高关系等级。';$('#attributeRelationship').innerHTML=`<div class="relationship-detail-head"><div><small>亲密关系</small><h3>${relation.emoji} ${relation.name}</h3></div><strong class="relationship-detail-value">${relation.value}/${relation.maximum}</strong></div><div class="relationship-progress"><span style="width:${relation.segmentPercent}%"></span></div><p>${relation.description}</p><p class="relationship-next">${nextText}</p><div class="relationship-unlocks">${relation.unlocked.map(item=>`<span class="relationship-unlock">${item.emoji} ${item.unlock}</span>`).join('')}</div>`;$('#attributePersonality').textContent=`当前性格：${p.name}`;$('#attributePersonalityDesc').textContent=p.desc}
    function renderCare(){const g=Game.get();if(!g)return;const cost=g.isSick?(Number.isInteger(g.treatmentCost)?g.treatmentCost:Game.becomeSick()):null;$('#careDay').textContent=`第${g.day}天`;Visual.renderScene('#careArt',g,{state:g.isSick?'sick':null});$('#bathStatus').textContent=g.bathDue?'现在需要护理':`下次第${g.nextBathDay}天`;$('#illnessStatus').textContent=g.isSick?`生病中 · 治疗${cost}金币`:'健康';$('#careActionsLeft').textContent=`${g.actionsLeft}/4`;$('#careCoins').textContent=`${g.coins}`;$('#careNotice').innerHTML=g.isSick?`<div class="sick-note">${g.name}正在生病。生病期间每天会继续损失健康，本次治疗费用为${cost}金币，请尽快看病。</div>`:`<div class="healthy-note">${g.name}目前没有生病。每天结束时有4%的概率随机生病，每次治疗费用会在100～300金币之间随机生成。</div>`;$('#bathBtn').disabled=!g.bathDue||g.actionsLeft<=0;$('#bathBtnHint').textContent=g.bathDue?'本次护理会消耗1次行动':'还没有到需要护理的时间';$('#doctorBtnHint').textContent=g.isSick?`本次治疗需要${cost}金币，并消耗1次行动`:'每次生病的治疗费在100～300金币之间随机生成';$('#doctorBtn').disabled=!g.isSick||g.actionsLeft<=0||g.coins<cost}
    function renderMall(){const g=Game.get();if(!g)return;const bag=Game.getShelter()?.inventory||{catStrip:0,can:0},hunger=Math.round(g.stats.hunger),full=g.stats.hunger>=100,total=(bag.catStrip||0)+(bag.can||0);$('#mallCoins').textContent=`金币：${g.coins}`;$('#mallSummary').innerHTML=`<strong>🎒 猫舍共享背包：${total}件</strong><div>🍗 猫条 ×${bag.catStrip||0}　🥫 猫罐头 ×${bag.can||0}</div>`;if($('#feedDrawerSummary'))$('#feedDrawerSummary').innerHTML=`${g.name}的饱腹为 <strong>${hunger}/100</strong>。背包：猫条 <strong>×${bag.catStrip||0}</strong>，罐头 <strong>×${bag.can||0}</strong>。`;if($('#feedCatStripCount'))$('#feedCatStripCount').textContent=`库存 ×${bag.catStrip||0}`;if($('#feedCanCount'))$('#feedCanCount').textContent=`库存 ×${bag.can||0}`;if($('#bagCatStripCount'))$('#bagCatStripCount').textContent=bag.catStrip||0;if($('#bagCanCount'))$('#bagCanCount').textContent=bag.can||0;if($('#bagCount'))$('#bagCount').textContent=total;if($('#mallCatStripStock'))$('#mallCatStripStock').textContent=`背包 ×${bag.catStrip||0}`;if($('#mallCanStock'))$('#mallCanStock').textContent=`背包 ×${bag.can||0}`;$('#mallNote').textContent=`商品购买后会进入共享背包。当前选中的猫是${g.name}，使用食物时才会增加饱腹和亲密。`;$$('[data-buy-item]').forEach(button=>{const price=button.dataset.buyItem==='catStrip'?5:10;button.disabled=g.coins<price});$$('[data-use-item]').forEach(button=>{const key=button.dataset.useItem;button.disabled=full||(bag[key]||0)<=0})}

    function renderCatDex(filter=catDexFilter){
      const data=Game.collectionView();if(!data)return;
      catDexFilter=filter;
      $('#catDexDay').textContent=`第${Game.get().day}天`;
      $('#catDexSummary').innerHTML=`<div class="catdex-summary-item"><small>已发现品种</small><strong>${data.summary.unlocked} / ${data.summary.total}</strong></div><div class="catdex-summary-item"><small>图鉴完成度</small><strong>${data.summary.percent}%</strong></div><div class="catdex-summary-item"><small>当前猫舍</small><strong>${data.summary.currentOwned}只</strong></div><div class="catdex-summary-item"><small>累计获得</small><strong>${data.summary.totalObtained}只</strong></div>`;
      $$('#catDexFilter [data-catdex-filter]').forEach(button=>button.classList.toggle('active',button.dataset.catdexFilter===filter));
      const list=data.list.filter(item=>filter==='all'||(filter==='unlocked'?item.unlocked:!item.unlocked));
      $('#catDexGrid').innerHTML=list.map(item=>{
        const stageTags=item.unlocked?item.ageStages.map(stage=>`<span>${stage==='adult'?'成年':'幼猫'}</span>`).join(''):'';
        const status=item.unlocked?`当前拥有 ${item.currentOwned}只 · 累计获得 ${item.totalObtained}只`:'尚未收入图鉴';
        return `<button class="catdex-card ${item.unlocked?'unlocked':'locked'}" data-catdex-breed="${item.breedKey}">${item.unlocked?'':'<span class="catdex-card-lock">未发现</span>'}<div class="catdex-card-art ${item.unlocked?'':'locked'}" data-catdex-art="${item.breedKey}"></div><div class="catdex-card-body"><div class="catdex-card-top"><strong>${item.emoji} ${item.name}</strong><span class="catdex-card-rarity">${item.rarity}</span></div><div class="catdex-card-status">${status}</div><div class="catdex-card-tags">${stageTags}${item.shopOnly?'<span>宠物店限定</span>':''}${item.imageReady?'':'<span>图片开发中</span>'}</div></div></button>`;
      }).join('');
      list.forEach(item=>Visual.renderCatPreview($(`[data-catdex-art="${item.breedKey}"]`),item.breedKey,'kitten',item.unlocked));
      if($('#catDexCount'))$('#catDexCount').textContent=`${data.summary.unlocked}/${data.summary.total}`;
    }
    function openCatDexDetail(breedKey){
      const data=Game.collectionView(),item=data?.list.find(entry=>entry.breedKey===breedKey);if(!item)return;
      $('#catDexDetailEmoji').textContent=item.unlocked?item.emoji:'❔';$('#catDexDetailRarity').textContent=item.rarity;$('#catDexDetailTitle').textContent=item.name;
      $('#catDexDetailSummary').textContent=item.unlocked?item.summary:'你还没有获得过这个品种。第一次把它带回猫舍后，会解锁完整资料和获得记录。';
      $('#catDexDetailStats').innerHTML=`<div><small>当前拥有</small><strong>${item.currentOwned}只</strong></div><div><small>累计获得</small><strong>${item.totalObtained}只</strong></div><div><small>首次获得</small><strong>${item.firstObtainedDay?`第${item.firstObtainedDay}天`:'尚未获得'}</strong></div>`;
      const routeNames=item.routeKeys.map(key=>CONFIG.routes[key]?.name).filter(Boolean),personalityNames=item.personalityKeys.map(key=>CONFIG.personalities[key]?.name).filter(Boolean),stageNames=item.ageStages.map(stage=>stage==='adult'?'成年猫':'幼猫');
      const row=(label,values,empty)=>`<div class="catdex-record-row"><strong>${label}</strong><div class="catdex-record-chips">${values.length?values.map(value=>`<span>${value}</span>`).join(''):`<span>${empty}</span>`}</div></div>`;
      $('#catDexDetailRecords').innerHTML=row('遇见过的获得方式',routeNames,'尚无记录')+row('遇见过的性格',personalityNames,'尚无记录')+row('已见成长阶段',stageNames,'尚无记录')+row('当前猫舍成员',item.currentNames,'目前没有');
      $('#catDexDetailHint').textContent=`🔎 获得提示：${item.hint}`;
      Visual.renderCatPreview('#catDexKittenPreview',breedKey,'kitten',item.unlocked);Visual.renderCatPreview('#catDexAdultPreview',breedKey,'adult',item.unlocked&&item.ageStages.includes('adult'));
      $('#catDexDetailOverlay').classList.add('show');PhoneHud.hold();
    }
    function closeCatDexDetail(){$('#catDexDetailOverlay').classList.remove('show');PhoneHud.show(true)}

    function renderAchievements(filter=achievementFilter){
      const data=Game.achievementView(filter);if(!data)return;
      achievementFilter=filter;
      $('#achievementDay').textContent=`第${Game.get().day}天`;
      const current=data.currentTitle;
      $('#achievementCurrentTitleEmoji').textContent=current?.emoji||'🏆';
      $('#achievementCurrentTitle').textContent=current?.name||'尚未佩戴';
      $('#achievementCurrentTitleHint').textContent=current?`来自成就“${current.achievementName}”。称号会显示在主房间的猫咪信息旁。`:'解锁成就后，可以在对应卡片上选择称号。';
      $('#achievementClearTitleBtn').disabled=!current;
      $('#achievementSummary').innerHTML=`<div class="achievement-summary-item"><small>已完成成就</small><strong>${data.summary.unlocked} / ${data.summary.total}</strong></div><div class="achievement-summary-item"><small>完成度</small><strong>${data.summary.percent}%</strong></div><div class="achievement-summary-item"><small>已解锁称号</small><strong>${data.summary.titles}个</strong></div><div class="achievement-summary-item"><small>当前称号</small><strong>${current?`${current.emoji} ${current.name}`:'未佩戴'}</strong></div>`;
      $$('#achievementFilter [data-achievement-filter]').forEach(button=>button.classList.toggle('active',button.dataset.achievementFilter===filter));
      $('#achievementGrid').innerHTML=data.list.map(item=>`<article class="achievement-card ${item.unlocked?'unlocked':'locked'}">${item.unlocked?`<span class="achievement-unlock-day">第${item.unlockedDay}天</span>`:''}<div class="achievement-card-top"><span class="achievement-card-emoji">${item.unlocked?item.emoji:'🔒'}</span><div class="achievement-card-heading"><h3>${item.name}</h3><span class="achievement-category">${item.categoryEmoji} ${item.categoryName}</span></div></div><p class="achievement-card-desc">${item.desc}</p><div class="achievement-progress-line"><span>${item.unlocked?'已完成':'当前进度'}</span><strong>${Math.min(item.value,item.target)} / ${item.target}</strong></div><div class="achievement-progress"><span style="width:${item.percent}%"></span></div><div class="achievement-card-footer"><div class="achievement-reward"><span>称号奖励</span><strong>${item.title.emoji} ${item.title.name}</strong></div>${item.unlocked?`<button class="achievement-equip ${item.selected?'current':''}" data-achievement-title="${item.id}" ${item.selected?'disabled':''}>${item.selected?'佩戴中':'佩戴称号'}</button>`:'<span class="achievement-locked-label">尚未解锁</span>'}</div></article>`).join('');
      if($('#achievementCount'))$('#achievementCount').textContent=`${data.summary.unlocked}/${data.summary.total}`;
    }

    function renderDailyChoice(){
      const data=Game.dailyChoiceView();if(!data)return null;
      $('#dailyChoiceEmoji').textContent=data.emoji;
      $('#dailyChoiceTitle').textContent=data.title;
      $('#dailyChoiceBody').textContent=data.body;
      $('#dailyChoiceDay').textContent=`第${data.day}天的随机事件`;
      $('#dailyChoiceButtons').innerHTML=data.choices.map(choice=>`<button class="daily-choice-button" data-daily-choice="${choice.id}" ${choice.enabled?'':'disabled'}><strong>${choice.label}</strong><small>${choice.enabled?choice.desc:choice.reason}</small></button>`).join('');
      $('#dailyChoiceResolved').hidden=!data.resolved;
      $('#dailyChoiceButtons').hidden=data.resolved;
      $('#dailyChoiceLaterBtn').textContent=data.resolved?'关闭':'稍后再决定';
      $('#dailyEventDot')?.classList.toggle('show',!data.resolved);
      return data;
    }
    function showDailyChoice(){
      const data=renderDailyChoice();if(!data)return;
      PhoneHud.hold();
      $('#dailyChoiceOverlay').classList.add('show');
    }
    function closeDailyChoice(){
      $('#dailyChoiceOverlay').classList.remove('show');
      PhoneHud.show(true);
    }
    let moodResetToken=0;
    function animateEffects(event){
      const layer=$('#gameFeedbackLayer');if(!layer||!document.body.classList.contains('game-home-active'))return;
      const labels={health:['❤️','健康'],trust:['🤝','信任'],vitality:['⚡','活力'],courage:['🛡️','胆量'],intimacy:['💕','亲密'],hunger:['🥩','饱腹'],cleanliness:['🫧','清洁'],damage:['🏠','破坏'],coins:['🪙','金币']};
      const entries=Object.entries(event.effects||{}).filter(([,value])=>value);
      const burst=document.createElement('span');burst.className='feedback-burst';burst.textContent=event.emoji||'✨';layer.appendChild(burst);setTimeout(()=>burst.remove(),1250);
      entries.forEach(([key,value],index)=>{const meta=labels[key]||['✨',key],chip=document.createElement('span');chip.className=`floating-effect ${value>0?'positive':'negative'} ${key==='coins'?'coin':''}`;chip.style.setProperty('--drift',`${(index-(entries.length-1)/2)*34}px`);chip.style.animationDelay=`${index*90}ms`;chip.innerHTML=`<span>${meta[0]}</span><span>${meta[1]} ${value>0?'+':''}${value}</span>`;layer.appendChild(chip);setTimeout(()=>chip.remove(),1900);const hud=$(`[data-stat-key="${key}"]`);if(hud){hud.classList.remove('hud-pop');void hud.offsetWidth;hud.classList.add('hud-pop');setTimeout(()=>hud.classList.remove('hud-pop'),600)}});
    }
    function scheduleMoodReset(){const token=++moodResetToken;setTimeout(()=>{if(token!==moodResetToken)return;const g=Game.get();if(!g)return;g.mood='neutral';Storage.save(g);if(document.body.classList.contains('game-home-active')){Visual.renderScene('#roomArt',g);$('#roomCaption').textContent=roomCaption(g)}},3700)}
    function showEvent(event,after=null){
      PhoneHud.hold();
      const g=Game.get();
      eventHomePose=event.visual?.catState||null;
      if(g&&document.body.classList.contains('game-home-active')){
        Visual.renderScene('#roomArt',g,{state:eventHomePose});
        $('#roomCaption').textContent=roomCaption(g);
      }
      $('#eventIllustration').replaceChildren();Visual.renderEvent('#eventIllustration',event);$('#eventEmoji').textContent=event.emoji;$('#eventTitle').textContent=event.title;$('#eventBody').textContent=event.body;$('#effectList').innerHTML=Utils.effectText(event.effects).map(t=>`<span class="effect-chip">${t}</span>`).join('');animateEffects(event);eventCloseCallback=after;$('#eventOverlay').classList.add('show')
    }
    function showEventSequence(events,after=null){const queue=[...(events||[])];const next=()=>{if(!queue.length){if(after)after();return}showEvent(queue.shift(),next)};next()}
    function showDeath(name,hasCats=false){$('#deathTitle').textContent=`${name}离开了`;$('#deathText').textContent=hasCats?`${name}的健康降到了0。猫舍里的其他猫还在等你，请继续照顾它们。`:`${name}的健康降到了0。猫舍已经空了，你需要重新开始。`;$('#restartAfterDeath').textContent=hasCats?'回到猫舍':'重新开始游戏';$('#deathOverlay').classList.add('show')}
    function closeEvent(){
      if(!$('#eventOverlay').classList.contains('show'))return;
      $('#eventOverlay').classList.remove('show');
      PhoneHud.show(true);
      const cb=eventCloseCallback,pose=eventHomePose;eventCloseCallback=null;eventHomePose=null;
      const pendingEvents=[...Game.takeRelationshipEvents(),...Game.takeAchievementEvents()];
      if(pendingEvents.length){showEventSequence(pendingEvents,cb);return}
      if(cb)cb();
      requestAnimationFrame(()=>{
        if($('#eventOverlay').classList.contains('show'))return;
        const g=Game.get();if(!g||!document.body.classList.contains('game-home-active'))return;
        Visual.renderScene('#roomArt',g,{state:pose});
        $('#roomCaption').textContent=roomCaption(g);
        scheduleMoodReset();
      })
    }
    function showGrowth(growth){$('#growthEmoji').textContent=growth.next==='spirit'?'💗':growth.next==='demon'?'😼':'🌫️';$('#growthBody').textContent=`${growth.story} 成年性格：${CONFIG.personalities[growth.next].name}`;$('#growthOverlay').classList.add('show')}
    function updateContinue(){const root=Storage.load(),cat=root?.cats?.find(item=>item.id===root.activeCatId)||root?.cats?.[0];$('#continueBox').classList.toggle('show',!!cat);if(cat){$('#continueTitle').textContent=`${cat.name}和猫舍伙伴正在等你回来`;$('#continueText').textContent=`第${root.day}天 · ${root.cats.length}/${root.slots}只猫 · 当前：${CONFIG.breeds[cat.breedKey].name}`;$('#routeSectionTitle').textContent='再获得一只新猫'}}
    function toast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),1700)}
    return {showAssetLoading,hideAssetLoading,updateAssetModeButton,updateBackgroundStatus,showScreen,renderCandidate,renderHome,renderShelter,renderAttributes,renderCare,renderMall,renderCatDex,openCatDexDetail,closeCatDexDetail,renderAchievements,renderDailyChoice,showDailyChoice,closeDailyChoice,showEvent,showEventSequence,closeEvent,showGrowth,showDeath,updateContinue,toast};
  })();

  /* =========================
     9. 弃养模块
  ========================= */
  const Abandon = (() => {
    const {$}=Utils;
    function open(){const g=Game.get();if(!g)return;if(Game.catCount()<=1){UI.toast("猫舍里只剩最后一只猫，不能弃养");return}$('#abandonConfirmText').textContent=`你将永久失去${g.name}。它的个人属性和日记会被删除，但猫舍里的其他猫、金币、房间与任务都会保留。`;$('#abandonConfirm').classList.add('show')}
    function confirm(){
      const g=Game.get();if(!g)return;
      let emoji,title,text,cls;
      if(g.personality==='spirit'){emoji='😿';title='它从来没有做错什么';text=`${g.name}信任你、依赖你，也把这里当成了家。它直到最后都不明白，为什么那个每天喂它、摸它的人突然不要它了。`;cls='shame'}
      else if(g.personality==='demon'){emoji='🐾';title='捣乱不是被丢下的理由';text=`${g.name}确实推过杯子、抓过沙发，也让你头疼过。但它仍然把你当作家人。`;cls='shame'}
      else{emoji='🌫️';title='它离开了猫舍';text='这确实没有办法……希望它一切都好。';cls='mercy'}
      const result=Game.removeActiveCat();if(result.error){UI.toast(result.error);return}
      Visual.resetCache();UI.updateContinue();UI.renderHome();UI.renderShelter();
      $('#abandonConfirm').classList.remove('show');$('#abandonResultCard').className=`modal-card abandon-result ${cls}`;$('#abandonResultEmoji').textContent=emoji;$('#abandonResultTitle').textContent=title;$('#abandonResultText').textContent=text;$('#leaveAbandon').textContent='返回房间';$('#abandonResult').classList.add('show')
    }
    return {open,confirm};
  })();

  /* =========================
     10. 应用控制器：主流程只调用各功能模块
  ========================= */
  const App = (() => {
    const {$,$$}=Utils;
    let pendingBreed=null;

    function showSetupStep(step){
      [["#assetModeStep","mode"],["#assetBreedStep","breed"],["#assetDownloadStep","download"]].forEach(([selector,name])=>$(selector).hidden=name!==step);
    }
    function openAssetSetup(){
      $("#breedNotice").classList.remove("show");
      showSetupStep("mode");
      $("#assetSetupOverlay").classList.add("show");
    }
    function closeAssetSetup(){$("#assetSetupOverlay").classList.remove("show");UI.updateAssetModeButton()}

    function renderBreedChoices(){
      $("#breedChoiceList").innerHTML=AssetManager.allBreeds().map(key=>{const breed=CONFIG.breeds[key];return `<button class="breed-choice" data-image-breed="${key}">${breed.name}<span class="${breed.imageReady?"ready":"developing"}">${breed.imageReady?"可下载":"开发中"}</span></button>`}).join("");
      $$('[data-image-breed]').forEach(button=>button.addEventListener('click',()=>chooseBreed(button.dataset.imageBreed)));
    }

    function chooseBreed(breedKey){
      const breed=CONFIG.breeds[breedKey];
      if(!breed?.imageReady){const notice=$("#breedNotice");notice.textContent=`🐾 ${breed?.name||"这个品种"}的 WebP 图片还在开发中，暂时不能选择。你可以先体验橘白猫或狸花猫。`;notice.classList.add("show");return}
      $("#breedNotice").classList.remove("show");
      pendingBreed=breedKey;
      runInitialDownload(breedKey);
    }

    function downloadMessage(completed,total){
      const ratio=total?completed/total:0;
      if(completed===0)return ["🐾","正在把小猫接回家","先确认回家的路线，一张图片也不会漏掉。"];
      if(ratio<.26)return ["🧶","正在整理猫咪玩具","毛线球已经滚到沙发下面了……"];
      if(ratio<.51)return ["🥣","正在准备饭盆和小鱼干","小猫已经开始闻到晚饭的味道。"];
      if(ratio<.76)return ["🛋️","正在检查房间和沙发","先看看哪些地方可能会被它抓坏。"];
      if(ratio<1)return ["🏠","新家马上准备完成","最后几张 WebP 正在保存到你的浏览器。"];
      return ["😺","准备完成","房间和幼猫的6种状态已经保存好了。"];
    }

    function updateDownloadProgress({completed,total}){
      const [emoji,title,text]=downloadMessage(completed,total);
      $("#downloadEmoji").textContent=emoji;$("#downloadTitle").textContent=title;$("#downloadText").textContent=text;
      $("#downloadProgressBar").style.width=`${total?Math.round(completed/total*100):0}%`;$("#downloadCount").textContent=`${completed} / ${total}`;
    }

    async function runInitialDownload(breedKey){
      pendingBreed=breedKey;showSetupStep("download");$("#downloadActions").classList.remove("show");
      updateDownloadProgress({completed:0,total:AssetManager.initialPack(breedKey).length});
      Visual.resetCache();
      const result=await AssetManager.prepareInitial(breedKey,updateDownloadProgress);
      if(result.ok){
        AssetManager.commitImageMode(breedKey);Visual.resetCache();updateDownloadProgress({completed:result.total,total:result.total});
        $("#downloadText").textContent=`${CONFIG.breeds[breedKey].name}幼猫6种状态和全部基础场景已经保存到本机。`;
        setTimeout(()=>{closeAssetSetup();Visual.renderCover();UI.toast("图片模式已准备完成，可在领养页切换品种");startBackgroundAssets({breedKey})},450);
      }else{
        $("#downloadEmoji").textContent="🙀";$("#downloadTitle").textContent="有些图片没有下载成功";
        $("#downloadText").textContent=`成功准备 ${result.total-result.failed.length}/${result.total} 项。可能是当前网络暂时无法访问 GitHub 图片，请重试或先使用无图片模式。`;
        $("#downloadActions").classList.add("show");
      }
    }

    function chooseNoImages(){AssetManager.useNoImages();Visual.resetCache();closeAssetSetup();Visual.renderCover();UI.renderHome();UI.toast("已切换为不加载图片")}

    function createAndShow(route,forced=null,name='',breed=null){Game.createCandidate(route,forced,name,breed);UI.renderCandidate();UI.showScreen('candidateScreen')}

    function startBackgroundAssets(game){
      if(!game||!AssetManager.imagesEnabled())return;
      AssetManager.startBackgroundDownload(game.breedKey,progress=>UI.updateBackgroundStatus(progress)).then(result=>UI.updateBackgroundStatus(result,true));
    }

    async function prepareGameVisuals(game,text){
      if(!AssetManager.imagesEnabled())return;
      if(!AssetManager.validBreed(game?.breedKey)){UI.toast(`${CONFIG.breeds[game?.breedKey]?.name||"该品种"}图片仍在开发中，先使用内置画面`);return;}
      UI.showAssetLoading(text);
      try{
        await AssetManager.ensureGamePack(game,progress=>{$("#assetLoadingText").textContent=`正在准备 ${CONFIG.breeds[game.breedKey].name} ${progress.completed}/${progress.total}`});
        Visual.resetCache();
        await Visual.preload(game);
      }finally{UI.hideAssetLoading()}
    }

    function showEntryMoments(){
      const showDaily=()=>{const event=Game.dailyChoiceView();if(event&&!event.resolved)UI.showDailyChoice()};
      const moments=[];
      const welcome=Game.welcomeEvent();
      if(welcome)moments.push(welcome);
      moments.push(...Game.takeRelationshipEvents(),...Game.takeAchievementEvents());
      if(moments.length)UI.showEventSequence(moments,showDaily);else showDaily();
    }

    function bindAssetSetup(){
      renderBreedChoices();
      $("#assetSettingsBtn").addEventListener("click",openAssetSetup);
      $("#noImageModeBtn").addEventListener("click",chooseNoImages);
      $("#imageModeBtn").addEventListener("click",()=>{showSetupStep("breed");$("#breedNotice").classList.remove("show")});
      $("#breedBackBtn").addEventListener("click",()=>showSetupStep("mode"));
      $("#downloadNoImageBtn").addEventListener("click",chooseNoImages);
      $("#downloadRetryBtn").addEventListener("click",()=>pendingBreed&&runInitialDownload(pendingBreed));
    }

    function closeHudDrawers(){
      $$('.hud-drawer').forEach(drawer=>{drawer.classList.remove('show');drawer.setAttribute('aria-hidden','true')});
      $('#hudDrawerScrim')?.classList.remove('show');
      PhoneHud.show(true);
    }
    function toggleHudDrawer(id){
      const target=$(`#${id}`),willOpen=target&&!target.classList.contains('show');
      closeHudDrawers();
      if(willOpen){target.classList.add('show');target.setAttribute('aria-hidden','false');$('#hudDrawerScrim')?.classList.add('show');PhoneHud.hold()}else{PhoneHud.show(true)}
    }

    function openFeature(feature){
      closeHudDrawers();
      requestAnimationFrame(()=>{
        if(feature==='shelter'){UI.renderShelter();UI.showScreen('shelterManageScreen');return}
        if(feature==='catdex'){UI.renderCatDex();UI.showScreen('catDexScreen');return}
        if(feature==='achievements'){UI.renderAchievements();UI.showScreen('achievementScreen');return}
        if(feature==='bag'){UI.renderMall();toggleHudDrawer('bagDrawer');return}
        if(feature==='care'){UI.renderCare();UI.showScreen('careScreen');return}
        if(feature==='attributes'){UI.renderAttributes();UI.showScreen('attributeScreen');return}
        if(feature==='log'){toggleHudDrawer('logDrawer');return}
        if(feature==='mall'){UI.renderMall();UI.showScreen('mallScreen');return}
        if(feature==='settings'){openAssetSetup()}
      });
    }

    function bindNavigation(){
      $$('[data-route]').forEach(button=>button.addEventListener('click',()=>{if(Game.getShelter()&&!Game.hasRoom()){UI.toast('猫舍已经满了，请先回猫舍查看');return}button.dataset.route==='shelter'?UI.showScreen('shelterScreen'):createAndShow(button.dataset.route)}));
      $$('[data-go]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.go==='homeScreen')UI.renderHome();UI.showScreen(button.dataset.go)}));
      document.addEventListener('click',event=>{const button=event.target.closest('[data-open-feature]');if(!button)return;event.preventDefault();event.stopPropagation();openFeature(button.dataset.openFeature)});
      $('#portraitQuickCard')?.addEventListener('click',()=>{const daily=Game.dailyChoiceView();if(daily&&!daily.resolved)UI.showDailyChoice();else toggleHudDrawer('taskDrawer')});
      $('[data-shelter="kitten"]').addEventListener('click',()=>createAndShow('shelterKitten'));
      $$('[data-adult]').forEach(button=>button.addEventListener('click',()=>createAndShow('shelterAdult',button.dataset.adult,{spirit:'米粒',demon:'麻薯',chaos:'锅盖'}[button.dataset.adult])));
      $('#candidateBack').addEventListener('click',()=>UI.showScreen(Game.getCandidate().routeKey.startsWith('shelter')?'shelterScreen':'startScreen'));
      $('#rerollBtn').addEventListener('click',()=>createAndShow(Game.getCandidate().routeKey));
      $('#candidateBreedSelect').addEventListener('change',async event=>{const breedKey=event.target.value;const candidate=Game.setCandidateBreed(breedKey);if(AssetManager.imagesEnabled()&&AssetManager.validBreed(breedKey)){UI.showAssetLoading(`正在准备${CONFIG.breeds[breedKey].name}的6种形态……`);try{await AssetManager.ensureAge(breedKey,candidate.ageStage,progress=>{$('#assetLoadingText').textContent=`正在准备 ${CONFIG.breeds[breedKey].name} ${progress.completed}/${progress.total}`});Visual.resetCache();await Visual.preload(candidate)}finally{UI.hideAssetLoading()}}else if(AssetManager.imagesEnabled()){UI.toast(`${CONFIG.breeds[breedKey].name}图片仍在开发中，先使用内置画面`)}UI.renderCandidate()});
      $('#feedOpenMallBtn').addEventListener('click',()=>{closeHudDrawers();UI.renderMall();UI.showScreen('mallScreen')});
      $('#bagOpenMallBtn').addEventListener('click',()=>{closeHudDrawers();UI.renderMall();UI.showScreen('mallScreen')});
      $('#addCatFromShelterBtn').addEventListener('click',()=>{if(!Game.hasRoom()){UI.toast('猫舍已经满了');return}UI.showScreen('startScreen')});
      $('#catShelterGrid').addEventListener('click',async event=>{const switchButton=event.target.closest('[data-shelter-switch]');if(switchButton){const result=Game.switchCat(switchButton.dataset.shelterSwitch);if(result.error){UI.toast(result.error);return}UI.showAssetLoading(`正在准备${result.game.name}的图片……`);try{await prepareGameVisuals(result.game,'正在切换猫咪并读取本地素材……')}finally{UI.hideAssetLoading()}Visual.resetCache();UI.renderHome();UI.renderShelter();UI.showScreen('homeScreen');if(result.growth)UI.showGrowth(result.growth);else setTimeout(showEntryMoments,280);return}if(event.target.closest('[data-add-cat]')){if(!Game.hasRoom()){UI.toast('猫舍已经满了');return}UI.showScreen('startScreen')}});
      $('#attributeBtn').addEventListener('click',()=>{UI.renderAttributes();UI.showScreen('attributeScreen')});
      $('#careBtn').addEventListener('click',()=>{UI.renderCare();UI.showScreen('careScreen')});
      const feedDockButton=$('.action-btn[data-action="feed"]');if(feedDockButton)feedDockButton.addEventListener('click',event=>{event.stopImmediatePropagation();UI.renderMall();toggleHudDrawer('feedDrawer')});
      $('#taskHudBtn').addEventListener('click',()=>toggleHudDrawer('taskDrawer'));
      $('#dailyEventHudBtn')?.addEventListener('click',()=>UI.showDailyChoice());
      $('#moreHudBtn')?.addEventListener('click',()=>toggleHudDrawer('moreDrawer'));
      $('#mobileActionMoreBtn')?.addEventListener('click',()=>toggleHudDrawer('moreDrawer'));
      $('#moreCleanBtn')?.addEventListener('click',()=>{closeHudDrawers();$('#cleanRoomBtn').click()});
      $('#moreAbandonBtn')?.addEventListener('click',()=>{closeHudDrawers();$('#abandonBtn').click()});
      $('#catDexFilter')?.addEventListener('click',event=>{const button=event.target.closest('[data-catdex-filter]');if(button)UI.renderCatDex(button.dataset.catdexFilter)});
      $('#catDexGrid')?.addEventListener('click',event=>{const card=event.target.closest('[data-catdex-breed]');if(card)UI.openCatDexDetail(card.dataset.catdexBreed)});
      $('#catDexDetailClose')?.addEventListener('click',UI.closeCatDexDetail);
      $('#catDexDetailOverlay')?.addEventListener('click',event=>{if(event.target===event.currentTarget)UI.closeCatDexDetail()});
      $('#achievementFilter')?.addEventListener('click',event=>{const button=event.target.closest('[data-achievement-filter]');if(button)UI.renderAchievements(button.dataset.achievementFilter)});
      $('#achievementGrid')?.addEventListener('click',event=>{const button=event.target.closest('[data-achievement-title]');if(!button)return;const result=Game.selectTitle(button.dataset.achievementTitle);if(result.error){UI.toast(result.error);return}UI.renderAchievements();UI.renderHome();UI.toast(`已佩戴称号：${result.title.emoji} ${result.title.name}`)});
      $('#achievementClearTitleBtn')?.addEventListener('click',()=>{Game.selectTitle('none');UI.renderAchievements();UI.renderHome();UI.toast('已隐藏称号')});
      $('#hudDrawerScrim').addEventListener('click',closeHudDrawers);
      $$('[data-close-drawer]').forEach(button=>button.addEventListener('click',closeHudDrawers));
      $$('.game-overlay-screen').forEach(screen=>screen.addEventListener('click',event=>{if(event.target===screen){UI.renderHome();UI.showScreen('homeScreen')}}));
      document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const activeOverlay=$('.game-overlay-screen.active');if(activeOverlay){UI.renderHome();UI.showScreen('homeScreen')}else closeHudDrawers()});
    }

    function endGameIfDead(){const current=Game.get();if(!current||!Game.isDead())return false;const name=current.name;const result=Game.removeActiveCat({allowLast:true});Visual.resetCache();UI.updateContinue();if(result.game){UI.renderHome();UI.renderShelter()}UI.showDeath(name,!!result.game);return true}

    function bindGame(){
      $('#adoptBtn').addEventListener('click',async()=>{const result=Game.adopt($('#catNameInput').value.trim());if(result.error){UI.toast(result.error);return}const game=result.game;await prepareGameVisuals(game,'正在准备这只猫的六种状态，完成后互动切换会更流畅。');UI.renderHome();UI.renderShelter();UI.updateContinue();UI.showScreen('homeScreen');startBackgroundAssets(game);if(result.collectionUnlock)UI.toast(`图鉴解锁：${CONFIG.breeds[game.breedKey].name}`);setTimeout(showEntryMoments,550)});
      const runBasicAction=actionKey=>{const result=Game.action(actionKey);if(!result){UI.toast('今天已经没有行动次数了');return}closeHudDrawers();UI.renderHome();UI.showEvent(result.event,()=>{if(result.death)endGameIfDead()})};
      $$('.action-btn[data-action]').filter(button=>button.dataset.action!=='feed').forEach(button=>button.addEventListener('click',()=>runBasicAction(button.dataset.action)));
      $('#feedNormalBtn').addEventListener('click',()=>runBasicAction('feed'));
      const runWork=()=>{const result=Game.work();if(!result){UI.toast('今天已经没有行动次数了');return}closeHudDrawers();UI.renderHome();UI.showEvent(result.event,()=>{if(result.death)endGameIfDead()})};
      $('#workBtn').addEventListener('click',runWork);
      $('#mobileWorkBtn')?.addEventListener('click',runWork);
      $('#mobileCleanLitterBtn')?.addEventListener('click',()=>runBasicAction('clean'));
      $('#taskClaimBtn').addEventListener('click',()=>{closeHudDrawers();const result=Game.claimDailyTask();if(result.error){UI.toast(result.error);return}UI.renderHome();UI.showEvent(result.event)});
      $$('[data-buy-item]').forEach(button=>button.addEventListener('click',()=>{const result=Game.buyItem(button.dataset.buyItem);if(result.error){UI.toast(result.error);return}UI.renderMall();UI.renderHome();UI.showEvent(result.event)}));
      $$('[data-use-item]').forEach(button=>button.addEventListener('click',()=>{const result=Game.useItem(button.dataset.useItem);if(result.error){UI.toast(result.error);return}closeHudDrawers();UI.renderMall();UI.renderHome();UI.showEvent(result.event)}));
      $('#dailyChoiceButtons')?.addEventListener('click',event=>{const button=event.target.closest('[data-daily-choice]');if(!button||button.disabled)return;const result=Game.resolveDailyChoice(button.dataset.dailyChoice);if(result.error){UI.toast(result.error);UI.renderDailyChoice();return}UI.closeDailyChoice();UI.renderHome();UI.showEvent(result.event,()=>{if(result.death)endGameIfDead()})});
      $('#dailyChoiceLaterBtn')?.addEventListener('click',UI.closeDailyChoice);
      $('#cleanRoomBtn').addEventListener('click',()=>{const result=Game.cleanRoom();if(result.error){UI.toast(result.error);return}UI.renderHome();UI.showEvent(result.event,()=>{if(result.death)endGameIfDead()})});
      $('#sleepBtn').addEventListener('click',async()=>{const result=Game.endDay();const game=Game.get();if(result.growth&&AssetManager.imagesEnabled()){UI.showAssetLoading('小猫正在长大，正在准备成年后的6种形态……');try{await AssetManager.ensureAge(game.breedKey,'adult',progress=>{$('#assetLoadingText').textContent=`正在准备成年猫 ${progress.completed}/${progress.total}`});Visual.resetCache();await Visual.preload(game)}finally{UI.hideAssetLoading()}}UI.renderHome();UI.showEventSequence(result.events,()=>{if(result.death){endGameIfDead();return}if(result.growth){UI.renderHome();UI.showGrowth(result.growth);setTimeout(()=>{const check=setInterval(()=>{if(!$('#growthOverlay').classList.contains('show')){clearInterval(check);UI.showDailyChoice()}},180)},120)}else UI.showDailyChoice()})});
      $('#bathBtn').addEventListener('click',()=>{const result=Care.bath();if(result.error){UI.toast(result.error);return}UI.renderCare();UI.renderHome();if(result.choice){$('#bathChoiceText').textContent=result.event.body;$('#bathChoiceOverlay').classList.add('show');return}UI.showEvent(result.event,()=>{if(result.death)endGameIfDead();else UI.renderCare()})});
      $('#doctorBtn').addEventListener('click',()=>{const result=Care.doctor();if(result.error){UI.toast(result.error);return}UI.renderCare();UI.renderHome();UI.showEvent(result.event,()=>{if(result.death)endGameIfDead();else UI.renderCare()})});
      $('#forceBathBtn').addEventListener('click',()=>{const result=Care.resolveChaos(true);$('#bathChoiceOverlay').classList.remove('show');UI.renderCare();UI.renderHome();UI.showEvent(result.event,()=>{if(result.death)endGameIfDead();else UI.renderCare()})});
      $('#giveUpBathBtn').addEventListener('click',()=>{const result=Care.resolveChaos(false);$('#bathChoiceOverlay').classList.remove('show');UI.renderCare();UI.renderHome();UI.showEvent(result.event,()=>UI.renderCare())});
      $('#saveBtn').addEventListener('click',()=>{Storage.save(Game.get());UI.toast('进度已保存')});
      $('#resetBtn').addEventListener('click',()=>{if(confirm('确定删除整个猫舍和所有猫咪存档吗？')){Storage.clear();Game.set(null);UI.updateContinue();UI.showScreen('startScreen')}});
      $('#continueBtn').addEventListener('click',async()=>{const saved=Storage.load();Game.set(saved);const game=Game.get();await prepareGameVisuals(game,'正在读取房间和猫咪素材……');UI.renderHome();UI.renderShelter();UI.showScreen('homeScreen');startBackgroundAssets(game);setTimeout(showEntryMoments,550)});
      $('#newGameBtn').addEventListener('click',()=>{if(confirm('开始新游戏会删除当前存档，确定吗？')){Storage.clear();Game.set(null);UI.updateContinue()}});
      $('#restartAfterDeath').addEventListener('click',()=>{$('#deathOverlay').classList.remove('show');if(Game.get()){UI.renderShelter();UI.showScreen('shelterManageScreen')}else UI.showScreen('startScreen')});
    }

    function bindModals(){$('#eventOverlay').addEventListener('click',UI.closeEvent);$('#growthClose').addEventListener('click',()=>{$('#growthOverlay').classList.remove('show');Storage.save(Game.get());UI.renderHome()});$('#abandonBtn').addEventListener('click',Abandon.open);$('#cancelAbandon').addEventListener('click',()=>$('#abandonConfirm').classList.remove('show'));$('#confirmAbandon').addEventListener('click',Abandon.confirm);$('#leaveAbandon').addEventListener('click',()=>{$('#abandonResult').classList.remove('show');UI.renderHome();UI.showScreen('homeScreen')});['#abandonConfirm','#growthOverlay'].forEach(selector=>$(selector).addEventListener('click',event=>{if(event.target===event.currentTarget)event.currentTarget.classList.remove('show')}))}

    async function init(){
      const pref=AssetManager.init();
      await Visual.renderCover();
      UI.updateContinue();UI.updateAssetModeButton();
      bindAssetSetup();bindNavigation();bindGame();bindModals();PhoneHud.bind();
      if(!pref)openAssetSetup();else if(pref.mode==="images")startBackgroundAssets({breedKey:pref.breed});
    }
    return {init};
  })();

  function registerServiceWorker(){
    if(!("serviceWorker" in navigator))return;
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}),{once:true});
  }
  function main(){registerServiceWorker();App.init()}
  document.addEventListener('DOMContentLoaded',main);
