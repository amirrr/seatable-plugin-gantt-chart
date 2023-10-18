import React from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import intl from "react-intl-universal";
import DTable, { CELL_TYPE, FORMULA_RESULT_TYPE, sortDate } from "dtable-sdk";
import ViewsTabs from "./components/views-tabs";
import Timeline from "./components/timeline";
import View from "./model/view";
import Group from "./model/group";
import TimelineRow from "./model/timeline-row";
import Event from "./model/event";
import {
  PLUGIN_NAME,
  SETTING_KEY,
  DEFAULT_BG_COLOR,
  DEFAULT_TEXT_COLOR,
  RECORD_END_TYPE,
  DATE_UNIT,
  COLLABORATOR_COLUMN_TYPES,
} from "./constants";
import { generatorViewId, getDtableUuid } from "./utils";
import { getCollaboratorsDisplayString } from "./utils/value-format-utils";
import EventBus from "./utils/event-bus";

import "./locale";
import timelineLogo from "./assets/image/timeline.png";

import "./css/app.css";

/**
 * notes:
 * convertedRows: [ convertedRow, ... ],
 * convertedRow: { [row._id]: rowId, [column.name]: 'xxx' }
 * originalRow: { [row._id]: rowId, [column.key]: 'xxx' }
 */

const DEFAULT_PLUGIN_SETTINGS = {
  views: [
    {
      _id: "0000",
      name: `${intl.get("Default_View")}`,
      settings: {},
    },
  ],
};
const KEY_SELECTED_VIEW_IDS = `${PLUGIN_NAME}-selectedViewIds`;

const EMPTY_LABEL = `(${intl.get("Empty")})`;

