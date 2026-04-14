// ─── Máscara ─────────────────────────────────
export function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

// ─── Validação ───────────────────────────────
export function isValidDate(date: string): boolean {
  const digits = date.replace(/\D/g, '')
  if (digits.length !== 8) return false

  const day   = parseInt(digits.slice(0, 2))
  const month = parseInt(digits.slice(2, 4))
  const year  = parseInt(digits.slice(4, 8))

  if (month < 1 || month > 12) return false
  if (day   < 1 || day   > 31) return false
  if (year  < 1900)            return false

  // Valida dias por mês (considera anos bissextos)
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day > daysInMonth) return false

  // Não permite datas futuras
  const today     = new Date()
  const inputDate = new Date(year, month - 1, day)
  if (inputDate > today) return false

  // Idade mínima de 10 anos
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() - 10)
  if (inputDate > minDate) return false

  return true
}