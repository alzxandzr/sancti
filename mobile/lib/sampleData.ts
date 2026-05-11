// Placeholder data used by the design-fidelity screens until they wire up
// to the live API. Mirrors the sample in design_handoff_sancti/screens.jsx.

export interface SaintMatch {
  id: string;
  name: string;
  title: string;
  feast: string;
  era: string;
  weight: number;
  why: string;
  virtues: string[];
  patronages: string[];
  themes: string[];
  bio: string;
}

export const SAMPLE_ROUTE_LABEL = "Vocation & discernment";
export const SAMPLE_SITUATION =
  "I keep going back and forth on whether to leave my role and go back to school. I want to do something more meaningful but I have a family to support.";

export const SAMPLE_MATCHES: SaintMatch[] = [
  {
    id: "st-ignatius",
    name: "St. Ignatius of Loyola",
    title: "Founder of the Jesuits",
    feast: "July 31",
    era: "16th century",
    weight: 98,
    why: "Left a military career after injury; gave us a method for discerning major decisions.",
    virtues: ["discernment", "courage", "discipline"],
    patronages: ["retreats", "soldiers", "discernment"],
    themes: ["vocation", "discernment", "prayer"],
    bio: "A former soldier from a Basque noble family, Ignatius was wounded at the siege of Pamplona and began a long convalescence that turned into a conversion. He drafted the Spiritual Exercises and later founded the Society of Jesus, giving the Church a school for discerning major decisions in ordinary life.",
  },
  {
    id: "st-joseph",
    name: "St. Joseph",
    title: "Foster Father of Jesus",
    feast: "March 19",
    era: "1st century",
    weight: 95,
    why: "A working man who held a vocation and a family together with quiet decisiveness.",
    virtues: ["obedience", "prudence", "chastity"],
    patronages: ["fathers", "workers", "universal Church"],
    themes: ["family", "work", "trust", "vocation"],
    bio: "Joseph appears in Scripture in moments of decision: take Mary as your wife; flee into Egypt; return to Nazareth. He is silent in the gospels and remembered as the just man — a worker, a father, and a guardian who acted when it cost him.",
  },
  {
    id: "st-john-henry-newman",
    name: "St. John Henry Newman",
    title: "Cardinal & Doctor of the Church",
    feast: "October 9",
    era: "19th century",
    weight: 85,
    why: "Walked through years of costly doubt before changing course — slowly, honestly, in conscience.",
    virtues: ["intellectual honesty", "perseverance", "humility"],
    patronages: ["intellectuals", "those struggling with doubt", "converts"],
    themes: ["vocation", "study", "conversion", "trust"],
    bio: "An Oxford scholar and Anglican cleric whose long, costly study led him into the Catholic Church at midlife. He wrote that conscience is 'the aboriginal Vicar of Christ,' and that to grow is to change often.",
  },
];

export interface PlanDayPreview {
  n: number;
  title: string;
  body: string;
  mode: string;
  done?: boolean;
  today?: boolean;
}

export const SAMPLE_PLAN_DAYS: PlanDayPreview[] = [
  {
    n: 1,
    title: "Rest at Loyola",
    body:
      "Sit with the question — without solving it. Read Phil 4:6–7. Notice where your body settles, where it tightens.",
    mode: "Reflect",
    done: true,
  },
  {
    n: 2,
    title: "First movements",
    body:
      "Examen at day-end: what stirred consolation, what brought desolation? Name two of each.",
    mode: "Examen",
    done: true,
  },
  {
    n: 3,
    title: "Two standards",
    body:
      "Imagine the decision lived out for five years on each path. Write the small details, not the big ones.",
    mode: "Imagine",
    today: true,
  },
  {
    n: 4,
    title: "Indifferent love",
    body:
      "Pray for the grace to want what God wants — even before knowing it. Sit in that ask.",
    mode: "Pray",
  },
  {
    n: 5,
    title: "Decision in season",
    body:
      "Choose, in peace. Hold the decision overnight. Return in the morning and see if peace remains.",
    mode: "Decide",
  },
];
