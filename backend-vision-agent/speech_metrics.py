from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from statistics import mean
from typing import Any


def _to_ms(value: datetime | None) -> int | None:
    if value is None:
        return None
    return int(value.timestamp() * 1000)


def _diff_ms(start_ms: int | None, end_ms: int | None) -> int | None:
    if start_ms is None or end_ms is None:
        return None
    return max(0, end_ms - start_ms)


@dataclass
class TurnMetricState:
    turnIndex: int
    source: str
    speechStartAtMs: int | None = None
    firstPartialAtMs: int | None = None
    userTurnEndAtMs: int | None = None
    firstModelOutputAtMs: int | None = None
    firstAudioOutputAtMs: int | None = None
    responseEndAtMs: int | None = None
    lastUserActivityAtMs: int | None = None
    lastResponseActivityAtMs: int | None = None

    def to_result(self) -> dict[str, Any]:
        response_end_ms = (
            self.responseEndAtMs
            or self.lastResponseActivityAtMs
            or self.firstAudioOutputAtMs
            or self.firstModelOutputAtMs
        )
        user_turn_end_ms = self.userTurnEndAtMs or self.lastUserActivityAtMs
        first_response_ms = self.firstAudioOutputAtMs or self.firstModelOutputAtMs
        playback_start_ms = self.firstAudioOutputAtMs or self.firstModelOutputAtMs
        return {
            "turnIndex": self.turnIndex,
            "source": self.source,
            "speechStartAtMs": self.speechStartAtMs,
            "firstPartialAtMs": self.firstPartialAtMs,
            "userTurnEndAtMs": user_turn_end_ms,
            "firstModelOutputAtMs": self.firstModelOutputAtMs,
            "firstAudioOutputAtMs": self.firstAudioOutputAtMs,
            "firstResponseAtMs": first_response_ms,
            "responseEndAtMs": response_end_ms,
            "ttfpMs": _diff_ms(self.speechStartAtMs, self.firstPartialAtMs),
            "ttfrMs": _diff_ms(user_turn_end_ms, first_response_ms),
            "e2eMs": _diff_ms(self.speechStartAtMs, response_end_ms),
            "asrMs": _diff_ms(self.speechStartAtMs, user_turn_end_ms),
            "llmMs": _diff_ms(user_turn_end_ms, self.firstModelOutputAtMs),
            "ttsMs": _diff_ms(self.firstModelOutputAtMs, self.firstAudioOutputAtMs),
            "playbackMs": _diff_ms(playback_start_ms, response_end_ms),
        }


