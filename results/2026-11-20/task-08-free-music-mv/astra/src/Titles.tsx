import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";

const japaneseSerif = '"Hiragino Mincho ProN", "YuMincho", serif';
const englishSerif = 'Baskerville, "Times New Roman", serif';
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export const OpeningTitle = () => {
  const frame = useCurrentFrame();
  const visibility = interpolate(frame, [0, 8, 24, 114, 140], [0, 0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: visibility}}>
      <AbsoluteFill style={{background: "linear-gradient(95deg, rgba(10,22,42,0.30), transparent 62%)"}} />
      <div style={{position: "absolute", left: 135, top: 326, color: "#fff4d9", whiteSpace: "nowrap"}}>
        <div style={{display: "flex", gap: 8, alignItems: "baseline", fontFamily: japaneseSerif, fontWeight: 600, lineHeight: 1.18, textShadow: "0 3px 18px rgba(9,21,34,.30)"}}>
          {Array.from("海は上へ落ちる").map((glyph, i) => {
            const phase = interpolate(frame, [8 + 1.6*i, 28 + 1.6*i], [0, 1], clamp);
            const small = glyph === "は" || glyph === "へ";
            return (
              <span key={glyph} style={{
                fontSize: small ? 79 : 104, opacity: phase,
                translate: `0 ${(1-phase) * (i % 2 === 0 ? 16 : 10)}px`,
              }}>{glyph}</span>
            );
          })}
        </div>
        <div style={{
          marginTop: 20, paddingLeft: 8, fontFamily: englishSerif, fontSize: 32, fontWeight: 400,
          letterSpacing: 8, color: "#ffeac6", opacity: interpolate(frame, [21, 44], [0, 1], clamp),
        }}>THE SEA FALLS UP</div>
      </div>
    </AbsoluteFill>
  );
};

export const EndCredits = () => {
  const frame = useCurrentFrame();
  const visibility = interpolate(frame, [24, 49, 155, 183], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: visibility}}>
      <div style={{
        position: "absolute", left: 1038, top: 285, width: 748, padding: "25px 0",
        fontFamily: japaneseSerif, color: "#263142", textAlign: "left",
        textShadow: "0 0 14px rgba(255,237,202,0.80)", lineHeight: 1.8,
      }}>
        <div style={{fontSize: 43, letterSpacing: 4.5, fontWeight: 600}}>作詞・作曲・映像<span style={{marginLeft: 26}}>Codex</span></div>
        <div style={{fontSize: 35, letterSpacing: 2.3, fontWeight: 600}}>歌声<span style={{marginLeft: 22}}>VOICEVOX:波音リツ</span></div>
      </div>
    </AbsoluteFill>
  );
};
