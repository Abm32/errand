#!/usr/bin/env bash
# Build the Gofer video audio: OpenAI TTS narration + ffmpeg SFX + pad, mixed to
# one 41s master track. Run from anywhere; paths are absolute.
set -euo pipefail

OUT=/home/abhimanyu/Desktop/digital_agency/devpost/paypal/video/public/audio
VO=$OUT/vo
SFX=$OUT/sfx
mkdir -p "$VO" "$SFX"

# --- 1. Narration (Piper, offline neural TTS) ------------------------------
MODEL=/tmp/claude-1000/-home-abhimanyu-Desktop-digital-agency-devpost-paypal/c6a49937-3fcf-4c90-9a89-827550cb0bfd/scratchpad/voices/en_US-ryan-high.onnx
say() { # $1=file(mp3)  $2=text
  echo "$2" | python3 -m piper -m "$MODEL" --length-scale 1.04 -f "$VO/${1%.mp3}.wav" 2>/dev/null
  ffmpeg -nostdin -loglevel error -y -i "$VO/${1%.mp3}.wav" "$VO/$1"
  echo "ok $1 ($(stat -c%s "$VO/$1") bytes)"
}

say s1.mp3 "Meet Gofer."
say s2.mp3 "Everyone's building agents that spend money. Nobody's making it safe."
say s3.mp3 "Gofer wraps it in a Mandate — a spend limit enforced on the server."
say s4.mp3 "Give it a goal. It reasons with Meta Muse, screens the Mandate, and settles through real PayPal — hands-free, with zero taps."
say s5.mp3 "A real PayPal capture, written to an audit ledger. Not a mockup."
say s6.mp3 "Above your limit? It waits for one human tap."
say s7.mp3 "Outside the rules? Denied, with a plain reason."
say s8.mp3 "Limits and spend live on the server. The browser can't lift its own cap."
say s9.mp3 "Gofer. Agentic commerce, on a leash you hold."

# --- 2. SFX (ffmpeg synth) --------------------------------------------------
f() { ffmpeg -nostdin -loglevel error -y "$@"; }

# whoosh: filtered noise swell, ~0.45s
f -f lavfi -i "anoisesrc=d=0.45:c=pink:a=0.35" \
  -af "highpass=f=300,lowpass=f=5000,afade=t=in:d=0.2,afade=t=out:st=0.2:d=0.25,volume=0.5" \
  "$SFX/whoosh.mp3"

# ding: bright two-tone chime for the settle moment
f -f lavfi -i "sine=f=880:d=0.5" -f lavfi -i "sine=f=1320:d=0.5" \
  -filter_complex "[0][1]amix=inputs=2,afade=t=out:st=0.08:d=0.42,volume=0.5" \
  "$SFX/ding.mp3"

# deny: low soft thud
f -f lavfi -i "sine=f=140:d=0.4" \
  -af "afade=t=out:st=0.05:d=0.35,volume=0.6" \
  "$SFX/deny.mp3"

# tick: tiny UI click for mandate pills
f -f lavfi -i "sine=f=1600:d=0.08" -af "afade=t=out:st=0.02:d=0.06,volume=0.3" "$SFX/tick.mp3"

# pad: subtle ambient drone bed, 41s, very low
f -f lavfi -i "sine=f=110:d=41" -f lavfi -i "sine=f=165:d=41" \
  -filter_complex "[0][1]amix=inputs=2,tremolo=f=0.15:d=0.3,aecho=0.8:0.6:400:0.3,volume=0.10" \
  "$SFX/pad.mp3"

echo "SFX done"

# --- 3. Mix master (41s = 1230f @30fps) ------------------------------------
# VO scene starts (seconds): s1=0.3 s2=3.2 s3=7.7 s4=12.2 s5=20.2 s6=24.2 s7=28.7 s8=33.2 s9=37.2
# Transition whooshes at scene cuts; ding at settle (~17.3s); deny at ~29s; ticks at pills.
ffmpeg -nostdin -loglevel error -y \
  -i "$VO/s1.mp3" -i "$VO/s2.mp3" -i "$VO/s3.mp3" -i "$VO/s4.mp3" -i "$VO/s5.mp3" \
  -i "$VO/s6.mp3" -i "$VO/s7.mp3" -i "$VO/s8.mp3" -i "$VO/s9.mp3" \
  -i "$SFX/whoosh.mp3" -i "$SFX/ding.mp3" -i "$SFX/deny.mp3" -i "$SFX/tick.mp3" -i "$SFX/pad.mp3" \
  -filter_complex "
    [0]adelay=300|300[v1];
    [1]adelay=3200|3200[v2];
    [2]adelay=7700|7700[v3];
    [3]adelay=12200|12200[v4];
    [4]adelay=20200|20200[v5];
    [5]adelay=24200|24200[v6];
    [6]adelay=28700|28700[v7];
    [7]adelay=33200|33200[v8];
    [8]adelay=37200|37200[v9];
    [9]adelay=3000|3000[w1];
    [9]adelay=7500|7500[w2];
    [9]adelay=12000|12000[w3];
    [9]adelay=20000|20000[w4];
    [9]adelay=24000|24000[w5];
    [9]adelay=28500|28500[w6];
    [9]adelay=33000|33000[w7];
    [9]adelay=37000|37000[w8];
    [10]adelay=17300|17300[ding];
    [11]adelay=29000|29000[deny];
    [12]adelay=8100|8100[t1];
    [12]adelay=8400|8400[t2];
    [12]adelay=8700|8700[t3];
    [13]volume=1.0[pad];
    [v1][v2][v3][v4][v5][v6][v7][v8][v9][w1][w2][w3][w4][w5][w6][w7][w8][ding][deny][t1][t2][t3][pad]amix=inputs=23:normalize=0:duration=longest,volume=1.4,alimiter=limit=0.95,afade=t=out:st=40.3:d=0.7[out]
  " -map "[out]" -t 41 -ar 44100 "$OUT/master.mp3"

echo "MASTER: $(stat -c%s "$OUT/master.mp3") bytes, duration:"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/master.mp3"
