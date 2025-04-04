import { connect } from 'react-redux';
import Sidebar from '../../components/layout/Sidebar/Sidebar.js';
import { loggedInUserSelector } from '../../redux/selectors/users.js';

export default connect(state => ({
  loggedInUser: loggedInUserSelector(state),
}))(Sidebar);
