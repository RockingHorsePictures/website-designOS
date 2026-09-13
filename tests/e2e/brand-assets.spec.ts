import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'

test('AI handoff, font upload and brand assets work across editor and website', async ({
  page,
}) => {
  await page.goto('/admin/login')
  await page
    .getByRole('textbox', { name: 'Email *', exact: true })
    .fill(process.env.SEED_EMAIL || 'editor@example.test')
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  const guide = page.getByRole('region', { name: 'Build your website with AI' })
  await expect(guide).toBeVisible()
  await expect(guide.getByLabel('Instructions to give your AI workspace')).toHaveValue(
    /AI_SITE_CONTRACT.md/,
  )
  await guide.getByLabel('What are you starting?').selectOption('new')
  await expect(guide.getByLabel('Instructions to give your AI workspace')).toHaveValue(
    /own repository, database, media storage/,
  )
  const download = page.waitForEvent('download')
  await guide.getByRole('button', { name: 'Download instructions' }).click()
  expect((await download).suggestedFilename()).toBe('website-ai-handoff.md')
  const headers = { Origin: new URL(page.url()).origin }
  const originalTheme = await (await page.request.get('/api/globals/theme?depth=0')).json()
  const originalSettings = await (
    await page.request.get('/api/globals/site-settings?depth=0')
  ).json()
  const themeKeys = [
    'bodyFont',
    'headingFont',
    'bodyFontFiles',
    'headingFontFiles',
    'bodyWeight',
    'headingWeight',
    'emphasisWeight',
  ]
  const brandKeys = ['logo', 'inverseLogo', 'siteIcon']
  let fontID: number | undefined
  let logoID: number | undefined
  try {
    const fontName = `Test font ${Date.now()}`
    await page.goto('/admin/collections/fonts/create')
    await page
      .locator('input[type="file"]')
      .setInputFiles('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')
    await page.getByRole('textbox', { name: 'Name *', exact: true }).fill(fontName)
    await page.locator('#field-weightFrom').fill('100')
    await page.locator('#field-weightTo').fill('900')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    // Read by unique name as well, keeping cleanup independent of admin response shape.
    await expect
      .poll(async () => {
        const result = await (
          await page.request.get(`/api/fonts?where[name][equals]=${encodeURIComponent(fontName)}`)
        ).json()
        fontID = result.docs?.[0]?.id
        return fontID
      })
      .toBeTruthy()
    const invalid = await page.request.post('/api/fonts', {
      headers,
      multipart: {
        _payload: JSON.stringify({
          name: 'Invalid disguised font',
          weightFrom: 400,
          style: 'normal',
        }),
        file: {
          name: 'invalid.woff2',
          mimeType: 'font/woff2',
          buffer: Buffer.from('<script>not a font</script>'),
        },
      },
    })
    expect(invalid.status()).toBe(400)
    const font = await (await page.request.get(`/api/fonts/${fontID}`)).json()
    const uploaded = await page.request.get(`/api/fonts/file/${encodeURIComponent(font.filename)}`)
    expect(uploaded.ok()).toBe(true)
    expect(await uploaded.body()).toEqual(
      readFileSync('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
    )
    await page.goto('/admin/globals/theme')
    for (const role of ['body', 'heading']) {
      await page.locator(`#field-${role}Font`).click()
      await page.getByRole('option', { name: 'Custom uploaded font', exact: true }).click()
      await page.locator(`#field-${role}FontFiles`).click()
      await page.getByRole('option', { name: fontName, exact: true }).click()
    }
    const sample = page.getByRole('region', { name: 'Typography sample' })
    await page.locator('#field-headingWeight').click()
    await page.getByRole('option', { name: 'Black — 900', exact: true }).click()
    await expect(sample).toHaveCSS('font-family', /DesignOS-body/)
    await expect(sample.getByRole('heading')).toHaveCSS('font-family', /DesignOS-heading/)
    await expect(sample.getByRole('heading')).toHaveCSS('font-weight', '900')
    expect(
      await page.evaluate(
        async () => (await document.fonts.load('400 16px "DesignOS-body"')).length,
      ),
    ).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect
      .poll(
        async () =>
          (await (await page.request.get('/api/globals/theme?depth=0')).json()).bodyFontFiles,
      )
      .toEqual([fontID])
    const logo = await page.request.post('/api/media', {
      headers,
      multipart: {
        _payload: JSON.stringify({ alt: 'Test brand logo' }),
        file: {
          name: `test-logo-${Date.now()}.png`,
          mimeType: 'image/png',
          buffer: await sharp({
            create: { width: 64, height: 64, channels: 4, background: '#345678' },
          })
            .png()
            .toBuffer(),
        },
      },
    })
    expect(logo.ok()).toBe(true)
    logoID = (await logo.json()).doc.id
    expect(
      (
        await page.request.post('/api/globals/site-settings', {
          headers,
          data: { logo: logoID, inverseLogo: logoID, siteIcon: logoID },
        })
      ).ok(),
    ).toBe(true)
    await page.goto('/admin/globals/site-settings')
    await expect(page.getByText('Main logo', { exact: true })).toBeVisible()
    await page.goto('/')
    await expect(page.locator('body')).toHaveCSS('font-family', /DesignOS-body/)
    await expect(page.locator('.site-header img')).toHaveAttribute(
      'alt',
      originalSettings.companyName,
    )
    await expect
      .poll(() =>
        page.locator('.site-header img').evaluate((el) => (el as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0)
    await expect(page.locator('link[rel="icon"]').last()).toHaveAttribute('href', /test-logo-/)
    expect(
      await page.evaluate(
        async () => (await document.fonts.load('700 24px "DesignOS-heading"')).length,
      ),
    ).toBeGreaterThan(0)
    const home = await (await page.request.get('/api/pages?where[slug][equals]=home')).json()
    await page.goto(`/editor/${home.docs[0].id}`)
    await expect(page.frameLocator('iframe').first().getByRole('heading').first()).toHaveCSS(
      'font-family',
      /DesignOS-heading/,
    )
    const frame = page.frames().find((frame) => frame !== page.mainFrame())!
    expect(
      await frame.evaluate(
        async () => (await document.fonts.load('700 24px "DesignOS-heading"')).length,
      ),
    ).toBeGreaterThan(0)
  } finally {
    expect(
      (
        await page.request.post('/api/globals/theme', {
          headers,
          data: Object.fromEntries(themeKeys.map((k) => [k, originalTheme[k] ?? null])),
        })
      ).ok(),
    ).toBe(true)
    expect(
      (
        await page.request.post('/api/globals/site-settings', {
          headers,
          data: Object.fromEntries(brandKeys.map((k) => [k, originalSettings[k] ?? null])),
        })
      ).ok(),
    ).toBe(true)
    if (fontID)
      expect((await page.request.delete(`/api/fonts/${fontID}`, { headers })).ok()).toBe(true)
    if (logoID)
      expect((await page.request.delete(`/api/media/${logoID}`, { headers })).ok()).toBe(true)
  }
})
