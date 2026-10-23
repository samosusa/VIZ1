function createBarChart(data) {
    const width = 500;
    const barHeight = 20;
    const barSpacing = 5;
    const labelWidth = 100;      // room for the genre names, left of the reference line
    const labelOffset = 8;       // gap between line and bars, and between a bar and its value label
    const valueLabelWidth = 50;  // room kept free right of the longest bar for its value label
    const lineX = labelWidth;
    const height = data.length * (barHeight + barSpacing) - barSpacing;

    const topGenresSection = d3.select('#top-genres');
    topGenresSection.append('h3').text('Top US genres, by US on-demand audio streams');

    const svg = topGenresSection.append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

    // Bars start just right of the reference line
    const barX = lineX + labelOffset;
    const maxBarWidth = width - barX - labelOffset - valueLabelWidth;

    // Linear scale: streaming volume (billions) -> bar width (px)
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.audio_streaming_volume)])
        .range([0, maxBarWidth]);

    // Vertical position of row i
    const rowY = (d, i) => i * (barHeight + barSpacing);

    // One rectangle per genre
    svg.selectAll('rect.bar')
        .data(data)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', barX)
        .attr('y', rowY)
        .attr('width', d => xScale(d.audio_streaming_volume))
        .attr('height', barHeight);

    // Genre labels on the left
    svg.selectAll('text.genre-label')
        .data(data)
        .join('text')
        .attr('class', 'label genre-label')
        .attr('x', 0)
        .attr('y', (d, i) => rowY(d, i) + barHeight / 2)
        .attr('dy', '0.35em')
        .text(d => d.genre);

    // Value labels at the end of each bar
    svg.selectAll('text.value-label')
        .data(data)
        .join('text')
        .attr('class', 'label value-label')
        .attr('x', d => barX + xScale(d.audio_streaming_volume) + labelOffset)
        .attr('y', (d, i) => rowY(d, i) + barHeight / 2)
        .attr('dy', '0.35em')
        .text(d => `${d.audio_streaming_volume.toFixed(1)}B`);

    // Vertical reference line separating the labels from the bars
    svg.append('line')
        .attr('class', 'reference-line')
        .attr('x1', lineX)
        .attr('x2', lineX)
        .attr('y1', 0)
        .attr('y2', height);
}
