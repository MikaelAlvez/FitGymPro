import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { isValidCpf } from '../../../utils/cpf';
import type { UserRole } from '../../../contexts/AuthContext';

// ─── Schemas ─────────────────────────────────
export const stepOneSchema = z
  .object({
    name:            z.string({ message: 'Nome é obrigatório' })
                      .min(3, 'Nome deve ter ao menos 3 caracteres'),
    cpf:             z.string({ message: 'CPF é obrigatório' })
                      .min(14, 'CPF inválido')
                      .refine(isValidCpf, { message: 'CPF inválido' }),
    email:           z.string({ message: 'E-mail é obrigatório' })
                      .min(1, 'E-mail é obrigatório')
                      .email('E-mail inválido'),
    phone:           z.string({ message: 'Telefone é obrigatório' })
                      .min(14, 'Telefone inválido'),
    password:        z.string({ message: 'Senha é obrigatória' })
                      .min(6, 'Senha deve ter ao menos 6 caracteres'),
    confirmPassword: z.string({ message: 'Confirmação de senha é obrigatória' }),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path:    ['confirmPassword'],
  });

export const stepAddressSchema = z.object({
  cep:          z.string().optional(),
  street:       z.string().optional(),
  number:       z.string().optional(),
  neighborhood: z.string().optional(),
  city:         z.string({ message: 'Cidade é obrigatória' }).min(2, 'Cidade é obrigatória'),
  state:        z.string({ message: 'Estado é obrigatório' }).min(2, 'Estado é obrigatório'),
});

export const stepTwoSchema = z.object({
  role: z.enum(['PERSONAL', 'STUDENT'], {
    message: 'Selecione um perfil para continuar',
  }),
});

export type StepOneData    = z.infer<typeof stepOneSchema>;
export type StepAddressData = z.infer<typeof stepAddressSchema>;
export type StepTwoData    = z.infer<typeof stepTwoSchema>;

export interface RegisterFormData extends StepOneData {
  role:    UserRole;
  address: StepAddressData;
}

// ─── Hook ────────────────────────────────────
export function useRegisterForm() {
  const [step,        setStep]        = useState<1 | 2 | 3>(1);
  const [stepOneData, setStepOneData] = useState<StepOneData | null>(null);
  const [stepAddressData, setStepAddressData] = useState<StepAddressData | null>(null);
  const [avatarUri,   setAvatarUri]   = useState<string | null>(null);

  const formOne     = useForm<StepOneData>    ({ resolver: zodResolver(stepOneSchema)     });
  const formAddress = useForm<StepAddressData>({ resolver: zodResolver(stepAddressSchema) });
  const formTwo     = useForm<StepTwoData>    ({ resolver: zodResolver(stepTwoSchema)     });

  const goToStep2 = (data: StepOneData)     => { setStepOneData(data);    setStep(2); };
  const goToStep3 = (data: StepAddressData) => { setStepAddressData(data); setStep(3); };
  const goBack    = () => setStep(s => Math.max(s - 1, 1) as 1 | 2 | 3);

  const getFullData = (data: StepTwoData): RegisterFormData => ({
    ...stepOneData!,
    role:    data.role as UserRole,
    address: stepAddressData!,
  });

  return {
    step,
    formOne,
    formAddress,
    formTwo,
    avatarUri,
    setAvatarUri,
    goToStep2,
    goToStep3,
    goBack,
    setStep,
    getFullData,
  };
}