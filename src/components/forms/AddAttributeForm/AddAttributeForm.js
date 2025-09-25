import React from 'react';
import PropTypes from 'prop-types';
import { Form, Field, FormSpy } from 'react-final-form';
import { FormattedMessage } from 'react-intl';

import { CloseIcon, LoadingIcon, SaveIcon } from '../../icons';
import Button, { TheButtonGroup } from '../../widgets/TheButton';
import { TextField, StandaloneRadioField } from '../fields';
import Explanation from '../../widgets/Explanation';
import { lruMemoize } from 'reselect';
import { EMPTY_OBJ } from '../../../helpers/common';
import Callout from '../../widgets/Callout';

const empty = values => {
  const mode = values.mode === 'other' ? 'key' : values.mode;
  return !values[mode];
};

const validate = lruMemoize(attributes => values => {
  const errors = {};
  if (values.mode === 'course') {
    if (values.course && !/^[A-Z0-9]{3,9}$/.test(values.course)) {
      errors.course = (
        <FormattedMessage
          id="app.addAttributeForm.validate.course"
          defaultMessage="Course identifier can contain only uppercase letters and digits and must have adequate length."
        />
      );
    }
  } else if (values.mode === 'term') {
    if (values.term && !/^20[0-9]{2}-[12]$/.test(values.term)) {
      errors.term = (
        <FormattedMessage
          id="app.addAttributeForm.validate.term"
          defaultMessage="Semester must be in the format YYYY-T, where YYYY is the year and T is the term number (1-2)."
        />
      );
    }
  } else if (values.mode === 'group') {
    if (values.group && !/^[a-zA-Z0-9]{8,16}$/.test(values.group)) {
      errors.group = (
        <FormattedMessage
          id="app.addAttributeForm.validate.group"
          defaultMessage="The identifier can contain only letters and digits and must be 8-16 characters long."
        />
      );
    }
  } else if (values.mode === 'other') {
    if (values.key && !/^[-_a-zA-Z0-9]+$/.test(values.key)) {
      errors.key = (
        <FormattedMessage
          id="app.addAttributeForm.validate.key"
          defaultMessage="The key can contain only letters, digits, dash, and underscore."
        />
      );
    }
  }

  if (Object.keys(errors).length === 0) {
    const key = values.mode === 'other' ? values.key : values.mode;
    const value = values.mode === 'other' ? values.value : values[key];
    if (key && attributes && attributes[key] && attributes[key].includes(value)) {
      errors[values.mode === 'other' ? 'value' : key] = (
        <FormattedMessage
          id="app.addAttributeForm.validate.duplicate"
          defaultMessage="The attribute [{key}: {value}] is already associated with this group."
          values={{ key, value }}
        />
      );
    }
  }
  return errors;
});

