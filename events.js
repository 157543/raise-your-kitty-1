"use strict";

const eventPick = list => list[Math.floor(Math.random() * list.length)];

window.EventSystem = (() => {
    const common = {
      feed:{base:{hunger:24,health:2},spirit:[
        {emoji:"🥣",title:"认真吃饭",body:"它先闻了闻猫粮，随后规规矩矩地吃完，还把空碗推回你面前。",effects:{trust:2,intimacy:3}},
        {emoji:"🐾",title:"用爪子按住你的手",body:"你刚准备离开，它用肉垫轻轻按住了你的手，示意还想再陪你一会儿。",effects:{intimacy:5}},
        {emoji:"😺",title:"边吃边呼噜",body:"它一边吃饭一边发出很轻的呼噜声，显然对今天的菜单很满意。",effects:{health:2,trust:3}},
        {emoji:"🍗",title:"把最好的一口留给你",body:"它叼起一颗猫粮放到你脚边，像是在认真分享自己的晚餐。",effects:{intimacy:6}}
      ],demon:[
        {emoji:"🙃",title:"把碗推翻了",body:"它先吃了两口，随后突然把碗推翻，坐在旁边看你收拾。",effects:{cleanliness:-7,damage:2,intimacy:1}},
        {emoji:"👜",title:"偷走猫粮袋",body:"趁你转身，它拖走了整袋猫粮，最后卡在沙发下面。",effects:{vitality:3,cleanliness:-4}},
        {emoji:"😼",title:"假装不吃",body:"它闻了闻转身离开，等你走远后又偷偷回来吃得一粒不剩。",effects:{trust:2,intimacy:2}},
        {emoji:"🫳",title:"抢勺子",body:"它一爪拍飞了你手里的勺子，然后若无其事地继续吃饭。",effects:{damage:3,courage:2}}
      ],chaos:[
        {emoji:"💥",title:"食盆保卫战",body:"它把食盆护在身下，对你的靠近发出警告，最后还咬了勺子。",effects:{trust:-2,courage:2,damage:4}},
        {emoji:"😾",title:"连碗一起掀了",body:"它不满意今天的食物，直接把碗掀翻，猫粮滚得到处都是。",effects:{cleanliness:-12,damage:5}},
        {emoji:"🩹",title:"突然出爪",body:"你放下猫粮时，它毫无征兆地给了你一爪。",effects:{trust:-2,coins:-2}},
        {emoji:"🫥",title:"躲在暗处吃完",body:"它等你完全离开后才出现。碗空了，但它依旧拒绝和你对视。",effects:{trust:1}}
      ]},
      pet:{base:{},spirit:[
        {emoji:"💗",title:"翻肚皮",body:"它直接在你面前翻出肚皮，四只爪子放松地蜷着。",effects:{trust:6,intimacy:8}},
        {emoji:"🫶",title:"主动蹭手",body:"你还没碰到它，它就先把脑袋塞进了你的手心。",effects:{trust:7,intimacy:7}},
        {emoji:"😴",title:"在你腿上睡着",body:"摸着摸着，它在你腿上彻底睡着了。",effects:{intimacy:9,vitality:5}},
        {emoji:"🎵",title:"呼噜声越来越大",body:"你挠了挠它的下巴，房间里很快只剩下满足的呼噜声。",effects:{health:1,trust:5,intimacy:6}}
      ],demon:[
        {emoji:"🪤",title:"诱捕成功",body:"它先露出肚皮骗你靠近，等你伸手时立刻抱住你的手腕轻咬一口。",effects:{intimacy:3,trust:1}},
        {emoji:"📱",title:"顺手推了遥控器",body:"它允许你摸了三秒，然后抬爪把旁边的遥控器推下桌。",effects:{trust:3,intimacy:3,damage:3}},
        {emoji:"😼",title:"嘴上嫌弃",body:"它尾巴甩得很响，却一直没有真正走开。",effects:{trust:4,intimacy:5}},
        {emoji:"🌀",title:"突然扭成一团",body:"它在你手下疯狂翻滚，下一秒又装作什么都没发生。",effects:{vitality:2,intimacy:4}}
      ],chaos:[
        {emoji:"🩸",title:"不许碰",body:"你的手刚靠近，它就快速出爪并后退到墙角。",effects:{trust:-3,coins:-3}},
        {emoji:"⚠️",title:"最后警告",body:"它压低身体、耳朵向后，明确告诉你今天不接受任何接触。",effects:{trust:-1,courage:2}},
        {emoji:"🌫️",title:"罕见的容忍",body:"它僵硬地让你摸了两下，没有攻击，也没有表现出享受。",effects:{trust:1,intimacy:1}},
        {emoji:"🛋️",title:"转身抓沙发",body:"它避开你的手，直接走到沙发旁开始磨爪。",effects:{damage:9,trust:-1}}
      ]},
      play:{base:{vitality:-13,courage:2},spirit:[
        {emoji:"🪶",title:"追逐羽毛",body:"它踩着轻快的小碎步追着逗猫棒，最后扑进你的怀里。",effects:{intimacy:7,trust:3}},
        {emoji:"⚽",title:"把球送回来",body:"你把小球丢出去，它竟然叼回来放在你脚边。",effects:{intimacy:8,courage:2}},
        {emoji:"📦",title:"纸箱探险",body:"它钻进纸箱又从另一边探出脑袋，等你夸它聪明。",effects:{intimacy:6,vitality:2}},
        {emoji:"🌙",title:"玩累了靠着你",body:"游戏结束后，它靠着你的腿慢慢平静下来。",effects:{trust:5,intimacy:5}}
      ],demon:[
        {emoji:"🪟",title:"逗猫棒不如窗帘",body:"它追了两下逗猫棒，突然转身跃上窗帘。",effects:{intimacy:5,damage:8}},
        {emoji:"📦",title:"纸箱伏击",body:"它躲进纸箱，等你经过时突然扑出来吓你。",effects:{intimacy:6,courage:4}},
        {emoji:"🔌",title:"盯上数据线",body:"它无视玩具，开始追逐桌边晃动的数据线。",effects:{damage:6,vitality:2}},
        {emoji:"🏃",title:"全屋跑酷",body:"它从沙发跳到桌子，再从桌子冲向门口，跑出了一条完整路线。",effects:{intimacy:5,damage:4}}
      ],chaos:[
        {emoji:"💢",title:"玩具被撕碎",body:"它用极短的时间把新买的玩具撕成了碎片。",effects:{damage:10,coins:-6}},
        {emoji:"🦶",title:"改为攻击脚踝",body:"它对逗猫棒毫无兴趣，转而埋伏你的脚踝。",effects:{courage:3,coins:-2}},
        {emoji:"📚",title:"撞倒书架",body:"追逐过程中，它撞掉了书架上的一排东西。",effects:{damage:13,cleanliness:-8}},
        {emoji:"👁️",title:"只盯着你",body:"它不追玩具，只在远处压低身体盯着你的动作。",effects:{trust:1,courage:2}}
      ]},
      clean:{base:{cleanliness:26,health:1},spirit:[
        {emoji:"✨",title:"监督铲屎",body:"它坐在旁边认真看你清理，结束后第一个进去检查。猫砂盆被顺利打扫干净。",effects:{trust:3,intimacy:2}},
        {emoji:"🐾",title:"保持得很干净",body:"猫砂盆几乎没有被刨得到处都是，你很快就完成了清理。",effects:{cleanliness:5}},
        {emoji:"🧼",title:"蹭了蹭你的腿",body:"你顺利收拾干净猫砂盆后，它绕着你的腿走了一圈，像是在表示感谢。",effects:{intimacy:4}},
        {emoji:"😺",title:"满意验收",body:"猫砂盆已经焕然一新。它闻了闻干净的猫砂，抬头冲你眨了眨眼。",effects:{trust:4}}
      ],demon:[
        {emoji:"🪣",title:"一路围观",body:"它追着猫砂铲跑了两圈，但你还是顺利把猫砂盆彻底清理干净。",effects:{intimacy:2,vitality:1}},
        {emoji:"😼",title:"假装来帮忙",body:"它一直盯着你的动作，偶尔伸爪碰一下工具。虽然有点捣乱，清洁仍然顺利完成。",effects:{trust:2,intimacy:2}},
        {emoji:"🧹",title:"清理完成",body:"它蹲在旁边甩着尾巴监督你。你耐心完成了铲屎，猫砂盆恢复了干净。",effects:{trust:2}},
        {emoji:"🐾",title:"抢先验收",body:"你刚清理完，它就立刻跳进去检查。好在猫砂盆已经被你收拾得干干净净。",effects:{intimacy:3}}
      ],chaos:[
        {emoji:"🛡️",title:"保持距离完成清理",body:"它一直警惕地守在附近。你等它退开后迅速完成清洁，猫砂盆最终恢复干净。",effects:{trust:1}},
        {emoji:"🧤",title:"谨慎铲屎",body:"你戴好手套、慢慢靠近，在不刺激它的情况下顺利清理完全部猫砂。",effects:{courage:1}},
        {emoji:"🧹",title:"趁它不注意",body:"趁它转身观察窗外，你迅速完成铲屎。等它回头时，猫砂盆已经干净了。",effects:{trust:1}},
        {emoji:"✅",title:"清洁成功",body:"虽然它全程盯着你，但没有阻止你。你稳稳完成清理，没有出现任何意外。",effects:{health:1}}
      ]}
    };
    const dayEvents={
      spirit:[
        {emoji:"☀️",title:"一起晒太阳",body:"它在窗边给你留了半个位置。",effects:{intimacy:4,health:2}},
        {emoji:"🛏️",title:"睡在枕边",body:"半夜醒来时，你发现它把脑袋靠在你的枕头上。",effects:{trust:4,intimacy:4}},
        {emoji:"🎁",title:"叼来小礼物",body:"它把最喜欢的玩具放到你脚边。",effects:{intimacy:5}},
        {emoji:"🌧️",title:"雨声中的陪伴",body:"窗外下雨，它安静地趴在你身边。",effects:{trust:3}},
        {emoji:"🪴",title:"没有碰绿植",body:"它从花盆旁经过，甚至没有伸爪。",effects:{trust:2}}
      ],
      demon:[
        {emoji:"🥛",title:"杯子落地",body:"它确认你在看后，缓慢把杯子推下桌。",effects:{damage:7,coins:-4}},
        {emoji:"🌙",title:"凌晨跑酷",body:"它三点准时启动，在房间里高速巡回。",effects:{intimacy:3,damage:3}},
        {emoji:"🧦",title:"袜子失踪案",body:"你在猫窝里找到了三只失踪的袜子。",effects:{intimacy:2}},
        {emoji:"🪴",title:"花盆倾斜",body:"它从花盆边经过时多停留了两秒，结果不言而喻。",effects:{damage:8,cleanliness:-6}},
        {emoji:"📦",title:"快递箱归它了",body:"新快递还没拆，它已经宣布纸箱归自己所有。",effects:{intimacy:4}}
      ],
      chaos:[
        {emoji:"🛋️",title:"沙发再次遇难",body:"它把已经修补过的地方重新抓开。",effects:{damage:14,coins:-10}},
        {emoji:"🦶",title:"脚踝伏击",body:"你经过走廊时，它从阴影中扑了出来。",effects:{coins:-3}},
        {emoji:"🪟",title:"窗帘撕裂",body:"它攀上窗帘并留下了一道长长的裂口。",effects:{damage:16}},
        {emoji:"🌫️",title:"异常平静",body:"它今天只是远远盯着你，没有发动攻击。",effects:{trust:1}},
        {emoji:"💡",title:"台灯倒下",body:"一声巨响后，台灯与地面完成了亲密接触。",effects:{damage:15,coins:-8}}
      ]
    };
    function getAction(personality,action){const pack=common[action];const e=structuredClone(eventPick(pack[personality]));e.effects={...(pack.base||{}),...(e.effects||{})};return e}
    function getDay(personality){return structuredClone(eventPick(dayEvents[personality]))}
    return {getAction,getDay};
  })();

