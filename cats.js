"use strict";

/* 猫咪品种、性格、获得方式与初始属性。 */
window.CONFIG = (() => {
    const personalities = {
      spirit:{name:"灵珠",desc:"温顺、亲人、情绪稳定，怎么摸都不容易生气。亲密与信任提升更快，极少拆家。"},
      demon:{name:"魔丸",desc:"喜欢捣乱犯贱，会推杯子、抓窗帘和半夜跑酷，但本质上仍然喜欢玩家。"},
      chaos:{name:"耄耋",desc:"绝世坏猫，极难养熟，会攻击玩家和拆家。信任与亲密存在上限。"}
    };
    const breeds = {
      orange:{name:"橘白田园猫",imageReady:true,base:"#d98b3e",light:"#fff6e8",stripe:"#9a5526"},
      tabby:{name:"狸花猫",imageReady:true,base:"#77685b",light:"#e8ded2",stripe:"#3f3832"},
      tuxedo:{name:"奶牛猫",imageReady:true,base:"#242528",light:"#fffdf7",stripe:"#111214"},
      white:{name:"纯白田园猫",imageReady:true,base:"#f8f5ee",light:"#ffffff",stripe:"#d8d4ca"},
      black:{name:"纯黑田园猫",imageReady:true,base:"#25262a",light:"#4b4d52",stripe:"#111216"},
      calico:{name:"三花猫",imageReady:false,base:"#fff5e8",light:"#ffffff",stripe:"#29282a",patch:"#d67a32"},
      silver:{name:"银渐层",imageReady:false,base:"#c9cbd0",light:"#f7f7f7",stripe:"#74777d"},
      americanSilver:{name:"美短银虎斑",imageReady:false,shopOnly:true,forcedPersonality:"spirit",base:"#c8cbd0",light:"#f8f8f6",stripe:"#60656c"}
    };
    const routes = {
      shelterKitten:{name:"救助站幼猫",ageStage:"kitten",initial:{spirit:45,demon:45,chaos:10},growth:{spirit:45,demon:45,chaos:10},story:"救助站工作人员把一只幼猫轻轻放到你面前。它的性格还没有完全定型，却一直偷偷观察着你。",base:{health:80,trust:38,vitality:72,courage:40,intimacy:28,hunger:72,cleanliness:76}},
      shelterAdult:{name:"救助站成年猫",ageStage:"adult",initial:null,growth:null,story:"你选择了一只成年猫。工作人员已经把它过去的行为和性格如实告诉了你。",base:{health:84,trust:42,vitality:68,courage:58,intimacy:24,hunger:75,cleanliness:78}},
      mother:{name:"猫妈妈送来的小猫",ageStage:"kitten",initial:{spirit:50,demon:50,chaos:0},growth:{spirit:50,demon:50,chaos:0},story:"你连续投喂小区里的猫妈妈。今天，它把一只小猫带到你脚边，像是在把孩子托付给你。",base:{health:84,trust:56,vitality:74,courage:44,intimacy:42,hunger:76,cleanliness:70}},
      rain:{name:"雨天救助",ageStage:"kitten",initial:{spirit:45,demon:45,chaos:10},growth:{spirit:45,demon:45,chaos:10},story:"雨夜里，屋檐下的纸箱传来猫叫。你把浑身湿透的小猫抱回家，它紧紧抓住了你的衣角。",base:{health:63,trust:58,vitality:58,courage:32,intimacy:46,hunger:54,cleanliness:48}},
      friend:{name:"朋友家的幼猫",ageStage:"kitten",initial:{spirit:50,demon:50,chaos:0},growth:{spirit:45,demon:45,chaos:10},story:"朋友家的猫生了一窝宝宝。你蹲下来时，其中一只小猫率先踩住了你的鞋带。",base:{health:91,trust:65,vitality:82,courage:58,intimacy:48,hunger:82,cleanliness:86}},
      shop:{name:"宠物店购买",ageStage:"kitten",initial:{spirit:50,demon:50,chaos:0},growth:{spirit:45,demon:45,chaos:10},story:"你在宠物店玻璃柜前停下。一只小猫主动把爪子贴在玻璃上，像是已经选中了你。",base:{health:92,trust:46,vitality:78,courage:54,intimacy:34,hunger:80,cleanliness:90}},
      mystery:{name:"神秘事件",ageStage:"kitten",initial:{spirit:1,demon:1,chaos:1},growth:{spirit:1,demon:1,chaos:1},story:"深夜的自动售货机旁，一只来历不明的小猫一直盯着你。你转身离开，它却跟到了家门口。",base:{health:76,trust:50,vitality:76,courage:60,intimacy:38,hunger:68,cleanliness:66}}
    };
    return {personalities,breeds,routes,names:["汤圆","年糕","煤球","芝麻","奶盖","麻薯","小满","布丁"],sexes:["妹妹","弟弟"]};
  })();
