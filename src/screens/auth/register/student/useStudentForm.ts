import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { isValidDate } from '../../../../utils/date';

// ─── Enums ───────────────────────────────────
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type GymType         = 'basic' | 'advanced';
export type CardioOption    = 'include' | 'exclude';
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
  weight:      z.string({ message: 'Peso é obrigatório' })
                .min(1, 'Peso é obrigatório'),
  height:      z.string({ message: 'Altura é obrigatória' })
                .min(1, 'Altura é obrigatória'),
  goal:        z.string({ message: 'Objetivo é obrigatório' })
                .min(1, 'Objetivo é obrigatório'),
  focusMuscle: z.string({ message: 'Músculo foco é obrigatório' })
                .min(3, 'Descreva o músculo foco'),
});

export const stepExperienceSchema = z.object({
  experience: z.enum(['beginner', 'intermediate', 'advanced'], {
    message: 'Selecione seu nível',
  }),
});

export const stepGymSchema = z.object({
  gymType: z.enum(['basic', 'advanced'], {
    message: 'Selecione o tipo de academia',
  }),
});

export const stepCardioSchema = z.object({
  cardio: z.enum(['include', 'exclude'], {
    message: 'Selecione uma opção',
  }),
});

export const stepDaysSchema = z.object({
  days: z.array(z.enum([
    'monday','tuesday','wednesday','thursday','friday','saturday','sunday',
  ])).min(1, 'Selecione ao menos um dia'),
});

export type StepBodyData       = z.infer<typeof stepBodySchema>;
export type StepExperienceData = z.infer<typeof stepExperienceSchema>;
export type StepGymData        = z.infer<typeof stepGymSchema>;
export type StepCardioData     = z.infer<typeof stepCardioSchema>;
export type StepDaysData       = z.infer<typeof stepDaysSchema>;

export interface StudentProfileData
  extends StepBodyData, StepExperienceData,
          StepGymData, StepCardioData, StepDaysData {}

// ─── Hook ────────────────────────────────────
export type StudentStep = 3 | 4 | 5 | 6 | 7;

export function useStudentForm() {
  const [step, setStep] = useState<StudentStep>(3);

  const [bodyData,       setBodyData]       = useState<StepBodyData | null>(null);
  const [experienceData, setExperienceData] = useState<StepExperienceData | null>(null);
  const [gymData,        setGymData]        = useState<StepGymData | null>(null);
  const [cardioData,     setCardioData]     = useState<StepCardioData | null>(null);

  const formBody       = useForm<StepBodyData>      ({ resolver: zodResolver(stepBodySchema) });
  const formExperience = useForm<StepExperienceData>({ resolver: zodResolver(stepExperienceSchema) });
  const formGym        = useForm<StepGymData>       ({ resolver: zodResolver(stepGymSchema) });
  const formCardio     = useForm<StepCardioData>    ({ resolver: zodResolver(stepCardioSchema) });
  const formDays       = useForm<StepDaysData>      ({ resolver: zodResolver(stepDaysSchema) });

  const next = () => setStep(s => Math.min(s + 1, 7) as StudentStep);
  const prev = () => setStep(s => Math.max(s - 1, 3) as StudentStep);

  const onBodySubmit       = (d: StepBodyData)       => { setBodyData(d);       next(); };
  const onExperienceSubmit = (d: StepExperienceData) => { setExperienceData(d); next(); };
  const onGymSubmit        = (d: StepGymData)        => { setGymData(d);        next(); };
  const onCardioSubmit     = (d: StepCardioData)     => { setCardioData(d);     next(); };

  const getFullProfile = (days: StepDaysData): StudentProfileData => ({
    ...bodyData!,
    ...experienceData!,
    ...gymData!,
    ...cardioData!,
    ...days,
  });

  return {
    step, prev,
    formBody,       onBodySubmit,
    formExperience, onExperienceSubmit,
    formGym,        onGymSubmit,
    formCardio,     onCardioSubmit,
    formDays,       getFullProfile,
  };
}