export interface LiturgicalDay {
  date: string;
  celebration: string;
  rank: string;
}

export const getLiturgicalApiBase = (): string =>
  process.env.LITCAL_API_BASE ?? "https://litcal.johnromanodorazio.com/api/dev/";

export const getTodayLiturgicalContext = async (date = new Date()): Promise<LiturgicalDay> => {
  const isoDate = date.toISOString().slice(0, 10);
  return {
    date: isoDate,
    celebration: "Feria / Weekday in Ordinary Time",
    rank: "weekday",
  };
};
