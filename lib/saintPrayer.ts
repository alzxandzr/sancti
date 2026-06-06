// Famous prayers associated with specific saints. For all other saints we
// fall back to the traditional intercessory invocation "Saint N, pray for us."
//
// Text is drawn from common-use public-domain prayer books. Each entry is
// the prayer body only — the saint's name + "pray for us" coda is rendered
// separately in the UI so the layout is uniform.

interface SaintPrayer {
  title: string;
  body: string;
}

const SAINT_PRAYERS: Record<string, SaintPrayer> = {
  "st-ignatius": {
    title: "Suscipe — the prayer of St. Ignatius",
    body:
      "Take, Lord, and receive all my liberty, my memory, my understanding, " +
      "and my entire will, all that I have and call my own. You have given " +
      "all to me. To you, Lord, I return it. Everything is yours; do with it " +
      "what you will. Give me only your love and your grace; that is enough for me.",
  },
  "st-francis": {
    title: "Make me an instrument of your peace",
    body:
      "Lord, make me an instrument of your peace: where there is hatred, " +
      "let me sow love; where there is injury, pardon; where there is doubt, " +
      "faith; where there is despair, hope; where there is darkness, light; " +
      "where there is sadness, joy. O Divine Master, grant that I may not so " +
      "much seek to be consoled as to console; to be understood as to " +
      "understand; to be loved as to love. For it is in giving that we " +
      "receive; it is in pardoning that we are pardoned; it is in dying that " +
      "we are born to eternal life.",
  },
  "st-therese": {
    title: "The Little Way",
    body:
      "O my God, I offer you all my actions of this day for the intentions and " +
      "for the glory of the Sacred Heart of Jesus. I desire to sanctify every " +
      "beat of my heart, my every thought, my simplest works, by uniting them " +
      "to its infinite merits.",
  },
  "st-augustine": {
    title: "Late have I loved you",
    body:
      "Late have I loved you, O Beauty ever ancient, ever new — late have I " +
      "loved you! You were within me, but I was outside. You called and you " +
      "shouted, and you broke through my deafness. You flashed, you shone, " +
      "and you scattered my blindness. You breathed your fragrance on me; I " +
      "drew in breath and now I pant for you.",
  },
  "st-thomas-aquinas": {
    title: "Before study",
    body:
      "Ineffable Creator, true source of light and wisdom, pour forth a ray of " +
      "your brightness into the darkness of my mind. Take from me the double " +
      "darkness in which I have been born, the obscurity of ignorance and the " +
      "blindness of sin. Grant me a keen mind, a retentive memory, and the " +
      "ability to grasp things correctly and clearly.",
  },
  "st-bernadette": {
    title: "Memorare to Our Lady",
    body:
      "Remember, O most gracious Virgin Mary, that never was it known that " +
      "anyone who fled to your protection, implored your help, or sought your " +
      "intercession was left unaided. Inspired with this confidence, I fly " +
      "unto you, O Virgin of virgins, my Mother. To you I come; before you I " +
      "stand, sinful and sorrowful. O Mother of the Word Incarnate, despise " +
      "not my petitions, but in your mercy hear and answer me. Amen.",
  },
  "st-monica": {
    title: "For perseverance in prayer",
    body:
      "Exemplary Mother of the great Augustine, you perseveringly pursued your " +
      "wayward son not with wild threats but with prayerful cries to heaven. " +
      "Intercede for all mothers in our day so that they may learn to draw " +
      "their children to God. Teach them how to remain close to their " +
      "children, even the prodigal sons and daughters who have sadly gone astray.",
  },
  "st-faustina": {
    title: "Chaplet of Divine Mercy (opening)",
    body:
      "Eternal Father, I offer you the Body and Blood, Soul and Divinity of " +
      "your dearly beloved Son, our Lord Jesus Christ, in atonement for our " +
      "sins and those of the whole world. For the sake of his sorrowful " +
      "Passion, have mercy on us and on the whole world.",
  },
  "st-padre-pio": {
    title: "Stay with me, Lord",
    body:
      "Stay with me, Lord, for it is necessary to have you present, that I " +
      "may not forget you. You know how easily I abandon you. Stay with me, " +
      "Lord, because I am weak and I need your strength, that I may not fall " +
      "so often. Stay with me, Lord, for you are my life, and without you I " +
      "am without fervor.",
  },
  "st-joseph": {
    title: "To St. Joseph",
    body:
      "O Blessed Joseph, faithful guardian of my Redeemer Jesus Christ, " +
      "protector of your chaste spouse the Virgin Mother of God, I choose " +
      "you this day to be my special patron and advocate. I beg you to keep " +
      "me, by your prayers, in the practice of every virtue, and to obtain " +
      "for me the grace to die a holy death.",
  },
  "st-michael": {
    title: "Prayer to St. Michael the Archangel",
    body:
      "Saint Michael the Archangel, defend us in battle. Be our protection " +
      "against the wickedness and snares of the devil. May God rebuke him, " +
      "we humbly pray; and do thou, O Prince of the heavenly host, by the " +
      "power of God, thrust into hell Satan and all evil spirits who prowl " +
      "about the world seeking the ruin of souls. Amen.",
  },
  "st-john-paul-ii": {
    title: "Totus Tuus",
    body:
      "Totus tuus, Maria — I am all yours, Mary, and all that I have is yours. " +
      "I accept you in everything. Give me your heart, O Mary.",
  },
  "bl-carlo-acutis": {
    title: "Eucharistic intercession",
    body:
      "Blessed Carlo, who called the Eucharist your 'highway to heaven,' " +
      "obtain for me the grace to draw near to Christ in the Blessed " +
      "Sacrament. Teach me to live each day with the freshness and integrity " +
      "you found in your short life. Amen.",
  },
};

export const prayerFor = (
  saintId: string | null | undefined,
  saintName: string,
): SaintPrayer => {
  const known = saintId ? SAINT_PRAYERS[saintId] : null;
  if (known) return known;
  return {
    title: "Intercession",
    body: `${saintName}, pray for us. Through your example and your prayers in heaven, draw us nearer to Christ.`,
  };
};
