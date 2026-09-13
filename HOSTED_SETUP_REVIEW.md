# Hosted foundation setup

Destination: Vercel project `company-design-os` in `Rocking Horse Pictures' projects`.
Project ID: `prj_RNLDFdyePS9RiAXEm5CXQbqPawTn`.

Already provisioned:

- Free Neon database `designos-preview`, London, connected to Preview only.
- Public website-media Blob store `designos-preview-media`, London, connected to Preview only.
- Private GitHub repository `RockingHorsePictures/website-designOS`.

Completed with explicit Preview setup approval:

- Upload newly generated Payload signing secret, scheduled-job secret and initial editor bootstrap password as encrypted **Preview-only** environment variables.
- Configure environment labels as Preview, schema push off, runtime AI off and the intended preview URL.
- Apply the committed initial schema migration to `designos-preview`.
- Seed explicitly labelled test content and the initial editor account in that new preview database.

These credentials grant access to the new preview editing system. They are not copied from any other project. Local copies live in ignored `.local/` files, never Git. No production environment, production database, existing company website or unrelated Vercel project is changed.

The preview login is kept in `.local/preview-access.txt`. Temporary BOOTSTRAP_EMAIL and BOOTSTRAP_PASSWORD variables have been removed from Vercel after database initialization; the editor can change their password in Account.

## Additional deployment approval pending

Vercel classifies a new project's first deployment as Production even when Preview is requested. Production has no app database/signing credentials, and no application is serving. Earlier unintended deployments were removed; the remaining initial build failed. Automatic approval review rejected further deployment retries pending an explicit exception.

Prepared under ignored `.local/bootstrap/`: a static “Not launched” index.html and a noindex vercel.json. Dry-run verification lists exactly those two files. Proposed action: deploy that credential-free bootstrap to this existing project with Production classification and domain assignment skipped; its hashed URL remains behind the existing Vercel protection. Then restore the Next.js project settings and deploy the real foundation to Preview with the previously approved isolated resources. This does not merge or modify main, create a company website design, or use existing production data.

The packaging exclusions, strengthened environment guards and latest evidence are committed locally. Their push is deferred because pushing would trigger another deployment before this approval is resolved.
