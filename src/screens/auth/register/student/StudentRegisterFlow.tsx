import React, { useState } from 'react';
import { Alert } from 'react-native';

import { StepBody }       from './StepBody';
import { StepExperience } from './StepExperience';
import { StepGym }        from './StepGym';
import { StepCardio }     from './StepCardio';
import { StepDays }       from './StepDays';
import { useStudentForm, type StepDaysData } from './useStudentForm';

interface Props {
  onComplete:   (data: any) => void;
  onStepChange?: (step: number) => void;
}

export function StudentRegisterFlow({ onComplete, onStepChange }: Props) {
  const [loading, setLoading] = useState(false);

  const {
    step,
    formBody,       onBodySubmit,
    formExperience, onExperienceSubmit,
    formGym,        onGymSubmit,
    formCardio,     onCardioSubmit,
    formDays,       getFullProfile,
  } = useStudentForm();

  // Notifica o step atual para o indicador externo
  React.useEffect(() => { onStepChange?.(step - 2) }, [step]);

  const handleFinish = async (days: StepDaysData) => {
    try {
      setLoading(true);
      const full = getFullProfile(days);
      await onComplete(full);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar os dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  switch (step) {
    case 3: return <StepBody       form={formBody}       onSubmit={onBodySubmit}       />;
    case 4: return <StepExperience form={formExperience} onSubmit={onExperienceSubmit} />;
    case 5: return <StepGym        form={formGym}        onSubmit={onGymSubmit}        />;
    case 6: return <StepCardio     form={formCardio}     onSubmit={onCardioSubmit}     />;
    case 7: return <StepDays       form={formDays}       onSubmit={handleFinish} isLoading={loading} />;
    default: return null;
  }
}