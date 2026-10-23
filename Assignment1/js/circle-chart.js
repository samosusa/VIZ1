function createCircleChart(data) {
    const streamsByReleaseDecadeSection = d3.select('#release-by-decade');
    streamsByReleaseDecadeSection.append('h3').text('US on-demand audio streams, by release decade');

    const width = 550;
    const height = 130;
    const maxCircleRadius = 40;
    const labelY = 14;         // baseline of the percentage labels
    const headerOffset = 8;    // gap between the percentage labels and the largest circle
    const footerOffset = 20;   // gap between the largest circle and the decade labels
    const circleY = labelY + headerOffset + maxCircleRadius;        // centre of every circle
    const decadeLabelY = circleY + maxCircleRadius + footerOffset;

    const svg = streamsByReleaseDecadeSection.append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

    // Point scale: spreads the decades evenly, leaving room for the
    // wide first label on the left and the largest circle on the right
    const xScale = d3.scalePoint()
        .domain(data.map(d => d.year))
        .range([55, width - maxCircleRadius - 10]);

    // Square-root scale so circle AREA (not radius) is proportional to the share
    const rScale = d3.scaleSqrt()
        .domain([0, d3.max(data, d => d.audio_stream_pct)])
        .range([0, maxCircleRadius]);

    // Horizontal baseline through the circle centres (drawn first, so it sits behind them)
    svg.append('line')
        .attr('class', 'baseline')
        .attr('x1', 10)
        .attr('x2', width - 5)
        .attr('y1', circleY)
        .attr('y2', circleY);

    // One group per decade, moved into place with the point scale
    const decades = svg.selectAll('g.decade')
        .data(data)
        .join('g')
        .attr('class', 'decade')
        .attr('transform', d => `translate(${xScale(d.year)}, 0)`);

    decades.append('circle')
        .attr('class', 'decade-circle')
        .attr('cx', 0)
        .attr('cy', circleY)
        .attr('r', d => rScale(d.audio_stream_pct));

    // Percentage label above the circles
    decades.append('text')
        .attr('class', 'label')
        .attr('x', 0)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .text(d => `${d.audio_stream_pct.toFixed(1)}%`);

    // Decade label below the baseline
    decades.append('text')
        .attr('class', 'label')
        .attr('x', 0)
        .attr('y', decadeLabelY)
        .attr('text-anchor', 'middle')
        .text(d => d.year);
}
