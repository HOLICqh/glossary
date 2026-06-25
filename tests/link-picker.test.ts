import { scoreHeading } from "@/components/entry-workspace";
import { normalizeSearchText } from "@/lib/pinyin";

describe("hotlink picker scoring", () => {
  it("finds close pinyin phrases even when a few syllables differ", () => {
    const heading = "Yī shǎo yú èr ér duō yú wǔ 一少於二而多於五";
    const query = normalizeSearchText("yì shǎo wū èr ér duō wū wǔ");

    expect(scoreHeading(heading, query)).toBeGreaterThan(0);
  });
});
