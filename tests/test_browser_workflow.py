"""Keep real browser acceptance on the required validation path."""
import json
import re
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


class BrowserWorkflowTests(unittest.TestCase):
    def test_browser_job_is_part_of_the_required_validation_workflow(self):
        workflow = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())
        job = workflow['jobs']['browser-compatibility']
        self.assertRegex(job['uses'], r'^victron-venus/venus-os-ci-toolkit/\.github/workflows/typescript-ci\.yml@[a-f0-9]{40}$')
        self.assertNotIn('continue-on-error', job)
        self.assertEqual(job['with']['browser-test-command'], 'node scripts/browser-acceptance.cjs')
        self.assertEqual(job['with']['browser-prepare-command'], 'node --check scripts/browser-acceptance.cjs')
        self.assertFalse(job['with']['run-node-ci'])
        gate = yaml.safe_load((ROOT / '.github/workflows/quality-gate.yml').read_text())
        required = [name for name, body in gate['jobs'].items()
                    if body.get('uses') == './.github/workflows/validate.yml']
        self.assertEqual(len(required), 1)
        self.assertIn(required[0], gate['jobs']['gate']['needs'])

    def test_source_audits_expand_without_claiming_release_qualification(self):
        workflow = yaml.safe_load((ROOT / '.github/workflows/validate.yml').read_text())
        options = workflow['jobs']['browser-compatibility']['with']
        self.assertEqual(options['browser-extended'], "${{ github.event_name == 'schedule' || github.event_name == 'workflow_dispatch' }}")
        self.assertNotIn('browser-release-channel', options)
        self.assertEqual(json.loads((ROOT / '.release-policy.json').read_text())['mode'], 'validation-only')

    def test_inventory_keeps_real_generations_and_native_os_targets(self):
        rows = json.loads((ROOT / '.github/browser-compatibility.json').read_text())
        self.assertEqual(len(rows), 35)
        self.assertEqual(len({row['id'] for row in rows}), 35)
        self.assertEqual(sum(row['tier'] == 'required' for row in rows), 5)
        self.assertEqual({row['os'] for row in rows}, {'ubuntu-latest', 'windows-2022', 'macos-15'})
        self.assertEqual(len({row['playwright'] for row in rows}), 3)
        for row in rows:
            self.assertTrue(re.fullmatch(r'\d+\.\d+\.\d+', row['playwright']))
            package = json.loads((ROOT / row['toolchain'] / 'package.json').read_text())
            self.assertEqual(package['dependencies'], {'playwright': row['playwright']})


if __name__ == '__main__':
    unittest.main()
