import {AbsoluteFill, Series, Sequence, staticFile, useVideoConfig, useCurrentFrame, interpolate} from "remotion";
import {Audio, Video} from "@remotion/media";
import {OpeningTitle, EndCredits} from "./Titles";

const Plate = ({file}: {file: string}) => {
  const {fps} = useVideoConfig();
  return (
    <Video
      src={staticFile(`footage/${file}`)}
      premountFor={fps}
      muted
      objectFit="cover"
      style={{width: "100%", height: "100%", position: "absolute", inset: 0}}
    />
  );
};

const FilmFade = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 2660, 2687], [0.41, 0, 0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{backgroundColor: "#101927", opacity}} />;
};

export const Film = () => {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{backgroundColor: "#111a27"}}>
      <Series>
      <Series.Sequence name="夜の灯台" durationInFrames={144} premountFor={fps}>
        <Plate file="01-coast.mp4" />
      </Series.Sequence>
      <Series.Sequence name="灯りがまわる" durationInFrames={48} premountFor={fps}>
        <Plate file="02-lens.mp4" />
      </Series.Sequence>
      <Series.Sequence name="真鍮のキー" durationInFrames={60} premountFor={fps}>
        <Plate file="03-keeper.mp4" />
      </Series.Sequence>
      <Series.Sequence name="三度打つ" durationInFrames={36} premountFor={fps}>
        <Plate file="04-key.mp4" />
      </Series.Sequence>
      <Series.Sequence name="欠けたカップ" durationInFrames={96} premountFor={fps}>
        <Plate file="05-cup.mp4" />
      </Series.Sequence>
      <Series.Sequence name="返事を待つ" durationInFrames={84} premountFor={fps}>
        <Plate file="06-keeper.mp4" />
      </Series.Sequence>
      <Series.Sequence name="波も息を止める" durationInFrames={108} premountFor={fps}>
        <Plate file="07-coast.mp4" />
      </Series.Sequence>
      <Series.Sequence name="最初の一滴" durationInFrames={84} premountFor={fps}>
        <Plate file="08-drop.mp4" />
      </Series.Sequence>
      <Series.Sequence name="レンズの内側" durationInFrames={36} premountFor={fps}>
        <Plate file="09-lens.mp4" />
      </Series.Sequence>
      <Series.Sequence name="星のほうへ" durationInFrames={54} premountFor={fps}>
        <Plate file="10-drop.mp4" />
      </Series.Sequence>
      <Series.Sequence name="接点" durationInFrames={18} premountFor={fps}>
        <Plate file="11-key.mp4" />
      </Series.Sequence>
      <Series.Sequence name="海は上へ落ちる" durationInFrames={96} premountFor={fps}>
        <Plate file="12-rising.mp4" />
      </Series.Sequence>
      <Series.Sequence name="月を打つ" durationInFrames={96} premountFor={fps}>
        <Plate file="13-whale.mp4" />
      </Series.Sequence>
      <Series.Sequence name="ただいまを" durationInFrames={96} premountFor={fps}>
        <Plate file="14-balcony.mp4" />
      </Series.Sequence>
      <Series.Sequence name="最初の飛翔" durationInFrames={96} premountFor={fps}>
        <Plate file="15-sky.mp4" />
      </Series.Sequence>
      <Series.Sequence name="青の群れ" durationInFrames={96} premountFor={fps}>
        <Plate file="16-shoal.mp4" />
      </Series.Sequence>
      <Series.Sequence name="光の屈折" durationInFrames={36} premountFor={fps}>
        <Plate file="17-lens.mp4" />
      </Series.Sequence>
      <Series.Sequence name="魚の背を抜ける" durationInFrames={60} premountFor={fps}>
        <Plate file="18-shoal.mp4" />
      </Series.Sequence>
      <Series.Sequence name="瞳のなか" durationInFrames={96} premountFor={fps}>
        <Plate file="19-eye.mp4" />
      </Series.Sequence>
      <Series.Sequence name="灯の向こう" durationInFrames={96} premountFor={fps}>
        <Plate file="20-keeper.mp4" />
      </Series.Sequence>
      <Series.Sequence name="待っていたのは" durationInFrames={96} premountFor={fps}>
        <Plate file="21-balcony.mp4" />
      </Series.Sequence>
      <Series.Sequence name="私のいる灯" durationInFrames={96} premountFor={fps}>
        <Plate file="22-eye.mp4" />
      </Series.Sequence>
      <Series.Sequence name="もう一度" durationInFrames={60} premountFor={fps}>
        <Plate file="23-key.mp4" />
      </Series.Sequence>
      <Series.Sequence name="潮の逆流" durationInFrames={36} premountFor={fps}>
        <Plate file="24-rising.mp4" />
      </Series.Sequence>
      <Series.Sequence name="ひとつ" durationInFrames={24} premountFor={fps}>
        <Plate file="25-key.mp4" />
      </Series.Sequence>
      <Series.Sequence name="ふたつ" durationInFrames={30} premountFor={fps}>
        <Plate file="26-lens.mp4" />
      </Series.Sequence>
      <Series.Sequence name="みっつ" durationInFrames={42} premountFor={fps}>
        <Plate file="27-drop.mp4" />
      </Series.Sequence>
      <Series.Sequence name="親子の飛翔" durationInFrames={96} premountFor={fps}>
        <Plate file="28-sky.mp4" />
      </Series.Sequence>
      <Series.Sequence name="ふたつの尾びれ" durationInFrames={96} premountFor={fps}>
        <Plate file="29-return.mp4" />
      </Series.Sequence>
      <Series.Sequence name="追いかける子鯨" durationInFrames={96} premountFor={fps}>
        <Plate file="30-sky.mp4" />
      </Series.Sequence>
      <Series.Sequence name="届いた返事" durationInFrames={48} premountFor={fps}>
        <Plate file="31-eye.mp4" />
      </Series.Sequence>
      <Series.Sequence name="おかえりが響く" durationInFrames={48} premountFor={fps}>
        <Plate file="32-balcony.mp4" />
      </Series.Sequence>
      <Series.Sequence name="朝焼け" durationInFrames={96} premountFor={fps}>
        <Plate file="33-return.mp4" />
      </Series.Sequence>
      <Series.Sequence name="帰るふたり" durationInFrames={96} premountFor={fps}>
        <Plate file="34-sky.mp4" />
      </Series.Sequence>
      <Series.Sequence name="リボンの余韻" durationInFrames={192} premountFor={fps}>
        <Plate file="35-dawn.mp4" />
      </Series.Sequence>
      </Series>
      <Sequence name="タイトル" durationInFrames={144} premountFor={fps}>
        <OpeningTitle />
      </Sequence>
      <Sequence name="クレジット" from={2496} durationInFrames={192} premountFor={fps}>
        <EndCredits />
      </Sequence>
      <FilmFade />
      <Audio name="海は上へ落ちる" src={staticFile("theme.wav")} premountFor={fps} />
    </AbsoluteFill>
  );
};

