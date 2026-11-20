import {spawnSync} from "node:child_process";
import {mkdtempSync, renameSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const release = join(root, "release");
const title = "海は上へ落ちる";
const scratch = mkdtempSync(join(tmpdir(), "umi-film-"));
const picture = join(scratch, "picture.mp4");
const staged = join(release, `.umi-${process.pid}.mp4`);

function run(binary, args, capture = false) {
  const result = spawnSync(binary, args, {
    cwd: root, stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit", encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} failed with status ${result.status}`);
  return result.stdout;
}

try {
  run(process.execPath, [
    join(root, "node_modules/@remotion/cli/remotion-cli.js"), "render", "TheSeaFallsUp", picture,
    "--codec=h264", "--crf=17", "--x264-preset=fast", "--jpeg-quality=94", "--concurrency=4", "--muted",
  ]);
  run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", picture, "-i", join(release, title+".wav"),
    "-i", join(release, title+".srt"), "-map", "0:v:0", "-map", "1:a:0", "-map", "2:s:0",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-c:s", "mov_text",
    "-metadata", "title="+title, "-metadata", "artist=Codex / VOICEVOX:波音リツ",
    "-metadata:s:a:0", "language=jpn", "-metadata:s:s:0", "language=jpn",
    "-metadata:s:s:0", "handler_name=日本語歌詞", "-disposition:s:0", "0",
    "-movflags", "+faststart", staged,
  ]);
  const {streams} = JSON.parse(run("ffprobe", [
    "-v", "error", "-show_streams", "-of", "json", staged,
  ], true));
  const video = streams.find((s) => s.codec_type === "video");
  const audio = streams.find((s) => s.codec_type === "audio");
  const lyrics = streams.find((s) => s.codec_type === "subtitle");
  if (video?.nb_frames !== "2688" || video.width !== 1920 || video.height !== 1080 ||
      Number(audio?.duration) !== 112 || audio.channels !== 2 || lyrics?.tags?.language !== "jpn") {
    throw new Error("Unexpected picture, audio, or lyric track in the export");
  }
  renameSync(staged, join(release, title+".mp4"));
  console.log(`\n${join(release,title+".mp4")}`);
} finally {
  rmSync(staged, {force: true});
  rmSync(scratch, {recursive: true, force: true});
}
