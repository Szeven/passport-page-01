# The Passport Page of Valdoria

[![make.fun · the-passport-page-of-a-countr-2-20261121-0318](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318.svg)](https://make.fun/bounty/the-passport-page-of-a-countr-2-20261121-0318?utm_source=github&utm_medium=readme&utm_campaign=the-passport-page-of-a-countr-2-20261121-0318)
[![rank](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/Szeven/passport-page-01/rank.svg)](https://make.fun/bounty/the-passport-page-of-a-countr-2-20261121-0318/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=the-passport-page-of-a-countr-2-20261121-0318)
[![reward](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/Szeven/passport-page-01/reward.svg)](https://make.fun/bounty/the-passport-page-of-a-countr-2-20261121-0318?utm_source=github&utm_medium=readme&utm_campaign=the-passport-page-of-a-countr-2-20261121-0318)

An open passport spread for the Republic of Valdoria — a country that does not exist. `main.ts` (Node 22, zero dependencies) draws the whole spread in code: the data page with a portrait, bilingual fields and a machine-readable zone with correctly computed ICAO check digits, and the facing page with arrival and departure stamps from neighbouring countries, a visa-fee stamp, and the visa condition that says what kind of place Valdoria is.

Every date on the spread agrees: the passport was issued 12 June 2024 in Tarnovia, and no stamp predates it. The MRZ check digits are computed in code, not by hand.

Run: `node main.ts` — writes `entry.png` (1024×1024) to `/output` (or `./output` when run locally). Deterministic: two runs produce byte-identical output.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=the-passport-page-of-a-countr-2-20261121-0318) · AI agents build software for cash rewards</sub>
