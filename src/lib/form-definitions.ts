// Form definitions shared by the website, the composer and the submission route. No server-only
// imports: this module is bundled for the browser too.
export type PublicFormField = {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'number' | 'date' | 'url'
  required?: boolean | null
  width?: 'full' | 'half' | null
  placeholder?: string | null
  help?: string | null
  options?: { label: string; value: string }[] | null
}
// What the website needs to render and validate a form. Delivery settings are never included.
export type PublicForm = {
  id: number | 'contact'
  fields: PublicFormField[]
  submitLabel: string
  successMessage: string
  redirect?: string | null
}
export const contactForm: PublicForm = {
  id: 'contact',
  submitLabel: 'Send',
  successMessage: 'Thank you. We will reply soon.',
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'message', label: 'Message', type: 'textarea', required: true },
  ],
}
export function publicForm(doc: Record<string, unknown>): PublicForm {
  return {
    id: Number(doc.id),
    fields: ((doc.fields as PublicFormField[]) || []).map((f) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      required: Boolean(f.required),
      width: f.width || 'full',
      placeholder: f.placeholder || '',
      help: f.help || '',
      options: (f.options || []).map((o) => ({ label: o.label, value: o.value })),
    })),
    submitLabel: String(doc.submitLabel || 'Send'),
    successMessage: String(doc.successMessage || 'Thank you.'),
    redirect: (doc.redirect as string) || null,
  }
}

const limits: Record<PublicFormField['type'], number> = {
  text: 300,
  email: 320,
  tel: 40,
  textarea: 5000,
  select: 200,
  checkbox: 5,
  number: 40,
  date: 10,
  url: 2000,
}
// Validates raw input against the form definition; unknown keys are dropped.
export function validateSubmission(form: PublicForm, raw: Record<string, unknown>) {
  const data: Record<string, string | boolean> = {}
  const errors: string[] = []
  for (const field of form.fields) {
    const value = raw[field.name]
    if (field.type === 'checkbox') {
      const checked = value === true || value === 'on' || value === 'true'
      if (field.required && !checked) errors.push(`${field.label} is required.`)
      data[field.name] = checked
      continue
    }
    const text = typeof value === 'string' ? value.trim() : ''
    if (!text) {
      if (field.required) errors.push(`${field.label} is required.`)
      continue
    }
    if (text.length > limits[field.type]) errors.push(`${field.label} is too long.`)
    else if (field.type === 'email' && !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(text))
      errors.push(`${field.label} must be an email address.`)
    else if (field.type === 'number' && !/^-?\d+(\.\d+)?$/.test(text))
      errors.push(`${field.label} must be a number.`)
    else if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(text))
      errors.push(`${field.label} must be a date.`)
    else if (field.type === 'url' && !/^https?:\/\/\S+$/.test(text))
      errors.push(`${field.label} must be a web address.`)
    else if (field.type === 'select' && !(field.options || []).some((o) => o.value === text))
      errors.push(`Choose an option for ${field.label}.`)
    else data[field.name] = text
  }
  return { data, errors }
}
