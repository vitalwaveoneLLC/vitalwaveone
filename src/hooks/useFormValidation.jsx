// src/hooks/useFormValidation.jsx
// React hook for form validation with Zod schemas
import { useState, useCallback } from 'react';
import { validateData } from '../../lib/validation';

export function useFormValidation(schema) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error on change
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }, [errors]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
  }, []);

  const validateForm = useCallback(async (formValues = values) => {
    const { valid, errors: validationErrors } = await validateData(schema, formValues);

    if (!valid) {
      setErrors(validationErrors || {});
      return false;
    }

    setErrors({});
    return true;
  }, [schema, values]);

  const resetForm = useCallback((initialValues = {}) => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, []);

  const handleSubmit = useCallback((onSubmit) => {
    return async (e) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
        const isValid = await validateForm(values);
        if (isValid) {
          await onSubmit(values);
        }
      } catch (err) {
        console.error('Form submission error:', err);
      } finally {
        setIsSubmitting(false);
      }
    };
  }, [values, validateForm]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValues,
    setErrors,
    handleChange,
    handleBlur,
    handleSubmit,
    validateForm,
    resetForm,
    setFieldValue: (name, value) => {
      setValues(prev => ({ ...prev, [name]: value }));
    },
    setFieldError: (name, error) => {
      setErrors(prev => ({ ...prev, [name]: error }));
    },
    getFieldProps: (name) => ({
      name,
      value: values[name] || '',
      onChange: handleChange,
      onBlur: handleBlur,
    }),
    getFieldError: (name) => touched[name] ? errors[name] : null,
  };
}

export default useFormValidation;
