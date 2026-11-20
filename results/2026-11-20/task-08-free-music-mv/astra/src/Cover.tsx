import {AbsoluteFill, Img, staticFile} from "remotion";

export const Cover = () => (
  <AbsoluteFill style={{background: "#14283d", color: "#fff2d9"}}>
    <Img src={staticFile("art/drop.png")} style={{
      position: "absolute", inset: 0, width: "100%", height: "100%",
      objectFit: "cover", objectPosition: "50% 50%",
    }} />
    <AbsoluteFill style={{background: "linear-gradient(0deg, rgba(9,23,35,.77), transparent 49%)"}} />
    <div style={{position: "absolute", bottom: 85, insetInline: 38, textAlign: "center"}}>
      <div style={{fontFamily: '"Hiragino Mincho ProN", serif', fontSize: 99, fontWeight: 600, letterSpacing: 6}}>海は上へ落ちる</div>
      <div style={{fontFamily: 'Baskerville, "Times New Roman", serif', marginTop: 13, fontSize: 30, letterSpacing: 8}}>THE SEA FALLS UP</div>
    </div>
  </AbsoluteFill>
);
