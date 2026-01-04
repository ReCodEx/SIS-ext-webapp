import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { TermIcon } from '../../icons';

const TermLabel = ({
  term,
  icon = false,
  longNames = false,
  emphasize = false,
  iconClassName = null,
  yearClassName = null,
  termClassName = null,
}) => {
  return (
    <>
      {icon && <TermIcon gapRight className={iconClassName || 'text-muted'} />}
      <span className={yearClassName || (emphasize ? 'fw-bold' : '')}>
        {term.year}-{term.term}
      </span>{' '}
      <span className={termClassName || (emphasize ? 'small text-muted ms-2' : '')}>
        (
        {longNames ? (
          <>
            {term.term === 1 && <FormattedMessage id="app.terms.winterLong" defaultMessage="Winter Term" />}
            {term.term === 2 && <FormattedMessage id="app.terms.summerLong" defaultMessage="Summer Term" />}
          </>
        ) : (
          <>
            {term.term === 1 && <FormattedMessage id="app.terms.winter" defaultMessage="Winter" />}
            {term.term === 2 && <FormattedMessage id="app.terms.summer" defaultMessage="Summer" />}
          </>
        )}
        )
      </span>
    </>
  );
};

TermLabel.propTypes = {
  term: PropTypes.shape({
    year: PropTypes.number.isRequired,
    term: PropTypes.number.isRequired,
  }).isRequired,
  icon: PropTypes.bool,
  longNames: PropTypes.bool,
  emphasize: PropTypes.bool,
  iconClassName: PropTypes.string,
  yearClassName: PropTypes.string,
  termClassName: PropTypes.string,
};

export default TermLabel;
