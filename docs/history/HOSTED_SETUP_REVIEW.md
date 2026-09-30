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

These credentials grant access to the new preview editing system. They are not copied from any other project. Local copies live in ignored `.local/` files, never Git. No existing production database, company website or unrelated Vercel project is changed.

The preview login is kept in `.local/preview-access.txt`. Temporary BOOTSTRAP_EMAIL and BOOTSTRAP_PASSWORD variables have been removed from Vercel after database initialization; the editor can change their password in Account.

## Approved initial bootstrap — completed

Vercel classifies a new project's first deployment as Production even when Preview is requested. The user explicitly approved a credential-free static bootstrap after automatic approval review stopped further retries. The two-file “Not launched” deployment completed as dpl_DZeeQ7RpQh4g6tAhBXpsttLNZB2R. Vercel still attached a default alias despite the skip-domain flag; that alias was immediately removed and verified to return 404. The hashed bootstrap URL requires Vercel authentication. No company application runs in Production.

The Next.js project settings were restored, and pushing foundation/design-os then correctly triggered a Preview build. The actual application uses the previously approved isolated Preview resources. The main branch remains unchanged. The Preview at https://designos-preview-rockinghorse.vercel.app requires Vercel authentication, followed by a separate CMS editor login at /admin.

Packaging exclusions and strengthened environment guards are committed and pushed. Both local and hosted browser suites pass. See IMPLEMENTATION_STATUS.md for the final deployment and persistence verification record.
