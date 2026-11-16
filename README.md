# VIZ1: Interactive Data Visualization

Three music data stories built with HTML, CSS, and D3.js v7. Each assignment has its own page, scripts, styles, and CSV data.

## Hand-in 1: The music we listened to in 2025

[Assignment 1](Assignment1/index.html) visualizes findings from Luminate's Year-End Music Report 2025.

| Chart | What it shows | Implementation |
|---|---|---|
| Horizontal bar chart | Top US genres by audio streaming volume | [bar-chart.js](Assignment1/js/bar-chart.js) |
| Circle chart | Audio streaming share by release decade | [circle-chart.js](Assignment1/js/circle-chart.js) |
| Bubble chart | Top 10 albums: audio streams, video streams, and album sales | [bubble-chart.js](Assignment1/js/bubble-chart.js) |

[main.js](Assignment1/js/main.js) holds the genre and decade data, loads [top_albums.csv](Assignment1/data/top_albums.csv), and calls the chart functions. The charts use linear, point, square-root, and ordinal scales, with labels and legends to explain the encodings.

## Hand-in 2: The Love Song Isn't Dead, It's Evolving

[Assignment 2](Assignment2/index.html) explores love-song categories among U.S. Billboard Top-10 hits from 1958 to 2023, using data from The Pudding's [Is The Love Song Dying?](https://pudding.cool/2024/11/love-songs/).

The visualization is a stacked area chart with a zero baseline (`d3.stackOffsetNone`). Layer thickness represents the number of songs in each category per year; values are counts, rather than percentages.

- **Category dropdown:** show all eight categories or isolate one category.
- **Year-range slider:** select an inclusive range between 1958 and 2023, including a single year.
- **Hover details:** a vertical guideline and tooltip show the year, total song count across all categories, and counts for the currently displayed categories.
- **Legend and transitions:** consistent category colors, smoothly changing area shapes, and animated axes support exploration.

### Implementation

[main.js](Assignment2/js/main.js) loads the [song dataset](Assignment2/data/love_song_categories_for_Billboard_Top_10_hits_1958_2023.csv) and handles the data pipeline and interactions:

1. Load the CSV with `d3.csv`, derive integer years from `top_10_debut_date_as_decimal`, trim category names, and discard rows with non-finite years. Missing categories become `Non-love Songs`.
2. Aggregate song counts by year and category with `d3.rollup`, filling missing category counts with zero and sorting by year.
3. Initialize the SVG, scales, axes, dropdown, legend, and dual-handle rSlider once.
4. Store the data and current selections in a model. Input events pass changes to `update()`, which calls `view()`.
5. Stack all categories over the full dataset with `d3.stack`, giving hidden categories zero height, and draw paths with `d3.area` and `d3.curveMonotoneX`. Clip the paths to the chart and rescale both axes to the selected years and categories.

A single-year selection expands the x-domain by half a year on either side. Paths keep the same number of data points across selections, allowing their geometry and both axes to animate together over 700 ms. Debug logging is enabled through the `DEBUG` constant in `main.js`.

## Hand-in 3: The Boyband Blueprint

[Assignment 3](Assignment3/index.html) explores hair styles across generations of boybands, using the course-provided [boys.csv](Assignment3/data/boys.csv): 234 member records across 55 bands. Some people appear in more than one band, so these records do not represent 234 distinct people.

Bands run clockwise from oldest to youngest by their members' average available birth year. Six bands with no birth dates appear in an unknown group at the end. Angular distances do not represent elapsed years.

| Visual element | What it shows |
|---|---|
| Band arc | A band, with arc length proportional to its number of member records |
| Outer ring and labels | Decade of each band's average available birth year |
| Member spoke | Hair length: short, medium, or long; a dashed short spoke indicates unknown length |
| Colored dot | Hair color |
| Colored diamond | Frosted tips and their color |

- **Band selection:** click an arc, or focus it with Tab and press Enter or Space, to highlight the band and open its member details. Select it again or use the close button to clear the selection.
- **Hair-color selection:** use the legend buttons to highlight members with a given hair color; select the same color again to clear it. Band and hair-color selections combine.
- **Accessible controls:** band arcs and hair-color buttons expose their pressed state, and member details appear in an HTML panel with a polite live region.

[main.js](Assignment3/js/main.js) parses birth dates, groups members with `d3.group`, derives average birth years with `d3.mean`, and creates the radial layout with `d3.pie` and `d3.arc`. Ordinal scales encode hair length and colors. Interaction updates the model and redraws the view, with 300 ms opacity transitions. The page also includes a reflection on the visual encodings, missing data, and possible improvements.

## Running locally

All three assignments load CSV files through D3, so serve the repository over HTTP instead of opening the HTML files with `file://`.

With Python 3 installed, run this from the repository root:

```bash
python -m http.server 5501
```

Then open:

- [Assignment 1](http://localhost:5501/Assignment1/)
- [Assignment 2](http://localhost:5501/Assignment2/)
- [Assignment 3](http://localhost:5501/Assignment3/)

Alternatively, open any assignment's `index.html` with the VS Code Live Server extension. The configured port in [.vscode/settings.json](.vscode/settings.json) is `5501`.

No package installation or build step is required. An internet connection is needed to load D3.js from its CDN and the Google Fonts used by the stylesheets; the datasets and rSlider files are stored locally.
