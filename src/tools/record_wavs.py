import argparse, sounddevice as sd, soundfile as sf, time
from pathlib import Path

def rec(seconds=5, sr=16000):
    print(f"Recording {seconds}s…")
    audio = sd.rec(int(seconds * sr), samplerate=sr, channels=1, dtype="float32")
    sd.wait()
    return audio, sr

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out_dir", default="data/audio")
    ap.add_argument("--n", type=int, default=10)
    ap.add_argument("--seconds", type=int, default=6)
    args = ap.parse_args()

    Path(args.out_dir).mkdir(parents=True, exist_ok=True)
    print("Press Enter to start each take; Ctrl+C to stop.")
    for i in range(1, args.n+1):
        input(f"\n[{i}/{args.n}] Ready? Press Enter…")
        audio, sr = rec(seconds=args.seconds, sr=16000)
        out = Path(args.out_dir)/f"{i:02d}.wav"
        sf.write(str(out), audio, sr)
        print(f"Saved {out}")
        time.sleep(0.5)

if __name__ == "__main__":
    main()
