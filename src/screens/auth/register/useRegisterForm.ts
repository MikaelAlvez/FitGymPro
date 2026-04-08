import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { UserRole } from '../../../contexts/AuthContext';

// ─── Schemas ─────────────────────────────────
export const stepOneSchema = z
  .object({
    name:            z.string({ message: 'Nome é obrigatório' })
                      .min(3, 'Nome deve ter ao menos 3 caracteres'),
    email:           z.string({ message: 'E-mail é obrigatório' })
                      .min(1, 'E-mail é obrigatório')
                      .email('E-mail inválido'),
    phone:           z.string({ message: 'Telefone é obrigatório' })
                      .min(10, 'Telefone inválido'),
    password:        z.string({ message: 'Senha é obrigatória' })
                      .min(6, 'Senha deve ter ao menos 6 caracteres'),
    confirmPassword: z.string({ message: 'Confirmação de senha é obrigatória' }),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export const stepTwoSchema = z.object({
  role: z.enum(['personal', 'student'], {
    message: 'Selecione um perfil para continuar',
  }),
});

export type StepOneData = z.infer<typeof stepOneSchema>;
export type StepTwoData = z.infer<typeof stepTwoSchema>;

export interface RegisterFormData extends StepOneData {
  role: UserRole;
}

// ─── Hook ────────────────────────────────────
export function useRegisterForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [stepOneData, setStepOneData] = useState<StepOneData | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const formOne = useForm<StepOneData>({
    resolver: zodResolver(stepOneSchema),
  });

  const formTwo = useForm<StepTwoData>({
    resolver: zodResolver(stepTwoSchema),
  });

  const goToStep2 = (data: StepOneData) => {
    setStepOneData(data);
    setStep(2);
  };

  const goBack = () => setStep(1);

  const getFullData = (data: StepTwoData): RegisterFormData => ({
    ...stepOneData!,
    role: data.role,
  });

  return {
    step,
    formOne,
    formTwo,
    avatarUri,
    setAvatarUri,
    goToStep2,
    goBack,
    getFullData,
  };
}