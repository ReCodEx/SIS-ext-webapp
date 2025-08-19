import React from 'react';
import PropTypes from 'prop-types';
import { Form, Field, FormSpy } from 'react-final-form';
import { FormattedMessage } from 'react-intl';
import { Row, Col } from 'react-bootstrap';

import Icon, { CloseIcon, LinkIcon, LoadingIcon, RefreshIcon, SaveIcon, VisibleIcon } from '../../icons';
import Button, { TheButtonGroup } from '../../widgets/TheButton';
import { SelectField, NumericTextField, DatetimeField } from '../fields';
import Explanation from '../../widgets/Explanation';
import { lruMemoize } from 'reselect';
import { arrayToObject, EMPTY_ARRAY } from '../../../helpers/common';
import Callout from '../../widgets/Callout';

const termOptions = [
  { name: <FormattedMessage id="app.terms.form.term.winter" defaultMessage="1-Winter" />, key: 1 },
  { name: <FormattedMessage id="app.terms.form.term.summer" defaultMessage="2-Summer" />, key: 2 },
];

const validate = lruMemoize((terms, id) => values => {
  const termIndex = arrayToObject(terms, ({ year, term }) => `${year}-${term}`);
  const selectedTerm = id && terms.find(t => t.id === id);
  if (selectedTerm) {
    delete termIndex[`${selectedTerm.year}-${selectedTerm.term}`];
  }

  const errors = {};

  const yearTerm = `${values.year}-${values.term}`;
  if (termIndex[yearTerm]) {
    errors.term = (
      <FormattedMessage
        id="app.terms.form.validate.termDuplicate"
        defaultMessage="Term {yearTerm} already exists."
        values={{ yearTerm }}
      />
    );
  }

  // beginning and end
  const beginningTs = values.beginning?.unix();
  const endTs = values.end?.unix();
  if (!beginningTs && endTs) {
    errors.beginning = (
      <FormattedMessage
        id="app.terms.form.validate.bothBeginningAndEnd"
        defaultMessage="The 'beginning' and 'end' dates should be either both provided or both omitted."
      />
    );
  }
  if (beginningTs && !endTs) {
    errors.end = (
      <FormattedMessage
        id="app.terms.form.validate.bothBeginningAndEnd"
        defaultMessage="The 'beginning' and 'end' dates should be either both provided or both omitted."
      />
    );
  }
  if (beginningTs && endTs && beginningTs >= endTs) {
    errors.end = (
      <FormattedMessage
        id="app.terms.form.validate.beginningAfterEnd"
        defaultMessage="The 'end' date must be after the 'beginning' date."
      />
    );
  }

  // student dates
  const studentsFromTs = values.studentsFrom?.unix();
  const studentsUntilTs = values.studentsUntil?.unix();
  if (!studentsFromTs) {
    errors.studentsFrom = (
      <FormattedMessage id="app.terms.form.validate.missingFrom" defaultMessage="The 'from' date must be provided." />
    );
  }
  if (!studentsUntilTs) {
    errors.studentsUntil = (
      <FormattedMessage id="app.terms.form.validate.missingUntil" defaultMessage="The 'until' date must be provided." />
    );
  }

  if (studentsFromTs && studentsUntilTs && studentsFromTs >= studentsUntilTs) {
    errors.studentsUntil = (
      <FormattedMessage
        id="app.terms.form.validate.studentsInvalid"
        defaultMessage="Students 'until' date must be after 'from' date."
      />
    );
  }

  // teacher dates
  const teachersFromTs = values.teachersFrom?.unix();
  const teachersUntilTs = values.teachersUntil?.unix();
  if (!teachersFromTs) {
    errors.teachersFrom = (
      <FormattedMessage id="app.terms.form.validate.missingFrom" defaultMessage="The 'from' date must be provided." />
    );
  }
  if (!teachersUntilTs) {
    errors.teachersUntil = (
      <FormattedMessage id="app.terms.form.validate.missingUntil" defaultMessage="The 'until' date must be provided." />
    );
  }

  if (teachersFromTs && teachersUntilTs && teachersFromTs >= teachersUntilTs) {
    errors.teachersUntil = (
      <FormattedMessage
        id="app.terms.form.validate.teachersInvalid"
        defaultMessage="Teachers 'until' date must be after 'from' date."
      />
    );
  }

  const archiveAfterTs = values.archiveAfter?.unix();
  if (
    archiveAfterTs &&
    studentsUntilTs &&
    teachersUntilTs &&
    archiveAfterTs < Math.max(studentsUntilTs, teachersUntilTs)
  ) {
    errors.archiveAfter = (
      <FormattedMessage
        id="app.terms.form.validate.archiveAfter"
        defaultMessage="The 'Archive After' date must be after both (student's and teacher's) visibility periods end."
      />
    );
  }

  return errors;
});

