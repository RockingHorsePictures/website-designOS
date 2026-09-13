const token = location.hash.slice(1) || sessionStorage.getItem('designos-launch-token')
if (token) sessionStorage.setItem('designos-launch-token', token)
history.replaceState(null, '', location.pathname)
const $ = (id) => document.getElementById(id)
let connected = false
let restoredDetails = false
let actionError = ''
async function api(path, data) {
  const response = await fetch(`/api/${path}`, {
    method: data ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(data ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error)
  return result
}
function options(element, items, key, label) {
  const selected = element.value
  element.replaceChildren(
    ...items.map((item) => {
      const option = document.createElement('option')
      option.value = typeof item === 'string' ? item : item[key]
      option.textContent = typeof item === 'string' ? item : item[label] || item[key]
      return option
    }),
  )
  if ([...element.options].some((option) => option.value === selected)) element.value = selected
}
function render(state) {
  $('version').textContent = `v${state.version}`
  $('footer-version').textContent = state.version
  $('status').textContent = state.message
  $('error').textContent = actionError || (state.failure ? '' : state.error || '')
  $('failure').hidden = !state.failure
  if (state.failure) {
    $('failed-step').textContent = state.failure.step
    $('failed-reason').textContent = state.failure.reason
    $('failed-recovery').textContent = state.failure.recovery
  }
  $('auth').hidden = !state.authURL
  if (state.authURL) $('auth').href = state.authURL
  if (state.github) {
    $('github-state').textContent = `Connected as ${state.github.login}`
    if (!connected) {
      options($('owner'), state.github.owners)
      connected = true
    }
  }
  if (state.teams.length) options($('team'), state.teams, 'slug', 'name')
  if (state.details && !restoredDetails) {
    for (const [name, value] of Object.entries(state.details)) {
      const field = $('details').elements.namedItem(name)
      if (field) field.value = value
    }
    restoredDetails = true
  }
  $('details').hidden = !state.github || !state.teams.length || state.step === 'done'
  $('connect').hidden = state.step === 'install' || state.step === 'done'
  $('progress').hidden = !['install', 'paused'].includes(state.step)
  $('resume').disabled = state.busy
  $('install').disabled = state.busy
  $('install').hidden = Boolean(state.failure)
  $('install').textContent = state.error
    ? 'Resume setup'
    : state.busy
      ? 'Setting up…'
      : 'Create my website'
  $('login-vercel').disabled = state.busy
  $('refresh').disabled = state.busy
  $('events').replaceChildren(
    ...state.events.map((text) => {
      const li = document.createElement('li')
      li.textContent = text
      return li
    }),
  )
  if (state.result) {
    $('done').hidden = false
    $('links').replaceChildren(
      ...[
        ['Open admin', state.result.admin],
        ['View Preview', state.result.preview],
        ['View Live', state.result.live],
        ['Open repository', state.result.repository],
      ].map(([label, url]) => {
        const link = document.createElement('a')
        link.className = 'button'
        link.href = url
        link.textContent = label
        link.target = '_blank'
        link.rel = 'noreferrer'
        return link
      }),
    )
    $('folder-result').textContent = `Your website folder: ${state.result.folder}`
    $('details').reset()
  }
}
async function act(fn, polling = false) {
  if (!polling) actionError = ''
  try {
    render(await fn())
  } catch (error) {
    if (!polling) actionError = error.message
    $('error').textContent = error.message
  }
}
$('refresh').onclick = () =>
  act(async () => {
    const result = await api('connect', { githubToken: $('github-token').value })
    $('github-token').value = ''
    return result
  })
$('login-vercel').onclick = () => act(() => api('login-vercel', {}))
$('details').onsubmit = (event) => {
  event.preventDefault()
  const data = Object.fromEntries(new FormData(event.target))
  data.approved = Boolean(data.approved)
  void act(() => api('install', data))
}
$('resume').onclick = () => $('details').requestSubmit()
$('close').onclick = async () => {
  await api('close', {})
  $('status').textContent = 'Setup finished. You can close this tab and terminal.'
  clearInterval(poll)
  sessionStorage.removeItem('designos-launch-token')
}
const poll = setInterval(() => act(() => api('status'), true), 2500)
void act(() => api('status'))
