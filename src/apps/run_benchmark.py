# src/apps/run_benchmark.py
import argparse, glob, os, yaml
import soundfile as sf
from pathlib import Path
from src.common.logging_utils import JsonlLogger
from src.common.timers import now_ms
from src.common.audio_utils import wav_bytes_iter
from src.asr.faster_whisper_impl import FasterWhisperASR
from src.asr.faster_whisper_stream import FasterWhisperStream
from src.llm.stub_impl import StubLLM
from src.llm.llama_cpp_impl import LlamaCppLLM
from src.tts.coqui_impl import CoquiTTS
from src.pipeline.orchestrator import Orchestrator


def load_yaml(p):
    with open(p, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def get_llm(cfg):
    impl = cfg.get('impl','stub')
    if impl == 'stub':
        return StubLLM(template=cfg.get('template','You said: {asr_text}'))
    if impl == 'llama_cpp':
        return LlamaCppLLM(
            model_path=cfg['model_path'],
            n_ctx=cfg.get('n_ctx',2048),
            n_gpu_layers=cfg.get('n_gpu_layers',35),
            temperature=cfg.get('temperature',0.7),
        )
    raise ValueError(f'Unknown LLM impl: {impl}')


def run_turn_based(in_wavs, asr_cfg, llm_cfg, tts_cfg, out_dir, logger):
    asr = FasterWhisperASR(
        model_size=asr_cfg.get('model_size','small'),
        compute_type=asr_cfg.get('compute_type','float16'),
    )
    llm = get_llm(llm_cfg)
    tts = CoquiTTS(
        model_name=tts_cfg.get('model_name'),
        vocoder_name=tts_cfg.get('vocoder_name'),
        device=tts_cfg.get('device','cuda'),
    )
    prev_ctx = ''
    for idx, wav_path in enumerate(in_wavs, 1):
        t0 = now_ms()
        asr0 = now_ms(); asr_res = asr.transcribe_file(wav_path); asr1 = now_ms()
        prompt = llm_cfg.get('template','You said: {asr_text}').format(asr_text=asr_res.text)
        llm0 = now_ms(); reply_text = llm.generate(prompt); llm1 = now_ms()
        out_wav = str(Path(out_dir) / f'turn_{idx:02d}.wav')
        tts0 = now_ms(); tts.synth_to_file(reply_text, out_wav); tts1 = now_ms()
        logger.log(event='turn', turn_id=idx, in_wav=wav_path, out_wav=out_wav,
                   asr_text=asr_res.text, reply_text=reply_text,
                   asr_ms=asr1-asr0, llm_ms=llm1-llm0, tts_ms=tts1-tts0, e2e_ms=tts1-t0)


def run_streaming(in_wavs, asr_cfg, llm_cfg, tts_cfg, out_dir, logger, chunk_ms=20, realtime=False):
    asr_stream = FasterWhisperStream(
        model_size=asr_cfg.get('model_size','small'),
        compute_type=asr_cfg.get('compute_type','float16'),
        sample_rate=16000,
        language=asr_cfg.get('language','en'),
    )
    llm = get_llm(llm_cfg)
    tts = CoquiTTS(
        model_name=tts_cfg.get('model_name'),
        vocoder_name=tts_cfg.get('vocoder_name'),
        device=tts_cfg.get('device','cuda'),
    )
    for idx, wav_path in enumerate(in_wavs, 1):
        orch = Orchestrator(asr_stream, llm, tts, logger)
        async def audio_iter():
            for chunk in wav_bytes_iter(wav_path, chunk_ms=chunk_ms, realtime=realtime):
                # yield bytes via async generator
                yield chunk
        # wrap the sync generator into async
        async def async_audio_gen():
            for b in wav_bytes_iter(wav_path, chunk_ms=chunk_ms, realtime=realtime):
                yield b
        import asyncio
        summary = asyncio.run(orch.run_session(async_audio_gen()))
        # Log a session-level summary and a per-turn placeholder with E2E
        logger.log(event='turn', turn_id=idx, in_wav=wav_path, out_wav='',
                   asr_text='', reply_text='', asr_ms=None, llm_ms=None, tts_ms=None, e2e_ms=summary.get('e2e_ms'))
        logger.log(event='session_summary', **summary)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--variant', choices=['turn_based','streaming'], default='turn_based')
    ap.add_argument('--in_dir', default='data/audio')
    ap.add_argument('--asr_cfg', default='configs/asr.yaml')
    ap.add_argument('--llm_cfg', default='configs/llm.yaml')
    ap.add_argument('--tts_cfg', default='configs/tts_lowlat.yaml')
    ap.add_argument('--out_dir', default='logs/benchmark_out')
    ap.add_argument('--log', default='logs/session_benchmark.jsonl')
    ap.add_argument('--chunk_ms', type=int, default=20)
    ap.add_argument('--realtime', action='store_true')
    ap.add_argument('--fast', action='store_true', help='Speed-through mode: disable realtime pacing and use larger chunks for streaming.')
    ap.add_argument('--max_files', type=int, default=0, help='Process only the first N wav files (0 = no limit).')
    ap.add_argument('--max_total_seconds', type=float, default=0.0, help='Cap total input audio seconds (0 = no cap).')
    ap.add_argument('--latency_csv', default='')
    ap.add_argument('--pause_rms_thresh', type=float, default=0.01, help='RMS threshold below which audio chunk counts as silence for pause simulation.')
    ap.add_argument('--pause_min_chunks', type=int, default=8, help='Consecutive silent chunks required to emit a pause marker.')
    ap.add_argument('--no_clause_audio', action='store_true', help='Disable saving individual clause WAV files during streaming.')
    ap.add_argument('--min_clause_chars', type=int, default=8, help='Minimum clause length before TTS synthesis to avoid very short audio artifacts.')
    args = ap.parse_args()

    Path(args.out_dir).mkdir(parents=True, exist_ok=True)
    logger = JsonlLogger(args.log)

    asr_cfg = load_yaml(args.asr_cfg)
    llm_cfg = load_yaml(args.llm_cfg)
    tts_cfg = load_yaml(args.tts_cfg)

    in_wavs = sorted(glob.glob(os.path.join(args.in_dir, '*.wav')))
    # Limit number of files if requested
    if args.max_files and args.max_files > 0:
        in_wavs = in_wavs[:args.max_files]
    # Limit by total audio seconds if requested
    if args.max_total_seconds and args.max_total_seconds > 0:
        limited = []
        total = 0.0
        for w in in_wavs:
            try:
                info = sf.info(w)
                d = float(info.frames) / float(info.samplerate) if info.samplerate else 0.0
            except Exception:
                d = 0.0
            if total + d > args.max_total_seconds and limited:
                break
            limited.append(w)
            total += d
        in_wavs = limited

    # Fast mode tweaks for streaming
    if args.fast:
        args.realtime = False
        if args.chunk_ms < 80:
            args.chunk_ms = 80
    if args.variant == 'turn_based':
        run_turn_based(in_wavs, asr_cfg, llm_cfg, tts_cfg, args.out_dir, logger)
    else:
        # Print a rough wall-time estimate when pacing in realtime
        if args.realtime:
            total_sec = 0.0
            for w in in_wavs:
                try:
                    info = sf.info(w)
                    total_sec += float(info.frames) / float(info.samplerate)
                except Exception:
                    pass
            print(f"Streaming in realtime with chunk_ms={args.chunk_ms}. Estimated wall time >= {total_sec:.1f}s across {len(in_wavs)} files. Use --fast for quicker runs.")
        # Patch orchestrator instantiation inside streaming path to pass flags
        def streaming_wrapper():
            asr_stream = FasterWhisperStream(
                model_size=asr_cfg.get('model_size','small'),
                compute_type=asr_cfg.get('compute_type','float16'),
                sample_rate=16000,
                language=asr_cfg.get('language','en'),
            )
            llm = get_llm(llm_cfg)
            tts = CoquiTTS(
                model_name=tts_cfg.get('model_name'),
                vocoder_name=tts_cfg.get('vocoder_name'),
                device=tts_cfg.get('device','cuda'),
            )
            for idx, wav_path in enumerate(in_wavs, 1):
                orch = Orchestrator(
                    asr_stream, llm, tts, logger,
                    save_clauses=not args.no_clause_audio,
                    clause_out_dir=args.out_dir,
                    min_clause_chars=args.min_clause_chars,
                    pause_rms_thresh=args.pause_rms_thresh,
                    pause_min_chunks=args.pause_min_chunks,
                )
                import asyncio
                async def async_audio_gen():
                    from src.common.audio_utils import wav_bytes_iter
                    for b in wav_bytes_iter(wav_path, chunk_ms=args.chunk_ms, realtime=args.realtime):
                        yield b
                summary = asyncio.run(orch.run_session(async_audio_gen()))
                logger.log(event='turn', turn_id=idx, in_wav=wav_path, out_wav='',
                           asr_text='', reply_text='', asr_ms=None, llm_ms=None, tts_ms=None, e2e_ms=summary.get('e2e_ms'))
                logger.log(event='session_summary', **summary)
        streaming_wrapper()

    logger.close()

    # Optional: export CSV summary
    if args.latency_csv:
        from src.eval.latency_benchmark import main as latency_main
        import sys
        sys.argv = ['latency_benchmark', '--log', args.log, '--out_csv', args.latency_csv]
        latency_main()


if __name__ == '__main__':
    main()
