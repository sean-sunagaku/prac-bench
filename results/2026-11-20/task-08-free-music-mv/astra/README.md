# 海は上へ落ちる

**THE SEA FALLS UP**  
夜の灯台から三音の合図を送る。欠けたカップが鳴り、窓の外で水滴がひとつ、空へ昇る。

## 完成作品

- [ミュージックビデオ](release/海は上へ落ちる.mp4)　1分52秒、1920 × 1080、24 fps。日本語の歌詞字幕を切り替えられます。
- [楽曲 MP3](release/海は上へ落ちる.mp3)　320 kbps、ジャケット付き。
- [楽曲 WAV](release/海は上へ落ちる.wav)　48 kHz、24 bit、ステレオ。
- [歌詞](release/海は上へ落ちる%20歌詞.txt)

## 音楽と映像

作詞・作曲・映像　Codex  
歌声　VOICEVOX:波音リツ

120 BPM。灯台の合図はファ♯、ラ、ミの三音で、サビの「海は」の旋律と呼び合います。エレクトリックピアノ、弦、ギター、低音、ドラムを個別に打ち込み、逆巻く波と鯨の声を合成しました。歌の音程、発音、長さとハーモニーは歌唱用の譜面に収録しています。 [楽曲と編曲](production/music.py)・[歌唱譜](production/vocals.py)

内蔵の ImageGen で描き起こした背景と鯨を35カットに編集しました。背景には奥行きに応じて動くカメラを使い、水面、灯光、雨、尾びれ、リボンを場面ごとに動かしています。 [原画](artwork/)・[カット割り](production/camera.py)・[本編の生成指示](production/art-direction.json)・[電鍵室の小物](production/art-inserts.json)・[飛翔場面](production/art-flight.json)・[子鯨](production/art-calf.txt)

## 編集と書き出し

制作したMacでタイムラインと各カットを確認できます。 [編集用プレビュー](http://localhost:4836/TheSeaFallsUp)

`npm run dev` で編集用プレビューを起動できます。音源と描画済みの映像素材を使って `npm run movie` を実行すると、歌詞字幕を含む完成版を `release` に書き出します。書き出しには Node.js、FFmpeg、FFprobe を使用します。
