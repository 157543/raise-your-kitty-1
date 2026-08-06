"use strict";

/* 亲密关系等级、解锁内容、专属反应与里程碑。 */
window.RelationshipSystem = (() => {
  const clone = value => typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

  const levels = [
    {key:"stranger",name:"陌生",emoji:"🌫️",min:0,max:19,description:"它还在观察你，需要稳定而温和的照顾。",unlock:"基础照顾与互动"},
    {key:"familiar",name:"熟悉",emoji:"🐾",min:20,max:39,description:"它已经记住你的声音和气味，开始愿意待在你附近。",unlock:"更自然的日常互动反应"},
    {key:"trust",name:"信赖",emoji:"🤍",min:40,max:59,description:"它在你身边明显放松，愿意安心吃饭和休息。",unlock:"安心陪伴与信任类文字"},
    {key:"dependent",name:"依赖",emoji:"💗",min:60,max:79,description:"它会主动寻找你，也更期待每天的抚摸和陪伴。",unlock:"每日首次摸猫额外亲密 +1"},
    {key:"close",name:"亲密",emoji:"💕",min:80,max:99,description:"你已经成为它最信任的人，它会在每天首次见面时主动迎接。",unlock:"每日首次进入时的专属迎接"},
    {key:"inseparable",name:"形影不离",emoji:"💞",min:100,max:100,description:"你们已经是彼此生活中不可缺少的一部分。",unlock:"每天额外获得 2 金币"}
  ];

  const milestoneText = {
    spirit: {
      familiar:"它不再躲着你的手，开始主动闻你的指尖。",
      trust:"它在你身边趴下，把最放松的一面交给了你。",
      dependent:"它听见你的脚步声就会抬头，确认你还在身边。",
      close:"它开始每天守在门边等你回来，尾巴总是高高竖起。",
      inseparable:"它轻轻靠进你怀里，像是终于找到了永远不会离开的家。"
    },
    demon: {
      familiar:"它依旧爱捣乱，却已经学会在闯祸后偷偷观察你的反应。",
      trust:"它假装完全不在意你，却会把霸占的椅子悄悄让出一半。",
      dependent:"它每次跑酷结束都会回来找你，仿佛只有你身边才是终点。",
      close:"它把最喜欢的玩具叼到你脚边，然后装作只是顺路经过。",
      inseparable:"它仍然会推杯子，但推完后一定会跑来蹭你——你已经是它唯一认定的同伙。"
    },
    chaos: {
      familiar:"它仍然充满警惕，但已经愿意在你出现时留在原地。",
      trust:"它第一次在你附近闭上眼睛，哪怕只有短短几秒。",
      dependent:"它开始在需要帮助时主动发出声音，而不是独自躲起来。",
      close:"它把一直藏着的小东西推到你面前，这是它极少给予的信任。",
      inseparable:"它依旧难以捉摸，却只允许你走进它最脆弱的领地。"
    }
  };

  const reactions = {
    spirit: {
      stranger:["它还留着一点距离，但没有离开。"],
      familiar:["它已经认得你的气味，动作明显放松了一些。"],
      trust:["它在你身边很安心，呼噜声也变得更清楚。"],
      dependent:["它完成互动后仍不肯走开，一直贴在你身旁。"],
      close:["你一开口，它就立刻抬头回应，像是一直在等你。"],
      inseparable:["它几乎不用确认就完全信任你的动作，安稳地靠着你。"]
    },
    demon: {
      stranger:["它一边配合，一边怀疑地盯着你。"],
      familiar:["它嘴上不叫，尾巴却悄悄朝你的方向弯了过来。"],
      trust:["它装作若无其事，却故意把身体靠近了一点。"],
      dependent:["它闹完以后没有跑远，而是回来守在你脚边。"],
      close:["它把恶作剧暂停了几秒，认真享受和你相处的时间。"],
      inseparable:["它依旧顽皮，但所有闹腾最后都会绕回你身边。"]
    },
    chaos: {
      stranger:["它全程保持警惕，今天没有攻击已经算是难得的和平。"],
      familiar:["它没有立刻躲开，只是沉默地观察你的每一个动作。"],
      trust:["它短暂放松了耳朵，允许你在身边多停留一会儿。"],
      dependent:["它虽然仍不温顺，却开始在你离开时追着看。"],
      close:["它只对你收起了部分戒备，这份例外十分难得。"],
      inseparable:["它仍然像一团无法预测的影子，却把你划进了自己的领地。"]
    }
  };

  function levelFor(value) {
    const amount = Math.max(0, Math.min(100, Number(value) || 0));
    return levels.find((level, index) => index === levels.length - 1 ? amount >= level.min : amount <= level.max) || levels[0];
  }

  function rankFor(value) {
    return levels.indexOf(levelFor(value));
  }

  function create(intimacy = 0, day = 1) {
    const level = levelFor(intimacy);
    return {
      levelKey: level.key,
      highestRank: levels.indexOf(level),
      unlocked: levels.slice(0, levels.indexOf(level) + 1).map(item => item.key),
      lastWelcomeDay: null,
      lastPetBonusDay: null,
      lastCompanionRewardDay: null,
      pendingEvents: [],
      createdDay: Number(day) || 1
    };
  }

  function normalize(cat, day = 1) {
    const intimacy = Number(cat?.stats?.intimacy) || 0;
    const current = levelFor(intimacy);
    const currentRank = levels.indexOf(current);
    const source = cat?.relationship && typeof cat.relationship === "object" ? cat.relationship : {};
    const highestRank = Math.max(currentRank, Math.min(levels.length - 1, Number(source.highestRank) || 0));
    cat.relationship = {
      levelKey: current.key,
      highestRank,
      unlocked: Array.isArray(source.unlocked)
        ? [...new Set([...source.unlocked, ...levels.slice(0, highestRank + 1).map(item => item.key)])]
        : levels.slice(0, highestRank + 1).map(item => item.key),
      lastWelcomeDay: Number.isFinite(Number(source.lastWelcomeDay)) ? Number(source.lastWelcomeDay) : null,
      lastPetBonusDay: Number.isFinite(Number(source.lastPetBonusDay)) ? Number(source.lastPetBonusDay) : null,
      lastCompanionRewardDay: Number.isFinite(Number(source.lastCompanionRewardDay)) ? Number(source.lastCompanionRewardDay) : null,
      pendingEvents: Array.isArray(source.pendingEvents) ? source.pendingEvents.filter(Boolean).slice(0, 8) : [],
      createdDay: Number(source.createdDay) || Number(day) || 1
    };
    return cat.relationship;
  }

  function ensure(game) {
    if (!game) return null;
    if (!game.relationship || typeof game.relationship !== "object") game.relationship = create(game.stats?.intimacy, game.day);
    const relationship = game.relationship;
    const current = levelFor(game.stats?.intimacy);
    relationship.levelKey = current.key;
    relationship.highestRank = Number.isFinite(Number(relationship.highestRank))
      ? Math.max(0, Math.min(levels.length - 1, Number(relationship.highestRank)))
      : levels.indexOf(current);
    relationship.unlocked = Array.isArray(relationship.unlocked) ? relationship.unlocked : levels.slice(0, relationship.highestRank + 1).map(item => item.key);
    relationship.lastWelcomeDay = Number.isFinite(Number(relationship.lastWelcomeDay)) ? Number(relationship.lastWelcomeDay) : null;
    relationship.lastPetBonusDay = Number.isFinite(Number(relationship.lastPetBonusDay)) ? Number(relationship.lastPetBonusDay) : null;
    relationship.lastCompanionRewardDay = Number.isFinite(Number(relationship.lastCompanionRewardDay)) ? Number(relationship.lastCompanionRewardDay) : null;
    relationship.pendingEvents = Array.isArray(relationship.pendingEvents) ? relationship.pendingEvents : [];
    relationship.createdDay = Number(relationship.createdDay) || Number(game.day) || 1;
    return relationship;
  }

  function milestoneEvent(game, level) {
    const text = milestoneText[game.personality]?.[level.key] || `${game.name}和你的关系变得更亲近了。`;
    return {
      emoji: level.emoji,
      title: `关系提升：${level.name}`,
      body: `${game.name}与你的关系提升到了「${level.name}」。${text}\n\n解锁：${level.unlock}`,
      effects: {},
      visual: {catState:"happy"},
      relationshipMilestone: true
    };
  }

  function onIntimacyChanged(game, beforeValue, afterValue) {
    const relationship = ensure(game);
    if (!relationship) return [];
    const current = levelFor(afterValue);
    const currentRank = levels.indexOf(current);
    relationship.levelKey = current.key;
    const events = [];
    if (Number(afterValue) > Number(beforeValue) && currentRank > relationship.highestRank) {
      for (let rank = relationship.highestRank + 1; rank <= currentRank; rank += 1) {
        const level = levels[rank];
        relationship.unlocked.push(level.key);
        const event = milestoneEvent(game, level);
        relationship.pendingEvents.push(event);
        events.push(event);
      }
      relationship.unlocked = [...new Set(relationship.unlocked)];
      relationship.highestRank = currentRank;
    }
    return events;
  }

  function takePending(game) {
    const relationship = ensure(game);
    if (!relationship?.pendingEvents?.length) return [];
    const events = relationship.pendingEvents.map(clone);
    relationship.pendingEvents = [];
    return events;
  }

  function view(game, maximum = 100) {
    const relationship = ensure(game);
    const value = Math.max(0, Math.min(100, Number(game?.stats?.intimacy) || 0));
    const level = levelFor(value);
    const rank = levels.indexOf(level);
    const next = levels[rank + 1] || null;
    const segmentEnd = next ? next.min : 100;
    const segmentSize = Math.max(1, segmentEnd - level.min);
    const segmentPercent = next ? Math.max(0, Math.min(100, Math.round((value - level.min) / segmentSize * 100))) : 100;
    const cap = Math.max(1, Number(maximum) || 100);
    return {
      ...level,
      rank,
      value: Math.round(value),
      maximum: cap,
      next,
      nextAt: next?.min ?? 100,
      segmentPercent,
      overallPercent: Math.min(100, Math.round(value / cap * 100)),
      cappedBeforeNext: Boolean(next && cap < next.min),
      unlocked: relationship.unlocked.map(key => levels.find(item => item.key === key)).filter(Boolean),
      highestRank: relationship.highestRank
    };
  }

  function decorateAction(game, actionKey, rawEvent) {
    const event = clone(rawEvent);
    event.effects = {...(event.effects || {})};
    const relationship = ensure(game);
    const current = levelFor(game.stats.intimacy);
    const pool = reactions[game.personality]?.[current.key];
    if (["feed","feedItem","pet","play","clean"].includes(actionKey) && pool?.length) {
      event.body = `${event.body}\n\n${pool[Math.floor(Math.random() * pool.length)]}`;
    }
    if (actionKey === "pet" && levels.indexOf(current) >= 3 && relationship.lastPetBonusDay !== game.day) {
      relationship.lastPetBonusDay = game.day;
      event.effects.intimacy = (Number(event.effects.intimacy) || 0) + 1;
      event.body += `\n\n💕 这是今天第一次认真摸${game.name}，依赖关系让本次互动额外增加1点亲密。`;
    }
    return event;
  }

  function welcomeEvent(game) {
    const relationship = ensure(game);
    const relation = view(game, game.personality === "chaos" ? 35 : 100);
    if (relation.rank < 4 || relationship.lastWelcomeDay === game.day) return null;
    relationship.lastWelcomeDay = game.day;
    const bodies = relation.rank >= 5 ? {
      spirit:`你刚出现，${game.name}就从原来的位置跑来迎接，贴着你转了一圈后安心坐在脚边。它已经把你的归来当成每天最重要的事情。`,
      demon:`${game.name}本来正在研究桌边的杯子，看见你后立刻放弃计划，装作不经意地走过来蹭了蹭你。`,
      chaos:`${game.name}安静地望着你，没有后退。过了一会儿，它把自己一直藏着的小东西推到你面前。`
    } : {
      spirit:`${game.name}听见你的脚步声就小跑到门边，尾巴竖得笔直，迫不及待地抬头看你。`,
      demon:`${game.name}假装只是路过，却一路跟到你脚边，还把尾巴轻轻绕过你的腿。`,
      chaos:`${game.name}没有靠得太近，但它从藏身处走了出来，安静地确认你已经回来。`
    };
    return {
      emoji: relation.emoji,
      title: relation.rank >= 5 ? "形影不离的迎接" : "它在等你回来",
      body: bodies[game.personality] || `${game.name}主动来迎接你。`,
      effects: {},
      visual: {catState:"happy"},
      relationshipWelcome: true
    };
  }

  function dailyCompanionReward(game) {
    const relationship = ensure(game);
    const relation = view(game, game.personality === "chaos" ? 35 : 100);
    if (relation.rank < 5 || relationship.lastCompanionRewardDay === game.day) return null;
    relationship.lastCompanionRewardDay = game.day;
    return {
      emoji:"💞",
      title:"形影不离的陪伴奖励",
      body:`${game.name}与你已经形影不离。它今天也一直陪在你身边，猫舍额外获得2金币。`,
      effects:{coins:2},
      visual:{catState:"happy"}
    };
  }

  return {levels,levelFor,rankFor,create,normalize,ensure,view,onIntimacyChanged,takePending,decorateAction,welcomeEvent,dailyCompanionReward};
})();
