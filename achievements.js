"use strict";

/* V4.5 成就与称号：记录长期养成进度，并允许佩戴已解锁称号。 */
window.AchievementSystem = (() => {
  const categories = Object.freeze({
    journey:{name:"养成旅程",emoji:"🐾"},
    care:{name:"日常照顾",emoji:"🫶"},
    relationship:{name:"关系羁绊",emoji:"💕"},
    collection:{name:"收集探索",emoji:"📚"},
    challenge:{name:"长期挑战",emoji:"🏆"}
  });

  const counterDefaults = Object.freeze({
    catsAdopted:0,
    catsGrown:0,
    feed:0,
    pet:0,
    play:0,
    cleanLitter:0,
    cleanRoom:0,
    work:0,
    care:0,
    itemsBought:0,
    itemsUsed:0,
    tasksClaimed:0,
    eventsResolved:0,
    roomRestores:0,
    maxDamageSeen:0
  });

  const catList = root => Array.isArray(root?.cats) ? root.cats : [];
  const collectionEntries = root => Object.values(root?.collection || {});
  const unlockedBreedCount = root => collectionEntries(root).filter(entry => entry?.unlocked).length;
  const totalBreedCount = root => Math.max(1, Object.keys(window.CONFIG?.breeds || {}).length);
  const inventoryCount = root => Object.values(root?.inventory || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  const maxIntimacy = (root, predicate = () => true) => catList(root).filter(predicate).reduce((max, cat) => Math.max(max, Number(cat?.stats?.intimacy) || 0), 0);
  const personalityCount = root => {
    const seen = new Set();
    collectionEntries(root).forEach(entry => (entry?.personalityKeys || []).forEach(key => seen.add(key)));
    catList(root).forEach(cat => { if (cat?.personality) seen.add(cat.personality); if (cat?.initialPersonality) seen.add(cat.initialPersonality); });
    return ["spirit","demon","chaos"].filter(key => seen.has(key)).length;
  };
  const adultObservedCount = (root, state) => {
    const observed = collectionEntries(root).filter(entry => (entry?.ageStages || []).includes("adult")).length;
    const current = catList(root).filter(cat => cat?.ageStage === "adult").length;
    return Math.max(observed, current, Number(state?.counters?.catsGrown) || 0);
  };
  const healthyCatCount = root => catList(root).filter(cat => ["health","hunger","cleanliness"].every(key => (Number(cat?.stats?.[key]) || 0) >= 80)).length;

  const title = (name, emoji) => ({name, emoji});
  const definitions = Object.freeze([
    {id:"firstCat",category:"journey",emoji:"🏠",name:"初次相遇",desc:"把第一只猫带回猫舍。",target:1,value:root=>catList(root).length,title:title("新手铲屎官","🐾")},
    {id:"threeCats",category:"journey",emoji:"🐈",name:"热闹猫舍",desc:"猫舍中同时拥有3只猫。",target:3,value:root=>catList(root).length,title:title("猫舍主人","🏡")},
    {id:"day7",category:"journey",emoji:"📅",name:"一周陪伴",desc:"陪伴猫咪度过第7天。",target:7,value:root=>Number(root?.day)||1,title:title("一周陪伴者","🗓️")},
    {id:"day30",category:"journey",emoji:"🌙",name:"三十日相守",desc:"陪伴猫舍度过第30天。",target:30,value:root=>Number(root?.day)||1,title:title("长期饭票","🌙")},
    {id:"grownCat",category:"journey",emoji:"🌱",name:"成长见证者",desc:"见证至少1只幼猫长大成年。",target:1,value:(root,state)=>adultObservedCount(root,state),title:title("成长见证者","🌿")},

    {id:"feed20",category:"care",emoji:"🥣",name:"御膳房开张",desc:"累计喂猫20次，普通喂食、猫条和罐头都计入。",target:20,value:(_root,state)=>state.counters.feed,title:title("御膳房总管","🥣")},
    {id:"pet20",category:"care",emoji:"🫳",name:"摸摸专家",desc:"累计摸猫20次。",target:20,value:(_root,state)=>state.counters.pet,title:title("摸摸专家","🫳")},
    {id:"play15",category:"care",emoji:"🧶",name:"玩具大师",desc:"累计陪猫玩耍15次。",target:15,value:(_root,state)=>state.counters.play,title:title("逗猫棒大师","🧶")},
    {id:"clean10",category:"care",emoji:"🧹",name:"金牌保洁",desc:"累计清理猫砂或打扫房间10次。",target:10,value:(_root,state)=>state.counters.cleanLitter+state.counters.cleanRoom,title:title("金牌保洁","🧹")},
    {id:"care5",category:"care",emoji:"🩺",name:"猫咪护理师",desc:"累计完成5次洗护或治疗。",target:5,value:(_root,state)=>state.counters.care,title:title("猫咪护理师","🩺")},
    {id:"roomRestore",category:"care",emoji:"🛠️",name:"灾后重建",desc:"把曾经惨不忍睹的房间重新清理到完好状态。",target:1,value:(_root,state)=>state.counters.roomRestores,title:title("灾后重建专家","🛠️")},

    {id:"closeFriend",category:"relationship",emoji:"💕",name:"猫咪最爱",desc:"让任意一只猫的亲密达到80。",target:80,value:root=>maxIntimacy(root),title:title("猫咪最爱","💕")},
    {id:"inseparable",category:"relationship",emoji:"💞",name:"形影不离",desc:"让任意一只猫的亲密达到100。",target:100,value:root=>maxIntimacy(root),title:title("形影不离","💞")},
    {id:"chaosCertified",category:"relationship",emoji:"🌫️",name:"耄耋认证",desc:"把一只耄耋性格猫的亲密养到上限35。",target:35,value:root=>maxIntimacy(root,cat=>cat?.personality==="chaos"),title:title("耄耋认证","🌫️")},
    {id:"happyShelter",category:"relationship",emoji:"🌈",name:"幸福猫舍",desc:"同时让3只猫的健康、饱腹和清洁都达到80。",target:3,value:root=>healthyCatCount(root),title:title("幸福猫舍守护者","🌈")},

    {id:"dex4",category:"collection",emoji:"📖",name:"猫咪观察员",desc:"点亮4个猫咪品种图鉴。",target:4,value:root=>unlockedBreedCount(root),title:title("猫咪观察员","🔎")},
    {id:"dexAll",category:"collection",emoji:"🏛️",name:"完整猫咪图鉴",desc:"点亮当前全部猫咪品种图鉴。",target:root=>totalBreedCount(root),value:root=>unlockedBreedCount(root),title:title("猫咪博物学家","🏛️")},
    {id:"americanSilver",category:"collection",emoji:"⭐",name:"银虎斑知己",desc:"从宠物店获得美短银虎斑。",target:1,value:root=>root?.collection?.americanSilver?.unlocked?1:0,title:title("银虎斑知己","⭐")},
    {id:"allPersonalities",category:"collection",emoji:"🎭",name:"三种灵魂",desc:"曾经遇见灵珠、魔丸和耄耋三种性格。",target:3,value:root=>personalityCount(root),title:title("性格观察家","🎭")},

    {id:"task7",category:"challenge",emoji:"📋",name:"每日打卡王",desc:"领取7次每日任务奖励。",target:7,value:(_root,state)=>state.counters.tasksClaimed,title:title("每日打卡王","📋")},
    {id:"event10",category:"challenge",emoji:"✨",name:"故事收藏家",desc:"处理10次每日随机事件。",target:10,value:(_root,state)=>state.counters.eventsResolved,title:title("故事收藏家","✨")},
    {id:"coins500",category:"challenge",emoji:"🪙",name:"猫咪财务官",desc:"同时拥有500金币。",target:500,value:root=>Math.max(0,Number(root?.coins)||0),title:title("猫咪财务官","🪙")},
    {id:"shop10",category:"challenge",emoji:"🛍️",name:"零食采购员",desc:"累计在商场购买10件商品。",target:10,value:(_root,state)=>state.counters.itemsBought,title:title("零食采购员","🛍️")},
    {id:"inventory10",category:"challenge",emoji:"🎒",name:"零食仓库",desc:"背包中同时存放10件物品。",target:10,value:root=>inventoryCount(root),title:title("零食仓库管理员","🎒")}
  ]);

  const definitionMap = new Map(definitions.map(item => [item.id,item]));
  const counterKeys = Object.keys(counterDefaults);
  const number = value => Math.max(0, Math.floor(Number(value) || 0));
  const targetFor = (definition, root) => Math.max(1, number(typeof definition.target === "function" ? definition.target(root) : definition.target));
  const valueFor = (definition, root, state) => Math.max(0, Number(definition.value(root,state)) || 0);

  function create(day=1){
    return {
      version:1,
      createdDay:Math.max(1,number(day)||1),
      unlocked:{},
      pending:[],
      selectedTitle:null,
      counters:{...counterDefaults}
    };
  }

  function normalize(source, root, {migrating=false}={}){
    const state=create(root?.day||1);
    if(source&&typeof source==="object"){
      state.version=1;
      state.createdDay=Math.max(1,number(source.createdDay)||state.createdDay);
      Object.entries(source.unlocked||{}).forEach(([id,record])=>{
        if(!definitionMap.has(id))return;
        state.unlocked[id]={day:Math.max(1,number(record?.day)||Number(root?.day)||1)};
      });
      state.pending=[...new Set((source.pending||[]).filter(id=>definitionMap.has(id)&&state.unlocked[id]))].slice(0,30);
      state.selectedTitle=typeof source.selectedTitle==="string"?source.selectedTitle:null;
      counterKeys.forEach(key=>state.counters[key]=number(source.counters?.[key]));
    }
    state.counters.maxDamageSeen=Math.max(state.counters.maxDamageSeen,number(root?.houseDamage));

    if(migrating){
      definitions.forEach(definition=>{
        if(valueFor(definition,root,state)>=targetFor(definition,root))state.unlocked[definition.id]={day:Math.max(1,Number(root?.day)||1)};
      });
      if(!state.selectedTitle){
        const first=definitions.find(definition=>state.unlocked[definition.id]&&definition.title);
        if(first)state.selectedTitle=first.id;
      }
    }

    if(state.selectedTitle&&!state.unlocked[state.selectedTitle])state.selectedTitle=null;
    return state;
  }

  function ensure(root, options={}){
    if(!root)return null;
    root.achievements=normalize(root.achievements,root,options);
    return root.achievements;
  }

  function unlock(root, state, definition, {silent=false}={}){
    if(state.unlocked[definition.id])return false;
    state.unlocked[definition.id]={day:Math.max(1,Number(root?.day)||1)};
    if(!silent)state.pending.push(definition.id);
    if(!state.selectedTitle&&definition.title)state.selectedTitle=definition.id;
    return true;
  }

  function evaluate(root,{silent=false}={}){
    const state=ensure(root);
    if(!state)return [];
    state.counters.maxDamageSeen=Math.max(state.counters.maxDamageSeen,number(root?.houseDamage));
    const unlocked=[];
    definitions.forEach(definition=>{
      if(state.unlocked[definition.id])return;
      if(valueFor(definition,root,state)>=targetFor(definition,root)&&unlock(root,state,definition,{silent}))unlocked.push(definition);
    });
    return unlocked;
  }

  function record(root,key,amount=1,meta={}){
    const state=ensure(root);
    if(!state)return [];
    if(counterKeys.includes(key))state.counters[key]=number(state.counters[key]+amount);
    if(key==="cleanRoom"){
      const before=number(meta.before),after=number(meta.after);
      state.counters.maxDamageSeen=Math.max(state.counters.maxDamageSeen,before);
      if(state.counters.maxDamageSeen>=70&&after<15){
        state.counters.roomRestores+=1;
        state.counters.maxDamageSeen=after;
      }
    }
    return evaluate(root);
  }

  function achievementEvent(definition){
    return {
      emoji:definition.emoji,
      title:`成就解锁：${definition.name}`,
      body:`${definition.desc}\n\n获得新称号「${definition.title.emoji} ${definition.title.name}」。你可以在“成就与称号”页面选择是否佩戴。`,
      effects:{},
      visual:{catState:"happy"},
      achievementUnlock:true
    };
  }

  function takePending(root){
    const state=ensure(root);
    if(!state||!state.pending.length)return [];
    const ids=[...state.pending];state.pending=[];
    return ids.map(id=>definitionMap.get(id)).filter(Boolean).map(achievementEvent);
  }

  function currentTitle(root){
    const state=ensure(root);
    const definition=state?.selectedTitle?definitionMap.get(state.selectedTitle):null;
    if(!definition||!state.unlocked[definition.id])return null;
    return {key:definition.id,...definition.title,achievementName:definition.name};
  }

  function selectTitle(root,key){
    const state=ensure(root);
    if(!state)return {error:"还没有猫舍"};
    if(!key||key==="none"){state.selectedTitle=null;return {title:null}}
    const definition=definitionMap.get(key);
    if(!definition||!state.unlocked[key])return {error:"这个称号还没有解锁"};
    state.selectedTitle=key;
    return {title:currentTitle(root)};
  }

  function view(root,filter="all"){
    const state=ensure(root);
    if(!state)return null;
    const list=definitions.map(definition=>{
      const target=targetFor(definition,root),raw=valueFor(definition,root,state),value=Math.min(target,raw),unlocked=Boolean(state.unlocked[definition.id]);
      return {
        ...definition,
        categoryName:categories[definition.category]?.name||definition.category,
        categoryEmoji:categories[definition.category]?.emoji||"🏆",
        target,value,rawValue:raw,unlocked,
        unlockedDay:state.unlocked[definition.id]?.day||null,
        percent:unlocked?100:Math.min(100,Math.round(value/target*100)),
        selected:state.selectedTitle===definition.id
      };
    });
    const shown=list.filter(item=>filter==="all"||(filter==="unlocked"?item.unlocked:!item.unlocked));
    const unlocked=list.filter(item=>item.unlocked).length;
    return {
      list:shown,
      all:list,
      summary:{unlocked,total:list.length,percent:Math.round(unlocked/list.length*100),titles:unlocked},
      currentTitle:currentTitle(root),
      filter,
      categories
    };
  }

  return {categories,definitions,create,normalize,ensure,evaluate,record,takePending,currentTitle,selectTitle,view};
})();