/* 每日随机选择事件。每天生成一个，未选择前会保存在存档中。 */
window.DailyChoiceEventSystem = (() => {
  const clone = value => typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const format = (text, game) => String(text || "")
    .replaceAll("{name}", game.name)
    .replaceAll("{personality}", window.CONFIG.personalities[game.personality]?.name || "小猫");

  const definitions = [
    {
      id: "windowBird",
      personalities: ["spirit", "demon", "chaos"],
      emoji: "🐦",
      title: "窗外的小鸟",
      body: "{name}蹲在窗边，目不转睛地盯着外面跳来跳去的小鸟，尾巴尖轻轻摆动。",
      choices: [
        {id:"watch",label:"陪它一起看",desc:"安静陪伴，不消耗行动",effects:{intimacy:3,trust:2},outcome:{emoji:"🌤️",title:"一起看了很久",body:"你坐到{name}身边。它没有回头，却慢慢把身体靠在了你腿旁。",visual:{catState:"happy"}}},
        {id:"toy",label:"拿逗猫棒吸引它",desc:"消耗1次行动，增加活力与亲密",actions:-1,effects:{vitality:4,intimacy:4,hunger:-2},outcome:{emoji:"🪶",title:"注意力被你抢走了",body:"逗猫棒刚晃了一下，{name}就从窗边扑了过来，追着玩具跑了好几圈。",visual:{catState:"happy"}}},
        {id:"alone",label:"让它自己待着",desc:"不打扰它，增加一点胆量",effects:{courage:2},outcome:{emoji:"🌙",title:"它享受独处",body:"你没有打扰{name}。过了一会儿，它自己从窗边走开，看起来更自在了。",visual:{catState:"idle"}}}
      ]
    },
    {
      id: "cabinetSnack",
      personalities: ["spirit", "demon", "chaos"],
      condition: game => game.stats.hunger < 75 || (game.inventory?.catStrip || 0) > 0,
      emoji: "🗄️",
      title: "柜子前的可疑动静",
      body: "你发现{name}正悄悄扒拉零食柜门。它听见脚步声后立刻停住，装作什么都没发生。",
      choices: [
        {id:"strip",label:"拿一根猫条给它",desc:"需要背包中有猫条",require:{inventory:{catStrip:1}},inventory:{catStrip:-1},effects:{hunger:20,intimacy:2},outcome:{emoji:"🍗",title:"当场收买成功",body:"{name}立刻忘记了柜门，围着猫条转了两圈，吃完后还舔了舔你的手。",visual:{catState:"happy"}}},
        {id:"stop",label:"把它抱离柜子",desc:"不花金币，也不消耗行动",effects:{trust:1,courage:-1},outcome:{emoji:"🙀",title:"计划被识破",body:"你把{name}抱到旁边。它不满地叫了一声，但最后还是乖乖坐下了。",visual:{catState:"angry"}}},
        {id:"search",label:"陪它一起翻找",desc:"消耗1次行动，有机会找到零钱",actions:-1,effects:{coins:5,damage:2,intimacy:2},outcome:{emoji:"🪙",title:"意外找到零钱",body:"你和{name}把柜子翻了个遍，最后在角落里找到5枚金币——房间也稍微乱了一点。",visual:{catState:"mischievous"}}}
      ]
    },
    {
      id: "sofaScratch",
      personalities: ["demon", "chaos"],
      condition: game => game.houseDamage < 90,
      emoji: "🛋️",
      title: "沙发发出危险的声音",
      body: "{name}正把爪子埋进沙发侧面，一边抓一边观察你的反应。",
      choices: [
        {id:"stop",label:"马上制止",desc:"保住沙发，但它会有点不高兴",effects:{trust:-1,courage:-1},outcome:{emoji:"✋",title:"沙发暂时保住了",body:"你及时抱走{name}。它甩着尾巴抗议了一会儿，最后还是放弃了。",visual:{catState:"angry"}}},
        {id:"board",label:"买一块临时抓板",desc:"花费5金币，降低房屋损坏",require:{coins:5},effects:{coins:-5,damage:-6,intimacy:3},outcome:{emoji:"📦",title:"抓板比沙发更香",body:"你临时做了一个抓板。{name}很快把注意力转过去，沙发终于逃过一劫。",visual:{catState:"happy"}}},
        {id:"watch",label:"假装没有看见",desc:"它会玩得很开心，沙发则不会",effects:{damage:8,vitality:2,intimacy:1},outcome:{emoji:"😼",title:"它抓得更起劲了",body:"发现你没有阻止，{name}干脆换了一个更舒服的角度继续抓。",visual:{catState:"mischievous"}}}
      ]
    },
    {
      id: "cardboardBox",
      personalities: ["spirit", "demon", "chaos"],
      emoji: "📦",
      title: "一个刚拆开的纸箱",
      body: "快递刚拿出来，{name}已经钻进空纸箱，只露出一双眼睛盯着你。",
      choices: [
        {id:"holes",label:"给纸箱剪几个小洞",desc:"花费2金币，制作简易猫窝",require:{coins:2},effects:{coins:-2,intimacy:4,trust:2},outcome:{emoji:"🏠",title:"新猫窝完成",body:"你剪好小窗后，{name}立刻从洞里伸出爪子。这个纸箱看来暂时不能扔了。",visual:{catState:"happy"}}},
        {id:"play",label:"和它玩纸箱伏击",desc:"消耗1次行动，增加亲密",actions:-1,effects:{intimacy:5,vitality:-3,courage:2},outcome:{emoji:"🎯",title:"纸箱伏击战",body:"你在纸箱外轻轻敲了几下，{name}从每个洞口轮流扑出来，玩得不亦乐乎。",visual:{catState:"mischievous"}}},
        {id:"keep",label:"把纸箱留给它",desc:"不打扰，也有小小收获",effects:{trust:1},outcome:{emoji:"🐾",title:"纸箱正式归它了",body:"你把纸箱挪到墙边。{name}满意地缩了回去，只留下尾巴尖在外面晃。",visual:{catState:"idle"}}}
      ]
    },
    {
      id: "doorGreeting",
      personalities: ["spirit"],
      emoji: "🚪",
      title: "门口的迎接",
      body: "你刚回到房间，{name}就小跑着迎上来，尾巴竖得笔直。",
      choices: [
        {id:"pet",label:"蹲下来摸摸它",desc:"增加信任和亲密",effects:{trust:4,intimacy:5},outcome:{emoji:"💗",title:"它等的就是这个",body:"{name}立刻把脑袋塞进你手心，呼噜声很快响了起来。",visual:{catState:"happy"}}},
        {id:"hold",label:"把它抱起来",desc:"更亲密，但会消耗一点活力",effects:{intimacy:6,vitality:-2},outcome:{emoji:"🤍",title:"安静地待在你怀里",body:"{name}把前爪搭在你肩上，安静地闻了闻你身上的味道。",visual:{catState:"happy"}}},
        {id:"later",label:"先放好手里的东西",desc:"不增加属性，也没有损失",effects:{},outcome:{emoji:"🐈",title:"它跟在你脚边",body:"你先去收拾东西，{name}一路跟着你，生怕你又消失。",visual:{catState:"idle"}}}
      ]
    },
    {
      id: "cupEdge",
      personalities: ["demon"],
      emoji: "🥛",
      title: "杯子已经到了桌边",
      body: "{name}把桌上的杯子推到了边缘，然后转过头确认你有没有看见。",
      choices: [
        {id:"move",label:"默默把杯子拿走",desc:"避免损坏，增加一点信任",effects:{trust:2},outcome:{emoji:"😼",title:"阴谋没有得逞",body:"你抢先拿走杯子。{name}盯着空出来的位置看了半天，似乎在策划下一次。",visual:{catState:"mischievous"}}},
        {id:"stare",label:"和它对视",desc:"看看谁先忍不住",effects:{courage:2,intimacy:2},outcome:{emoji:"👀",title:"一场无声的较量",body:"你们对视了很久。最后{name}先眨眼，却顺手推倒了旁边的小纸团。",visual:{catState:"mischievous"}}},
        {id:"toy",label:"用玩具换走杯子",desc:"消耗1次行动，陪它玩一会儿",actions:-1,effects:{intimacy:4,vitality:-3},outcome:{emoji:"🧶",title:"成功转移注意力",body:"玩具一出现，{name}立刻忘了杯子，追着你跑遍了房间。",visual:{catState:"happy"}}}
      ]
    },
    {
      id: "quietChallenge",
      personalities: ["chaos"],
      emoji: "👁️",
      title: "桌子下面的目光",
      body: "{name}躲在桌子下面盯着你，耳朵向后压着，看起来不希望任何人靠近。",
      choices: [
        {id:"sit",label:"坐在远处陪它",desc:"尊重距离，缓慢增加信任",effects:{trust:2,intimacy:1},outcome:{emoji:"🌫️",title:"它没有离开",body:"你在远处坐了一会儿。{name}依然警惕，但最终慢慢放松了耳朵。",visual:{catState:"idle"}}},
        {id:"strip",label:"把猫条放在附近",desc:"需要背包中有猫条",require:{inventory:{catStrip:1}},inventory:{catStrip:-1},effects:{hunger:20,trust:2},outcome:{emoji:"🍗",title:"它接受了食物",body:"你退开后，{name}才慢慢走出来吃掉猫条。它仍然没有靠近你，但目光柔和了一点。",visual:{catState:"happy"}}},
        {id:"leave",label:"给它完全的空间",desc:"不强迫互动，增加胆量",effects:{courage:3},outcome:{emoji:"🚶",title:"你选择不打扰",body:"你离开了房间一会儿。回来时，{name}已经从桌下出来，独自在窗边坐着。",visual:{catState:"idle"}}}
      ]
    }
  ];

  const byId = id => definitions.find(item => item.id === id) || null;

  function feasible(game, definition) {
    if (!definition.personalities.includes(game.personality)) return false;
    return !definition.condition || definition.condition(game);
  }

  function create(game) {
    const previousId = game.dailyChoice?.id || null;
    let pool = definitions.filter(item => feasible(game, item) && item.id !== previousId);
    if (!pool.length) pool = definitions.filter(item => feasible(game, item));
    const selected = eventPick(pool.length ? pool : definitions);
    game.dailyChoice = {day: game.day, id: selected.id, resolved: false, choiceId: null};
    return game.dailyChoice;
  }

  function ensure(game) {
    if (!game) return null;
    const current = game.dailyChoice;
    if (!current || current.day !== game.day || !byId(current.id)) return create(game);
    current.resolved = !!current.resolved;
    current.choiceId = current.choiceId || null;
    return current;
  }

  function requirementStatus(game, choice) {
    if ((choice.actions || 0) < 0 && game.actionsLeft < Math.abs(choice.actions)) {
      return {enabled:false, reason:"今天的行动次数不够"};
    }
    const needCoins = choice.require?.coins || 0;
    if (needCoins && game.coins < needCoins) return {enabled:false, reason:`需要${needCoins}金币`};
    for (const [key, amount] of Object.entries(choice.require?.inventory || {})) {
      if ((game.inventory?.[key] || 0) < amount) {
        const name = key === "catStrip" ? "猫条" : key === "can" ? "猫罐头" : "物品";
        return {enabled:false, reason:`背包里需要${name}×${amount}`};
      }
    }
    return {enabled:true, reason:""};
  }

  function view(game) {
    const state = ensure(game);
    const definition = byId(state.id);
    return {
      id: definition.id,
      day: state.day,
      resolved: state.resolved,
      emoji: definition.emoji,
      title: format(definition.title, game),
      body: format(definition.body, game),
      choices: definition.choices.map(choice => ({
        id: choice.id,
        label: format(choice.label, game),
        desc: format(choice.desc, game),
        ...requirementStatus(game, choice)
      }))
    };
  }

  function select(game, choiceId) {
    const state = ensure(game);
    if (state.resolved) return {error:"今天的随机事件已经处理过了"};
    const definition = byId(state.id);
    const choice = definition.choices.find(item => item.id === choiceId);
    if (!choice) return {error:"没有找到这个选择"};
    const status = requirementStatus(game, choice);
    if (!status.enabled) return {error:status.reason};
    return {definition:clone(definition), choice:clone(choice)};
  }

  function outcome(game, choice) {
    const data = clone(choice.outcome || {});
    data.emoji = data.emoji || "✨";
    data.title = format(data.title || "事件结果", game);
    data.body = format(data.body || "今天发生了一件小事。", game);
    data.visual = data.visual || {catState:"idle"};
    return data;
  }

  return {create, ensure, view, select, outcome};
})();

