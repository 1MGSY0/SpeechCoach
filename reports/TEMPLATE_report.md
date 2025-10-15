# Streaming S2S Baseline — Latency & Continuity (One-Pager)

**Date:** {{DATE}}  
**Profile:** ASR={{ASR_MODEL}} | LLM={{LLM_MODEL}} | TTS={{TTS_MODEL}}  
**Device:** {{DEVICE}} | **CUDA:** {{CUDA}} | **Driver:** {{DRIVER}}  

## 1) Latency (ms)
| Turns | ASR mean | LLM mean | TTS mean | E2E mean |
|------:|---------:|---------:|---------:|---------:|
| {{N_TURNS}} | {{ASR_MEAN}} | {{LLM_MEAN}} | {{TTS_MEAN}} | {{E2E_MEAN}} |

> TTFB and stage breakdown follow the streaming cascade practice (ASR partial → concurrent LLM → concurrent TTS), as in Ethiraj et al. (streaming ASR + quantized LLM + real-time TTS).  

## 2) Semantic Continuity
**BERTScore F1 (avg)**: {{BERT_F1}}  
**BLEURT (avg, optional)**: {{BLEURT_AVG}}

| Turn | BERTScore F1 | BLEURT |
|----:|-------------:|-------:|
{{CONTINUITY_ROWS}}

## 3) Notes & Observations
- What helped latency: {{WHAT_HELPED_LATENCY}}
- Bottlenecks: {{BOTTLENECKS}}
- Next steps: {{NEXT_STEPS}}

## 4) Config & Versions
- ASR cfg: {{ASR_CFG}}  
- LLM cfg: {{LLM_CFG}}  
- TTS cfg: {{TTS_CFG}}  
- torch {{TORCH}} | Python {{PYVER}} | faster-whisper {{FWVER}} | TTS {{TTSVER}}

## 5) References
- Cascaded streaming latency layout (telecom voice agent).  
- Whisper ASR; faster-whisper speedups.  
- Coqui TTS (FastPitch/HiFiGAN) for low latency; Bark for expressivity.  
- BERTScore / BLEURT for semantic faithfulness.

