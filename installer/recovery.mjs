export function setupFailure(step, error, data) {
  const output = `${error.providerOutput || ''}\n${error.message || ''}`
  const terms = output.match(/https:\/\/vercel\.com\/[^\s\u001b"<>]*accept-terms[^\s\u001b"<>]*/)
  let reason = 'The service did not complete this step.'
  let recovery =
    'Check the selected account and its service dashboard, correct the issue, then choose Resume setup. Completed steps are saved.'
  let actionURL = null
  if (terms) {
    reason = 'The database provider needs you to accept its terms.'
    recovery =
      'Open the account-step link, accept the terms in Vercel, return here and choose Resume setup.'
    actionURL = terms[0]
  } else if (step === 'Connect automatic branch previews') {
    reason = 'Vercel could not connect to your GitHub repository.'
    recovery = `Allow the Vercel GitHub app to access ${data.owner}/${data.name}: open the account-step link, choose Configure for Vercel, and add this repository under Only select repositories. Save, return here and choose Resume setup. You do not need to allow all repositories. Also check that your GitHub account can deploy to the selected Vercel team.`
    actionURL = 'https://github.com/settings/installations'
  } else if (/blocked deployment/i.test(output)) {
    reason = 'Vercel blocked deployment for the connected GitHub account.'
    recovery =
      'Make sure the connected GitHub account can deploy to the selected Vercel team, then choose Resume setup.'
    actionURL = `https://vercel.com/${data.team}/${data.name}`
  } else if (/Deployment failed|still pending/.test(output)) {
    reason = 'The website deployment has not completed successfully.'
    recovery =
      'Open the Vercel project and review the deployment build log. Correct the reported issue before choosing Resume setup.'
    actionURL = `https://vercel.com/${data.team}/${data.name}`
  } else if (/quota|limit exceeded|maximum|plan limit/i.test(output)) {
    reason = 'The account has reached a service or plan limit.'
    recovery =
      'Review resource limits in the provider dashboard. Free capacity or choose an appropriate plan yourself, then resume. The installer will not upgrade your plan.'
  } else if (/ENOTFOUND|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(output)) {
    reason = 'The connection to the service was interrupted.'
    recovery = 'Check your internet connection and the provider status, then choose Resume setup.'
  } else if (
    /different resources|credentials are missing|another setup|Existing file differs|already exists/.test(
      output,
    )
  ) {
    reason = error.message
    recovery =
      'Correct the indicated configuration or choose the original setup folder and details, then resume. Existing content is not replaced.'
  } else if (/Prepare .* database|Connect .* AI/.test(step)) {
    reason = 'The database or AI connection could not be prepared.'
    recovery =
      'Check database availability and environment configuration. If this is a code or migration problem, keep this folder and ask your coding workspace to review the failed step before resuming. Do not reset the database.'
  } else if (/Install application dependencies/.test(step)) {
    reason = 'Application dependencies could not be installed.'
    recovery =
      'Check Node.js is version 22 or newer and npm can reach its registry. Resolve the dependency error in your coding workspace, then resume.'
  }
  return { step, reason, recovery, actionURL }
}
