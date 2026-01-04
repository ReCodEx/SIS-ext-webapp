import React from 'react';
import PropTypes from 'prop-types';
import { Form, Field, FormSpy } from 'react-final-form';
import { FormattedMessage } from 'react-intl';
import { Row, Col } from 'react-bootstrap';
import { lruMemoize } from 'reselect';

import Icon, { CloseIcon } from '../../icons';
import Button, { TheButtonGroup } from '../../widgets/TheButton';
import { TextField } from '../fields';

const validate = values => {
  const errors = { cs: {}, en: {} };

  if (!values?.cs?.name?.trim()) {
    errors.cs.name = (
      <FormattedMessage id="app.plantTermGroupsForm.validate.required" defaultMessage="This field must not be empty." />
    );
  }
  if (!values.cs?.description?.trim()) {
    errors.cs.description = (
      <FormattedMessage id="app.plantTermGroupsForm.validate.required" defaultMessage="This field must not be empty." />
    );
  }
  if (!values?.en?.name?.trim()) {
    errors.en.name = (
      <FormattedMessage id="app.plantTermGroupsForm.validate.required" defaultMessage="This field must not be empty." />
    );
  }
  if (!values?.en?.description?.trim()) {
    errors.en.description = (
      <FormattedMessage id="app.plantTermGroupsForm.validate.required" defaultMessage="This field must not be empty." />
    );
  }

  return errors;
};

export const initialValuesCreator = lruMemoize(term => {
  const year = `${term.year}/${(term.year + 1).toString().slice(-2)}`;
  const termLabels = { cs: { 1: 'ZS', 2: 'LS' }, en: { 1: 'Winter', 2: 'Summer' } };
  const termNames = { cs: { 1: 'Zimní semestr', 2: 'Letní semestr' }, en: { 1: 'Winter term', 2: 'Summer term' } };
  return {
    cs: {
      name: `${year} 1-${termLabels.cs[term.term]}`,
      description: `${termNames.cs[term.term]} ${year}`,
    },
    en: {
      name: `${year} 1-${termLabels.en[term.term]}`,
      description: `${termNames.en[term.term]} ${year}`,
    },
  };
});

const PlantTermGroupsForm = ({ initialValues, onSubmit, onClose }) => {
  return (
    <Form
      onSubmit={onSubmit}
      initialValues={initialValues}
      validate={validate}
      render={({ handleSubmit }) => (
        <form onSubmit={handleSubmit}>
          <Row>
            <Col xs={12} xl={6}>
              <h4>
                <FormattedMessage id="app.plantTermGroupsForm.czech" defaultMessage="Czech" />
              </h4>

              <Field
                component={TextField}
                name="cs.name"
                ignoreDirty
                maxLength={255}
                label={
                  <>
                    <FormattedMessage id="app.plantTermGroupsForm.groupName" defaultMessage="Group Name" /> [cs]:
                  </>
                }
              />

              <Field
                component={TextField}
                name="cs.description"
                ignoreDirty
                maxLength={255}
                label={
                  <>
                    <FormattedMessage
                      id="app.plantTermGroupsForm.groupDescription"
                      defaultMessage="Group Description"
                    />{' '}
                    [cs]:
                  </>
                }
              />
            </Col>
            <Col xs={12} xl={6}>
              <h4>
                <FormattedMessage id="app.plantTermGroupsForm.english" defaultMessage="English" />
              </h4>

              <Field
                component={TextField}
                name="en.name"
                ignoreDirty
                maxLength={255}
                label={
                  <>
                    <FormattedMessage id="app.plantTermGroupsForm.groupName" defaultMessage="Group Name" /> [en]:
                  </>
                }
              />

              <Field
                component={TextField}
                name="en.description"
                ignoreDirty
                maxLength={255}
                label={
                  <>
                    <FormattedMessage
                      id="app.plantTermGroupsForm.groupDescription"
                      defaultMessage="Group Description"
                    />{' '}
                    [en]:
                  </>
                }
              />
            </Col>
          </Row>

          <hr />
          <div className="text-center">
            <TheButtonGroup>
              <FormSpy subscription={{ valid: true }}>
                {({ valid }) => (
                  <Button type="submit" variant="success" disabled={!valid}>
                    <Icon icon="users-viewfinder" gapRight />
                    <FormattedMessage
                      id="app.plantTermGroupsForm.submitButton"
                      defaultMessage="Continue with Group Selection..."
                    />
                  </Button>
                )}
              </FormSpy>

              {onClose && (
                <Button onClick={onClose} variant="secondary">
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

PlantTermGroupsForm.propTypes = {
  initialValues: PropTypes.object.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  attributes: PropTypes.object,
};

export default PlantTermGroupsForm;
