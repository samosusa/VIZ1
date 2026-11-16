// Hand-in 3 - The Boyband Blueprint

const SIZE = 1000;
const CENTER = SIZE / 2;
const BAND_INNER_RADIUS = 230;
const BAND_OUTER_RADIUS = 250;
const SPOKE_START = BAND_OUTER_RADIUS + 6;
const DECADE_RADIUS = 425;
const DIM_OPACITY = 0.12;
const TRANSITION_MS = 300;

const HAIR_COLORS = [
  { key: "black", color: "#2b2b2b" },
  { key: "brown", color: "#8b5a2b" },
  { key: "blonde", color: "#e8c95a" },
  { key: "strawberry blonde", color: "#e39b6b" },
  { key: "red", color: "#c0392b" },
  { key: "green", color: "#3fa34d" },
  { key: "blue", color: "#3f7fd9" },
  { key: "silver", color: "#b8bcc4" },
  { key: "unknown", color: "#ffffff" }
];

const FROST_COLORS = [
  { key: "yes", label: "yellow (bleached)", color: "#f2d33c" },
  { key: "green", label: "green", color: "#3fa34d" },
  { key: "red", label: "red", color: "#c0392b" }
];

const HAIR_LENGTHS = ["short", "medium", "long"];

const DIAMOND_PATH = "M 0 -6 L 6 0 L 0 6 L -6 0 Z";

init();

async function init() {
  const rawData = await d3.csv("data/boys.csv");
  const model = createModel(rawData);
  const dom = createDOM();
  const viz = createViz(model);

  const state = {
    model, dom, viz,
    update(patch) {
      state.model = { ...state.model, ...patch };
      view(state);
    }
  };

  drawLegend(state);
  view(state);
}

// ---------- Model ----------

function formatMember(d) {
  const parseDate = d3.timeParse("%m/%d/%Y");
  const birthDate = d.dob ? parseDate(d.dob) : null;
  return {
    band: d.band,
    name: d.name,
    birthDate,
    birthYear: birthDate ? birthDate.getFullYear() : null,
    hairColor: d.hair_color ? d.hair_color.toLowerCase() : "unknown",
    hairLength: d.hair_length || "unknown",
    frosted: d.hair_frosted === "no" || d.hair_frosted === "" ? null : d.hair_frosted
  };
}

function createModel(rawData) {
  const members = rawData.map(formatMember);

  const bands = Array.from(d3.group(members, d => d.band), ([name, bandMembers]) => ({
    name,
    members: bandMembers,
    avgBirthYear: d3.mean(bandMembers, d => d.birthYear) ?? null
  }));

  // oldest bands first, unknown birth years last
  bands.sort((a, b) => {
    if (a.avgBirthYear === null) return 1;
    if (b.avgBirthYear === null) return -1;
    return a.avgBirthYear - b.avgBirthYear;
  });

  return {
    members,
    bands,
    selectedBand: null,
    selectedHair: null
  };
}

function decadeLabel(band) {
  if (band.avgBirthYear === null) return "Unknown";
  return `${Math.floor(band.avgBirthYear / 10) * 10}s`;
}

// ---------- DOM ----------

function createDOM() {
  const svg = d3.select("#viz")
    .append("svg")
    .attr("viewBox", `-120 0 ${SIZE + 240} ${SIZE}`)
    .attr("role", "group")
    .attr("aria-labelledby", "viz-title viz-desc");

  svg.append("title").attr("id", "viz-title")
    .text("The Boyband Blueprint");
  svg.append("desc").attr("id", "viz-desc")
    .text("A circle of 55 boybands ordered clockwise by the average birth year of their members. " +
      "Each member is a spoke: longer spokes mean longer hair, the dot colour is the hair colour " +
      "and a diamond marks frosted tips.");

  const chart = svg.append("g")
    .attr("transform", `translate(${CENTER}, ${CENTER})`);

  return {
    chart,
    decades: chart.append("g").attr("class", "decades"),
    spokes: chart.append("g").attr("class", "spokes"),
    bands: chart.append("g").attr("class", "bands"),
    labels: chart.append("g").attr("class", "band-labels"),
    center: chart.append("g").attr("class", "center-text"),
    details: d3.select("#details"),
    legend: d3.select("#hair-legend")
  };
}

// ---------- Viz ----------

// x and y for an angle and radius (angle 0 is at the top)
function polar(angle, radius) {
  return [radius * Math.sin(angle), -radius * Math.cos(angle)];
}

