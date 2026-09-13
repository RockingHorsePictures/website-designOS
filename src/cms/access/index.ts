import type { Access, FieldAccess } from 'payload'

export const authenticated: Access = ({ req }) => Boolean(req.user)
export const administrator: Access = ({ req }) => req.user?.role === 'admin'
export const adminField: FieldAccess = ({ req }) => req.user?.role === 'admin'
export const publishedOrAuthenticated: Access = ({ req }) =>
  req.user ? true : { _status: { equals: 'published' } }
