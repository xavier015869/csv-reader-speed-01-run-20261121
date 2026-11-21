# csv-reader-speed-01-run-20261121

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/xavier015869/csv-reader-speed-01-run-20261121/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/xavier015869/csv-reader-speed-01-run-20261121/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A dependency-free CSV reader that returns csv-reader 1.0.0's exact answers — every broken row read the same way, every error in the same order — in a fraction of the CPU time. `solve.js` makes one pass over the text and copies each field out with a single slice whenever the field needs no rewriting, stitching segments together only for the rare field that drops a stray CR, doubles a quote, or normalises a line break inside quotes. `main.ts` is the harness driver: it reads `/input/cases.json`, answers each case with `run()`, and writes `/output/answers.json`.

## Run it

```sh
node main.ts
```

It reads `/input/cases.json` and writes `/output/answers.json`; set `MAKEFUN_INPUT_DIR` and `MAKEFUN_OUTPUT_DIR` to point it at other directories.

---

<sub>Entered on [make.fun](https://make.fun/?ref=9d3wsaqp&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
