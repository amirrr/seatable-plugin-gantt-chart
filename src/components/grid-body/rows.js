import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { ROW_HEIGHT } from '../../constants';
import Cell from '../row/cell';

class Rows extends React.Component {

  render() {
    const { rows, columns, collaborators, dtable, tableID, formulaRows } = this.props;
    return (
      <Fragment>
        {Array.isArray(rows) && rows.map((row, index) => {
          const originalRow = row.events[0].original_row;
          return (
            <div className="timeline-row d-flex" style={{height: ROW_HEIGHT}} key={index}>
              {columns.map((column, index) => {
                return (
                  <Cell
                    key={index}
                    className={index == 0 ? 'first-cell' : ''}
                    row={originalRow}
                    column={column}
                    collaborators={collaborators}
                    dtable={dtable}
                    tableID={tableID}
                    formulaRows={formulaRows}
                  />
                );
              })}
            </div>
          );
        })}
      </Fragment>
    );
  }
}

Rows.propTypes = {
  dtable: PropTypes.object,
  rows: PropTypes.array,
  columns: PropTypes.array,
  tableID: PropTypes.string,
  formulaRows: PropTypes.object,
  collaborators: PropTypes.array
};

export default Rows;
