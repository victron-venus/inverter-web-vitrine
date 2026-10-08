"""Regressions for extracting the actual HTML application fixture."""

import unittest

from extract_inline_script import extract_inline_script


class InlineScriptTests(unittest.TestCase):
    def test_case_attributes_and_raw_text(self):
        source = """<!-- <script>not the application</script> -->
<ScRiPt data-note=">">const x = "<div> &amp;";</sCrIpT >"""
        self.assertEqual(extract_inline_script(source), 'const x = "<div> &amp;";')

    def test_external_script_is_not_selected(self):
        source = '<script src="app.js"></script><script>const actual = 1;</script>'
        self.assertEqual(extract_inline_script(source), "const actual = 1;")

    def test_missing_incomplete_and_ambiguous_scripts_fail(self):
        for source in (
            "<p>no script</p>",
            "<script>unterminated",
            "<script>one</script><script>two</script>",
        ):
            with self.subTest(source=source), self.assertRaises(ValueError):
                extract_inline_script(source)
