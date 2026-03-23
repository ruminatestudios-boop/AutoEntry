"""Regression guards for listing title/description quality.

Run from backend dir: python3 tests/test_listing_copy_guards.py
Or: pytest tests/test_listing_copy_guards.py (if pytest installed)
"""
import unittest

from app.services.product_title_heuristics import is_weak_listing_title
from app.services.web_enrichment import LISTING_COPY_POLICY_VERSION, _gemini_template_paraphrase


class TestListingCopyGuards(unittest.TestCase):
    def test_brand_only_title_is_weak(self):
        self.assertTrue(is_weak_listing_title("Palace", "Palace"))
        self.assertTrue(is_weak_listing_title("palace", "Palace"))
        self.assertFalse(is_weak_listing_title("Palace Gore-Tex 2L Jacket", "Palace"))

    def test_template_paraphrase_detects_reseller_blurb(self):
        t = (
            "This PALACE GORE-TEX jacket features a dog print. "
            "Designed for those who want to make a bold statement. "
            "Ideal for urban exploration and streetwear enthusiasts."
        )
        self.assertTrue(_gemini_template_paraphrase(t))

    def test_copy_policy_version_constant(self):
        self.assertTrue(LISTING_COPY_POLICY_VERSION.startswith("synclyst-listing-v"))


if __name__ == "__main__":
    unittest.main()
