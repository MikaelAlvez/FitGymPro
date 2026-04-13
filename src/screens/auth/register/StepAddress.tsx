import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, TextInput, Modal, FlatList,
} from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';

import { Input }  from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import {
  searchByCep,
  searchByAddress,
  type AddressResult,
} from '../../../services/address.service';
import type { StepAddressData } from './useRegisterForm';
import { colors, typography, spacing, radii, shadows } from '../../../theme';

// ─── Estados brasileiros ─────────────────────
const STATES = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
]

// ─── Máscara CEP ─────────────────────────────
function maskCep(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

interface Props {
  form:     UseFormReturn<StepAddressData>;
  onSubmit: (data: StepAddressData) => void;
}

export function StepAddress({ form, onSubmit }: Props) {
  const { control, handleSubmit, setValue, watch, formState: { errors } } = form;

  const [query,      setQuery]      = useState('');
  const [results,    setResults]    = useState<AddressResult[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [showList,   setShowList]   = useState(false);
  const [stateModal, setStateModal] = useState(false);
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedState = watch('state') ?? ''

  // ─── Busca com debounce (mín. 3 chars) ───────
  const handleSearch = (text: string) => {
    setQuery(text)
    setShowList(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    const digits = text.replace(/\D/g, '')

    // CEP completo (8 dígitos) → busca direta
    if (digits.length === 8) {
      debounceRef.current = setTimeout(() => fetchByCep(digits), 300)
      return
    }

    // Texto livre com mínimo 3 chars
    if (text.length >= 3) {
      debounceRef.current = setTimeout(() => fetchByText(text), 600)
    } else {
      setResults([])
    }
  }

  const fetchByCep = async (cep: string) => {
    try {
      setSearching(true)
      const result = await searchByCep(cep)
      if (result) {
        fillForm(result)
        setResults([])
        setShowList(false)
      }
    } catch {
      // silencia
    } finally {
      setSearching(false)
    }
  }

  const fetchByText = async (text: string) => {
    // Tenta usar UF selecionada ou extrai do texto
    const ufMatch  = text.match(/\b([A-Z]{2})\s*$/i)
    const uf       = ufMatch
      ? ufMatch[1].toUpperCase()
      : selectedState || 'SP'
    const clean    = text.replace(/\b[A-Z]{2}\s*$/i, '').trim()
    const parts    = clean.split(/,|—|-/)
    const street   = parts[0]?.trim() ?? clean
    const city     = parts[1]?.trim() ?? ''

    try {
      setSearching(true)
      const res = await searchByAddress(uf, city || street, city ? street : street)
      setResults(res)
      setShowList(res.length > 0)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const fillForm = (addr: AddressResult) => {
    setValue('cep',          maskCep(addr.cep))
    setValue('street',       addr.street)
    setValue('neighborhood', addr.neighborhood)
    setValue('city',         addr.city)
    setValue('state',        addr.state)
    setQuery(`${addr.street}, ${addr.city} - ${addr.state}`)
    setShowList(false)
  }

  const selectedStateName = STATES.find(s => s.uf === selectedState)

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Endereço</Text>
        <Text style={styles.subtitle}>
          Pesquise por CEP, rua ou cidade (mín. 3 caracteres).
        </Text>

        {/* Campo de busca */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="CEP, rua ou cidade..."
              placeholderTextColor={colors.textDisabled}
              value={query}
              onChangeText={handleSearch}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searching && (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: spacing['2'] }} />
            )}
            {query.length > 0 && !searching && (
              <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setShowList(false) }}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Resultados */}
          {showList && results.length > 0 && (
            <View style={styles.resultList}>
              {results.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.resultItem, i < results.length - 1 && styles.resultDivider]}
                  onPress={() => fillForm(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location-outline" size={16} color={colors.primary} />
                  <View style={styles.resultText}>
                    <Text style={styles.resultMain} numberOfLines={1}>
                      {item.street || item.neighborhood}
                    </Text>
                    <Text style={styles.resultSub}>
                      {item.city} - {item.state} · {item.cep}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Campos */}
        <View style={styles.fields}>
          <Controller control={control} name="cep"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="CEP"
                placeholder="00000-000"
                keyboardType="numeric"
                maxLength={9}
                onChangeText={raw => onChange(maskCep(raw))}
                onBlur={onBlur} value={value}
                error={errors.cep?.message}
              />
            )}
          />

          <Controller control={control} name="street"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Rua"
                placeholder="Nome da rua"
                onChangeText={onChange} onBlur={onBlur} value={value}
                error={errors.street?.message}
              />
            )}
          />

          <View style={styles.row}>
            <View style={styles.numberField}>
              <Controller control={control} name="number"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Nº"
                    placeholder="123"
                    keyboardType="numeric"
                    onChangeText={onChange} onBlur={onBlur} value={value}
                    error={errors.number?.message}
                  />
                )}
              />
            </View>
            <View style={styles.neighborhoodField}>
              <Controller control={control} name="neighborhood"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Bairro"
                    placeholder="Bairro"
                    onChangeText={onChange} onBlur={onBlur} value={value}
                    error={errors.neighborhood?.message}
                  />
                )}
              />
            </View>
          </View>

          <Controller control={control} name="city"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Cidade *"
                placeholder="Sua cidade"
                onChangeText={onChange} onBlur={onBlur} value={value}
                error={errors.city?.message}
              />
            )}
          />

          {/* Estado — picker */}
          <Controller control={control} name="state"
            render={({ field: { onChange, value } }) => (
              <View style={styles.selectorWrapper}>
                <Text style={styles.selectorLabel}>Estado *</Text>
                <TouchableOpacity
                  style={[styles.selectorBox, errors.state ? styles.selectorBoxError : null]}
                  onPress={() => setStateModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={value ? styles.selectorValue : styles.selectorPlaceholder}>
                    {value
                      ? `${value} — ${STATES.find(s => s.uf === value)?.name}`
                      : 'Selecione o estado'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                {errors.state && (
                  <Text style={styles.errorText}>{errors.state.message}</Text>
                )}

                {/* Modal de seleção */}
                <Modal
                  visible={stateModal}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setStateModal(false)}
                >
                  <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setStateModal(false)}
                  />
                  <View style={styles.sheet}>
                    <View style={styles.sheetHeader}>
                      <Text style={styles.sheetTitle}>Selecione o estado</Text>
                      <TouchableOpacity onPress={() => setStateModal(false)}>
                        <Ionicons name="close" size={22} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <FlatList
                      data={STATES}
                      keyExtractor={s => s.uf}
                      renderItem={({ item }) => {
                        const active = item.uf === value
                        return (
                          <TouchableOpacity
                            style={[styles.stateOption, active && styles.stateOptionActive]}
                            onPress={() => { onChange(item.uf); setStateModal(false) }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.stateUfBadge}>
                              <Text style={styles.stateUf}>{item.uf}</Text>
                            </View>
                            <Text style={[styles.stateName, active && styles.stateNameActive]}>
                              {item.name}
                            </Text>
                            {active && (
                              <Ionicons name="checkmark" size={18} color={colors.primary} />
                            )}
                          </TouchableOpacity>
                        )
                      }}
                    />
                  </View>
                </Modal>
              </View>
            )}
          />
        </View>

        <Text style={styles.required}>* Campos obrigatórios</Text>

        <Button
          label="Continuar"
          onPress={handleSubmit(onSubmit)}
          style={styles.btn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing['6'],
    paddingBottom: spacing['10'],
  },
  sectionTitle: {
    fontFamily: typography.family.bold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    marginTop: spacing['4'],
    marginBottom: spacing['1'],
  },
  subtitle: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing['5'],
  },

  // Search
  searchWrapper: { marginBottom: spacing['5'], zIndex: 10 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 52,
    paddingHorizontal: spacing['4'],
    gap: spacing['2'],
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.family.regular,
    fontSize: typography.size.base,
    color: colors.textPrimary,
    height: '100%',
  },
  resultList: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing['1'],
    ...shadows.md,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    paddingVertical: spacing['3'],
    paddingHorizontal: spacing['4'],
  },
  resultDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  resultText:  { flex: 1 },
  resultMain: {
    fontFamily: typography.family.medium,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  resultSub: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Form
  fields: { gap: spacing['4'] },
  row:    { flexDirection: 'row', gap: spacing['3'] },
  numberField:       { width: 90 },
  neighborhoodField: { flex: 1 },

  // Selector
  selectorWrapper: { gap: spacing['1'] },
  selectorLabel: {
    fontFamily: typography.family.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing['1'],
  },
  selectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 52,
    paddingHorizontal: spacing['4'],
  },
  selectorBoxError: { borderColor: colors.error },
  selectorValue: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  selectorPlaceholder: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.base,
    color: colors.textDisabled,
  },
  errorText: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.error,
    marginTop: spacing['1'],
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    maxHeight: '70%',
    paddingBottom: spacing['8'],
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing['6'],
    paddingVertical: spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontFamily: typography.family.semiBold,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  stateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    paddingVertical: spacing['3'],
    paddingHorizontal: spacing['6'],
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  stateOptionActive: { backgroundColor: colors.surfaceHigh },
  stateUfBadge: {
    width: 36, height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateUf: {
    fontFamily: typography.family.bold,
    fontSize: typography.size.xs,
    color: colors.primary,
  },
  stateName: {
    flex: 1,
    fontFamily: typography.family.regular,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  stateNameActive: {
    fontFamily: typography.family.semiBold,
    color: colors.primary,
  },

  required: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: spacing['2'],
  },
  btn: { marginTop: spacing['6'] },
});