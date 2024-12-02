// 設定圖表尺寸和邊距
const margin = { top: 40, right: 40, bottom: 40, left: 200 };
const width = 1200 - margin.left - margin.right;
const height = 3000 - margin.top - margin.bottom;  // 高度可依據資料量調整

d3.json('data/games.json').then(function(rawData) {
    // 資料處理
    const processData = () => {
        let players = {};
        let allGames = rawData[0].games;

        // 依照選手分組並記錄最早出賽年
        allGames.forEach(game => {
            if (!players[game.player]) {
                players[game.player] = {
                    name: game.player,
                    firstYear: game.year,
                    games: []
                };
            }
            players[game.player].games.push(game);
        });

        // 轉換成陣列並依最早出賽年排序
        return Object.values(players)
            .sort((a, b) => a.firstYear - b.firstYear);
    };

    const players = processData();

    // 建立SVG
    const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // 建立比例尺
    const xScale = d3.scaleLinear()
        .domain([1990, 2024])
        .range([0, width]);

    const yScale = d3.scalePoint()
        .domain(players.map(d => d.name))
        .range([0, height])
        .padding(0.5);

    const radiusScale = d3.scaleSqrt()
        .domain([0, 300])
        .range([2, 15]);

    // 繪製X軸格線和年份標籤
    svg.selectAll('g.x-axis')
        .data(xScale.ticks())
        .join('g')
        .attr('class', 'x-axis')
        .attr('transform', d => `translate(${xScale(d)},0)`)
        .call(g => {
            g.append('line')
                .attr('y2', height)
                .attr('stroke', '#e5e7eb')
                .attr('stroke-dasharray', '4,4');
            
            g.append('text')
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .attr('class', 'text-sm')
                .attr('fill', '#666')
                .text(d => d);
        });

    // 為每個選手繪製一個group
    const playerGroups = svg.selectAll('g.player')
        .data(players)
        .join('g')
        .attr('class', 'player');

    // 繪製選手名稱
    playerGroups.append('text')
        .attr('x', -10)
        .attr('y', d => yScale(d.name))
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('class', 'text-sm')
        .text(d => d.name);

    // 繪製水平參考線
    playerGroups.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', d => yScale(d.name))
        .attr('y2', d => yScale(d.name))
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 0.5);

    // 繪製出賽記錄圓圈
    playerGroups.each(function(player) {
        d3.select(this)
            .selectAll('circle')
            .data(player.games)
            .join('circle')
            .attr('cx', d => xScale(d.year))
            .attr('cy', d => yScale(player.name))
            .attr('r', d => radiusScale(d.games))
            .attr('fill', d => d.level === "一軍" ? "#60a5fa" : "#f87171")
            .attr('opacity', 0.6)
            .append('title')  // 加入滑鼠懸停提示
            .text(d => `${d.year}年 ${d.level} ${d.games}場`);
    });

    // 加入圖例
    const legend = svg.append('g')
        .attr('transform', `translate(${width - 150}, ${-30})`);

    // 一軍圖例
    legend.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 6)
        .attr('fill', '#60a5fa')
        .attr('opacity', 0.6);

    legend.append('text')
        .attr('x', 15)
        .attr('y', 0)
        .attr('dominant-baseline', 'middle')
        .attr('class', 'text-sm')
        .text('一軍');

    // 二軍圖例
    legend.append('circle')
        .attr('cx', 70)
        .attr('cy', 0)
        .attr('r', 6)
        .attr('fill', '#f87171')
        .attr('opacity', 0.6);

    legend.append('text')
        .attr('x', 85)
        .attr('y', 0)
        .attr('dominant-baseline', 'middle')
        .attr('class', 'text-sm')
        .text('二軍');

    // 加入互動功能：滾動縮放
    const zoom = d3.zoom()
        .scaleExtent([0.5, 5])
        .on('zoom', (event) => {
            svg.attr('transform', event.transform);
        });

    d3.select('svg').call(zoom);
});
