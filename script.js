// 設定圖表尺寸和邊距
const margin = { top: 40, right: 40, bottom: 40, left: 200 };
const width = 1200 - margin.left - margin.right;

d3.json('./data/games.json').then(function(rawData) {
   // 資料處理
   const processData = () => {
       let players = {};
       let allGames = rawData[0].games;

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

       return Object.values(players)
           .sort((a, b) => {
               if (a.firstYear !== b.firstYear) {
                   return a.firstYear - b.firstYear;
               }
               const aStartsInFirst = a.games.find(g => g.year === a.firstYear)?.level === "一軍";
               const bStartsInFirst = b.games.find(g => g.year === b.firstYear)?.level === "一軍";
               if (aStartsInFirst && !bStartsInFirst) return -1;
               if (!aStartsInFirst && bStartsInFirst) return 1;
               return 0;
           });
   };

   const players = processData();
   
   // 調整高度，每個選手分配30px空間
   const height = players.length * 30;

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
       .padding(1);

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
           .append('title')
           .text(d => `${d.year}年 ${d.level} ${d.games}場`);
   });

   // 加入圖例
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

   // 加入互動功能：滾動縮放
   const zoom = d3.zoom()
       .scaleExtent([0.5, 5])
       .on('zoom', (event) => {
           svg.attr('transform', event.transform);
       });

   d3.select('svg').call(zoom);
});