const EditTermForm = ({ initialValues, onSubmit, onClose, editTermId = null, create = false, terms = EMPTY_ARRAY }) => {
  return (
    <Form
      onSubmit={onSubmit}
      initialValues={initialValues}
      validate={validate(terms, editTermId)}
      render={({ handleSubmit, submitting, submitError }) => (
        <form onSubmit={handleSubmit}>
          <Row>
            <Col lg={6}>
              <NumericTextField
                name="year"
                maxLength={4}
                validateMin={2000}
                validateMax={2200}
                ignoreDirty={create}
                label={
                  <>
                    <FormattedMessage id="app.terms.form.year" defaultMessage="Year" />:
                    <Explanation id="year">
                      <FormattedMessage
                        id="app.terms.form.year.explanation"
                        defaultMessage="Calendar year in which the academic year begins (e.g. 2025 for academic year 2025/26)."
                      />
                    </Explanation>
                  </>
                }
              />
            </Col>

            <Col lg={6}>
              <Field
                component={SelectField}
                name="term"
                options={termOptions}
                ignoreDirty={create}
                label={
                  <>
                    <FormattedMessage id="app.terms.form.term" defaultMessage="Term" />:
                  </>
                }
              />
            </Col>
          </Row>

          <hr />

          <h5 className="text-secondary mb-3">
            <Icon icon="chalkboard-user" gapRight />
            <FormattedMessage id="app.terms.form.range" defaultMessage="Range" />
          </h5>

          <Row>
            <Col lg={6} xl={4}>
              <Field
                name="beginning"
                label={
                  <>
                    <FormattedMessage id="app.terms.form.beginning" defaultMessage="Beginning" />:
                    <Explanation id="beginning">
                      <FormattedMessage
                        id="app.terms.form.beginning.explanation"
                        defaultMessage="Date on which the academic actually term begins. This has only informational value and does not affect anything."
                      />
                    </Explanation>
                  </>
                }
                component={DatetimeField}
                onlyDate
                ignoreDirty={create}
              />
            </Col>
            <Col lg={6} xl={4}>
              <Field
                name="end"
                label={
                  <>
                    <FormattedMessage id="app.terms.form.end" defaultMessage="End" />:
                    <Explanation id="end">
                      <FormattedMessage
                        id="app.terms.form.end.explanation"
                        defaultMessage="Date on which the academic actually term ends. This has only informational value and does not affect anything."
                      />
                    </Explanation>
                  </>
                }
                component={DatetimeField}
                onlyDate
                ignoreDirty={create}
              />
            </Col>
            <Col lg={6} xl={4}>
              <Field
                name="archiveAfter"
                label={
                  <>
                    <FormattedMessage id="app.terms.form.archiveAfter" defaultMessage="Archive After" />:
                    <Explanation id="archiveAfter">
                      <FormattedMessage
                        id="app.terms.form.archiveAfter.explanation"
                        defaultMessage="Information to users that the groups of the term will not be archived before this date. When this date passes, the button for collective group archiving will be enabled."
                      />
                    </Explanation>
                  </>
                }
                component={DatetimeField}
                onlyDate
                ignoreDirty={create}
              />
            </Col>
          </Row>

          <FormSpy subscription={{ values: true, errors: true }}>
            {({ values: { year }, errors }) =>
              !errors.year && (
                <a
                  href={`https://is.cuni.cz/studium/harmonogram/index.php?do=filtr&fak=11320&moje=1&skr=${year}`}
                  target="_blank"
                  rel="noopener noreferrer">
                  <LinkIcon gapLeft gapRight />
                  <FormattedMessage
                    id="app.terms.form.academicCalendar.link"
                    defaultMessage="Academic calendar of MFF-UK"
                  />
                </a>
              )
            }
          </FormSpy>

          <hr />

          <h5 className="text-secondary mb-3">
            <VisibleIcon gapRight />
            <FormattedMessage id="app.terms.form.visibility" defaultMessage="Visibility" />
          </h5>

          <Row>
            <Col lg={6}>
              <Field
                name="studentsFrom"
                label={
                  <>
                    <FormattedMessage id="app.terms.form.studentsFrom" defaultMessage="Students From" />:
                    <Explanation id="studentsFrom">
                      <FormattedMessage
                        id="app.terms.form.studentsFrom.explanation"
                        defaultMessage="When the term become visible to students, so they may start joining groups."
                      />
                    </Explanation>
                  </>
                }
                component={DatetimeField}
                onlyDate
                ignoreDirty={create}
              />
            </Col>
            <Col lg={6}>
              <Field
                name="studentsUntil"
                label={
                  <>
                    <FormattedMessage id="app.terms.form.studentsUntil" defaultMessage="Students Until" />:
                    <Explanation id="studentsUntil">
                      <FormattedMessage
                        id="app.terms.form.studentsUntil.explanation"
                        defaultMessage="Last date when the students can join the groups of this term."
                      />
                    </Explanation>
                  </>
                }
                component={DatetimeField}
                onlyDate
                ignoreDirty={create}
              />
            </Col>
          </Row>

          <FormSpy subscription={{ errors: true }}>
            {({ errors: { students } }) => students && <Callout variant="danger">{students}</Callout>}
          </FormSpy>

          <Row>
            <Col lg={6}>
              <Field
                name="teachersFrom"
                label={
                  <>
                    <FormattedMessage id="app.terms.form.teachersFrom" defaultMessage="Teachers From" />:
                    <Explanation id="teachersFrom">
                      <FormattedMessage
                        id="app.terms.form.teachersFrom.explanation"
                        defaultMessage="When the term become visible to teachers, so they may start creating their groups."
                      />
                    </Explanation>
                  </>
                }
                component={DatetimeField}
                onlyDate
                ignoreDirty={create}
              />
            </Col>
            <Col lg={6}>
              <Field
                name="teachersUntil"
                label={
                  <>
                    <FormattedMessage id="app.terms.form.teachersUntil" defaultMessage="Teachers Until" />:
                    <Explanation id="teachersUntil">
                      <FormattedMessage
                        id="app.terms.form.teachersUntil.explanation"
                        defaultMessage="Last date when the teachers can create their groups for this term."
                      />
                    </Explanation>
                  </>
                }
                component={DatetimeField}
                onlyDate
                ignoreDirty={create}
              />
            </Col>
          </Row>

          <hr />

          {submitError && <Callout variant="danger">{submitError}</Callout>}

          <div className="text-center">
            <TheButtonGroup>
              <Button type="submit" variant="success" disabled={submitting}>
                {submitting ? <LoadingIcon gapRight /> : <SaveIcon gapRight />}
                {create ? (
                  <FormattedMessage id="generic.create" defaultMessage="Create" />
                ) : (
                  <FormattedMessage id="generic.save" defaultMessage="Save" />
                )}
              </Button>

              <FormSpy subscription={{ pristine: true }}>
                {({ pristine, form }) =>
                  !pristine &&
                  !create && (
                    <Button variant="danger" onClick={() => form.reset()} disabled={submitting}>
                      <RefreshIcon gapRight />
                      <FormattedMessage id="generic.reset" defaultMessage="Reset" />
                    </Button>
                  )
                }
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

EditTermForm.propTypes = {
  initialValues: PropTypes.object.isRequired,
  editTermId: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  create: PropTypes.bool,
  terms: PropTypes.array,
};

export default EditTermForm;
