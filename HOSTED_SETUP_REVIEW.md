# Hosted foundation setup

Destination: Vercel project `company-design-os` in `Rocking Horse Pictures' projects`.
Project ID: `prj_RNLDFdyePS9RiAXEm5CXQbqPawTn`.

Already provisioned:

- Free Neon database `designos-preview`, London, connected to Preview only.
- Public website-media Blob store `designos-preview-media`, London, connected to Preview only.
- Private GitHub repository `RockingHorsePictures/website-designOS`.

Prepared next action:

- Upload newly generated Payload signing secret, scheduled-job secret and initial editor bootstrap password as encrypted **Preview-only** environment variables.
- Configure environment labels as Preview, schema push off, runtime AI off and the intended preview URL.
- Apply the committed initial schema migration to `designos-preview`.
- Seed explicitly labelled test content and the initial editor account in that new preview database.

These credentials grant access to the new preview editing system. They are not copied from any other project. Local copies live in ignored `.local/` files, never Git. No production environment, production database, existing company website or unrelated Vercel project is changed.

The preview login is kept in `.local/preview-access.txt`. Bootstrap variables will be removed from Vercel after initialization; the editor can then change their password in Account.