function createViz(model) {
  const pie = d3.pie()
    .value(d => d.members.length)
    .sort(null)
    .startAngle(0.04)
    .endAngle(2 * Math.PI - 0.04)
    .padAngle(0.006);

  const bandArcs = pie(model.bands);

  const bandArc = d3.arc()
    .innerRadius(BAND_INNER_RADIUS)
    .outerRadius(BAND_OUTER_RADIUS);

  const decadeArc = d3.arc()
    .innerRadius(DECADE_RADIUS)
    .outerRadius(DECADE_RADIUS + 5);

  // angle for every member inside its band
  const memberPoints = bandArcs.flatMap(arc => {
    const step = (arc.endAngle - arc.startAngle) / arc.data.members.length;
    return arc.data.members.map((member, i) => ({
      member,
      angle: arc.startAngle + step * (i + 0.5)
    }));
  });

  // one arc per birth decade
  const decades = d3.groups(bandArcs, arc => decadeLabel(arc.data))
    .map(([label, arcs]) => ({
      label,
      startAngle: arcs[0].startAngle,
      endAngle: arcs[arcs.length - 1].endAngle
    }));

  const lengthScale = d3.scaleOrdinal()
    .domain(HAIR_LENGTHS)
    .range([40, 85, 130])
    .unknown(15);

  const hairColorScale = d3.scaleOrdinal()
    .domain(HAIR_COLORS.map(d => d.key))
    .range(HAIR_COLORS.map(d => d.color));

  const frostColorScale = d3.scaleOrdinal()
    .domain(FROST_COLORS.map(d => d.key))
    .range(FROST_COLORS.map(d => d.color));

  return { bandArcs, bandArc, decadeArc, memberPoints, decades, lengthScale, hairColorScale, frostColorScale };
}

// ---------- View ----------

function view(state) {
  drawDecades(state);
  drawBands(state);
  drawBandLabels(state);
  drawMembers(state);
  drawCenter(state);
  drawDetails(state);
  updateLegend(state);
}

function isActive(member, model) {
  const bandOk = model.selectedBand === null || member.band === model.selectedBand;
  const hairOk = model.selectedHair === null || member.hairColor === model.selectedHair;
  return bandOk && hairOk;
}

function drawDecades({ dom, viz }) {
  dom.decades.selectAll("path")
    .data(viz.decades)
    .join("path")
    .attr("d", d => viz.decadeArc({ ...d, padAngle: 0.02 }))
    .attr("class", d => d.label === "Unknown" ? "decade-arc unknown" : "decade-arc");

  const middle = d => (d.startAngle + d.endAngle) / 2;
  const position = d => polar(middle(d), DECADE_RADIUS + 18);

  dom.decades.selectAll("text")
    .data(viz.decades)
    .join("text")
    .attr("class", "decade-label")
    .attr("text-anchor", d => {
      const x = Math.sin(middle(d));
      if (Math.abs(x) < 0.3) return "middle";
      return x > 0 ? "start" : "end";
    })
    .attr("dy", "0.35em")
    .attr("x", d => position(d)[0])
    .attr("y", d => position(d)[1])
    .text(d => d.label === "Unknown" ? "Birth year unknown" : `Band average: ${d.label}`);
}

function drawBands({ model, dom, viz, update }) {
  dom.bands.selectAll("path")
    .data(viz.bandArcs, d => d.data.name)
    .join(enter => {
      const path = enter.append("path").attr("class", "band-arc");
      path.append("title");
      return path;
    })
    .attr("d", viz.bandArc)
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", d =>
      `${d.data.name}, ${d.data.members.length} members`)
    .attr("aria-pressed", d =>
      d.data.name === model.selectedBand)
    .attr("aria-controls", "details")
    .classed("selected", d => d.data.name === model.selectedBand)
    .on("click", (event, d) => {
      // clicking the same band again deselects it
      const name = d.data.name === model.selectedBand ? null : d.data.name;
      update({ selectedBand: name });
    })
        .on("keydown", (event, d) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      if (event.repeat) return;

      const name = d.data.name === model.selectedBand
        ? null
        : d.data.name;

      update({ selectedBand: name });
    })
    .transition()
    .duration(TRANSITION_MS)
    .style("opacity", d =>
      model.selectedBand === null || d.data.name === model.selectedBand ? 1 : 0.35);

  dom.bands.selectAll("title")
    .text(d => `${d.data.name}: ${d.data.members.length} members, ` +
      (d.data.avgBirthYear === null ? "birth year unknown" : `average birth year ${Math.round(d.data.avgBirthYear)}`));
}

function drawBandLabels({ model, dom, viz }) {
  const radius = BAND_INNER_RADIUS - 6;

  dom.labels.selectAll("text")
    .data(viz.bandArcs, d => d.data.name)
    .join("text")
    .attr("class", "band-label")
    .attr("dy", "0.35em")
    // flip the labels on the left side so they are not upside down
    .attr("transform", d => {
      const degrees = ((d.startAngle + d.endAngle) / 2) * 180 / Math.PI;
      return degrees < 180
        ? `rotate(${degrees - 90}) translate(${radius}, 0)`
        : `rotate(${degrees + 90}) translate(${-radius}, 0)`;
    })
    .attr("text-anchor", d => (d.startAngle + d.endAngle) / 2 < Math.PI ? "end" : "start")
    .classed("selected", d => d.data.name === model.selectedBand)
    .text(d => d.data.name);
}

