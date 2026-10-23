/**
 * VIA Data Visualization — Hand-in 2
 * The Love Song Isn't Dead, It's Evolving
 *
 * Data pipeline: CSV → clean → d3.rollup → d3.stack → d3.area → SVG.
 * Interaction: user event → update(model) → view(model).
 */

const DEBUG = true;
const DATA_PATH =
  "data/love_song_categories_for_Billboard_Top_10_hits_1958_2023.csv";
const TRANSITION_MS = 700;

// Keep category order stable so stacking, colors and the legend agree.
const CATEGORY_COLORS = new Map([
  ["Non-love Songs", "#D3D3D3"],
  ["Serenade", "#86BFA8"],
  ["Pursuit", "#B9DDD0"],
  ["It's Complicated", "#E7A2A0"],
  ["Heartache", "#B87C98"],
  ["Good Riddance", "#F2C78A"],
  ["Sexual Confidence", "#F0A36E"],
  ["Love Song for the Self", "#88B6D9"]
]);

function log(...message) {
  if (DEBUG) console.log("[VIZ Hand-in 2]", ...message);
}

// Entry point: do not initialize the visualization until CSV loading finishes.
d3.csv(DATA_PATH)
  .then(rawData => {
    const data = cleanData(rawData);
    const categories = Array.from(new Set(data.map(d => d.category)));
    log("Data loaded", { songs: data.length, categories: categories.length });
    createViz(data, categories);
  })
  .catch(error => console.error("[VIZ Hand-in 2] Initialization failed:", error));

/** Convert CSV strings into consistent year and category fields. */
function cleanData(rows) {
  return rows.map(d => ({
    ...d,
    year: Math.floor(Number(d.top_10_debut_date_as_decimal)),
    category: d.love_song_category?.trim() || "Non-love Songs"
  })).filter(d => Number.isFinite(d.year));
}

/**
 * One output object per year, with a numeric count for EVERY category.
 * d3.rollup creates Map<year, Map<category, count>>.
 */
function groupSongsByYear(data, categories) {
  const counts = d3.rollup(
    data,
    songs => songs.length,
    d => d.year,
    d => d.category
  );

  return Array.from(counts, ([year, perCategory]) => {
    const row = { year };
    categories.forEach(category => {
      row[category] = perCategory.get(category) ?? 0;
    });
    row.total = d3.sum(categories, category => row[category]);
    return row;
  }).sort((a, b) => a.year - b.year);
}

