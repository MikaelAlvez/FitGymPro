import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { isValidDate } from '../../../../utils/date';

// ─── Enums ───────────────────────────────────
export type ClassFormat = 'presential' | 'online' | 'hybrid';
export type WeekDay =
  | 'monday' | 'tuesday' | 'wednesday'
  | 'thursday' | 'friday' | 'saturday' | 'sunday';

export const WEEK_DAYS: { value: WeekDay; label: string }[] = [
  { value: 'monday',    label: 'Segunda-feira' },
  { value: 'tuesday',   label: 'Terça-feira'   },
  { value: 'wednesday', label: 'Quarta-feira'  },
  { value: 'thursday',  label: 'Quinta-feira'  },
  { value: 'friday',    label: 'Sexta-feira'   },
  { value: 'saturday',  label: 'Sábado'        },
  { value: 'sunday',    label: 'Domingo'       },
];

// ─── Schemas ─────────────────────────────────
export const stepBodySchema = z.object({
  sex:            z.string({ message: 'Sexo é obrigatório' })
                   .min(1, 'Sexo é obrigatório'),
  birthDate:      z.string({ message: 'Data de nascimento é obrigatória' })
                   .min(10, 'Data inválida')
                   .refine(isValidDate, { message: 'Data de nascimento inválida' }),
  weight:         z.string({ message: 'Peso é obrigatório' })
                   .min(1, 'Peso é obrigatório'),
  height:         z.string({ message: 'Altura é obrigatória' })
                   .min(1, 'Altura é obrigatória'),
  course:         z.string({ message: 'Curso é obrigatório' })
                   .min(3, 'Informe o curso'),
  university:     z.string({ message: 'Universidade é obrigatória' })
                   .min(3, 'Informe a universidade'),
  educationLevel: z.string({ message: 'Nível de formação é obrigatório' })
                   .min(1, 'Selecione o nível de formação'),
  cref:           z.string({ message: 'CREF é obrigatório' })
                   .min(3, 'CREF inválido'),
});

export const stepFormatSchema = z.object({
  format: z.enum(['presential', 'online', 'hybrid'], {
    message: 'Selecione o formato das aulas',
  }),
});

export const stepDaysSchema = z.object({
  days: z.array(z.enum([
    'monday','tuesday','wednesday','thursday','friday','saturday','sunday',
  ])).min(1, 'Selecione ao menos um dia'),
});

export type StepBodyData   = z.infer<typeof stepBodySchema>;
export type StepFormatData = z.infer<typeof stepFormatSchema>;
export type StepDaysData   = z.infer<typeof stepDaysSchema>;

export interface PersonalProfileData
  extends StepBodyData, StepFormatData, StepDaysData {}

// ─── Hook ────────────────────────────────────
export type PersonalStep = 3 | 4 | 5;

export function usePersonalForm() {
  const [step, setStep] = useState<PersonalStep>(3);

  const [bodyData,   setBodyData]   = useState<StepBodyData | null>(null);
  const [formatData, setFormatData] = useState<StepFormatData | null>(null);

  const formBody   = useForm<StepBodyData>  ({ resolver: zodResolver(stepBodySchema)   });
  const formFormat = useForm<StepFormatData>({ resolver: zodResolver(stepFormatSchema) });
  const formDays   = useForm<StepDaysData>  ({ resolver: zodResolver(stepDaysSchema)   });

  const next = () => setStep(s => Math.min(s + 1, 5) as PersonalStep);
  const prev = () => setStep(s => Math.max(s - 1, 3) as PersonalStep);

  const onBodySubmit   = (d: StepBodyData)   => { setBodyData(d);   next(); };
  const onFormatSubmit = (d: StepFormatData) => { setFormatData(d); next(); };

  const getFullProfile = (days: StepDaysData): PersonalProfileData => ({
    ...bodyData!,
    ...formatData!,
    ...days,
  });

  return {
    step, prev,
    formBody,   onBodySubmit,
    formFormat, onFormatSubmit,
    formDays,   getFullProfile,
  };
}