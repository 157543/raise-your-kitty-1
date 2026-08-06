"use strict";

/* V4.4 猫咪图鉴：记录获得过的品种、阶段、性格与获得方式。 */
window.CatDexSystem = (() => {
  const DETAILS = Object.freeze({
    orange:{emoji:"🧡",rarity:"常见",title:"橘白田园猫",summary:"活泼亲人、适应力强的田园猫。橘色与白色花纹的分布会让每一只都很有辨识度。",hint:"可通过救助站、猫妈妈、雨天救助、朋友、宠物店或神秘事件获得。"},
    tabby:{emoji:"🌿",rarity:"常见",title:"狸花猫",summary:"动作敏捷、观察力强，身上的经典虎斑纹让它看起来精神又可靠。",hint:"可通过多数普通获得方式遇见。"},
    tuxedo:{emoji:"🎩",rarity:"常见",title:"奶牛猫",summary:"黑白花色像穿着小礼服，通常精力旺盛，也很容易做出令人哭笑不得的事。",hint:"可通过多数普通获得方式遇见。"},
    white:{emoji:"☁️",rarity:"常见",title:"纯白田园猫",summary:"全身雪白、表情清晰，安静时像一团云，活跃时又格外显眼。",hint:"可通过多数普通获得方式遇见。"},
    black:{emoji:"🌙",rarity:"常见",title:"纯黑田园猫",summary:"深色毛发让它在昏暗处像一团会移动的影子，眼睛则显得格外明亮。",hint:"可通过多数普通获得方式遇见。"},
    calico:{emoji:"🎨",rarity:"少见",title:"三花猫",summary:"黑、橘、白三种颜色交织，每一只三花猫的斑块都像独一无二的地图。",hint:"可通过普通获得方式遇见；该品种图片仍在开发中。"},
    silver:{emoji:"❄️",rarity:"少见",title:"银渐层",summary:"毛尖带银灰色，整体像覆着一层柔和的霜，气质圆润而安静。",hint:"可通过普通获得方式遇见；该品种图片仍在开发中。"},
    americanSilver:{emoji:"⭐",rarity:"限定",title:"美短银虎斑",summary:"银色底毛配清晰虎斑，眼神明亮、互动积极，是宠物店中的限定品种。",hint:"只能在宠物店获得，并且性格100%固定为灵珠。"}
  });

  const unique = values => [...new Set((values || []).filter(Boolean))];
  const breedKeys = () => Object.keys(CONFIG.breeds);
  const blank = key => ({
    breedKey:key,
    unlocked:false,
    firstObtainedDay:null,
    lastObtainedDay:null,
    totalObtained:0,
    currentOwned:0,
    routeKeys:[],
    personalityKeys:[],
    ageStages:[],
    namesSeen:[]
  });

  function sanitizeEntry(key, source={}){
    const entry={...blank(key),...source,breedKey:key};
    entry.unlocked=Boolean(entry.unlocked);
    entry.firstObtainedDay=Number.isFinite(Number(entry.firstObtainedDay))?Math.max(1,Number(entry.firstObtainedDay)):null;
    entry.lastObtainedDay=Number.isFinite(Number(entry.lastObtainedDay))?Math.max(1,Number(entry.lastObtainedDay)):entry.firstObtainedDay;
    entry.totalObtained=Math.max(0,Math.floor(Number(entry.totalObtained)||0));
    entry.currentOwned=0;
    entry.routeKeys=unique(entry.routeKeys).filter(key=>CONFIG.routes[key]);
    entry.personalityKeys=unique(entry.personalityKeys).filter(key=>CONFIG.personalities[key]);
    entry.ageStages=unique(entry.ageStages).filter(stage=>stage==="kitten"||stage==="adult");
    entry.namesSeen=unique(entry.namesSeen).slice(0,30);
    return entry;
  }

  function addCatFacts(entry, cat, day, incrementTotal=false){
    if(!entry||!cat)return {newUnlock:false};
    const newUnlock=!entry.unlocked;
    entry.unlocked=true;
    entry.firstObtainedDay=entry.firstObtainedDay||Math.max(1,Number(day)||1);
    entry.lastObtainedDay=Math.max(1,Number(day)||1);
    if(incrementTotal)entry.totalObtained+=1;
    entry.routeKeys=unique([...entry.routeKeys,cat.routeKey]);
    entry.personalityKeys=unique([...entry.personalityKeys,cat.personality,cat.initialPersonality]);
    entry.ageStages=unique([...entry.ageStages,cat.ageStage]);
    entry.namesSeen=unique([...entry.namesSeen,cat.name]).slice(0,30);
    return {newUnlock};
  }

  function sync(raw={}, cats=[], day=1){
    const collection={};
    breedKeys().forEach(key=>collection[key]=sanitizeEntry(key,raw?.[key]));
    const counts={};
    (cats||[]).forEach(cat=>{
      const entry=collection[cat.breedKey];
      if(!entry)return;
      counts[cat.breedKey]=(counts[cat.breedKey]||0)+1;
      addCatFacts(entry,cat,day,false);
    });
    breedKeys().forEach(key=>{
      const entry=collection[key];
      entry.currentOwned=counts[key]||0;
      entry.totalObtained=Math.max(entry.totalObtained,entry.currentOwned,entry.unlocked?1:0);
    });
    return collection;
  }

  function register(collection, cat, day){
    if(!collection||!cat||!collection[cat.breedKey])return {newUnlock:false};
    const result=addCatFacts(collection[cat.breedKey],cat,day,true);
    collection[cat.breedKey].currentOwned+=1;
    return result;
  }

  function markStage(collection, cat, stage, day){
    if(!collection||!cat||!collection[cat.breedKey])return;
    cat.ageStage=stage;
    addCatFacts(collection[cat.breedKey],cat,day,false);
  }

  function detail(key){
    const configured=CONFIG.breeds[key]||{};
    return {...DETAILS[key],title:DETAILS[key]?.title||configured.name||key,emoji:DETAILS[key]?.emoji||"🐱",rarity:DETAILS[key]?.rarity||"普通",summary:DETAILS[key]?.summary||"这是一种等待你发现的猫咪。",hint:DETAILS[key]?.hint||"继续探索不同的获得方式。"};
  }

  function view(collection, cats=[], day=1){
    const normalized=sync(collection,cats,day);
    const list=breedKeys().map(key=>{
      const entry=normalized[key],meta=detail(key),breed=CONFIG.breeds[key];
      const currentCats=(cats||[]).filter(cat=>cat.breedKey===key);
      return {...entry,...meta,name:breed.name,imageReady:Boolean(breed.imageReady),shopOnly:Boolean(breed.shopOnly),forcedPersonality:breed.forcedPersonality||null,currentNames:currentCats.map(cat=>cat.name)};
    });
    const unlocked=list.filter(item=>item.unlocked).length;
    return {
      collection:normalized,
      list,
      summary:{unlocked,total:list.length,currentOwned:(cats||[]).length,totalObtained:list.reduce((sum,item)=>sum+item.totalObtained,0),percent:Math.round(unlocked/list.length*100)}
    };
  }

  function unlockEvent(key){
    const meta=detail(key);
    return {emoji:meta.emoji,title:`图鉴解锁：${meta.title}`,body:`你第一次把${meta.title}带回猫舍。它的品种资料、获得记录与成长阶段已经收入猫咪图鉴。`,effects:{}};
  }

  return {sync,register,markStage,view,detail,unlockEvent};
})();
