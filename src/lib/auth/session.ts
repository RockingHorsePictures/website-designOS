import { createLocalReq, getFieldsToSign, jwtSign, type Payload, type TypedUser } from 'payload'
import { addSessionToUser, generatePayloadCookie } from 'payload/shared'

// Signs a user in without a password (Google sign-in, first-run setup) by creating the same
// session and token Payload's own login does, so admin logout and token refresh work normally.
export async function sessionCookie(payload: Payload, user: TypedUser) {
  const collection = payload.collections.users.config
  const req = await createLocalReq({ user }, payload)
  const { sid } = await addSessionToUser({ collectionConfig: collection, payload, req, user })
  const fieldsToSign = getFieldsToSign({
    collectionConfig: collection,
    email: user.email!,
    sid,
    user,
  })
  const { token } = await jwtSign({
    fieldsToSign,
    secret: payload.secret,
    tokenExpiration: collection.auth.tokenExpiration,
  })
  return generatePayloadCookie({
    collectionAuthConfig: collection.auth,
    cookiePrefix: payload.config.cookiePrefix,
    token,
  })
}
