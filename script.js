const margin = { top: 40, right: 40, bottom: 40, left: 200 };
const width = 1200 - margin.left - margin.right;

const metricScales = {
    games: {
        scale: d3.scaleSqrt().domain([0, 300]).range([2, 15]),
        format: d => d
    },
    avg: {
        scale: d3.scaleSqrt().domain([0, 0.5]).range([2, 15]),
        format: d => d.toFixed(3)
    },
    runs: {
        scale: d3.scaleSqrt().domain([0, 150]).range([2, 15]),
        format: d => d
    },
    ops: {
        scale: d3.scaleSqrt().domain([0, 1.5]).range([2, 15]),
        format: d => d.toFixed(3)
    },
    obp: {
        scale: d3.scaleSqrt().domain([0, 0.5]).range([2, 15]),
        format: d => d.toFixed(3)
    }
};

let currentMetric = 'games';
let currentSort = 'firstGame';
let players = [];
let svg, xScale, yScale;

d3.json('./data/games.json').then(function(rawData) {
    const processData = () => {
        let playersMap = {};
        let allGames = rawData[0].games;

        allGames.forEach(game => {
            if (!playersMap[game.player]) {
                playersMap[game.player] = {
                    name: game.player,
                    firstYear: game.year,
                    birthYear: game.birthYear,
                    debutYear: game.debutYear,
                    games: []
                };
            }
            playersMap[game.player].games.push(game);
        });

        return Object.values(playersMap);
    };

    players = processData();
    const height = players.length * 30;

    svg = d3.select('#visualization')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    xScale = d3.scaleLinear()
        .domain([1990, 2024])
        .range([0, width]);

    yScale = d3.scalePoint()
        .range([0, height])
        .padding(1);

    // 在數據載入完成後再綁定按鈕事件
    bindButtonEvents();

    // 初始排序
    updateSort('firstGame');
});

// 新增 adjustSVGHeight 函數
function adjustSVGHeight() {
    const height = players.length * 30;
    d3.select('#visualization svg')
        .attr('height', height + margin.top + margin.bottom);

    yScale.range([0, height]);
}

// 更新 updateSort 函數
function updateSort(sortType) {
    currentSort = sortType;

    // 函數：檢查是否為有效的年份
    const getSortValue = (value) => {
        if (typeof value === 'number' && !isNaN(value)) {
            return value;
        } else if (typeof value === 'string' && value.trim() !== '') {
            // 嘗試將有效的字串轉換為數字
            const numValue = Number(value);
            return isNaN(numValue) ? Infinity : numValue;
        } else {
            // 對於空白、undefined、NaN 的情況返回 Infinity
            return Infinity;
        }
    };

    // 排序邏輯
    players.sort((a, b) => {
        switch (sortType) {
            case 'birth':
                return getSortValue(a.birthYear) - getSortValue(b.birthYear);
            case 'debut':
                return getSortValue(a.debutYear) - getSortValue(b.debutYear);
            default:
                if (a.firstYear !== b.firstYear) {
                    return getSortValue(a.firstYear) - getSortValue(b.firstYear);
                }
                // 判斷一軍的先後順序
                const aStartsInFirst = a.games.find(g => g.year === a.firstYear)?.level === "一軍";
                const bStartsInFirst = b.games.find(g => g.year === b.firstYear)?.level === "一軍";
                return (aStartsInFirst === bStartsInFirst) ? 0 : aStartsInFirst ? -1 : 1;
        }
    });

    // 更新 y 軸標籤
    yScale.domain(players.map(d => getLabel(d)));

    // 更新圖表
    updateVisualization();
}

// 更新 updateVisualization 函數
function updateVisualization() {
    adjustSVGHeight(); // 每次更新視覺化時都重新調整高度

    const height = players.length * 30;

    const xAxis = svg.selectAll('g.x-axis')
        .data(xScale.ticks())
        .join('g')
        .attr('class', 'x-axis')
        .attr('transform', d => `translate(${xScale(d)},0)`);

    xAxis.selectAll('line')
        .data(d => [d])
        .join(
            enter => enter.append('line')
                .attr('y2', height)
                .attr('stroke', '#e5e7eb')
                .attr('stroke-dasharray', '4,4'),
            update => update,
            exit => exit.remove()
        );

    xAxis.selectAll('text')
        .data(d => [d])
        .join(
            enter => enter.append('text')
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .attr('class', 'text-sm')
                .attr('fill', '#666')
                .text(d => d),
            update => update,
            exit => exit.remove()
        );

    const playerGroups = svg.selectAll('g.player')
        .data(players, d => d.name)
        .join('g')
        .attr('class', 'player');

    playerGroups.selectAll('text')
        .data(d => [d])
        .join(
            enter => enter.append('text')
                .attr('x', -10)
                .attr('text-anchor', 'end')
                .attr('dominant-baseline', 'middle')
                .attr('class', 'text-sm'),
            update => update,
            exit => exit.remove()
        )
        .attr('y', d => yScale(getLabel(d)))
        .text(d => getLabel(d));

    playerGroups.each(function(player) {
        d3.select(this)
            .selectAll('circle')
            .data(player.games)
            .join(
                enter => enter.append('circle')
                    .attr('opacity', 0.6),
                update => update.transition().duration(500),
                exit => exit.remove()
            )
            .attr('cx', d => xScale(d.year))
            .attr('cy', d => yScale(getLabel(player)))
            .attr('r', d => metricScales[currentMetric].scale(d[currentMetric]))
            .attr('fill', d => d.level === "一軍" ? "#60a5fa" : "#f87171");
    });
}

// 新增 bindButtonEvents 函數來綁定按鈕事件
function bindButtonEvents() {
    d3.selectAll('.tab').on('click', function() {
        d3.selectAll('.tab').classed('active', false);
        d3.select(this).classed('active', true);
        currentMetric = this.dataset.metric;
        updateVisualization();
    });

    d3.selectAll('.sort').on('click', function() {
        d3.selectAll('.sort').classed('active', false);
        d3.select(this).classed('active', true);
        updateSort(this.dataset.sort);
    });
}

function getLabel(player) {
    switch (currentSort) {
        case 'birth':
            return `${player.birthYear}年 ${player.name}`;
        case 'debut':
            return `${player.debutYear}年 ${player.name}`;
        default:
            return player.name;
    }
}
