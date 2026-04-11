// ViaCEP — API gratuita de CEP brasileiro
const VIA_CEP = 'https://viacep.com.br/ws'

export interface AddressResult {
  cep:        string
  street:     string   // logradouro
  number:     string
  city:       string   // localidade
  state:      string   // uf
  neighborhood: string // bairro
}

interface ViaCepResponse {
  cep:         string
  logradouro:  string
  bairro:      string
  localidade:  string
  uf:          string
  erro?:       boolean
}

// ─── Busca por CEP ────────────────────────────
export async function searchByCep(cep: string): Promise<AddressResult | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null

  const res  = await fetch(`${VIA_CEP}/${digits}/json/`)
  const data: ViaCepResponse = await res.json()

  if (data.erro) return null

  return {
    cep:          data.cep,
    street:       data.logradouro,
    number:       '',
    city:         data.localidade,
    state:        data.uf,
    neighborhood: data.bairro,
  }
}

// ─── Busca por logradouro + UF (mínimo 3 chars) ─
export async function searchByAddress(
  uf: string,
  city: string,
  street: string,
): Promise<AddressResult[]> {
  if (street.length < 3 || city.length < 3) return []

  const url = `${VIA_CEP}/${encodeURIComponent(uf)}/${encodeURIComponent(city)}/${encodeURIComponent(street)}/json/`
  const res  = await fetch(url)
  const data: ViaCepResponse[] = await res.json()

  if (!Array.isArray(data)) return []

  return data.slice(0, 10).map(d => ({
    cep:          d.cep,
    street:       d.logradouro,
    number:       '',
    city:         d.localidade,
    state:        d.uf,
    neighborhood: d.bairro,
  }))
}