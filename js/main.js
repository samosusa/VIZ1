const topUSGenres = [
    {genre: "R&B/Hip-hop", audio_streaming_volume: 349.9},
    {genre: "Rock", audio_streaming_volume: 260.5},
    {genre: "Pop", audio_streaming_volume: 167.2},
    {genre: "Country", audio_streaming_volume: 122.5},
    {genre: "Latin", audio_streaming_volume: 120.9},
]

const audioStreamsByReleaseDecade = [
    {year: "1970s & earlier", audio_stream_pct: 2.7},
    {year: "1980s", audio_stream_pct: 3.3},
    {year: "1990s", audio_stream_pct: 6.4},
    {year: "2000s", audio_stream_pct: 11.1},
    {year: "2010s", audio_stream_pct: 28.5},
    {year: "2020s", audio_stream_pct: 47.9},
]

function main() {
    createBarChart(topUSGenres);
    createCircleChart(audioStreamsByReleaseDecade);

    d3.csv("./data/top_albums.csv")
        .then(data => {
            createBubbleChart(data);
        })
        .catch(error => {
            // Most often caused by opening index.html via file:// instead of a local server
            console.error(error);
            d3.select('#bubble-chart').append('p')
                .text('Could not load data/top_albums.csv. Open the page through a local web server (e.g. Live Server).');
        });
}
