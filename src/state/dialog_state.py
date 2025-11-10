from dataclasses import dataclass, field
from typing import Dict, List

@dataclass
class DialogState:
    user_profile: Dict = field(default_factory=dict)
    scenario_story: Dict = field(default_factory=dict)
    goals: List[str] = field(default_factory=list)
    commitments: List[str] = field(default_factory=list)

