import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { Modal, Table } from 'react-bootstrap';
import { lruMemoize } from 'reselect';

import Page from '../../components/layout/Page';
import Box from '../../components/widgets/Box';
import DateTime from '../../components/widgets/DateTime';
import Button, { TheButtonGroup } from '../../components/widgets/TheButton';
import { DeleteIcon, EditIcon, RefreshIcon, TermIcon } from '../../components/icons';
import Callout from '../../components/widgets/Callout';
import ResourceRenderer from '../../components/helpers/ResourceRenderer';

import { fetchUserIfNeeded, syncUser, syncUserReset } from '../../redux/modules/users.js';
import { fetchAllTerms, fetchTerm, createTerm, updateTerm, deleteTerm } from '../../redux/modules/terms.js';
import { addNotification } from '../../redux/modules/notifications.js';
import { loggedInUserSelector } from '../../redux/selectors/users.js';
import { isLoading, hasFailed, getJsData } from '../../redux/helpers/resourceManager';
import { loggedInUserIdSelector } from '../../redux/selectors/auth.js';
import { termsSelector } from '../../redux/selectors/terms.js';

import { isSuperadminRole, isStudentRole, isSupervisorRole } from '../../components/helpers/usersRoles.js';
import { safeGet } from '../../helpers/common.js';

class Terms extends Component {
  state = {
    modalOpen: false,
    editedTerm: null,
  };

  openModal = (term = null) => {
    this.setState({ modalOpen: true, editedTerm: term });
  };

  closeModal = () => {
    this.setState({ modalOpen: false, editedTerm: null });
  };

