#!/usr/bin/env node
/* 3ステージ × 積み方 × 運転スタイルで、結果をまとめて見る
 *   node tools/balance.js [loads=click,clickrope]   （auto / rope / smart も指定できる）
 */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const modes = [['pro', 9], ['cap', 11], ['full', 14]];
const loads = (process.argv[2] || 'click,clickrope').split(',');
for (const st of [1, 2, 3]) {
  for (const load of loads) for (const [mode, v] of modes) {
    const out = execFileSync('node', [path.join(__dirname, 'sim-test.js'), String(st), String(v), load, mode], { env: process.env }).toString();
    const time = (out.match(/time=([\d.]+)s/) || [])[1];
    const counts = JSON.parse((out.match(/counts (\{.*\})/) || [])[1] || '{}');
    const profit = (out.match(/profit (-?\d+) rank (\w)/) || []);
    const placed = (out.match(/placed (\d+\/\d+)/) || [])[1];
    const resc = (out.match(/rescues=(\d+)/) || [])[1];
    console.log(`st${st} ${load.padEnd(9)} ${mode.padEnd(4)} v${String(v).padEnd(3)} placed ${placed} t=${String(time).padStart(5)} ok=${counts.ok} dmg=${counts.damaged} brk=${counts.broken} fall=${counts.fallen} left=${counts.left} resc=${resc} profit=${String(profit[1]).padStart(7)} ${profit[2]}`);
  }
}
