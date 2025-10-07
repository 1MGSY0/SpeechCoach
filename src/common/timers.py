import time

def now_ms() -> int:
    return int(time.perf_counter() * 1000)
