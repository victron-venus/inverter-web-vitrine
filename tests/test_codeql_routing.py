"""Keep CodeQL covered once through Quality gate for every existing event."""

import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def workflow(name):
    return yaml.load(  # nosec B506 - BaseLoader only constructs strings, lists and maps.
        (ROOT / ".github/workflows" / name).read_text(), Loader=yaml.BaseLoader
    )


class CodeQLRoutingTests(unittest.TestCase):
    def test_quality_gate_covers_former_direct_codeql_events(self):
        gate = workflow("quality-gate.yml")
        # Both old direct triggers used default PR event types and main only.
        # An unfiltered PR caller covers main and every other base branch.
        self.assertEqual(gate["on"]["pull_request"], {})
        self.assertEqual(gate["on"]["push"], {"branches": ["main"]})
        self.assertEqual(gate["on"]["merge_group"], {})
        self.assertEqual(gate["on"]["workflow_dispatch"], {})
        self.assertTrue(gate["on"]["schedule"])
        self.assertEqual(workflow("codeql.yml")["on"], {"workflow_call": {}})

    def test_every_quality_invocation_requires_real_codeql(self):
        gate = workflow("quality-gate.yml")["jobs"]
        calls = [
            (name, job)
            for name, job in gate.items()
            if job.get("uses") == "./.github/workflows/codeql.yml"
        ]
        self.assertEqual(len(calls), 1)
        name, job = calls[0]
        self.assertNotIn("if", job)
        self.assertIn(name, gate["gate"]["needs"])
        self.assertEqual(job["permissions"]["security-events"], "write")
        self.assertEqual(gate["gate"]["name"], "CI gate")
        codeql = workflow("codeql.yml")["jobs"]
        self.assertEqual(codeql["analyze"]["steps"][-1]["with"]["category"], "/language:actions")
        self.assertEqual(
            codeql["analyze-additional-sources"]["strategy"]["matrix"]["language"],
            ["python", "javascript-typescript"],
        )


if __name__ == "__main__":
    unittest.main()
