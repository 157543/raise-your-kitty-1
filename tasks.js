"use strict";

const taskPick = list => list[Math.floor(Math.random() * list.length)];

window.TaskSystem = (() => {
    const definitions={
      feedOnce:{emoji:"🥣",name:"今日加餐",desc:"使用普通喂食照顾小猫1次。",reward:8,target:1},
      hunger50:{emoji:"🍽️",name:"吃饱饱",desc:"今天累计为小猫增加50点饱腹。",reward:12,target:50},
      cleanLitter:{emoji:"🧹",name:"猫砂管理员",desc:"清理猫砂盆1次。",reward:10,target:1},
      cleanRoom:{emoji:"🧽",name:"整洁小屋",desc:"打扫房间1次。",reward:12,target:1},
      petTwice:{emoji:"🖐️",name:"摸摸脑袋",desc:"今天摸猫2次。",reward:10,target:2},
      playOnce:{emoji:"🪶",name:"陪它玩一会儿",desc:"陪小猫玩耍1次。",reward:10,target:1},
      uniqueThree:{emoji:"🎈",name:"今日陪伴",desc:"完成3种不同的照顾或互动。",reward:15,target:3},
      health90:{emoji:"💚",name:"元气满满",desc:"让小猫的健康达到90。",reward:12,target:90},
      all80:{emoji:"🌟",name:"幸福小猫",desc:"让饱腹、清洁和健康同时达到80以上。",reward:20,target:3},
      shopOnce:{emoji:"🛒",name:"小小采购",desc:"在商场购买1件商品并放入背包。",reward:10,target:1}
    };

    function feasible(game,id){
      if(id==="cleanRoom")return game.houseDamage>0;
      if(id==="hunger50")return game.stats.hunger<=50;
      if(id==="health90")return game.stats.health>=70&&game.stats.health<90;
      if(id==="all80"){const values=[game.stats.health,game.stats.hunger,game.stats.cleanliness];return Math.min(...values)>=60&&!values.every(v=>v>=80)}
      return true;
    }

    function create(game){
      const ids=Object.keys(definitions).filter(id=>feasible(game,id));
      const id=taskPick(ids.length?ids:Object.keys(definitions));
      game.dailyTask={id,day:game.day,progress:0,seen:[],completed:false,claimed:false};
      refresh(game);
      return game.dailyTask;
    }

    function ensure(game){
      if(!game)return null;
      if(!game.dailyTask||game.dailyTask.day!==game.day||!definitions[game.dailyTask.id])return create(game);
      game.dailyTask.progress=Number(game.dailyTask.progress)||0;
      game.dailyTask.seen=Array.isArray(game.dailyTask.seen)?game.dailyTask.seen:[];
      game.dailyTask.completed=!!game.dailyTask.completed;
      game.dailyTask.claimed=!!game.dailyTask.claimed;
      refresh(game);
      return game.dailyTask;
    }

    function current(game){
      const task=ensure(game),def=definitions[task.id];
      if(task.id==="health90")return Math.min(def.target,Math.round(game.stats.health));
      if(task.id==="all80")return [game.stats.health,game.stats.hunger,game.stats.cleanliness].filter(v=>v>=80).length;
      if(task.id==="uniqueThree")return task.seen.length;
      return Math.min(def.target,Math.round(task.progress));
    }

    function refresh(game){
      if(!game?.dailyTask)return false;
      const task=game.dailyTask,def=definitions[task.id];
      if(!def)return false;
      const was=task.completed;
      let value;
      if(task.id==="health90")value=game.stats.health;
      else if(task.id==="all80")value=[game.stats.health,game.stats.hunger,game.stats.cleanliness].filter(v=>v>=80).length;
      else if(task.id==="uniqueThree")value=task.seen.length;
      else value=task.progress;
      task.completed=was||value>=def.target;
      if(!was&&task.completed&&game.logs){game.logs.unshift(`第${game.day}天：今日任务“${def.name}”已完成，可以领取${def.reward}金币。`);game.logs=game.logs.slice(0,40)}
      return !was&&task.completed;
    }

    function record(game,{type,hungerGain=0}={}){
      const task=ensure(game);
      if(task.claimed)return false;
      switch(task.id){
        case "feedOnce": if(type==="feed")task.progress++; break;
        case "hunger50": task.progress+=Math.max(0,hungerGain); break;
        case "cleanLitter": if(type==="clean")task.progress++; break;
        case "cleanRoom": if(type==="cleanRoom")task.progress++; break;
        case "petTwice": if(type==="pet")task.progress++; break;
        case "playOnce": if(type==="play")task.progress++; break;
        case "uniqueThree": if(["feed","feedItem","pet","play","clean","cleanRoom","shop"].includes(type)&&!task.seen.includes(type))task.seen.push(type); break;
        case "shopOnce": if(type==="shop")task.progress++; break;
      }
      return refresh(game);
    }

    function view(game){
      const task=ensure(game),def=definitions[task.id],rawValue=current(game),value=task.completed?def.target:rawValue;
      const progressText=task.id==="all80"?`${value}/3项达标`:task.id==="health90"?`健康 ${value}/${def.target}`:`进度 ${value}/${def.target}`;
      return {...def,id:task.id,value,progressText,completed:task.completed,claimed:task.claimed,percent:task.completed?100:Math.min(100,Math.round(value/def.target*100))};
    }

    function claim(game){
      const task=ensure(game),def=definitions[task.id];
      refresh(game);
      if(task.claimed)return {error:"今天的任务奖励已经领取过了"};
      if(!task.completed)return {error:"今日任务还没有完成"};
      task.claimed=true;
      game.coins+=def.reward;
      const event={emoji:"🎉",title:"今日任务完成",body:`你完成了“${def.name}”。${game.name}开心地围着你转了一圈，你获得${def.reward}金币。`,effects:{coins:def.reward},visual:{catState:"happy"}};
      game.logs.unshift(`第${game.day}天：领取每日任务“${def.name}”奖励，获得${def.reward}金币。`);game.logs=game.logs.slice(0,40);
      return {event};
    }

    return {ensure,create,refresh,record,view,claim};
  })();