function createViz(data, categories) {
  // MODEL: data and current selections — the single source of truth.
  let model = {
    data,
    categories,
    groupedData: groupSongsByYear(data, categories),
    selectedCategory: "All",
    selectedYears: d3.extent(data, d => d.year)
  };

  const total = d3.sum(model.groupedData, d => d.total);
  log("Aggregation checked", {
    numberOfYears: model.groupedData.length,
    firstYear: model.groupedData[0].year,
    lastYear: model.groupedData.at(-1).year,
    totalSongs: total,
    matchesRawData: total === data.length
  });

  const dom = initDOM();
  const viz = initViz(dom, model);
  initOptions();
  initLegend();
  initEvents();
  initSlider();
  view({ animate: false });

  /** Store references to existing HTML containers. */
  function initDOM() {
    const refs = {
      container: d3.select("#viz"),
      legend: d3.select(".legend"),
      categorySelect: d3.select("#selectSongCategory")
    };
    if (refs.container.empty() || refs.legend.empty() || refs.categorySelect.empty()) {
      throw new Error("Required HTML containers are missing from index.html");
    }
    return refs;
  }

  /**
   * INITIALIZATION: create SVG structure ONCE.
   * Scales are reusable objects; view() changes their domains later.
   */
  function initViz(dom, model) {
    const width = 900;
    const height = 450;
    const margin = { top: 30, right: 30, bottom: 60, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear()
      .domain(d3.extent(model.groupedData, d => d.year))
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(model.groupedData, d => d.total)])
      .range([innerHeight, 0])
      .nice();

    const colorScale = d3.scaleOrdinal()
      .domain(model.categories)
      .range(model.categories.map(c => CATEGORY_COLORS.get(c) ?? "#999999"));

    const svg = dom.container.append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%");

    const chart = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Layer order: areas BELOW guideline BELOW transparent hover overlay.
    // Clip areas to the chart, since paths always span all years and only the x-domain changes when the year range is narrowed.
    svg.append("defs").append("clipPath")
      .attr("id", "chart-clip")
      .append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight);

    const areasGroup = chart.append("g")
      .attr("class", "areas-group")
      .attr("clip-path", "url(#chart-clip)");
    const hoverLine = chart.append("line")
      .attr("class", "hover-line")
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", "#45343D")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4 4")
      .attr("pointer-events", "none")
      .style("display", "none");

    // Put the axes outside the area-path group, so updates don't recreate them.
    const xAxis = chart.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`);
    const yAxis = chart.append("g").attr("class", "y-axis");

    chart.append("text")
      .attr("class", "x-axis-label")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 50)
      .attr("text-anchor", "middle")
      .text("Year");

    chart.append("text")
      .attr("class", "y-axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -50)
      .attr("text-anchor", "middle")
      .text("Number of songs");

    // Created LAST: this transparent rectangle catches mouse events everywhere.
    const hoverOverlay = chart.append("rect")
      .attr("class", "hover-overlay")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .style("pointer-events", "all");

    // HTML tooltip is positioned relative to #viz (CSS: position: relative).
    const tooltip = dom.container.append("div")
      .attr("class", "chart-tooltip")
      .style("display", "none");

    // Area generator reads scales at render time and uses stacked [y0, y1] values.
    const area = d3.area()
      .x(d => xScale(d.data.year))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveMonotoneX);

    return {
      svg, chart, areasGroup, hoverLine, hoverOverlay, tooltip,
      xAxis, yAxis, xScale, yScale, colorScale, area,
      innerWidth, innerHeight
    };
  }

  /** Create dropdown options once, from category names. */
  function initOptions() {
    dom.categorySelect.selectAll("option")
      .data(["All", ...model.categories])
      .join("option")
      .attr("value", d => d)
      .text(d => d);
    dom.categorySelect.property("value", model.selectedCategory);
    log("Dropdown initialized", { options: model.categories.length + 1 });
  }

  /** Each legend swatch uses exactly the same ordinal color scale as the chart. */
  function initLegend() {
    const items = dom.legend.selectAll(".legend-item")
      .data(model.categories, d => d)
      .join("div")
      .attr("class", "legend-item");

    items.selectAll(".legend-color")
      .data(d => [d])
      .join("span")
      .attr("class", "legend-color")
      .style("background-color", d => viz.colorScale(d));

    items.selectAll(".legend-label")
      .data(d => [d])
      .join("span")
      .attr("class", "legend-label")
      .text(d => d);
    log("Legend initialized", { items: items.size() });
  }

  /** Create the pre-provided dual-handle range slider. */
  function initSlider() {
    const [minYear, maxYear] = d3.extent(model.groupedData, d => d.year);
    return new rSlider({
      target: "#yearsSlider",
      values: d3.range(minYear, maxYear + 1), // upper limit is exclusive
      range: true,
      tooltip: true,
      scale: true,
      labels: false,
      set: [minYear, maxYear],
      onChange: value => {
        const years = value.split(",").map(Number);
        const [start, end] = model.selectedYears;
        if (years.length === 2 && years.every(Number.isFinite)
            && (years[0] !== start || years[1] !== end)) {
          update({ selectedYears: years });
        }
      }
    });
  }

  /** EVENTS only send patches to update(). They never draw the chart directly. */
  function initEvents() {
    dom.categorySelect.on("change", event => {
      update({ selectedCategory: event.target.value });
    });

    viz.hoverOverlay
      .on("mouseenter", () => viz.hoverLine.style("display", null))
      .on("mousemove", event => {
        // d3.pointer on SVG gives coordinates in SVG chart units, even if scaled.
        const [x] = d3.pointer(event, viz.hoverOverlay.node());
        const [startYear, endYear] = model.selectedYears;
        const year = Math.max(startYear, Math.min(endYear,
          Math.round(viz.xScale.invert(x))
        ));
        const xYear = viz.xScale(year);
        viz.hoverLine.attr("x1", xYear).attr("x2", xYear)
          .style("display", null);
        showTooltip(year, event);
      })
      .on("mouseleave", hideHover);
  }

  function hideHover() {
    viz.hoverLine.style("display", "none");
    viz.tooltip.style("display", "none");
  }

  /** Merge only changed fields, then render based on the new model. */
  function update(patch) {
    model = { ...model, ...patch };
    hideHover();
    log("State changed", {
      category: model.selectedCategory,
      years: model.selectedYears
    });
    view({ animate: true });
  }

  /**
   * VIEW: derive everything from model, then update SVG elements.
   * Data flow: filter years → choose category keys → stack → scales → paths/axes.
   */
  function view({ animate }) {
    const [startYear, endYear] = model.selectedYears;
    const filteredData = model.groupedData.filter(d =>
      d.year >= startYear && d.year <= endYear
    );
    const visibleCategories = model.selectedCategory === "All"
      ? model.categories
      : [model.selectedCategory];

   // Stack ALL categories over ALL years, and hidden categories get height 0.
    // Every path keeps the same number of points, so D3 can morph "d" smoothly instead of fading between incompatible paths.
    // Keys are reversed so the first category (Non-love Songs) ends up on top.
    const stackedData = d3.stack()
      .keys(model.categories.slice().reverse())
      .value((row, key) => visibleCategories.includes(key) ? row[key] : 0)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone)(model.groupedData);

    // The year range only changes the x-domain, the clip path hides the rest.
    const singleYear = startYear === endYear;
    viz.xScale.domain(singleYear
      ? [startYear - 0.5, endYear + 0.5]
      : [startYear, endYear]);

    const maxSongs = d3.max(filteredData, row =>
      d3.sum(visibleCategories, category => row[category])
    ) ?? 0;
    viz.yScale.domain([0, Math.max(1, maxSongs)]).nice();

    // A shared transition synchronizes paths and both axes.
    const transition = d3.transition()
      .duration(animate ? TRANSITION_MS : 0)
      .ease(d3.easeCubicInOut);

    viz.areasGroup.selectAll("path.area")
      .data(stackedData, d => d.key)
      .join(enter => enter.append("path")
        .attr("class", "area")
        .attr("fill", d => viz.colorScale(d.key))
        .attr("d", viz.area))
      .transition(transition)
      .attr("d", viz.area);

    // Display only whole years, including when the range is very short.
    const xTicks = singleYear
      ? [startYear]
      : d3.ticks(startYear, endYear, 10).filter(Number.isInteger);

    // Update axes with a shared transition for smooth animation.
    const xAxisGenerator = d3.axisBottom(viz.xScale)
      .tickValues(xTicks)
      .tickFormat(d3.format("d"));
    const yAxisGenerator = d3.axisLeft(viz.yScale).ticks(6);
    
    viz.xAxis.transition(transition).call(xAxisGenerator);
    viz.yAxis.transition(transition).call(yAxisGenerator);

    log("View rendered", {
      category: model.selectedCategory,
      years: [startYear, endYear],
      yearlyRows: filteredData.length,
      visibleLayers: stackedData.length,
      xDomain: viz.xScale.domain(),
      yDomain: viz.yScale.domain()
    });
  }

  /** Show exact values for hovered year; dropdown controls visible category rows. */
  function showTooltip(year, event) {
    const yearData = model.groupedData.find(d => d.year === year);
    if (!yearData) return hideHover();

    const shownCategories = model.selectedCategory === "All"
      ? model.categories
      : [model.selectedCategory];
    const tooltip = viz.tooltip;
    tooltip.html("");
    tooltip.append("div").style("font-weight", "bold")
      .text(`Year: ${year}`);
    tooltip.append("div").style("margin", "6px 0")
      .text(`Total songs: ${yearData.total}`);

    shownCategories.forEach(category => {
      const row = tooltip.append("div").attr("class", "tooltip-row");
      const label = row.append("span").attr("class", "tooltip-category");
      label.append("span").attr("class", "tooltip-color")
        .style("background-color", viz.colorScale(category));
      label.append("span").text(category);
      row.append("strong").text(yearData[category] ?? 0);
    });

    // HTML tooltip uses CSS-pixel coordinates (not scaled SVG coordinates).
    const [mouseX, mouseY] = d3.pointer(event, dom.container.node());
    tooltip.style("display", "block");
    const node = tooltip.node();
    const parent = dom.container.node();
    const gap = 12;
    const left = Math.max(0, Math.min(
      mouseX + gap, parent.clientWidth - node.offsetWidth
    ));
    const top = Math.max(0, Math.min(
      mouseY + gap, parent.clientHeight - node.offsetHeight
    ));
    tooltip.style("left", `${left}px`).style("top", `${top}px`);
  }
}