  componentDidMount() {
    this.props.loadAsync(this.props.loggedInUserId);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.loggedInUserId !== this.props.loggedInUserId) {
      this.props.loadAsync(this.props.loggedInUserId);
    }
  }

  static loadAsync = ({ userId }, dispatch) =>
    Promise.all([dispatch(fetchUserIfNeeded(userId)), dispatch(fetchAllTerms())]);

  render() {
    const { loggedInUser, terms, reloadAll, deleteTerm } = this.props;

    return (
      <Page
        resource={loggedInUser}
        icon={<TermIcon />}
        title={<FormattedMessage id="app.terms.title" defaultMessage="Terms" />}>
        {user => {
          return (
            <>
              <Box
                title={<FormattedMessage id="app.terms.termsList.title" defaultMessage="List of terms" />}
                noPadding
                customIcons={
                  <RefreshIcon
                    className="text-primary"
                    timid
                    gapRight
                    onClick={reloadAll}
                    tooltipId="app.terms.refresh"
                    tooltipPlacement="left"
                    tooltip={<FormattedMessage id="app.terms.refresh" defaultMessage="Refresh terms" />}
                  />
                }
                footer={
                  isSupervisorRole(user.role) && (
                    <div className="text-center p-1">
                      <Button variant="success" onClick={() => this.openModal(null)}>
                        <TermIcon gapRight />
                        <FormattedMessage id="app.terms.createTerm" defaultMessage="Create new term" />
                      </Button>
                    </div>
                  )
                }>
                <ResourceRenderer resourceArray={terms}>
                  {terms =>
                    terms && terms.length > 0 ? (
                      <Table hover striped className="mb-0">
                        <thead>
                          <tr>
                            <th>
                              <FormattedMessage id="app.terms.table.term" defaultMessage="Term" />
                            </th>
                            <th>
                              <FormattedMessage id="app.terms.table.beginning" defaultMessage="Beginning" />
                            </th>
                            <th>
                              <FormattedMessage id="app.terms.table.end" defaultMessage="End" />
                            </th>

                            {(isStudentRole(user.role) || isSuperadminRole(user.role)) && (
                              <>
                                <th>
                                  <FormattedMessage id="app.terms.table.studentsFrom" defaultMessage="Students from" />
                                </th>
                                <th>
                                  <FormattedMessage
                                    id="app.terms.table.studentsUntil"
                                    defaultMessage="Students until"
                                  />
                                </th>
                              </>
                            )}

                            {(isSupervisorRole(user.role) || isSuperadminRole(user.role)) && (
                              <>
                                <th>
                                  <FormattedMessage id="app.terms.table.teachersFrom" defaultMessage="Teachers from" />
                                </th>
                                <th>
                                  <FormattedMessage
                                    id="app.terms.table.teachersUntil"
                                    defaultMessage="Teachers until"
                                  />
                                </th>
                              </>
                            )}

                            {isSuperadminRole(user.role) && (
                              <>
                                <th>
                                  <FormattedMessage id="app.terms.table.Archive after" defaultMessage="Archive after" />
                                </th>
                                <th />
                              </>
                            )}
                          </tr>
                        </thead>

                        <tbody>
                          {terms.map((term, idx) => (
                            <tr key={term.id || idx} className="align-middle">
                              <td className="text-nowrap">
                                {term.year}-{term.term} (
                                {term.term === 1 ? (
                                  <FormattedMessage id="app.terms.table.winter" defaultMessage="Winter" />
                                ) : (
                                  <FormattedMessage id="app.terms.table.summer" defaultMessage="Summer" />
                                )}
                                )
                              </td>
                              <td className="text-nowrap">
                                {term.beginning ? <DateTime unixts={term.beginning} showTime={false} /> : <>&mdash;</>}
                              </td>
                              <td className="text-nowrap">
                                {term.end ? <DateTime unixts={term.end} showTime={false} /> : <>&mdash;</>}
                              </td>

                              {(isStudentRole(user.role) || isSuperadminRole(user.role)) && (
                                <>
                                  <td className="text-nowrap">
                                    {term.studentsFrom ? (
                                      <DateTime unixts={term.studentsFrom} showTime={false} />
                                    ) : (
                                      <>&mdash;</>
                                    )}
                                  </td>
                                  <td className="text-nowrap">
                                    {term.studentsUntil ? (
                                      <DateTime unixts={term.studentsUntil} showTime={false} />
                                    ) : (
                                      <>&mdash;</>
                                    )}
                                  </td>
                                </>
                              )}

                              {(isSupervisorRole(user.role) || isSuperadminRole(user.role)) && (
                                <>
                                  <td className="text-nowrap">
                                    {term.teachersFrom ? (
                                      <DateTime unixts={term.teachersFrom} showTime={false} />
                                    ) : (
                                      <>&mdash;</>
                                    )}
                                  </td>
                                  <td className="text-nowrap">
                                    {term.teachersUntil ? (
                                      <DateTime unixts={term.teachersUntil} showTime={false} />
                                    ) : (
                                      <>&mdash;</>
                                    )}
                                  </td>
                                </>
                              )}

                              {isSuperadminRole(user.role) && (
                                <>
                                  <td className="text-nowrap">
                                    {term.archiveAfter ? (
                                      <DateTime unixts={term.archiveAfter} showTime={false} />
                                    ) : (
                                      <>&mdash;</>
                                    )}
                                    {term.permissionHints}
                                  </td>
                                  <td className="text-nowrap shrink-col">
                                    <TheButtonGroup>
                                      <Button variant="warning" size="sm" onClick={() => this.openModal(term.id)}>
                                        <EditIcon gapRight />
                                        <FormattedMessage id="app.terms.table.editButton" defaultMessage="Edit" />
                                      </Button>
                                      <Button
                                        variant="danger"
                                        size="sm"
                                        confirmId={`delete-term-${term.id}`}
                                        confirm={
                                          <FormattedMessage
                                            id="app.terms.table.deleteConfirm"
                                            defaultMessage="Are you sure you want to delete this term?"
                                          />
                                        }
                                        onClick={() => deleteTerm(term.id)}>
                                        <DeleteIcon gapRight />
                                        <FormattedMessage id="app.terms.table.deleteButton" defaultMessage="Delete" />
                                      </Button>
                                    </TheButtonGroup>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <div className="text-center text-muted p-3 opacity-50">
                        <FormattedMessage id="app.terms.noTerms" defaultMessage="No terms were created yet..." />
                      </div>
                    )
                  }
                </ResourceRenderer>
              </Box>

              <Modal show={this.state.modalOpen} backdrop="static" size="xl" onHide={this.closeModal}>
                <Modal.Header closeButton>
                  <Modal.Title>
                    {this.state.editedTerm ? (
                      <FormattedMessage id="app.terms.editTerm" defaultMessage="Edit term" />
                    ) : (
                      <FormattedMessage id="app.terms.createTerm" defaultMessage="Create new term" />
                    )}
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body>TODO - FORM</Modal.Body>
              </Modal>
            </>
          );
        }}
      </Page>
    );
  }
}

Terms.propTypes = {
  loggedInUserId: PropTypes.string,
  loggedInUser: ImmutablePropTypes.map,
  terms: ImmutablePropTypes.list,
  loadAsync: PropTypes.func.isRequired,
  reloadAll: PropTypes.func.isRequired,
  fetchTerm: PropTypes.func.isRequired,
  createTerm: PropTypes.func.isRequired,
  updateTerm: PropTypes.func.isRequired,
  deleteTerm: PropTypes.func.isRequired,
};

export default connect(
  state => ({
    loggedInUserId: loggedInUserIdSelector(state),
    loggedInUser: loggedInUserSelector(state),
    terms: termsSelector(state),
  }),
  dispatch => ({
    loadAsync: userId => Terms.loadAsync({ userId }, dispatch),
    reloadAll: () => dispatch(fetchAllTerms()),
    fetchTerm: termId => dispatch(fetchTerm(termId)),
    createTerm: data => dispatch(createTerm(data)),
    updateTerm: (termId, data) => dispatch(updateTerm(termId, data)),
    deleteTerm: termId =>
      dispatch(deleteTerm(termId)).catch(err => {
        dispatch(addNotification(err, false));
        return dispatch(fetchAllTerms());
      }),
  })
)(Terms);
