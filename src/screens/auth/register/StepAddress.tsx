import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, TextInput,
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
  const { control, handleSubmit, setValue, formState: { errors } } = form;

  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<AddressResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showList,  setShowList]  = useState(false);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Busca com debounce ───────────────────
  const handleSearch = (text: string) => {
    setQuery(text)
    setShowList(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    const digits = text.replace(/\D/g, '')

    if (digits.length === 8) {
      debounceRef.current = setTimeout(() => fetchByCep(digits), 300)
      return
    }

    if (text.length >= 4) {
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
    const ufMatch = text.match(/\b([A-Z]{2})\s*$/i)
    const uf      = ufMatch ? ufMatch[1].toUpperCase() : 'RN'
    const clean   = text.replace(/\b[A-Z]{2}\s*$/i, '').trim()
    const parts   = clean.split(/,|—|-/)
    const street  = parts[0]?.trim() ?? clean
    const city    = parts[1]?.trim() ?? ''

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
          Pesquise por CEP, rua ou cidade para preencher automaticamente.
        </Text>

        {/* Campo de busca */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por CEP, rua ou cidade..."
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

          <Controller control={control} name="state"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Estado *"
                placeholder="UF"
                maxLength={2}
                autoCapitalize="characters"
                onChangeText={v => onChange(v.toUpperCase())}
                onBlur={onBlur} value={value}
                error={errors.state?.message}
              />
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
  fields: { gap: spacing['4'] },
  row: { flexDirection: 'row', gap: spacing['3'] },
  numberField:       { width: 90 },
  neighborhoodField: { flex: 1 },
  required: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: spacing['2'],
  },
  btn: { marginTop: spacing['6'] },
});