# Hand-in 1: The music we listened to in 2025

A small D3.js data story built on Luminate's Year-End Music Report 2025.

| Step | Chart | File |
|---|---|---|
| 1 | Top US genres: horizontal bar chart (`scaleLinear`, data join, labels, reference line) | [js/bar-chart.js](js/bar-chart.js) |
| 2 | Streams by release decade: circle chart (`<g>` per decade, `scalePoint`, `scaleSqrt`) | [js/circle-chart.js](js/circle-chart.js) |
| 3 | Top 10 albums: bubble chart (CSV loading, axes, `scaleSqrt` size, `scaleOrdinal` colour, legends) | [js/bubble-chart.js](js/bubble-chart.js) |

[js/main.js](js/main.js) only holds the data and calls the three chart functions.

## Running it

The bubble chart loads `data/top_albums.csv` with `d3.csv`, which does not work from `file://`. Serve the folder instead, for example with the VS Code Live Server extension (port 5501 is set in `.vscode/settings.json`) or:

```bash
python -m http.server 5501
```

Then open http://localhost:5501.