function drawMembers({ model, dom, viz }) {
  // each member is a group rotated to its angle
  const groups = dom.spokes.selectAll("g.member")
    .data(viz.memberPoints, d => d.member.band + d.member.name)
    .join(enter => {
      const g = enter.append("g").attr("class", "member");
      g.append("line");
      g.append("circle");
      g.append("path").attr("class", "frost");
      g.append("title");
      return g;
    })
    .attr("transform", d => `rotate(${d.angle * 180 / Math.PI})`);

  groups.select("line")
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", -SPOKE_START)
    .attr("y2", d => -SPOKE_START - viz.lengthScale(d.member.hairLength))
    .attr("stroke-dasharray", d => d.member.hairLength === "unknown" ? "2 2" : null);

  groups.select("circle")
    .attr("cy", d => -SPOKE_START - viz.lengthScale(d.member.hairLength))
    .attr("r", 6)
    .attr("fill", d => viz.hairColorScale(d.member.hairColor));

  // diamond for frosted tips, rotated back so it stays upright
  groups.select("path.frost")
    .attr("d", d => d.member.frosted ? DIAMOND_PATH : null)
    .attr("transform", d => `translate(0, ${-SPOKE_START - viz.lengthScale(d.member.hairLength) - 16}) ` +
      `rotate(${-d.angle * 180 / Math.PI})`)
    .attr("fill", d => d.member.frosted ? viz.frostColorScale(d.member.frosted) : "none");

  groups.select("title")
    .text(d => `${d.member.name} (${d.member.band}): ${d.member.hairColor} hair, ` +
      `${d.member.hairLength} length${d.member.frosted ? ", frosted tips" : ""}`);

  groups.transition()
    .duration(TRANSITION_MS)
    .style("opacity", d => isActive(d.member, model) ? 1 : DIM_OPACITY);
}

function drawCenter({ model, dom }) {
  let lines;
  if (model.selectedBand === null) {
    lines = [`${model.bands.length} bands`, `${model.members.length} members`, "Click a band to explore"];
  } else {
    const band = model.bands.find(d => d.name === model.selectedBand);
    lines = [
      band.name,
      `${band.members.length} members`,
      band.avgBirthYear === null ? "Birth year unknown" : `Avg. born ${Math.round(band.avgBirthYear)}`
    ];
  }

  dom.center.selectAll("text")
    .data(lines)
    .join("text")
    .attr("text-anchor", "middle")
    .attr("y", (d, i) => (i - 1) * 28)
    .attr("class", (d, i) => i === 0 ? "center-main" : "center-sub")
    .text(d => d);
}

function drawDetails({ model, dom, viz, update }) {
  const formatDate = d3.timeFormat("%B %-d, %Y");
  const band = model.bands.find(d => d.name === model.selectedBand);

  dom.details.classed("hidden", band === undefined);
  if (band === undefined) return;

  dom.details.select(".details-title").text(band.name);
  dom.details.select(".details-close").on("click", () => update({ selectedBand: null }));

  const items = dom.details.select("ul")
    .selectAll("li")
    .data(band.members, d => d.name)
    .join(enter => {
      const li = enter.append("li");
      li.append("span").attr("class", "swatch");
      const text = li.append("div");
      text.append("div").attr("class", "member-name");
      text.append("div").attr("class", "member-info");
      return li;
    });

  items.select(".swatch")
    .style("background-color", d => viz.hairColorScale(d.hairColor));
  items.select(".member-name").text(d => d.name);
  items.select(".member-info").text(d =>
    `${d.birthDate ? formatDate(d.birthDate) : "Birth date unknown"} · ` +
    `${d.hairColor} hair, ${d.hairLength}` +
    (d.frosted ? " · frosted tips" : ""));
}

// ---------- Legend ----------

function drawLegend(state) {
  const { dom, viz } = state;

  dom.legend.selectAll("button")
    .data(HAIR_COLORS)
    .join("button")
    .attr("type", "button")
    .on("click", (event, d) => {
      const hair = d.key === state.model.selectedHair ? null : d.key;
      state.update({ selectedHair: hair });
    })
    .html(d => `<span class="swatch" style="background-color: ${viz.hairColorScale(d.key)}"></span>${d.key}`);

  d3.select("#frost-legend").selectAll("li")
    .data(FROST_COLORS)
    .join("li")
    .html(d => `<svg viewBox="-8 -8 16 16" width="16" height="16"><path d="${DIAMOND_PATH}" fill="${d.color}"/></svg>${d.label}`);
}

function updateLegend({ model, dom }) {
  dom.legend.selectAll("button")
    .classed("active", d => d.key === model.selectedHair)
    .attr("aria-pressed", d => d.key === model.selectedHair);
}
