import MySQLHelpPanel from './MySQLHelpPanel';
import PostgreSQLHelpPanel from './PostgreSQLHelpPanel';
import SQLServerHelpPanel from './SQLServerHelpPanel';
import OracleHelpPanel from './OracleHelpPanel';
import DefaultHelpPanel from './DefaultHelpPanel';

/**
 * Returns the appropriate help panel component based on database type
 * @param {string} dbType - The database type ('mysql', 'postgresql', 'sqlserver', 'oracle')
 * @returns {React.Component} The help panel component for the specified database type
 */
export const getHelpPanelForDbType = (dbType) => {
  switch (dbType?.toLowerCase()) {
    case 'mysql':
      return MySQLHelpPanel;
    case 'postgresql':
      return PostgreSQLHelpPanel;
    case 'sqlserver':
      return SQLServerHelpPanel;
    case 'oracle':
      return OracleHelpPanel;
    default:
      return DefaultHelpPanel;
  }
};

export {
  MySQLHelpPanel,
  PostgreSQLHelpPanel,
  SQLServerHelpPanel,
  OracleHelpPanel,
  DefaultHelpPanel
};