const AddAttributeForm = ({ initialValues, onSubmit, onClose, attributes = EMPTY_OBJ }) => {
  return (
    <Form
      onSubmit={onSubmit}
      initialValues={initialValues}
      validate={validate(attributes)}
      render={({ handleSubmit, submitting, submitError }) => (
        <form onSubmit={handleSubmit}>
          <table className="mb-2">
            <tbody>
              <FormSpy subscription={{ values: true }}>
                {({ values: { mode } }) => (
                  <>
                    <tr className={mode === 'course' ? 'bg-success bg-opacity-10' : ''}>
                      <td className="align-middle ps-3">
                        <StandaloneRadioField name="mode" value="course" />
                      </td>
                      <td colSpan={2} className="w-100 px-3">
                        <Field
                          component={TextField}
                          name="course"
                          ignoreDirty
                          disabled={mode !== 'course'}
                          maxLength={9}
                          placeholder="NPRG001"
                          label={
                            <>
                              <FormattedMessage id="app.addAttributeForm.course" defaultMessage="Course" />:
                              <Explanation id="course-explanation">
                                <FormattedMessage
                                  id="app.addAttributeForm.course.explanation"
                                  defaultMessage="Associating course identifier enables bindings and group creations for SIS events of that course in the whole sub-tree."
                                />
                              </Explanation>
                            </>
                          }
                        />
                      </td>
                    </tr>

                    <tr className={mode === 'term' ? 'bg-success bg-opacity-10' : ''}>
                      <td className="align-middle ps-3">
                        <StandaloneRadioField name="mode" value="term" />
                      </td>
                      <td colSpan={2} className="w-100 px-3">
                        <Field
                          component={TextField}
                          name="term"
                          ignoreDirty
                          disabled={mode !== 'term'}
                          maxLength={6}
                          placeholder="2025-1"
                          label={
                            <>
                              <FormattedMessage id="app.addAttributeForm.term" defaultMessage="Semester" />:
                              <Explanation id="term-explanation">
                                <FormattedMessage
                                  id="app.addAttributeForm.term.explanation"
                                  defaultMessage="Associating term (semester) identifier enables bindings and group creations for SIS events of that term in the whole sub-tree."
                                />
                              </Explanation>
                            </>
                          }
                        />
                      </td>
                    </tr>

                    <tr className={mode === 'group' ? 'bg-success bg-opacity-10' : ''}>
                      <td className="align-middle ps-3">
                        <StandaloneRadioField name="mode" value="group" />
                      </td>
                      <td colSpan={2} className="w-100 px-3">
                        <Field
                          component={TextField}
                          name="group"
                          ignoreDirty
                          disabled={mode !== 'group'}
                          maxLength={20}
                          placeholder="25aNPRG058x01"
                          label={
                            <>
                              <FormattedMessage id="app.addAttributeForm.group" defaultMessage="SIS Scheduling Event" />
                              :
                              <Explanation id="group-explanation">
                                <FormattedMessage
                                  id="app.addAttributeForm.group.explanation"
                                  defaultMessage="Association between groups and SIS events is usually done by binding or creating new groups from SIS events. This circumvents traditional checks, so any SIS event ID can be associated with this group. Please, handle with extreme care."
                                />
                              </Explanation>
                            </>
                          }
                        />
                      </td>
                    </tr>

                    <tr className={mode === 'other' ? 'bg-success bg-opacity-10' : ''}>
                      <td className="align-middle ps-3">
                        <StandaloneRadioField name="mode" value="other" />
                      </td>
                      <td className="w-50 ps-3">
                        <Field
                          component={TextField}
                          name="key"
                          ignoreDirty
                          disabled={mode !== 'other'}
                          maxLength={32}
                          label={
                            <>
                              <FormattedMessage id="app.addAttributeForm.key" defaultMessage="Custom Key" />:
                              <Explanation id="other-explanation">
                                <FormattedMessage
                                  id="app.addAttributeForm.other.explanation"
                                  defaultMessage="Creating custom attributes is intended to simplify preparations for future features. Avoid creating attributes unless you are absolutely certain what you are doing."
                                />
                              </Explanation>
                            </>
                          }
                        />
                      </td>
                      <td className="w-50 pe-3">
                        <Field
                          component={TextField}
                          name="value"
                          ignoreDirty
                          disabled={mode !== 'other'}
                          maxLength={250}
                          label={
                            <>
                              <FormattedMessage id="app.addAttributeForm.value" defaultMessage="Value" />:
                            </>
                          }
                        />
                      </td>
                    </tr>
                  </>
                )}
              </FormSpy>
            </tbody>
          </table>

          <FormSpy subscription={{ errors: true }}>
            {({ errors: { students } }) => students && <Callout variant="danger">{students}</Callout>}
          </FormSpy>

          {submitError && <Callout variant="danger">{submitError}</Callout>}

          <div className="text-center">
            <TheButtonGroup>
              <FormSpy subscription={{ values: true, valid: true }}>
                {({ values, valid }) => (
                  <Button type="submit" variant="success" disabled={submitting || !valid || empty(values)}>
                    {submitting ? <LoadingIcon gapRight /> : <SaveIcon gapRight />}
                    <FormattedMessage id="generic.create" defaultMessage="Create" />
                  </Button>
                )}
              </FormSpy>

              {onClose && (
                <Button onClick={onClose} variant="secondary" disabled={submitting}>
                  <CloseIcon gapRight />
                  <FormattedMessage id="generic.cancel" defaultMessage="Cancel" />
                </Button>
              )}
            </TheButtonGroup>
          </div>
        </form>
      )}
    />
  );
};

AddAttributeForm.propTypes = {
  initialValues: PropTypes.object.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  attributes: PropTypes.object,
};

export default AddAttributeForm;
