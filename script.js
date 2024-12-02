<!DOCTYPE html>
<html>
<head>
   <meta charset="utf-8">
   <title>台灣棒球選手數據</title>
   <style>
       .controls {
           margin: 20px;
           display: flex;
           gap: 20px;
       }
       .tabs, .sort-options {
           display: flex;
           gap: 8px;
       }
       .tab, .sort {
           padding: 8px 16px;
           border: none;
           border-radius: 4px;
           background: #e5e7eb;
           cursor: pointer;
       }
       .tab.active, .sort.active {
           background: #60a5fa;
           color: white;
       }
   </style>
   <script src="https://d3js.org/d3.v7.min.js"></script>
</head>
<body>
   <div class="controls">
       <div class="tabs">
           <button class="tab active" data-metric="games">出賽數</button>
           <button class="tab" data-metric="avg">打擊率</button>
           <button class="tab" data-metric="runs">得分</button>
           <button class="tab" data-metric="ops">整體攻擊指數</button>
           <button class="tab" data-metric="obp">上壘率</button>
       </div>
       <div class="sort-options">
           <button class="sort active" data-sort="firstGame">最早出賽</button>
           <button class="sort" data-sort="birth">出生年</button>
           <button class="sort" data-sort="debut">出道年</button>
       </div>
   </div>
   <div id="visualization"></div>
   <script>
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

       // 創建SVG
       svg = d3.select('#visualization')
           .append('svg')
           .attr('width', width + margin.left + margin.right)
           .attr('height', height + margin.top + margin.bottom)
           .append('g')
           .attr('transform', `translate(${margin.left},${margin.top})`);

       // 建立比例尺
       xScale = d3.scaleLinear()
           .domain([1990, 2024])
           .range([0, width]);

       yScale = d3.scalePoint()
           .range([0, height])
           .padding(1);

       function updateSort(sortType) {
           currentSort = sortType;
           const getLabel = (player) => {
               switch(sortType) {
                   case 'birth':
                       return `${player.birthYear}年 ${player.name}`;
                   case 'debut':
                       return `${player.debutYear}年 ${player.name}`;
                   default:
                       return player.name;
               }
           };

           players.sort((a, b) => {
               switch(sortType) {
                   case 'birth':
                       return a.birthYear - b.birthYear;
                   case 'debut':
                       return a.debutYear - b.debutYear;
                   default:
                       if (a.firstYear !== b.firstYear) {
                           return a.firstYear - b.firstYear;
                       }
                       const aStartsInFirst = a.games.find(g => g.year === a.firstYear)?.level === "一軍";
                       const bStartsInFirst = b.games.find(g => g.year === b.firstYear)?.level === "一軍";
                       return (aStartsInFirst === bStartsInFirst) ? 0 : aStartsInFirst ? -1 : 1;
               }
           });

           yScale.domain(players.map(d => getLabel(d)));
           
           updateVisualization();
       }

       function updateVisualization() {
           // 更新X軸格線
           const xAxis = svg.selectAll('g.x-axis')
               .data(xScale.ticks())
               .join('g')
               .attr('class', 'x-axis')
               .attr('transform', d => `translate(${xScale(d)},0)`);

           xAxis.selectAll('line')
               .data(d => [d])
               .join('line')
               .attr('y2', height)
               .attr('stroke', '#e5e7eb')
               .attr('stroke-dasharray', '4,4');

           xAxis.selectAll('text')
               .data(d => [d])
               .join('text')
               .attr('y', -10)
               .attr('text-anchor', 'middle')
               .attr('class', 'text-sm')
               .attr('fill', '#666')
               .text(d => d);

           // 更新玩家群組
           const playerGroups = svg.selectAll('g.player')
               .data(players, d => d.name)
               .join('g')
               .attr('class', 'player');

           // 更新名字標籤
           playerGroups.selectAll('text')
               .data(d => [d])
               .join('text')
               .attr('x', -10)
               .attr('y', d => yScale(getLabel(d)))
               .attr('text-anchor', 'end')
               .attr('dominant-baseline', 'middle')
               .attr('class', 'text-sm')
               .text(d => getLabel(d));

           // 更新水平線
           playerGroups.selectAll('line')
               .data(d => [d])
               .join('line')
               .attr('x1', 0)
               .attr('x2', width)
               .attr('y1', d => yScale(getLabel(d)))
               .attr('y2', d => yScale(getLabel(d)))
               .attr('stroke', '#e5e7eb')
               .attr('stroke-width', 0.5);

           // 更新圓圈
           playerGroups.each(function(player) {
               d3.select(this)
                   .selectAll('circle')
                   .data(player.games)
                   .join('circle')
                   .transition()
                   .duration(500)
                   .attr('cx', d => xScale(d.year))
                   .attr('cy', d => yScale(getLabel(player)))
                   .attr('r', d => metricScales[currentMetric].scale(d[currentMetric]))
                   .attr('fill', d => d.level === "一軍" ? "#60a5fa" : "#f87171")
                   .attr('opacity', 0.6);
           });
       }

       // 初始化圖例
       const legend = svg.append('g')
           .attr('transform', `translate(${width - 150}, ${-30})`);

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

       // 監聽事件
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

       // 初始化視覺化
       updateSort('firstGame');

       // 縮放功能
       const zoom = d3.zoom()
           .scaleExtent([0.5, 5])
           .on('zoom', (event) => {
               svg.attr('transform', event.transform);
           });

       d3.select('svg').call(zoom);
   });

   function getLabel(player) {
       switch(currentSort) {
           case 'birth':
               return `${player.birthYear}年 ${player.name}`;
           case 'debut':
               return `${player.debutYear}年 ${player.name}`;
           default:
               return player.name;
       }
   }
   </script>
</body>
</html>
