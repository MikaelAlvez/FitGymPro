import React, { useState } from 'react';
import { Alert } from 'react-native';

import { StepBody }   from './StepBody';
import { StepFormat } from './StepFormat';
import { StepDays }   from './StepDays';
import { usePersonalForm, type StepDaysData, type PersonalProfileData } from './usePersonalForm';

interface Props {
  onComplete:    (data: PersonalProfileData) => void;
  onStepChange?: (step: number) => void;
  onBack?:       () => void;
}

export function PersonalRegisterFlow({ onComplete, onStepChange, onBack }: Props) {
  const [loading, setLoading] = useState(false);

  const {
    step, prev,
    formBody,   onBodySubmit,
    formFormat, onFormatSubmit,
    formDays,   getFullProfile,
  } = usePersonalForm();

  React.useEffect(() => { onStepChange?.(step - 2) }, [step]);

  const handleBack = () => {
    if (step === 3) onBack?.()
    else prev()
  }

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
    case 3: return <StepBody   form={formBody}   onSubmit={onBodySubmit}   onBack={handleBack} />;
    case 4: return <StepFormat form={formFormat} onSubmit={onFormatSubmit} onBack={handleBack} />;
    case 5: return <StepDays   form={formDays}   onSubmit={handleFinish} isLoading={loading} onBack={handleBack} />;
    default: return null;
  }
}