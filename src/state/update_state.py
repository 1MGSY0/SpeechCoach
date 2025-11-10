from .dialog_state import DialogState

def apply_turn(state: DialogState, user_text: str, assistant_text: str) -> DialogState:
    # Placeholder: extract simple commitments marked by keyword 'will'
    if 'will ' in assistant_text:
        state.commitments.append(assistant_text)
    return state
