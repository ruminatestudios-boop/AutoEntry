"""VLM prompt template for MultimodalProcessor (UCP + GEO Fact-Feel-Proof)."""

from app.prompts.vlm_prompt_template import (
    VLM_SYSTEM_PROMPT,
    build_user_prompt,
    UCP_ATTRIBUTE_KEYS,
    FACT_FEEL_PROOF_KEYS,
)

__all__ = [
    "VLM_SYSTEM_PROMPT",
    "build_user_prompt",
    "UCP_ATTRIBUTE_KEYS",
    "FACT_FEEL_PROOF_KEYS",
]
