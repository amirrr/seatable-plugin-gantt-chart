import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Viewport from './grid-body/viewport';
import GroupViewport from './grid-body/group-viewport';

class Grid extends Component {

  renderViewport = () => {
    let { isGroupView, rows, groups, ...baseProps } = this.props;
    let CustomViewport, viewportProps;
    if (isGroupView) {
      CustomViewport = GroupViewport;
      viewportProps = {groups};
    } else {
      CustomViewport = Viewport;
      viewportProps = {rows};
    }
    return (
      <CustomViewport
        {...viewportProps}
        {...baseProps}
      />
    );
  }

  render() {
    return this.renderViewport();
  }
}

Grid.propTypes = {
  isShowUsers: PropTypes.bool,
  isGroupView: PropTypes.bool,
  changedSelectedByScroll: PropTypes.bool,
  gridStartDate: PropTypes.string,
  gridEndDate: PropTypes.string,
  selectedGridView: PropTypes.string,
  selectedDate: PropTypes.string,
  rows: PropTypes.array,
  groups: PropTypes.array,
  eventBus: PropTypes.object,
  renderHeaderYears: PropTypes.func,
  renderHeaderDates: PropTypes.func,
  onViewportRightScroll: PropTypes.func,
  updateSelectedDate: PropTypes.func,
  onRowExpand: PropTypes.func,
  onModifyRow: PropTypes.func,
};

export default Grid;
