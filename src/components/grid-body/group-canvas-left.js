import React, { Component } from 'react';
import PropTypes from 'prop-types';
import GroupItemLeft from './group-item-left';
import { isGroupExpanded } from '../../utils/group-viewport-utils';

class GroupCanvasLeft extends Component {

  onExpandGroupToggle = (groupIndex, isExpanded) => {
    this.props.onExpandGroupToggle(groupIndex, isExpanded);
  }

  render() {
    const {
      groupVisibleStartIdx, groups, foldedGroups, shownColumns, collaborators, dtable, tableID,
      formulaRows, topOffset, bottomOffset,
    } = this.props;
    const table = dtable.getTableById(tableID);
    return (
      <div className="group-canvas-left" style={{paddingTop: topOffset, paddingBottom: bottomOffset}}>
        {groups.map((group, index) => {
          const isExpanded = isGroupExpanded(foldedGroups, index + groupVisibleStartIdx);
          return (
            <GroupItemLeft
              key={`group-item-left-${group.key}`}
              group={group}
              shownColumns={shownColumns}
              collaborators={collaborators}
              isExpanded={isExpanded}
              onExpandGroupToggle={this.onExpandGroupToggle.bind(this, index)}
              dtable={dtable}
              table={table}
              tableID={tableID}
              formulaRows={formulaRows}
            />
          );
        })}
      </div>
    );
  }
}

GroupCanvasLeft.propTypes = {
  groupVisibleStartIdx: PropTypes.number,
  groups: PropTypes.array,
  foldedGroups: PropTypes.array,
  onExpandGroupToggle: PropTypes.func,
  shownColumns: PropTypes.array,
  collaborators: PropTypes.array,
  dtable: PropTypes.object,
  tableID: PropTypes.string,
  formulaRows: PropTypes.object,
  topOffset: PropTypes.number,
  bottomOffset: PropTypes.number,
};

export default GroupCanvasLeft;