@dataclass
class SpeechMetricsCollector:
    mode: str = "unknown"
    turns: list[dict[str, Any]] = field(default_factory=list)
    _current: TurnMetricState | None = None

    def _set_mode(self, value: str) -> None:
        if self.mode == "unknown":
            self.mode = value

    def _ensure_turn(
        self,
        *,
        ts_ms: int | None,
        source: str,
        set_speech_start: bool = True,
    ) -> TurnMetricState:
        if self._current is None:
            self._current = TurnMetricState(
                turnIndex=len(self.turns) + 1,
                source=source,
                speechStartAtMs=ts_ms if set_speech_start else None,
                lastUserActivityAtMs=ts_ms,
            )
            return self._current

        if (
            self._current.firstAudioOutputAtMs is not None
            or self._current.firstModelOutputAtMs is not None
        ) and (
            self._current.responseEndAtMs is not None
            or (
                ts_ms is not None
                and self._current.userTurnEndAtMs is not None
                and ts_ms > self._current.userTurnEndAtMs
            )
        ):
            self.finalize_current()
            self._current = TurnMetricState(
                turnIndex=len(self.turns) + 1,
                source=source,
                speechStartAtMs=ts_ms if set_speech_start else None,
                lastUserActivityAtMs=ts_ms,
            )

        if set_speech_start and self._current.speechStartAtMs is None:
            self._current.speechStartAtMs = ts_ms
        if self._current.source == "unknown":
            self._current.source = source
        return self._current

    def _mark_model_output_started(self, ts_ms: int | None) -> None:
        if self._current is None:
            return
        if self._current.userTurnEndAtMs is None:
            self._current.userTurnEndAtMs = self._current.lastUserActivityAtMs or ts_ms
        if self._current.firstModelOutputAtMs is None:
            self._current.firstModelOutputAtMs = ts_ms
        self._current.lastResponseActivityAtMs = ts_ms

    def _mark_audio_output_started(self, ts_ms: int | None) -> None:
        if self._current is None:
            return
        self._mark_model_output_started(ts_ms)
        if self._current.firstAudioOutputAtMs is None:
            self._current.firstAudioOutputAtMs = ts_ms

    def observe_audio_input(self, timestamp: datetime | None, *, source: str) -> None:
        self._set_mode(source)
        ts_ms = _to_ms(timestamp)
        turn = self._ensure_turn(ts_ms=ts_ms, source=source)
        turn.lastUserActivityAtMs = ts_ms

    def observe_user_transcript(
        self,
        timestamp: datetime | None,
        *,
        source: str,
        is_final: bool = False,
    ) -> None:
        self._set_mode(source)
        ts_ms = _to_ms(timestamp)
        turn = self._ensure_turn(
            ts_ms=ts_ms,
            source=source,
            set_speech_start=False,
        )
        if turn.firstPartialAtMs is None:
            turn.firstPartialAtMs = ts_ms
        turn.lastUserActivityAtMs = ts_ms
        if is_final and turn.userTurnEndAtMs is None:
            turn.userTurnEndAtMs = ts_ms

    def observe_turn_started(self, timestamp: datetime | None, *, source: str) -> None:
        self.observe_audio_input(timestamp, source=source)

    def observe_turn_ended(
        self,
        timestamp: datetime | None,
        *,
        source: str,
        duration_ms: int | None = None,
    ) -> None:
        self._set_mode(source)
        ts_ms = _to_ms(timestamp)
        turn = self._ensure_turn(ts_ms=ts_ms, source=source, set_speech_start=False)
        if ts_ms is not None and duration_ms:
            derived_start_ms = max(0, ts_ms - duration_ms)
            if turn.speechStartAtMs is None:
                turn.speechStartAtMs = derived_start_ms
            else:
                turn.speechStartAtMs = min(turn.speechStartAtMs, derived_start_ms)
        if turn.userTurnEndAtMs is None:
            turn.userTurnEndAtMs = ts_ms
        turn.lastUserActivityAtMs = ts_ms

    def observe_llm_request_started(self, timestamp: datetime | None, *, source: str) -> None:
        self._set_mode(source)
        if self._current is None:
            return
        ts_ms = _to_ms(timestamp)
        if self._current.userTurnEndAtMs is None:
            self._current.userTurnEndAtMs = self._current.lastUserActivityAtMs or ts_ms

    def observe_llm_chunk(self, timestamp: datetime | None, *, source: str) -> None:
        self._set_mode(source)
        self._mark_model_output_started(_to_ms(timestamp))

    def observe_agent_transcript(self, timestamp: datetime | None, *, source: str) -> None:
        self._set_mode(source)
        self._mark_model_output_started(_to_ms(timestamp))

    def observe_audio_output(self, timestamp: datetime | None, *, source: str) -> None:
        self._set_mode(source)
        self._mark_audio_output_started(_to_ms(timestamp))

    def observe_tts_start(self, timestamp: datetime | None, *, source: str) -> None:
        self._set_mode(source)
        self._mark_audio_output_started(_to_ms(timestamp))

    def observe_tts_complete(self, timestamp: datetime | None, *, source: str) -> None:
        self._set_mode(source)
        self._mark_audio_output_started(_to_ms(timestamp))
        if self._current is not None:
            self._current.responseEndAtMs = _to_ms(timestamp)

    def observe_llm_completed(self, timestamp: datetime | None, *, source: str) -> None:
        self._set_mode(source)
        self._mark_model_output_started(_to_ms(timestamp))
        if self._current is not None and self._current.responseEndAtMs is None:
            self._current.responseEndAtMs = _to_ms(timestamp)

    def finalize_current(self) -> None:
        if self._current is None:
            return
        result = self._current.to_result()
        has_signal = any(
            result.get(key) is not None
            for key in ("ttfpMs", "ttfrMs", "e2eMs", "firstPartialAtMs", "firstResponseAtMs")
        )
        if has_signal:
            self.turns.append(result)
        self._current = None

    def finalize_session(self) -> dict[str, Any]:
        self.finalize_current()
        ttfp_values = [turn["ttfpMs"] for turn in self.turns if isinstance(turn.get("ttfpMs"), int)]
        ttfr_values = [turn["ttfrMs"] for turn in self.turns if isinstance(turn.get("ttfrMs"), int)]
        e2e_values = [turn["e2eMs"] for turn in self.turns if isinstance(turn.get("e2eMs"), int)]
        asr_values = [turn["asrMs"] for turn in self.turns if isinstance(turn.get("asrMs"), int)]
        llm_values = [turn["llmMs"] for turn in self.turns if isinstance(turn.get("llmMs"), int)]
        tts_values = [turn["ttsMs"] for turn in self.turns if isinstance(turn.get("ttsMs"), int)]
        playback_values = [
            turn["playbackMs"] for turn in self.turns if isinstance(turn.get("playbackMs"), int)
        ]
        return {
            "mode": self.mode,
            "turnCount": len(self.turns),
            "summary": {
                "ttfpMsMean": round(mean(ttfp_values), 2) if ttfp_values else None,
                "ttfrMsMean": round(mean(ttfr_values), 2) if ttfr_values else None,
                "e2eMsMean": round(mean(e2e_values), 2) if e2e_values else None,
                "asrMsMean": round(mean(asr_values), 2) if asr_values else None,
                "llmMsMean": round(mean(llm_values), 2) if llm_values else None,
                "ttsMsMean": round(mean(tts_values), 2) if tts_values else None,
                "playbackMsMean": round(mean(playback_values), 2) if playback_values else None,
                "ttfpMsFirst": ttfp_values[0] if ttfp_values else None,
                "ttfrMsFirst": ttfr_values[0] if ttfr_values else None,
                "e2eMsFirst": e2e_values[0] if e2e_values else None,
                "asrMsFirst": asr_values[0] if asr_values else None,
                "llmMsFirst": llm_values[0] if llm_values else None,
                "ttsMsFirst": tts_values[0] if tts_values else None,
                "playbackMsFirst": playback_values[0] if playback_values else None,
            },
            "turns": self.turns,
        }
