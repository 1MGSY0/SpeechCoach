import argparse, json, csv
from pathlib import Path

def load_jsonl(p):
    for line in Path(p).read_text(encoding='utf-8').splitlines():
        try:
            yield json.loads(line)
        except Exception:
            pass

def mean(xs):
    xs = [x for x in xs if isinstance(x,(int,float))]
    return round(sum(xs)/len(xs),2) if xs else 0.0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--log', default='logs/session_batch.jsonl')
    ap.add_argument('--out_csv', default='')
    args = ap.parse_args()
    # include potential session_summary event for TTFB
    all_events = list(load_jsonl(args.log))
    turns = [e for e in all_events if e.get('event')=='turn']
    session = next((e for e in all_events if e.get('event')=='session_summary'), {})
    asr_ms = [e.get('asr_ms',0) for e in turns]
    llm_ms = [e.get('llm_ms',0) for e in turns]
    tts_ms = [e.get('tts_ms',0) for e in turns]
    e2e_ms = [e.get('e2e_ms',0) for e in turns]
    print('N turns:', len(turns))
    print('ASR mean:', mean(asr_ms))
    print('LLM mean:', mean(llm_ms))
    print('TTS mean:', mean(tts_ms))
    print('E2E mean:', mean(e2e_ms))
    if session:
        print('TTFB first_partial_ms:', session.get('ttfb_first_partial_ms'))
        print('TTFB first_token_ms:', session.get('ttfb_first_token_ms'))
        print('TTFB first_audio_ms:', session.get('ttfb_first_audio_ms'))
        print('Session E2E ms:', session.get('e2e_ms'))
    if args.out_csv:
        with open(args.out_csv, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['turn_id','asr_ms','llm_ms','tts_ms','e2e_ms'])
            for e in turns:
                w.writerow([e.get('turn_id'), e.get('asr_ms'), e.get('llm_ms'), e.get('tts_ms'), e.get('e2e_ms')])
            if session:
                w.writerow(['session_ttfb_partial', session.get('ttfb_first_partial_ms'), '', '', session.get('e2e_ms')])
                w.writerow(['session_ttfb_token', session.get('ttfb_first_token_ms'), '', '', ''])
                w.writerow(['session_ttfb_audio', session.get('ttfb_first_audio_ms'), '', '', ''])
        print(f'Wrote CSV: {args.out_csv}')

if __name__ == '__main__':
    main()
