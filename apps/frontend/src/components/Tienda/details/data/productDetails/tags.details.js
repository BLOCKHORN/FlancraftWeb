// apps/frontend/src/components/Tienda/data/productDetails/tags.details.js

const mk = (key, tagLine, description = []) => ({
  key,
  tag: [tagLine],
  description,
});

/**
 * Ajustes:
 * - Quitamos descripciones tipo "Click para seleccionar" (redundante con la UI).
 * - Dejamos descripciones solo donde aportan valor (paises + épicos).
 * - Unificamos textos en español.
 */

export const TAGS_DETAILS = {
  "tags/pack-tags-paises": {
    type: "mc_menu",
    id: "tags_pack_paises",
    theme: "tags",
    kicker: "Producto",
    name: "Pack Tags Países",
    title: "PACK TAGS PAÍSES",
    subtitle: "Representa tu país con un tag visible en chat/perfil.",
    command: "/tags",
    items: [
      mk("espana", " &f[&c&lE&e&lS&c&lP&r&f]", ["&7Representa tu país en el chat."]),
      mk("mexico", " &f[&a&lM&f&lE&c&lX&r&f]", ["&7Representa tu país en el chat."]),
      mk("argentina", " &f[&b&lA&f&lR&b&lG&r&f]", ["&7Representa tu país en el chat."]),
      mk("chile", " &f[&9&lC&f&lH&c&lL&r&f]", ["&7Representa tu país en el chat."]),
      mk("colombia", " &f[&e&lC&9&lO&c&lL&r&f]", ["&7Representa tu país en el chat."]),
      mk("peru", " &f[&c&lP&f&lE&c&lR&r&f]", ["&7Representa tu país en el chat."]),
      mk("brasil", " &f[&a&lB&e&lR&a&lA&r&f]", ["&7Representa tu país en el chat."]),
      mk("italia", " &f[&a&lI&f&lT&c&lA&r&f]", ["&7Representa tu país en el chat."]),
    ],
  },

  "pack-tags-paises": "tags/pack-tags-paises",

  "tags/pack-tags-epicos": {
    type: "mc_menu",
    id: "tags_pack_epicos",
    theme: "tags",
    kicker: "Producto",
    name: "Pack Tags Épicos",
    title: "PACK TAGS ÉPICOS",
    subtitle: "Tags con estética épica para destacar mucho más en el chat.",
    command: "/tags",
    items: [
      mk("killer", " &f[&c&lKiller: &4%statistic_player_kills%&f]", ["&cMuestra tus kills en tiempo real."]),
      mk("hacker", " &f[#A01DFF&lHacker&f]", ["&7Un tag raro, limpio y llamativo."]),
      mk("lucifer", " &f[&4&lLUCIFER&r&f]", ["&7Un tag oscuro y potente."]),
      mk("badboy", " &f[&c&lBAD&4&lBOY&r&f]", ["&7Para destacar con actitud."]),
      mk("legend", " &f[&6&lL&f&lE&6&lG&f&lE&6&lN&f&lD&r&f]", ["&7Un clásico épico."]),
      mk("rey", " &f[&6&lREY&r&f]", ["&7Dominio total en el chat."]),
      mk("pro", " &f[&e&lPRO&f]", ["&7Simple, limpio y con presencia."]),
      mk("flancraft", " &f[&6&lFLAN&f&lCRAFT&r&f]", ["&7Tag oficial para fans de FlanCraft."]),
    ],
  },

  "pack-tags-epicos": "tags/pack-tags-epicos",

  "tags/pack-tags-emojis": {
    type: "mc_menu",
    id: "tags_pack_simbolos",
    theme: "tags",
    kicker: "Producto",
    name: "Pack Tags Símbolos",
    title: "PACK TAGS SÍMBOLOS",
    subtitle: "Tags con símbolos para un estilo más expresivo.",
    command: "/tags",
    items: [
      mk("star", " &f[&6★&f]"),
      mk("pico", " &f[&6&l⛏&f]"),
      mk("espadas", " &f[&c⚔&f]"),
      mk("avion", " &f[&b✈&r&f]"),
      mk("xd", " &f[&e&lXD&r&f]"),
      mk("carita1", " &f[&a&l>.&r&a&l<&r&f]"),
      mk("carita2", " &f[&6&l-.-&r&f]"),
      mk("pacman", " &f[&a:v&r&f]"),
    ],
  },

  "pack-tags-emojis": "tags/pack-tags-emojis",

  "tags/pack-tags-comunes": {
    type: "mc_menu",
    id: "tags_pack_comunes",
    theme: "tags",
    kicker: "Producto",
    name: "Pack Tags Comunes",
    title: "PACK TAGS COMUNES",
    subtitle: "Tags sencillos y limpios para un estilo clásico.",
    command: "/tags",
    items: [
      mk("boy", " &f[&b&lBOY&f]"),
      mk("girl", " &f[&d&lGIRL&f]"),
      mk("rich", " &f[&a&lRICO&f]"),
      mk("chill", " &f[&a&lCHILL&r&f]"),
      mk("casual", " &f[&7&lCASUAL&r&f]"),
      mk("patrona", " &f[&d&lPATRONA&r&f]"),
      mk("farmer", " &f[&2&lFARMER&r&f]"),
      mk("campeon", " &f[&e&lCAMPEÓN&r&f]"),
    ],
  },

  "pack-tags-comunes": "tags/pack-tags-comunes",
};
