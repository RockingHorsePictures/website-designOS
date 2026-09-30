// The Design OS updates workflow. Vercel's Deploy Button copies the repository without
// .github, so the Overview offers this file as a one-click GitHub "create file" link.
// Kept identical to .github/workflows/designos-update.yml (checked by a unit test).
export const updateWorkflowPath = '.github/workflows/designos-update.yml'
export const updateWorkflow =
  '# Checks weekly for a new Design OS release and opens a pull request with the update. Vercel\n# builds a Preview of the pull request (against a separate database branch); merging it updates\n# the live site. Your customised files are never overwritten: conflicts are listed for review.\nname: Design OS updates\non:\n  schedule:\n    - cron: \'17 6 * * 1\'\n  workflow_dispatch:\npermissions:\n  contents: write\n  pull-requests: write\njobs:\n  update:\n    # Only in websites made from Design OS, not in the Design OS product repository itself.\n    if: github.repository != \'RockingHorsePictures/website-designOS\'\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          fetch-depth: 0\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - name: Prepare the update\n        env:\n          GH_TOKEN: ${{ github.token }}\n        run: |\n          git config user.name "github-actions[bot]"\n          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"\n          node scripts/upgrade.mjs latest --pr\n'

export function updateWorkflowLink(owner: string, repo: string, branch = 'main') {
  const params = new URLSearchParams({ filename: updateWorkflowPath, value: updateWorkflow })
  return `https://github.com/${owner}/${repo}/new/${encodeURIComponent(branch)}?${params}`
}
