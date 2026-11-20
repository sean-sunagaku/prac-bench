"""Typeset the end title and package the finished picture and score."""
import argparse
import json
from pathlib import Path
import subprocess
import unicodedata
import wave

from PIL import Image, ImageDraw, ImageFilter, ImageFont

WIDTH, HEIGHT = 1920, 816
FPS, FRAMES, SAMPLE_RATE = 24, 672, 48000


def tracking(draw, text, font, spacing, center_x, y, color):
    advance = [draw.textlength(char,font=font) for char in text]
    x = center_x-(sum(advance)+spacing*(len(text)-1))/2
    for char, width in zip(text,advance):
        draw.text((x,y),char,font=font,fill=color,anchor="lt")
        x += width+spacing


def typeset(path):
    fonts = Path("/System/Library/Fonts")
    japanese_path = next(p for p in fonts.glob("*.ttc") if
                         unicodedata.normalize("NFC",p.name).startswith("ヒラギノ明朝"))
    mincho = ImageFont.truetype(str(japanese_path),76,index=0)
    baskerville = ImageFont.truetype(str(fonts/"Supplemental"/"Baskerville.ttc"),22)
    text = Image.new("RGBA",(WIDTH,HEIGHT))
    draw = ImageDraw.Draw(text)
    tracking(draw,"夜明けの種",mincho,12,1228,92,(255,244,225,255))
    tracking(draw,"SEED OF DAWN",baskerville,6.7,1228,195,(255,239,215,239))
    shadow = Image.new("RGBA",text.size,(25,10,17,0))
    alpha = text.getchannel("A").filter(ImageFilter.GaussianBlur(8)).point(lambda p: round(p*.72))
    shadow.putalpha(alpha)
    layer = Image.new("RGBA",text.size)
    layer.alpha_composite(shadow,(1,3))
    layer.alpha_composite(text)
    layer.save(path)


def ffmpeg(*args):
    subprocess.run(["ffmpeg","-nostdin","-hide_banner","-loglevel","warning","-n",
                    *[str(arg) for arg in args]],check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("frames",type=Path)
    parser.add_argument("score",type=Path)
    parser.add_argument("output",type=Path)
    parser.add_argument("--title-only",action="store_true")
    args = parser.parse_args()
    if args.title_only:
        typeset(args.output)
        return
    expected = {f"{n:04d}.png" for n in range(1,FRAMES+1)}
    available = {p.name for p in args.frames.glob("*.png") if p.stat().st_size>0}
    missing = sorted(expected-available)
    if missing:
        raise SystemExit(f"{len(missing)} frames missing. First missing frame is {missing[0]}.")
    with wave.open(str(args.score),"rb") as score:
        assert score.getframerate()==SAMPLE_RATE and score.getnchannels()==2
        assert score.getnframes()*FPS==FRAMES*SAMPLE_RATE
    graphic = args.frames.parent / "title.png"
    typeset(graphic)
    picture = (
        "[0:v]format=rgb24,vignette=angle=PI/11[base];"
        "[1:v]format=rgba,fade=t=in:st=23.67:d=1.04:alpha=1,"
        "fade=t=out:st=27.22:d=0.63:alpha=1[card];"
        "[base][card]overlay=format=rgb:shortest=1,"
        "fade=t=out:st=27.25:d=0.71,"
        "scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv444p,"
        "colorspace=iall=bt709:itrc=srgb:irange=tv:all=bt709:range=tv:format=yuv420p[v]"
    )
    ffmpeg("-framerate",FPS,"-start_number",1,"-i",args.frames/"%04d.png",
           "-loop",1,"-framerate",FPS,"-i",graphic,"-i",args.score,
           "-filter_complex",picture,"-map","[v]","-map","2:a:0",
           "-c:v","libx264","-preset","slow","-crf",16,"-tune","film",
           "-profile:v","high","-pix_fmt","yuv420p",
           "-colorspace","bt709","-color_primaries","bt709","-color_trc","bt709",
           "-c:a","aac","-b:a","256k","-ar",SAMPLE_RATE,
           "-movflags","+faststart","-metadata","title=夜明けの種 / Seed of Dawn",args.output)
    movie = subprocess.run(["ffprobe","-v","error","-show_streams","-of","json",str(args.output)],
                           capture_output=True,text=True,check=True)
    video,audio = json.loads(movie.stdout)["streams"]
    assert int(video["nb_frames"])==FRAMES and video["avg_frame_rate"]=="24/1"
    assert abs(float(audio["duration"])-FRAMES/FPS)<.025
    assert (video["width"],video["height"])==(WIDTH,HEIGHT)


if __name__ == "__main__":
    main()