const propTypes = {
  showDialog: PropTypes.bool,
};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      showDialog: props.showDialog || false,
      isShowTimelineSetting: false,
      plugin_settings: {},
      selectedViewIdx: 0,
    };
    this.eventBus = new EventBus();
    this.dtable = new DTable();
  }

  componentDidMount() {
    this.initPluginDTableData();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({ showDialog: nextProps.showDialog });
  }

  componentWillUnmount() {
    this.unsubscribeLocalDtableChanged();
    this.unsubscribeRemoteDtableChanged();
  }

  async initPluginDTableData() {
    if (window.app === undefined) {
      // local develop
      window.app = {};
      window.app.state = {};
      window.dtable = {};
      await this.dtable.init(window.dtablePluginConfig);
      await this.dtable.syncWithServer();
      let relatedUsersRes = await this.getRelatedUsersFromServer(
        this.dtable.dtableStore
      );
      const userList = relatedUsersRes.data.user_list;
      window.app.collaborators = userList;
      window.app.state.collaborators = userList;
      this.dtable.subscribe("dtable-connect", () => {
        this.onDTableConnect();
      });
    } else {
      // integrated to dtable app
      this.dtable.initInBrowser(window.app.dtableStore);
    }
    this.unsubscribeLocalDtableChanged = this.dtable.subscribe(
      "local-dtable-changed",
      () => {
        this.onDTableChanged();
      }
    );
    this.unsubscribeRemoteDtableChanged = this.dtable.subscribe(
      "remote-dtable-changed",
      () => {
        this.onDTableChanged();
      }
    );
    this.resetData(true);
  }

  async getRelatedUsersFromServer(dtableStore) {
    return dtableStore.dtableAPI.getTableRelatedUsers();
  }

  onDTableConnect = () => {
    this.resetData();
  };

  onDTableChanged = () => {
    this.resetData();
  };

  resetData = (init = false) => {
    let { showDialog, isShowTimelineSetting } = this.state;
    let plugin_settings = this.dtable.getPluginSettings(PLUGIN_NAME) || {};
    if (!plugin_settings || Object.keys(plugin_settings).length === 0) {
      plugin_settings = DEFAULT_PLUGIN_SETTINGS;
    }
    let { views } = plugin_settings;
    let dtableUuid = getDtableUuid();
    let selectedViewIds = this.getSelectedViewIds(KEY_SELECTED_VIEW_IDS) || {};
    let selectedViewId = selectedViewIds[dtableUuid];
    let selectedViewIdx = views.findIndex((v) => v._id === selectedViewId);
    selectedViewIdx = selectedViewIdx > 0 ? selectedViewIdx : 0;
    if (init) {
      isShowTimelineSetting = !this.isValidViewSettings(
        views[selectedViewIdx].settings
      );
      showDialog = true;
    }
    this.columnIconConfig = this.dtable.getColumnIconConfig();
    this.optionColorsMap = this.getOptionColorsMap();
    this.initCollaborators();
    this.setState({
      isLoading: false,
      showDialog,
      plugin_settings,
      selectedViewIdx,
      isShowTimelineSetting,
    });
  };

  onPluginToggle = () => {
    setTimeout(() => {
      this.setState({ showDialog: false });
    }, 500);
    window.app.onClosePlugin && window.app.onClosePlugin();
  };

  onTimelineSettingToggle = () => {
    this.setState({ isShowTimelineSetting: !this.state.isShowTimelineSetting });
  };

  onHideTimelineSetting = () => {
    this.setState({ isShowTimelineSetting: false });
  };

  onModifyTimelineSettings = (updated) => {
    let { plugin_settings, selectedViewIdx } = this.state;
    let { views: updatedViews } = plugin_settings;
    let updatedView = plugin_settings.views[selectedViewIdx];
    updatedView.settings = updated;
    updatedViews[selectedViewIdx] = updatedView;
    plugin_settings.views = updatedViews;
    this.setState({ plugin_settings }, () => {
      this.dtable.updatePluginSettings(PLUGIN_NAME, plugin_settings);
    });
  };

  getOptionColorsMap = () => {
    let optionColors = this.dtable.getOptionColors();
    if (!Array.isArray(optionColors)) {
      return {};
    }
    let optionColorsMap = {};
    optionColors.forEach((optionColor) => {
      optionColorsMap[optionColor.COLOR] = optionColor.TEXT_COLOR;
    });
    return optionColorsMap;
  };

  getSelectedTable = (tables, settings = {}) => {
    let selectedTable = this.dtable.getTableByName(
      settings[SETTING_KEY.TABLE_NAME]
    );
    if (!selectedTable) {
      return tables[0];
    }
    return selectedTable;
  };

  getSelectedView = (table, settings = {}) => {
    return this.dtable.getViewByName(table, settings[SETTING_KEY.VIEW_NAME]);
  };

  getViews = (table) => {
    let { name } = table || {};
    return this.dtable.getTableViews(name);
  };

  getRelatedUsersFromLocal = () => {
    let { collaborators, state } = window.app;
    if (!collaborators) {
      // dtable app
      return state && state.collaborators;
    }
    return collaborators; // local develop
  };

  initCollaborators = () => {
    this.collaborators = this.getRelatedUsersFromLocal();
    this.emailCollaboratorMap = {};
    this.collaborators.forEach((collaborator) => {
      this.emailCollaboratorMap[collaborator.email] = collaborator;
    });
  };

  getConvertedRows = (tableName, viewName) => {
    let rows = [];
    this.Id2ConvertedRowMap = {};
    this.dtable.forEachRow(tableName, viewName, (row) => {
      this.Id2ConvertedRowMap[row._id] = row;
      rows.push(row);
    });
    return rows;
  };

  getColumnByName = (columnName, columns) => {
    if (!columnName || !Array.isArray(columns)) return;
    return columns.find((column) => column.name === columnName);
  };

  getRows = (convertedRows, table, view, columns, settings) => {
    if (!Array.isArray(convertedRows) || convertedRows.length === 0) return [];
    const {
      single_select_column_name,
      label_column_name,
      colored_by_row_color,
    } = settings;
    const labelColumn = this.getColumnByName(label_column_name, columns) || {};
    let options = [];
    let rowsColor = {};
    let singleSelectColumn = {};
    if (colored_by_row_color) {
      const viewRows = this.dtable.getViewRows(view, table);
      rowsColor = this.dtable.getViewRowsColor(viewRows, view, table);
    } else {
      singleSelectColumn =
        this.getColumnByName(single_select_column_name, columns) || {};
      const { data: singleSelectColumnData } = singleSelectColumn;
      options = singleSelectColumnData ? singleSelectColumn.data.options : [];
    }
    const events = this.getEventsFromConvertedRows(
      convertedRows,
      table,
      columns,
      labelColumn,
      singleSelectColumn,
      options,
      rowsColor,
      settings
    );
    return events.map((event) => {
      return new TimelineRow({
        min_date: event.start.date,
        max_date: event.end.date,
        events: [event],
      });
    });
  };

  getGroups = (table, view, columns, settings) => {
    const convertedGroups = this.dtable.getGroupRows(
      this.getFirstLevelGroupView(view),
      table
    );
    if (!Array.isArray(convertedGroups) || convertedGroups.length === 0)
      return [];
    const {
      single_select_column_name,
      label_column_name,
      colored_by_row_color,
    } = settings;
    const labelColumn = this.getColumnByName(label_column_name, columns) || {};
    let options = [];
    let rowsColor = {};
    let singleSelectColumn = {};
    if (colored_by_row_color) {
      const viewRows = this.dtable.getViewRows(view, table);
      rowsColor = this.dtable.getViewRowsColor(viewRows, view, table);
    } else {
      singleSelectColumn = this.getColumnByName(
        single_select_column_name,
        columns
      );
      const { data: singleSelectColumnData } = singleSelectColumn || {};
      options = singleSelectColumnData ? singleSelectColumn.data.options : [];
    }
    const groups = convertedGroups.map((group) => {
      let { cell_value, column_name, column_key, rows } = group;
      const key = cell_value + "";
      cell_value = cell_value || cell_value === 0 ? cell_value : EMPTY_LABEL;
      const convertedRows = rows.map((row) => this.Id2ConvertedRowMap[row._id]);
      const events = this.getEventsFromConvertedRows(
        convertedRows,
        table,
        columns,
        labelColumn,
        singleSelectColumn,
        options,
        rowsColor,
        settings
      );
      const timelineRows = this.getGroupTimelineRows(events, settings);
      const { minDate, maxDate } = this.getGroupBoundaryDates(timelineRows);
      return new Group({
        key,
        cell_value,
        column_name,
        column_key,
        subgroups: null,
        min_date: minDate,
        max_date: maxDate,
        rows: timelineRows,
      });
    });
    const validGroups = groups.filter((group) => group.rows.length > 0);
    return validGroups;
  };

  getEventsFromConvertedRows = (
    convertedRows,
    table,
    columns,
    labelColumn,
    singleSelectColumn,
    options,
    rowsColor,
    settings
  ) => {
    const events = convertedRows.map((convertedRow) => {
      const originalRow = this.dtable.getRowById(table, convertedRow._id);
      const eventData = this.getEventData(
        columns,
        convertedRow,
        originalRow,
        labelColumn,
        singleSelectColumn,
        options,
        rowsColor,
        settings
      );
      return new Event({
        ...eventData,
        row: convertedRow,
        original_row: originalRow,
      });
    });
    return events.filter(
      (event) => !dayjs(event.end.date).isBefore(event.start.date)
    );
  };

  getGroupTimelineRows = (events, settings) => {
    const { display_as_swimlane } = settings;
    if (display_as_swimlane) {
      events.sort((curr, next) =>
        sortDate(curr.start.date, next.start.date, "up")
      );
    }
    let timelineRows = [];
    events.forEach((event) => {
      const { start, end } = event;
      const startDate = start.date;
      const endDate = end.date;

      // If the start.date of the current event is greater than the maximum time of a timeline row,
      // it means that the current event can be displayed in this row,
      // otherwise, the current event needs to be displayed in the next row
      let timelineRow =
        display_as_swimlane &&
        timelineRows.find((row) => dayjs(startDate).isAfter(row.max_date));
      if (timelineRow) {
        timelineRow.events.push(event);
        timelineRow.max_date = endDate;
        return;
      }
      timelineRows.push(
        new TimelineRow({
          min_date: startDate,
          max_date: endDate,
          events: [event],
        })
      );
    });
    return timelineRows;
  };

  getGroupBoundaryDates = (groupedRows) => {
    let minDate, maxDate;
    groupedRows.forEach((row) => {
      let { min_date, max_date } = row;
      minDate =
        !minDate || dayjs(min_date).isBefore(minDate) ? min_date : minDate;
      maxDate =
        !maxDate || dayjs(max_date).isAfter(maxDate) ? max_date : maxDate;
    });
    return { minDate, maxDate };
  };

  getEventData = (
    columns,
    convertedRow,
    originalRow,
    labelColumn,
    singleSelectColumn,
    options,
    rowsColor,
    settings
  ) => {
    const {
      start_time_column_name,
      end_time_column_name,
      record_duration_column_name,
      colored_by_row_color,
      record_end_type,
    } = settings;
    const label = this.getEventLabel(convertedRow, labelColumn);
    let bgColor, textColor;
    if (colored_by_row_color) {
      bgColor = rowsColor[convertedRow._id];
      textColor = this.optionColorsMap[bgColor];
    } else {
      const option =
        options.find(
          (item) => item.id === originalRow[singleSelectColumn.key]
        ) || {};
      bgColor = option.color;
      textColor = option.textColor;
    }
    bgColor = bgColor || DEFAULT_BG_COLOR;
    textColor = textColor || DEFAULT_TEXT_COLOR;
    let start = convertedRow[start_time_column_name];
    const startColumn = this.getColumnByName(start_time_column_name, columns);
    const canChangeStart = startColumn && startColumn.type === CELL_TYPE.DATE;
    let end;
    let endColumn;
    let canChangeEnd;
    if (record_end_type === RECORD_END_TYPE.RECORD_DURATION) {
      const duration = convertedRow[record_duration_column_name];
      if (duration && duration !== 0) {
        const { data: startColumnData } = startColumn;
        const isStartIncludeHour =
          startColumnData &&
          startColumnData.format &&
          startColumnData.format.indexOf("HH:mm") > -1;
        const startFormat = isStartIncludeHour
          ? "YYYY-MM-DD HH:mm"
          : "YYYY-MM-DD";
        const addDays = Number(Number(duration).toFixed(0)); // rounding
        end = dayjs(start).add(addDays, DATE_UNIT.DAY).format(startFormat);
      } else {
        end = start;
      }
      endColumn = this.getColumnByName(record_duration_column_name, columns);
      canChangeEnd = endColumn && endColumn.type === CELL_TYPE.NUMBER;
    } else {
      end = convertedRow[end_time_column_name];
      endColumn = this.getColumnByName(end_time_column_name, columns);
      canChangeEnd = endColumn && endColumn.type === CELL_TYPE.DATE;
    }
    return {
      label,
      bgColor,
      textColor,
      start: {
        date: start,
        canChange: canChangeStart,
        column: startColumn,
      },
      end: {
        date: end,
        canChange: canChangeEnd,
        column: endColumn,
      },
    };
  };

  getEventLabel(convertedRow, labelColumn) {
    const { name: columnName, type: columnType, data } = labelColumn;
    const cellValue = convertedRow[columnName];
    switch (columnType) {
      case CELL_TYPE.TEXT:
      case CELL_TYPE.SINGLE_SELECT: {
        return cellValue;
      }
      case CELL_TYPE.COLLABORATOR: {
        return getCollaboratorsDisplayString(
          cellValue,
          this.emailCollaboratorMap
        );
      }
      case CELL_TYPE.FORMULA:
      case CELL_TYPE.LINK_FORMULA: {
        if (!data) {
          return null;
        }
        const { result_type, array_type } = data;
        if (result_type === FORMULA_RESULT_TYPE.ARRAY) {
          if (COLLABORATOR_COLUMN_TYPES.includes(array_type)) {
            return getCollaboratorsDisplayString(
              cellValue,
              this.emailCollaboratorMap
            );
          }
        }
        return cellValue;
      }
      default: {
        return cellValue;
      }
    }
  }

  onAddView = (viewName) => {
    let { plugin_settings } = this.state;
    let { views: updatedViews } = plugin_settings;
    let selectedViewIdx = updatedViews.length;
    let _id = generatorViewId(updatedViews);
    let newView = new View({ _id, name: viewName });
    updatedViews.push(newView);
    let { settings } = updatedViews[selectedViewIdx];
    let isShowTimelineSetting = !this.isValidViewSettings(settings);
    plugin_settings.views = updatedViews;
    this.setState(
      {
        plugin_settings,
        selectedViewIdx,
        isShowTimelineSetting,
      },
      () => {
        this.storeSelectedViewId(updatedViews[selectedViewIdx]._id);
        this.dtable.updatePluginSettings(PLUGIN_NAME, plugin_settings);
        this.viewsTabs && this.viewsTabs.setViewsTabsScroll();
      }
    );
  };

  onRenameView = (viewName) => {
    let { plugin_settings, selectedViewIdx } = this.state;
    let updatedView = plugin_settings.views[selectedViewIdx];
    updatedView = Object.assign({}, updatedView, { name: viewName });
    plugin_settings.views[selectedViewIdx] = updatedView;
    this.setState(
      {
        plugin_settings,
      },
      () => {
        this.dtable.updatePluginSettings(PLUGIN_NAME, plugin_settings);
      }
    );
  };

  onDeleteView = (viewId) => {
    let { plugin_settings, selectedViewIdx } = this.state;
    let { views: updatedViews } = plugin_settings;
    let viewIdx = updatedViews.findIndex((v) => v._id === viewId);
    selectedViewIdx =
      updatedViews.length - 1 === viewIdx ? viewIdx - 1 : selectedViewIdx;
    if (viewIdx > -1) {
      updatedViews.splice(viewIdx, 1);
      let { settings } = updatedViews[selectedViewIdx];
      let isShowTimelineSetting = !this.isValidViewSettings(settings);
      plugin_settings.views = updatedViews;
      this.setState(
        {
          plugin_settings,
          selectedViewIdx,
          isShowTimelineSetting,
        },
        () => {
          this.storeSelectedViewId(updatedViews[selectedViewIdx]._id);
          this.dtable.updatePluginSettings(PLUGIN_NAME, plugin_settings);
        }
      );
    }
  };

  // move view, update `selectedViewIdx`
  onMoveView = (targetViewID, targetIndexViewID, relativePosition) => {
    let { plugin_settings, selectedViewIdx } = this.state;
    let { views: updatedViews } = plugin_settings;

    let viewIDMap = {};
    updatedViews.forEach((view, index) => {
      viewIDMap[view._id] = view;
    });
    const targetView = viewIDMap[targetViewID];
    const targetIndexView = viewIDMap[targetIndexViewID];
    const selectedView = updatedViews[selectedViewIdx];

    const originalIndex = updatedViews.indexOf(targetView);
    let targetIndex = updatedViews.indexOf(targetIndexView);
    // `relativePosition`: 'before'|'after'
    targetIndex += relativePosition == "before" ? 0 : 1;

    if (originalIndex < targetIndex) {
      if (targetIndex < updatedViews.length) {
        updatedViews.splice(targetIndex, 0, targetView);
      } else {
        // drag it to the end
        updatedViews.push(targetView);
      }
      updatedViews.splice(originalIndex, 1);
    } else {
      updatedViews.splice(originalIndex, 1);
      updatedViews.splice(targetIndex, 0, targetView);
    }

    const newSelectedViewIndex = updatedViews.indexOf(selectedView);

    plugin_settings.views = updatedViews;
    this.setState(
      {
        plugin_settings,
        selectedViewIdx: newSelectedViewIndex,
      },
      () => {
        this.dtable.updatePluginSettings(PLUGIN_NAME, plugin_settings);
      }
    );
  };

  onSelectView = (viewId) => {
    let { plugin_settings } = this.state;
    let { views: updatedViews } = plugin_settings;
    let viewIdx = updatedViews.findIndex((v) => v._id === viewId);
    if (viewIdx > -1) {
      let { settings } = updatedViews[viewIdx];
      let isShowTimelineSetting = !this.isValidViewSettings(settings);
      this.setState({ selectedViewIdx: viewIdx, isShowTimelineSetting });
      this.storeSelectedViewId(viewId);
    }
  };

  storeSelectedViewId = (viewId) => {
    let dtableUuid = getDtableUuid();
    let selectedViewIds = this.getSelectedViewIds(KEY_SELECTED_VIEW_IDS);
    selectedViewIds[dtableUuid] = viewId;
    window.localStorage.setItem(
      KEY_SELECTED_VIEW_IDS,
      JSON.stringify(selectedViewIds)
    );
  };

  getSelectedViewIds = (key) => {
    let selectedViewIds = window.localStorage.getItem(key);
    return selectedViewIds ? JSON.parse(selectedViewIds) : {};
  };

  isValidViewSettings = (settings) => {
    return settings && Object.keys(settings).length > 0;
  };

  isValidSettings = (settings) => {
    const {
      start_time_column_name,
      end_time_column_name,
      record_duration_column_name,
    } = settings;
    return (
      start_time_column_name &&
      (end_time_column_name || record_duration_column_name)
    );
  };

  getColumnIconConfig = () => {
    return this.dtable.getColumnIconConfig();
  };

  getMediaUrl = () => {
    if (window.dtable) {
      return window.dtable.mediaUrl;
    }
    return window.dtablePluginConfig.mediaUrl;
  };

  getUserCommonInfo = (email, avatar_size) => {
    if (window.dtableWebAPI) {
      return window.dtableWebAPI.getUserCommonInfo(email, avatar_size);
    }
    return Promise.reject();
  };

  getLinkCellValue = (linkId, table1Id, table2Id, rowId) => {
    return this.dtable.getLinkCellValue(linkId, table1Id, table2Id, rowId);
  };

  getRowsByID = (tableId, rowIds) => {
    return this.dtable.getRowsByID(tableId, rowIds);
  };

  getTableById = (table_id) => {
    return this.dtable.getTableById(table_id);
  };

  onRowExpand = (table, row) => {
    if (window.app.expandRow) {
      let originRow = this.dtable.getRowById(table, row._id);
      window.app.expandRow(originRow, table);
    }
  };

  onExportAsImage = () => {
    this.timeline.onExportAsImage();
  };

  onTimelineClick = () => {
    const { isShowTimelineSetting } = this.state;
    if (isShowTimelineSetting) {
      this.onHideTimelineSetting();
    }
  };

  getTableFormulaRows = (table, view) => {
    let rows = this.dtable.getViewRows(view, table);
    return this.dtable.getTableFormulaResults(table, rows);
  };

  onModifyRow = (table, row, update) => {
    this.dtable.modifyRow(table, table.id_row_map[row._id], update);
  };

  getFirstLevelGroupView = (view) => {
    const { groupbys } = view;
    return {
      ...view,
      groupbys: groupbys.slice(0, 1),
    };
  };

  render() {
    let {
      isLoading,
      showDialog,
      isShowTimelineSetting,
      plugin_settings,
      selectedViewIdx,
    } = this.state;
    if (isLoading || !showDialog) {
      return "";
    }
    let { views: timelineViews } = plugin_settings;
    let selectedTimelineView = timelineViews[selectedViewIdx];
    let { settings } = selectedTimelineView || {};
    let tables = this.dtable.getTables();
    let selectedTable = this.getSelectedTable(tables, settings);
    let { name: tableName } = selectedTable || {};
    let views = this.dtable.getNonArchiveViews(selectedTable);
    let selectedView =
      this.getSelectedView(selectedTable, settings) || views[0];
    let columns = this.dtable.getViewShownColumns(selectedView, selectedTable);
    let { name: viewName } = selectedView;
    let isGroupView = this.dtable.isGroupView(selectedView, columns);
    let formulaRows = this.getTableFormulaRows(selectedTable, selectedView);
    selectedView = Object.assign({}, selectedView, {
      formula_rows: formulaRows,
    });

    let { single_select_column_name, label_column_name, colored_by_row_color } =
      settings;
    const singleSelectColumn = columns.filter(
      (item) => item.type === CELL_TYPE.SINGLE_SELECT
    )[0];
    if (singleSelectColumn) {
      if (!colored_by_row_color && single_select_column_name === undefined) {
        settings.single_select_column_name = singleSelectColumn.name;
      }
      if (label_column_name === undefined) {
        settings.label_column_name = singleSelectColumn.name;
      }
    }

    const isValidSettings = this.isValidSettings(settings);
    const convertedRows = this.getConvertedRows(tableName, viewName);
    // let rows = [];
    // let groups = [];
    // if (isValidSettings) {
    //   if (isGroupView) {
    //     groups =
    //       !Array.isArray(convertedRows) || convertedRows.length === 0
    //         ? []
    //         : this.getGroups(selectedTable, selectedView, columns, settings);
    //   } else {
    //     rows = this.getRows(
    //       convertedRows,
    //       selectedTable,
    //       selectedView,
    //       columns,
    //       settings
    //     );
    //   }
    // }

    let subtables = this.dtable.getTables();
    let collaborators = this.dtable.getRelatedUsers();

    const columnName = "0000";
    const columnStart = "5T13";
    const columnFinish = "4LPw";
    const columnLink = "s5S1";

    const table = subtables[1];

    // reading the link logic
    const view = this.dtable.getViewByName(table, viewName);
    const rows = this.dtable.getViewRows(view, table);
    const findLinkRows = rows.slice(0, 5);
    const links = this.dtable.getTableLinkRows(findLinkRows, table);

    const display = rows.map((row) => row[columnName]);

    const tasks2 = rows.map((row, index) => {
      const startDate = new Date(row[columnStart]);
      const endDate = new Date(row[columnFinish]);

      return {
        start: startDate,
        end: endDate,
        name: row[columnName],
        id: row._id,
        progress: 0,
        dependencies: links[row._id][columnLink],
        type: "task",
        project: "ProjectSample",
      };
    });

    return (
      <div
        className="dtable-plugin plugin-timeline"
        ref={(ref) => (this.plugin = ref)}
        onClick={this.onTimelineClick}
      >
        <div className="plugin-header">
          <div className="plugin-logo">
            <img
              className="plugin-logo-icon"
              src={timelineLogo}
              alt="gantt-chart"
            />
            <span>Gantt Chart</span>
          </div>
          <ViewsTabs
            ref={(ref) => (this.viewsTabs = ref)}
            views={timelineViews}
            selectedViewIdx={selectedViewIdx}
            onAddView={this.onAddView}
            onRenameView={this.onRenameView}
            onDeleteView={this.onDeleteView}
            onSelectView={this.onSelectView}
            onMoveView={this.onMoveView}
          />
          <div className="timeline-operators">
            <span
              className="timeline-operator dtable-font dtable-icon-download btn-export-image"
              onClick={this.onExportAsImage}
            ></span>
            <span
              className="timeline-operator dtable-font dtable-icon-set-up btn-settings"
              onClick={this.onTimelineSettingToggle}
            ></span>
            <span
              className="timeline-operator dtable-font dtable-icon-x btn-close"
              onClick={this.onPluginToggle}
            ></span>
          </div>
        </div>
        <div className="timeline-container o-hidden">
          <Gantt
            tasks={tasks2}
            onExpanderClick={this.handleExpanderClick}
            listCellWidth={"155px"}
            barBackgroundColor="blue"
            rowHeight={40}
            fontSize={12}
          />
          <GanttSettings showSettings={showSettings} />
        </div>
      </div>
    );
  }
}

App.propTypes = propTypes;

export default App;
