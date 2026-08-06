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
    },
    /* 灵珠专属：新增10个每日选择事件 */
    {
      id: "spiritMorningWake",
      personalities: ["spirit"],
      emoji: "🌅",
      title: "温柔的晨间叫醒",
      body: "天刚亮，{name}就跳到床边，用肉垫轻轻碰你的脸。见你没有反应，它又小声喵了一下。",
      choices: [
        {id:"cuddle",label:"把它抱进被窝",desc:"一起赖床，增加亲密与信任",effects:{intimacy:5,trust:3,vitality:2},outcome:{emoji:"🛏️",title:"再睡五分钟",body:"{name}在你臂弯里团成一团，呼噜声很快盖过了闹钟。",visual:{catState:"sleepy"}}},
        {id:"breakfast",label:"起床准备早餐",desc:"消耗1次行动，增加饱腹与健康",actions:-1,effects:{hunger:18,health:2,intimacy:2},outcome:{emoji:"🥣",title:"早饭比闹钟有效",body:"你刚拿起食盆，{name}立刻精神起来，迈着小碎步跟进了厨房。",visual:{catState:"happy"}}},
        {id:"snooze",label:"翻身继续睡",desc:"不消耗行动，它会在旁边等你",effects:{trust:1},outcome:{emoji:"😴",title:"安静地守在旁边",body:"{name}没有继续打扰，只把尾巴搭在你的手腕上，陪你又睡了一会儿。",visual:{catState:"sleepy"}}}
      ]
    },
    {
      id: "spiritStudyCompanion",
      personalities: ["spirit"],
      emoji: "📚",
      title: "陪你写作业",
      body: "你坐到桌前后，{name}也跳上旁边的椅子，端端正正地陪着你，偶尔看看书页，偶尔看看你。",
      choices: [
        {id:"share",label:"给它留一个位置",desc:"安静陪伴，增加亲密",effects:{intimacy:4,trust:3},outcome:{emoji:"🤍",title:"一人一猫的自习时间",body:"{name}把下巴搭在桌沿，始终没有碰乱你的东西。",visual:{catState:"idle"}}},
        {id:"break",label:"休息一下陪它玩",desc:"消耗1次行动，增加活力与亲密",actions:-1,effects:{vitality:5,intimacy:5,hunger:-2},outcome:{emoji:"🧶",title:"短暂的课间活动",body:"你晃了晃玩具，{name}立刻从认真陪读变成了满屋追逐的小旋风。",visual:{catState:"happy"}}},
        {id:"move",label:"把它抱到猫窝",desc:"继续专心，它会自己休息",effects:{vitality:2,trust:1},outcome:{emoji:"🐾",title:"懂事地去休息了",body:"{name}在猫窝里转了两圈趴下，仍不时抬头确认你还在。",visual:{catState:"sleepy"}}}
      ]
    },
    {
      id: "spiritHairTie",
      personalities: ["spirit"],
      emoji: "🎀",
      title: "失踪的发圈",
      body: "{name}叼着你找了很久的发圈来到面前，轻轻放下后坐得笔直，像是在等待表扬。",
      choices: [
        {id:"praise",label:"认真夸奖它",desc:"增加信任与亲密",effects:{trust:4,intimacy:4},outcome:{emoji:"🥰",title:"它听懂了夸奖",body:"{name}眯起眼睛，尾巴在地上轻轻拍了两下。",visual:{catState:"happy"}}},
        {id:"reward",label:"奖励一根猫条",desc:"需要背包中有猫条",require:{inventory:{catStrip:1}},inventory:{catStrip:-1},effects:{hunger:20,intimacy:4},outcome:{emoji:"🍗",title:"优秀寻物员的奖励",body:"{name}吃完猫条，又跑去房间角落认真检查，似乎想再找点什么。",visual:{catState:"happy"}}},
        {id:"store",label:"收好发圈",desc:"避免它误吞，增加一点健康",effects:{health:1,trust:1},outcome:{emoji:"🧺",title:"危险的小东西收好了",body:"你把发圈放进抽屉，{name}没有不高兴，只安静地跟在你身边。",visual:{catState:"idle"}}}
      ]
    },
    {
      id: "spiritRainyWindow",
      personalities: ["spirit"],
      emoji: "🌧️",
      title: "雨天的窗台",
      body: "雨点敲在玻璃上，{name}缩在窗边，小心翼翼地伸爪碰着玻璃上滑落的水珠。",
      choices: [
        {id:"blanket",label:"给它披一条小毯子",desc:"增加健康与亲密",effects:{health:2,intimacy:4},outcome:{emoji:"🧣",title:"暖暖地看雨",body:"{name}裹着毯子靠在你旁边，目光跟着雨滴一路滑到窗沿。",visual:{catState:"sleepy"}}},
        {id:"listen",label:"陪它听一会儿雨声",desc:"增加信任，恢复一点活力",effects:{trust:4,vitality:3},outcome:{emoji:"🎧",title:"房间安静下来",body:"你们并排坐着，{name}慢慢放松身体，把一只前爪搭在你腿上。",visual:{catState:"idle"}}},
        {id:"close",label:"关好窗帘让它休息",desc:"避免着凉，增加健康",effects:{health:3},outcome:{emoji:"🏠",title:"回到温暖的猫窝",body:"窗帘合上后，{name}打了个哈欠，转身钻进了猫窝。",visual:{catState:"sleepy"}}}
      ]
    },
    {
      id: "spiritBottleCapGift",
      personalities: ["spirit"],
      emoji: "🟡",
      title: "郑重其事的瓶盖礼物",
      body: "{name}把一只亮闪闪的瓶盖推到你脚边，随后抬头望着你，表情认真得像完成了一件大事。",
      choices: [
        {id:"treasure",label:"把瓶盖收进纪念盒",desc:"增加大量亲密",effects:{intimacy:6,trust:2},outcome:{emoji:"🎁",title:"礼物被珍藏了",body:"看见你认真收好瓶盖，{name}开心地绕着你的脚走了一圈。",visual:{catState:"happy"}}},
        {id:"roll",label:"把瓶盖滚回去",desc:"和它玩一会儿，消耗1次行动",actions:-1,effects:{intimacy:5,vitality:-3,courage:1},outcome:{emoji:"🏒",title:"瓶盖冰球赛",body:"瓶盖在地板上滑来滑去，{name}追得四只爪子差点打结。",visual:{catState:"mischievous"}}},
        {id:"check",label:"检查后再还给它",desc:"确认安全，增加健康与信任",effects:{health:1,trust:3},outcome:{emoji:"✅",title:"安全的小玩具",body:"你磨平了瓶盖边缘再递回去，{name}满意地把它拨到了猫窝旁。",visual:{catState:"idle"}}}
      ]
    },
    {
      id: "spiritGuestVisit",
      personalities: ["spirit"],
      emoji: "🚪",
      title: "陌生客人来访",
      body: "门外传来陌生人的声音。{name}没有躲远，只安静地站在你脚边观察，尾巴有些紧张地贴着身体。",
      choices: [
        {id:"protect",label:"把它抱到安静房间",desc:"保护它，增加信任",effects:{trust:5,courage:-1},outcome:{emoji:"🤲",title:"安全感来自你的怀抱",body:"{name}伏在你怀里听了一会儿门外的动静，身体很快放松下来。",visual:{catState:"idle"}}},
        {id:"introduce",label:"让客人远远打招呼",desc:"循序渐进，增加胆量与信任",effects:{courage:3,trust:2},outcome:{emoji:"👋",title:"一次温和的认识",body:"客人没有靠近，只轻声叫了它的名字。{name}观察片刻后，小心地探出了脑袋。",visual:{catState:"idle"}}},
        {id:"treat",label:"用猫条帮助它放松",desc:"需要背包中有猫条",require:{inventory:{catStrip:1}},inventory:{catStrip:-1},effects:{hunger:20,courage:2,intimacy:2},outcome:{emoji:"🍗",title:"零食缓解了紧张",body:"吃完猫条后，{name}仍保持距离，但已经愿意在客人面前坐下。",visual:{catState:"happy"}}}
      ]
    },
    {
      id: "spiritWaterBowl",
      personalities: ["spirit"],
      emoji: "💧",
      title: "水碗里的倒影",
      body: "{name}盯着水碗里的自己看了很久，时不时伸爪碰一下水面，随后惊讶地缩回爪子。",
      choices: [
        {id:"fresh",label:"换一碗新鲜的水",desc:"增加健康与清洁",effects:{health:3,cleanliness:2},outcome:{emoji:"🚰",title:"清凉的新水",body:"{name}先闻了闻，随后认真喝了好几口，胡须尖沾满小水珠。",visual:{catState:"happy"}}},
        {id:"play",label:"陪它拨水花",desc:"增加亲密，但会弄湿一点地面",effects:{intimacy:4,cleanliness:-3},outcome:{emoji:"💦",title:"一场迷你水仗",body:"你轻轻点了一下水面，{name}立刻跟着拍起水花，最后把两只前爪都弄湿了。",visual:{catState:"mischievous"}}},
        {id:"move",label:"把水碗移到安静处",desc:"减少打扰，增加信任",effects:{trust:3},outcome:{emoji:"🫗",title:"找到了更舒服的位置",body:"换到墙边后，{name}终于不再研究倒影，安安静静地喝起水来。",visual:{catState:"idle"}}}
      ]
    },
    {
      id: "spiritLaundryWarmth",
      personalities: ["spirit"],
      emoji: "🧺",
      title: "刚晒好的衣服",
      body: "你把刚晒好的衣服放在床边，{name}立刻钻进柔软的衣物中，只露出一双满足的眼睛。",
      choices: [
        {id:"allow",label:"让它睡一小会儿",desc:"增加亲密和活力",effects:{intimacy:4,vitality:4},outcome:{emoji:"☁️",title:"最柔软的临时猫窝",body:"{name}在衣服里踩了几下奶，很快舒服得睡着了。",visual:{catState:"sleepy"}}},
        {id:"fold",label:"一边摸它一边叠衣服",desc:"增加亲密与信任",effects:{intimacy:5,trust:2},outcome:{emoji:"🫳",title:"叠衣服也变成了互动",body:"每叠好一件，你就摸摸{name}的脑袋。它一直乖乖待在旁边。",visual:{catState:"happy"}}},
        {id:"bed",label:"把它移到猫窝",desc:"保持衣服干净，增加清洁",effects:{cleanliness:2,trust:1},outcome:{emoji:"🐈",title:"换个地方继续睡",body:"{name}虽然有些舍不得，还是抱着一只袜子去了猫窝。",visual:{catState:"sleepy"}}}
      ]
    },
    {
      id: "spiritMealReminder",
      personalities: ["spirit"],
      condition: game => game.stats.hunger < 70,
      emoji: "🐱",
      title: "它在提醒你吃饭时间到了",
      body: "{name}一看见你就喵喵叫，主动抬头去蹭你的手，前爪都快离开地面，像是马上要站起来抱住你。",
      choices: [
        {id:"strip",label:"喂它一根猫条",desc:"需要背包中有猫条",require:{inventory:{catStrip:1}},inventory:{catStrip:-1},effects:{hunger:20,intimacy:4},outcome:{emoji:"🍗",title:"撒娇成功了",body:"{name}吃得心满意足，吃完后又把脑袋塞回你的手心。",visual:{catState:"happy"}}},
        {id:"can",label:"开一个猫罐头",desc:"需要背包中有猫罐头",require:{inventory:{can:1}},inventory:{can:-1},effects:{hunger:50,intimacy:7},outcome:{emoji:"🥫",title:"今天是罐头大餐",body:"罐头刚打开，{name}就开心得原地转了一圈，吃完后亲昵地靠着你。",visual:{catState:"happy"}}},
        {id:"prepare",label:"认真准备普通猫粮",desc:"消耗1次行动，增加饱腹和健康",actions:-1,effects:{hunger:24,health:2,trust:3},outcome:{emoji:"🥣",title:"按时吃饭最安心",body:"你把食盆放好，{name}规规矩矩地吃完，还回头冲你轻轻叫了一声。",visual:{catState:"happy"}}}
      ]
    },
    {
      id: "spiritNightGuard",
      personalities: ["spirit"],
      emoji: "🌙",
      title: "床边的小守卫",
      body: "夜里传来一声轻响，{name}立刻坐到床边，竖起耳朵认真听着，像是在替你守夜。",
      choices: [
        {id:"check",label:"和它一起检查房间",desc:"消耗1次行动，增加胆量与信任",actions:-1,effects:{courage:3,trust:4},outcome:{emoji:"🔦",title:"房间一切正常",body:"你们一起巡视了一圈，发现只是窗外的风。{name}昂着头走回床边，像完成了任务。",visual:{catState:"happy"}}},
        {id:"reassure",label:"轻声告诉它没事",desc:"增加亲密与信任",effects:{intimacy:4,trust:3},outcome:{emoji:"🤍",title:"它相信你的判断",body:"听见你的声音，{name}慢慢放下警戒，重新趴到你的脚边。",visual:{catState:"sleepy"}}},
        {id:"sleep",label:"让它自己判断",desc:"增加胆量",effects:{courage:2},outcome:{emoji:"👂",title:"继续认真听了一会儿",body:"{name}确认没有危险后，才安静地团成一圈睡下。",visual:{catState:"sleepy"}}}
      ]
    },

    /* 魔丸专属：新增10个每日选择事件 */
    {
      id: "demonTissueStorm",
      personalities: ["demon"],
      emoji: "🧻",
      title: "客厅里下起了纸巾雪",
      body: "你回头时，{name}正站在一堆纸巾碎片中央，嘴里还叼着最后一小截，神情十分坦然。",
      choices: [
        {id:"clean",label:"带着它一起收拾",desc:"消耗1次行动，降低损坏并增加信任",actions:-1,effects:{damage:-3,cleanliness:8,trust:2},outcome:{emoji:"🧹",title:"勉强算是一起打扫",body:"你收纸巾时，{name}负责追着碎片跑。虽然效率一般，房间总算恢复了整洁。",visual:{catState:"mischievous"}}},
        {id:"photo",label:"先拍一张“犯罪现场”",desc:"增加亲密，但房间更乱一点",effects:{intimacy:3,cleanliness:-4},outcome:{emoji:"📸",title:"证据确凿",body:"镜头里的{name}一本正经，完全不像纸巾风暴的制造者。",visual:{catState:"mischievous"}}},
        {id:"toy",label:"用玩具转移注意力",desc:"消耗1次行动，增加亲密与活力",actions:-1,effects:{intimacy:4,vitality:-3},outcome:{emoji:"🪶",title:"新的目标出现了",body:"玩具一晃，{name}立刻放弃纸巾，转身追着你跑了起来。",visual:{catState:"happy"}}}
      ]
    },
    {
      id: "demonKeyboard",
      personalities: ["demon"],
      emoji: "⌨️",
      title: "键盘被占领",
      body: "你刚准备使用电脑，{name}就整只趴在键盘上，还用尾巴挡住了屏幕的一角。",
      choices: [
        {id:"workaround",label:"把键盘让给它",desc:"增加亲密，今天先用手机",effects:{intimacy:4,trust:1},outcome:{emoji:"😼",title:"成功占领工作区",body:"{name}满意地伸了个懒腰，仿佛这个位置本来就属于它。",visual:{catState:"happy"}}},
        {id:"move",label:"温柔地把它抱走",desc:"保住键盘，它会有点不满",effects:{trust:1,intimacy:1},outcome:{emoji:"🙄",title:"抗议无效",body:"{name}被抱到旁边后，尾巴重重拍了两下桌面，却没有真的离开。",visual:{catState:"angry"}}},
        {id:"break",label:"陪它玩五分钟再工作",desc:"消耗1次行动，增加亲密",actions:-1,effects:{intimacy:5,vitality:-4},outcome:{emoji:"🧶",title:"先满足猫老板",body:"玩够以后，{name}终于主动让开键盘，转到旁边监督你。",visual:{catState:"happy"}}}
      ]
    },
    {
      id: "demonHiddenCoins",
      personalities: ["demon"],
      emoji: "🪙",
      title: "沙发底下的私房钱",
      body: "{name}从沙发底下拨出几枚金币，又飞快地用爪子盖住，明显不打算轻易交出来。",
      choices: [
        {id:"trade",label:"用猫条和它交换",desc:"需要背包中有猫条，可获得8金币",require:{inventory:{catStrip:1}},inventory:{catStrip:-1},effects:{coins:8,hunger:20,intimacy:2},outcome:{emoji:"🤝",title:"交易顺利完成",body:"{name}叼走猫条，你收起金币。双方都对这笔交易十分满意。",visual:{catState:"happy"}}},
        {id:"game",label:"和它玩猜爪游戏",desc:"有机会拿回金币，增加亲密",effects:{coins:4,intimacy:3,courage:1},outcome:{emoji:"🎲",title:"你猜中了一半",body:"{name}把金币在两只爪子间换来换去。你最终拿回4枚，剩下的又被它藏了起来。",visual:{catState:"mischievous"}}},
        {id:"leave",label:"让它继续收藏",desc:"不拿金币，增加信任",effects:{trust:3},outcome:{emoji:"🏦",title:"猫咪的小金库",body:"你没有拿走金币。{name}观察了你一会儿，郑重地把它们重新推进沙发底下。",visual:{catState:"idle"}}}
      ]
    },
    {
      id: "demonShoelace",
      personalities: ["demon"],
      emoji: "👟",
      title: "鞋带伏击",
      body: "你正准备出门，{name}突然扑住鞋带，四只爪子一起用力，像抓住了今天最重要的猎物。",
      choices: [
        {id:"play",label:"陪它玩一轮",desc:"消耗1次行动，增加亲密与胆量",actions:-1,effects:{intimacy:4,courage:2,vitality:-3},outcome:{emoji:"🏃",title:"鞋带猎物成功逃跑",body:"你拖着鞋带绕了两圈，{name}追得十分投入，最后气喘吁吁地趴下。",visual:{catState:"happy"}}},
        {id:"replace",label:"给它一根安全绳结",desc:"花费2金币，避免鞋带损坏",require:{coins:2},effects:{coins:-2,intimacy:3},outcome:{emoji:"🪢",title:"获得了专属绳结",body:"{name}很快转移目标，抱着新绳结滚到了地毯上。",visual:{catState:"mischievous"}}},
        {id:"untie",label:"直接把鞋带抽回来",desc:"它会有点不高兴",effects:{trust:-1,courage:1},outcome:{emoji:"😾",title:"猎物被没收",body:"{name}盯着空空的爪子看了两秒，随后转身去埋伏你的另一只鞋。",visual:{catState:"angry"}}}
      ]
    },
    {
      id: "demonPlantSoil",
      personalities: ["demon"],
      emoji: "🪴",
      title: "花盆里的考古现场",
      body: "{name}把一只前爪伸进花盆，正认真地往外刨土，地面已经出现了一小堆“考古成果”。",
      choices: [
        {id:"stop",label:"立刻制止并清理",desc:"消耗1次行动，恢复清洁",actions:-1,effects:{cleanliness:8,trust:1},outcome:{emoji:"🧹",title:"考古项目被叫停",body:"你把泥土扫回花盆。{name}蹲在旁边监督，似乎对项目中止很不满意。",visual:{catState:"angry"}}},
        {id:"box",label:"给它一个装纸团的盒子",desc:"花费2金币，转移挖掘欲望",require:{coins:2},effects:{coins:-2,intimacy:4,damage:-2},outcome:{emoji:"📦",title:"新的挖掘基地",body:"纸团盒很快取代了花盆。{name}一头扎进去，忙得不亦乐乎。",visual:{catState:"mischievous"}}},
        {id:"watch",label:"看看它到底想找什么",desc:"增加亲密，但清洁下降",effects:{intimacy:2,cleanliness:-6},outcome:{emoji:"🕳️",title:"什么也没有找到",body:"{name}最终刨到了花盆底，抬头看你时满脸都是土。",visual:{catState:"mischievous"}}}
      ]
    },
    {
      id: "demonMidnightSong",
      personalities: ["demon"],
      emoji: "🎤",
      title: "凌晨的个人演唱会",
      body: "夜深以后，{name}站在走廊中央开始大声喵叫，声音一声比一声有感情。",
      choices: [
        {id:"answer",label:"学它喵一声",desc:"增加亲密和胆量",effects:{intimacy:4,courage:2},outcome:{emoji:"🎶",title:"成功完成合唱",body:"你回应以后，{name}明显愣了一下，随后用更长的一声喵接了回来。",visual:{catState:"happy"}}},
        {id:"snack",label:"拿猫条让它安静",desc:"需要背包中有猫条",require:{inventory:{catStrip:1}},inventory:{catStrip:-1},effects:{hunger:20,intimacy:2},outcome:{emoji:"🍗",title:"演出费已支付",body:"{name}叼走猫条，演唱会立刻宣布结束。",visual:{catState:"happy"}}},
        {id:"ignore",label:"假装已经睡着",desc:"不消耗资源，它会自己停下",effects:{trust:1,vitality:-1},outcome:{emoji:"🌙",title:"观众没有反应",body:"{name}又唱了几声，发现没人回应后，终于跳上床尾安静下来。",visual:{catState:"sleepy"}}}
      ]
    },
    {
      id: "demonDoorHandle",
      personalities: ["demon"],
      emoji: "🚪",
      title: "门把手研究计划",
      body: "{name}站起来扒着门把手，反复尝试往下压。看它认真的样子，似乎离成功只差一点。",
      choices: [
        {id:"teach",label:"给它演示一次",desc:"增加胆量与亲密，但可能学会开门",effects:{courage:4,intimacy:3,damage:2},outcome:{emoji:"🧠",title:"它似乎真的看懂了",body:"你压下门把手时，{name}目不转睛。下一次你可能需要给门加锁了。",visual:{catState:"mischievous"}}},
        {id:"block",label:"安装简易门挡",desc:"花费3金币，减少房屋风险",require:{coins:3},effects:{coins:-3,damage:-3},outcome:{emoji:"🔒",title:"研究项目暂时受阻",body:"门挡装好后，{name}尝试了几次，最后不甘心地甩着尾巴离开。",visual:{catState:"angry"}}},
        {id:"distract",label:"拿纸箱转移注意",desc:"增加亲密，不花金币",effects:{intimacy:3,trust:1},outcome:{emoji:"📦",title:"纸箱更有吸引力",body:"纸箱刚放下，{name}就忘记了门把手，整只钻了进去。",visual:{catState:"happy"}}}
      ]
    },
    {
      id: "demonFoodBag",
      personalities: ["demon"],
      condition: game => game.stats.hunger < 85,
      emoji: "🛍️",
      title: "猫粮袋劫案",
      body: "一阵窸窣声后，你看见{name}正倒退着拖走猫粮袋，袋子几乎和它一样大。",
      choices: [
        {id:"recover",label:"没收猫粮袋",desc:"避免偷吃，增加一点信任",effects:{trust:1,courage:-1},outcome:{emoji:"✋",title:"劫案被及时阻止",body:"你拿回猫粮袋，{name}坐在原地舔了舔爪子，假装从未参与。",visual:{catState:"idle"}}},
        {id:"portion",label:"倒一小份给它",desc:"增加饱腹与亲密",effects:{hunger:16,intimacy:2},outcome:{emoji:"🥣",title:"谈判达成",body:"得到一小份猫粮后，{name}立刻放弃了整袋目标，认真吃了起来。",visual:{catState:"happy"}}},
        {id:"chase",label:"假装追捕小偷",desc:"消耗1次行动，增加活力和亲密",actions:-1,effects:{intimacy:4,vitality:-4,courage:2},outcome:{emoji:"🚨",title:"追捕行动开始",body:"{name}拖着袋子在房间里绕了一圈，最后主动松口，转身等你继续追。",visual:{catState:"mischievous"}}}
      ]
    },
    {
      id: "demonLaundryBasket",
      personalities: ["demon"],
      emoji: "🧦",
      title: "洗衣篮伏击点",
      body: "你准备拿衣服时，{name}突然从洗衣篮里冒出脑袋，爪子还按着一只失踪很久的袜子。",
      choices: [
        {id:"retrieve",label:"拿回袜子",desc:"袜子失而复得，它会小小抗议",effects:{trust:1,intimacy:1},outcome:{emoji:"🧦",title:"失踪物品归位",body:"你抽走袜子后，{name}又在篮子里翻找起来，显然还有别的收藏。",visual:{catState:"mischievous"}}},
        {id:"play",label:"用袜子和它拔河",desc:"消耗1次行动，增加亲密",actions:-1,effects:{intimacy:5,vitality:-3},outcome:{emoji:"💪",title:"袜子拔河赛",body:"你们拉扯了好一会儿，最后袜子平安，{name}也玩累了。",visual:{catState:"happy"}}},
        {id:"basket",label:"把旧毛巾留给它",desc:"做成临时猫窝，增加信任",effects:{trust:3,vitality:2},outcome:{emoji:"🛌",title:"洗衣篮正式改造",body:"你铺好旧毛巾后，{name}满意地在里面踩了踩，抱着袜子睡下了。",visual:{catState:"sleepy"}}}
      ]
    },
    {
      id: "demonMirror",
      personalities: ["demon"],
      emoji: "🪞",
      title: "镜子里的神秘对手",
      body: "{name}对着镜子里的自己摆出狩猎姿势，往左一步，镜子里的猫也往左一步，它显然觉得事情很可疑。",
      choices: [
        {id:"observe",label:"陪它研究镜子",desc:"增加胆量与亲密",effects:{courage:3,intimacy:3},outcome:{emoji:"👀",title:"长时间的对视",body:"{name}试了各种角度，最后把鼻子贴到镜面上，和对手完成了碰鼻。",visual:{catState:"mischievous"}}},
        {id:"cover",label:"暂时把镜子盖住",desc:"帮助它放松，增加信任",effects:{trust:3},outcome:{emoji:"🧣",title:"神秘对手消失了",body:"镜子被盖住后，{name}绕到后面确认了一圈，终于放心离开。",visual:{catState:"idle"}}},
        {id:"toy",label:"在镜子前逗它玩",desc:"消耗1次行动，增加活力与亲密",actions:-1,effects:{intimacy:4,vitality:-4,courage:1},outcome:{emoji:"🪶",title:"两个影子一起追玩具",body:"{name}一会儿追玩具，一会儿看镜子里的动作，忙得顾不上怀疑对手。",visual:{catState:"happy"}}}
      ]
    },

    /* 耄耋专属：新增10个每日选择事件 */
    {
      id: "chaosBowlGuard",
      personalities: ["chaos"],
      condition: game => game.stats.hunger < 80,
      emoji: "🥣",
      title: "食盆旁的低吼",
      body: "{name}守在空食盆旁，身体压得很低。你一靠近，它就发出警告声，但目光又不停扫向食物柜。",
      choices: [
        {id:"distance",label:"保持距离放下猫粮",desc:"尊重边界，增加饱腹与少量信任",effects:{hunger:20,trust:2},outcome:{emoji:"🍽️",title:"它接受了远距离喂食",body:"你退开后，{name}才走向食盆。吃完时，它远远看了你一眼，没有继续低吼。",visual:{catState:"happy"}}},
        {id:"can",label:"放下一罐猫罐头",desc:"需要背包中有猫罐头",require:{inventory:{can:1}},inventory:{can:-1},effects:{hunger:50,trust:3},outcome:{emoji:"🥫",title:"美食让警戒缓和",body:"罐头的香味让{name}慢慢放松。它仍护着食盆，却愿意在你留在房间时进食。",visual:{catState:"happy"}}},
        {id:"wait",label:"先离开一会儿",desc:"不强迫它，增加胆量",effects:{courage:3},outcome:{emoji:"🚶",title:"给它完整的空间",body:"你关上门离开片刻。回来时食盆已经被推到角落，{name}也不再紧绷。",visual:{catState:"idle"}}}
      ]
    },
    {
      id: "chaosShadowCharge",
      personalities: ["chaos"],
      emoji: "🌑",
      title: "影子里的突然冲刺",
      body: "房间灯光晃了一下，{name}突然冲向墙上的影子，撞到一旁的小凳子后迅速退回暗处。",
      choices: [
        {id:"light",label:"打开更柔和的灯",desc:"花费2金币，减少紧张与损坏",require:{coins:2},effects:{coins:-2,damage:-2,trust:1},outcome:{emoji:"💡",title:"影子变得不再尖锐",body:"柔和灯光亮起后，{name}观察了一会儿，终于从暗处走了出来。",visual:{catState:"idle"}}},
        {id:"play",label:"用玩具引导它追逐",desc:"消耗1次行动，增加胆量与少量亲密",actions:-1,effects:{courage:3,intimacy:1,vitality:-4},outcome:{emoji:"🪶",title:"目标变得可控制",body:"玩具的轨迹比影子更明确。{name}追了几轮后，动作明显放松了一些。",visual:{catState:"mischievous"}}},
        {id:"quiet",label:"保持安静等它平复",desc:"尊重距离，增加信任",effects:{trust:2},outcome:{emoji:"🌫️",title:"房间重新安静",body:"你没有靠近。{name}在暗处观察很久，最后自己走回了房间中央。",visual:{catState:"idle"}}}
      ]
    },
    {
      id: "chaosHighShelf",
      personalities: ["chaos"],
      emoji: "🗄️",
      title: "高处的据点",
      body: "{name}跳上了最高的柜顶，伏低身体俯视整个房间。它不愿下来，也不允许任何人靠近柜子。",
      choices: [
        {id:"ladder",label:"放一条安全下来的路线",desc:"花费3金币，降低受伤风险",require:{coins:3},effects:{coins:-3,health:2,trust:1},outcome:{emoji:"🪜",title:"它自己选择了下来",body:"你摆好稳固的落脚点后退开。过了一会儿，{name}沿着路线悄悄回到地面。",visual:{catState:"idle"}}},
        {id:"wait",label:"让它待到自己想下来",desc:"增加胆量，不强迫互动",effects:{courage:3},outcome:{emoji:"⏳",title:"高处观察结束",body:"{name}在柜顶待了很久，确认房间安全后才轻巧地跳了下来。",visual:{catState:"idle"}}},
        {id:"lure",label:"用猫条引导它",desc:"需要背包中有猫条",require:{inventory:{catStrip:1}},inventory:{catStrip:-1},effects:{hunger:20,trust:2},outcome:{emoji:"🍗",title:"一步一步靠近",body:"你把猫条放在安全距离外。{name}犹豫片刻，最终沿着柜子边缘慢慢下来。",visual:{catState:"happy"}}}
      ]
    },
    {
      id: "chaosBrokenToy",
      personalities: ["chaos"],
      emoji: "🧸",
      title: "被撕开的旧玩具",
      body: "{name}把旧玩具撕开了一个口子，却没有继续破坏，只盯着露出的填充物，显得既警惕又困惑。",
      choices: [
        {id:"repair",label:"坐在远处修好它",desc:"花费3金币，增加少量信任",require:{coins:3},effects:{coins:-3,trust:2,damage:-2},outcome:{emoji:"🪡",title:"旧玩具重新完整",body:"你修好玩具后放回原处。{name}等你退开，才慢慢靠近闻了闻。",visual:{catState:"idle"}}},
        {id:"remove",label:"悄悄把危险填充物收走",desc:"增加健康，避免误食",effects:{health:3,trust:1},outcome:{emoji:"🧹",title:"危险被及时清除",body:"你没有触碰{name}，只清走散落的填充物。它一直盯着你，却没有阻止。",visual:{catState:"idle"}}},
        {id:"replace",label:"换成结实的纸团",desc:"消耗1次行动，增加胆量与活力",actions:-1,effects:{courage:2,vitality:-3,intimacy:1},outcome:{emoji:"⚪",title:"新的安全目标",body:"纸团滚过地面，{name}先观察很久，最终快速扑了上去。",visual:{catState:"mischievous"}}}
      ]
    },
    {
      id: "chaosCarrierFort",
      personalities: ["chaos"],
      emoji: "🧳",
      title: "航空箱变成了堡垒",
      body: "{name}钻进航空箱后不肯出来，从缝隙里盯着房间，偶尔伸爪拍一下经过的东西。",
      choices: [
        {id:"blanket",label:"在外面盖一层薄毯",desc:"让它更有安全感，增加信任",effects:{trust:3,vitality:2},outcome:{emoji:"🏕️",title:"获得了安静的藏身处",body:"光线暗下来后，{name}不再频繁出爪，慢慢在箱子里趴下。",visual:{catState:"sleepy"}}},
        {id:"door",label:"把箱门完全固定打开",desc:"避免意外关门，增加健康",effects:{health:2,trust:1},outcome:{emoji:"🔓",title:"出口始终畅通",body:"确认箱门不会突然关上后，{name}终于愿意把前爪伸到外面。",visual:{catState:"idle"}}},
        {id:"leave",label:"把这一角暂时让给它",desc:"增加胆量，不强迫接触",effects:{courage:3},outcome:{emoji:"🛡️",title:"堡垒得到尊重",body:"你绕开航空箱活动。许久以后，{name}自己走出来，姿态比之前放松。",visual:{catState:"idle"}}}
      ]
    },
    {
      id: "chaosSuddenTruce",
      personalities: ["chaos"],
      emoji: "🕊️",
      title: "罕见的主动靠近",
      body: "今天的{name}没有躲开。它停在离你一步远的位置，安静地看着你，尾巴也没有不耐烦地甩动。",
      choices: [
        {id:"still",label:"保持不动等它决定",desc:"尊重选择，增加信任",effects:{trust:4,intimacy:1},outcome:{emoji:"🤍",title:"它轻轻闻了闻你的手",body:"你没有伸手。{name}自己靠近半步，碰了碰你的指尖，又平静地退开。",visual:{catState:"happy"}}},
        {id:"blink",label:"慢慢对它眨眼",desc:"增加信任与少量亲密",effects:{trust:3,intimacy:2},outcome:{emoji:"👁️",title:"它也回应了一次眨眼",body:"你缓慢闭眼再睁开。{name}观察片刻，也短暂地眯起了眼睛。",visual:{catState:"idle"}}},
        {id:"pet",label:"尝试轻摸一下额头",desc:"可能太快，增加亲密但降低一点信任",effects:{intimacy:3,trust:-1},outcome:{emoji:"⚠️",title:"接触只持续了一瞬间",body:"你的手碰到额头后，{name}立刻后退，但这次没有出爪，只远远看着你。",visual:{catState:"angry"}}}
      ]
    },
    {
      id: "chaosDoorScratch",
      personalities: ["chaos"],
      condition: game => game.houseDamage < 95,
      emoji: "🚪",
      title: "门板上的抓痕",
      body: "{name}不断抓挠房门，门板已经出现新的痕迹。每次你靠近，它都会立刻转身防备。",
      choices: [
        {id:"guard",label:"在门边放一块抓板",desc:"花费5金币，减少房屋损坏",require:{coins:5},effects:{coins:-5,damage:-7,trust:1},outcome:{emoji:"🪵",title:"抓挠目标被替换",body:"你放好抓板后退开。{name}试探几次，终于开始在抓板上磨爪。",visual:{catState:"mischievous"}}},
        {id:"open",label:"打开门让它检查外面",desc:"增加胆量，但可能造成少量损坏",effects:{courage:3,damage:2},outcome:{emoji:"🚪",title:"认真巡查了一圈",body:"门打开后，{name}谨慎地查看走廊，确认没有异常才重新回房。",visual:{catState:"idle"}}},
        {id:"wait",label:"保持距离等待它停下",desc:"增加信任，不刺激它",effects:{trust:2},outcome:{emoji:"⏳",title:"抓挠慢慢停止",body:"你没有靠近。{name}发泄完紧张后，自己离开了门边。",visual:{catState:"idle"}}}
      ]
    },
    {
      id: "chaosThunder",
      personalities: ["chaos"],
      emoji: "⛈️",
      title: "雷声后的藏身",
      body: "一声雷响后，{name}迅速钻进桌下，身体紧贴地面，任何细小的动静都会让它重新绷紧。",
      choices: [
        {id:"hideout",label:"在附近放一个遮蔽箱",desc:"花费2金币，增加信任和健康",require:{coins:2},effects:{coins:-2,trust:3,health:1},outcome:{emoji:"📦",title:"有了更安全的藏身处",body:"你放下纸箱后退开。{name}很快转移进去，雷声再响时也没有那么慌张。",visual:{catState:"idle"}}},
        {id:"sit",label:"在远处安静坐着",desc:"陪伴但不靠近，增加信任",effects:{trust:3,intimacy:1},outcome:{emoji:"🌧️",title:"它知道你还在",body:"你没有说话，只留在视线范围内。{name}的呼吸渐渐平稳下来。",visual:{catState:"idle"}}},
        {id:"music",label:"播放轻柔的白噪音",desc:"消耗1次行动，恢复活力与健康",actions:-1,effects:{vitality:4,health:2},outcome:{emoji:"🎧",title:"雷声变得遥远",body:"稳定的声音盖住部分雷响，{name}慢慢趴下，不再紧盯着门口。",visual:{catState:"sleepy"}}}
      ]
    },
    {
      id: "chaosWindowReflection",
      personalities: ["chaos"],
      emoji: "🪟",
      title: "玻璃上的陌生猫影",
      body: "夜色让玻璃变成镜子。{name}盯着倒影压低身体，喉咙里发出警戒声，认定外面有另一只猫。",
      choices: [
        {id:"curtain",label:"拉上窗帘",desc:"快速消除刺激，增加信任",effects:{trust:3},outcome:{emoji:"🪟",title:"陌生猫消失了",body:"窗帘合上后，{name}绕着窗边检查一圈，终于停止警戒。",visual:{catState:"idle"}}},
        {id:"light",label:"打开室内灯让倒影变淡",desc:"增加胆量与健康",effects:{courage:2,health:1},outcome:{emoji:"💡",title:"玻璃重新变得透明",body:"光线改变后，倒影逐渐消失。{name}仍盯了一会儿，最后退回房间中央。",visual:{catState:"idle"}}},
        {id:"stay",label:"陪它保持安全距离观察",desc:"增加信任与少量亲密",effects:{trust:3,intimacy:1},outcome:{emoji:"👀",title:"共同确认没有威胁",body:"你站在远处陪着。{name}反复确认后，终于不再对倒影低吼。",visual:{catState:"idle"}}}
      ]
    },
    {
      id: "chaosMedicineDistance",
      personalities: ["chaos"],
      condition: game => game.isSick || game.stats.health < 65,
      emoji: "💊",
      title: "它发现了药的气味",
      body: "{name}闻到护理用品的气味后躲进角落，耳朵紧贴脑后，显然不允许你直接靠近。",
      choices: [
        {id:"doctor",label:"准备带它去专业治疗",desc:"花费10金币，增加健康与信任",require:{coins:10},effects:{coins:-10,health:8,trust:2},outcome:{emoji:"🏥",title:"专业处理更安全",body:"你用毛巾和航空箱谨慎配合，没有强行抓抱。{name}接受处理后精神好了一些。",visual:{catState:"sick"}}},
        {id:"food",label:"把护理品藏在罐头旁",desc:"需要背包中有猫罐头",require:{inventory:{can:1}},inventory:{can:-1},effects:{hunger:50,health:4,trust:1},outcome:{emoji:"🥫",title:"食物降低了抗拒",body:"罐头香味让{name}愿意从角落出来。它仍保持警惕，但成功吃下了一些食物。",visual:{catState:"happy"}}},
        {id:"pause",label:"暂时停止靠近并观察",desc:"避免刺激，增加信任",effects:{trust:2,health:1},outcome:{emoji:"🕰️",title:"先让它平静下来",body:"你把用品收远，留出安静空间。{name}的身体逐渐不再那么紧绷。",visual:{catState:"sick"}}}
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

