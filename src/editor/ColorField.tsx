'use client'
import { TextField, useField } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { validColor } from '../design-system/tokens'

export const ColorField: TextFieldClientComponent = (props) => {
  const { value, setValue, disabled } = useField<string>({ path: props.path })
  const label = typeof props.field.label === 'string' ? props.field.label : props.field.name
  return (
    <div className="dos-color-field">
      <TextField {...props} />
      <input
        type="color"
        aria-label={`Choose ${label} colour`}
        value={validColor(value) ? value : '#ffffff'}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled || props.readOnly}
      />
    </div>
  )
}
