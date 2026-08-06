"use strict";

/* WebP 资源清单。新增素材时优先只修改这个文件。 */
window.ASSETS = Object.freeze({
    version: "local-cache-v20-webp-20260806-v4-5-2-cache-layout-fix",
    cover: "assets/cover/home-cover.webp",
    rooms: {
      clean: "assets/rooms/room-clean.webp",
      light: "assets/rooms/room-light-damage.webp",
      heavy: "assets/rooms/room-heavy-damage.webp",
      destroyed: "assets/rooms/room-destroyed.webp"
    },
    routeScenes: {
      shop: "assets/rooms/pet-shop.webp"
    },
    effects: {
      windowLight: "assets/effects/window-light.webp"
    },
    catStates: ["idle","happy","sleepy","angry","sick","mischievous"],
    eventImages: {
      feed: "assets/events/feed.webp",
      feedSpill: "assets/events/feed-spill.webp",
      pet: "assets/events/pet.webp",
      attack: "assets/events/attack.webp",
      bathGood: "assets/events/bath-good.webp",
      bathStruggle: "assets/events/bath-struggle.webp",
      doctor: "assets/events/doctor.webp",
      sick: "assets/events/sick.webp",
      grow: "assets/events/grow-up.webp",
      damage: "assets/events/damage.webp",
      work: "assets/events/work.webp"
    }
  });
