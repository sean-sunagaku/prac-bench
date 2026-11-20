#!/bin/bash
# 初期条件をわずかにずらして何回か走らせ、結果のばらつきを見る
# 例: tools/montecarlo.sh 2 rope pro 6
cd "$(dirname "$0")/.."
st=${1:-1}; load=${2:-rope}; mode=${3:-pro}; n=${4:-5}; v=9; [ "$mode" = full ] && v=14
for seed in $(seq 0 $((n-1))); do
  SEED=$seed node tools/sim-test.js $st $v $load $mode 2>&1 | grep -E "^  profit" | sed "s/^/seed$seed /"
done
