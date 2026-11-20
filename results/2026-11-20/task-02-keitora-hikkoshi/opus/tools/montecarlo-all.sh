#!/bin/bash
# 3件 × 積み方（クリックで順に積む／＋ロープ）× 運転（丁寧・40km/h・全開）のランク分布を見る。
# 初期条件を SEED でわずかにずらして n 回ずつ走らせる（物理は初期条件に敏感なので、1回ではなく分布で見る）。
# 例: tools/montecarlo-all.sh 6
cd "$(dirname "$0")/.."
n=${1:-4}
for st in 1 2 3; do
  for load in click clickrope; do
    for mv in "pro 9" "cap 11" "full 14"; do
      m=${mv% *}; v=${mv#* }
      ranks=""; sum=0
      for seed in $(seq 0 $((n-1))); do
        out=$(SEED=$seed node tools/sim-test.js $st $v $load $m 2>&1 | grep -oE "profit -?[0-9]+ rank [A-Z]")
        p=$(echo "$out" | awk '{print $2}'); r=$(echo "$out" | awk '{print $4}')
        ranks="$ranks$r"; sum=$((sum + p))
      done
      printf "依頼%s %-9s %-4s 平均 %7d円  %s\n" "$st" "$load" "$m" $((sum / n)) "$ranks"
    done
  done
done
