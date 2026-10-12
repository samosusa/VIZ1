const metrics = ['total_album_consumption_millions', 'album_sales', 'song_sales_thousands', 'on_demand_audio_streams_billions', 'on_demand_video_streams_millions'];

// 1110 = inner width of the card at the 1200px container, so on desktop the chart
// is not scaled and bubble sizes match the size legend exactly
const width = 1110
const height = 380
const margin = { top: 24, right: 30, bottom: 60, left: 70 }

const maxBubbleRadius = 45;

function createBubbleChart(rawData) {
    const data = parseAlbums(rawData);

    const bubbleChartSection = d3.select('#bubble-chart');
    bubbleChartSection.append('h3').text('Top 10 albums: on-demand audio vs. video streams, sized by album sales');
    bubbleChartSection.append('p')
        .attr('class', 'chart-note')
        .text('Hover over a bubble for details.');

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = bubbleChartSection.append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

    // Everything is drawn inside this group; the margins hold the axes and their labels
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // --- Scales -------------------------------------------------------------
    // X: on-demand audio streams (billions)
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.on_demand_audio_streams_billions)])
        .nice(7)
        .range([0, innerWidth]);

    // Y: on-demand video streams (millions)
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.on_demand_video_streams_millions)])
        .nice(6)
        .range([innerHeight, 0]);

    // Radius: album sales, square-rooted so bubble area encodes the value
    const rScale = d3.scaleSqrt()
        .domain([0, d3.max(data, d => d.album_sales)])
        .range([0, maxBubbleRadius]);

    // Colour: one per album
    const colorScale = d3.scaleOrdinal()
        .domain(data.map(d => d.title))
        .range(d3.schemeTableau10);

    // --- Axes ---------------------------------------------------------------
    chart.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(7).tickFormat(d3.format('.1f')));

    chart.append('g')
        .attr('class', 'axis y-axis')
        .call(d3.axisLeft(yScale).ticks(6));

    chart.append('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth)
        .attr('y', innerHeight + 45)
        .attr('text-anchor', 'end')
        .text('On-demand audio streams (billions)');

    chart.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -50)
        .attr('text-anchor', 'middle')
        .text('On-demand video streams (millions)');

    // --- Bubbles ------------------------------------------------------------
    // Largest first, so smaller bubbles are drawn on top and stay visible
    const bubbleData = data.slice().sort((a, b) => b.album_sales - a.album_sales);
    const tooltip = createTooltip();

    chart.selectAll('circle.bubble')
        .data(bubbleData, d => d.title)
        .join('circle')
        .attr('class', 'bubble')
        .attr('cx', d => xScale(d.on_demand_audio_streams_billions))
        .attr('cy', d => yScale(d.on_demand_video_streams_millions))
        .attr('r', d => rScale(d.album_sales))
        .attr('fill', d => colorScale(d.title))
        .on('mouseenter', (event, d) => {
            d3.select(event.currentTarget).classed('is-active', true);
            tooltip.show(event, d);
        })
        .on('mousemove', event => tooltip.move(event))
        .on('mouseleave', event => {
            d3.select(event.currentTarget).classed('is-active', false);
            tooltip.hide();
        });

    createColorLegend(data, colorScale);
    createSizeLegend(rScale);
}

// d3.csv reads every value as a string, so convert the numeric columns first
function parseAlbums(rawData) {
    return rawData.map(row => {
        const album = { ...row };
        metrics.forEach(metric => {
            album[metric] = +row[metric];
        });
        return album;
    });
}

// album_sales is given in thousands of units (3985 = 3.985M)
function formatSales(salesInThousands) {
    if (salesInThousands >= 1000) {
        return `${d3.format('.2~f')(salesInThousands / 1000)}M`;
    }
    return `${salesInThousands}K`;
}

// Colour legend: one list item per album, in ranking order
function createColorLegend(data, colorScale) {
    const items = d3.select('#legend .legend-color')
        .append('ul')
        .attr('class', 'legend-list')
        .selectAll('li')
        .data(data)
        .join('li');

    items.append('span')
        .attr('class', 'legend-circle')
        .style('background-color', d => colorScale(d.title));

    items.append('span')
        .text((d, i) => `${i + 1}. ${d.title}`);

    items.append('span')
        .attr('class', 'legend-artist')
        .text(d => d.artist);
}

// Size legend: reference circles for album sales, stacked top to bottom
function createSizeLegend(rScale) {
    const legendValues = [4000, 1000, 100];  // album sales, in thousands
    const rowGap = 14;
    const circleX = maxBubbleRadius;
    const lineEndX = circleX + maxBubbleRadius + 70;
    const legendWidth = lineEndX + 60;

    // Work out each circle's centre so the rows never overlap
    let y = 0;
    const rows = legendValues.map(value => {
        const r = rScale(value);
        const row = { value, r, cy: y + r };
        y += 2 * r + rowGap;
        return row;
    });
    const legendHeight = y - rowGap;

    const svg = d3.select('#legend .legend-area').append('svg')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .attr('viewBox', `0 0 ${legendWidth} ${legendHeight}`);

    const groups = svg.selectAll('g.size-item')
        .data(rows)
        .join('g')
        .attr('class', 'size-item')
        .attr('transform', d => `translate(0, ${d.cy})`);

    groups.append('circle')
        .attr('class', 'size-legend-circle')
        .attr('cx', circleX)
        .attr('r', d => d.r);

    groups.append('line')
        .attr('class', 'size-legend-line')
        .attr('x1', d => circleX + d.r + 6)
        .attr('x2', lineEndX);

    groups.append('text')
        .attr('class', 'label')
        .attr('x', lineEndX + 8)
        .attr('dy', '0.35em')
        .text(d => formatSales(d.value));
}

// Small HTML tooltip that follows the mouse over the bubbles
function createTooltip() {
    const tooltip = d3.select('body').append('div').attr('class', 'tooltip');

    return {
        show(event, album) {
            tooltip.html('');
            tooltip.append('div').attr('class', 'tooltip-title').text(album.title);
            tooltip.append('div').attr('class', 'tooltip-artist').text(album.artist);
            tooltip.append('div').text(`Audio streams: ${album.on_demand_audio_streams_billions.toFixed(2)}B`);
            tooltip.append('div').text(`Video streams: ${album.on_demand_video_streams_millions.toFixed(1)}M`);
            tooltip.append('div').text(`Album sales: ${formatSales(album.album_sales)}`);
            tooltip.style('opacity', 1);
            this.move(event);
        },
        move(event) {
            const offset = 14;
            const box = tooltip.node().getBoundingClientRect();
            // Flip to the left of the cursor when it would run off the right edge
            const x = event.clientX + offset + box.width > window.innerWidth
                ? event.pageX - offset - box.width
                : event.pageX + offset;
            tooltip.style('transform', `translate(${x}px, ${event.pageY + offset}px)`);
        },
        hide() {
            tooltip.style('opacity', 0);
        }
    };
}
